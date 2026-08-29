import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { FileUploader } from '../../components/common/FileUploader';
import { Receipt, Plus, Search, FileText, ArrowRight, User, Users, Calendar } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { ExpenseItem, StaffProfile } from '../../types';
import { createExpenseItem, updateExpenseStatus } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useSecurity } from '../../contexts/SecurityContext';
import { useNotification } from '../../contexts/NotificationContext';
import { formatINR } from '../../utils/formatters';
import { getCurrentDateISO, getCurrentMonthKey } from '../../utils/dateUtils';
import { where } from 'firebase/firestore';
import { useActiveStaff } from '../../hooks/useActiveStaff';

export const ExpensesPage: React.FC = () => {
  const navigate = useNavigate();
  const { userDoc, staffProfile } = useAuth();
  const { isDirector, isAdmin } = usePermissions();
  const canViewAll = isDirector || isAdmin;
  const { requirePinVerification } = useSecurity();
  const { showToast, showPrompt } = useNotification();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey()); // YYYY-MM

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Travel & Reporting');
  const [amount, setAmount] = useState<number>(500);
  const [date, setDate] = useState(getCurrentDateISO());
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Firestore Expense Query Constraint
  const expenseConstraints = canViewAll
    ? []
    : [where('userId', '==', userDoc?.uid || 'none')];

  const { data: rawExpenses, loading: loadingExpenses } = useRealtimeCollection<ExpenseItem>('expenses', expenseConstraints);
  const { activeStaffList, loading: loadingStaff } = useActiveStaff();

  // Sorted Expenses
  const expenses = [...rawExpenses].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  // Month-filtered Expenses
  const monthlyExpenses = expenses.filter((e) => e.date && e.date.startsWith(selectedMonth));

  // Overall Totals for Selected Month
  const overallMonthlyTotal = monthlyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const overallPaidTotal = monthlyExpenses.filter((e) => e.status === 'paid').reduce((sum, e) => sum + (e.amount || 0), 0);
  const overallPendingTotal = monthlyExpenses.filter((e) => e.status === 'pending' || e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0);

  // Staff Personal Totals for Selected Month (if normal staff)
  const myMonthlyExpenses = monthlyExpenses.filter((e) => e.userId === userDoc?.uid);
  const myMonthlyTotal = myMonthlyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const myPaidTotal = myMonthlyExpenses.filter((e) => e.status === 'paid').reduce((sum, e) => sum + (e.amount || 0), 0);
  const myPendingTotal = myMonthlyExpenses.filter((e) => e.status === 'pending' || e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0);

  // Month selector options
  const monthOptions = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    return { value: `${yyyy}-${mm}`, label };
  });

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;

    if (!title || amount <= 0) {
      setError('Please provide a valid title and expense amount.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createExpenseItem({
        userId: userDoc.uid,
        userName: staffProfile?.fullName || userDoc.name || 'Staff',
        userDesignation: staffProfile?.designation || userDoc.role,
        title,
        category: category as any,
        amount,
        date,
        description,
        receiptUrl,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setCreateModalOpen(false);
      setTitle('');
      setAmount(500);
      setDescription('');
      setReceiptUrl('');
      showToast('Expense reimbursement claim submitted successfully.', 'success');
    } catch (err: any) {
      console.error('Expense submission error:', err);
      setError('Failed to submit expense claim.');
    } finally {
      setSubmitting(false);
    }
  };

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

  const filteredExpenses = monthlyExpenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-7 h-7 text-brand-600" />
            {isDirector ? 'Company Expense Management' : 'My Expense Reimbursements'}
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            {isDirector
              ? 'Real-time staff expense tracking, staff-wise breakdown, and reimbursement approvals.'
              : 'Submit and track field reporting and operational expense claims.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-48">
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              options={monthOptions}
            />
          </div>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateModalOpen(true)}>
            Claim New Expense
          </Button>
        </div>
      </div>

      {/* DIRECTOR OVERALL EXPENSE BANNER & CARDS */}
      {isDirector ? (
        <div className="space-y-4">
          <Card className="p-6 bg-gradient-to-r from-brand-900 via-brand-800 to-gray-900 text-white rounded-3xl shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-brand-300">Overall Expense (All Staff)</p>
                <h2 className="text-3xl font-black font-mono tracking-tight text-white mt-1">
                  {formatINR(overallMonthlyTotal)}
                </h2>
                <p className="text-xs text-gray-300 mt-1 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-brand-400" />
                  Showing total company expenses for selected month
                </p>
              </div>

              <div className="flex gap-3 text-center">
                <div className="bg-white/10 p-3 rounded-2xl border border-white/15 min-w-28">
                  <p className="text-[10px] text-emerald-300 font-bold uppercase">Paid & Settled</p>
                  <p className="text-base font-black font-mono text-emerald-400">{formatINR(overallPaidTotal)}</p>
                </div>
                <div className="bg-white/10 p-3 rounded-2xl border border-white/15 min-w-28">
                  <p className="text-[10px] text-amber-300 font-bold uppercase">Pending</p>
                  <p className="text-base font-black font-mono text-amber-400">{formatINR(overallPendingTotal)}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* STAFF EXPENSE CARDS GRID */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-600" />
                Staff-Wise Expense Breakdown ({activeStaffList.length} Active Staff)
              </h3>
            </div>

            {loadingStaff ? (
              <p className="text-xs text-gray-400 animate-pulse text-center py-6">Loading staff expense summaries...</p>
            ) : activeStaffList.length === 0 ? (
              <Card className="p-6 text-center text-xs text-gray-500 italic">No active staff profiles found.</Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeStaffList.map((staff) => {
                  const staffMonthlyExps = monthlyExpenses.filter((e) => e.userId === staff.userId || e.userId === staff.id);
                  const staffSpend = staffMonthlyExps.reduce((sum, e) => sum + (e.amount || 0), 0);
                  const staffPending = staffMonthlyExps.filter((e) => e.status === 'pending' || e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0);

                  return (
                    <Card key={staff.id} hoverable className="p-5 space-y-4 flex flex-col justify-between border-brand-100/70 shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          {staff.photoUrl ? (
                            <img src={staff.photoUrl} alt={staff.fullName} className="w-12 h-12 rounded-xl object-cover border" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg">
                              <User className="w-6 h-6" />
                            </div>
                          )}
                          <div className="truncate">
                            <h4 className="font-extrabold text-gray-900 truncate">{staff.fullName}</h4>
                            <p className="text-xs text-brand-600 font-bold uppercase tracking-wider truncate">{staff.designation}</p>
                          </div>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-medium">This Month Spend:</span>
                            <span className="font-mono font-black text-brand-600 text-sm">{formatINR(staffSpend)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-400">Claims Recorded:</span>
                            <span className="font-bold text-gray-700">{staffMonthlyExps.length}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-400">Pending Amount:</span>
                            <span className="font-bold text-amber-600 font-mono">{formatINR(staffPending)}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs font-extrabold text-brand-600 hover:bg-brand-50"
                        icon={<ArrowRight className="w-3.5 h-3.5" />}
                        onClick={() => navigate(`/expenses/staff/${staff.userId}`)}
                      >
                        View Expense & Attendance →
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* STAFF PERSONAL EXPENSE BANNER */
        <Card className="p-6 bg-gradient-to-r from-emerald-950 via-gray-900 to-emerald-900 text-white rounded-3xl shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">My Expense This Month</p>
              <h2 className="text-3xl font-black font-mono tracking-tight text-white mt-1">
                {formatINR(myMonthlyTotal)}
              </h2>
              <p className="text-xs text-gray-300 mt-1 font-medium">
                Personal claim total calculated strictly from your logged-in account
              </p>
            </div>

            <div className="flex gap-3 text-center">
              <div className="bg-white/10 p-3 rounded-2xl border border-white/15 min-w-28">
                <p className="text-[10px] text-emerald-300 font-bold uppercase">Paid Claims</p>
                <p className="text-base font-black font-mono text-emerald-400">{formatINR(myPaidTotal)}</p>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl border border-white/15 min-w-28">
                <p className="text-[10px] text-amber-300 font-bold uppercase">Pending</p>
                <p className="text-base font-black font-mono text-amber-400">{formatINR(myPendingTotal)}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* FILTERS & EXPENSE LIST */}
      <div className="space-y-4 pt-2">
        <h3 className="text-base font-black text-gray-900">
          {isDirector ? 'All Company Expense Claims Log' : 'My Claim History'}
        </h3>

        <Card className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <Input
              placeholder="Search expenses by title, staff name, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Claim Statuses' },
                { value: 'pending', label: 'Pending Approval' },
                { value: 'approved', label: 'Approved Claims' },
                { value: 'paid', label: 'Paid & Settled' },
                { value: 'rejected', label: 'Rejected Claims' },
              ]}
            />
          </div>
        </Card>

        {loadingExpenses ? (
          <p className="text-xs text-gray-400 animate-pulse text-center py-8">Loading expense records...</p>
        ) : filteredExpenses.length === 0 ? (
          <Card className="p-8 text-center text-gray-500 text-xs italic">
            No expense claim records found matching criteria for selected month.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExpenses.map((exp) => (
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
                  <span>By {exp.userName}</span>
                  <span>{exp.date}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* CLAIM NEW EXPENSE MODAL */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Claim Expense Reimbursement">
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <Input
            label="Expense Title"
            placeholder="e.g. Fuel & Travel to Press Conference"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Expense Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: 'Travel & Reporting', label: 'Travel & Field Reporting' },
                { value: 'Equipment & Hardware', label: 'Equipment & Hardware' },
                { value: 'Food & Meals', label: 'Food & Field Meals' },
                { value: 'Office Supplies', label: 'Office Supplies & Stationeries' },
                { value: 'Utility & Maintenance', label: 'Utility & Maintenance' },
              ]}
            />

            <Input
              label="Amount (₹)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              required
            />
          </div>

          <Input
            label="Date of Expense"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
              Expense Explanation
            </label>
            <textarea
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              rows={3}
              placeholder="Detail reasons for this expense..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <FileUploader
            label="Attach Receipt / Bill Voucher"
            folder="janta-live-setu/expenses"
            currentUrl={receiptUrl}
            onFileUploaded={(url) => setReceiptUrl(url)}
          />

          {error && <p className="text-xs text-red-600 font-medium text-center">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="w-full" loading={submitting}>
              Submit Claim
            </Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL */}
      {selectedExpense && (
        <Modal isOpen={!!selectedExpense} onClose={() => setSelectedExpense(null)} title="Expense Claim Details">
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
                <FileText className="w-4 h-4" /> View Receipt Image / PDF
              </a>
            )}

            {isDirector && selectedExpense.status === 'pending' && (
              <div className="flex gap-2 pt-3 border-t">
                <Button
                  variant="danger"
                  size="sm"
                  className="w-1/2"
                  onClick={() => handleRejectExpense(selectedExpense.id)}
                >
                  Reject Claim
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleApproveExpense(selectedExpense.id)}
                >
                  Approve Claim (PIN)
                </Button>
              </div>
            )}

            {isDirector && selectedExpense.status === 'approved' && (
              <Button
                variant="primary"
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => handleMarkPaid(selectedExpense.id)}
              >
                Mark as Paid & Disburse (PIN)
              </Button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
