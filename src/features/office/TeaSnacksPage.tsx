import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  Coffee,
  Calendar,
  Edit3,
  Trash2,
  AlertCircle,
  X,
  Plus,
  History
} from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { TeaSnackLog } from '../../types';
import {
  createTeaSnackLog,
  updateTeaSnackLog,
  deleteTeaSnackLog
} from '../../services/firestoreService';
import { getCurrentDateISO, getCurrentMonthISO } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { formatINR } from '../../utils/formatters';
import { orderBy } from 'firebase/firestore';

export const TeaSnacksPage: React.FC = () => {
  const { userDoc, staffProfile } = useAuth();
  const { companySettings } = useCompany();
  const { data: logs, loading, error } = useRealtimeCollection<TeaSnackLog>('teaSnackLogs', [
    orderBy('createdAt', 'desc'),
  ]);

  // Selected Month Filter
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthISO()); // e.g. "2026-08"

  // Form state
  const [itemType, setItemType] = useState('tea');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number>(companySettings?.teaUnitPrice || 10);
  const [date, setDate] = useState(getCurrentDateISO());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [editingLog, setEditingLog] = useState<TeaSnackLog | null>(null);
  const [editItemType, setEditItemType] = useState('tea');
  const [editQuantity, setEditQuantity] = useState(1);
  const [editUnitPrice, setEditUnitPrice] = useState(10);
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [updating, setUpdating] = useState(false);

  // Sync unit price with companySettings on itemType change
  useEffect(() => {
    if (companySettings?.teaUnitPrice && itemType === 'tea') {
      setUnitPrice(companySettings.teaUnitPrice);
    }
  }, [companySettings?.teaUnitPrice, itemType]);

  // Derived Month Options (Last 12 months + current month)
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

  // Filter logs for selected month
  const monthLogs = useMemo(() => {
    return logs.filter((log) => log.date && log.date.startsWith(selectedMonth));
  }, [logs, selectedMonth]);

  // Derived Summary Calculations for Selected Month
  const summary = useMemo(() => {
    let teaCups = 0;
    let teaAmount = 0;
    let coffeeCups = 0;
    let coffeeAmount = 0;
    let snacksAmount = 0;

    monthLogs.forEach((l) => {
      const type = (l.itemType || l.type || 'tea').toLowerCase();
      const qty = l.quantity || l.count || 1;
      const total = l.totalPrice !== undefined ? l.totalPrice : (l.amount !== undefined ? l.amount : 0);

      if (type === 'tea') {
        teaCups += qty;
        teaAmount += total;
      } else if (type === 'coffee') {
        coffeeCups += qty;
        coffeeAmount += total;
      } else {
        snacksAmount += total;
      }
    });

    const grandTotal = teaAmount + coffeeAmount + snacksAmount;
    return {
      teaCups,
      teaAmount,
      coffeeCups,
      coffeeAmount,
      snacksAmount,
      grandTotal,
    };
  }, [monthLogs]);

  // Safe Add Calculations
  const safeQuantity = isNaN(quantity) || quantity < 1 ? 1 : quantity;
  const safeUnitPrice = isNaN(unitPrice) || unitPrice < 0 ? 0 : unitPrice;
  const totalPrice = safeQuantity * safeUnitPrice;

  // Safe Edit Calculations
  const safeEditQuantity = isNaN(editQuantity) || editQuantity < 1 ? 1 : editQuantity;
  const safeEditUnitPrice = isNaN(editUnitPrice) || editUnitPrice < 0 ? 0 : editUnitPrice;
  const editTotalPrice = safeEditQuantity * safeEditUnitPrice;

  // Add Log Handler
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) {
      alert('Your session has expired. Please login again.');
      return;
    }

    if (safeQuantity <= 0) {
      alert('Please enter a valid quantity of 1 or more.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Omit<TeaSnackLog, 'id'> = {
        date,
        itemType,
        type: itemType === 'tea' ? 'tea' : 'snack',
        quantity: safeQuantity,
        count: safeQuantity,
        unitPrice: safeUnitPrice,
        amount: safeUnitPrice,
        totalPrice,
        loggedById: userDoc.uid,
        loggedByUserId: userDoc.uid,
        loggedByName: staffProfile?.fullName || userDoc.name || 'Staff',
        loggedByUserName: staffProfile?.fullName || userDoc.name || 'Staff',
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      await createTeaSnackLog(payload);

      setQuantity(1);
      setNotes('');
      alert('Tea / Snacks log saved successfully.');
    } catch (err: any) {
      console.error('Failed to log tea/snacks entry:', err);
      if (err?.code === 'permission-denied') {
        alert('Permission Denied: You do not have permission to write to Tea & Snacks logs.');
      } else {
        alert(err?.message || 'Failed to save tea/snacks entry. Please check connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (log: TeaSnackLog) => {
    setEditingLog(log);
    setEditItemType(log.itemType || log.type || 'tea');
    setEditQuantity(log.quantity || log.count || 1);
    setEditUnitPrice(log.unitPrice || log.amount || 10);
    setEditDate(log.date || getCurrentDateISO());
    setEditNotes(log.notes || '');
    setEditReason('');
  };

  // Submit Edit Handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog || !userDoc) return;

    if (!editReason.trim()) {
      alert('A valid reason for modification is MANDATORY before saving changes.');
      return;
    }

    setUpdating(true);
    try {
      const updates: Partial<TeaSnackLog> = {
        date: editDate,
        itemType: editItemType,
        type: editItemType === 'tea' ? 'tea' : 'snack',
        quantity: safeEditQuantity,
        count: safeEditQuantity,
        unitPrice: safeEditUnitPrice,
        amount: safeEditUnitPrice,
        totalPrice: editTotalPrice,
        notes: editNotes.trim() || undefined,
        updatedById: userDoc.uid,
        updatedByName: staffProfile?.fullName || userDoc.name || 'Staff',
        updateReason: editReason.trim(),
        previousValues: {
          itemType: editingLog.itemType || editingLog.type,
          quantity: editingLog.quantity || editingLog.count,
          unitPrice: editingLog.unitPrice || editingLog.amount,
          totalPrice: editingLog.totalPrice || editingLog.amount,
          notes: editingLog.notes,
        },
      };

      await updateTeaSnackLog(editingLog.id, updates);
      setEditingLog(null);
      alert('Tea / Snacks log updated successfully.');
    } catch (err: any) {
      console.error('Failed to update log:', err);
      alert(err?.message || 'Failed to update record.');
    } finally {
      setUpdating(false);
    }
  };

  // Delete Log Handler
  const handleDeleteLog = async (log: TeaSnackLog) => {
    if (!userDoc) return;
    const isDirector = userDoc.role === 'director' || userDoc.email === 'devenjhaofficial@gmail.com';
    const isOwner = log.loggedById === userDoc.uid || log.loggedByUserId === userDoc.uid;

    if (!isDirector && !isOwner) {
      alert('Permission Denied: Only the Director or creator can delete this record.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this Tea/Snacks entry permanently?')) {
      return;
    }

    try {
      await deleteTeaSnackLog(log.id);
      alert('Record deleted successfully.');
    } catch (err: any) {
      console.error('Failed to delete log:', err);
      alert('Failed to delete record.');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER & MONTH SELECTOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Coffee className="w-7 h-7 text-brand-600" />
            Tea, Coffee & Snacks Daily Log
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Daily office refreshment expense tracking with automatic monthly calculations and audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm shrink-0">
          <Calendar className="w-4 h-4 text-brand-600" />
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

      {/* TOP MONTHLY SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Tea Cups */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5 text-amber-600" /> Tea Cups
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-950 font-mono">{summary.teaCups}</span>
            <span className="text-[10px] text-amber-700 font-bold block mt-0.5">cups this month</span>
          </div>
        </div>

        {/* Tea Bill */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
            ₹ Tea Bill
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-950 font-mono">{formatINR(summary.teaAmount)}</span>
            <span className="text-[10px] text-amber-700 font-bold block mt-0.5">tea total</span>
          </div>
        </div>

        {/* Coffee Cups */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-4 rounded-2xl border border-orange-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-extrabold text-orange-800 uppercase tracking-wider flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5 text-orange-600" /> Coffee Cups
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-orange-950 font-mono">{summary.coffeeCups}</span>
            <span className="text-[10px] text-orange-700 font-bold block mt-0.5">cups this month</span>
          </div>
        </div>

        {/* Coffee Bill */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-4 rounded-2xl border border-orange-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-extrabold text-orange-800 uppercase tracking-wider flex items-center gap-1.5">
            ₹ Coffee Bill
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-orange-950 font-mono">{formatINR(summary.coffeeAmount)}</span>
            <span className="text-[10px] text-orange-700 font-bold block mt-0.5">coffee total</span>
          </div>
        </div>

        {/* Snacks Bill */}
        <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 p-4 rounded-2xl border border-rose-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
            🍪 Snacks Bill
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-rose-950 font-mono">{formatINR(summary.snacksAmount)}</span>
            <span className="text-[10px] text-rose-700 font-bold block mt-0.5">snacks total</span>
          </div>
        </div>

        {/* Grand Total */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 text-white p-4 rounded-2xl border border-brand-500 shadow-md flex flex-col justify-between col-span-2 md:col-span-1 xl:col-span-1">
          <span className="text-[11px] font-extrabold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
            💰 Grand Total
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-white">{formatINR(summary.grandTotal)}</span>
            <span className="text-[10px] text-brand-100 font-bold block mt-0.5">combined total</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID: FORM + DAILY RECORDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LOG FORM */}
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2 flex items-center gap-2">
            <Plus className="w-5 h-5 text-brand-600" />
            Log New Entry
          </h3>

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
                min={0}
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
              placeholder="e.g. Snacks for client meeting"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Button type="submit" variant="primary" className="w-full" loading={submitting}>
              Add Refreshment Entry
            </Button>
          </form>
        </Card>

        {/* DAILY REFRESHMENT RECORDS TABLE */}
        <Card className="p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-700" />
              Daily Refreshment Logs ({monthLogs.length})
            </h3>
            <span className="text-xs font-semibold text-gray-500">
              Showing records for {selectedMonth}
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Error loading records: {error.message}
            </div>
          )}

          {loading ? (
            <p className="text-xs text-gray-400 animate-pulse text-center py-8">Loading refreshment entries...</p>
          ) : monthLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Coffee className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-xs font-semibold">No refreshment logs recorded for selected month.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {monthLogs.map((log) => {
                const itemLabel = (log.itemType || log.type || 'tea').toUpperCase();
                const qty = log.quantity || log.count || 1;
                const unit = log.unitPrice || log.amount || 0;
                const total = log.totalPrice !== undefined ? log.totalPrice : (log.amount !== undefined ? log.amount : 0);

                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-brand-100 text-brand-800 uppercase tracking-wider">
                          {itemLabel}
                        </span>
                        <span className="text-xs font-bold text-gray-900">{log.date}</span>
                        {log.updatedAt && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                            EDITED
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-extrabold text-gray-800">
                        {qty}x {itemLabel} @ {formatINR(unit)}/unit
                      </p>

                      <p className="text-[11px] text-gray-500">
                        Logged by <span className="font-semibold text-gray-700">{log.loggedByName || log.loggedByUserName || 'Staff'}</span>
                        {log.notes ? ` • Note: ${log.notes}` : ''}
                      </p>

                      {log.updateReason && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200/60 mt-1 italic font-medium">
                          Reason for edit: "{log.updateReason}" (by {log.updatedByName || 'User'})
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <span className="text-base font-black text-brand-600 font-mono">
                        {formatINR(total)}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(log)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Edit Entry"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLog(log)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Entry"
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

      {/* EDIT LOG MODAL */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-brand-600" />
                Edit Refreshment Log
              </h3>
              <button
                onClick={() => setEditingLog(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <Input
                label="Date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                required
              />

              <Select
                label="Item Type"
                value={editItemType}
                onChange={(e) => setEditItemType(e.target.value)}
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
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(parseInt(e.target.value, 10))}
                  required
                />
                <Input
                  label="Unit Price (₹)"
                  type="number"
                  min={0}
                  value={editUnitPrice}
                  onChange={(e) => setEditUnitPrice(parseFloat(e.target.value))}
                  required
                />
              </div>

              <div className="bg-brand-50 p-3 rounded-xl border border-brand-200 text-center">
                <span className="text-xs text-brand-700 font-semibold block">Calculated Total:</span>
                <span className="text-2xl font-black text-brand-900 font-mono">{formatINR(editTotalPrice)}</span>
              </div>

              <Input
                label="Notes (Optional)"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />

              <div className="space-y-1">
                <label className="text-xs font-bold text-red-600 block">
                  Reason for Edit * (Mandatory Audit Trail)
                </label>
                <textarea
                  rows={2}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Corrected tea cup count for morning meeting"
                  className="w-full text-xs p-3 rounded-xl border border-red-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingLog(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={updating}
                  disabled={!editReason.trim()}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
