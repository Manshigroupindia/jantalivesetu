import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { FileUploader } from '../../components/common/FileUploader';
import { Droplet, Calendar, Edit3, Trash2, AlertTriangle, History, Plus } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { WaterRecord } from '../../types';
import { createWaterRecord, updateWaterRecord, deleteWaterRecord } from '../../services/firestoreService';
import { getCurrentDateISO, getCurrentMonthISO, formatDateFormatted } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useNotification } from '../../contexts/NotificationContext';
import { formatINR } from '../../utils/formatters';
import { orderBy } from 'firebase/firestore';

export const WaterRecordPage: React.FC = () => {
  const { userDoc, staffProfile } = useAuth();
  const { companySettings } = useCompany();
  const { showToast, showConfirm } = useNotification();

  const { data: records, loading } = useRealtimeCollection<WaterRecord>('waterRecords', [
    orderBy('createdAt', 'desc'),
  ]);

  // Selected Month Filter
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthISO());

  // Add Form State
  const [bottlesCount, setBottlesCount] = useState(5);
  const [bottlePrice, setBottlePrice] = useState(companySettings?.waterBottlePrice || 20);
  const [date, setDate] = useState(getCurrentDateISO());
  const [supplierName, setSupplierName] = useState('Bisleri Vendor');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<WaterRecord | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editBottlesCount, setEditBottlesCount] = useState(5);
  const [editBottlePrice, setEditBottlePrice] = useState(20);
  const [editSupplierName, setEditSupplierName] = useState('');
  const [editReceiptUrl, setEditReceiptUrl] = useState('');
  const [editReason, setEditReason] = useState('');
  const [updating, setUpdating] = useState(false);

  // Derived Month Options (Last 12 months)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const val = `${year}-${monthStr}`;
      const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value: val, label });
    }
    return options;
  }, []);

  // Check if a record already exists for the selected date
  const existingWaterRecord = useMemo(() => {
    return records.find((r) => r.date === date);
  }, [records, date]);

  // Filter records for selected month
  const monthRecords = useMemo(() => {
    return records.filter((r) => r.date && r.date.startsWith(selectedMonth));
  }, [records, selectedMonth]);

  // Monthly summary calculations
  const monthSummary = useMemo(() => {
    const totalBottles = monthRecords.reduce((sum, r) => sum + (r.bottlesCount || r.numberOfBottles || 0), 0);
    const totalCost = monthRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    return { totalBottles, totalCost };
  }, [monthRecords]);

  // Total Cost for new add form
  const totalCost = (bottlesCount || 0) * (bottlePrice || 0);

  // Total Cost for edit form
  const editTotalCost = (editBottlesCount || 0) * (editBottlePrice || 0);

  // Open Edit Modal helper
  const handleOpenEdit = (record: WaterRecord) => {
    setEditingRecord(record);
    setEditDate(record.date);
    setEditBottlesCount(record.bottlesCount || record.numberOfBottles || 5);
    setEditBottlePrice(record.bottlePrice || record.pricePerBottle || 20);
    setEditSupplierName(record.supplierName || 'Bisleri Vendor');
    setEditReceiptUrl(record.receiptUrl || record.receiptPhotoUrl || '');
    setEditReason('');
  };

  // Submit New Water Record (with duplicate protection)
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;

    // Check if record already exists for this date
    if (existingWaterRecord) {
      showConfirm({
        title: 'Water record already exists for this date.',
        message: `A water record has already been added for ${formatDateFormatted(date)}.\n\nIf you want to increase or decrease the bottles or change the price, please edit the existing record for this date.`,
        confirmText: 'Edit Existing Record',
        cancelText: 'Cancel',
        onConfirm: () => handleOpenEdit(existingWaterRecord),
      });
      return;
    }

    setSubmitting(true);
    try {
      await createWaterRecord({
        date,
        bottlesCount,
        numberOfBottles: bottlesCount,
        bottlePrice,
        pricePerBottle: bottlePrice,
        totalCost,
        supplierName: supplierName.trim() || 'Bisleri Vendor',
        receiptUrl,
        loggedById: userDoc.uid,
        loggedByUserId: userDoc.uid,
        loggedByName: staffProfile?.fullName || userDoc.name || 'Staff',
        loggedByUserName: staffProfile?.fullName || userDoc.name || 'Staff',
        createdAt: new Date().toISOString(),
      });

      setBottlesCount(5);
      setReceiptUrl('');
      showToast('Water bottle delivery log saved successfully.', 'success');
    } catch (err: any) {
      console.error('Failed to log water record:', err);
      if (err?.isDuplicate || err?.message?.includes('already exists')) {
        const targetRecord = err.existingRecord || existingWaterRecord;
        showConfirm({
          title: 'Water record already exists for this date.',
          message: `A water record has already been added for ${formatDateFormatted(date)}.\n\nIf you want to increase or decrease the bottles or change the price, please edit the existing record for this date.`,
          confirmText: 'Edit Existing Record',
          cancelText: 'Cancel',
          onConfirm: () => {
            if (targetRecord) handleOpenEdit(targetRecord);
          },
        });
      } else {
        showToast(err?.message || 'Failed to log water record. Please try again.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Save Edit Handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !userDoc) return;

    if (!editReason.trim()) {
      showToast('A valid reason for modification is required before saving changes.', 'warning');
      return;
    }

    setUpdating(true);
    try {
      await updateWaterRecord(editingRecord.id, {
        date: editDate,
        bottlesCount: editBottlesCount,
        numberOfBottles: editBottlesCount,
        bottlePrice: editBottlePrice,
        pricePerBottle: editBottlePrice,
        totalCost: editTotalCost,
        supplierName: editSupplierName.trim() || 'Bisleri Vendor',
        receiptUrl: editReceiptUrl,
        updatedById: userDoc.uid,
        updatedByName: staffProfile?.fullName || userDoc.name || 'Staff',
        updateReason: editReason.trim(),
      });

      setEditingRecord(null);
      showToast('Water record updated successfully.', 'success');
    } catch (err: any) {
      console.error('Failed to update water record:', err);
      showToast(err?.message || 'Failed to update water record.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Delete Record Handler
  const handleDelete = async (record: WaterRecord) => {
    if (!userDoc) return;
    const isDirector = userDoc.role === 'director' || userDoc.email === 'devenjhaofficial@gmail.com';
    const isOwner = record.loggedById === userDoc.uid || record.loggedByUserId === userDoc.uid;

    if (!isDirector && !isOwner) {
      showToast('Permission Denied: Only the Director or entry creator can delete this record.', 'error');
      return;
    }

    showConfirm({
      title: 'Delete Water Record',
      message: `Are you sure you want to delete the water delivery record for ${record.date}?`,
      isDanger: true,
      confirmText: 'Delete Record',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteWaterRecord(record.id);
          showToast('Water record deleted successfully.', 'success');
        } catch (err: any) {
          console.error('Failed to delete water record:', err);
          if (err?.code === 'permission-denied') {
            showToast('Permission Denied: You do not have permission to delete this water record.', 'error');
          } else if (err?.code === 'not-found' || err?.message?.includes('not found')) {
            showToast('This water record has already been removed.', 'info');
          } else {
            showToast(err?.message || 'Failed to delete record. Please check connection and try again.', 'error');
          }
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER & MONTH SELECTOR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Droplet className="w-7 h-7 text-blue-600" />
            Drinking Water Delivery Log
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Track office mineral water bottle deliveries, bottle costs, vendor invoices, and monthly summaries.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm shrink-0">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-gray-700">Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-bold bg-transparent text-gray-900 focus:outline-none cursor-pointer pr-2"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MONTHLY SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/60 border-blue-200/80 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[11px] font-extrabold text-blue-800 uppercase tracking-wider">Total Bottles (This Month)</p>
            <p className="text-3xl font-black text-blue-950 font-mono mt-1">{monthSummary.totalBottles}</p>
            <p className="text-[10px] text-blue-700 font-medium">bottles delivered in {selectedMonth}</p>
          </div>
          <div className="p-3 bg-blue-600 text-white rounded-2xl">
            <Droplet className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-indigo-50 to-indigo-100/60 border-indigo-200/80 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[11px] font-extrabold text-indigo-800 uppercase tracking-wider">Total Water Expense (This Month)</p>
            <p className="text-3xl font-black text-indigo-950 font-mono mt-1">{formatINR(monthSummary.totalCost)}</p>
            <p className="text-[10px] text-indigo-700 font-medium">overall cost for {selectedMonth}</p>
          </div>
          <div className="p-3 bg-indigo-600 text-white rounded-2xl font-black text-xl">
            ₹
          </div>
        </Card>
      </div>

      {/* MAIN CONTENT GRID: ADD FORM + HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LOG DELIVERY FORM */}
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Log Water Delivery
          </h3>

          <form onSubmit={handleAdd} className="space-y-4">
            <Input
              label="Delivery Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            {/* DUPLICATE DATE WARNING BANNER */}
            {existingWaterRecord && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1.5 animate-fadeIn">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Water record already exists for this date.
                </p>
                <p className="text-[11px] text-amber-700">
                  Existing entry: <span className="font-bold">{existingWaterRecord.bottlesCount || existingWaterRecord.numberOfBottles} bottles</span> @ ₹{existingWaterRecord.bottlePrice || existingWaterRecord.pricePerBottle}/bottle ({formatINR(existingWaterRecord.totalCost || 0)}).
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-black border-amber-300 text-amber-900 hover:bg-amber-100"
                  icon={<Edit3 className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenEdit(existingWaterRecord)}
                >
                  Edit Existing Record
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Bottles Delivered"
                type="number"
                min={1}
                value={bottlesCount}
                onChange={(e) => setBottlesCount(parseInt(e.target.value, 10) || 0)}
                required
              />
              <Input
                label="Bottle Rate (₹)"
                type="number"
                min={0}
                value={bottlePrice}
                onChange={(e) => setBottlePrice(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
              <span className="text-xs text-blue-700 font-semibold block">Calculated Total Cost:</span>
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

            <Button type="submit" variant="primary" className="w-full bg-blue-600 hover:bg-blue-700" loading={submitting}>
              Save Water Record
            </Button>
          </form>
        </Card>

        {/* WATER DELIVERY HISTORY */}
        <Card className="p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-700" />
              Water Delivery Logs ({monthRecords.length})
            </h3>
            <span className="text-xs font-semibold text-gray-500">
              Showing records for {selectedMonth}
            </span>
          </div>

          {loading ? (
            <p className="text-xs text-gray-400 animate-pulse text-center py-8">Loading water records...</p>
          ) : monthRecords.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Droplet className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-xs font-semibold">No water delivery records logged for selected month.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {monthRecords.map((r) => {
                const bCount = r.bottlesCount || r.numberOfBottles || 0;
                const bPrice = r.bottlePrice || r.pricePerBottle || 0;
                const cost = r.totalCost !== undefined ? r.totalCost : bCount * bPrice;

                return (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-blue-100 text-blue-800 uppercase tracking-wider">
                          WATER
                        </span>
                        <span className="text-xs font-bold text-gray-900">{r.date}</span>
                        {r.updatedAt && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                            EDITED
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-extrabold text-gray-800">
                        {bCount} Bottles @ {formatINR(bPrice)}/bottle ({r.supplierName || 'Bisleri Vendor'})
                      </p>

                      <p className="text-[11px] text-gray-500">
                        Logged by <span className="font-semibold text-gray-700">{r.loggedByName || r.loggedByUserName || 'Staff'}</span>
                        {r.receiptUrl ? ' • Receipt Attached' : ''}
                      </p>

                      {r.updateReason && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200/60 mt-1 italic font-medium">
                          Reason for edit: "{r.updateReason}" (by {r.updatedByName || 'User'})
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <span className="text-base font-black text-blue-600 font-mono">
                        {formatINR(cost)}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit Record"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* EDIT WATER RECORD MODAL */}
      {editingRecord && (
        <Modal isOpen={!!editingRecord} onClose={() => setEditingRecord(null)} title="Edit Water Delivery Record">
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              label="Delivery Date"
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Bottles Delivered"
                type="number"
                min={1}
                value={editBottlesCount}
                onChange={(e) => setEditBottlesCount(parseInt(e.target.value, 10) || 0)}
                required
              />
              <Input
                label="Bottle Rate (₹)"
                type="number"
                min={0}
                value={editBottlePrice}
                onChange={(e) => setEditBottlePrice(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
              <span className="text-xs text-blue-700 font-semibold block">Updated Total Cost:</span>
              <span className="text-2xl font-black text-blue-900 font-mono">{formatINR(editTotalCost)}</span>
            </div>

            <Input
              label="Supplier / Vendor Name"
              value={editSupplierName}
              onChange={(e) => setEditSupplierName(e.target.value)}
              required
            />

            <FileUploader
              label="Attach Receipt / Voucher (Optional)"
              folder="janta-live-setu/water"
              currentUrl={editReceiptUrl}
              onFileUploaded={(url) => setEditReceiptUrl(url)}
            />

            <div className="space-y-1">
              <label className="text-xs font-bold text-red-600 block">
                Reason for Edit * (Mandatory Audit Trail)
              </label>
              <textarea
                rows={2}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="e.g. Corrected bottle count per vendor receipt"
                className="w-full text-xs p-3 rounded-xl border border-red-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingRecord(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-blue-600 hover:bg-blue-700" loading={updating} disabled={!editReason.trim()}>
                Save Water Record Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
