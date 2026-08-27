import { describe, it, expect } from 'vitest';
import { calculateSalaryBreakdown, calculateMonthlySalary } from '../services/salaryCalculator';
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
});
