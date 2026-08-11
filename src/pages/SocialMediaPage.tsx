import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { 
  Share2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Check, 
  X 
} from 'lucide-react';
import { 
  subscribeToSocialAccounts, 
  createSocialAccount, 
  updateSocialAccount, 
  deleteSocialAccount 
} from '../firebase/services/socialService';
import { SocialAccount } from '../types';
import { PasswordField } from '../components/common/PasswordField';
import { PreviewModal } from '../components/common/PreviewModal';
import { SecurityPinModal } from '../components/common/SecurityPinModal';
import { useAuth } from '../contexts/AuthContext';
import { useSecurity } from '../contexts/SecurityContext';
import { logAuditEvent } from '../firebase/services/auditService';

const SOCIAL_PLATFORMS = [
  'Facebook',
  'Instagram',
  'YouTube',
  'LinkedIn',
  'X',
  'Pinterest',
  'Telegram',
  'WhatsApp Business',
  'Other',
] as const;

export const SocialMediaPage: React.FC = () => {
  const { isSuperAdmin, isManage, currentUser, profile } = useAuth();
  const { requestSecurityVerification } = useSecurity();

  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState('ALL');

  // Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SocialAccount | null>(null);

  const [platform, setPlatform] = useState<typeof SOCIAL_PLATFORMS[number]>('Instagram');
  const [accountName, setAccountName] = useState('');
  const [usernameEmail, setUsernameEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [ownerClient, setOwnerClient] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  const [formError, setFormError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<SocialAccount | null>(null);

  useEffect(() => {
    const unsub = subscribeToSocialAccounts(data => setAccounts(data));
    return () => unsub();
  }, []);

  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setPlatform('Instagram');
    setAccountName('');
    setUsernameEmail('');
    setPassword('');
    setProfileUrl('');
    setPhone('');
    setOwnerClient('');
    setNotes('');
    setStatus('Active');
    setFormError('');
    setFormOpen(true);
  };

  const handleOpenEditModal = (acc: SocialAccount) => {
    requestSecurityVerification(
      () => {
        setEditingAccount(acc);
        setPlatform(acc.platform);
        setAccountName(acc.accountName);
        setUsernameEmail(acc.usernameEmail);
        setPassword(acc.password);
        setProfileUrl(acc.profileUrl);
        setPhone(acc.phone || '');
        setOwnerClient(acc.ownerClient);
        setNotes(acc.notes || '');
        setStatus(acc.status);
        setFormError('');
        setFormOpen(true);
      },
      'Edit Social Credentials',
      'Please verify Access Password to edit social media account credentials.'
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim() || !usernameEmail.trim()) {
      setFormError('Account Name and Username/Email are required.');
      return;
    }
    setPreviewOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        platform,
        accountName,
        usernameEmail,
        password,
        profileUrl,
        phone,
        ownerClient,
        notes,
        status,
      };

      if (editingAccount) {
        await updateSocialAccount(editingAccount.id, payload);
      } else {
        await createSocialAccount(payload, currentUser?.uid || 'system');
      }

      setPreviewOpen(false);
      setFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save social media account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSocialAccount(deleteTarget.id);
      await logAuditEvent(
        profile?.uid || '',
        profile?.displayName || 'User',
        profile?.role || 'SUPER_ADMIN',
        'DELETE_VERIFIED',
        'social_accounts',
        deleteTarget.id,
        `Deleted social account: ${deleteTarget.accountName} (${deleteTarget.platform})`
      );
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAccounts = accounts.filter(a => {
    const matchSearch =
      a.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.usernameEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.ownerClient.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPlatform = selectedPlatformFilter === 'ALL' || a.platform === selectedPlatformFilter;
    return matchSearch && matchPlatform;
  });

  const previewFields = [
    { label: 'Platform', value: platform },
    { label: 'Account Name', value: accountName },
    { label: 'Username / Email', value: usernameEmail },
    { label: 'Password', value: password, isPassword: true },
    { label: 'Profile URL', value: profileUrl },
    { label: 'Phone', value: phone },
    { label: 'Owner / Client', value: ownerClient },
    { label: 'Status', value: status },
    { label: 'Notes', value: notes, isFullWidth: true },
  ];

  return (
    <DashboardLayout title="Social Media Accounts">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Social Media Accounts</h2>
          <p className="text-xs text-slate-500 font-medium">Manage credentials for Facebook, Instagram, LinkedIn, YouTube, X, etc.</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative flex-1 sm:w-56">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search social accounts..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <select
            value={selectedPlatformFilter}
            onChange={(e) => setSelectedPlatformFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
          >
            <option value="ALL">All Platforms</option>
            {SOCIAL_PLATFORMS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {isManage && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Social</span>
            </button>
          )}
        </div>
      </div>

      {/* Social Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAccounts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
            No social media accounts recorded matching filter.
          </div>
        ) : (
          filteredAccounts.map((acc) => (
            <div key={acc.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{acc.accountName}</h3>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{acc.platform}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    acc.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {acc.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Username / Email</span>
                    <span className="font-mono font-bold text-slate-900">{acc.usernameEmail}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Password</span>
                    <div className="mt-0.5">
                      <PasswordField value={acc.password} />
                    </div>
                  </div>

                  {acc.profileUrl && (
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Profile Link</span>
                      <a
                        href={acc.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-brand-600 font-bold hover:underline inline-flex items-center gap-1"
                      >
                        Open Profile <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Phone</span>
                      <span className="font-mono text-slate-700 truncate block">{acc.phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Owner / Client</span>
                      <span className="font-semibold text-slate-800 truncate block">{acc.ownerClient || 'Company'}</span>
                    </div>
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

      {/* Add / Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingAccount ? 'Edit Social Account' : 'Add New Social Media Account'}
              </h3>
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && <p className="text-xs text-rose-600 font-semibold">⚠️ {formError}</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Social Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                  >
                    {SOCIAL_PLATFORMS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Name *</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. Official Instagram Page"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username or Email *</label>
                  <input
                    type="text"
                    value={usernameEmail}
                    onChange={(e) => setUsernameEmail(e.target.value)}
                    placeholder="@handle or email"
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
                    placeholder="Enter password..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Profile URL</label>
                  <input
                    type="url"
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    placeholder="https://instagram.com/profile"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Associated Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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

      {/* Preview Modal */}
      <PreviewModal
        isOpen={previewOpen}
        title="Review Social Media Credentials Before Saving"
        fields={previewFields}
        onConfirm={handleConfirmSave}
        onEdit={() => setPreviewOpen(false)}
        onCancel={() => setPreviewOpen(false)}
        isSubmitting={isSubmitting}
      />

      {/* Delete PIN Verification */}
      <SecurityPinModal
        isOpen={!!deleteTarget}
        title="Delete Social Media Account"
        description="Deleting a social media credential record requires 4-digit Access PIN verification."
        actionName="Verify & Delete Account"
        targetCollection="social_accounts"
        targetId={deleteTarget?.id}
        targetName={deleteTarget?.accountName}
        onVerified={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardLayout>
  );
};
