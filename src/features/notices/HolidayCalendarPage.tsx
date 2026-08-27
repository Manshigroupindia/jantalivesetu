import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { CompanyHoliday } from '../../types';
import { createCompanyHoliday, deleteCompanyHoliday } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useSecurity } from '../../contexts/SecurityContext';
import { orderBy } from 'firebase/firestore';

export const HolidayCalendarPage: React.FC = () => {
  const { userDoc } = useAuth();
  const { isDirector, can } = usePermissions();
  const { requireReauthVerification } = useSecurity();

  const [modalOpen, setModalOpen] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: holidays, loading } = useRealtimeCollection<CompanyHoliday>('holidays', [
    orderBy('date', 'asc'),
  ]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;

    setSubmitting(true);
    try {
      await createCompanyHoliday({
        holidayName,
        date,
        description,
        isPaid: true,
        createdAt: new Date().toISOString(),
      });

      setModalOpen(false);
      setHolidayName('');
      setDate('');
      setDescription('');
      alert('Company holiday added.');
    } catch (err) {
      alert('Failed to add holiday.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    requireReauthVerification('Delete Company Paid Holiday Record', async () => {
      try {
        await deleteCompanyHoliday(id);
        alert('Holiday deleted.');
      } catch (err) {
        alert('Failed to delete holiday.');
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
            Official list of paid company holidays included in salary calculations.
          </p>
        </div>

        {can('holidays.manage') && (
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setModalOpen(true)}
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
          {holidays.map((h) => (
            <Card key={h.id} className="p-5 space-y-2 flex justify-between items-start">
              <div>
                <span className="text-xs font-mono font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100 block w-fit mb-2">
                  {h.date}
                </span>
                <h3 className="text-base font-extrabold text-gray-900">{h.holidayName}</h3>
                <p className="text-xs text-gray-500">{h.description || 'Paid Company Holiday'}</p>
              </div>

              {isDirector && (
                <button
                  onClick={() => handleDelete(h.id)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="Delete Holiday"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Paid Company Holiday">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Holiday Festival / Event Name"
            value={holidayName}
            onChange={(e) => setHolidayName(e.target.value)}
            required
          />

          <Input
            label="Holiday Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <Input
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="w-full" loading={submitting}>
              Save Holiday
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
