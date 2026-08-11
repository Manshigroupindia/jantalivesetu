import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { 
  Mail, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Check, 
  X 
} from 'lucide-react';
import { 
  subscribeToGmailAccounts, 
  createGmailAccount, 
  updateGmailAccount, 
  deleteGmailAccount 
} from '../firebase/services/gmailService';
import { GmailAccount } from '../types';
import { PasswordField } from '../components/common/PasswordField';
import { PreviewModal } from '../components/common/PreviewModal';
import { SecurityPinModal } from '../components/common/SecurityPinModal';
import { useAuth } from '../contexts/AuthContext';
import { useSecurity } from '../contexts/SecurityContext';
import { logAuditEvent } from '../firebase/services/auditService';

export const GmailAccountsPage: React.FC = () => {
  const { isSuperAdmin, isManage, currentUser, profile } = useAuth();
  const { requestSecurityVerification } = useSecurity();

  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<GmailAccount | null>(null);

  // Form inputs
  const [accountName, setAccountName] = useState('');
  const [gmailAddress, setGmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [ownerClient, setOwnerClient] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  const [formError, setFormError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<GmailAccount | null>(null);

  useEffect(() => {
    const unsub = subscribeToGmailAccounts(data => setAccounts(data));
    return () => unsub();
  }, []);

  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setAccountName('');
    setGmailAddress('');
    setPassword('');
    setRecoveryEmail('');
    setRecoveryPhone('');
    setPurpose('');
    setOwnerClient('');
    setNotes('');
    setStatus('Active');
    setFormError('');
    setFormOpen(true);
  };

  const handleOpenEditModal = (acc: GmailAccount) => {
    requestSecurityVerification(
      () => {
        setEditingAccount(acc);
        setAccountName(acc.accountName);
        setGmailAddress(acc.gmailAddress);
        setPassword(acc.password);
        setRecoveryEmail(acc.recoveryEmail);
        setRecoveryPhone(acc.recoveryPhone);
        setPurpose(acc.purpose);
        setOwnerClient(acc.ownerClient);
        setNotes(acc.notes || '');
        setStatus(acc.status);
        setFormError('');
        setFormOpen(true);
      },
      'Edit Gmail Credentials',
      'Please verify Access Password to edit Gmail account credentials.'
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim() || !gmailAddress.trim()) {
      setFormError('Account Name and Gmail Address are required.');
      return;
    }
    setPreviewOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        accountName,
        gmailAddress,
        password,
        recoveryEmail,
        recoveryPhone,
        purpose,
        ownerClient,
        notes,
        status,
      };

      if (editingAccount) {
        await updateGmailAccount(editingAccount.id, payload);
      } else {
        await createGmailAccount(payload, currentUser?.uid || 'system');
      }

      setPreviewOpen(false);
      setFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save Gmail account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGmailAccount(deleteTarget.id);
      await logAuditEvent(
        profile?.uid || '',
        profile?.displayName || 'User',
        profile?.role || 'SUPER_ADMIN',
        'DELETE_VERIFIED',
        'gmail_accounts',
        deleteTarget.id,
        `Deleted Gmail account: ${deleteTarget.accountName} (${deleteTarget.gmailAddress})`
      );
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAccounts = accounts.filter(a =>
    a.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.gmailAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.ownerClient.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const previewFields = [
    { label: 'Account Name', value: accountName },
    { label: 'Gmail Address', value: gmailAddress },
    { label: 'Password', value: password, isPassword: true },
    { label: 'Recovery Email', value: recoveryEmail },
    { label: 'Recovery Phone', value: recoveryPhone },
    { label: 'Purpose', value: purpose },
    { label: 'Owner / Client', value: ownerClient },
    { label: 'Status', value: status },
    { label: 'Notes', value: notes, isFullWidth: true },
  ];

  return (
    <DashboardLayout title="Gmail Accounts">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Gmail Accounts Directory</h2>
          <p className="text-xs text-slate-500">Secure credential repository for company & client Google accounts.</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search account name, gmail, client..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {isManage && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Gmail</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAccounts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
            No Gmail accounts recorded matching search query.
          </div>
        ) : (
          filteredAccounts.map((acc) => (
            <div key={acc.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                      <Mail className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{acc.accountName}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    acc.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {acc.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Gmail Address</span>
                    <span className="font-mono font-bold text-slate-900">{acc.gmailAddress}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Password</span>
                    <div className="mt-0.5">
                      <PasswordField value={acc.password} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Recovery Email</span>
                      <span className="font-mono text-slate-700 truncate block">{acc.recoveryEmail || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Recovery Phone</span>
                      <span className="font-mono text-slate-700 truncate block">{acc.recoveryPhone || 'N/A'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Owner / Client</span>
                    <span className="font-semibold text-slate-800">{acc.ownerClient || 'Internal'}</span>
                  </div>
                </div>
              </div>

              {(isManage || isSuperAdmin) && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                  {isManage && (
                    <button
                      onClick={() => handleOpenEditModal(acc)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center space-x-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                  {isSuperAdmin && (
                    <button
                      onClick={() => setDeleteTarget(acc)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      title="Delete Record (Requires PIN)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingAccount ? 'Edit Gmail Account Credentials' : 'Add New Gmail Account'}
              </h3>
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && <p className="text-xs text-rose-600 font-semibold">⚠️ {formError}</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Name *</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. Primary Company Admin Email"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gmail Address *</label>
                  <input
                    type="email"
                    value={gmailAddress}
                    onChange={(e) => setGmailAddress(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Gmail password..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Recovery Email</label>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="recovery@domain.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Recovery Phone</label>
                  <input
                    type="tel"
                    value={recoveryPhone}
                    onChange={(e) => setRecoveryPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Owner / Client</label>
                  <input
                    type="text"
                    value={ownerClient}
                    onChange={(e) => setOwnerClient(e.target.value)}
                    placeholder="Company / Client Name"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Purpose</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Google Console, Analytics, Billing..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Additional notes..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs flex items-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Review Preview →</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 2 Review Modal */}
      <PreviewModal
        isOpen={previewOpen}
        title="Review Gmail Credentials Before Saving"
        fields={previewFields}
        onConfirm={handleConfirmSave}
        onEdit={() => setPreviewOpen(false)}
        onCancel={() => setPreviewOpen(false)}
        isSubmitting={isSubmitting}
      />

      {/* Delete PIN Verification */}
      <SecurityPinModal
        isOpen={!!deleteTarget}
        title="Delete Gmail Account"
        description="Deleting a Gmail credential record requires 4-digit Access PIN verification."
        actionName="Verify & Delete Account"
        targetCollection="gmail_accounts"
        targetId={deleteTarget?.id}
        targetName={deleteTarget?.gmailAddress}
        onVerified={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardLayout>
  );
};
