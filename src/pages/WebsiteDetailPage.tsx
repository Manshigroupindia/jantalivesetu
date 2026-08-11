import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { 
  Globe, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  User, 
  Mail, 
  Phone, 
  ExternalLink, 
  Shield, 
  Key, 
  CreditCard, 
  Server,
  MessageSquare,
  Building,
  CheckCircle2
} from 'lucide-react';
import { fetchWebsiteById, deleteWebsite } from '../firebase/services/websiteService';
import { WebsiteClientData } from '../types';
import { formatIndianDate } from '../utils/dateUtils';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { StatusBadge } from '../components/common/StatusBadge';
import { PasswordField } from '../components/common/PasswordField';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';

export const WebsiteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin, isManage } = useAuth();

  const [website, setWebsite] = useState<WebsiteClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWebsiteById(id).then(data => {
        setWebsite(data);
        setLoading(false);
      });
    }
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteWebsite(id);
      navigate('/websites');
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Website Details">
        <div className="py-20 text-center text-slate-400 text-xs font-medium">Loading website record details...</div>
      </DashboardLayout>
    );
  }

  if (!website) {
    return (
      <DashboardLayout title="Website Not Found">
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3 max-w-md mx-auto my-10">
          <p className="text-sm text-slate-600 font-semibold">Requested website record could not be found.</p>
          <Link to="/websites" className="inline-block px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg">
            ← Return to Websites
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`${website.clientName} - Website Details`}>
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/websites')}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-3">
            {website.logoUrl ? (
              <img src={website.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-slate-50 p-1" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white font-bold text-base flex items-center justify-center">
                {website.clientName?.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">{website.clientName}</h2>
                <span className="text-xs font-mono font-semibold text-slate-400">#{website.srNo}</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{website.websiteName}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          {isManage && (
            <button
              onClick={() => navigate(`/websites/${website.id}/edit`)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Record</span>
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Domain Countdown Timer Banner */}
      <CountdownTimer expiryDateStr={website.domainExpiryDate} renewDateStr={website.renewDate} />

      {/* Visually Structured Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* CARD 1: CLIENT INFORMATION */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-brand-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Client Information</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Client Name</span>
              <span className="font-bold text-slate-900 text-sm">{website.clientName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Contact Person</span>
              <span className="font-medium text-slate-800">{website.contactPersonName || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Phone Number</span>
              <span className="font-mono text-slate-800 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                {website.phoneNumber || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Email Address</span>
              <span className="font-mono text-slate-800 flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-400" />
                {website.emailId || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: WEBSITE INFORMATION */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Globe className="w-4 h-4 text-brand-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Website Information</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Website Name</span>
              <span className="font-bold text-slate-900">{website.websiteName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Website URL</span>
              {website.websiteLink ? (
                <a
                  href={website.websiteLink}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-brand-600 font-bold hover:underline inline-flex items-center gap-1"
                >
                  {website.websiteLink} <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-slate-400 italic">Not set</span>
              )}
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Category</span>
              <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold border border-slate-200 mt-0.5">
                {website.categoryName || 'General'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Website Status</span>
              <div className="mt-0.5">
                <StatusBadge type="websiteStatus" value={website.websiteStatus} />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: DOMAIN INFORMATION */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Globe className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Domain Information</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Domain Name</span>
              <span className="font-mono font-bold text-brand-700 text-sm">{website.domain}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Purchase Date</span>
                <span className="font-medium text-slate-800">{formatIndianDate(website.domainPurchaseDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Expiry Date</span>
                <span className="font-semibold text-rose-700">{formatIndianDate(website.domainExpiryDate)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Purchase Platform</span>
                <span className="font-medium text-slate-800">{website.domainBuyPlatform || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Card Last 4</span>
                <span className="font-mono text-slate-800 font-bold">{website.domainBuyCard || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 4: HOSTING INFORMATION */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Server className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Hosting Information</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Hosting App / Provider</span>
              <span className="font-bold text-slate-900">{website.hostingApp || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Hosting User ID</span>
              <span className="font-mono text-slate-800 font-semibold">{website.hostingId || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Hosting Password</span>
              <div className="mt-1">
                <PasswordField value={website.hostingPassword} />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 5: WEBSITE ADMIN */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Key className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Website Admin Credentials</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Admin User ID</span>
              <span className="font-mono font-bold text-slate-900">{website.websiteAdminUserId || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Admin Password</span>
              <div className="mt-1">
                <PasswordField value={website.websiteAdminPassword} />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 6: PAYMENT & STATUS */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <CreditCard className="w-4 h-4 text-sky-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Payment & Active Status</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Payment Method</span>
                <span className="font-bold text-slate-900">{website.paymentMethod || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Payment Status</span>
                <div className="mt-0.5">
                  <StatusBadge type="paymentStatus" value={website.paymentStatus} />
                </div>
              </div>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Active Status</span>
              <div className="mt-0.5">
                <StatusBadge type="activeStatus" value={website.active} />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 7: FEEDBACK & NOTES (Full Width) */}
        {(website.feedback || website.additionalNotes) && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 md:col-span-2 lg:col-span-3">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Client Feedback & Internal Notes</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {website.feedback && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Client Feedback</span>
                  <p className="text-slate-800 leading-relaxed">{website.feedback}</p>
                </div>
              )}
              {website.additionalNotes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Additional Internal Notes</span>
                  <p className="text-slate-800 leading-relaxed">{website.additionalNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Website Record?"
        itemName={website.clientName}
        itemDetails={`Domain: ${website.domain}`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
        isDeleting={isDeleting}
      />
    </DashboardLayout>
  );
};
