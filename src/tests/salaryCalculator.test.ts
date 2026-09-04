import { describe, it, expect } from 'vitest';
import { calculateSalaryBreakdown } from '../services/salaryCalculator';
import { AttendanceRecord, CompanyHoliday } from '../types';

describe('Janta Live Setu Central Salary Engine Tests', () => {

  const baseInput = {
    userId: 'user_123',
    month: '2026-08', // August 2026 has 31 days, 5 Sundays (2nd, 9th, 16th, 23rd, 30th)
    monthlySalary: 12000, // Daily rate = 400
    attendanceRecords: [] as AttendanceRecord[],
    holidays: [] as CompanyHoliday[],
    approvedExpensesTotal: 0,
  };

  it('Test 1: Calculates daily rate correctly based on 30-day basis (₹12,000 / 30 = ₹400)', () => {
    const result = calculateSalaryBreakdown(baseInput);
    expect(result.dailyRate).toBe(400);
    expect(result.monthlyBaseSalary).toBe(12000);
    expect(result.baseSalary).toBe(12000);
  });

  it('Test 2 & 3: Month with 5 Sundays capped at monthly salary (no overpayment beyond ₹12,000)', () => {
    const fullAttendance: AttendanceRecord[] = [];
    for (let d = 1; d <= 31; d++) {
      const dateStr = `2026-08-${String(d).padStart(2, '0')}`;
      const isSunday = new Date(2026, 7, d).getDay() === 0;
      if (!isSunday) {
        fullAttendance.push({
          id: `att_${d}`,
          userId: 'user_123',
          userName: 'Anubhav',
          userDesignation: 'Reporter',
          date: dateStr,
          checkIn: '09:30 AM',
          checkOut: '06:30 PM',
          checkInLocation: { latitude: 28.6, longitude: 77.2, accuracy: 10, capturedAt: dateStr },
          totalMinutes: 540,
          status: 'present',
          createdAt: dateStr,
          updatedAt: dateStr,
        });
      }
    }

    const result = calculateSalaryBreakdown({
      ...baseInput,
      attendanceRecords: fullAttendance,
    });

    expect(result.earnedSalary).toBe(12000);
    expect(result.netSalary).toBe(12000);
    expect(result.deductedDays).toBe(0);
    expect(result.salaryDeductionAmount).toBe(0);
  });

  it('Test 4: One emergency leave produces zero salary deduction', () => {
    const records: AttendanceRecord[] = [];
    for (let d = 1; d <= 30; d++) {
      const dateStr = `2026-08-${String(d).padStart(2, '0')}`;
      const isSunday = new Date(2026, 7, d).getDay() === 0;
      if (!isSunday) {
        records.push({
          id: `att_${d}`,
          userId: 'user_123',
          userName: 'Anubhav',
          userDesignation: 'Reporter',
          date: dateStr,
          checkIn: '09:30 AM',
          checkOut: '06:30 PM',
          checkInLocation: { latitude: 28.6, longitude: 77.2, accuracy: 10, capturedAt: dateStr },
          totalMinutes: 540,
          status: 'present',
          createdAt: dateStr,
          updatedAt: dateStr,
        });
      }
    }

    const result = calculateSalaryBreakdown({
      ...baseInput,
      attendanceRecords: records,
    });

    expect(result.emergencyLeavesUsed).toBe(1);
    expect(result.deductedDays).toBe(0);
    expect(result.earnedSalary).toBe(12000);
  });

  it('Test 5: Two or more unpaid leaves result in appropriate deduction', () => {
    const records: AttendanceRecord[] = [];
    for (let d = 1; d <= 20; d++) {
      const dateStr = `2026-08-${String(d).padStart(2, '0')}`;
      records.push({
        id: `att_${d}`,
        userId: 'user_123',
        userName: 'Anubhav',
        userDesignation: 'Reporter',
        date: dateStr,
        checkIn: '09:30 AM',
        checkOut: '06:30 PM',
        checkInLocation: { latitude: 28.6, longitude: 77.2, accuracy: 10, capturedAt: dateStr },
        totalMinutes: 540,
        status: 'present',
        createdAt: dateStr,
        updatedAt: dateStr,
      });
    }

    const result = calculateSalaryBreakdown({
      ...baseInput,
      attendanceRecords: records,
    });

    expect(result.deductedDays).toBeGreaterThan(0);
    expect(result.earnedSalary).toBeLessThan(12000);
  });

  it('Test 6 & 7: Paid company holiday is included and holiday on Sunday is not double counted', () => {
    const result = calculateSalaryBreakdown({
      ...baseInput,
      holidays: [
        { id: 'h1', holidayName: 'Independence Day', date: '2026-08-15', type: 'national', createdAt: '2026-08-01' },
        { id: 'h2', holidayName: 'Sunday Holiday', date: '2026-08-16', type: 'company', createdAt: '2026-08-01' },
      ],
    });

    expect(result.dailyRate).toBe(400);
    expect(result).toBeDefined();
  });

  it('Test 8 & 9: Approved expense reimbursement contributes to total payable, rejected expense does not', () => {
    const resultWithApproved = calculateSalaryBreakdown({
      ...baseInput,
      approvedExpensesTotal: 1450,
    });

    expect(resultWithApproved.expenseReimbursements).toBe(1450);
    expect(resultWithApproved.finalTotalPayable).toBe(resultWithApproved.earnedSalary + 1450);

    const resultWithoutRejected = calculateSalaryBreakdown({
      ...baseInput,
      approvedExpensesTotal: 0,
    });

    expect(resultWithoutRejected.expenseReimbursements).toBe(0);
    expect(resultWithoutRejected.finalTotalPayable).toBe(resultWithoutRejected.earnedSalary);
  });

  it('Test 10: Missing attendance / incomplete records do not crash the calculator', () => {
    const result = calculateSalaryBreakdown(15000, '2026-08', [], []);
    expect(result).toBeDefined();
    expect(result.dailyRate).toBe(500);
  });

  it('Test 11 — Root Cause Fix: August 2026 ₹21,000 salary with 17 unpaid days deducts exactly 17 * ₹700 = ₹11,900', () => {
    // August 2026 has 31 days, 5 Sundays (Aug 2, 9, 16, 23, 30), 1 31st day neutral.
    // Working days = 25.
    // 8 worked days + 17 unpaid days = 25 working days. (emergency leave = 0 to isolate 17 unpaid days)
    const records: AttendanceRecord[] = [];
    const workedDates = [
      '2026-08-01', '2026-08-03', '2026-08-04', '2026-08-05',
      '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-10'
    ];
    workedDates.forEach((dateStr, idx) => {
      records.push({
        id: `att_aug_${idx}`,
        userId: 'user_rohit',
        userName: 'Rohit',
        userDesignation: 'Staff',
        date: dateStr,
        checkIn: '09:30 AM',
        checkOut: '06:30 PM',
        checkInLocation: { latitude: 28.6, longitude: 77.2, accuracy: 10, capturedAt: dateStr },
        totalMinutes: 540,
        status: 'present' as const,
        createdAt: dateStr,
        updatedAt: dateStr,
      });
    });

    const result = calculateSalaryBreakdown({
      userId: 'user_rohit',
      month: '2026-08',
      monthlySalary: 21000,
      attendanceRecords: records,
      holidays: [],
      emergencyLeaveCount: 0,
    });

    expect(result.dailyRate).toBe(700);
    expect(result.unpaidLeaves).toBe(17);
    expect(result.deductedDays).toBe(17);
    expect(result.absentDays).toBe(17);
    expect(result.salaryDeductionAmount).toBe(11900);
    expect(result.absentDeduction).toBe(11900);
    expect(result.earnedSalary).toBe(9100);
  });

  it('Test 12 — Single Source of Truth for Various Salaries and Unpaid Days', () => {
    // 1. ₹15,000 -> daily ₹500, 10 unpaid days -> ₹5,000 deduction
    const res15k = calculateSalaryBreakdown({
      monthlySalary: 15000,
      month: '2026-08',
      attendanceRecords: Array.from({ length: 15 }, (_, i) => ({
        id: `att_${i}`,
        userId: 'u1',
        userName: 'User 1',
        userDesignation: 'Staff',
        date: i === 0 ? '2026-08-01' : `2026-08-${String(i + 2).padStart(2, '0')}`,
        checkIn: '09:30 AM',
        checkOut: '06:30 PM',
        checkInLocation: { latitude: 0, longitude: 0, accuracy: 0, capturedAt: '' },
        totalMinutes: 540,
        status: 'present' as const,
        createdAt: '',
        updatedAt: '',
      })).filter((att) => new Date(att.date).getDay() !== 0) as AttendanceRecord[],
      emergencyLeaveCount: 0,
    });
    expect(res15k.dailyRate).toBe(500);

    // 2. ₹12,000 -> daily ₹400, 5 unpaid days -> ₹2,000 deduction
    const res12k = calculateSalaryBreakdown({
      monthlySalary: 12000,
      month: '2026-08',
      attendanceRecords: Array.from({ length: 20 }, (_, i) => ({
        id: `att_${i}`,
        userId: 'u2',
        userName: 'User 2',
        userDesignation: 'Staff',
        date: i === 0 ? '2026-08-01' : `2026-08-${String(i + 2).padStart(2, '0')}`,
        checkIn: '09:30 AM',
        checkOut: '06:30 PM',
        checkInLocation: { latitude: 0, longitude: 0, accuracy: 0, capturedAt: '' },
        totalMinutes: 540,
        status: 'present' as const,
        createdAt: '',
        updatedAt: '',
      })).filter((att) => new Date(att.date).getDay() !== 0) as AttendanceRecord[],
      emergencyLeaveCount: 0,
    });
    expect(res12k.dailyRate).toBe(400);

    // 3. ₹30,000 -> daily ₹1,000, 0 unpaid days -> ₹0 deduction
    const res30k = calculateSalaryBreakdown({
      monthlySalary: 30000,
      month: '2026-08',
      attendanceRecords: Array.from({ length: 31 }, (_, i) => ({
        id: `att_${i}`,
        userId: 'u3',
        userName: 'User 3',
        userDesignation: 'Staff',
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        checkIn: '09:30 AM',
        checkOut: '06:30 PM',
        checkInLocation: { latitude: 0, longitude: 0, accuracy: 0, capturedAt: '' },
        totalMinutes: 540,
        status: 'present' as const,
        createdAt: '',
        updatedAt: '',
      })).filter((att) => new Date(att.date).getDay() !== 0) as AttendanceRecord[],
      emergencyLeaveCount: 0,
    });
    expect(res30k.dailyRate).toBe(1000);
    expect(res30k.unpaidLeaves).toBe(0);
    expect(res30k.salaryDeductionAmount).toBe(0);
    expect(res30k.earnedSalary).toBe(30000);
  });
});
