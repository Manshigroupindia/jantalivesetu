import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  History,
  Search,
  Eye,
  Copy,
  Trash2,
  FileText,
  Plus,
  RefreshCw,
  Smartphone,
  MessageSquare
} from 'lucide-react';
import { Campaign, CampaignStatus, CAMPAIGN_TYPES, DeliveryMethod } from '../../types/campaign';
import {
  fetchCampaigns,
  deleteCampaignDraft,
} from '../../services/campaignService';
import { useNotification } from '../../contexts/NotificationContext';
import { CampaignReportModal } from './CampaignReportModal';

interface CampaignHistoryProps {
  onDuplicateCampaign?: (campaign: Campaign) => void;
}

export const CampaignHistory: React.FC<CampaignHistoryProps> = ({
  onDuplicateCampaign,
}) => {
  const navigate = useNavigate();
  const { showToast, showConfirm } = useNotification();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState<'ALL' | DeliveryMethod>('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | '7days' | '30days' | 'this_month'>('ALL');

  // Report Modal state
  const [selectedCampaignForReport, setSelectedCampaignForReport] = useState<Campaign | null>(null);

  // Load campaigns
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchCampaigns();
      setCampaigns(data);
    } catch (err: any) {
      showToast('Failed to load campaigns history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter logic
  const filteredCampaigns = useMemo(() => {
    const now = new Date();

    return campaigns.filter((c) => {
      // Channel / Delivery method filter
      if (deliveryMethodFilter !== 'ALL') {
        const method = c.deliveryMethod || 'whatsapp';
        if (method !== deliveryMethodFilter) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.campaignName.toLowerCase().includes(q);
        const matchType = c.campaignType.toLowerCase().includes(q);
        if (!matchName && !matchType) return false;
      }

      // Type filter
      if (typeFilter !== 'ALL' && c.campaignType !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }

      // Date range filter
      if (dateFilter !== 'ALL') {
        const created = new Date(c.createdAt);
        const diffDays = (now.getTime() - created.getTime()) / (1000 * 3600 * 24);

        if (dateFilter === '7days' && diffDays > 7) return false;
        if (dateFilter === '30days' && diffDays > 30) return false;
        if (dateFilter === 'this_month') {
          if (
            created.getMonth() !== now.getMonth() ||
            created.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
        }
      }

      return true;
    });
  }, [campaigns, searchQuery, deliveryMethodFilter, typeFilter, statusFilter, dateFilter]);

  // Duplicate Campaign
  const handleDuplicate = (c: Campaign) => {
    if (onDuplicateCampaign) {
      onDuplicateCampaign(c);
    } else {
      // Pass state via navigate
      navigate('/campaigns/create', { state: { duplicateFrom: c } });
    }
    showToast(`Campaign "${c.campaignName}" duplicated into Create wizard.`, 'info');
  };

  // Delete Draft with confirmation
  const handleDeleteDraft = (c: Campaign) => {
    if (c.status !== 'draft') {
      showToast('Only draft campaigns can be deleted.', 'warning');
      return;
    }

    showConfirm({
      title: 'Delete Draft Campaign',
      message: `Are you sure you want to permanently delete the draft "${c.campaignName}"? This action cannot be undone.`,
      isDanger: true,
      confirmText: 'Delete Draft',
      onConfirm: async () => {
        try {
          await deleteCampaignDraft(c.id);
          showToast(`Draft "${c.campaignName}" deleted.`, 'success');
          loadData();
        } catch (err: any) {
          showToast(err?.message || 'Failed to delete draft.', 'error');
        }
      },
    });
  };

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'manually_sent':
        return <Badge variant="success" size="sm">MANUALLY SENT</Badge>;
      case 'partially_sent':
        return <Badge variant="warning" size="sm">PARTIALLY SENT</Badge>;
      case 'prepared':
        return <Badge variant="brand" size="sm">PREPARED</Badge>;
      case 'draft':
        return <Badge variant="neutral" size="sm">DRAFT</Badge>;
      case 'cancelled':
        return <Badge variant="danger" size="sm">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-brand-600" />
            Campaign History & Audit Trail
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Audit trail of all prepared, draft, and manually sent WhatsApp & SMS campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={loadData}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => navigate('/campaigns/create')}
          >
            Create New Campaign
          </Button>
        </div>
      </div>

      {/* FILTERS CARD */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4 text-gray-400" />}
          />

          <div>
            <select
              value={deliveryMethodFilter}
              onChange={(e) => setDeliveryMethodFilter(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Channels (WhatsApp & SMS)</option>
              <option value="whatsapp">💬 WhatsApp Broadcast</option>
              <option value="sms">📱 Free Android SMS</option>
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Campaign Types</option>
              {CAMPAIGN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="prepared">Prepared</option>
              <option value="partially_sent">Partially Sent</option>
              <option value="manually_sent">Manually Sent</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="this_month">This Month</option>
            </select>
          </div>
        </div>
      </Card>

      {/* CAMPAIGNS TABLE */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400 text-xs animate-pulse">
            Loading campaign history...
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <History className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-bold text-gray-600">No campaigns found</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {searchQuery || deliveryMethodFilter !== 'ALL' || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try adjusting your filter settings.'
                : 'Get started by creating your first campaign.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  <th className="p-3">Campaign Name & Type</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3 text-center">Recipients</th>
                  <th className="p-3 text-center">Batches</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Prepared Date</th>
                  <th className="p-3">Sent Date</th>
                  <th className="p-3">Created By</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCampaigns.map((camp) => {
                  const sentCount = camp.batches.filter((b) => b.status === 'manually_sent').length;
                  const isSms = camp.deliveryMethod === 'sms';
                  return (
                    <tr key={camp.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Name & Type */}
                      <td className="p-3">
                        <div className="font-bold text-gray-900 text-sm">{camp.campaignName}</div>
                        <span className="inline-block mt-0.5 text-[10px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                          {camp.campaignType}
                        </span>
                      </td>

                      {/* Channel */}
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                            isSms
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isSms ? (
                            <>
                              <Smartphone className="w-3 h-3" />
                              SMS
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-3 h-3" />
                              WhatsApp
                            </>
                          )}
                        </span>
                      </td>

                      {/* Recipients */}
                      <td className="p-3 text-center font-mono font-bold text-gray-900">
                        {camp.totalEligible}
                      </td>

                      {/* Batches */}
                      <td className="p-3 text-center text-gray-600 font-mono">
                        <span className="font-bold text-gray-900">{camp.totalBatches}</span>
                        {camp.status !== 'draft' && (
                          <span className="text-[10px] text-gray-400 block">
                            ({sentCount} sent)
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        {getStatusBadge(camp.status)}
                      </td>

                      {/* Prepared Date */}
                      <td className="p-3 text-gray-500 font-mono text-[11px]">
                        {new Date(camp.createdAt).toLocaleDateString()}
                      </td>

                      {/* Sent Date */}
                      <td className="p-3 text-gray-500 font-mono text-[11px]">
                        {camp.manuallySentAt
                          ? new Date(camp.manuallySentAt).toLocaleDateString()
                          : camp.partiallySentAt
                          ? `Partial: ${new Date(camp.partiallySentAt).toLocaleDateString()}`
                          : '—'}
                      </td>

                      {/* Created By */}
                      <td className="p-3 text-gray-700 font-medium">
                        {camp.createdByName || 'Admin'}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/campaigns/prepare/${camp.id}`)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-brand-50"
                            title="Open Preparation Screen"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setSelectedCampaignForReport(camp)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-purple-50"
                            title="View Campaign Report"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDuplicate(camp)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                            title="Duplicate Campaign"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {camp.status === 'draft' && (
                            <button
                              onClick={() => handleDeleteDraft(camp)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete Draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* REPORT MODAL */}
      {selectedCampaignForReport && (
        <CampaignReportModal
          isOpen={Boolean(selectedCampaignForReport)}
          onClose={() => setSelectedCampaignForReport(null)}
          campaign={selectedCampaignForReport}
        />
      )}
    </div>
  );
};
