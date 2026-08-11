import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { 
  Users, 
  Plus, 
  Search, 
  ShieldCheck, 
  UserCheck, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  KeyRound,
  Eye,
  EyeOff,
  User as UserIcon
} from 'lucide-react';
import { 
  subscribeToEmployees, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee,
  DEFAULT_PERMISSIONS
} from '../firebase/services/employeeService';
import { Employee, UserRole, CustomPermissions } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { SecurityPinModal } from '../components/common/SecurityPinModal';
import { useAuth } from '../contexts/AuthContext';
import { hashPin, isValid4DigitPin, verifyPinHash } from '../utils/security';
import { logAuditEvent } from '../firebase/services/auditService';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { SUPER_ADMIN_EMAIL } from '../firebase/services/authService';

export const EmployeesPage: React.FC = () => {
  const { isSuperAdmin, profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Form modal (Add / Edit)
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  const [employeeName, setEmployeeName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('IT & Web');
  const [role, setRole] = useState<UserRole>('VIEW');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [notes, setNotes] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [accessPinInput, setAccessPinInput] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);

  // Permissions state
  const [canAddWebsites, setCanAddWebsites] = useState(true);
  const [canEditWebsites, setCanEditWebsites] = useState(true);
  const [canDeleteWebsites, setCanDeleteWebsites] = useState(false);

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View Profile Drawer/Modal
  const [viewEmp, setViewEmp] = useState<Employee | null>(null);

  // Delete Security Modal Target
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Manage Employee PIN Modal
  const [pinTargetEmp, setPinTargetEmp] = useState<Employee | null>(null);
  const [empPinNew, setEmpPinNew] = useState('');
  const [empPinConfirm, setEmpPinConfirm] = useState('');
  const [directorPassword, setDirectorPassword] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [empPinError, setEmpPinError] = useState('');
  const [isSavingEmpPin, setIsSavingEmpPin] = useState(false);

  useEffect(() => {
    const unsub = subscribeToEmployees(data => setEmployees(data));
    return () => unsub();
  }, []);

  if (!isSuperAdmin) {
    return (
      <DashboardLayout title="Access Denied">
        <div className="py-20 text-center text-rose-600 font-semibold text-xs">
          ⚠️ Restricted Access. Employee management is reserved strictly for Super Admin (Director).
        </div>
      </DashboardLayout>
    );
  }

  const handleOpenAddModal = () => {
    setEditingEmp(null);
    setEmployeeName('');
    setEmail('');
    setEmployeeId(`EMP-${Date.now().toString().slice(-4)}`);
    setPhone('');
    setDepartment('IT & Web');
    setRole('VIEW');
    setStatus('Active');
    setNotes('');
    setProfileImage('');
    setAccessPinInput('');
    setShowPinInput(false);
    setCanAddWebsites(true);
    setCanEditWebsites(true);
    setCanDeleteWebsites(false);
    setFormError('');
    setFormOpen(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setEmployeeName(emp.employeeName || '');
    setEmail(emp.email || '');
    setEmployeeId(emp.employeeId || '');
    setPhone(emp.phone || '');
    setDepartment(emp.department || 'IT & Web');
    setRole(emp.role);
    setStatus(emp.status);
    setNotes(emp.notes || '');
    setProfileImage(emp.profileImage || '');
    setAccessPinInput('');
    setShowPinInput(false);
    setCanAddWebsites(emp.permissions?.websites?.add ?? true);
    setCanEditWebsites(emp.permissions?.websites?.edit ?? true);
    setCanDeleteWebsites(emp.permissions?.websites?.delete ?? false);
    setFormError('');
    setFormOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim() || !email.trim()) {
      setFormError('Employee Name and Email are required.');
      return;
    }

    if (accessPinInput.trim() && !isValid4DigitPin(accessPinInput.trim())) {
      setFormError('Access PIN must be exactly 4 numeric digits.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const perms: CustomPermissions = {
        ...DEFAULT_PERMISSIONS,
        websites: {
          view: true,
          add: canAddWebsites,
          edit: canEditWebsites,
          delete: canDeleteWebsites,
        },
      };

      if (editingEmp) {
        const updates: Partial<Employee> = {
          employeeName,
          employeeId,
          phone,
          department,
          role,
          status,
          notes,
          profileImage,
          permissions: perms,
        };

        if (accessPinInput.trim()) {
          const hashedPin = hashPin(accessPinInput.trim(), editingEmp.id);
          updates.accessPinHash = hashedPin;
          updates.accessPinEnabled = true;
          updates.accessPinUpdatedAt = new Date().toISOString();
        }

        await updateEmployee(editingEmp.id, updates);
        await logAuditEvent(
          profile?.uid || '',
          profile?.displayName || 'Super Admin',
          'SUPER_ADMIN',
          'EMPLOYEE_UPDATED',
          'employees',
          editingEmp.id,
          `Updated employee record: ${employeeName}`
        );
      } else {
        const empIdTemp = doc(db, 'employees').id;
        let pinHash: string | undefined = undefined;
        let pinEnabled: boolean | undefined = undefined;
        let pinUpdated: string | undefined = undefined;

        if (accessPinInput.trim()) {
          pinHash = hashPin(accessPinInput.trim(), empIdTemp);
          pinEnabled = true;
          pinUpdated = new Date().toISOString();
        }

        await createEmployee({
          employeeName,
          email,
          employeeId,
          phone,
          department,
          role,
          status,
          notes,
          profileImage,
          permissions: perms,
          ...(pinHash ? { accessPinHash: pinHash, accessPinEnabled: pinEnabled, accessPinUpdatedAt: pinUpdated } : {}),
        });

        await logAuditEvent(
          profile?.uid || '',
          profile?.displayName || 'Super Admin',
          'SUPER_ADMIN',
          'EMPLOYEE_CREATED',
          'employees',
          empIdTemp,
          `Created new employee: ${employeeName} (${email})`
        );
      }

      setFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save employee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger PIN verification before deletion
  const handleDeleteRequest = (emp: Employee) => {
    setDeleteTarget(emp);
    setPinModalOpen(true);
  };

  const handleVerifiedDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteEmployee(deleteTarget.id);
      await logAuditEvent(
        profile?.uid || '',
        profile?.displayName || 'Super Admin',
        'SUPER_ADMIN',
        'EMPLOYEE_DELETED',
        'employees',
        deleteTarget.id,
        `Deleted employee record: ${deleteTarget.employeeName}`
      );
      setDeleteTarget(null);
      setPinModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Save PIN for specific employee card
  const handleSaveEmpPinFromCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinTargetEmp) return;

    if (!directorPassword.trim()) {
      setEmpPinError('Director password is required for verification.');
      return;
    }

    if (!isValid4DigitPin(adminPin)) {
      setEmpPinError('Your Super Admin Access PIN is required.');
      return;
    }

    if (!verifyPinHash(adminPin, profile?.accessPinHash || '', profile?.uid || '')) {
      setEmpPinError('Incorrect Super Admin Access PIN.');
      return;
    }

    if (!isValid4DigitPin(empPinNew)) {
      setEmpPinError('New PIN must be exactly 4 numeric digits.');
      return;
    }

    if (empPinNew !== empPinConfirm) {
      setEmpPinError('New PIN and Confirm PIN do not match.');
      return;
    }

    setIsSavingEmpPin(true);
    setEmpPinError('');

    try {
      if (auth.currentUser) {
        const cred = EmailAuthProvider.credential(SUPER_ADMIN_EMAIL, directorPassword);
        await reauthenticateWithCredential(auth.currentUser, cred);
      }

      const hashedPin = hashPin(empPinNew, pinTargetEmp.id);
      const now = new Date().toISOString();

      await updateEmployee(pinTargetEmp.id, {
        accessPinHash: hashedPin,
        accessPinEnabled: true,
        accessPinUpdatedAt: now,
      });

      if (pinTargetEmp.uid) {
        await updateDoc(doc(db, 'users', pinTargetEmp.uid), {
          accessPinHash: hashedPin,
          accessPinEnabled: true,
          accessPinUpdatedAt: now,
        });
      }

      await logAuditEvent(
        profile?.uid || '',
        profile?.displayName || 'Super Admin',
        'SUPER_ADMIN',
        'ACCESS_PIN_RESET',
        'employees',
        pinTargetEmp.id,
        `Updated Access PIN for employee: ${pinTargetEmp.employeeName}`
      );

      setPinTargetEmp(null);
    } catch (err: any) {
      setEmpPinError(err.message || 'Failed to update PIN.');
    } finally {
      setIsSavingEmpPin(false);
    }
  };

  const filteredEmployees = employees.filter(e =>
    e.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Employee & Staff Management">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Staff & Employee Directory</h2>
          <p className="text-xs text-slate-500 font-medium">Manage team member profile cards, roles, and 4-digit Access PIN credentials.</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employee name, email, ID..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Employee</span>
          </button>
        </div>
      </div>

      {/* Staff Profile Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEmployees.map((emp) => {
          const hasEmpPin = Boolean(emp.accessPinHash);

          return (
            <div key={emp.id} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 flex flex-col justify-between hover:shadow-md transition-all">
              <div className="space-y-4">
                {/* Profile Header Card */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
                  <div className="flex items-center space-x-3">
                    {emp.profileImage ? (
                      <img
                        src={emp.profileImage}
                        alt={emp.employeeName}
                        className="w-11 h-11 rounded-full object-cover border-2 border-slate-200 shadow-2xs"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-slate-900 text-white font-extrabold text-sm flex items-center justify-center border-2 border-slate-200 shadow-2xs">
                        {emp.employeeName?.charAt(0) || 'E'}
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{emp.employeeName}</h3>
                      <p className="text-[11px] text-slate-400 font-mono truncate">{emp.email}</p>
                    </div>
                  </div>

                  <StatusBadge type="role" value={emp.role} />
                </div>

                {/* Info Fields */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Employee ID:</span>
                    <span className="font-mono font-bold text-slate-800">{emp.employeeId || 'N/A'}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Department:</span>
                    <span className="font-semibold text-slate-700">{emp.department || 'General'}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Status:</span>
                    <StatusBadge type="activeStatus" value={emp.status} />
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Access PIN:</span>
                    {hasEmpPin ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Protected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                        Not Configured
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Card Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <button
                  onClick={() => setViewEmp(emp)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>View</span>
                </button>

                <button
                  onClick={() => handleOpenEditModal(emp)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => {
                    setPinTargetEmp(emp);
                    setEmpPinNew('');
                    setEmpPinConfirm('');
                    setDirectorPassword('');
                    setAdminPin('');
                    setEmpPinError('');
                  }}
                  className="px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>PIN</span>
                </button>

                {emp.role !== 'SUPER_ADMIN' && (
                  <button
                    onClick={() => handleDeleteRequest(emp)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    title="Delete Employee"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* VIEW PROFILE MODAL */}
      {viewEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Employee Profile Details</h3>
              <button onClick={() => setViewEmp(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-4 pb-4 border-b border-slate-100">
                {viewEmp.profileImage ? (
                  <img src={viewEmp.profileImage} alt={viewEmp.employeeName} className="w-14 h-14 rounded-full object-cover border-2 border-slate-200" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-900 text-white font-extrabold text-lg flex items-center justify-center">
                    {viewEmp.employeeName?.charAt(0) || 'E'}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900">{viewEmp.employeeName}</h3>
                  <p className="text-xs text-slate-400 font-mono">{viewEmp.email}</p>
                  <div className="mt-1 flex items-center space-x-2">
                    <StatusBadge type="role" value={viewEmp.role} />
                    <StatusBadge type="activeStatus" value={viewEmp.status} />
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-semibold">Employee ID:</span>
                  <span className="font-mono font-bold text-slate-800">{viewEmp.employeeId || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-semibold">Phone:</span>
                  <span className="font-medium text-slate-800">{viewEmp.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-semibold">Department:</span>
                  <span className="font-medium text-slate-800">{viewEmp.department || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-semibold">Access PIN Status:</span>
                  <span className="font-bold text-slate-800">{viewEmp.accessPinHash ? 'Protected' : 'Not Configured'}</span>
                </div>
                {viewEmp.notes && (
                  <div className="pt-2">
                    <span className="text-slate-400 font-semibold block mb-1">Notes:</span>
                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">{viewEmp.notes}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  onClick={() => setViewEmp(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT EMPLOYEE MODAL */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingEmp ? 'Edit Employee Profile Card' : 'Create New Employee Profile'}
              </h3>
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && <p className="text-xs text-rose-600 font-semibold">⚠️ {formError}</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Name *</label>
                  <input
                    type="text"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="employee@company.com"
                    disabled={Boolean(editingEmp)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-medium disabled:opacity-50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. EMP-102"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="IT, Marketing..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">System Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                  >
                    <option value="VIEW">VIEW (Read Only)</option>
                    <option value="MANAGE">MANAGE (Create & Edit)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Full Privilege)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Profile Image URL</label>
                  <input
                    type="url"
                    value={profileImage}
                    onChange={(e) => setProfileImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                  />
                </div>

                {/* Optional 4-Digit Access PIN */}
                <div className="md:col-span-2 p-3 bg-brand-50/60 border border-brand-100 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-brand-900 uppercase tracking-wider">
                      4-Digit Access PIN (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPinInput(!showPinInput)}
                      className="text-[11px] text-brand-700 font-semibold flex items-center space-x-1"
                    >
                      {showPinInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPinInput ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>

                  <input
                    type={showPinInput ? 'text' : 'password'}
                    maxLength={4}
                    inputMode="numeric"
                    value={accessPinInput}
                    onChange={(e) => setAccessPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Enter 4-digit PIN for sensitive actions..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold tracking-widest"
                  />
                  <p className="text-[10px] text-slate-500">
                    PIN will be salted and hashed before storing in Firestore. Never stored as plain text.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Employee notes..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs flex items-center space-x-1 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Employee Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE EMPLOYEE PIN MODAL (from Profile Card button) */}
      {pinTargetEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-sm">Access PIN — {pinTargetEmp.employeeName}</h3>
              </div>
              <button onClick={() => setPinTargetEmp(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmpPinFromCard} className="p-6 space-y-4">
              {empPinError && <p className="text-xs text-rose-600 font-semibold">⚠️ {empPinError}</p>}

              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Reauthenticate with your Director password and Super Admin PIN to configure/reset {pinTargetEmp.employeeName}'s 4-digit Access PIN.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Director Password *
                </label>
                <input
                  type="password"
                  value={directorPassword}
                  onChange={(e) => setDirectorPassword(e.target.value)}
                  placeholder="Enter Director Password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Your Super Admin Access PIN *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-widest"
                  required
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Employee New 4-Digit Access PIN *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={empPinNew}
                  onChange={(e) => setEmpPinNew(e.target.value.replace(/\D/g, '').slice(0, 4))}
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
                  value={empPinConfirm}
                  onChange={(e) => setEmpPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-widest"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setPinTargetEmp(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEmpPin}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSavingEmpPin ? 'Saving...' : 'Set Employee Access PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECURITY PIN VERIFICATION MODAL FOR DELETE */}
      <SecurityPinModal
        isOpen={pinModalOpen}
        title="Delete Employee Record"
        description="Deleting an employee record requires valid 4-digit Access PIN verification."
        actionName="Verify & Delete Employee"
        targetCollection="employees"
        targetId={deleteTarget?.id}
        targetName={deleteTarget?.employeeName}
        onVerified={handleVerifiedDelete}
        onCancel={() => setPinModalOpen(false)}
      />
    </DashboardLayout>
  );
};
