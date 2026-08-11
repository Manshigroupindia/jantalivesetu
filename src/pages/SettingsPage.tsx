import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { 
  Settings, 
  Lock, 
  ShieldCheck, 
  FileCode, 
  Copy, 
  Download, 
  Check, 
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { updateAccessPassword, getSettings } from '../firebase/services/settingsService';
import { useAuth } from '../contexts/AuthContext';
import { useSecurity } from '../contexts/SecurityContext';

const FIRESTORE_RULES_TEXT = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function isSuperAdmin() {
      return isAuthenticated() && getUserData().role == 'SUPER_ADMIN';
    }

    function isManageUser() {
      return isAuthenticated() && (getUserData().role == 'SUPER_ADMIN' || getUserData().role == 'MANAGE');
    }

    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isSuperAdmin();
    }

    match /websites/{websiteId} {
      allow read: if isAuthenticated();
      allow create, update: if isManageUser();
      allow delete: if isSuperAdmin();
    }

    match /categories/{categoryId} {
      allow read: if isAuthenticated();
      allow write: if isSuperAdmin();
    }

    match /gmailAccounts/{accountId} {
      allow read: if isAuthenticated();
      allow create, update: if isManageUser();
      allow delete: if isSuperAdmin();
    }

    match /platformAccounts/{platformId} {
      allow read: if isAuthenticated();
      allow create, update: if isManageUser();
      allow delete: if isSuperAdmin();
    }

    match /socialAccounts/{socialId} {
      allow read: if isAuthenticated();
      allow create, update: if isManageUser();
      allow delete: if isSuperAdmin();
    }

    match /auditLogs/{logId} {
      allow read: if isSuperAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }

    match /systemSettings/{settingId} {
      allow read: if isAuthenticated();
      allow write: if isSuperAdmin();
    }
  }
}`;

export const SettingsPage: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { requestSecurityVerification } = useSecurity();

  const [newAccessPassword, setNewAccessPassword] = useState('');
  const [confirmAccessPassword, setConfirmAccessPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleChangeAccessPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordError('');

    if (!newAccessPassword.trim() || newAccessPassword.length < 4) {
      setPasswordError('Access password must be at least 4 characters long.');
      return;
    }

    if (newAccessPassword !== confirmAccessPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    requestSecurityVerification(
      async () => {
        setIsUpdating(true);
        try {
          await updateAccessPassword(newAccessPassword);
          setPasswordMsg('Access Password updated successfully!');
          setNewAccessPassword('');
          setConfirmAccessPassword('');
        } catch (err: any) {
          setPasswordError(err.message || 'Failed to update Access Password.');
        } finally {
          setIsUpdating(false);
        }
      },
      'Confirm Access Password Update',
      'Please verify current Access Password to update to new password.'
    );
  };

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadRules = () => {
    const blob = new Blob([FIRESTORE_RULES_TEXT], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'firestore.rules';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout title="System Settings & Security">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900">Application Settings & Firestore Rules</h2>
          <p className="text-xs text-slate-500 font-medium">
            Configure system-wide Access Password, review security policy, and export Firestore rules.
          </p>
        </div>

        {/* 1. ACCESS PASSWORD CONFIGURATION */}
        {isSuperAdmin && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <KeyRound className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-bold text-slate-900">Change System Access Password</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              The Access Password protects all sensitive operations (password reveals, edits, deletions). Changing it updates the system hash immediately.
            </p>

            {passwordMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg flex items-center space-x-2">
                <Check className="w-4 h-4" />
                <span>{passwordMsg}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangeAccessPassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Access Password</label>
                <input
                  type="password"
                  value={newAccessPassword}
                  onChange={(e) => setNewAccessPassword(e.target.value)}
                  placeholder="Enter new access password..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Access Password</label>
                <input
                  type="password"
                  value={confirmAccessPassword}
                  onChange={(e) => setConfirmAccessPassword(e.target.value)}
                  placeholder="Confirm new access password..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {isUpdating ? 'Updating Password...' : 'Update Access Password'}
              </button>
            </form>
          </div>
        )}

        {/* 2. SECURITY POLICY SUMMARY */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Active System Security Features</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">30s Auto-Hide Masking</span>
              <p className="text-slate-500 leading-relaxed">
                Revealed passwords automatically mask themselves after 30 seconds to prevent shoulder surfing.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">2-Step Data Review</span>
              <p className="text-slate-500 leading-relaxed">
                All client & website creations/edits enforce a mandatory preview step before committing.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">Firestore Audit Trail</span>
              <p className="text-slate-500 leading-relaxed">
                Every sensitive action, password view, and deletion is recorded in immutable audit logs.
              </p>
            </div>
          </div>
        </div>

        {/* 3. FIRESTORE SECURITY RULES VIEWER */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">Firestore Security Rules Configuration</h3>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyRules}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Rules'}</span>
              </button>

              <button
                onClick={handleDownloadRules}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .rules</span>
              </button>
            </div>
          </div>

          <pre className="p-4 bg-slate-950 text-slate-300 font-mono text-xs rounded-xl overflow-x-auto max-h-96 leading-relaxed">
            {FIRESTORE_RULES_TEXT}
          </pre>
        </div>
      </div>
    </DashboardLayout>
  );
};
