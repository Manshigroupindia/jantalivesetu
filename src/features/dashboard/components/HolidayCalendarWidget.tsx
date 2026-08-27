import React from 'react';
import { Card } from '../../../components/ui/Card';
import { CalendarDays } from 'lucide-react';
import { useRealtimeCollection } from '../../../hooks/useRealtime';
import { CompanyHoliday } from '../../../types';
import { orderBy, limit } from 'firebase/firestore';

export const HolidayCalendarWidget: React.FC = () => {
  const { data: holidays, loading } = useRealtimeCollection<CompanyHoliday>('holidays', [
    orderBy('date', 'asc'),
    limit(4),
  ]);

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between border-b pb-3 border-gray-100">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-brand-600" />
          <h3 className="text-base font-extrabold text-gray-900">Upcoming Holidays</h3>
        </div>
        <span className="text-xs text-gray-400 font-semibold">{holidays.length} Listed</span>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 animate-pulse py-4 text-center">Loading holidays...</p>
      ) : holidays.length === 0 ? (
        <p className="text-xs text-gray-400 py-6 text-center italic">No upcoming company holidays.</p>
      ) : (
        <div className="space-y-2">
          {holidays.map((h) => (
            <div key={h.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <div>
                <p className="text-xs font-bold text-gray-900">{h.holidayName}</p>
                <p className="text-[10px] text-gray-500">{h.description || 'Paid Company Holiday'}</p>
              </div>
              <span className="text-xs font-mono font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100">
                {h.date}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
