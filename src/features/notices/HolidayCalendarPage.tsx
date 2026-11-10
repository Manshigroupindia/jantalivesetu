import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { CalendarDays, Plus, Trash2, Edit3, CheckCircle2, XCircle } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { CompanyHoliday } from '../../types';
import { createCompanyHoliday, updateCompanyHoliday, deleteCompanyHoliday } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useSecurity } from '../../contexts/SecurityContext';
import { useNotification } from '../../contexts/NotificationContext';
import { orderBy } from 'firebase/firestore';

export const HolidayCalendarPage: React.FC = () => {
  const { userDoc } = useAuth();
  const { isDirector, isAdmin, can } = usePermissions();
  const canManage = isDirector || isAdmin || can('holidays.manage');
  const { requireReauthVerification } = useSecurity();
  const { showToast } = useNotification();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<CompanyHoliday | null>(null);

  const [holidayName, setHolidayName] = useState('');
  const [date, setDate] = useState('');
  const [holidayType, setHolidayType] = useState<'company' | 'festival' | 'national'>('company');
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: holidays, loading } = useRealtimeCollection<CompanyHoliday>('holidays', [
    orderBy('date', 'asc'),
  ]);

  const resetForm = () => {
    setEditingHoliday(null);
    setHolidayName('');
    setDate('');
    setHolidayType('company');
    setIsPaid(true);
    setDescription('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (h: CompanyHoliday) => {
    setEditingHoliday(h);
    setHolidayName(h.holidayName || '');
    setDate(h.date || '');
    setHolidayType(h.type || 'company');
    setIsPaid(h.isPaid !== false);
    setDescription(h.description || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;

    if (!holidayName.trim()) {
      showToast('Please enter holiday festival / event name.', 'warning');
      return;
    }
    if (!date) {
      showToast('Please select holiday date.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      if (editingHoliday) {
        await updateCompanyHoliday(editingHoliday.id, {
          holidayName: holidayName.trim(),
          date,
          type: holidayType,
          isPaid,
          description: description.trim(),
          updatedAt: now,
        });
        showToast('Company holiday updated.', 'success');
      } else {
        await createCompanyHoliday({
          holidayName: holidayName.trim(),
          date,
          type: holidayType,
          isPaid,
          description: description.trim(),
          createdBy: userDoc.uid,
          createdByName: userDoc.name || 'Admin',
          createdAt: now,
          updatedAt: now,
        });
        showToast('Company holiday added.', 'success');
      }

      setModalOpen(false);
      resetForm();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save holiday.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (h: CompanyHoliday) => {
    requireReauthVerification(`Delete Company Holiday Record "${h.holidayName}"`, async () => {
      try {
        await deleteCompanyHoliday(h.id);
        showToast('Holiday deleted.', 'success');
      } catch (err: any) {
        showToast(err?.message || 'Failed to delete holiday.', 'error');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-brand-600" />
            Company Holiday Calendar
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Official list of company holidays included in payroll and salary calculations.
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenAdd}
          >
            Add Holiday Record
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 animate-pulse text-center py-8">Loading holiday calendar...</p>
      ) : holidays.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 text-xs italic">
          No company holidays scheduled.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {holidays.map((h) => {
            const isPaidHoliday = h.isPaid !== false;
            return (
              <Card key={h.id} className="p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100 block w-fit">
                      {h.date}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isPaidHoliday ? (
                        <Badge variant="success" size="sm">
                          Paid Holiday
                        </Badge>
                      ) : (
                        <Badge variant="danger" size="sm">
                          Unpaid Holiday
                        </Badge>
                      )}
                      {h.type && (
                        <Badge variant="neutral" size="sm" className="capitalize">
                          {h.type}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-gray-900 leading-snug">{h.holidayName}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {h.description || (isPaidHoliday ? 'Paid Company Holiday' : 'Unpaid Holiday')}
                  </p>
                </div>

                {canManage && (
                  <div className="flex items-center justify-end gap-1 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleOpenEdit(h)}
                      className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Edit Holiday"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(h)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete Holiday"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editingHoliday ? 'Edit Company Holiday' : 'Add Company Holiday'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Holiday Festival / Event Name"
            value={holidayName}
            onChange={(e) => setHolidayName(e.target.value)}
            placeholder="e.g. Independence Day, Diwali, Republic Day"
            required
          />

          <Input
            label="Holiday Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Holiday Category"
              value={holidayType}
              onChange={(e) => setHolidayType(e.target.value as any)}
              options={[
                { value: 'company', label: 'Company Holiday' },
                { value: 'festival', label: 'Festival Holiday' },
                { value: 'national', label: 'National Holiday' },
              ]}
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Salary Payment Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaid(true)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                    isPaid
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Paid
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaid(false)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                    !isPaid
                      ? 'bg-red-50 text-red-800 border-red-300 ring-1 ring-red-400'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Unpaid
                </button>
              </div>
            </div>
          </div>

          <Input
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Official office closure for festive celebration"
          />

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="w-full" loading={submitting}>
              {editingHoliday ? 'Update Holiday' : 'Save Holiday'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
