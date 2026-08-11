import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { 
  Server, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Check, 
  X 
} from 'lucide-react';
import { 
  subscribeToPlatformAccounts, 
  createPlatformAccount, 
  updatePlatformAccount, 
  deletePlatformAccount 
} from '../firebase/services/platformService';
import { PlatformAccount } from '../types';
import { PasswordField } from '../components/common/PasswordField';
import { PreviewModal } from '../components/common/PreviewModal';
import { SecurityPinModal } from '../components/common/SecurityPinModal';
import { useAuth } from '../contexts/AuthContext';
import { useSecurity } from '../contexts/SecurityContext';
import { logAuditEvent } from '../firebase/services/auditService';

const DEFAULT_PLATFORM_TYPES = [
  'Vercel',
  'Domain India',
  'Hosting Raja',
  'GitHub',
  'Firebase',
  'Cloudinary',
  'Netlify',
  'GoDaddy',
  'AWS',
  'DigitalOcean',
  'Custom Platform',
];

export const PlatformsPage: React.FC = () => {
  const { isSuperAdmin, isManage, currentUser, profile } = useAuth();
  const { requestSecurityVerification } = useSecurity();

  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  // Form states
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PlatformAccount | null>(null);

  const [platformName, setPlatformName] = useState('');
  const [platformType, setPlatformType] = useState('Vercel');
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [panelUrl, setPanelUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  const [formError, setFormError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<PlatformAccount | null>(null);

  useEffect(() => {
    const unsub = subscribeToPlatformAccounts(data => setAccounts(data));
    return () => unsub();
  }, []);

  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setPlatformName('');
    setPlatformType('Vercel');
    setCustomTypeInput('');
    setLoginId('');
    setPassword('');
    setPanelUrl('');
    setNotes('');
    setStatus('Active');
    setFormError('');
    setFormOpen(true);
  };

  const handleOpenEditModal = (acc: PlatformAccount) => {
    requestSecurityVerification(
      () => {
        setEditingAccount(acc);
        setPlatformName(acc.platformName);
        setPlatformType(acc.platformType);
        setLoginId(acc.loginId);
        setPassword(acc.password);
        setPanelUrl(acc.panelUrl);
        setNotes(acc.notes || '');
        setStatus(acc.status);
        setFormError('');
        setFormOpen(true);
      },
      'Edit Platform Credentials',
      'Please verify Access Password to edit hosting & platform account credentials.'
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformName.trim() || !loginId.trim()) {
      setFormError('Platform Name and Login ID are required.');
      return;
    }
    setPreviewOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsSubmitting(true);
    try {
      const typeToSave = platformType === 'Custom Platform' ? (customTypeInput || 'Custom') : platformType;
      const payload = {
        platformName,
        platformType: typeToSave,
        loginId,
        password,
        panelUrl,
        notes,
        status,
      };

      if (editingAccount) {
        await updatePlatformAccount(editingAccount.id, payload);
      } else {
        await createPlatformAccount(payload, currentUser?.uid || 'system');
      }

      setPreviewOpen(false);
      setFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save platform account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePlatformAccount(deleteTarget.id);
      await logAuditEvent(
        profile?.uid || '',
        profile?.displayName || 'User',
        profile?.role || 'SUPER_ADMIN',
        'DELETE_VERIFIED',
        'platform_accounts',
        deleteTarget.id,
        `Deleted platform account: ${deleteTarget.platformName} (${deleteTarget.loginId})`
      );
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAccounts = accounts.filter(a => {
    const matchSearch =
      a.platformName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.platformType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.loginId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = selectedType === 'ALL' || a.platformType === selectedType;
    return matchSearch && matchType;
  });

  const previewFields = [
    { label: 'Platform Name', value: platformName },
    { label: 'Platform Type', value: platformType === 'Custom Platform' ? customTypeInput : platformType },
    { label: 'Login ID / Email', value: loginId },
    { label: 'Password', value: password, isPassword: true },
    { label: 'Panel URL', value: panelUrl },
    { label: 'Status', value: status },
    { label: 'Notes', value: notes, isFullWidth: true },
  ];

  return (
    <DashboardLayout title="Hosting & Platforms">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Hosting & Platform Credentials</h2>
          <p className="text-xs text-slate-500">Manage Vercel, Domain India, Hosting Raja, GitHub, Cloudinary, etc.</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative flex-1 sm:w-56">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search platforms..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
          >
            <option value="ALL">All Types</option>
            {DEFAULT_PLATFORM_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {isManage && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Platform</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAccounts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
            No platform accounts recorded matching your filter.
          </div>
        ) : (
          filteredAccounts.map((acc) => (
            <div key={acc.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{acc.platformName}</h3>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">{acc.platformType}</span>
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
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Login ID / Email</span>
                    <span className="font-mono font-bold text-slate-900">{acc.loginId}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Password</span>
                    <div className="mt-0.5">
                      <PasswordField value={acc.password} />
                    </div>
                  </div>

                  {acc.panelUrl && (
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Panel Link</span>
                      <a
                        href={acc.panelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-brand-600 font-bold hover:underline inline-flex items-center gap-1"
                      >
                        Open Panel <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {acc.notes && (
                    <div className="pt-1">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Notes</span>
                      <p className="text-slate-600 leading-snug">{acc.notes}</p>
                    </div>
                  )}
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
                {editingAccount ? 'Edit Platform Account' : 'Add New Platform Account'}
              </h3>
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && <p className="text-xs text-rose-600 font-semibold">⚠️ {formError}</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Platform Name *</label>
                  <input
                    type="text"
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    placeholder="e.g. Primary Vercel Org"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Platform Type</label>
                  <select
                    value={platformType}
                    onChange={(e) => setPlatformType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                  >
                    {DEFAULT_PLATFORM_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {platformType === 'Custom Platform' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Platform Name</label>
                    <input
                      type="text"
                      value={customTypeInput}
                      onChange={(e) => setCustomTypeInput(e.target.value)}
                      placeholder="e.g. Linode, Hetzner, Supabase..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Login ID / Email *</label>
                  <input
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="User ID or login email"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Panel / Website URL</label>
                  <input
                    type="url"
                    value={panelUrl}
                    onChange={(e) => setPanelUrl(e.target.value)}
                    placeholder="https://vercel.com/dashboard"
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
                    placeholder="Platform notes..."
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
        title="Review Platform Credentials Before Saving"
        fields={previewFields}
        onConfirm={handleConfirmSave}
        onEdit={() => setPreviewOpen(false)}
        onCancel={() => setPreviewOpen(false)}
        isSubmitting={isSubmitting}
      />

      {/* Delete PIN Verification */}
      <SecurityPinModal
        isOpen={!!deleteTarget}
        title="Delete Platform Account"
        description="Deleting a hosting & platform account requires 4-digit Access PIN verification."
        actionName="Verify & Delete Account"
        targetCollection="platform_accounts"
        targetId={deleteTarget?.id}
        targetName={deleteTarget?.platformName}
        onVerified={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardLayout>
  );
};
