import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Download,
  Info
} from 'lucide-react';
import { Campaign, CampaignLog } from '../../types/campaign';
import { fetchCampaignLogs } from '../../services/campaignService';
import { generateCSV } from '../../utils/csvUtils';
import { downloadFile } from '../../utils/phoneUtils';
import { useNotification } from '../../contexts/NotificationContext';

interface CampaignReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
}

export const CampaignReportModal: React.FC<CampaignReportModalProps> = ({
  isOpen,
  onClose,
  campaign,
}) => {
  const { showToast } = useNotification();
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (isOpen && campaign.id) {
      setLoadingLogs(true);
      fetchCampaignLogs(campaign.id)
        .then((data) => setLogs(data))
        .finally(() => setLoadingLogs(false));
    }
  }, [isOpen, campaign.id]);

  const sentBatches = campaign.batches.filter((b) => b.status === 'manually_sent');
  const pendingBatches = campaign.batches.filter((b) => b.status !== 'manually_sent');
  const sentRecipientsCount = sentBatches.reduce((acc, b) => acc + b.recipientCount, 0);

  // Export Complete Report as CSV
  const handleExportReportCSV = () => {
    // 1. Compile all recipients across all batches with their status
    const rows: Array<{
      campaignName: string;
      campaignType: string;
      batchNumber: number;
      batchStatus: string;
      manuallySentAt: string;
      clientName: string;
      mobileNumber: string;
      company: string;
    }> = [];

    campaign.batches.forEach((b) => {
      b.recipients.forEach((r) => {
        rows.push({
          campaignName: campaign.campaignName,
          campaignType: campaign.campaignType,
          batchNumber: b.batchNumber,
          batchStatus: b.status.toUpperCase(),
          manuallySentAt: b.manuallySentAt
            ? new Date(b.manuallySentAt).toLocaleString()
            : 'Pending',
          clientName: r.name,
          mobileNumber: r.normalizedPhone || r.phone,
          company: r.company || '',
        });
      });
    });

    const csvData = generateCSV(rows, [
      { key: 'campaignName', label: 'Campaign Name' },
      { key: 'campaignType', label: 'Campaign Type' },
      { key: 'batchNumber', label: 'Broadcast Batch' },
      { key: 'batchStatus', label: 'Batch Status' },
      { key: 'manuallySentAt', label: 'Confirmed Sent Timestamp' },
      { key: 'clientName', label: 'Recipient Name' },
      { key: 'mobileNumber', label: 'Mobile Number' },
      { key: 'company', label: 'Company' },
    ]);

    const filename = `${campaign.campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_Full_Audit_Report.csv`;
    downloadFile(csvData, filename, 'text/csv;charset=utf-8;');
    showToast('Campaign audit report downloaded as CSV.', 'success');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Campaign Audit & Performance Report" maxWidth="2xl">
      <div className="space-y-6 text-xs">
        {/* SUMMARY HEADER BANNER */}
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-gray-900">{campaign.campaignName}</h3>
              <Badge variant="brand" size="sm">
                {campaign.campaignType}
              </Badge>
            </div>
            <p className="text-gray-500 mt-0.5">
              Created on {new Date(campaign.createdAt).toLocaleDateString()} by{' '}
              <span className="font-bold text-gray-700">{campaign.createdByName || 'Admin'}</span>
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportReportCSV}
          >
            Download CSV Report
          </Button>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <span className="text-[10px] font-black uppercase text-blue-800 block">Eligible Clients</span>
            <p className="text-xl font-black font-mono text-blue-950 mt-0.5">{campaign.totalEligible}</p>
            <span className="text-[10px] text-blue-700">100% consent verified</span>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
            <span className="text-[10px] font-black uppercase text-gray-600 block">Excluded Contacts</span>
            <p className="text-xl font-black font-mono text-gray-900 mt-0.5">{campaign.totalExcluded || 0}</p>
            <span className="text-[10px] text-gray-500">inactive / no consent</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] font-black uppercase text-emerald-800 block">Batches Sent</span>
            <p className="text-xl font-black font-mono text-emerald-950 mt-0.5">
              {sentBatches.length} / {campaign.totalBatches}
            </p>
            <span className="text-[10px] text-emerald-700 font-bold">
              {sentRecipientsCount} recipients covered
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-[10px] font-black uppercase text-amber-800 block">Pending Batches</span>
            <p className="text-xl font-black font-mono text-amber-950 mt-0.5">{pendingBatches.length}</p>
            <span className="text-[10px] text-amber-700">
              {pendingBatches.reduce((acc, b) => acc + b.recipientCount, 0)} recipients pending
            </span>
          </div>
        </div>

        {/* CLARITY NOTICE: PREPARED VS CONFIRMED VS DELIVERY */}
        <div className="p-3 rounded-xl bg-brand-50 border border-brand-200 text-brand-950 space-y-1">
          <p className="font-extrabold flex items-center gap-1.5 text-brand-900">
            <Info className="w-4 h-4 text-brand-600 shrink-0" />
            Zero-Cost Architecture Delivery Transparency:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-brand-900 leading-normal">
            <li>
              <b>Prepared Recipients ({campaign.totalEligible}):</b> Verified opt-in clients segmented into WhatsApp Business broadcast batches.
            </li>
            <li>
              <b>Manually Confirmed Sent ({sentRecipientsCount}):</b> Batches that the administrator confirmed sending manually via WhatsApp Business.
            </li>
            <li>
              <b>Actual WhatsApp Delivery:</b> Governed by WhatsApp's anti-spam rules (messages are delivered only if the client has saved the company number in their phone). Automated read/delivery receipts are not available via native broadcast.
            </li>
          </ul>
        </div>

        {/* BATCH-BY-BATCH AUDIT STATUS */}
        <div className="space-y-2">
          <h4 className="font-extrabold text-gray-900 uppercase tracking-wider text-[11px]">
            Batch Breakdown Audit ({campaign.batches.length} Batches)
          </h4>
          <div className="border border-gray-200 rounded-xl divide-y">
            {campaign.batches.map((b) => (
              <div key={b.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-gray-900 text-sm">Batch #{b.batchNumber}</span>
                    <span className="text-gray-500 font-mono text-xs">
                      ({b.recipientCount} recipients)
                    </span>
                  </div>
                  {b.manuallySentAt && (
                    <p className="text-[11px] text-emerald-700 font-medium">
                      Confirmed sent on {new Date(b.manuallySentAt).toLocaleString()} by{' '}
                      {b.markedSentByName || 'Admin'}
                    </p>
                  )}
                </div>

                <Badge variant={b.status === 'manually_sent' ? 'success' : 'neutral'} size="sm">
                  {b.status === 'manually_sent' ? 'MANUALLY SENT' : 'PREPARED / PENDING'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* ACTIVITY LOGS AUDIT TRAIL */}
        <div className="space-y-2">
          <h4 className="font-extrabold text-gray-900 uppercase tracking-wider text-[11px]">
            Activity & Audit Log ({logs.length} entries)
          </h4>
          {loadingLogs ? (
            <p className="text-gray-400 py-3 text-center">Loading audit history...</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-400 py-3 text-center italic">No activity logs recorded yet.</p>
          ) : (
            <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-xl divide-y text-[11px]">
              {logs.map((log) => (
                <div key={log.id} className="p-2.5 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-gray-800 font-medium">{log.description}</p>
                    <p className="text-gray-400 text-[10px]">
                      By {log.performedByName || 'Admin'}
                    </p>
                  </div>
                  <span className="text-gray-400 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            Close Report
          </Button>
        </div>
      </div>
    </Modal>
  );
};
