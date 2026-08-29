import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { DutyCard } from '../dashboard/components/DutyCard';
import { GoogleMapsButton } from '../../components/common/GoogleMapsButton';
import { StaffAttendanceCalendar } from './components/StaffAttendanceCalendar';
import { Clock, Calendar as CalendarIcon, Search, PlusCircle, ListFilter, CalendarDays, Edit3, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { AttendanceRecord } from '../../types';
import { getCurrentDateISO, isHalfDayCheckIn } from '../../utils/dateUtils';
import { usePermissions } from '../../hooks/usePermissions';
import { useSecurity } from '../../contexts/SecurityContext';
import { useNotification } from '../../contexts/NotificationContext';
import { createManualAttendance, updateManualAttendance, autoCloseStaleAttendance } from '../../services/firestoreService';
import { where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveStaff } from '../../hooks/useActiveStaff';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function parseTimeString(timeStr?: string) {
  if (!timeStr) return { hour: '09', minute: '30', period: 'AM' as 'AM' | 'PM' };
  const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return { hour: '09', minute: '30', period: 'AM' as 'AM' | 'PM' };
  return {
    hour: String(parseInt(match[1], 10)).padStart(2, '0'),
    minute: String(parseInt(match[2], 10)).padStart(2, '0'),
    period: match[3].toUpperCase() as 'AM' | 'PM',
  };
}

export const AttendancePage: React.FC = () => {
  const { userDoc, staffProfile: currentUserProfile } = useAuth();
  const { isDirector, isAdmin } = usePermissions();
  const canManageAttendance = isDirector || isAdmin;
  const { requirePinVerification } = useSecurity();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<'calendar' | 'logs'>(isDirector ? 'logs' : 'calendar');
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDateISO());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [manualModalOpen, setManualModalOpen] = useState(false);

  // Edit & Duplicate Conflict state
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'half_day' | 'absent'>('present');
  const [duplicateConflictOpen, setDuplicateConflictOpen] = useState(false);

  // Calendar Director Staff Filter
  const [selectedDirectorStaffId, setSelectedDirectorStaffId] = useState<string>(userDoc?.uid || '');

  // Form State for Manual Attendance / Edit
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [manualDate, setManualDate] = useState(getCurrentDateISO());

  // Time Picker Selectors
  const [inHour, setInHour] = useState('09');
  const [inMinute, setInMinute] = useState('30');
  const [inPeriod, setInPeriod] = useState<'AM' | 'PM'>('AM');

  const [outHour, setOutHour] = useState('06');
  const [outMinute, setOutMinute] = useState('00');
  const [outPeriod, setOutPeriod] = useState<'AM' | 'PM'>('PM');

  const [locationText, setLocationText] = useState('Head Office, Patna');
  const [manualReason, setManualReason] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  const constraints = isDirector
    ? []
    : [where('userId', '==', userDoc?.uid || 'none')];

  const { data: rawAttendanceList, loading } = useRealtimeCollection<AttendanceRecord>('attendance', constraints);
  const { activeStaffList } = useActiveStaff();

  useEffect(() => {
    if (activeStaffList.length > 0 && !selectedDirectorStaffId) {
      setSelectedDirectorStaffId(activeStaffList[0].userId);
    }
  }, [activeStaffList, selectedDirectorStaffId]);

  // Trigger stale auto-close in background on load
  useEffect(() => {
    if (rawAttendanceList.length > 0) {
      autoCloseStaleAttendance(rawAttendanceList).catch((err) =>
        console.error('Auto close check error:', err)
      );
    }
  }, [rawAttendanceList]);

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

  const handleOpenAddManual = () => {
    setEditingRecord(null);
    setSelectedStaffId(activeStaffList[0]?.userId || '');
    setManualDate(getCurrentDateISO());
    setAttendanceStatus('present');
    setInHour('09');
    setInMinute('30');
    setInPeriod('AM');
    setOutHour('06');
    setOutMinute('00');
    setOutPeriod('PM');
    setLocationText('Head Office, Patna');
    setManualReason('');
    setManualModalOpen(true);
  };

  const handleOpenEditManual = (log: AttendanceRecord) => {
    setEditingRecord(log);
    setSelectedStaffId(log.userId);
    setManualDate(log.date);
    
    let initialStatus: 'present' | 'half_day' | 'absent' = 'present';
    if (log.status === 'absent') {
      initialStatus = 'absent';
    } else if (log.status === 'half_day' || log.payableFraction === 0.5 || isHalfDayCheckIn(log.checkIn)) {
      initialStatus = 'half_day';
    } else {
      initialStatus = 'present';
    }
    setAttendanceStatus(initialStatus);

    const inT = parseTimeString(log.checkIn);
    setInHour(inT.hour);
    setInMinute(inT.minute);
    setInPeriod(inT.period);

    const outT = parseTimeString(log.checkOut);
    setOutHour(outT.hour);
    setOutMinute(outT.minute);
    setOutPeriod(outT.period);

    setLocationText(log.checkInLocation?.latitude ? 'GPS Location Recorded' : 'Head Office, Patna');
    setManualReason(log.manualReason || log.editReason || '');
    setManualModalOpen(true);
  };

  const handleSaveAttendance = async (e?: React.FormEvent, replaceExisting: boolean = false) => {
    if (e) e.preventDefault();
    if (!selectedStaffId) {
      showToast('Please select a staff member.', 'warning');
      return;
    }
    if (!manualReason.trim()) {
      showToast('Please provide a reason for manual attendance entry / correction.', 'warning');
      return;
    }

    const targetStaff = activeStaffList.find((s) => s.userId === selectedStaffId || s.id === selectedStaffId);
    if (!targetStaff) {
      showToast('Selected staff profile not found.', 'error');
      return;
    }

    const formattedCheckIn = `${inHour}:${inMinute} ${inPeriod}`;
    const formattedCheckOut = `${outHour}:${outMinute} ${outPeriod}`;

    const actionText = editingRecord ? 'Authorize Attendance Record Edit' : 'Authorize Manual Attendance Record Entry';

    requirePinVerification(actionText, async () => {
      setSubmittingManual(true);
      try {
        if (editingRecord) {
          await updateManualAttendance(editingRecord.id, {
            userId: targetStaff.userId,
            userName: targetStaff.fullName,
            userDesignation: targetStaff.designation,
            date: manualDate,
            status: attendanceStatus,
            checkIn: formattedCheckIn,
            checkOut: formattedCheckOut,
            locationText: locationText.trim() || 'Head Office, Patna',
            manualReason: manualReason.trim(),
            editedById: userDoc?.uid || 'director',
            editedByName: currentUserProfile?.fullName || userDoc?.name || 'Director',
            replaceExistingIfDuplicate: replaceExisting,
          });
          showToast('Attendance record updated successfully.', 'success');
        } else {
          await createManualAttendance({
            userId: targetStaff.userId,
            userName: targetStaff.fullName,
            userDesignation: targetStaff.designation,
            date: manualDate,
            checkIn: formattedCheckIn,
            checkOut: formattedCheckOut,
            locationText: locationText.trim() || 'Head Office, Patna',
            manualReason: manualReason.trim(),
            createdById: userDoc?.uid || 'director',
            createdByName: currentUserProfile?.fullName || userDoc?.name || 'Director',
            status: attendanceStatus,
            replaceExistingIfDuplicate: replaceExisting,
          });
          showToast('Manual attendance record added successfully.', 'success');
        }

        setManualModalOpen(false);
        setDuplicateConflictOpen(false);
        setEditingRecord(null);
        setManualReason('');
        setSelectedStaffId('');
      } catch (err: any) {
        console.error('Manual attendance error:', err);
        if (err?.message === 'DUPLICATE_DATE_CONFLICT') {
          setDuplicateConflictOpen(true);
        } else {
          showToast(err?.message || 'Failed to save attendance record.', 'error');
        }
      } finally {
        setSubmittingManual(false);
      }
    });
  };

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
            Realtime duty check-ins, check-outs, GPS location tracking, and monthly calendar summary.
          </p>
        </div>

        {canManageAttendance && (
          <Button
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={handleOpenAddManual}
          >
            + Manual Attendance
          </Button>
        )}
      </div>

      {/* DUTY ON / OFF CARD */}
      <DutyCard />

      {/* VIEW TABS */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'calendar'
              ? 'bg-brand-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          {isDirector ? 'Monthly Calendar View' : 'My Monthly Attendance'}
        </button>

        {isDirector && (
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'logs'
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            Daily Staff Logs Table
          </button>
        )}
      </div>

      {/* TAB CONTENT 1: MONTHLY CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <StaffAttendanceCalendar
          targetUserId={isDirector ? selectedDirectorStaffId : userDoc?.uid || ''}
          targetUserName={isDirector ? activeStaffList.find((s) => s.userId === selectedDirectorStaffId)?.fullName : userDoc?.name}
          canSelectStaff={isDirector}
          staffList={activeStaffList}
          onSelectStaffId={(id) => setSelectedDirectorStaffId(id)}
          onOpenManualModal={canManageAttendance ? handleOpenAddManual : undefined}
        />
      )}

      {/* TAB CONTENT 2: DAILY LOGS TABLE (DIRECTOR VIEW) */}
      {activeTab === 'logs' && isDirector && (
        <div className="space-y-4">
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
                icon={<CalendarIcon className="w-4 h-4 text-brand-600" />}
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
                      <th className="py-3.5 px-4">Status & Type</th>
                      <th className="py-3.5 px-4 text-center">GPS Locations</th>
                      {canManageAttendance && <th className="py-3.5 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLogs.map((log) => {
                      const isAutoClosed = log.status === 'auto_closed' || log.isAutoClosed;
                      const isManual = log.attendanceType === 'MANUAL' || log.isManuallyEdited;
                      const isAbsent = log.status === 'absent';
                      const isHalfDay = log.status === 'half_day' || log.payableFraction === 0.5 || isHalfDayCheckIn(log.checkIn);

                      return (
                        <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <p className="font-extrabold text-gray-900">{log.userName}</p>
                            <p className="text-[10px] text-brand-600 font-bold uppercase">{log.userDesignation}</p>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-gray-700">{log.date}</td>
                          <td className="py-3.5 px-4 font-mono font-bold">
                            {isAbsent ? (
                              <span className="text-red-600">ABSENT</span>
                            ) : (
                              <span className="text-emerald-600">{log.checkIn || '—'}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-700">
                            {isAbsent ? (
                              <span className="text-gray-400">—</span>
                            ) : (
                              log.checkOut || <span className="text-amber-600 text-[11px]">Active Shift</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-gray-800">
                            {log.totalMinutes > 0
                              ? `${Math.floor(log.totalMinutes / 60)}h ${log.totalMinutes % 60}m`
                              : '—'}
                          </td>
                          <td className="py-3.5 px-4 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isAbsent ? (
                                <Badge variant="danger" size="sm">
                                  ABSENT
                                </Badge>
                              ) : isHalfDay ? (
                                <Badge variant="warning" size="sm" className="bg-amber-100 text-amber-900 border-amber-300 font-bold">
                                  HALF DAY (0.5x)
                                </Badge>
                              ) : isAutoClosed ? (
                                <Badge variant="warning" size="sm">
                                  AUTO CLOSED
                                </Badge>
                              ) : (
                                <Badge variant="success" size="sm">
                                  PRESENT
                                </Badge>
                              )}

                              {isManual && (
                                <Badge variant="brand" size="sm" className="bg-purple-100 text-purple-800 border-purple-200 font-bold">
                                  ✎ MANUAL
                                </Badge>
                              )}
                            </div>
                            {log.manualReason && (
                              <p className="text-[10px] text-purple-700 italic">Reason: {log.manualReason}</p>
                            )}
                            {log.editedByName && (
                              <p className="text-[10px] text-gray-500 font-medium">Edited by: {log.editedByName}</p>
                            )}
                            {log.createdByName && !log.editedByName && (
                              <p className="text-[10px] text-gray-400">Added by: {log.createdByName}</p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isAbsent ? (
                              <span className="text-[10px] text-gray-400">No Location</span>
                            ) : isAutoClosed ? (
                              <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                Automatic Closed
                              </span>
                            ) : (
                              <div className="flex flex-col sm:flex-row gap-1 justify-center items-center">
                                {log.checkInLocation && (log.checkInLocation.latitude !== 0 || log.checkInLocation.longitude !== 0) ? (
                                  <GoogleMapsButton
                                    latitude={log.checkInLocation.latitude}
                                    longitude={log.checkInLocation.longitude}
                                    label="Check-In Map"
                                  />
                                ) : (
                                  <span className="text-[10px] text-gray-400">Manual Loc</span>
                                )}
                                {log.checkOutLocation && (log.checkOutLocation.latitude !== 0 || log.checkOutLocation.longitude !== 0) && (
                                  <GoogleMapsButton
                                    latitude={log.checkOutLocation.latitude}
                                    longitude={log.checkOutLocation.longitude}
                                    label="Check-Out Map"
                                  />
                                )}
                              </div>
                            )}
                          </td>
                          {canManageAttendance && (
                            <td className="py-3.5 px-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<Edit3 className="w-3.5 h-3.5" />}
                                onClick={() => handleOpenEditManual(log)}
                              >
                                Edit
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MANUAL ATTENDANCE / EDIT MODAL FOR DIRECTOR WITH TIME & STATUS SELECTORS */}
      {manualModalOpen && (
        <Modal
          isOpen={manualModalOpen}
          onClose={() => setManualModalOpen(false)}
          title={editingRecord ? 'Edit & Correct Attendance Record' : 'Add Manual Attendance Record'}
        >
          <form onSubmit={(e) => handleSaveAttendance(e, false)} className="space-y-4">
            <Select
              label="Select Staff Member"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              disabled={Boolean(editingRecord)}
              options={[
                { value: '', label: '-- Select Active Staff --' },
                ...activeStaffList.map((s) => ({
                  value: s.userId,
                  label: `${s.fullName} (${s.designation} - ${s.idNumber || s.workingArea})`,
                })),
              ]}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Attendance Date"
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                required
              />

              <Select
                label="Attendance Status"
                value={attendanceStatus}
                onChange={(e) => setAttendanceStatus(e.target.value as 'present' | 'half_day' | 'absent')}
                options={[
                  { value: 'present', label: 'Present (Full Day)' },
                  { value: 'half_day', label: 'Half Day (50% Pay)' },
                  { value: 'absent', label: 'Absent (0 Pay / Deduction)' },
                ]}
              />
            </div>

            {/* REALTIME 2:00 PM HALF DAY WARNING */}
            {attendanceStatus !== 'absent' && isHalfDayCheckIn(`${inHour}:${inMinute} ${inPeriod}`) && (
              <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl flex items-start gap-2 text-amber-900 text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold uppercase tracking-wide">⚠ HALF DAY RULE APPLIED</p>
                  <p className="font-medium mt-0.5">
                    Check-in time ({inHour}:{inMinute} {inPeriod}) is after 2:00 PM. Attendance will automatically save as <strong>HALF DAY</strong> (50% Daily Salary).
                  </p>
                </div>
              </div>
            )}

            {/* TIME SELECTORS SECTION */}
            {attendanceStatus !== 'absent' ? (
              <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 space-y-4">
                {/* DUTY ON TIME */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Duty On Time <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Duty On Hour"
                      value={inHour}
                      onChange={(e) => setInHour(e.target.value)}
                      className="w-16 h-9 bg-white border border-gray-300 rounded-lg px-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-brand-500 shadow-sm"
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>

                    <span className="font-bold text-gray-400 text-sm select-none">:</span>

                    <select
                      aria-label="Duty On Minute"
                      value={inMinute}
                      onChange={(e) => setInMinute(e.target.value)}
                      className="w-16 h-9 bg-white border border-gray-300 rounded-lg px-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-brand-500 shadow-sm"
                    >
                      {MINUTES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Duty On AM/PM"
                      value={inPeriod}
                      onChange={(e) => setInPeriod(e.target.value as 'AM' | 'PM')}
                      className="w-20 h-9 bg-brand-50 text-brand-800 border border-brand-200 rounded-lg px-2 text-xs font-black focus:outline-none focus:border-brand-500 shadow-sm"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                {/* DUTY OFF TIME */}
                <div className="space-y-1 pt-3 border-t border-gray-200/80">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Duty Off Time <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Duty Off Hour"
                      value={outHour}
                      onChange={(e) => setOutHour(e.target.value)}
                      className="w-16 h-9 bg-white border border-gray-300 rounded-lg px-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-brand-500 shadow-sm"
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>

                    <span className="font-bold text-gray-400 text-sm select-none">:</span>

                    <select
                      aria-label="Duty Off Minute"
                      value={outMinute}
                      onChange={(e) => setOutMinute(e.target.value)}
                      className="w-16 h-9 bg-white border border-gray-300 rounded-lg px-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-brand-500 shadow-sm"
                    >
                      {MINUTES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Duty Off AM/PM"
                      value={outPeriod}
                      onChange={(e) => setOutPeriod(e.target.value as 'AM' | 'PM')}
                      className="w-20 h-9 bg-brand-50 text-brand-800 border border-brand-200 rounded-lg px-2 text-xs font-black focus:outline-none focus:border-brand-500 shadow-sm"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 p-3 rounded-xl border border-red-200 text-red-900 text-xs font-medium">
                Note: <strong>ABSENT</strong> selected. Duty On/Off timestamps and workplace location will be cleared for this date.
              </div>
            )}

            {attendanceStatus !== 'absent' && (
              <Input
                label="Workplace / Office Location"
                placeholder="e.g. Head Office, Patna"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
              />
            )}

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Reason for Manual Entry / Edit <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                rows={3}
                placeholder="Specify reason for manual entry or correction (e.g. Date correction, late check-in, marked absent)..."
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                required
              />
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              Note: Attendance modification requires Director PIN authorization and will automatically recalculate staff salary slips.
            </p>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="ghost" className="w-full" onClick={() => setManualModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="w-full" loading={submittingManual}>
                {editingRecord ? 'Update Attendance (PIN)' : 'Save Attendance (PIN)'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* DUPLICATE DATE CONFLICT CONFIRMATION MODAL */}
      {duplicateConflictOpen && (
        <Modal
          isOpen={duplicateConflictOpen}
          onClose={() => setDuplicateConflictOpen(false)}
          title="Attendance Already Exists"
        >
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-amber-950">
                <p className="font-extrabold text-sm">Attendance already exists for this date!</p>
                <p>
                  An attendance record already exists for this staff member on <strong>{manualDate}</strong>.
                </p>
                <p className="font-semibold text-amber-900 mt-1">
                  Do you want to replace/merge the existing record on {manualDate}?
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setDuplicateConflictOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold"
                onClick={() => handleSaveAttendance(undefined, true)}
                loading={submittingManual}
              >
                Confirm Replace Record (PIN)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
