import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { MapPin, Clock, AlertCircle } from 'lucide-react';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { useAuth } from '../../../contexts/AuthContext';
import { recordDutyCheckIn, recordDutyCheckOut } from '../../../services/firestoreService';
import { getCurrentDateISO, getCurrentTimeFormatted } from '../../../utils/dateUtils';
import { GoogleMapsButton } from '../../../components/common/GoogleMapsButton';
import { AttendanceRecord } from '../../../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export const DutyCard: React.FC = () => {
  const { userDoc, staffProfile } = useAuth();
  const { captureLocation, loading: geoLoading, error: geoError } = useGeolocation();
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayStr = getCurrentDateISO();

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
        status: 'on_duty',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Duty On error:', err);
      setError(err.message || 'Failed to capture GPS location for Duty On.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDutyOff = async () => {
    if (!todayAttendance) return;
    setActionLoading(true);
    setError(null);

    try {
      const loc = await captureLocation();
      const timeStr = getCurrentTimeFormatted();

      // Calculate total working minutes
      const now = new Date();
      const totalMinutes = Math.max(30, Math.round((now.getTime() - new Date(todayAttendance.createdAt).getTime()) / 60000));

      await recordDutyCheckOut(todayAttendance.id, timeStr, loc, totalMinutes);
    } catch (err: any) {
      console.error('Duty Off error:', err);
      setError(err.message || 'Failed to capture GPS location for Duty Off.');
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
            <p className="text-[11px] text-emerald-700 font-medium">
              Check-in location captured accurately (±{Math.round(todayAttendance.checkInLocation.accuracy)}m)
            </p>
          </div>

          <div className="flex gap-2">
            <GoogleMapsButton
              latitude={todayAttendance.checkInLocation.latitude}
              longitude={todayAttendance.checkInLocation.longitude}
              label="View Check-In Map"
            />
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
            <span className="font-bold text-emerald-600">{Math.floor(todayAttendance.totalMinutes / 60)}h {todayAttendance.totalMinutes % 60}m</span>
          </div>
        </div>
      )}

      {(error || geoError) && (
        <p className="text-xs text-red-600 font-medium flex items-center gap-1">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error || geoError}
        </p>
      )}
    </Card>
  );
};
