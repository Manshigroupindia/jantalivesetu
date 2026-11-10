import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Upload,
  FileText,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { Client, ClientImportRecord } from '../../types/campaign';
import { parseCSV, detectColumnMapping } from '../../utils/csvUtils';
import { normalizePhone } from '../../utils/phoneUtils';
import { bulkImportClients } from '../../services/campaignService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

interface ClientImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  existingClients: Client[];
  onImportComplete: () => void;
}

export const ClientImportWizard: React.FC<ClientImportWizardProps> = ({
  isOpen,
  onClose,
  existingClients,
  onImportComplete,
}) => {
  const { userDoc } = useAuth();
  const { showToast } = useNotification();

  // Wizard state: 1 = upload, 2 = column mapping, 3 = preview & validation, 4 = confirming
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({
    name: '',
    phone: '',
    company: '',
    email: '',
    category: '',
    whatsappConsent: '',
    status: '',
    notes: '',
  });

  const [updateExisting, setUpdateExisting] = useState(true);
  const [processedRecords, setProcessedRecords] = useState<ClientImportRecord[]>([]);
  const [importing, setImporting] = useState(false);

  // Existing phone map for instant collision lookup
  const existingPhoneMap = React.useMemo(() => {
    const map = new Map<string, Client>();
    existingClients.forEach((c) => {
      if (c.normalizedPhone) map.set(c.normalizedPhone, c);
    });
    return map;
  }, [existingClients]);

  // Handle File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);

        if (parsed.length < 2) {
          showToast('The CSV file appears to be empty or contains only headers.', 'error');
          return;
        }

        const fileHeaders = parsed[0];
        const dataRows = parsed.slice(1);

        setHeaders(fileHeaders);
        setRawRows(dataRows);

        // Auto-detect columns
        const detected = detectColumnMapping(fileHeaders);
        setColumnMap((prev) => ({
          ...prev,
          ...detected,
        }));

        setStep(2);
      } catch (err: any) {
        showToast('Failed to parse CSV file. Please ensure it is standard UTF-8 encoded.', 'error');
      }
    };

    reader.readAsText(file);
  };

  // Analyze records based on column mapping
  const processValidation = () => {
    if (!columnMap.name || !columnMap.phone) {
      showToast('Name and Mobile Number column mappings are required.', 'warning');
      return;
    }

    const nameIdx = headers.indexOf(columnMap.name);
    const phoneIdx = headers.indexOf(columnMap.phone);
    const companyIdx = columnMap.company ? headers.indexOf(columnMap.company) : -1;
    const emailIdx = columnMap.email ? headers.indexOf(columnMap.email) : -1;
    const catIdx = columnMap.category ? headers.indexOf(columnMap.category) : -1;
    const consentIdx = columnMap.whatsappConsent ? headers.indexOf(columnMap.whatsappConsent) : -1;
    const statusIdx = columnMap.status ? headers.indexOf(columnMap.status) : -1;
    const notesIdx = columnMap.notes ? headers.indexOf(columnMap.notes) : -1;

    const seenPhonesInFile = new Set<string>();
    const records: ClientImportRecord[] = [];

    rawRows.forEach((row) => {
      const name = (row[nameIdx] || '').trim();
      const rawPhone = (row[phoneIdx] || '').trim();
      const company = companyIdx >= 0 ? (row[companyIdx] || '').trim() : '';
      const email = emailIdx >= 0 ? (row[emailIdx] || '').trim() : '';
      const category = catIdx >= 0 && row[catIdx]?.trim() ? row[catIdx].trim() : 'Corporate';
      const consentVal = consentIdx >= 0 ? (row[consentIdx] || '').toLowerCase().trim() : 'yes';
      const statusVal = statusIdx >= 0 ? (row[statusIdx] || '').toLowerCase().trim() : 'active';
      const notes = notesIdx >= 0 ? (row[notesIdx] || '').trim() : '';

      const whatsappConsent = ['yes', 'true', '1', 'y', 'optin', 'consented'].includes(consentVal);
      const status = ['inactive', 'deactivated', '0', 'no', 'false'].includes(statusVal)
        ? 'inactive'
        : 'active';

      if (!name && !rawPhone) return; // skip completely blank row

      const phoneRes = normalizePhone(rawPhone);
      let isValid = true;
      let validationError: string | undefined = undefined;

      if (!name) {
        isValid = false;
        validationError = 'Name is missing';
      } else if (!phoneRes.isValid) {
        isValid = false;
        validationError = phoneRes.error || 'Invalid mobile number';
      }

      // Check duplicates within file
      let isDuplicateInFile = false;
      if (phoneRes.isValid) {
        if (seenPhonesInFile.has(phoneRes.normalized)) {
          isDuplicateInFile = true;
          isValid = false;
          validationError = 'Duplicate mobile number in this file';
        } else {
          seenPhonesInFile.add(phoneRes.normalized);
        }
      }

      // Check existing client in DB
      const existingClient = phoneRes.isValid ? existingPhoneMap.get(phoneRes.normalized) : undefined;
      const isExistingInDb = Boolean(existingClient);

      records.push({
        name,
        phone: rawPhone,
        normalizedPhone: phoneRes.normalized,
        company,
        email,
        category,
        whatsappConsent,
        status,
        notes,
        isValid,
        isDuplicateInFile,
        isExistingInDb,
        existingClientId: existingClient?.id,
        validationError,
      });
    });

    setProcessedRecords(records);
    setStep(3);
  };

  // Summary counts
  const validNewCount = processedRecords.filter((r) => r.isValid && !r.isExistingInDb).length;
  const validUpdateCount = processedRecords.filter((r) => r.isValid && r.isExistingInDb).length;
  const invalidCount = processedRecords.filter((r) => !r.isValid && !r.isDuplicateInFile).length;
  const duplicateFileCount = processedRecords.filter((r) => r.isDuplicateInFile).length;

  const totalToImport = updateExisting ? validNewCount + validUpdateCount : validNewCount;

  // Final Commit Import
  const handleExecuteImport = async () => {
    if (totalToImport === 0) {
      showToast('No eligible records to import.', 'warning');
      return;
    }

    setImporting(true);
    try {
      // Filter records according to settings
      const recordsToCommit = processedRecords
        .filter((r) => r.isValid && (updateExisting || !r.isExistingInDb))
        .map((r) => ({
          name: r.name,
          phone: r.phone,
          normalizedPhone: r.normalizedPhone,
          company: r.company || '',
          email: r.email || '',
          category: r.category || 'Other',
          whatsappConsent: r.whatsappConsent,
          status: r.status,
          notes: r.notes || '',
          createdById: userDoc?.uid,
          createdByName: userDoc?.name || 'Admin',
        }));

      const res = await bulkImportClients(recordsToCommit, userDoc?.uid, userDoc?.name || 'Admin');
      showToast(
        `Import completed successfully! Added ${res.added} new client(s) and updated ${res.updated} existing record(s).`,
        'success'
      );
      onImportComplete();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to complete client import.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFileName('');
    setRawRows([]);
    setHeaders([]);
    setProcessedRecords([]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Clients Wizard" maxWidth="2xl">
      <div className="space-y-6">
        {/* STEPPER PROGRESS */}
        <div className="flex items-center justify-between border-b pb-3 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                step === 1 ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-800'
              }`}
            >
              1
            </span>
            <span className={step === 1 ? 'font-black text-gray-900' : 'text-gray-500 font-semibold'}>
              Upload File
            </span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                step === 2 ? 'bg-brand-600 text-white' : step > 2 ? 'bg-brand-100 text-brand-800' : 'bg-gray-100 text-gray-500'
              }`}
            >
              2
            </span>
            <span className={step === 2 ? 'font-black text-gray-900' : 'text-gray-500 font-semibold'}>
              Map Columns
            </span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                step === 3 ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              3
            </span>
            <span className={step === 3 ? 'font-black text-gray-900' : 'text-gray-500 font-semibold'}>
              Validation & Confirm
            </span>
          </div>
        </div>

        {/* STEP 1: UPLOAD */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-500 transition-colors bg-gray-50/50">
              <Upload className="w-12 h-12 text-brand-600 mx-auto mb-3" />
              <h4 className="text-base font-extrabold text-gray-900 mb-1">
                Select CSV or Excel (.csv) file
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                Upload your client database file containing names, mobile numbers, company names, and categories.
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all">
                  <FileText className="w-4 h-4" /> Browse CSV File
                </span>
              </label>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                Format Recommendations:
              </p>
              <p className="text-blue-800 text-[11px]">
                Columns can be in any order. The wizard will automatically recognize columns like <b>Name</b>, <b>Mobile Number</b>, <b>Company</b>, <b>Category</b>, and <b>Consent</b>.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: MAP COLUMNS */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h4 className="text-sm font-extrabold text-gray-900">
                  Verify CSV Column Mapping ({rawRows.length} rows found)
                </h4>
                <p className="text-xs text-gray-500">File: {fileName}</p>
              </div>
              <Button variant="ghost" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={handleReset}>
                Choose Different File
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Name Column *
                </label>
                <select
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-1 focus:ring-brand-500"
                  value={columnMap.name}
                  onChange={(e) => setColumnMap({ ...columnMap, name: e.target.value })}
                >
                  <option value="">Select Column...</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mobile Number Column *
                </label>
                <select
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-1 focus:ring-brand-500"
                  value={columnMap.phone}
                  onChange={(e) => setColumnMap({ ...columnMap, phone: e.target.value })}
                >
                  <option value="">Select Column...</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Company Name (Optional)
                </label>
                <select
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-1 focus:ring-brand-500"
                  value={columnMap.company}
                  onChange={(e) => setColumnMap({ ...columnMap, company: e.target.value })}
                >
                  <option value="">None / Not in CSV</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email Address (Optional)
                </label>
                <select
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-1 focus:ring-brand-500"
                  value={columnMap.email}
                  onChange={(e) => setColumnMap({ ...columnMap, email: e.target.value })}
                >
                  <option value="">None / Not in CSV</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Client Category (Optional)
                </label>
                <select
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-1 focus:ring-brand-500"
                  value={columnMap.category}
                  onChange={(e) => setColumnMap({ ...columnMap, category: e.target.value })}
                >
                  <option value="">Default to "Corporate"</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  WhatsApp Consent (Optional)
                </label>
                <select
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:ring-1 focus:ring-brand-500"
                  value={columnMap.whatsappConsent}
                  onChange={(e) => setColumnMap({ ...columnMap, whatsappConsent: e.target.value })}
                >
                  <option value="">Default to "Yes (Consented)"</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleReset}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={processValidation}
                disabled={!columnMap.name || !columnMap.phone}
              >
                Validate & Preview
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW & CONFIRMATION */}
        {step === 3 && (
          <div className="space-y-4">
            {/* STATS TILES */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-black uppercase text-emerald-800">New Clients</span>
                <p className="text-xl font-black text-emerald-950 font-mono mt-1">{validNewCount}</p>
                <span className="text-[10px] text-emerald-700 font-semibold">Will be added</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-[10px] font-black uppercase text-blue-800">Existing Clients</span>
                <p className="text-xl font-black text-blue-950 font-mono mt-1">{validUpdateCount}</p>
                <span className="text-[10px] text-blue-700 font-semibold">
                  {updateExisting ? 'Will be updated' : 'Will be skipped'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-black uppercase text-amber-800">Duplicates In File</span>
                <p className="text-xl font-black text-amber-950 font-mono mt-1">{duplicateFileCount}</p>
                <span className="text-[10px] text-amber-700 font-semibold">Auto-excluded</span>
              </div>

              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <span className="text-[10px] font-black uppercase text-red-800">Invalid Records</span>
                <p className="text-xl font-black text-red-950 font-mono mt-1">{invalidCount}</p>
                <span className="text-[10px] text-red-700 font-semibold">Missing/bad phone</span>
              </div>
            </div>

            {/* OVERWRITE SETTING */}
            {validUpdateCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-900">
                    Existing Clients Collision ({validUpdateCount} records found in database)
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={(e) => setUpdateExisting(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span className="font-semibold text-gray-800 text-[11px]">
                      Update existing client details with CSV data (if unchecked, existing clients will remain unchanged)
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* PREVIEW TABLE */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-gray-700">
                Sample Record Preview (First 15 records shown)
              </span>
              <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl divide-y text-xs">
                {processedRecords.slice(0, 15).map((r, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between hover:bg-gray-50">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{r.name}</span>
                        {r.company && <span className="text-gray-500 text-[11px]">({r.company})</span>}
                      </div>
                      <p className="text-gray-500 font-mono text-[11px]">
                        {r.phone} {r.normalizedPhone && r.normalizedPhone !== r.phone ? `→ ${r.normalizedPhone}` : ''}
                      </p>
                    </div>

                    <div>
                      {r.isDuplicateInFile ? (
                        <Badge variant="warning" size="sm">
                          Duplicate in File
                        </Badge>
                      ) : !r.isValid ? (
                        <Badge variant="danger" size="sm">
                          {r.validationError || 'Invalid'}
                        </Badge>
                      ) : r.isExistingInDb ? (
                        <Badge variant="info" size="sm">
                          Existing Client
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          New Client
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleExecuteImport}
                loading={importing}
                disabled={totalToImport === 0}
              >
                Confirm & Import {totalToImport} Client(s)
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
