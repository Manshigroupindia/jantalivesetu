import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FileUploader } from '../../components/common/FileUploader';
import { Zap } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { ElectricityRecord } from '../../types';
import { createElectricityRecord } from '../../services/firestoreService';
import { getCurrentDateISO } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { formatINR } from '../../utils/formatters';
import { orderBy } from 'firebase/firestore';

export const ElectricityRecordPage: React.FC = () => {
  const { userDoc, staffProfile } = useAuth();
  const { companySettings } = useCompany();
  const { data: records, loading } = useRealtimeCollection<ElectricityRecord>('electricityRecords', [
    orderBy('createdAt', 'desc'),
  ]);

  const [date, setDate] = useState(getCurrentDateISO());
  const [prevReading, setPrevReading] = useState(companySettings?.electricityPreviousReading || 1200);
  const [currentReading, setCurrentReading] = useState(1350);
  const [unitRate, setUnitRate] = useState(companySettings?.electricityUnitRate || 14);
  const [meterPhotoUrl, setMeterPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const unitsConsumed = Math.max(0, currentReading - prevReading);
  const totalAmount = unitsConsumed * unitRate;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;

    if (currentReading < prevReading) {
      alert('Current reading cannot be lower than previous reading.');
      return;
    }

    setSubmitting(true);
    try {
      await createElectricityRecord({
        date,
        previousReading: prevReading,
        currentReading,
        unitsConsumed,
        unitRate,
        totalAmount,
        meterPhotoUrl,
        isPaid: false,
        loggedById: userDoc.uid,
        loggedByName: staffProfile?.fullName || userDoc.name || 'Staff',
        createdAt: new Date().toISOString(),
      });

      alert('Electricity meter reading logged.');
    } catch (err) {
      alert('Failed to log electricity reading.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Zap className="w-7 h-7 text-amber-500" />
          Electricity Meter & Bill Records
        </h1>
        <p className="text-xs text-gray-500 font-medium">
          Record office sub-meter readings, unit rates, meter photos, and calculate monthly power bills.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2">Log Sub-Meter Reading</h3>

          <form onSubmit={handleAdd} className="space-y-4">
            <Input
              label="Reading Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Previous Reading"
                type="number"
                value={prevReading}
                onChange={(e) => setPrevReading(parseFloat(e.target.value))}
                required
              />
              <Input
                label="Current Reading"
                type="number"
                value={currentReading}
                onChange={(e) => setCurrentReading(parseFloat(e.target.value))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Units Consumed"
                type="number"
                value={unitsConsumed}
                disabled
              />
              <Input
                label="Unit Rate (₹/kWh)"
                type="number"
                value={unitRate}
                onChange={(e) => setUnitRate(parseFloat(e.target.value))}
                required
              />
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
              <span className="text-xs text-amber-700 font-semibold block">Calculated Electricity Bill:</span>
              <span className="text-2xl font-black text-amber-900 font-mono">{formatINR(totalAmount)}</span>
            </div>

            <FileUploader
              label="Attach Sub-Meter Photo"
              folder="janta-live-setu/electricity"
              currentUrl={meterPhotoUrl}
              onFileUploaded={(url) => setMeterPhotoUrl(url)}
            />

            <Button type="submit" variant="primary" className="w-full" loading={submitting}>
              Save Reading Record
            </Button>
          </form>
        </Card>

        <Card className="p-6 space-y-4 lg:col-span-2">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2">Sub-Meter Reading History</h3>

          {loading ? (
            <p className="text-xs text-gray-400 animate-pulse text-center py-6">Loading entries...</p>
          ) : records.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center italic">No electricity records found.</p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                  <div>
                    <p className="font-extrabold text-gray-900">
                      {r.unitsConsumed} Units ({r.previousReading} → {r.currentReading}) @ ₹{r.unitRate}/unit
                    </p>
                    <p className="text-[11px] text-gray-500">By {r.loggedByName} | {r.date}</p>
                  </div>
                  <span className="text-sm font-black text-amber-600 font-mono">{formatINR(r.totalAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
