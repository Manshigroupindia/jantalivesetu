import { SalaryCalculationResult, AttendanceRecord, CompanyHoliday } from '../types';
import { isHalfDayCheckIn } from '../utils/dateUtils';

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
 * Resolves attendance status and payable day fraction (1.0 for Full Day, 0.5 for Half Day, 0 for Absent).
 * Applies the 2:00 PM cutoff rule to both NEW and EXISTING attendance records!
 */
export function getAttendanceStatusAndFraction(att?: AttendanceRecord): { status: 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'SUNDAY' | 'COVERED_LEAVE'; fraction: number } {
  if (!att) {
    return { status: 'ABSENT', fraction: 0 };
  }

  if (att.status === 'covered_leave' || Boolean(att.coveredBySundayDate)) {
    return { status: 'COVERED_LEAVE', fraction: 1 };
  }

  if (att.status === 'sunday') {
    if (att.workType === 'SUNDAY_WORK' || (att.checkIn && att.workType !== 'LEAVE_COVER')) {
      const isHalf = att.checkIn ? isHalfDayCheckIn(att.checkIn) : false;
      return { status: isHalf ? 'HALF_DAY' : 'PRESENT', fraction: isHalf ? 0.5 : 1 };
    }
    return { status: 'SUNDAY', fraction: 0 };
  }

  if (att.status === 'absent') {
    return { status: 'ABSENT', fraction: 0 };
  }

  if (att.payableFraction !== undefined && att.payableFraction !== null) {
    if (att.payableFraction === 0) return { status: 'ABSENT', fraction: 0 };
    if (att.payableFraction === 0.5) return { status: 'HALF_DAY', fraction: 0.5 };
    if (att.payableFraction === 1) return { status: 'PRESENT', fraction: 1 };
  }

  if (att.status === 'half_day') {
    return { status: 'HALF_DAY', fraction: 0.5 };
  }

  // 2:00 PM Check-in Cutoff Rule: > 14:00 is HALF DAY for BOTH new & existing records
  if (att.checkIn && isHalfDayCheckIn(att.checkIn)) {
    return { status: 'HALF_DAY', fraction: 0.5 };
  }

  const isWorkedDay =
    att.status === 'present' ||
    att.status === 'on_duty' ||
    att.status === 'completed' ||
    att.status === 'auto_closed' ||
    att.isAutoClosed === true ||
    att.attendanceType === 'MANUAL' ||
    Boolean(att.checkIn);

  if (isWorkedDay) {
    return { status: 'PRESENT', fraction: 1 };
  }

  return { status: 'ABSENT', fraction: 0 };
}

/**
 * Deterministic Central Salary Calculation Engine for Janta Live Setu
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

  // Identify all covered leave dates
  const coveredLeaveSet = new Set<string>();
  attendanceMap.forEach((att) => {
    if (att.status === 'covered_leave' || att.coveredBySundayDate) {
      coveredLeaveSet.add(att.date);
    }
    if (att.coveredLeaveDate) {
      coveredLeaveSet.add(att.coveredLeaveDate);
    }
  });

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

  let fullDaysCount = 0;
  let halfDaysCount = 0;
  let workedDaysUnits = 0;
  let paidSundays = 0;
  let workedSundaysCount = 0;
  let sundayBasePayTotal = 0;
  let sundayWorkPayTotal = 0;
  let sundayLeaveCoverCount = 0;
  let paidHolidays = 0;
  let emergencyLeavesUsed = 0;
  let unpaidLeaves = 0;
  let neutralDaysCount = 0;
  let has31stNeutralDay = false;
  let coveredLeavesUnits = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isPaidSunday = paidSundaySet.has(dateStr);
    const isFifthSunday = fifthSundaySet.has(dateStr);
    const isCompanyHoliday = holidaySet.has(dateStr);
    const attendance = attendanceMap.get(dateStr);

    // Rule for 31st Calendar Day: Neutral (0 pay addition, 0 deduction)
    if (day === 31) {
      has31stNeutralDay = true;
      neutralDaysCount++;
      continue;
    }

    // Process Sunday
    if (dateStr && (new Date(year, monthIdx, day).getDay() === 0)) {
      if (isPaidSunday) {
        paidSundays++;
        sundayBasePayTotal += dailyRate;
      } else if (isFifthSunday) {
        neutralDaysCount++;
      }

      if (attendance) {
        const isWorkedSunday =
          attendance.workType === 'SUNDAY_WORK' ||
          attendance.workType === 'LEAVE_COVER' ||
          attendance.isSundayWorked === true ||
          Boolean(attendance.checkIn);

        if (isWorkedSunday) {
          workedSundaysCount++;
          if (attendance.workType === 'LEAVE_COVER' || attendance.isLeaveCover) {
            sundayLeaveCoverCount++;
          } else {
            // Sunday Work Pay: Full day = 1.0x dailyRate, Half day = 0.5x dailyRate
            const isHalf = attendance.checkIn ? isHalfDayCheckIn(attendance.checkIn) : (attendance.payableFraction === 0.5);
            const multiplier = isHalf ? 0.5 : 1.0;
            sundayWorkPayTotal += Math.round(multiplier * dailyRate);
          }
        }
      }
      continue;
    }

    // Process Non-Sunday dates
    if (coveredLeaveSet.has(dateStr) || attendance?.status === 'covered_leave' || attendance?.coveredBySundayDate) {
      coveredLeavesUnits += 1;
      continue;
    }

    const { status: attStatus, fraction } = getAttendanceStatusAndFraction(attendance);

    if (fraction === 1) {
      fullDaysCount++;
      workedDaysUnits += 1;
    } else if (fraction === 0.5) {
      halfDaysCount++;
      workedDaysUnits += 0.5;
    } else if (attendance && attendance.status === 'paid_leave') {
      if (emergencyLeavesUsed < emergencyLeaveAllowed) {
        emergencyLeavesUsed++;
      } else {
        unpaidLeaves++;
      }
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
  const totalPaidDaysUnits = workedDaysUnits + paidSundays + paidHolidays + emergencyLeavesUsed + coveredLeavesUnits;

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

  // Gross Salary includes Base Earned Salary PLUS Sunday Work Bonus Pay!
  const grossSalary = earnedSalary + sundayWorkPayTotal;
  const netSalaryBeforeExpenses = Math.max(0, grossSalary - advanceDeduction);
  const finalTotalPayable = netSalaryBeforeExpenses + approvedExpensesTotal;

  const fullDayPayAmount = Math.round(fullDaysCount * dailyRate);
  const halfDayPayAmount = Math.round(halfDaysCount * (dailyRate / 2));

  return {
    userId,
    month,
    monthlyBaseSalary: monthlySalary,
    dailyRate,
    daysInMonth,
    workedDays: workedDaysUnits,
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

    workedSundaysCount,
    sundayBasePay: Math.round(sundayBasePayTotal),
    sundayWorkPay: Math.round(sundayWorkPayTotal),
    sundayLeaveCoverCount,
    sundayLeaveCoverValue: Math.round(coveredLeavesUnits * dailyRate),

    // Detailed breakdown & aliases for UI Components & SalaryPage
    baseSalary: monthlySalary,
    totalDaysInMonth: daysInMonth,
    presentDays: workedDaysUnits,
    fullDaysCount,
    fullDayPayAmount,
    halfDaysCount,
    halfDayPayAmount,
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
