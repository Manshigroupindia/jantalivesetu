import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Coffee, Plus, Search, Calendar, DollarSign } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { TeaSnackLog } from '../../types';
import { createTeaSnackLog } from '../../services/firestoreService';
import { getCurrentDateISO } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { formatINR } from '../../utils/formatters';
import { orderBy } from 'firebase/firestore';

export const TeaSnacksPage: React.FC = () => {
  const { userDoc, staffProfile } = useAuth();
  const { companySettings } = useCompany();
  const { data: logs, loading } = useRealtimeCollection<TeaSnackLog>('teaSnackLogs', [
    orderBy('createdAt', 'desc'),
  ]);

  const [itemType, setItemType] = useState('tea');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(companySettings?.teaUnitPrice || 10);
  const [date, setDate] = useState(getCurrentDateISO());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalPrice = quantity * unitPrice;

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;

    setSubmitting(true);
    try {
      await createTeaSnackLog({
        date,
        itemType: itemType as any,
        quantity,
        unitPrice,
        totalPrice,
        loggedById: userDoc.uid,
        loggedByName: staffProfile?.fullName || userDoc.name || 'Staff',
        notes,
        createdAt: new Date().toISOString(),
      });

      setQuantity(1);
      setNotes('');
      alert('Tea / Snacks log added.');
    } catch (err) {
      alert('Failed to log tea/snacks entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Coffee className="w-7 h-7 text-brand-600" />
          Tea & Snacks Daily Log
        </h1>
        <p className="text-xs text-gray-500 font-medium">
          Track daily office refreshment expenses with auto price calculation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LOG FORM */}
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2">Log New Entry</h3>

          <form onSubmit={handleAddLog} className="space-y-4">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <Select
              label="Item Type"
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              options={[
                { value: 'tea', label: 'Tea Cups' },
                { value: 'coffee', label: 'Coffee Cups' },
                { value: 'snacks', label: 'Snacks / Biscuits' },
              ]}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                required
              />
              <Input
                label="Unit Price (₹)"
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value))}
                required
              />
            </div>

            <div className="bg-brand-50 p-3 rounded-xl border border-brand-200 text-center">
              <span className="text-xs text-brand-700 font-semibold block">Total Amount:</span>
              <span className="text-2xl font-black text-brand-900 font-mono">{formatINR(totalPrice)}</span>
            </div>

            <Input
              label="Notes (Optional)"
              placeholder="e.g. Snacks for guests"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Button type="submit" variant="primary" className="w-full" loading={submitting}>
              Add Log Entry
            </Button>
          </form>
        </Card>

        {/* RECENT LOGS */}
        <Card className="p-6 space-y-4 lg:col-span-2">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2">Recent Refreshment Logs</h3>

          {loading ? (
            <p className="text-xs text-gray-400 animate-pulse text-center py-6">Loading entries...</p>
          ) : logs.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center italic">No refreshment logs recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                  <div>
                    <p className="font-extrabold text-gray-900 uppercase">
                      {log.quantity}x {log.itemType} ({formatINR(log.unitPrice)} each)
                    </p>
                    <p className="text-[11px] text-gray-500">By {log.loggedByName} | {log.date}</p>
                  </div>
                  <span className="text-sm font-black text-brand-600 font-mono">{formatINR(log.totalPrice)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
