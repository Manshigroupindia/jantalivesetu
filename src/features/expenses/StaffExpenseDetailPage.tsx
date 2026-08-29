import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { GoogleMapsButton } from '../../components/common/GoogleMapsButton';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { ExpenseItem, AttendanceRecord, StaffProfile } from '../../types';
import { getStaffProfileById, updateExpenseStatus } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useSecurity } from '../../contexts/SecurityContext';
import { useNotification } from '../../contexts/NotificationContext';
import { formatINR } from '../../utils/formatters';
import { getCurrentMonthKey } from '../../utils/dateUtils';
import { where } from 'firebase/firestore';
import { ArrowLeft, Receipt, Clock, FileText, User } from 'lucide-react';

export const StaffExpenseDetailPage: React.FC = () => {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate = useNavigate();
  const { userDoc } = useAuth();
  const { isDirector } = usePermissions();
  const { requirePinVerification } = useSecurity();
  const { showToast, showPrompt } = useNotification();

  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [activeTab, setActiveTab] = useState<'expenses' | 'attendance'>('expenses');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey()); // YYYY-MM
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);

  useEffect(() => {
    if (!staffId) return;
    setLoadingStaff(true);
    getStaffProfileById(staffId)
      .then((data) => setStaff(data))
      .catch((err) => console.error('Failed to load staff detail profile:', err))
      .finally(() => setLoadingStaff(false));
  }, [staffId]);

  // Realtime Expenses for this staff
  const expenseConstraints = staffId ? [where('userId', '==', staffId)] : [];
  const { data: rawExpenses, loading: loadingExpenses } = useRealtimeCollection<ExpenseItem>('expenses', expenseConstraints);

  // Realtime Attendance for this staff
  const attendanceConstraints = staffId ? [where('userId', '==', staffId)] : [];
  const { data: rawAttendance, loading: loadingAttendance } = useRealtimeCollection<AttendanceRecord>('attendance', attendanceConstraints);

  // Filter Expenses by selected month
  const monthlyExpenses = rawExpenses.filter((e) => e.date && e.date.startsWith(selectedMonth));
  const monthTotalExpense = monthlyExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const monthPaidExpense = monthlyExpenses.filter((e) => e.status === 'paid').reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const monthPendingExpense = monthlyExpenses.filter((e) => e.status === 'pending' || e.status === 'approved').reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const allTimeTotalExpense = rawExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Filter Attendance by selected month
  const monthlyAttendance = rawAttendance.filter((a) => a.date && a.date.startsWith(selectedMonth));
  const totalWorkingDays = monthlyAttendance.length;
  const presentDays = monthlyAttendance.filter((a) => a.status === 'completed' || a.status === 'present' || a.status === 'on_duty').length;
  const autoClosedDays = monthlyAttendance.filter((a) => a.status === 'auto_closed' || a.isAutoClosed).length;
  const manualDays = monthlyAttendance.filter((a) => a.attendanceType === 'MANUAL').length;
  const totalMinutesWorked = monthlyAttendance.reduce((acc, curr) => acc + (curr.totalMinutes || 0), 0);
  const totalHoursWorked = (totalMinutesWorked / 60).toFixed(1);

  // Month options generator (Last 12 months)
  const monthOptions = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    return { value: `${yyyy}-${mm}`, label };
  });

  const handleApproveExpense = (expId: string) => {
    requirePinVerification('Approve Expense Reimbursement Claim', async () => {
      try {
        await updateExpenseStatus(expId, 'approved', userDoc?.uid, 'Approved by Director');
        setSelectedExpense(null);
        showToast('Expense approved successfully.', 'success');
      } catch (err) {
        showToast('Failed to approve expense.', 'error');
      }
    });
  };

  const handleMarkPaid = (expId: string) => {
    requirePinVerification('Payout Expense Reimbursement', async () => {
      try {
        await updateExpenseStatus(expId, 'paid', userDoc?.uid, 'Payout Processed');
        setSelectedExpense(null);
        showToast('Expense marked as Paid.', 'success');
      } catch (err) {
        showToast('Failed to update payment status.', 'error');
      }
    });
  };

  const handleRejectExpense = (expId: string) => {
    showPrompt({
      title: 'Reject Expense Claim',
      message: 'Please provide a clear reason for rejecting this reimbursement claim:',
      placeholder: 'e.g. Missing valid tax invoice receipt',
      confirmText: 'Reject Claim',
      onConfirm: async (reason: string) => {
        if (!reason.trim()) {
          showToast('Rejection reason cannot be empty.', 'warning');
          return;
        }
        try {
          await updateExpenseStatus(expId, 'rejected', userDoc?.uid, reason.trim());
          setSelectedExpense(null);
          showToast('Expense rejected.', 'success');
        } catch (err) {
          showToast('Failed to reject expense.', 'error');
        }
      },
    });
  };

  if (loadingStaff) {
    return <p className="text-xs text-gray-400 animate-pulse text-center py-12">Loading staff profile...</p>;
  }

  return (
    <div className="space-y-6">
      {/* HEADER & NAV BACK */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/expenses')}>
          Back to Expenses
        </Button>
        <div className="w-48">
          <Select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            options={monthOptions}
          />
        </div>
      </div>

      {/* STAFF PROFILE BANNER */}
      <Card className="p-6 bg-gradient-to-r from-gray-900 via-gray-800 to-brand-950 text-white rounded-3xl shadow-xl">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {staff?.photoUrl ? (
            <img
              src={staff.photoUrl}
              alt={staff.fullName}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-white/20 shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-2xl font-black shadow-md">
              <User className="w-10 h-10" />
            </div>
          )}

          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-black tracking-tight">{staff?.fullName || 'Staff Member'}</h1>
              <Badge variant="brand" size="sm">
                {staff?.designation || 'Staff'}
              </Badge>
            </div>
            <p className="text-xs text-gray-300 font-medium">
              ID: <span className="font-mono font-bold text-amber-400">{staff?.idNumber || staffId}</span> • Area: {staff?.workingArea || 'Head Office'}
            </p>
            <p className="text-[11px] text-gray-400">
              Email: {staff?.email} • Contact: {staff?.contactNumber}
            </p>
          </div>
        </div>
      </Card>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'expenses'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Expense History ({monthlyExpenses.length})
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'attendance'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          Attendance History ({monthlyAttendance.length})
        </button>
      </div>

      {/* TAB 1: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* EXPENSE SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-brand-50/50 border-brand-100 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">This Month Spend</p>
              <p className="text-xl font-black text-brand-900 font-mono">{formatINR(monthTotalExpense)}</p>
            </Card>
            <Card className="p-4 bg-emerald-50/50 border-emerald-100 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Paid & Settled</p>
              <p className="text-xl font-black text-emerald-900 font-mono">{formatINR(monthPaidExpense)}</p>
            </Card>
            <Card className="p-4 bg-amber-50/50 border-amber-100 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pending Approval</p>
              <p className="text-xl font-black text-amber-900 font-mono">{formatINR(monthPendingExpense)}</p>
            </Card>
            <Card className="p-4 bg-gray-50 border-gray-100 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600">All-Time Total</p>
              <p className="text-xl font-black text-gray-900 font-mono">{formatINR(allTimeTotalExpense)}</p>
            </Card>
          </div>

          {/* EXPENSE LIST */}
          {loadingExpenses ? (
            <p className="text-xs text-gray-400 animate-pulse text-center py-8">Loading expense history...</p>
          ) : monthlyExpenses.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 text-xs italic">
              No expense records found for {staff?.fullName || 'this staff member'} in selected month.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monthlyExpenses.map((exp) => (
                <Card
                  key={exp.id}
                  hoverable
                  className="p-5 space-y-3 flex flex-col justify-between"
                  onClick={() => setSelectedExpense(exp)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="neutral" size="sm">
                        {exp.category}
                      </Badge>
                      <Badge
                        variant={
                          exp.status === 'paid'
                            ? 'success'
                            : exp.status === 'approved'
                            ? 'info'
                            : exp.status === 'pending'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {exp.status.toUpperCase()}
                      </Badge>
                    </div>

                    <h3 className="text-base font-extrabold text-gray-900 truncate">{exp.title}</h3>
                    <p className="text-xl font-black text-brand-600 font-mono">{formatINR(exp.amount)}</p>
                    {exp.description && <p className="text-xs text-gray-500 line-clamp-2">{exp.description}</p>}
                  </div>

                  <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400 flex justify-between">
                    <span>{exp.date}</span>
                    {exp.receiptUrl && <span className="text-brand-600 font-semibold underline">Receipt Attached</span>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* ATTENDANCE SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="p-3.5 bg-gray-50 border-gray-100 text-center space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Shifts</p>
              <p className="text-lg font-black text-gray-900">{totalWorkingDays}</p>
            </Card>
            <Card className="p-3.5 bg-emerald-50/60 border-emerald-100 text-center space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Completed</p>
              <p className="text-lg font-black text-emerald-900">{presentDays}</p>
            </Card>
            <Card className="p-3.5 bg-amber-50/60 border-amber-100 text-center space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Auto Closed</p>
              <p className="text-lg font-black text-amber-900">{autoClosedDays}</p>
            </Card>
            <Card className="p-3.5 bg-purple-50/60 border-purple-100 text-center space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Manual Added</p>
              <p className="text-lg font-black text-purple-900">{manualDays}</p>
            </Card>
            <Card className="p-3.5 bg-blue-50/60 border-blue-100 text-center space-y-0.5 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Total Hours</p>
              <p className="text-lg font-black text-blue-900">{totalHoursWorked} hrs</p>
            </Card>
          </div>

          {/* ATTENDANCE LOGS TABLE */}
          {loadingAttendance ? (
            <p className="text-xs text-gray-400 animate-pulse text-center py-8">Loading attendance history...</p>
          ) : monthlyAttendance.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 text-xs italic">
              No attendance logs recorded for {staff?.fullName || 'this staff member'} in selected month.
            </Card>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Duty On</th>
                      <th className="py-3 px-4">Duty Off</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Status & Type</th>
                      <th className="py-3 px-4 text-center">GPS Locations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthlyAttendance.map((log) => {
                      const isAutoClosed = log.status === 'auto_closed' || log.isAutoClosed;
                      const isManual = log.attendanceType === 'MANUAL';

                      return (
                        <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{log.date}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">{log.checkIn}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-700">
                            {log.checkOut || <span className="text-amber-600 text-[11px]">Active Shift</span>}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-gray-800">
                            {log.totalMinutes > 0
                              ? `${Math.floor(log.totalMinutes / 60)}h ${log.totalMinutes % 60}m`
                              : '—'}
                          </td>
                          <td className="py-3.5 px-4 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isAutoClosed ? (
                                <Badge variant="warning" size="sm">
                                  AUTO CLOSED
                                </Badge>
                              ) : isManual ? (
                                <Badge variant="brand" size="sm" className="bg-purple-100 text-purple-800 border-purple-200">
                                  MANUALLY ADDED
                                </Badge>
                              ) : (
                                <Badge variant="success" size="sm">
                                  COMPLETED
                                </Badge>
                              )}
                            </div>
                            {isManual && log.manualReason && (
                              <p className="text-[10px] text-purple-700 italic">Reason: {log.manualReason}</p>
                            )}
                            {isManual && log.createdByName && (
                              <p className="text-[10px] text-gray-400">Added by: {log.createdByName}</p>
                            )}
                            {isAutoClosed && (
                              <p className="text-[10px] text-amber-700 font-medium">Automatic Closed at 9:00 PM</p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isAutoClosed ? (
                              <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                Automatic Closed
                              </span>
                            ) : (
                              <div className="flex flex-col sm:flex-row gap-1 justify-center items-center">
                                {log.checkInLocation && (log.checkInLocation.latitude !== 0 || log.checkInLocation.longitude !== 0) ? (
                                  <GoogleMapsButton
                                    latitude={log.checkInLocation.latitude}
                                    longitude={log.checkInLocation.longitude}
                                    label="Check-In Map"
                                  />
                                ) : (
                                  <span className="text-[10px] text-gray-400">Manual Loc</span>
                                )}
                                {log.checkOutLocation && (log.checkOutLocation.latitude !== 0 || log.checkOutLocation.longitude !== 0) && (
                                  <GoogleMapsButton
                                    latitude={log.checkOutLocation.latitude}
                                    longitude={log.checkOutLocation.longitude}
                                    label="Check-Out Map"
                                  />
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* EXPENSE DETAIL MODAL */}
      {selectedExpense && (
        <Modal isOpen={!!selectedExpense} onClose={() => setSelectedExpense(null)} title="Expense Reimbursement Record">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Badge variant="neutral">{selectedExpense.category}</Badge>
              <Badge variant="brand">{selectedExpense.status.toUpperCase()}</Badge>
            </div>

            <h3 className="text-lg font-extrabold text-gray-900">{selectedExpense.title}</h3>
            <p className="text-2xl font-black text-brand-600 font-mono">{formatINR(selectedExpense.amount)}</p>
            {selectedExpense.description && (
              <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border">{selectedExpense.description}</p>
            )}

            {selectedExpense.receiptUrl && (
              <a
                href={selectedExpense.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 underline"
              >
                <FileText className="w-4 h-4" /> View Attached Receipt Document
              </a>
            )}

            {isDirector && selectedExpense.status === 'pending' && (
              <div className="flex gap-2 pt-3 border-t">
                <Button variant="danger" size="sm" className="w-1/2" onClick={() => handleRejectExpense(selectedExpense.id)}>
                  Reject Claim
                </Button>
                <Button variant="primary" size="sm" className="w-1/2 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApproveExpense(selectedExpense.id)}>
                  Approve Claim (PIN)
                </Button>
              </div>
            )}

            {isDirector && selectedExpense.status === 'approved' && (
              <Button variant="primary" size="sm" className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => handleMarkPaid(selectedExpense.id)}>
                Mark as Paid & Disburse (PIN)
              </Button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
