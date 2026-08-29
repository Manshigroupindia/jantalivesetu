import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { DutyCard } from '../dashboard/components/DutyCard';
import { GoogleMapsButton } from '../../components/common/GoogleMapsButton';
import { Clock, Calendar, Search, PlusCircle } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { AttendanceRecord, StaffProfile } from '../../types';
import { getCurrentDateISO } from '../../utils/dateUtils';
import { usePermissions } from '../../hooks/usePermissions';
import { useSecurity } from '../../contexts/SecurityContext';
import { useNotification } from '../../contexts/NotificationContext';
import { createManualAttendance, autoCloseStaleAttendance } from '../../services/firestoreService';
import { where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

export const AttendancePage: React.FC = () => {
  const { userDoc, staffProfile: currentUserProfile } = useAuth();
  const { isDirector, isAdmin } = usePermissions();
  const canViewAll = isDirector || isAdmin;
  const { requirePinVerification } = useSecurity();
  const { showToast } = useNotification();

  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDateISO());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [manualModalOpen, setManualModalOpen] = useState(false);

  // Form State for Manual Attendance
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [manualDate, setManualDate] = useState(getCurrentDateISO());
  const [checkInTime, setCheckInTime] = useState('09:30 AM');
  const [checkOutTime, setCheckOutTime] = useState('06:00 PM');
  const [locationText, setLocationText] = useState('Head Office, Patna');
  const [manualReason, setManualReason] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  const constraints = canViewAll
    ? []
    : [where('userId', '==', userDoc?.uid || 'none')];

  const { data: rawAttendanceList, loading } = useRealtimeCollection<AttendanceRecord>('attendance', constraints);
  const { data: staffProfiles } = useRealtimeCollection<StaffProfile>('staffProfiles');

  const activeStaffList = staffProfiles.filter((s) => s.approvalStatus !== 'deleted' && s.status !== 'deleted');

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

  const handleCreateManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      showToast('Please select a staff member.', 'warning');
      return;
    }
    if (!manualReason.trim()) {
      showToast('Please provide a mandatory reason for manual attendance correction.', 'warning');
      return;
    }

    const targetStaff = activeStaffList.find((s) => s.userId === selectedStaffId || s.id === selectedStaffId);
    if (!targetStaff) {
      showToast('Selected staff profile not found.', 'error');
      return;
    }

    requirePinVerification('Authorize Manual Attendance Record Entry', async () => {
      setSubmittingManual(true);
      try {
        await createManualAttendance({
          userId: targetStaff.userId,
          userName: targetStaff.fullName,
          userDesignation: targetStaff.designation,
          date: manualDate,
          checkIn: checkInTime,
          checkOut: checkOutTime,
          locationText: locationText.trim() || 'Head Office, Patna',
          manualReason: manualReason.trim(),
          createdById: userDoc?.uid || 'director',
          createdByName: currentUserProfile?.fullName || userDoc?.name || 'Director',
        });

        setManualModalOpen(false);
        setManualReason('');
        setSelectedStaffId('');
        showToast('Manual attendance record added successfully.', 'success');
      } catch (err: any) {
        console.error('Manual attendance error:', err);
        showToast(err?.message || 'Failed to create manual attendance record.', 'error');
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
            Realtime duty check-ins, check-outs, GPS location tracking, and working hours calculation.
          </p>
        </div>

        {canViewAll && (
          <Button
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => setManualModalOpen(true)}
          >
            Add Manual Attendance (PIN)
          </Button>
        )}
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
                  <th className="py-3.5 px-4">Status & Type</th>
                  <th className="py-3.5 px-4 text-center">GPS Locations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => {
                  const isAutoClosed = log.status === 'auto_closed' || log.isAutoClosed;
                  const isManual = log.attendanceType === 'MANUAL';

                  return (
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
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isAutoClosed ? (
                            <Badge variant="warning" size="sm">
                              AUTO CLOSED
                            </Badge>
                          ) : isManual ? (
                            <Badge variant="brand" size="sm" className="bg-purple-100 text-purple-800 border-purple-200">
                              MANUALLY ADDED
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm">
                              COMPLETED
                            </Badge>
                          )}
                        </div>
                        {isManual && log.manualReason && (
                          <p className="text-[10px] text-purple-700 italic">Reason: {log.manualReason}</p>
                        )}
                        {isManual && log.createdByName && (
                          <p className="text-[10px] text-gray-400">Added by: {log.createdByName}</p>
                        )}
                        {isAutoClosed && (
                          <p className="text-[10px] text-amber-700 font-medium">Automatic Closed at 9:00 PM</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isAutoClosed ? (
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MANUAL ATTENDANCE MODAL FOR DIRECTOR */}
      {manualModalOpen && (
        <Modal isOpen={manualModalOpen} onClose={() => setManualModalOpen(false)} title="Add Manual Attendance Record">
          <form onSubmit={handleCreateManualAttendance} className="space-y-4">
            <Select
              label="Select Staff Member"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              options={[
                { value: '', label: '-- Select Active Staff --' },
                ...activeStaffList.map((s) => ({
                  value: s.userId,
                  label: `${s.fullName} (${s.designation} - ${s.idNumber || s.workingArea})`,
                })),
              ]}
              required
            />

            <Input
              label="Attendance Date"
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Duty On Time (e.g. 09:30 AM)"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                required
              />
              <Input
                label="Duty Off Time (e.g. 06:00 PM)"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                required
              />
            </div>

            <Input
              label="Workplace / Office Location"
              placeholder="e.g. Head Office, Patna"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
            />

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Reason for Manual Entry <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                rows={3}
                placeholder="Specify reason for manual override e.g. Phone battery died or field assignment..."
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                required
              />
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              Note: Manual attendance requires Director PIN authorization and will be audited with mandatory badges.
            </p>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="ghost" className="w-full" onClick={() => setManualModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="w-full" loading={submittingManual}>
                Save Manual Attendance (PIN)
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
