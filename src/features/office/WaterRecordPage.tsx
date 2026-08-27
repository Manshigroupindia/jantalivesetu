import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FileUploader } from '../../components/common/FileUploader';
import { Droplet } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { WaterRecord } from '../../types';
import { createWaterRecord } from '../../services/firestoreService';
import { getCurrentDateISO } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { formatINR } from '../../utils/formatters';
import { orderBy } from 'firebase/firestore';

export const WaterRecordPage: React.FC = () => {
  const { userDoc, staffProfile } = useAuth();
  const { companySettings } = useCompany();
  const { data: records, loading } = useRealtimeCollection<WaterRecord>('waterRecords', [
    orderBy('createdAt', 'desc'),
  ]);

  const [bottlesCount, setBottlesCount] = useState(5);
  const [bottlePrice, setBottlePrice] = useState(companySettings?.waterBottlePrice || 20);
  const [date, setDate] = useState(getCurrentDateISO());
  const [supplierName, setSupplierName] = useState('Bisleri Vendor');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalCost = bottlesCount * bottlePrice;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;

    setSubmitting(true);
    try {
      await createWaterRecord({
        date,
        bottlesCount,
        bottlePrice,
        totalCost,
        supplierName,
        receiptUrl,
        loggedById: userDoc.uid,
        loggedByName: staffProfile?.fullName || userDoc.name || 'Staff',
        createdAt: new Date().toISOString(),
      });

      setBottlesCount(5);
      alert('Water bottle record saved.');
    } catch (err) {
      alert('Failed to log water record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Droplet className="w-7 h-7 text-blue-600" />
          Drinking Water Bottle Log
        </h1>
        <p className="text-xs text-gray-500 font-medium">
          Track office mineral water bottle deliveries, vendor details, and receipts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2">Log Water Delivery</h3>

          <form onSubmit={handleAdd} className="space-y-4">
            <Input
              label="Delivery Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Bottles Delivered"
                type="number"
                min={1}
                value={bottlesCount}
                onChange={(e) => setBottlesCount(parseInt(e.target.value, 10))}
                required
              />
              <Input
                label="Bottle Rate (₹)"
                type="number"
                value={bottlePrice}
                onChange={(e) => setBottlePrice(parseFloat(e.target.value))}
                required
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
              <span className="text-xs text-blue-700 font-semibold block">Total Cost:</span>
              <span className="text-2xl font-black text-blue-900 font-mono">{formatINR(totalCost)}</span>
            </div>

            <Input
              label="Supplier / Vendor Name"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              required
            />

            <FileUploader
              label="Attach Receipt / Voucher (Optional)"
              folder="janta-live-setu/water"
              currentUrl={receiptUrl}
              onFileUploaded={(url) => setReceiptUrl(url)}
            />

            <Button type="submit" variant="primary" className="w-full" loading={submitting}>
              Save Water Record
            </Button>
          </form>
        </Card>

        <Card className="p-6 space-y-4 lg:col-span-2">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2">Water Delivery Log History</h3>

          {loading ? (
            <p className="text-xs text-gray-400 animate-pulse text-center py-6">Loading entries...</p>
          ) : records.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center italic">No water delivery records found.</p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                  <div>
                    <p className="font-extrabold text-gray-900">{r.bottlesCount} Water Bottles ({r.supplierName})</p>
                    <p className="text-[11px] text-gray-500">By {r.loggedByName} | {r.date}</p>
                  </div>
                  <span className="text-sm font-black text-blue-600 font-mono">{formatINR(r.totalCost)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
