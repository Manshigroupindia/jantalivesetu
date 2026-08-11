import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Edit3, 
  Plus, 
  Eye, 
  EyeOff, 
  X, 
  ShieldAlert 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToEmployees, updateEmployee } from '../firebase/services/employeeService';
import { Employee } from '../types';
import { 
  hashPin, 
  verifyPinHash, 
  isValid4DigitPin, 
  checkPinRateLimit, 
  recordFailedPinAttempt, 
  resetPinRateLimit 
} from '../utils/security';
import { logAuditEvent } from '../firebase/services/auditService';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { SUPER_ADMIN_EMAIL } from '../firebase/services/authService';

export const AccessSecurityPage: React.FC = () => {
  const { isSuperAdmin, profile, refreshProfile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Set / Change Super Admin PIN Modal
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'SET' | 'CHANGE'>('SET');

  const [directorPassword, setDirectorPassword] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Employee PIN Reset Modal
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [empNewPin, setEmpNewPin] = useState('');
  const [empConfirmPin, setEmpConfirmPin] = useState('');
  const [adminPasswordForEmp, setAdminPasswordForEmp] = useState('');
  const [adminPinForEmp, setAdminPinForEmp] = useState('');
  const [empModalError, setEmpModalError] = useState('');
  const [isSubmittingEmp, setIsSubmittingEmp] = useState(false);

  useEffect(() => {
    const unsub = subscribeToEmployees(data => {
      setEmployees(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (!isSuperAdmin) {
    return (
      <DashboardLayout title="Access Security">
        <div className="py-20 text-center text-rose-600 font-semibold text-xs">
          ⚠️ Restricted Access. Access Security management is reserved strictly for Super Admin (Director).
        </div>
      </DashboardLayout>
    );
  }

  const hasPinConfigured = Boolean(profile?.accessPinHash);

  // Reset my PIN modal inputs
  const handleOpenMyPinModal = (mode: 'SET' | 'CHANGE') => {
    setPinModalMode(mode);
    setDirectorPassword('');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setModalError('');
    setShowPassword(false);
    setShowPins(false);
    setPinModalOpen(true);
  };

  // Submit My Access PIN (Set or Change)
  const handleSaveMyPin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!directorPassword.trim()) {
      setModalError('Director password is required for security reauthentication.');
      return;
    }

    if (!isValid4DigitPin(newPin)) {
      setModalError('New PIN must be exactly 4 numeric digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setModalError('New PIN and Confirm PIN do not match.');
      return;
    }

    if (pinModalMode === 'CHANGE') {
      if (!isValid4DigitPin(currentPin)) {
        setModalError('Current 4-digit Access PIN is required.');
        return;
      }

      // Verify current PIN
      if (!verifyPinHash(currentPin, profile?.accessPinHash || '', profile?.uid || '')) {
        setModalError('Incorrect Current Access PIN.');
        return;
      }
    }

    setIsSubmitting(true);
    setModalError('');

    try {
      // 1. Firebase Authentication Reauthentication
      if (auth.currentUser) {
        const cred = EmailAuthProvider.credential(SUPER_ADMIN_EMAIL, directorPassword);
        await reauthenticateWithCredential(auth.currentUser, cred);
      }

      // 2. Hash new PIN safely
      const hashed = hashPin(newPin, profile?.uid || '');
      const now = new Date().toISOString();

      // 3. Save to Firestore /users/{uid}
      const uidToUse = profile?.uid || currentUser?.uid;
      if (uidToUse) {
        await setDoc(doc(db, 'users', uidToUse), {
          accessPinHash: hashed,
          accessPinEnabled: true,
          accessPinUpdatedAt: now,
          updatedAt: now,
        }, { merge: true });
      }

      // 4. Audit Log
      await logAuditEvent(
        profile?.uid || '',
        profile?.displayName || 'Super Admin',
        'SUPER_ADMIN',
        pinModalMode === 'SET' ? 'ACCESS_PIN_CREATED' : 'ACCESS_PIN_CHANGED',
        'users',
        profile?.uid || '',
        `Super Admin Access PIN ${pinModalMode === 'SET' ? 'configured' : 'updated'}`
      );

      await refreshProfile();
      setPinModalOpen(false);
    } catch (err: any) {
      console.error('Save PIN Error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setModalError('Invalid Director Password.');
      } else {
        setModalError(err.message || 'Failed to save Access PIN.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Employee PIN Reset Modal
  const handleOpenEmpPinModal = (emp: Employee) => {
    setSelectedEmp(emp);
    setEmpNewPin('');
    setEmpConfirmPin('');
    setAdminPasswordForEmp('');
    setAdminPinForEmp('');
    setEmpModalError('');
    setEmpModalOpen(true);
  };

  // Submit Employee PIN Reset
  const handleSaveEmpPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    if (!adminPasswordForEmp.trim()) {
      setEmpModalError('Director password is required for security verification.');
      return;
    }

    if (!isValid4DigitPin(adminPinForEmp)) {
      setEmpModalError('Your 4-digit Super Admin Access PIN is required.');
      return;
    }

    // Verify Super Admin PIN
    if (!verifyPinHash(adminPinForEmp, profile?.accessPinHash || '', profile?.uid || '')) {
      setEmpModalError('Incorrect Super Admin Access PIN.');
      return;
    }

    if (!isValid4DigitPin(empNewPin)) {
      setEmpModalError('Employee New PIN must be exactly 4 numeric digits.');
      return;
    }

    if (empNewPin !== empConfirmPin) {
      setEmpModalError('Employee New PIN and Confirm PIN do not match.');
      return;
    }

    setIsSubmittingEmp(true);
    setEmpModalError('');

    try {
      // Reauthenticate Director
      if (auth.currentUser) {
        const cred = EmailAuthProvider.credential(SUPER_ADMIN_EMAIL, adminPasswordForEmp);
        await reauthenticateWithCredential(auth.currentUser, cred);
      }

      // Hash Employee PIN using employee ID salt
      const empHashedPin = hashPin(empNewPin, selectedEmp.id);
      const now = new Date().toISOString();

      await updateEmployee(selectedEmp.id, {
        accessPinHash: empHashedPin,
        accessPinEnabled: true,
        accessPinUpdatedAt: now,
      });

      // Also update /users/{emp.uid} if present
      if (selectedEmp.uid) {
        await setDoc(doc(db, 'users', selectedEmp.uid), {
          accessPinHash: empHashedPin,
          accessPinEnabled: true,
          accessPinUpdatedAt: now,
        }, { merge: true });
      }

      // Log audit
      await logAuditEvent(
        profile?.uid || '',
        profile?.displayName || 'Super Admin',
        'SUPER_ADMIN',
        'ACCESS_PIN_RESET',
        'employees',
        selectedEmp.id,
        `Access PIN configured/reset for employee: ${selectedEmp.employeeName}`
      );

      setEmpModalOpen(false);
    } catch (err: any) {
      console.error('Emp PIN Error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setEmpModalError('Invalid Director Password.');
      } else {
        setEmpModalError(err.message || 'Failed to update employee Access PIN.');
      }
    } finally {
      setIsSubmittingEmp(false);
    }
  };

  return (
    <DashboardLayout title="Access Security">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <ShieldCheck className="w-6 h-6 text-brand-400" />
              <h2 className="text-lg font-bold">Access Security & PIN Management</h2>
            </div>
            <p className="text-xs text-slate-400 font-medium max-w-xl">
              Configure your 4-digit Access PIN to secure sensitive actions like record deletions, password reveals, and employee security settings.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {hasPinConfigured ? (
              <button
                onClick={() => handleOpenMyPinModal('CHANGE')}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Change My Access PIN</span>
              </button>
            ) : (
              <button
                onClick={() => handleOpenMyPinModal('SET')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Set My Access PIN</span>
              </button>
            )}
          </div>
        </div>

        {/* Top 3 Security Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: My Access PIN Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Access PIN</span>
                {hasPinConfigured ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Protected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Not Configured</span>
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-900">
                {hasPinConfigured ? 'Super Admin PIN Configured' : 'Access PIN Required'}
              </h3>

              <p className="text-xs text-slate-500 font-medium">
                {hasPinConfigured 
                  ? 'Your 4-digit PIN is active. Protected deletions and sensitive actions require PIN verification.'
                  : 'Protect your account. Set a 4-digit Access PIN to enable deletion verification and security controls.'}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100">
              {hasPinConfigured ? (
                <button
                  onClick={() => handleOpenMyPinModal('CHANGE')}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update My Access PIN</span>
                </button>
              ) : (
                <button
                  onClick={() => handleOpenMyPinModal('SET')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Set Up Access PIN</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Deletion Protection */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deletion Protection</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Active System Rule
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Protected Record Deletions</h3>
              <p className="text-xs text-slate-500 font-medium">
                Deleting websites, Gmail accounts, hosting platforms, and employee records strictly requires valid 4-digit Access PIN verification.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium flex items-center justify-between">
              <span>Security Interceptor</span>
              <span className="font-mono text-slate-700 font-bold">Enabled</span>
            </div>
          </div>

          {/* Card 3: Role-Based Controls */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Role Security</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  Enforced
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Access PIN vs Roles</h3>
              <p className="text-xs text-slate-500 font-medium">
                Role permissions decide what employees can do. Access PIN only adds secondary verification to authorized sensitive actions.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium flex items-center justify-between">
              <span>Super Admin Override</span>
              <span className="font-mono text-purple-700 font-bold">Full Privilege</span>
            </div>
          </div>
        </div>

        {/* Staff Access PINs Table / Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Staff Access PINs</h3>
              <p className="text-xs text-slate-500 font-medium">
                Manage 4-digit security PIN configurations for registered staff and employee accounts.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">PIN Status</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-right">Security Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const empHasPin = Boolean(emp.accessPinHash);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                            {emp.employeeName?.charAt(0) || 'E'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{emp.employeeName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{emp.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-semibold">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          emp.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700' :
                          emp.role === 'MANAGE' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {emp.role}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {emp.department || 'General'}
                      </td>

                      <td className="py-3 px-4">
                        {empHasPin ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Protected</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <span>Not Set</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {emp.accessPinUpdatedAt ? new Date(emp.accessPinUpdatedAt).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEmpPinModal(emp)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs flex items-center space-x-1.5 ml-auto"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-brand-600" />
                          <span>{empHasPin ? 'Reset PIN' : 'Set PIN'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: SET / CHANGE SUPER ADMIN PIN */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-sm">
                  {pinModalMode === 'SET' ? 'Set Up Super Admin Access PIN' : 'Change Super Admin Access PIN'}
                </h3>
              </div>
              <button onClick={() => setPinModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMyPin} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <p className="text-xs text-slate-500 font-medium">
                {pinModalMode === 'SET'
                  ? 'Set a 4-digit Access PIN for sensitive actions such as deleting records and modifying security configurations.'
                  : 'To update your Access PIN, verify your Director Password and current PIN.'}
              </p>

              {/* Director Reauthentication Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Director Security Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={directorPassword}
                    onChange={(e) => setDirectorPassword(e.target.value)}
                    placeholder="Enter Director Password"
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Current PIN (if Mode === CHANGE) */}
              {pinModalMode === 'CHANGE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Current 4-Digit Access PIN *
                  </label>
                  <input
                    type={showPins ? 'text' : 'password'}
                    maxLength={4}
                    inputMode="numeric"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
              )}

              {/* New PIN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New 4-Digit Access PIN *
                </label>
                <input
                  type={showPins ? 'text' : 'password'}
                  maxLength={4}
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              {/* Confirm New PIN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Access PIN *
                </label>
                <input
                  type={showPins ? 'text' : 'password'}
                  maxLength={4}
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-xs text-slate-600 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPins}
                    onChange={(e) => setShowPins(e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Show PIN Digits</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPinModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Authenticating & Saving...' : 'Save Access PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESET EMPLOYEE PIN */}
      {empModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <KeyRound className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-sm">
                  Configure Access PIN for {selectedEmp.employeeName}
                </h3>
              </div>
              <button onClick={() => setEmpModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmpPin} className="p-6 space-y-4">
              {empModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{empModalError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between">
                <span className="text-slate-400 font-semibold">Employee Email:</span>
                <span className="font-bold font-mono text-slate-800">{selectedEmp.email}</span>
              </div>

              {/* Super Admin Reauthentication */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Director Password *
                </label>
                <input
                  type="password"
                  value={adminPasswordForEmp}
                  onChange={(e) => setAdminPasswordForEmp(e.target.value)}
                  placeholder="Enter Director Password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Your Super Admin 4-Digit Access PIN *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={adminPinForEmp}
                  onChange={(e) => setAdminPinForEmp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-widest"
                  required
                />
              </div>

              {/* Employee New PIN */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Employee New 4-Digit Access PIN *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={empNewPin}
                  onChange={(e) => setEmpNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-widest"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Employee New PIN *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={empConfirmPin}
                  onChange={(e) => setEmpConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-widest"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEmpModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEmp}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSubmittingEmp ? 'Updating PIN...' : 'Save Employee PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
