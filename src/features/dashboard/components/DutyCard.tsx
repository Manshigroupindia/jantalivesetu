import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { MapPin, Clock, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { recordDutyCheckIn, recordDutyCheckOut, recordSundayLeaveCover } from '../../../services/firestoreService';
import { getCurrentDateISO, getCurrentTimeFormatted } from '../../../utils/dateUtils';
import { GoogleMapsButton } from '../../../components/common/GoogleMapsButton';
import { AttendanceRecord } from '../../../types';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export const DutyCard: React.FC = () => {
  const { userDoc, staffProfile } = useAuth();
  const { showToast } = useNotification();
  const { captureLocation, loading: geoLoading, error: geoError } = useGeolocation();
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sunday Modal State
  const [sundayModalOpen, setSundayModalOpen] = useState(false);
  const [eligibleLeaves, setEligibleLeaves] = useState<{ date: string; label: string }[]>([]);
  const [selectedLeaveDate, setSelectedLeaveDate] = useState<string>('');
  const [sundayOptionMode, setSundayOptionMode] = useState<'normal' | 'cover'>('normal');

  const todayStr = getCurrentDateISO();
  const isTodaySunday = new Date().getDay() === 0;

  useEffect(() => {
    if (!userDoc?.uid) return;

    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', userDoc.uid),
      where('date', '==', todayStr)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setTodayAttendance({ id: d.id, ...d.data() } as AttendanceRecord);
      } else {
        setTodayAttendance(null);
      }
    });

    return () => unsub();
  }, [userDoc?.uid, todayStr]);

  const handleDutyOn = async () => {
    if (!userDoc) return;

    if (todayAttendance) {
      if (todayAttendance.checkOut) {
        showToast('Duty is already marked off for today.', 'info');
        return;
      }
      showToast('You are already on duty.', 'info');
      return;
    }

    // Sunday check
    if (isTodaySunday) {
      // Find eligible uncovered leave dates in current month
      const monthPrefix = todayStr.substring(0, 7);
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', userDoc.uid)
      );
      const snap = await getDocs(q);
      const uncovered: { date: string; label: string }[] = [];

      snap.docs.forEach((d) => {
        const rec = d.data() as AttendanceRecord;
        if (rec.date && rec.date.startsWith(monthPrefix) && rec.date < todayStr) {
          if ((rec.status === 'absent' || rec.payableFraction === 0) && !rec.coveredBySundayDate) {
            uncovered.push({
              date: rec.date,
              label: `${rec.date} — Unpaid Leave / Absent`,
            });
          }
        }
      });

      setEligibleLeaves(uncovered);
      if (uncovered.length > 0) {
        setSelectedLeaveDate(uncovered[0].date);
      }
      setSundayOptionMode('normal');
      setSundayModalOpen(true);
      return;
    }

    await executeNormalDutyOn();
  };

  const executeNormalDutyOn = async () => {
    if (!userDoc) return;

    setActionLoading(true);
    setError(null);

    try {
      const loc = await captureLocation();
      const timeStr = getCurrentTimeFormatted();

      await recordDutyCheckIn({
        userId: userDoc.uid,
        userName: staffProfile?.fullName || userDoc.name || 'Staff Member',
        userDesignation: staffProfile?.designation || userDoc.role || 'Staff',
        date: todayStr,
        checkIn: timeStr,
        checkInLocation: loc,
        totalMinutes: 0,
        status: isTodaySunday ? 'sunday' : 'on_duty',
        workType: isTodaySunday ? 'SUNDAY_WORK' : 'NORMAL',
        isSunday: isTodaySunday,
        isSundayWorked: isTodaySunday,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      showToast(isTodaySunday ? 'Sunday Duty ON recorded successfully.' : 'Duty ON recorded successfully.', 'success');
      setSundayModalOpen(false);
    } catch (err: any) {
      console.error('Duty On error:', err);
      const errorMsg = err.message || 'Failed to capture GPS location for Duty On.';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const executeLeaveCoverDutyOn = async () => {
    if (!userDoc || !selectedLeaveDate) return;

    setActionLoading(true);
    setError(null);

    try {
      const loc = await captureLocation();
      const timeStr = getCurrentTimeFormatted();

      await recordSundayLeaveCover({
        userId: userDoc.uid,
        userName: staffProfile?.fullName || userDoc.name || 'Staff Member',
        userDesignation: staffProfile?.designation || userDoc.role || 'Staff',
        sundayDate: todayStr,
        checkIn: timeStr,
        checkInLocation: loc,
        coveredLeaveDate: selectedLeaveDate,
      });

      showToast(`Sunday Duty ON recorded! Leave of ${selectedLeaveDate} is now covered.`, 'success');
      setSundayModalOpen(false);
    } catch (err: any) {
      console.error('Sunday Leave Cover error:', err);
      setError(err.message || 'Failed to cover leave.');
      showToast(err.message || 'Failed to cover leave.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDutyOff = async () => {
    if (!todayAttendance) {
      showToast("Today's Duty On record could not be found. Please contact the Director.", 'error');
      return;
    }

    if (todayAttendance.checkOut) {
      showToast('Duty is already marked off for today.', 'info');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const loc = await captureLocation();
      const timeStr = getCurrentTimeFormatted();

      // Calculate total working minutes
      const now = new Date();
      const createdTime = new Date(todayAttendance.createdAt).getTime();
      const totalMinutes = !isNaN(createdTime)
        ? Math.max(1, Math.round((now.getTime() - createdTime) / 60000))
        : 30;

      await recordDutyCheckOut(todayAttendance.id, timeStr, loc, totalMinutes);
      showToast('Duty OFF recorded successfully.', 'success');
    } catch (err: any) {
      console.error('Duty Off error:', err);
      const isPermissionErr = err.code === 'permission-denied' || err.message?.includes('permission');
      const errorMsg = isPermissionErr
        ? 'Attendance permission is not configured correctly. Please contact the Director.'
        : err.message || 'Failed to capture GPS location for Duty Off.';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Card className="bg-white border-brand-100 shadow-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-brand-600" />
          <h3 className="text-base font-extrabold text-gray-900">Attendance & Duty Status</h3>
        </div>
        {todayAttendance?.checkIn && !todayAttendance?.checkOut ? (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 animate-pulse">
            ● ON DUTY
          </span>
        ) : todayAttendance?.checkOut ? (
          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
            OFF DUTY (COMPLETED)
          </span>
        ) : (
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            NOT CHECKED IN
          </span>
        )}
      </div>

      {/* STATUS & ACTIONS */}
      {!todayAttendance ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Click DUTY ON to start your work shift. GPS location will be captured securely.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="w-full shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
            icon={<MapPin className="w-5 h-5" />}
            loading={actionLoading || geoLoading}
            onClick={handleDutyOn}
          >
            DUTY ON
          </Button>
        </div>
      ) : !todayAttendance.checkOut ? (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
            <p className="text-xs font-bold text-emerald-800">
              Duty started at {todayAttendance.checkIn}
            </p>
            {todayAttendance.checkInLocation && (
              <p className="text-[11px] text-emerald-700 font-medium">
                Check-in location captured accurately (±{Math.round(todayAttendance.checkInLocation.accuracy)}m)
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {todayAttendance.checkInLocation && (
              <GoogleMapsButton
                latitude={todayAttendance.checkInLocation.latitude}
                longitude={todayAttendance.checkInLocation.longitude}
                label="Check-In Map"
              />
            )}
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              icon={<Clock className="w-4 h-4" />}
              loading={actionLoading || geoLoading}
              onClick={handleDutyOff}
            >
              DUTY OFF
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700">
            <div className="flex justify-between">
              <span className="font-medium text-gray-400">Shift Started:</span>
              <span className="font-bold text-gray-900">{todayAttendance.checkIn}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-400">Shift Ended:</span>
              <span className="font-bold text-gray-900">{todayAttendance.checkOut}</span>
            </div>
            <div className="flex justify-between pt-1 border-t">
              <span className="font-medium text-gray-400">Duration:</span>
              <span className="font-bold text-emerald-600">
                {Math.floor(todayAttendance.totalMinutes / 60)}h {todayAttendance.totalMinutes % 60}m
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {todayAttendance.checkInLocation && (
              <GoogleMapsButton
                latitude={todayAttendance.checkInLocation.latitude}
                longitude={todayAttendance.checkInLocation.longitude}
                label="Check-In Map"
              />
            )}
            {todayAttendance.checkOutLocation && (
              <GoogleMapsButton
                latitude={todayAttendance.checkOutLocation.latitude}
                longitude={todayAttendance.checkOutLocation.longitude}
                label="Check-Out Map"
              />
            )}
          </div>
        </div>
      )}

      {(error || geoError) && (
        <p className="text-xs text-red-600 font-medium flex items-center gap-1">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error || geoError}
        </p>
      )}

      {/* SUNDAY DUTY ON PROMPT MODAL */}
      <Modal
        isOpen={sundayModalOpen}
        onClose={() => setSundayModalOpen(false)}
        title="Sunday Detected"
      >
        <div className="space-y-4 py-2">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <Calendar className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-black text-amber-950">Today is Sunday</h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Would you like to work normally on Sunday or use today's work to cover an eligible previous leave?
              </p>
            </div>
          </div>

          {eligibleLeaves.length > 0 ? (
            <div className="space-y-3 pt-2">
              <label className="text-xs font-extrabold text-gray-700 block">Select Work Type:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSundayOptionMode('normal')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    sundayOptionMode === 'normal'
                      ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 font-bold'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xs font-black">Work on Sunday</span>
                  <span className="text-[10px] opacity-80">Earn Base Sunday Pay + Extra Sunday Work Pay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSundayOptionMode('cover')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    sundayOptionMode === 'cover'
                      ? 'bg-purple-100 border-purple-500 ring-2 ring-purple-500/20 text-purple-950 font-bold'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xs font-black flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-600" /> Cover Leave
                  </span>
                  <span className="text-[10px] opacity-80">Cover previous unpaid leave date</span>
                </button>
              </div>

              {sundayOptionMode === 'cover' && (
                <div className="space-y-1.5 p-3 bg-purple-50 border border-purple-200 rounded-xl animate-in fade-in duration-150">
                  <label className="text-xs font-bold text-purple-900 block">Select Leave Date to Cover:</label>
                  <Select
                    value={selectedLeaveDate}
                    onChange={(e) => setSelectedLeaveDate(e.target.value)}
                    options={eligibleLeaves.map((l) => ({ value: l.date, label: l.label }))}
                  />
                  <p className="text-[11px] text-purple-700">
                    Work performed today will cover your leave of <strong>{selectedLeaveDate}</strong>.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
              No previous uncovered leaves found in current month. Today will be recorded as <strong>Normal Sunday Work</strong>.
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <Button
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => setSundayModalOpen(false)}
            >
              Cancel
            </Button>

            {sundayOptionMode === 'cover' && eligibleLeaves.length > 0 ? (
              <Button
                variant="primary"
                size="md"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                loading={actionLoading}
                onClick={executeLeaveCoverDutyOn}
              >
                Cover {selectedLeaveDate}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                loading={actionLoading}
                onClick={executeNormalDutyOn}
              >
                Work on Sunday
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </Card>
  );
};
