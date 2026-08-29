import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { FileUploader } from '../../components/common/FileUploader';
import { Receipt, Plus, Search, FileText } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { ExpenseItem } from '../../types';
import { createExpenseItem, updateExpenseStatus } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useSecurity } from '../../contexts/SecurityContext';
import { useNotification } from '../../contexts/NotificationContext';
import { formatINR } from '../../utils/formatters';
import { getCurrentDateISO } from '../../utils/dateUtils';
import { where } from 'firebase/firestore';

export const ExpensesPage: React.FC = () => {
  const { userDoc, staffProfile } = useAuth();
  const { isDirector } = usePermissions();
  const { requirePinVerification } = useSecurity();
  const { showToast, showPrompt } = useNotification();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Travel & Reporting');
  const [amount, setAmount] = useState<number>(500);
  const [date, setDate] = useState(getCurrentDateISO());
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const constraints = isDirector
    ? []
    : [where('userId', '==', userDoc?.uid || 'none')];

  const { data: rawExpenses, loading } = useRealtimeCollection<ExpenseItem>('expenses', constraints);

  // In-memory sort to avoid requiring composite indexes in Firestore
  const expenses = [...rawExpenses].sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );

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
      setError('Failed to submit expense claim. Secure with Janta Live Setu.');
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

  const filteredExpenses = expenses.filter((e) => {
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
            Expense Reimbursements
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Claim, review, and approve staff field & operational expense reimbursements.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setCreateModalOpen(true)}
        >
          Claim New Expense
        </Button>
      </div>

      {/* FILTERS */}
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

      {/* EXPENSE CARDS GRID */}
      {loading ? (
        <p className="text-xs text-gray-400 animate-pulse text-center py-8">Loading expense records...</p>
      ) : filteredExpenses.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 text-xs italic">
          No expense claim records found matching criteria.
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
                <p className="text-xs text-gray-500 line-clamp-2">{exp.description}</p>
              </div>

              <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400 flex justify-between">
                <span>By {exp.userName}</span>
                <span>{exp.date}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

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
            <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border">{selectedExpense.description}</p>

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
