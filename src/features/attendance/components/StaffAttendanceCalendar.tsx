import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { GoogleMapsButton } from '../../../components/common/GoogleMapsButton';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, AlertCircle, Sparkles, User } from 'lucide-react';
import { useRealtimeCollection } from '../../../hooks/useRealtime';
import { AttendanceRecord, CompanyHoliday, StaffProfile } from '../../../types';
import { getCurrentDateISO, formatMonthYear } from '../../../utils/dateUtils';
import { calculateSalaryBreakdown } from '../../../services/salaryCalculator';
import { where } from 'firebase/firestore';

interface StaffAttendanceCalendarProps {
  targetUserId: string;
  targetUserName?: string;
  canSelectStaff?: boolean;
  staffList?: StaffProfile[];
  onSelectStaffId?: (id: string) => void;
}

export const StaffAttendanceCalendar: React.FC<StaffAttendanceCalendarProps> = ({
  targetUserId,
  targetUserName,
  canSelectStaff = false,
  staffList = [],
  onSelectStaffId,
}) => {
  const todayISO = getCurrentDateISO();
  const [selectedMonth, setSelectedMonth] = useState<string>(todayISO.substring(0, 7)); // YYYY-MM
  const [selectedDayDetail, setSelectedDayDetail] = useState<{
    dateStr: string;
    dayNum: number;
    dayName: string;
    status: 'present' | 'absent' | 'sunday' | 'holiday' | 'manual' | 'future';
    attendance?: AttendanceRecord;
    isSunday: boolean;
    isHoliday: boolean;
    holidayTitle?: string;
    isFuture: boolean;
  } | null>(null);

  // Fetch Attendance logs for target user
  const attendanceConstraints = targetUserId ? [where('userId', '==', targetUserId)] : [];
  const { data: attendanceLogs = [], loading: logsLoading } = useRealtimeCollection<AttendanceRecord>(
    'attendance',
    attendanceConstraints
  );

  // Fetch Holidays
  const { data: holidays = [] } = useRealtimeCollection<CompanyHoliday>('holidays');

  // Month navigation
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m - 2, 1);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m, 1);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  // Salary Engine Breakdown for exact summary metrics
  const holidayDates = (holidays || []).map((h) => h.date);
  const salaryResult = calculateSalaryBreakdown(
    12000, // Nominal salary for breakdown calculations
    selectedMonth,
    attendanceLogs,
    holidayDates,
    1, // 1 emergency leave allowed
    0
  );

  // Calendar calculations
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10) || 2026;
  const monthIdx = (parseInt(monthStr, 10) || 8) - 1;

  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, monthIdx, 1).getDay(); // 0 = Sun, 1 = Mon ...
  // Convert Sunday (0) to 6 for Mon-Sun grid (Mon=0, Tue=1 ... Sun=6)
  const startingPadding = (firstDayOfWeek + 6) % 7;

  // Lookup maps
  const attendanceMap = new Map<string, AttendanceRecord>();
  attendanceLogs.forEach((a) => {
    if (a.date && a.date.startsWith(selectedMonth)) {
      attendanceMap.set(a.date, a);
    }
  });

  const holidayMap = new Map<string, string>();
  holidays.forEach((h) => {
    if (h.date && h.date.startsWith(selectedMonth)) {
      holidayMap.set(h.date, h.holidayName || (h as any).title || 'Company Holiday');
    }
  });

  // Days array
  const dayCells = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(year, monthIdx, day);
    const isSunday = dateObj.getDay() === 0;
    const isHoliday = holidayMap.has(dateStr);
    const holidayTitle = holidayMap.get(dateStr);
    const attendance = attendanceMap.get(dateStr);
    const isFuture = dateStr > todayISO;

    const isWorked = attendance && (
      attendance.status === 'present' ||
      attendance.status === 'on_duty' ||
      attendance.status === 'completed' ||
      attendance.status === 'auto_closed' ||
      attendance.isAutoClosed === true ||
      attendance.attendanceType === 'MANUAL' ||
      Boolean(attendance.checkIn)
    );

    let status: 'present' | 'absent' | 'sunday' | 'holiday' | 'manual' | 'future' = 'absent';

    if (isFuture) {
      status = 'future';
    } else if (isWorked) {
      status = attendance.attendanceType === 'MANUAL' ? 'manual' : 'present';
    } else if (isSunday) {
      status = 'sunday';
    } else if (isHoliday) {
      status = 'holiday';
    } else {
      status = 'absent';
    }

    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    dayCells.push({
      dayNum: day,
      dateStr,
      status,
      attendance,
      isSunday,
      isHoliday,
      holidayTitle,
      dayName,
      isFuture,
    });
  }

  return (
    <div className="space-y-6">
      {/* CONTROLS HEADER */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* MONTH SELECTOR & STAFF NAME */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth} icon={<ChevronLeft className="w-4 h-4" />}>
              Prev
            </Button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl">
              <CalendarIcon className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-extrabold text-gray-900 font-mono">
                {formatMonthYear(selectedMonth)}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleNextMonth} icon={<ChevronRight className="w-4 h-4" />}>
              Next
            </Button>
          </div>

          {targetUserName && (
            <span className="text-xs font-bold text-gray-700 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-600" />
              {targetUserName}
            </span>
          )}
        </div>

        {/* STAFF SELECTOR FOR DIRECTOR */}
        {canSelectStaff && staffList.length > 0 && onSelectStaffId && (
          <div className="w-full sm:w-72">
            <Select
              value={targetUserId}
              onChange={(e) => onSelectStaffId(e.target.value)}
              options={staffList.map((s) => ({
                value: s.userId,
                label: `${s.fullName} (${s.designation})`,
              }))}
            />
          </div>
        )}
      </Card>

      {/* MONTHLY SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-center">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Present</span>
          <span className="text-2xl font-black text-emerald-900">{salaryResult.presentDays}</span>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 text-center">
          <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider block">Absent</span>
          <span className="text-2xl font-black text-red-900">{salaryResult.absentDays}</span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-center">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Sundays</span>
          <span className="text-2xl font-black text-amber-900">{salaryResult.sundaysCount}</span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-center">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Holidays</span>
          <span className="text-2xl font-black text-amber-900">{salaryResult.paidHolidaysCount}</span>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 text-center">
          <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">Emergency</span>
          <span className="text-2xl font-black text-purple-900">{salaryResult.emergencyLeaveCount}</span>
        </div>

        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-3.5 text-center col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-brand-800 uppercase tracking-wider block">Payable Days</span>
          <span className="text-2xl font-black text-brand-900">{salaryResult.totalPayableDays} / 30</span>
        </div>
      </div>

      {/* CALENDAR GRID CARD */}
      <Card className="p-4 sm:p-6 overflow-hidden">
        {/* WEEKDAY HEADERS */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-black text-gray-500 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
          <div className="text-amber-600">Sun</div>
        </div>

        {/* CALENDAR DAYS GRID */}
        {logsLoading ? (
          <p className="text-xs text-gray-400 animate-pulse text-center py-12">Loading monthly attendance...</p>
        ) : (
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {/* PADDING CELLS */}
            {Array.from({ length: startingPadding }).map((_, i) => (
              <div key={`pad-${i}`} className="h-16 sm:h-20 rounded-xl bg-gray-50/40 border border-transparent opacity-30" />
            ))}

            {/* DAY CELLS */}
            {dayCells.map((cell) => {
              const { dayNum, status, attendance, isSunday, isHoliday, isFuture } = cell;

              let bgClasses = 'bg-gray-50 border-gray-200 text-gray-600';
              let badgeColor = 'bg-gray-200 text-gray-700';
              let statusLabel = 'Future';

              if (status === 'present') {
                bgClasses = 'bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-300 text-emerald-950';
                badgeColor = 'bg-emerald-600 text-white';
                statusLabel = 'Present';
              } else if (status === 'manual') {
                bgClasses = 'bg-purple-50/80 hover:bg-purple-100/80 border-purple-300 text-purple-950';
                badgeColor = 'bg-purple-600 text-white';
                statusLabel = 'Manual';
              } else if (status === 'sunday' || status === 'holiday') {
                bgClasses = 'bg-amber-50/80 hover:bg-amber-100/80 border-amber-300 text-amber-950';
                badgeColor = 'bg-amber-500 text-white';
                statusLabel = isHoliday ? 'Holiday' : 'Sunday';
              } else if (status === 'absent') {
                bgClasses = 'bg-red-50/80 hover:bg-red-100/80 border-red-300 text-red-950';
                badgeColor = 'bg-red-600 text-white';
                statusLabel = 'Absent';
              } else if (isFuture) {
                bgClasses = 'bg-gray-50/60 border-gray-100 text-gray-400 cursor-default';
                badgeColor = 'bg-gray-200 text-gray-500';
                statusLabel = '—';
              }

              return (
                <button
                  key={cell.dateStr}
                  onClick={() => setSelectedDayDetail(cell)}
                  className={`h-16 sm:h-20 p-1.5 sm:p-2 rounded-xl border text-left flex flex-col justify-between transition-all hover:shadow-md active:scale-95 relative overflow-hidden ${bgClasses}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs sm:text-sm font-black font-mono">{dayNum}</span>
                    <span className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-tight ${badgeColor}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="truncate text-[10px] font-semibold">
                    {attendance ? (
                      <span className="font-mono text-emerald-800 block truncate font-bold">
                        {attendance.checkIn}
                      </span>
                    ) : isHoliday ? (
                      <span className="text-amber-800 block truncate">{cell.holidayTitle}</span>
                    ) : isSunday ? (
                      <span className="text-amber-700 block">Sunday</span>
                    ) : isFuture ? (
                      <span className="text-gray-300 block">Future</span>
                    ) : (
                      <span className="text-red-700 block">No Duty</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* CALENDAR LEGEND */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-gray-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
            <span>🟢 Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
            <span>🔴 Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" />
            <span>🟡 Sunday / Company Holiday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-600 shadow-sm" />
            <span>🔵 Manual Attendance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-300 shadow-sm" />
            <span>⚪ Future Date</span>
          </div>
        </div>
      </Card>

      {/* DAY DETAIL MODAL */}
      {selectedDayDetail && (
        <Modal
          isOpen={Boolean(selectedDayDetail)}
          onClose={() => setSelectedDayDetail(null)}
          title={`Attendance Detail — ${selectedDayDetail.dateStr}`}
        >
          <div className="space-y-4 py-1">
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">{selectedDayDetail.dayName}</p>
                <h4 className="text-base font-black text-gray-900">{selectedDayDetail.dateStr}</h4>
              </div>

              {selectedDayDetail.status === 'present' && <Badge variant="success" size="md">Present</Badge>}
              {selectedDayDetail.status === 'manual' && <Badge variant="brand" size="md" className="bg-purple-100 text-purple-800">Manually Added</Badge>}
              {selectedDayDetail.status === 'sunday' && <Badge variant="warning" size="md">Sunday</Badge>}
              {selectedDayDetail.status === 'holiday' && <Badge variant="warning" size="md">Company Holiday</Badge>}
              {selectedDayDetail.status === 'absent' && <Badge variant="danger" size="md">Absent</Badge>}
              {selectedDayDetail.status === 'future' && <Badge variant="neutral" size="md">Future Date</Badge>}
            </div>

            {selectedDayDetail.attendance ? (
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="grid grid-cols-2 gap-3 text-center border-b border-gray-100 pb-3">
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[11px] font-bold text-emerald-700 block">Duty On</span>
                    <span className="text-sm font-black font-mono text-emerald-950">{selectedDayDetail.attendance.checkIn}</span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                    <span className="text-[11px] font-bold text-gray-600 block">Duty Off</span>
                    <span className="text-sm font-black font-mono text-gray-900">
                      {selectedDayDetail.attendance.checkOut || 'Active Shift'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-700">
                  {selectedDayDetail.attendance.totalMinutes > 0 && (
                    <div className="flex justify-between items-center py-1 border-b border-gray-100">
                      <span className="font-semibold text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-brand-600" /> Total Duration:
                      </span>
                      <span className="font-extrabold text-gray-900">
                        {Math.floor(selectedDayDetail.attendance.totalMinutes / 60)}h {selectedDayDetail.attendance.totalMinutes % 60}m
                      </span>
                    </div>
                  )}

                  {selectedDayDetail.attendance.attendanceType === 'MANUAL' && (
                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 space-y-1">
                      <p className="text-xs font-bold text-purple-900 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Manually Added Record
                      </p>
                      {selectedDayDetail.attendance.manualReason && (
                        <p className="text-xs text-purple-800">
                          <strong>Reason:</strong> {selectedDayDetail.attendance.manualReason}
                        </p>
                      )}
                      {selectedDayDetail.attendance.createdByName && (
                        <p className="text-[11px] text-purple-700">
                          <strong>Added by:</strong> {selectedDayDetail.attendance.createdByName}
                        </p>
                      )}
                    </div>
                  )}

                  {(selectedDayDetail.attendance.status === 'auto_closed' || selectedDayDetail.attendance.isAutoClosed) && (
                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Automatically Closed at 9:00 PM shift end</span>
                    </div>
                  )}

                  {/* LOCATIONS */}
                  <div className="pt-2">
                    <p className="text-[11px] font-extrabold uppercase text-gray-400 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-brand-600" /> GPS Locations:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedDayDetail.attendance.checkInLocation && (selectedDayDetail.attendance.checkInLocation.latitude !== 0 || selectedDayDetail.attendance.checkInLocation.longitude !== 0) ? (
                        <GoogleMapsButton
                          latitude={selectedDayDetail.attendance.checkInLocation.latitude}
                          longitude={selectedDayDetail.attendance.checkInLocation.longitude}
                          label="Check-In Location"
                        />
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">Manual Location</span>
                      )}

                      {selectedDayDetail.attendance.checkOutLocation && (selectedDayDetail.attendance.checkOutLocation.latitude !== 0 || selectedDayDetail.attendance.checkOutLocation.longitude !== 0) && (
                        <GoogleMapsButton
                          latitude={selectedDayDetail.attendance.checkOutLocation.latitude}
                          longitude={selectedDayDetail.attendance.checkOutLocation.longitude}
                          label="Check-Out Location"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded-2xl border text-center space-y-2">
                <p className="text-xs font-bold text-gray-600">
                  {selectedDayDetail.isHoliday
                    ? `Company Holiday: ${selectedDayDetail.holidayTitle}`
                    : selectedDayDetail.isSunday
                    ? 'Weekly Off (Sunday)'
                    : selectedDayDetail.isFuture
                    ? 'Future Date'
                    : 'No duty check-in recorded for this day.'}
                </p>
                {selectedDayDetail.status === 'absent' && (
                  <p className="text-[11px] text-red-600 font-semibold">
                    Marked as absent for normal working day.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedDayDetail(null)} className="w-full justify-center">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
