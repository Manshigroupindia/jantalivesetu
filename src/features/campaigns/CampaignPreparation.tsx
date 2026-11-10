import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Send,
  Copy,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Check,
  ArrowLeft,
  Share2,
  Info,
  Sparkles
} from 'lucide-react';
import { Campaign, CampaignBatch } from '../../types/campaign';
import {
  getCampaignById,
  markBatchAsSent,
  cancelCampaign,
} from '../../services/campaignService';
import { formatPhone, generateVCard, downloadFile } from '../../utils/phoneUtils';
import { generateCSV } from '../../utils/csvUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { CampaignReportModal } from './CampaignReportModal';

export const CampaignPreparation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userDoc } = useAuth();
  const { showToast, showConfirm } = useNotification();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBatchIdx, setSelectedBatchIdx] = useState(0);

  // Checkbox checklist items (local state for guidance)
  const [checklist, setChecklist] = useState({
    activeNumber: true,
    savedNumber: true,
    consentVerified: true,
    imageReady: true,
    captionReady: true,
  });

  // Cancel Campaign Modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Load campaign
  const loadCampaign = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getCampaignById(id);
      if (!data) {
        showToast('Campaign not found.', 'error');
        navigate('/campaigns/history');
        return;
      }
      setCampaign(data);
    } catch (err: any) {
      showToast('Failed to load campaign preparation details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaign();
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 text-center text-gray-400 text-xs animate-pulse">
        Loading WhatsApp Broadcast preparation...
      </div>
    );
  }

  if (!campaign) return null;

  const activeBatch: CampaignBatch | undefined = campaign.batches[selectedBatchIdx] || campaign.batches[0];

  // Copy Message Caption
  const handleCopyCaption = () => {
    navigator.clipboard.writeText(campaign.message);
    showToast('Message caption copied to clipboard! Paste it into WhatsApp.', 'success');
  };

  // Download Campaign Image
  const handleDownloadImage = async () => {
    if (!campaign.imageUrl) {
      showToast('This campaign has no image creative attached.', 'info');
      return;
    }

    try {
      showToast('Downloading image...', 'info');
      const response = await fetch(campaign.imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${campaign.campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_creative.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Fallback open in new tab
      window.open(campaign.imageUrl, '_blank');
    }
  };

  // Download Batch Contacts as CSV
  const handleDownloadBatchCSV = (batch: CampaignBatch) => {
    const csvData = generateCSV(batch.recipients, [
      { key: 'name', label: 'Full Name' },
      { key: 'phone', label: 'Mobile Number' },
      { key: 'normalizedPhone', label: 'E.164 Mobile' },
      { key: 'company', label: 'Company' },
    ]);

    const filename = `${campaign.campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_Batch_${batch.batchNumber}.csv`;
    downloadFile(csvData, filename, 'text/csv;charset=utf-8;');
    showToast(`Downloaded Batch #${batch.batchNumber} recipients CSV.`, 'success');
  };

  // Download Batch Contacts as vCard (.vcf) for 1-click phone import!
  const handleDownloadBatchVCard = (batch: CampaignBatch) => {
    const label = `${campaign.campaignName.slice(0, 10)}_B${batch.batchNumber}`;
    const vcf = generateVCard(label, batch.recipients);
    const filename = `${campaign.campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_Batch_${batch.batchNumber}_Contacts.vcf`;
    downloadFile(vcf, filename, 'text/vcard;charset=utf-8;');
    showToast(
      `Downloaded vCard for Batch #${batch.batchNumber}! Open this file on your phone to add contacts to a WhatsApp Broadcast list.`,
      'success'
    );
  };

  // Mark Batch as Sent with explicit confirmation
  const handleMarkBatchSent = (batch: CampaignBatch) => {
    showConfirm({
      title: `Mark Batch #${batch.batchNumber} as Sent?`,
      message: `Have you manually sent this campaign to all ${batch.recipientCount} recipients in this batch through WhatsApp Business?\n\nNote: Native WhatsApp Broadcast does not report delivery back to this CMS. Your confirmation will log this batch as "Manually Sent".`,
      confirmText: 'Yes, Mark as Manually Sent',
      onConfirm: async () => {
        try {
          const updated = await markBatchAsSent(
            campaign.id,
            batch.batchNumber,
            userDoc?.uid,
            userDoc?.name
          );
          setCampaign(updated);
          showToast(`Batch #${batch.batchNumber} recorded as Manually Sent.`, 'success');
        } catch (err: any) {
          showToast(err?.message || 'Failed to update batch status.', 'error');
        }
      },
    });
  };

  // Cancel Campaign
  const handleExecuteCancel = async () => {
    if (!cancelReason.trim()) {
      showToast('Please provide a reason for cancelling the campaign.', 'warning');
      return;
    }

    setCancelling(true);
    try {
      await cancelCampaign(campaign.id, cancelReason.trim(), userDoc?.uid, userDoc?.name);
      showToast('Campaign has been cancelled.', 'info');
      setCancelModalOpen(false);
      loadCampaign();
    } catch (err: any) {
      showToast(err?.message || 'Failed to cancel campaign.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  // Sent Progress
  const sentBatchesCount = campaign.batches.filter((b) => b.status === 'manually_sent').length;
  const sentRecipientsCount = campaign.batches
    .filter((b) => b.status === 'manually_sent')
    .reduce((acc, b) => acc + b.recipientCount, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* TOP NAVIGATION & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/campaigns/history')}
          >
            History
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {campaign.campaignName}
              </h2>
              <Badge
                variant={
                  campaign.status === 'manually_sent'
                    ? 'success'
                    : campaign.status === 'partially_sent'
                    ? 'warning'
                    : campaign.status === 'cancelled'
                    ? 'danger'
                    : 'brand'
                }
                size="sm"
              >
                {campaign.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Native WhatsApp Business Broadcast Preparation • {campaign.totalEligible} Verified Recipients
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<FileText className="w-3.5 h-3.5" />}
            onClick={() => setReportModalOpen(true)}
          >
            Campaign Report
          </Button>

          {campaign.status !== 'cancelled' && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setCancelModalOpen(true)}
            >
              Cancel Campaign
            </Button>
          )}
        </div>
      </div>

      {/* IMPORTANT NATIVE WHATSAPP CONTACT REQUIREMENT NOTICE */}
      <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-2 shadow-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <h4 className="text-sm font-black uppercase tracking-wider text-amber-900">
            Important WhatsApp Broadcast Delivery Rule
          </h4>
        </div>
        <p className="text-xs text-amber-900 leading-relaxed font-medium">
          "WhatsApp Broadcast messages are generally delivered only to recipients who have <b>saved your company's WhatsApp number in their phone contacts</b>. Please ensure that clients have saved the company's official WhatsApp number before sending."
        </p>
      </div>

      {/* CAMPAIGN METRICS TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
            Total Recipients
          </span>
          <span className="text-2xl font-black font-mono text-gray-900 mt-1 block">
            {campaign.totalEligible}
          </span>
          <span className="text-[10px] text-gray-500 font-semibold">100% consent verified</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block">
            Total Batches
          </span>
          <span className="text-2xl font-black font-mono text-purple-900 mt-1 block">
            {campaign.totalBatches}
          </span>
          <span className="text-[10px] text-purple-600 font-semibold">max 256 per list</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">
            Manually Sent
          </span>
          <span className="text-2xl font-black font-mono text-emerald-900 mt-1 block">
            {sentBatchesCount} / {campaign.totalBatches}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {sentRecipientsCount} recipients covered
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">
            Pending Batches
          </span>
          <span className="text-2xl font-black font-mono text-amber-900 mt-1 block">
            {campaign.totalBatches - sentBatchesCount}
          </span>
          <span className="text-[10px] text-amber-600 font-semibold">awaiting manual send</span>
        </div>
      </div>

      {/* MAIN PREPARATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: CREATIVE & CAPTION ASSETS */}
        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900 flex items-center justify-between border-b pb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-600" /> Campaign Creative
              </span>
              {campaign.imageUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={handleDownloadImage}
                >
                  Download
                </Button>
              )}
            </h3>

            {campaign.imageUrl ? (
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 p-2">
                <img
                  src={campaign.imageUrl}
                  alt="Campaign Asset"
                  className="w-full h-auto object-cover rounded-lg shadow-sm max-h-64 mx-auto"
                />
              </div>
            ) : (
              <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-xl text-xs italic">
                No image creative attached (Text-only broadcast).
              </div>
            )}

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Broadcast Message Caption:</span>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Copy className="w-3.5 h-3.5" />}
                  onClick={handleCopyCaption}
                >
                  Copy Caption
                </Button>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-sans whitespace-pre-wrap text-gray-900 max-h-56 overflow-y-auto leading-relaxed">
                {campaign.message}
              </div>
            </div>
          </Card>

          {/* SENDER PREPARATION CHECKLIST */}
          <Card className="p-4 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5 border-b pb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Broadcast Readiness Checklist
            </h4>
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                <input
                  type="checkbox"
                  checked={checklist.activeNumber}
                  onChange={(e) => setChecklist({ ...checklist, activeNumber: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>Company WhatsApp Business number is active</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                <input
                  type="checkbox"
                  checked={checklist.savedNumber}
                  onChange={(e) => setChecklist({ ...checklist, savedNumber: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>Clients have saved the company official number</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                <input
                  type="checkbox"
                  checked={checklist.consentVerified}
                  onChange={(e) => setChecklist({ ...checklist, consentVerified: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>All recipients in this batch gave marketing consent</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                <input
                  type="checkbox"
                  checked={checklist.imageReady}
                  onChange={(e) => setChecklist({ ...checklist, imageReady: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>Campaign creative downloaded to sending phone</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                <input
                  type="checkbox"
                  checked={checklist.captionReady}
                  onChange={(e) => setChecklist({ ...checklist, captionReady: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>Campaign message caption copied to clipboard</span>
              </label>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: BATCHES BREAKDOWN & RECIPIENTS */}
        <div className="lg:col-span-2 space-y-4">
          {/* BATCH SELECTOR TABS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {campaign.batches.map((batch, idx) => (
              <button
                key={batch.id}
                type="button"
                onClick={() => setSelectedBatchIdx(idx)}
                className={`px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                  selectedBatchIdx === idx
                    ? 'bg-brand-600 text-white border-brand-600 shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>Batch #{batch.batchNumber}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    selectedBatchIdx === idx
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {batch.recipientCount}
                </span>
                {batch.status === 'manually_sent' && (
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      selectedBatchIdx === idx ? 'text-emerald-200' : 'text-emerald-600'
                    }`}
                  />
                )}
              </button>
            ))}
          </div>

          {/* ACTIVE BATCH CARD */}
          {activeBatch && (
            <Card className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-gray-900">
                      Batch #{activeBatch.batchNumber}
                    </h3>
                    <Badge
                      variant={activeBatch.status === 'manually_sent' ? 'success' : 'brand'}
                      size="sm"
                    >
                      {activeBatch.status === 'manually_sent' ? 'MANUALLY SENT' : 'READY TO BROADCAST'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Contains <b>{activeBatch.recipientCount} verified recipients</b> (WhatsApp Native Limit: max 256).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => handleDownloadBatchCSV(activeBatch)}
                  >
                    CSV List
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    icon={<Share2 className="w-3.5 h-3.5" />}
                    onClick={() => handleDownloadBatchVCard(activeBatch)}
                    title="Export .vcf file to import all 256 contacts to your phone with 1 click"
                  >
                    1-Click vCard (.vcf)
                  </Button>

                  {activeBatch.status !== 'manually_sent' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Check className="w-3.5 h-3.5" />}
                      onClick={() => handleMarkBatchSent(activeBatch)}
                    >
                      Mark Batch as Sent
                    </Button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Sent on{' '}
                      {activeBatch.manuallySentAt
                        ? new Date(activeBatch.manuallySentAt).toLocaleDateString()
                        : 'Confirmed'}
                    </span>
                  )}
                </div>
              </div>

              {/* HOW TO BROADCAST STEP-BY-STEP ACCORDION/GUIDE */}
              <div className="p-4 rounded-2xl bg-brand-50/50 border border-brand-200 text-xs text-brand-950 space-y-2">
                <span className="font-extrabold uppercase tracking-wider text-brand-900 block flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-brand-600" />
                  How to send this batch in WhatsApp Business (4 Simple Steps):
                </span>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-brand-850 leading-relaxed font-medium">
                  <li>
                    Click <b>1-Click vCard</b> above to save this batch's contacts to your phone contacts (or copy numbers).
                  </li>
                  <li>
                    Open <b>WhatsApp Business</b> on your phone → Tap <b>Broadcast Lists</b> (or Menu ⋮ → New Broadcast).
                  </li>
                  <li>
                    Select the contacts in this batch (up to 256 contacts) → Tap <b>Create</b>.
                  </li>
                  <li>
                    Attach the downloaded <b>Campaign Creative</b>, paste the <b>Copied Caption</b>, and tap <b>Send</b>.
                  </li>
                </ol>
              </div>

              {/* RECIPIENTS IN THIS BATCH TABLE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">
                    Recipients in Batch #{activeBatch.batchNumber} ({activeBatch.recipients.length}):
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Contacts 1 to {activeBatch.recipients.length}
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto rounded-2xl border border-gray-100 divide-y text-xs">
                  {activeBatch.recipients.map((rec, idx) => (
                    <div
                      key={rec.id || idx}
                      className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{rec.name}</span>
                          {rec.company && (
                            <span className="text-gray-400 text-[11px]">({rec.company})</span>
                          )}
                        </div>
                        <p className="text-gray-500 font-mono text-[11px]">
                          {formatPhone(rec.phone)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-mono">#{idx + 1}</span>
                        <a
                          href={`https://wa.me/${rec.normalizedPhone.replace(/\+/g, '')}?text=${encodeURIComponent(
                            campaign.message
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 flex items-center gap-1"
                          title="Open WhatsApp Direct Chat (optional 1-to-1 preview)"
                        >
                          <Send className="w-3 h-3" /> Chat
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* CANCEL MODAL */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel WhatsApp Campaign"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-gray-600">
            Cancelling this campaign will prevent further batch processing and mark the campaign as cancelled in history and audit reports.
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Cancellation Reason *
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Creative banner needs revised dates, rescheduled event"
              className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Keep Campaign
            </Button>
            <Button
              variant="danger"
              onClick={handleExecuteCancel}
              loading={cancelling}
              disabled={!cancelReason.trim()}
            >
              Cancel Campaign
            </Button>
          </div>
        </div>
      </Modal>

      {/* DETAILED REPORT MODAL */}
      <CampaignReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        campaign={campaign}
      />
    </div>
  );
};
