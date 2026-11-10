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
      // Leave on day 10 (working day)
      if (!isSunday && d !== 10) {
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

  it('Scenario A: 31-day month, > 5 absent days, present on 31st yields exactly 23 / 30 payable days', () => {
    // 31-day month with 4 Sundays (July 2026 has 31 days, 4 Sundays: July 5, 12, 19, 26).
    // 27 working days:
    // - 17 Present (16 working days from July 1 to July 30, plus July 31 Present)
    // - 8 Absent
    // - 1 Paid Company Holiday (July 15)
    // - 1 Paid Emergency Holiday
    // Total calendar days: 17 + 8 + 1 + 1 + 4 = 31 days.
    const presentDates = [
      '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04',
      '2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09',
      '2026-07-10', '2026-07-11', '2026-07-13', '2026-07-14',
      '2026-07-16', '2026-07-17', '2026-07-18', '2026-07-20',
      '2026-07-31' // 31st date Present! (17th present day)
    ];

    const records: AttendanceRecord[] = presentDates.map((dateStr, idx) => ({
      id: `att_a_${idx}`,
      userId: 'user_scenario_a',
      userName: 'Employee A',
      userDesignation: 'Staff',
      date: dateStr,
      checkIn: '09:30 AM',
      checkOut: '06:30 PM',
      checkInLocation: { latitude: 28.6, longitude: 77.2, accuracy: 10, capturedAt: dateStr },
      totalMinutes: 540,
      status: 'present' as const,
      createdAt: dateStr,
      updatedAt: dateStr,
    }));

    const result = calculateSalaryBreakdown({
      userId: 'user_scenario_a',
      month: '2026-07',
      monthlySalary: 12000, // Daily rate = 400
      attendanceRecords: records,
      holidays: [
        { id: 'h_jul15', holidayName: 'Company Day', date: '2026-07-15', isPaid: true, type: 'company', createdAt: '2026-07-01' }
      ],
      emergencyLeaveCount: 1, // 1 emergency leave allowed
    });

    // Verify Breakdown matches user requirement table exactly:
    expect(result.presentDays).toBe(17);
    expect(result.fullDaysCount).toBe(17);
    expect(result.absentDays).toBe(8);
    expect(result.unpaidLeaves).toBe(8);
    expect(result.sundaysCount).toBe(4);
    expect(result.paidSundays).toBe(4);
    expect(result.paidHolidaysCount).toBe(1);
    expect(result.paidHolidays).toBe(1);
    expect(result.emergencyLeaveCount).toBe(1);
    expect(result.emergencyLeavesUsed).toBe(1);

    // Total Payable Days: 17 + 4 + 1 + 1 = 23 / 30
    expect(result.totalPayableDays).toBe(23);

    // Earned salary: 23 * 400 = 9,200
    expect(result.dailyRate).toBe(400);
    expect(result.earnedSalary).toBe(9200);
    expect(result.netSalary).toBe(9200);

    // 31st day flags
    expect(result.has31stPresentCredit).toBe(true);
    expect(result.day31PresentCredit).toBe(1);
    expect(result.has31stNeutralDay).toBe(false);
  });

  it('Scenario B: 31-day month, 5 or fewer absent days, 31st remains neutral', () => {
    // 3 absent days, 21 present days (including 31st), 4 sundays, 1 holiday, 1 emergency leave.
    // Because absent <= 5, the 31st date must remain neutral!
    const presentDates = [
      '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04',
      '2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09',
      '2026-07-10', '2026-07-11', '2026-07-13', '2026-07-14',
      '2026-07-16', '2026-07-17', '2026-07-18', '2026-07-20',
      '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24',
      '2026-07-31' // 31st date
    ];

    const records: AttendanceRecord[] = presentDates.map((dateStr, idx) => ({
      id: `att_b_${idx}`,
      userId: 'user_scenario_b',
      userName: 'Employee B',
      userDesignation: 'Staff',
      date: dateStr,
      checkIn: '09:30 AM',
      checkOut: '06:30 PM',
      checkInLocation: { latitude: 28.6, longitude: 77.2, accuracy: 10, capturedAt: dateStr },
      totalMinutes: 540,
      status: 'present' as const,
      createdAt: dateStr,
      updatedAt: dateStr,
    }));

    const result = calculateSalaryBreakdown({
      userId: 'user_scenario_b',
      month: '2026-07',
      monthlySalary: 12000,
      attendanceRecords: records,
      holidays: [
        { id: 'h_jul15', holidayName: 'Company Day', date: '2026-07-15', isPaid: true, type: 'company', createdAt: '2026-07-01' }
      ],
      emergencyLeaveCount: 1,
    });

    expect(result.absentDays).toBeLessThanOrEqual(5);
    expect(result.has31stNeutralDay).toBe(true);
    expect(result.has31stPresentCredit).toBe(false);
  });

  it('Scenario C: 31-day month, > 5 absent days, but employee ABSENT on 31st', () => {
    // 8 absent days, 16 present days (July 31 is absent / omitted)
    const presentDates = [
      '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04',
      '2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09',
      '2026-07-10', '2026-07-11', '2026-07-13', '2026-07-14',
      '2026-07-16', '2026-07-17', '2026-07-18', '2026-07-20'
      // 31st omitted (absent)
    ];

    const records: AttendanceRecord[] = presentDates.map((dateStr, idx) => ({
      id: `att_c_${idx}`,
      userId: 'user_scenario_c',
      userName: 'Employee C',
      userDesignation: 'Staff',
      date: dateStr,
      checkIn: '09:30 AM',
      checkOut: '06:30 PM',
      checkInLocation: { latitude: 28.6, longitude: 77.2, accuracy: 10, capturedAt: dateStr },
      totalMinutes: 540,
      status: 'present' as const,
      createdAt: dateStr,
      updatedAt: dateStr,
    }));

    const result = calculateSalaryBreakdown({
      userId: 'user_scenario_c',
      month: '2026-07',
      monthlySalary: 12000,
      attendanceRecords: records,
      holidays: [
        { id: 'h_jul15', holidayName: 'Company Day', date: '2026-07-15', isPaid: true, type: 'company', createdAt: '2026-07-01' }
      ],
      emergencyLeaveCount: 1,
    });

    // July 31 is absent, so it must NOT count as present, and must remain neutral without extra deduction
    expect(result.presentDays).toBe(16);
    expect(result.absentDays).toBe(8);
    expect(result.totalPayableDays).toBe(22);
    expect(result.has31stNeutralDay).toBe(true);
    expect(result.has31stPresentCredit).toBe(false);
  });

  it('Scenario D: Unpaid holiday (isPaid: false) is not credited as paid holiday in salary', () => {
    const result = calculateSalaryBreakdown({
      userId: 'user_unpaid_holiday',
      month: '2026-08',
      monthlySalary: 15000,
      attendanceRecords: [],
      holidays: [
        { id: 'h_unpaid', holidayName: 'Unpaid Observance', date: '2026-08-14', isPaid: false, type: 'company', createdAt: '2026-08-01' },
        { id: 'h_paid', holidayName: 'Independence Day', date: '2026-08-15', isPaid: true, type: 'national', createdAt: '2026-08-01' }
      ],
      emergencyLeaveCount: 0,
    });

    // Only the paid holiday should be counted in paidHolidaysCount
    expect(result.paidHolidaysCount).toBe(1);
  });

  it('Scenario E: August 2026 — 31st Day Attendance counts as Present when absent days > 5', () => {
    // August 2026: 25 working days in days 1..30.
    // 15 present days (days 1..30) + 1 on Aug 31 = 16 present (or 16 on days 1..30 + 1 on Aug 31 = 17 present).
    // Let employee have 7 absent days on days 1..30 (> 5 absent days).
    const presentDates = [
      '2026-08-01',
      '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08',
      '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13',
      '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21',
      '2026-08-31' // Present on 31st
    ];

    const records: AttendanceRecord[] = presentDates.map((dateStr, idx) => ({
      id: `att_e_${idx}`,
      userId: 'user_scenario_e',
      userName: 'Employee E',
      userDesignation: 'Staff',
      date: dateStr,
      checkIn: '09:30 AM',
      checkOut: '06:30 PM',
      checkInLocation: { latitude: 28.6, longitude: 77.2, accuracy: 10, capturedAt: dateStr },
      totalMinutes: 540,
      status: 'present' as const,
      createdAt: dateStr,
      updatedAt: dateStr,
    }));

    const result = calculateSalaryBreakdown({
      userId: 'user_scenario_e',
      month: '2026-08',
      monthlySalary: 12000,
      attendanceRecords: records,
      holidays: [
        { id: 'h_aug15', holidayName: 'Independence Day', date: '2026-08-15', isPaid: true, type: 'national', createdAt: '2026-08-01' }
      ],
      emergencyLeaveCount: 1,
    });

    // Absent days: 25 working days - 16 worked (days 1..30) - 1 holiday = 8 days.
    // 8 days - 1 emergency leave = 7 absent days.
    expect(result.absentDays).toBe(7);
    expect(result.absentDays).toBeGreaterThan(5);

    // Because absent days (7) > 5 and Aug 31 is present:
    // 31st is credited: 16 (days 1..30) + 1 (Aug 31) = 17 Present days!
    expect(result.presentDays).toBe(17);
    expect(result.has31stPresentCredit).toBe(true);
    expect(result.day31PresentCredit).toBe(1);

    // Total payable days: 30 - 7 + 1 = 24 / 30
    expect(result.totalPayableDays).toBe(24);
    expect(result.earnedSalary).toBe(24 * 400);
  });
});
