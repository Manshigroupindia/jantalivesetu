import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { DutyCard } from '../dashboard/components/DutyCard';
import { GoogleMapsButton } from '../../components/common/GoogleMapsButton';
import { Clock, Calendar, Search } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { AttendanceRecord } from '../../types';
import { getCurrentDateISO } from '../../utils/dateUtils';
import { usePermissions } from '../../hooks/usePermissions';
import { where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

export const AttendancePage: React.FC = () => {
  const { userDoc } = useAuth();
  const { isDirector } = usePermissions();
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDateISO());
  const [searchTerm, setSearchTerm] = useState<string>('');

  const constraints = isDirector
    ? []
    : [where('userId', '==', userDoc?.uid || 'none')];

  const { data: rawAttendanceList, loading } = useRealtimeCollection<AttendanceRecord>('attendance', constraints);

  // In-memory sort to avoid requiring composite indexes in Firestore
  const attendanceList = [...rawAttendanceList].sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );

  const filteredLogs = attendanceList.filter((a) => {
    const matchesDate = !selectedDate || a.date === selectedDate;
    const matchesSearch =
      a.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.userDesignation.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Clock className="w-7 h-7 text-brand-600" />
            Attendance & Duty Logs
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Realtime duty check-ins, check-outs, GPS location tracking, and working hours calculation.
          </p>
        </div>
      </div>

      {/* DUTY ON / OFF CARD */}
      <DutyCard />

      {/* FILTERS */}
      <Card className="p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by staff name or designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-full sm:w-48">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            icon={<Calendar className="w-4 h-4 text-brand-600" />}
          />
        </div>
      </Card>

      {/* LOGS TABLE */}
      {loading ? (
        <p className="text-xs text-gray-400 animate-pulse text-center py-8">Loading attendance logs...</p>
      ) : filteredLogs.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 text-xs italic">
          No attendance logs recorded for selected date.
        </Card>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Check-In</th>
                  <th className="py-3.5 px-4">Check-Out</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4 text-center">GPS Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-extrabold text-gray-900">{log.userName}</p>
                      <p className="text-[10px] text-brand-600 font-bold uppercase">{log.userDesignation}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-gray-700">{log.date}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">{log.checkIn}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-700">
                      {log.checkOut || <span className="text-amber-600 text-[11px]">Active Shift</span>}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-800">
                      {log.totalMinutes > 0
                        ? `${Math.floor(log.totalMinutes / 60)}h ${log.totalMinutes % 60}m`
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {log.checkInLocation && (
                        <GoogleMapsButton
                          latitude={log.checkInLocation.latitude}
                          longitude={log.checkInLocation.longitude}
                          label="GPS Map"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
