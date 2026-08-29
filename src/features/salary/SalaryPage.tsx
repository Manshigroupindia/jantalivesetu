import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { DollarSign, Lock, Edit3 } from 'lucide-react';
import { calculateSalaryBreakdown } from '../../services/salaryCalculator';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { StaffProfile, AttendanceRecord, CompanyHoliday } from '../../types';
import { formatINR } from '../../utils/formatters';
import { formatMonthYear } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useSecurity } from '../../contexts/SecurityContext';
import { saveSalaryRecord, saveStaffProfile } from '../../services/firestoreService';
import { logAuditEvent } from '../../services/auditService';
import { useNotification } from '../../contexts/NotificationContext';

import { useActiveStaff } from '../../hooks/useActiveStaff';

export const SalaryPage: React.FC = () => {
  const { userDoc, staffProfile } = useAuth();
  const { isDirector, isAdmin } = usePermissions();
  const canViewAll = isDirector || isAdmin;
  const { requirePinVerification } = useSecurity();
  const { showToast } = useNotification();

  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [breakdown, setBreakdown] = useState<any>(null);

  // Edit Salary Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [newSalary, setNewSalary] = useState<number>(0);
  const [savingSalary, setSavingSalary] = useState(false);

  const { activeStaffList: staffList, loading: staffLoading } = useActiveStaff();
  const { data: attendanceLogs = [] } = useRealtimeCollection<AttendanceRecord>('attendance');
  const { data: holidays = [] } = useRealtimeCollection<CompanyHoliday>('holidays');

  useEffect(() => {
    if (!canViewAll && staffProfile) {
      setSelectedStaffId(staffProfile.userId);
    } else if (staffList.length > 0) {
      if (!selectedStaffId || !staffList.some((s) => s.userId === selectedStaffId)) {
        setSelectedStaffId(staffList[0].userId);
      }
    } else {
      setSelectedStaffId('');
    }
  }, [staffList, staffProfile, canViewAll, selectedStaffId]);

  useEffect(() => {
    if (!selectedStaffId) return;

    const staff = staffList.find((s) => s.userId === selectedStaffId);
    if (!staff) return;

    const staffAttendance = (attendanceLogs || []).filter((a) => a.userId === selectedStaffId);
    const holidayDates = (holidays || []).map((h) => h.date);

    const res = calculateSalaryBreakdown(
      staff.monthlySalary || 0,
      selectedMonth,
      staffAttendance,
      holidayDates,
      1, // 1 emergency leave allowed
      0  // advance deduction
    );

    setBreakdown(res);
  }, [selectedMonth, selectedStaffId, staffList, attendanceLogs, holidays]);

  const handleOpenEditSalary = () => {
    const staff = staffList.find((s) => s.userId === selectedStaffId);
    if (staff) {
      setNewSalary(staff.monthlySalary || 0);
      setEditModalOpen(true);
    }
  };

  const handleSaveBaseSalary = () => {
    const staff = staffList.find((s) => s.userId === selectedStaffId);
    if (!staff) return;

    if (newSalary <= 0) {
      showToast('Please enter a valid monthly base salary greater than 0.', 'warning');
      return;
    }

    requirePinVerification(`Update Base Salary for ${staff.fullName} to ₹${newSalary}`, async () => {
      setSavingSalary(true);
      try {
        await saveStaffProfile({
          ...staff,
          monthlySalary: newSalary,
          updatedAt: new Date().toISOString(),
        });

        await logAuditEvent({
          userId: userDoc?.uid || 'director',
          userName: 'Director',
          userRole: 'director',
          action: 'STAFF_SALARY_UPDATED',
          module: 'salary',
          recordId: staff.userId,
        });

        setEditModalOpen(false);
        showToast(`Salary updated successfully for ${staff.fullName}. New Base: ₹${newSalary}`, 'success');
      } catch (err: any) {
        console.error('Failed to update salary:', err);
        showToast(err?.message || 'Failed to update base salary.', 'error');
      } finally {
        setSavingSalary(false);
      }
    });
  };

  const handleFinalizePayroll = () => {
    if (!breakdown || !selectedStaffId) return;
    const staff = staffList.find((s) => s.userId === selectedStaffId);
    if (!staff) return;

    requirePinVerification(`Finalize Payroll for ${staff.fullName} (${selectedMonth})`, async () => {
      try {
        await saveSalaryRecord({
          userId: staff.userId,
          userName: staff.fullName,
          userDesignation: staff.designation,
          month: selectedMonth,
          baseSalary: staff.monthlySalary,
          dailyRate: breakdown.dailyRate,
          totalMonthDays: breakdown.totalDaysInMonth,
          presentDays: breakdown.presentDays,
          sundaysCount: breakdown.sundaysCount,
          paidHolidaysCount: breakdown.paidHolidaysCount,
          emergencyLeaveCount: breakdown.emergencyLeaveCount || 0,
          absentDays: breakdown.absentDays,
          payableDays: breakdown.totalPayableDays,
          grossSalary: breakdown.grossSalary,
          advanceDeduction: 0,
          netSalary: breakdown.netSalary,
          status: 'finalized',
          updatedAt: new Date().toISOString(),
        });

        await logAuditEvent({
          userId: userDoc?.uid || 'director',
          userName: 'Director',
          userRole: 'director',
          action: 'SALARY_FINALIZED',
          module: 'salary',
          recordId: `${staff.userId}_${selectedMonth}`,
        });

        showToast(`Payroll finalized for ${staff.fullName}.`, 'success');
      } catch (err) {
        showToast('Failed to finalize payroll.', 'error');
      }
    });
  };

  const selectedStaff = staffList.find((s) => s.userId === selectedStaffId);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-600" />
            Salary Engine & Payroll
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Deterministic 30-day base salary calculation including Sundays, Paid Holidays, and Deductions.
          </p>
        </div>
      </div>

      {/* SELECTORS */}
      <Card className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Select Salary Month & Year"
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />

        {canViewAll && (
          <Select
            label="Select Staff Member"
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            options={
              staffList.length > 0
                ? staffList.map((s) => ({ value: s.userId, label: `${s.fullName} (${s.designation})` }))
                : [{ value: '', label: 'No staff profiles available' }]
            }
          />
        )}
      </Card>

      {/* BREAKDOWN DISPLAY */}
      {staffLoading ? (
        <Card className="p-8 text-center text-gray-400 text-xs animate-pulse">
          Loading staff and payroll data...
        </Card>
      ) : !breakdown ? (
        <Card className="p-8 text-center text-gray-500 text-xs italic">
          Select a valid staff member to calculate monthly salary slip.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* BREAKDOWN CARDS */}
          <Card className="p-6 space-y-4 lg:col-span-2">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Salary Slip — {formatMonthYear(selectedMonth)}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {selectedStaff ? `Employee: ${selectedStaff.fullName} (${selectedStaff.designation})` : 'Formula: Base Daily Rate = Monthly Salary / 30'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success" size="md">
                  30-Day Basis Engine
                </Badge>
                {isDirector && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Edit3 className="w-4 h-4" />}
                    onClick={handleOpenEditSalary}
                  >
                    Edit Salary
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-gray-50 p-3 rounded-xl border">
                <span className="text-xs text-gray-400 font-medium block">Monthly Base</span>
                <span className="text-lg font-extrabold text-gray-900">{formatINR(breakdown.baseSalary)}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border">
                <span className="text-xs text-gray-400 font-medium block">Daily Rate (÷30)</span>
                <span className="text-lg font-extrabold text-gray-900">{formatINR(breakdown.dailyRate)}</span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <span className="text-xs text-emerald-700 font-bold block">Payable Days</span>
                <span className="text-xl font-black text-emerald-900">{breakdown.totalPayableDays} / {breakdown.totalDaysInMonth}</span>
              </div>
              <div className="bg-red-50 p-3 rounded-xl border border-red-200">
                <span className="text-xs text-red-700 font-bold block">Absent Days</span>
                <span className="text-xl font-black text-red-900">{breakdown.absentDays}</span>
              </div>
            </div>

            {/* DETAILED LOG */}
            <div className="space-y-2 border-t pt-4 text-xs text-gray-700">
              <div className="flex justify-between p-2 rounded-lg bg-gray-50">
                <span className="font-medium text-gray-700">Present Days:</span>
                <span className="font-bold text-gray-900">{breakdown.presentDays} days</span>
              </div>

              <div className="flex justify-between p-2 rounded-lg bg-gray-50">
                <span className="font-medium text-gray-700">Paid Sundays (Max 4):</span>
                <span className="font-bold text-emerald-600">+{breakdown.sundaysCount} days</span>
              </div>

              {Boolean(breakdown.fifthSundayCount && breakdown.fifthSundayCount > 0) && (
                <div className="flex justify-between p-2 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
                  <span>5th Sunday — Neutral (No Pay / No Deduction):</span>
                  <span>{breakdown.fifthSundayCount} day</span>
                </div>
              )}

              {Boolean(breakdown.has31stNeutralDay) && (
                <div className="flex justify-between p-2 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 font-semibold">
                  <span>31st Calendar Day — Neutral (30-Day Model):</span>
                  <span>1 day</span>
                </div>
              )}

              <div className="flex justify-between p-2 rounded-lg bg-gray-50">
                <span className="font-medium text-gray-700">Paid Company Holidays:</span>
                <span className="font-bold text-emerald-600">+{breakdown.paidHolidaysCount} days</span>
              </div>

              <div className="flex justify-between p-2 rounded-lg bg-purple-50 text-purple-900 border border-purple-100">
                <span className="font-bold text-purple-900">Paid Emergency Holiday:</span>
                <span className="font-extrabold text-purple-700">
                  +{breakdown.emergencyLeaveCount} {breakdown.emergencyLeaveCount === 1 ? 'day' : 'days'}
                </span>
              </div>

              <div className="flex justify-between p-2 rounded-lg bg-red-50 text-red-700 font-semibold">
                <span>Unpaid Leave / Absent Days:</span>
                <span>{breakdown.unpaidLeaves ?? breakdown.absentDays} days (-{formatINR(breakdown.absentDeduction)})</span>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-emerald-100/70 text-emerald-950 font-black text-sm border border-emerald-300">
                <span>Total Payable Days:</span>
                <span>{breakdown.totalPayableDays} / 30 Days</span>
              </div>
            </div>
          </Card>

          {/* NET PAYABLE HIGHLIGHT & ACTIONS */}
          <Card className="p-6 space-y-4 flex flex-col justify-between bg-gradient-to-b from-gray-900 to-black text-white">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">NET PAYABLE SALARY</span>
              <h2 className="text-4xl font-black font-mono text-emerald-400 tracking-tight">
                {formatINR(breakdown.netSalary)}
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Calculated strictly using Janta Live Setu 30-day salary engine rules.
              </p>
            </div>

            {isDirector && (
              <div className="space-y-2 pt-4 border-t border-white/10">
                <Button
                  variant="primary"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
                  icon={<Lock className="w-4 h-4" />}
                  onClick={handleFinalizePayroll}
                >
                  Finalize & Disburse (PIN)
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* EDIT BASE SALARY MODAL FOR DIRECTOR */}
      {editModalOpen && selectedStaff && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit Base Monthly Salary — ${selectedStaff.fullName}`}
        >
          <div className="space-y-4 py-2">
            <p className="text-xs text-gray-500 font-medium">
              Updating the base monthly salary will immediately update future monthly calculations without mutating past finalized payroll.
            </p>

            <Input
              label="New Monthly Base Salary (₹)"
              type="number"
              min={1}
              value={newSalary}
              onChange={(e) => setNewSalary(parseInt(e.target.value, 10))}
              required
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                disabled={savingSalary}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={savingSalary}
                onClick={handleSaveBaseSalary}
              >
                Save Changes (PIN)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
