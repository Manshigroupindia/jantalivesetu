import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FileUploader } from '../../components/common/FileUploader';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { CleaningRecord } from '../../types';
import { createCleaningRecord } from '../../services/firestoreService';
import { getCurrentDateISO } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { formatINR } from '../../utils/formatters';
import { orderBy } from 'firebase/firestore';

export const OfficeCleanlinessPage: React.FC = () => {
  const { userDoc, staffProfile } = useAuth();
  const { data: records, loading } = useRealtimeCollection<CleaningRecord>('cleaningRecords', [
    orderBy('createdAt', 'desc'),
  ]);

  const [date, setDate] = useState(getCurrentDateISO());
  const [cleaningArea, setCleaningArea] = useState('office_floor');
  const [cleanerName, setCleanerName] = useState('Ramesh Housekeeping');
  const [amountPaid, setAmountPaid] = useState(300);
  const [inspectionPhotoUrl, setInspectionPhotoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;

    setSubmitting(true);
    try {
      await createCleaningRecord({
        date,
        cleaningArea: cleaningArea as any,
        cleanerName,
        amountPaid,
        inspectionPhotoUrl,
        notes,
        loggedById: userDoc.uid,
        loggedByName: staffProfile?.fullName || userDoc.name || 'Staff',
        createdAt: new Date().toISOString(),
      });

      alert('Cleaning record logged successfully.');
    } catch (err) {
      alert('Failed to log cleaning record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-indigo-600" />
          Office & Toilet Cleaning Logs
        </h1>
        <p className="text-xs text-gray-500 font-medium">
          Monitor hygiene, house-keeping payouts, toilet sanitation records, and inspection photos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2">Log Cleaning Record</h3>

          <form onSubmit={handleAdd} className="space-y-4">
            <Input
              label="Log Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <Select
              label="Cleaning Area"
              value={cleaningArea}
              onChange={(e) => setCleaningArea(e.target.value)}
              options={[
                { value: 'office_floor', label: 'Main Office Floor' },
                { value: 'toilet', label: 'Toilet / Washrooms Sanitation' },
                { value: 'full_premises', label: 'Complete Premises Deep Clean' },
              ]}
            />

            <Input
              label="Housekeeping Staff / Vendor Name"
              value={cleanerName}
              onChange={(e) => setCleanerName(e.target.value)}
              required
            />

            <Input
              label="Amount Paid (₹)"
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(parseFloat(e.target.value))}
              required
            />

            <FileUploader
              label="Attach Inspection Photo"
              folder="janta-live-setu/cleanliness"
              currentUrl={inspectionPhotoUrl}
              onFileUploaded={(url) => setInspectionPhotoUrl(url)}
            />

            <Input
              label="Cleanliness Notes"
              placeholder="e.g. Disinfected all desks & washrooms"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Button type="submit" variant="primary" className="w-full" loading={submitting}>
              Save Cleaning Record
            </Button>
          </form>
        </Card>

        <Card className="p-6 space-y-4 lg:col-span-2">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2">Hygiene & Sanitation Log History</h3>

          {loading ? (
            <p className="text-xs text-gray-400 animate-pulse text-center py-6">Loading entries...</p>
          ) : records.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center italic">No cleaning records found.</p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                  <div>
                    <p className="font-extrabold text-gray-900 uppercase">
                      {r.cleaningArea.replace('_', ' ')} ({r.cleanerName})
                    </p>
                    <p className="text-[11px] text-gray-500">By {r.loggedByName} | {r.date}</p>
                  </div>
                  <span className="text-sm font-black text-indigo-600 font-mono">{formatINR(r.amountPaid)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
