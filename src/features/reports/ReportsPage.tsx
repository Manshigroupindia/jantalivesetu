import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FileBarChart, Printer, Download, Calendar, DollarSign, Clock, Receipt } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { AttendanceRecord, SalaryRecord, ExpenseItem } from '../../types';
import { formatINR } from '../../utils/formatters';

export const ReportsPage: React.FC = () => {
  const { data: attendanceList } = useRealtimeCollection<AttendanceRecord>('attendance');
  const { data: salaryRecords } = useRealtimeCollection<SalaryRecord>('salaryRecords');
  const { data: expenseItems } = useRealtimeCollection<ExpenseItem>('expenses');

  const totalExpenseSum = expenseItems.reduce((acc, curr) => acc + curr.amount, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FileBarChart className="w-7 h-7 text-brand-600" />
            Executive Reports & Analytics
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Export & print attendance logs, payroll statements, and office utility expenditure summaries.
          </p>
        </div>

        <Button variant="secondary" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
          Print Summary Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
            <span>Total Logged Attendance Shifts</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">{attendanceList.length}</p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
            <span>Finalized Salary Slips</span>
            <DollarSign className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">{salaryRecords.length}</p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
            <span>Total Expense Claims</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-gray-900">{formatINR(totalExpenseSum)}</p>
        </Card>
      </div>
    </div>
  );
};
