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
 * 2. 30-day salary basis structure (Max base payable days = 30).
 * 3. Maximum 4 Paid Sundays per month.
 *    - First 4 Sundays are paid.
 *    - 5th Sunday (if any) is NEUTRAL (0 pay addition, 0 deduction, outside 30-day basis).
 * 4. Configured company holidays are paid (no double counting on Sundays).
 * 5. 1 Emergency Leave per month is paid (0 deduction).
 * 6. 31st calendar day is NEUTRAL for salary calculation (0 pay addition, 0 deduction).
 * 7. Unpaid absence deducts dailyRate per day from 30-day salary basis.
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

  // 1. Identify all Sundays in the month deterministically by calendar date
  const sundayDates: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, monthIdx, day);
    if (dateObj.getDay() === 0) {
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      sundayDates.push(dateStr);
    }
  }

  // Maximum 4 Sundays are paid (first 4 chronologically)
  const paidSundaySet = new Set(sundayDates.slice(0, 4));
  const fifthSundaySet = new Set(sundayDates.slice(4));

  const fifthSundayCount = fifthSundaySet.size;
  const isFifthSundayNeutral = fifthSundayCount > 0;

  // Create attendance lookup by date (YYYY-MM-DD)
  const attendanceMap = new Map<string, AttendanceRecord>();
  if (Array.isArray(attendanceRecords)) {
    attendanceRecords.forEach((att) => {
      if (att && att.date && att.date.startsWith(month)) {
        attendanceMap.set(att.date, att);
      }
    });
  }

  // Create holiday lookup by date (avoid double counting with Sundays)
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
  let neutralDaysCount = 0;
  let has31stNeutralDay = false;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isPaidSunday = paidSundaySet.has(dateStr);
    const isFifthSunday = fifthSundaySet.has(dateStr);
    const isCompanyHoliday = holidaySet.has(dateStr);
    const attendance = attendanceMap.get(dateStr);

    const isWorkedDay = attendance && (
      attendance.status === 'present' ||
      attendance.status === 'on_duty' ||
      attendance.status === 'completed' ||
      attendance.status === 'auto_closed' ||
      attendance.isAutoClosed === true ||
      attendance.attendanceType === 'MANUAL' ||
      Boolean(attendance.checkIn)
    );

    // Rule for 5th Sunday: Neutral (0 pay addition, 0 deduction)
    if (isFifthSunday) {
      neutralDaysCount++;
      continue;
    }

    // Rule for 31st Calendar Day:
    // Neutral for 30-day salary model calculation (0 pay addition, 0 deduction)
    if (day === 31) {
      has31stNeutralDay = true;
      neutralDaysCount++;
      continue;
    }

    if (isWorkedDay) {
      workedDays++;
    } else if (attendance && attendance.status === 'paid_leave') {
      if (emergencyLeavesUsed < emergencyLeaveAllowed) {
        emergencyLeavesUsed++;
      } else {
        unpaidLeaves++;
      }
    } else if (isPaidSunday) {
      paidSundays++;
    } else if (isCompanyHoliday) {
      paidHolidays++;
    } else {
      // Absent on standard working day
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

  // Deducted days from 30-day standard basis
  const deductedDays = Math.max(0, 30 - cappedPaidUnits);
  const salaryDeductionAmount = Math.round(deductedDays * dailyRate);

  let earnedSalary = Math.round(cappedPaidUnits * dailyRate);

  // If staff completed full attendance/payable units (30), set to exact monthly base salary
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

    fifthSundayCount,
    isFifthSundayNeutral,
    has31stNeutralDay,
    neutralDaysCount,

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
