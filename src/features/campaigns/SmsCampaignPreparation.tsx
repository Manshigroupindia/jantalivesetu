import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Info,
  Users,
  ExternalLink,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from 'lucide-react';
import { Campaign, CampaignBatch } from '../../types/campaign';
import { updateBatchStatus, cancelCampaign } from '../../services/campaignService';
import { formatPhone } from '../../utils/phoneUtils';
import { analyzeSmsText } from '../../utils/smsUtils';
import {
  launchSmsComposer,
  copyRecipientNumbers,
} from '../../services/nativeSmsService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { CampaignReportModal } from './CampaignReportModal';

interface SmsCampaignPreparationProps {
  campaign: Campaign;
  onRefresh: () => void;
}

export const SmsCampaignPreparation: React.FC<SmsCampaignPreparationProps> = ({
  campaign,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const { userDoc } = useAuth();
  const { showToast, showConfirm } = useNotification();

  const [selectedBatchIdx, setSelectedBatchIdx] = useState(0);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [showRecipientList, setShowRecipientList] = useState(true);
  const [separatorPreference, setSeparatorPreference] = useState<',' | ';'>(',');

  // Cancel Campaign Modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Report Modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const activeBatch: CampaignBatch | undefined =
    campaign.batches[selectedBatchIdx] || campaign.batches[0];

  // SMS text analysis
  const smsAnalysis = useMemo(() => {
    return analyzeSmsText(campaign.message);
  }, [campaign.message]);

  // Overall progress
  const sentBatchesCount = campaign.batches.filter((b) => b.status === 'manually_sent').length;
  const sentRecipientsCount = campaign.batches
    .filter((b) => b.status === 'manually_sent')
    .reduce((acc, b) => acc + b.recipientCount, 0);

  // Copy Message
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(campaign.message);
    showToast('SMS message text copied to clipboard!', 'success');
  };

  // Download Campaign Image (for manual MMS attachment)
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
      link.download = `${campaign.campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_mms_image.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      showToast('Image downloaded to device storage.', 'success');
    } catch {
      window.open(campaign.imageUrl, '_blank');
    }
  };

  // Launch Native SMS/Messages App for Active Batch
  const handleOpenSmsAppForBatch = async (batch: CampaignBatch) => {
    const phoneNumbers = batch.recipients.map((r) => r.phone);

    try {
      showToast('Launching default Messages application...', 'info');

      const res = await launchSmsComposer({
        recipients: phoneNumbers,
        message: campaign.message,
        imageUrl: campaign.imageUrl,
        separator: separatorPreference,
      });

      // Update batch status to 'opened_in_messages' if not already manually sent
      if (batch.status !== 'manually_sent') {
        await updateBatchStatus(
          campaign.id,
          batch.batchNumber,
          'opened_in_messages',
          userDoc?.uid,
          userDoc?.name
        );
        onRefresh();
      }

      if (res.mode === 'native_mms') {
        showToast(
          `MMS composer opened with ${res.recipientCount} recipient(s) & image attachment!`,
          'success'
        );
      } else {
        showToast(
          `Messages app opened with ${res.recipientCount} recipient(s)! Review and press Send.`,
          'success'
        );
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not open Messages application.', 'error');
    }
  };

  // Send 1-on-1 Individual SMS (Guaranteed individual delivery & personalization)
  const handleSendIndividualSms = async (phone: string, clientName: string, company?: string) => {
    let personalized = campaign.message;
    personalized = personalized.replace(/{{name}}/g, clientName || 'Valued Client');
    personalized = personalized.replace(/{{company}}/g, company || '');

    try {
      await launchSmsComposer({
        recipients: [phone],
        message: personalized,
        imageUrl: campaign.imageUrl,
      });
      showToast(`Messages composer opened for ${clientName}!`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not launch SMS app.', 'error');
    }
  };

  // Copy Batch Phone Numbers (Comma or Semicolon Separated)
  const handleCopyNumbers = async (batch: CampaignBatch, sep: ',' | ';' = ',') => {
    const phones = batch.recipients.map((r) => r.phone);
    await copyRecipientNumbers(phones, sep);
    showToast(
      `Copied ${phones.length} phone numbers (${sep === ',' ? 'comma-separated' : 'semicolon-separated'}) to clipboard!`,
      'success'
    );
  };

  // Toggle Batch Status: between 'manually_sent' and 'prepared'
  const handleToggleBatchStatus = async (batch: CampaignBatch) => {
    const nextStatus = batch.status === 'manually_sent' ? 'prepared' : 'manually_sent';

    if (nextStatus === 'manually_sent') {
      showConfirm({
        title: `Mark Batch #${batch.batchNumber} as Sent?`,
        message: `Have you manually sent this SMS campaign to all ${batch.recipientCount} recipients in this batch?\n\nThis CMS does not automatically send SMS or verify carrier delivery. Marking as sent updates your internal records.`,
        confirmText: 'Yes, Mark as Sent',
        onConfirm: async () => {
          try {
            await updateBatchStatus(
              campaign.id,
              batch.batchNumber,
              'manually_sent',
              userDoc?.uid,
              userDoc?.name
            );
            onRefresh();
            showToast(`Batch #${batch.batchNumber} marked as Sent.`, 'success');
          } catch (err: any) {
            showToast(err?.message || 'Failed to update batch status.', 'error');
          }
        },
      });
    } else {
      try {
        await updateBatchStatus(
          campaign.id,
          batch.batchNumber,
          'prepared',
          userDoc?.uid,
          userDoc?.name
        );
        onRefresh();
        showToast(`Batch #${batch.batchNumber} reset to Pending.`, 'info');
      } catch (err: any) {
        showToast(err?.message || 'Failed to reset batch status.', 'error');
      }
    }
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
      onRefresh();
    } catch (err: any) {
      showToast(err?.message || 'Failed to cancel campaign.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* TOP ACTION BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/campaigns/history')}
          >
            Campaign History
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {campaign.campaignName}
              </h2>
              <Badge variant="brand" size="sm" className="bg-blue-600 text-white border-blue-600">
                SMS CAMPAIGN
              </Badge>
              <Badge variant="neutral" size="sm">
                {campaign.campaignType}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Prepared for Native Android Messages app. Zero-cost multi-recipient broadcast composer.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<FileText className="w-4 h-4 text-gray-600" />}
            onClick={() => setReportModalOpen(true)}
          >
            View Audit Report
          </Button>

          {campaign.status !== 'cancelled' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50"
              icon={<AlertTriangle className="w-4 h-4" />}
              onClick={() => setCancelModalOpen(true)}
            >
              Cancel Campaign
            </Button>
          )}
        </div>
      </div>

      {/* OVERALL CAMPAIGN PROGRESS STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Recipients</span>
          <p className="text-2xl font-black text-gray-900 font-mono mt-0.5">
            {campaign.totalEligible}
          </p>
          <span className="text-[10px] text-gray-500 font-medium">verified contacts</span>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 shadow-sm">
          <span className="text-[10px] font-bold text-blue-800 uppercase block">Total Batches</span>
          <p className="text-2xl font-black text-blue-950 font-mono mt-0.5">
            {campaign.totalBatches}
          </p>
          <span className="text-[10px] text-blue-700 font-bold">
            {campaign.batchSize || 10} contacts/batch
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-800 uppercase block">Batches Sent</span>
          <p className="text-2xl font-black text-emerald-950 font-mono mt-0.5">
            {sentBatchesCount} / {campaign.totalBatches}
          </p>
          <span className="text-[10px] text-emerald-700 font-bold">
            {Math.round((sentBatchesCount / (campaign.totalBatches || 1)) * 100)}% complete
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 shadow-sm">
          <span className="text-[10px] font-bold text-purple-800 uppercase block">Recipients Sent</span>
          <p className="text-2xl font-black text-purple-950 font-mono mt-0.5">
            {sentRecipientsCount} / {campaign.totalEligible}
          </p>
          <span className="text-[10px] text-purple-700 font-medium">manually verified</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm">
          <span className="text-[10px] font-bold text-amber-800 uppercase block">SMS Segments</span>
          <p className="text-2xl font-black text-amber-950 font-mono mt-0.5">
            {smsAnalysis.segments} {smsAnalysis.segments === 1 ? 'Part' : 'Parts'}
          </p>
          <span className="text-[10px] text-amber-800 font-bold">
            {smsAnalysis.encoding} ({smsAnalysis.charCount} chars)
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase block">Campaign Status</span>
          <div className="mt-1">
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
              {campaign.status.toUpperCase().replace('_', ' ')}
            </Badge>
          </div>
          <span className="text-[10px] text-gray-400 block mt-1">
            {campaign.status === 'manually_sent' ? 'Completed' : 'Action required'}
          </span>
        </div>
      </div>

      {/* CRITICAL SMS INSTRUCTION NOTICE BANNER */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-900 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600 shrink-0" />
          <h4 className="text-sm font-extrabold text-blue-950">
            How Free SMS Campaign Mode Works (Zero Cost native flow)
          </h4>
        </div>
        <ol className="list-decimal list-inside text-xs space-y-1 text-blue-900 leading-relaxed font-medium pl-1">
          <li>
            <b>Open SMS Composer:</b> Click <b>"Open in Messages App"</b> for each batch below. Your phone's default Messages app (Google Messages, Samsung Messages, etc.) will open with the numbers prefilled.
          </li>
          <li>
            <b>Multi-recipient check:</b> If your phone's SMS app supports group composing, all batch numbers will appear in the "To:" field. If your app only takes one number, click <b>"Copy Numbers"</b> and paste them into the "To:" field.
          </li>
          <li>
            <b>Review & Send:</b> Review the message text and press the native <b>Send</b> button in your Messages app.
          </li>
          <li>
            <b>Mark Sent:</b> Return to this screen and toggle <b>"Mark as Sent"</b> so your audit trail stays organized.
          </li>
        </ol>
        <p className="text-[11px] text-blue-800 font-semibold italic pt-1 border-t border-blue-200/60">
          Note: Telecom carriers do not report delivery statuses to third-party web apps. Statuses in this CMS represent your manual verification.
        </p>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: MESSAGE PREVIEW & MEDIA */}
        <div className="space-y-4 lg:col-span-1">
          {/* CREATIVE IMAGE (MMS) */}
          {campaign.imageUrl && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  MMS Campaign Creative
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={handleDownloadImage}
                >
                  Download Image
                </Button>
              </div>

              <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 p-1">
                <img
                  src={campaign.imageUrl}
                  alt="Campaign Creative"
                  className="w-full h-auto max-h-56 object-contain rounded-lg"
                />
              </div>

              <p className="text-[11px] text-gray-500 leading-normal">
                MMS image prefill requires carrier and device MMS capability. If your SMS app opens without the image, use <b>Download Image</b> and attach it from your gallery.
              </p>
            </Card>
          )}

          {/* SMS MESSAGE PREVIEW CARD */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                SMS Message Text
              </span>
              <Button
                variant="outline"
                size="sm"
                icon={<Copy className="w-3.5 h-3.5" />}
                onClick={handleCopyMessage}
              >
                Copy Message
              </Button>
            </div>

            {/* Mobile Chat Bubble Mockup */}
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>SMS • via SIM 1</span>
                <span>{smsAnalysis.segments} Part(s)</span>
              </div>
              <p className="text-xs text-gray-900 whitespace-pre-wrap font-sans leading-relaxed break-words bg-white p-3 rounded-xl shadow-xs border border-slate-200">
                {campaign.message}
              </p>
            </div>

            {/* SMS Segment Breakdown */}
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-700">Encoding:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    smsAnalysis.isUnicode
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {smsAnalysis.encoding}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-700">Total Characters:</span>
                <span className="font-mono font-bold text-gray-900">{smsAnalysis.charCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-700">Segments:</span>
                <span className="font-mono font-bold text-blue-700">
                  {smsAnalysis.segments} {smsAnalysis.segments === 1 ? 'part' : 'parts'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 pt-1 border-t border-gray-200 leading-normal">
                {smsAnalysis.explanation}
              </p>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: BATCH SELECTOR & EXECUTION */}
        <div className="space-y-4 lg:col-span-2">
          {/* BATCH SELECTION HEADER */}
          <Card className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  SMS Broadcast Batches
                </h3>
                <p className="text-xs text-gray-500">
                  Select a batch to launch in your Messages app or copy recipient numbers.
                </p>
              </div>

              {/* Number Separator Preference */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500 font-medium">Separator:</span>
                <button
                  type="button"
                  onClick={() => setSeparatorPreference(',')}
                  className={`px-2 py-1 rounded-lg font-bold border transition-all ${
                    separatorPreference === ','
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                  title="Comma separated (Default for Google Messages & AOSP)"
                >
                  Comma (,)
                </button>
                <button
                  type="button"
                  onClick={() => setSeparatorPreference(';')}
                  className={`px-2 py-1 rounded-lg font-bold border transition-all ${
                    separatorPreference === ';'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                  title="Semicolon separated (Preferred by Samsung Messages)"
                >
                  Semicolon (;)
                </button>
              </div>
            </div>

            {/* BATCH CARDS SCROLLER */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {campaign.batches.map((batch, idx) => {
                const isSelected = idx === selectedBatchIdx;
                const isSent = batch.status === 'manually_sent';
                const isOpened = batch.status === 'opened_in_messages';

                return (
                  <button
                    key={batch.id}
                    type="button"
                    onClick={() => setSelectedBatchIdx(idx)}
                    className={`p-3 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                        : isSent
                        ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-gray-900">
                        Batch #{batch.batchNumber}
                      </span>
                      {isSent ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isOpened ? (
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      ) : null}
                    </div>

                    <p className="text-[11px] font-mono font-bold text-gray-600">
                      {batch.recipientCount} contacts
                    </p>

                    <div className="mt-1.5">
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          isSent
                            ? 'bg-emerald-100 text-emerald-800'
                            : isOpened
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isSent ? 'Sent' : isOpened ? 'Opened' : 'Pending'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ACTIVE BATCH CONTROL PANEL */}
            {activeBatch && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/40 border border-blue-200 space-y-4 mt-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-gray-900">
                        Active: Batch #{activeBatch.batchNumber}
                      </h4>
                      <Badge
                        variant={
                          activeBatch.status === 'manually_sent'
                            ? 'success'
                            : activeBatch.status === 'opened_in_messages'
                            ? 'brand'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {activeBatch.status === 'manually_sent'
                          ? 'MARKED AS SENT'
                          : activeBatch.status === 'opened_in_messages'
                          ? 'OPENED IN MESSAGES'
                          : 'PENDING'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      Contains <b>{activeBatch.recipientCount} contacts</b> ready for SMS broadcast.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={activeBatch.status === 'manually_sent' ? 'outline' : 'primary'}
                      className={activeBatch.status === 'manually_sent' ? '' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                      size="sm"
                      icon={<Check className="w-3.5 h-3.5" />}
                      onClick={() => handleToggleBatchStatus(activeBatch)}
                    >
                      {activeBatch.status === 'manually_sent'
                        ? '↩ Reset to Pending'
                        : '✓ Mark Batch as Sent'}
                    </Button>
                  </div>
                </div>

                {/* PRIMARY ACTIONS: OPEN MESSAGES / COPY NUMBERS / COPY MESSAGE */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <Button
                    variant="primary"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md font-black text-xs py-2.5"
                    icon={<Send className="w-4 h-4" />}
                    onClick={() => handleOpenSmsAppForBatch(activeBatch)}
                  >
                    📱 Open in Messages App
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full bg-white text-gray-800 hover:bg-gray-50 border-gray-300 text-xs font-bold"
                    icon={<Copy className="w-3.5 h-3.5 text-blue-600" />}
                    onClick={() => handleCopyNumbers(activeBatch, separatorPreference)}
                  >
                    📋 Copy {activeBatch.recipientCount} Numbers
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full bg-white text-gray-800 hover:bg-gray-50 border-gray-300 text-xs font-bold"
                    icon={<Copy className="w-3.5 h-3.5 text-gray-600" />}
                    onClick={handleCopyMessage}
                  >
                    📋 Copy SMS Text
                  </Button>
                </div>

                {/* RECIPIENTS ACCORDION LIST */}
                <div className="space-y-2 pt-2 border-t border-blue-200/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRecipientList(!showRecipientList)}
                      className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5 hover:underline"
                    >
                      {showRecipientList ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      Batch Contacts ({activeBatch.recipientCount})
                    </button>

                    {showRecipientList && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Search batch..."
                          value={recipientSearch}
                          onChange={(e) => setRecipientSearch(e.target.value)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white"
                        />
                        <span className="text-[11px] text-gray-500 hidden sm:inline">
                          Use <b>"Send 1-on-1"</b> for personalized delivery
                        </span>
                      </div>
                    )}
                  </div>

                  {showRecipientList && (
                    <div className="max-h-72 overflow-y-auto rounded-xl border border-blue-200/80 bg-white divide-y divide-gray-100">
                      {activeBatch.recipients
                        .filter((r) => {
                          if (!recipientSearch.trim()) return true;
                          const q = recipientSearch.toLowerCase().trim();
                          return (
                            r.name.toLowerCase().includes(q) ||
                            r.phone.includes(q) ||
                            (r.company && r.company.toLowerCase().includes(q))
                          );
                        })
                        .map((r, rIdx) => (
                        <div
                          key={r.id || rIdx}
                          className="p-2.5 flex items-center justify-between text-xs hover:bg-gray-50 transition-colors gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-gray-900 truncate">{r.name}</span>
                              {r.company && (
                                <span className="text-[10px] text-gray-400 font-medium truncate">
                                  ({r.company})
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-gray-600 text-[11px]">
                              {formatPhone(r.phone)}
                            </span>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-700 hover:bg-blue-50 text-[11px] font-bold shrink-0"
                            icon={<ExternalLink className="w-3 h-3 text-blue-600" />}
                            onClick={() => handleSendIndividualSms(r.phone, r.name, r.company)}
                          >
                            Send 1-on-1
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* REPORT MODAL */}
      <CampaignReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        campaign={campaign}
      />

      {/* CANCEL MODAL */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Campaign"
      >
        <div className="space-y-4 text-xs">
          <p className="text-gray-600">
            Cancelling this campaign will stop further batch processing and mark the campaign as cancelled in audit logs.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
              Reason for Cancellation *
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Schedule postponed, content revised"
              className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              required
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setCancelModalOpen(false)}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="danger"
              className="w-full"
              loading={cancelling}
              onClick={handleExecuteCancel}
            >
              Confirm Cancel Campaign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
