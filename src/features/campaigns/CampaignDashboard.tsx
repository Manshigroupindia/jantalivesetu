import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Send,
  Plus,
  Users,
  ArrowRight,
  History,
  ShieldCheck,
  Eye,
  Sparkles,
  Smartphone,
  MessageSquare
} from 'lucide-react';
import { Campaign, Client, DeliveryMethod } from '../../types/campaign';
import { fetchCampaigns, fetchClients } from '../../services/campaignService';
import { useNotification } from '../../contexts/NotificationContext';

export const CampaignDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useNotification();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | DeliveryMethod>('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [cData, clientData] = await Promise.all([fetchCampaigns(), fetchClients()]);
      setCampaigns(cData);
      setClients(clientData);
    } catch (err: any) {
      showToast('Failed to load campaign dashboard data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Aggregated Stats
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === 'active').length;
  const optedInClients = clients.filter((c) => c.status === 'active' && c.whatsappConsent).length;

  const totalCampaigns = campaigns.length;
  const whatsAppCampaignsCount = campaigns.filter((c) => (c.deliveryMethod || 'whatsapp') === 'whatsapp').length;
  const smsCampaignsCount = campaigns.filter((c) => c.deliveryMethod === 'sms').length;

  const draftCampaigns = campaigns.filter((c) => c.status === 'draft').length;
  const preparedCampaigns = campaigns.filter((c) => c.status === 'prepared').length;
  const manuallySentCampaigns = campaigns.filter((c) => c.status === 'manually_sent').length;

  // Filtered Recent Campaigns (top 6)
  const filteredCampaigns = campaigns.filter((c) => {
    if (deliveryFilter === 'all') return true;
    return (c.deliveryMethod || 'whatsapp') === deliveryFilter;
  });
  const recentCampaigns = filteredCampaigns.slice(0, 6);

  const getStatusBadge = (status: string) => {
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
      {/* HEADER BANNER WITH HERO CTA */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-bold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-brand-300" />
            Zero-Cost WhatsApp Broadcast & Free Device SMS Campaign Suite
          </div>
          <h2 className="text-2xl font-black tracking-tight">Client Campaign Management</h2>
          <p className="text-xs text-white/80 leading-relaxed">
            Organize clients, compose festive & business announcements, prepare WhatsApp broadcast lists or Android SMS messages, and send directly from your device without expensive gateway subscriptions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs font-bold"
            icon={<Users className="w-3.5 h-3.5" />}
            onClick={() => navigate('/campaigns/clients')}
          >
            Manage Clients
          </Button>

          <Button
            variant="primary"
            className="bg-white text-brand-900 hover:bg-brand-50 shadow-md font-black text-xs"
            icon={<Plus className="w-4 h-4 text-brand-700" />}
            onClick={() => navigate('/campaigns/create')}
          >
            + Create New Campaign
          </Button>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Clients */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
            Total Clients
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-gray-900 font-mono">{totalClients}</span>
            <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">in directory</span>
          </div>
        </div>

        {/* Active Clients */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
            Active Clients
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-700 font-mono">{activeClients}</span>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">verified status</span>
          </div>
        </div>

        {/* Opted In */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600">
            Opted-In
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-brand-700 font-mono">{optedInClients}</span>
            <span className="text-[10px] text-brand-600 font-semibold block mt-0.5">marketing consent</span>
          </div>
        </div>

        {/* Total Campaigns */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600">
            Total Campaigns
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-purple-900 font-mono">{totalCampaigns}</span>
            <span className="text-[10px] text-purple-600 font-semibold block mt-0.5">
              {whatsAppCampaignsCount} WA • {smsCampaignsCount} SMS
            </span>
          </div>
        </div>

        {/* Draft Campaigns */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
            Drafts
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-gray-700 font-mono">{draftCampaigns}</span>
            <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">in preparation</span>
          </div>
        </div>

        {/* Prepared Campaigns */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
            Prepared
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-blue-900 font-mono">{preparedCampaigns}</span>
            <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">ready to send</span>
          </div>
        </div>

        {/* Manually Sent Campaigns */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
            Manually Sent
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-800 font-mono">{manuallySentCampaigns}</span>
            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">confirmed sent</span>
          </div>
        </div>
      </div>

      {/* ZERO-COST BROADCAST ARCHITECTURE EXPLANATION CARD */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="font-extrabold text-amber-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            Zero External API Fees Architecture (WhatsApp Broadcast & Android SMS)
          </div>
          <p className="text-[11px] text-amber-800 leading-normal max-w-3xl">
            This module automates recipient verification, Cloudinary creative hosting, dynamic message composition, and intelligent batch splitting (256 for WhatsApp, 5-20 for SMS). Sending executes natively on your device via WhatsApp Business or your phone's default Messages app without third-party SMS gateway fees.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0 text-xs font-bold"
          icon={<History className="w-3.5 h-3.5" />}
          onClick={() => navigate('/campaigns/history')}
        >
          View All History
        </Button>
      </div>

      {/* RECENT CAMPAIGNS TABLE */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">Recent Campaigns</h3>
            <p className="text-xs text-gray-500">Latest campaigns prepared for broadcast & SMS dispatch</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter pills */}
            <div className="flex items-center p-1 bg-gray-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setDeliveryFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  deliveryFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                All ({campaigns.length})
              </button>
              <button
                type="button"
                onClick={() => setDeliveryFilter('whatsapp')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  deliveryFilter === 'whatsapp'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-brand-700'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                WhatsApp ({whatsAppCampaignsCount})
              </button>
              <button
                type="button"
                onClick={() => setDeliveryFilter('sms')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  deliveryFilter === 'sms'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-blue-700'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                SMS ({smsCampaignsCount})
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/campaigns/history')}
            >
              Full History
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-xs animate-pulse">
            Loading campaigns...
          </div>
        ) : recentCampaigns.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <Send className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-bold text-gray-600">No campaigns found</p>
            <p className="text-xs text-gray-400">
              {deliveryFilter === 'all'
                ? 'Click "+ Create New Campaign" to draft your first announcement.'
                : `No ${deliveryFilter.toUpperCase()} campaigns found. Click "+ Create New Campaign" to start one.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  <th className="p-3">Campaign Name</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-center">Recipients</th>
                  <th className="p-3 text-center">Batches</th>
                  <th className="p-3">Creation Date</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentCampaigns.map((camp) => {
                  const isSms = camp.deliveryMethod === 'sms';
                  return (
                    <tr key={camp.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3 font-bold text-gray-900">{camp.campaignName}</td>
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
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700">
                          {camp.campaignType}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-gray-900">
                        {camp.totalEligible}
                      </td>
                      <td className="p-3 text-center text-gray-600 font-mono font-medium">
                        {camp.totalBatches}
                      </td>
                      <td className="p-3 text-gray-500 text-[11px] font-mono">
                        {new Date(camp.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-center">
                        {getStatusBadge(camp.status)}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => navigate(`/campaigns/prepare/${camp.id}`)}
                        >
                          Prepare / View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
