import { SalaryCalculationResult, AttendanceRecord, CompanyHoliday } from '../types';

export interface SalaryInputData {
  userId?: string;
  month: string; // Format: YYYY-MM
  monthlySalary: number; // e.g., 12000
  attendanceRecords?: AttendanceRecord[];
  holidays?: CompanyHoliday[] | string[];
  approvedExpensesTotal?: number;
  emergencyLeaveCount?: number;
  advanceDeduction?: number;
}

/**
 * Deterministic Central Salary Calculation Engine for Janta Live Setu
 * 
 * Rules:
 * 1. Base Daily Rate = monthlySalary / 30.
 * 2. 30-day salary basis structure.
 * 3. Sundays are paid company holidays.
 * 4. Configured company holidays are paid (no double counting on Sundays).
 * 5. 1 Emergency Leave per month is paid (0 deduction).
 * 6. Additional unpaid leaves deduct dailyRate per day.
 * 7. Cap total payable base salary at monthlySalary (e.g. 5th Sunday does not overpay).
 */
export function calculateSalaryBreakdown(
  monthlySalaryOrInput: number | SalaryInputData,
  monthParam?: string,
  attendanceRecordsParam: AttendanceRecord[] = [],
  holidaysParam: (CompanyHoliday | string)[] = [],
  emergencyLeaveParam: number = 0,
  advanceDeductionParam: number = 0,
  approvedExpensesParam: number = 0
): SalaryCalculationResult {
  let userId = 'user_default';
  let month = '2026-08';
  let monthlySalary = 0;
  let attendanceRecords: AttendanceRecord[] = [];
  let holidays: (CompanyHoliday | string)[] = [];
  let approvedExpensesTotal = 0;
  let emergencyLeaveAllowed = 1;
  let advanceDeduction = 0;

  if (typeof monthlySalaryOrInput === 'object' && monthlySalaryOrInput !== null) {
    const input = monthlySalaryOrInput;
    userId = input.userId || 'user_default';
    month = input.month || '2026-08';
    monthlySalary = input.monthlySalary || 0;
    attendanceRecords = input.attendanceRecords || [];
    holidays = input.holidays || [];
    approvedExpensesTotal = input.approvedExpensesTotal || 0;
    emergencyLeaveAllowed = input.emergencyLeaveCount ?? 1;
    advanceDeduction = input.advanceDeduction || 0;
  } else {
    monthlySalary = Number(monthlySalaryOrInput) || 0;
    month = monthParam || '2026-08';
    attendanceRecords = attendanceRecordsParam || [];
    holidays = holidaysParam || [];
    emergencyLeaveAllowed = emergencyLeaveParam || 1;
    advanceDeduction = advanceDeductionParam || 0;
    approvedExpensesTotal = approvedExpensesParam || 0;
  }

  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10) || 2026;
  const monthIdx = (parseInt(monthStr, 10) || 8) - 1; // 0-indexed

  // Daily rate formula: monthlySalary / 30
  const dailyRate = Math.round((monthlySalary / 30) * 100) / 100;
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  // Create attendance lookup by date (YYYY-MM-DD)
  const attendanceMap = new Map<string, AttendanceRecord>();
  if (Array.isArray(attendanceRecords)) {
    attendanceRecords.forEach((att) => {
      if (att && att.date && att.date.startsWith(month)) {
        attendanceMap.set(att.date, att);
      }
    });
  }

  // Create holiday lookup by date
  const holidaySet = new Set<string>();
  if (Array.isArray(holidays)) {
    holidays.forEach((h) => {
      if (typeof h === 'string') {
        if (h.startsWith(month)) holidaySet.add(h);
      } else if (h && h.date) {
        if (h.date.startsWith(month)) holidaySet.add(h.date);
      }
    });
  }

  let workedDays = 0;
  let paidSundays = 0;
  let paidHolidays = 0;
  let emergencyLeavesUsed = 0;
  let unpaidLeaves = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(year, monthIdx, day);
    const isSunday = dateObj.getDay() === 0;
    const isCompanyHoliday = holidaySet.has(dateStr);
    const attendance = attendanceMap.get(dateStr);

    if (attendance && (attendance.status === 'present' || attendance.status === 'on_duty')) {
      workedDays++;
    } else if (attendance && attendance.status === 'paid_leave') {
      if (emergencyLeavesUsed < emergencyLeaveAllowed) {
        emergencyLeavesUsed++;
      } else {
        unpaidLeaves++;
      }
    } else if (isSunday) {
      paidSundays++;
    } else if (isCompanyHoliday) {
      paidHolidays++;
    } else {
      // Absent or unrecorded working day
      unpaidLeaves++;
    }
  }

  // Auto-apply 1 Emergency Leave if there are unpaid leaves and 0 explicit paid leaves were logged
  if (unpaidLeaves > 0 && emergencyLeavesUsed === 0 && emergencyLeaveAllowed > 0) {
    emergencyLeavesUsed = 1;
    unpaidLeaves -= 1;
  }

  // Total paid days before cap
  const totalPaidDaysUnits = workedDays + paidSundays + paidHolidays + emergencyLeavesUsed;

  // Cap total paid units at 30 days for 30-day salary basis
  const cappedPaidUnits = Math.min(30, totalPaidDaysUnits);

  // Deducted days from 30-day standard
  const deductedDays = Math.max(0, 30 - cappedPaidUnits);
  const salaryDeductionAmount = Math.round(deductedDays * dailyRate);

  let earnedSalary = Math.round(cappedPaidUnits * dailyRate);

  // If staff completed full attendance/payable units, set to full monthly base salary
  if (cappedPaidUnits >= 30) {
    earnedSalary = monthlySalary;
  } else if (deductedDays > 0) {
    earnedSalary = Math.max(0, monthlySalary - salaryDeductionAmount);
  }

  const grossSalary = earnedSalary;
  const netSalaryBeforeExpenses = Math.max(0, grossSalary - advanceDeduction);
  const finalTotalPayable = netSalaryBeforeExpenses + approvedExpensesTotal;

  return {
    userId,
    month,
    monthlyBaseSalary: monthlySalary,
    dailyRate,
    daysInMonth,
    workedDays,
    paidSundays,
    paidHolidays,
    emergencyLeavesUsed,
    unpaidLeaves,
    deductedDays,
    salaryDeductionAmount,
    earnedSalary,
    expenseReimbursements: approvedExpensesTotal,
    finalTotalPayable,

    // Aliases for UI Components & SalaryPage
    baseSalary: monthlySalary,
    totalDaysInMonth: daysInMonth,
    presentDays: workedDays,
    sundaysCount: paidSundays,
    paidHolidaysCount: paidHolidays,
    emergencyLeaveCount: emergencyLeavesUsed,
    absentDays: deductedDays,
    totalPayableDays: cappedPaidUnits,
    grossSalary,
    absentDeduction: salaryDeductionAmount,
    advanceDeduction,
    netSalary: finalTotalPayable,
  };
}

export const calculateMonthlySalary = calculateSalaryBreakdown;
