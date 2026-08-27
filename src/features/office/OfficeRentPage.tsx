import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FileUploader } from '../../components/common/FileUploader';
import { Building, Lock } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { OfficeRentRecord } from '../../types';
import { createOfficeRentRecord } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { useSecurity } from '../../contexts/SecurityContext';
import { formatINR } from '../../utils/formatters';
import { orderBy } from 'firebase/firestore';

export const OfficeRentPage: React.FC = () => {
  const { userDoc, staffProfile } = useAuth();
  const { requirePinVerification } = useSecurity();
  const { data: records, loading } = useRealtimeCollection<OfficeRentRecord>('officeRentRecords', [
    orderBy('createdAt', 'desc'),
  ]);

  const [month, setMonth] = useState('2026-08');
  const [rentAmount, setRentAmount] = useState(35000);
  const [landlordName, setLandlordName] = useState('Property Owner Name');
  const [paymentMode, setPaymentMode] = useState('online');
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;

    requirePinVerification('Log Monthly Office Rent Payment', async () => {
      setSubmitting(true);
      try {
        await createOfficeRentRecord({
          month,
          rentAmount,
          landlordName,
          paymentMode: paymentMode as any,
          transactionRef,
          receiptUrl,
          loggedById: userDoc.uid,
          loggedByName: staffProfile?.fullName || userDoc.name || 'Director',
          createdAt: new Date().toISOString(),
        });

        alert('Office rent payment record saved.');
      } catch (err) {
        alert('Failed to log rent payment.');
      } finally {
        setSubmitting(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Building className="w-7 h-7 text-purple-600" />
          Office Rent Management
        </h1>
        <p className="text-xs text-gray-500 font-medium">
          Log monthly premises rent payouts, landlord details, transaction reference, and receipts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2">Log Rent Payout</h3>

          <form onSubmit={handleAdd} className="space-y-4">
            <Input
              label="Rent Month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
            />

            <Input
              label="Rent Amount (₹)"
              type="number"
              value={rentAmount}
              onChange={(e) => setRentAmount(parseFloat(e.target.value))}
              required
            />

            <Input
              label="Landlord / Owner Name"
              value={landlordName}
              onChange={(e) => setLandlordName(e.target.value)}
              required
            />

            <Select
              label="Payment Mode"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              options={[
                { value: 'online', label: 'Online Bank Transfer / UPI' },
                { value: 'cheque', label: 'Bank Cheque' },
                { value: 'cash', label: 'Cash Payment' },
              ]}
            />

            <Input
              label="Transaction UTR / Reference No."
              placeholder="e.g. UTR123456789"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
            />

            <FileUploader
              label="Attach Rent Receipt / Agreement"
              folder="janta-live-setu/rent"
              currentUrl={receiptUrl}
              onFileUploaded={(url) => setReceiptUrl(url)}
            />

            <Button type="submit" variant="primary" className="w-full" loading={submitting} icon={<Lock className="w-4 h-4" />}>
              Save Rent Payment (PIN)
            </Button>
          </form>
        </Card>

        <Card className="p-6 space-y-4 lg:col-span-2">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2">Rent Payment Log History</h3>

          {loading ? (
            <p className="text-xs text-gray-400 animate-pulse text-center py-6">Loading entries...</p>
          ) : records.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center italic">No rent records found.</p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                  <div>
                    <p className="font-extrabold text-gray-900">
                      Rent for {r.month} ({r.landlordName})
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Mode: {(r.paymentMode || 'ONLINE').toUpperCase()} | Ref: {r.transactionRef || 'N/A'}
                    </p>
                  </div>
                  <span className="text-sm font-black text-purple-600 font-mono">{formatINR(r.rentAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
