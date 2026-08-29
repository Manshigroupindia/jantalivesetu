import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Users, UserPlus, Search, Eye, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { StaffProfile, UserRole } from '../../types';
import { createStaffAccountByDirector } from '../../services/authService';
import { restoreStaffProfile, deleteStaffProfile } from '../../services/firestoreService';
import { logAuditEvent } from '../../services/auditService';
import { useAuth } from '../../contexts/AuthContext';
import { useSecurity } from '../../contexts/SecurityContext';
import { useNavigate } from 'react-router-dom';

export const StaffListPage: React.FC = () => {
  const navigate = useNavigate();
  const { userDoc } = useAuth();
  const { requirePinVerification } = useSecurity();
  const { data: rawStaffList, loading: staffLoading } = useRealtimeCollection<StaffProfile>('staffProfiles');
  const { data: rawUsersList, loading: usersLoading } = useRealtimeCollection<User>('users');
  const loading = staffLoading || usersLoading;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Destroy Modal state
  const [permanentDestroyModalOpen, setPermanentDestroyModalOpen] = useState(false);
  const [selectedStaffForPermanentDestroy, setSelectedStaffForPermanentDestroy] = useState<StaffProfile | null>(null);
  const [permanentDestroyConfirmText, setPermanentDestroyConfirmText] = useState('');

  // New Staff Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [tempPass, setTempPass] = useState('');
  const [pin, setPin] = useState('1234');
  const [role, setRole] = useState<UserRole>('staff');
  const [designation, setDesignation] = useState('Reporter');
  const [workingArea, setWorkingArea] = useState('New Delhi');
  const [monthlySalary, setMonthlySalary] = useState(12000);
  const [contactNumber, setContactNumber] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;

    setCreateLoading(true);
    setError(null);

    try {
      const { uid } = await createStaffAccountByDirector({
        email,
        temporaryPass: tempPass,
        pin,
        role,
        designation,
        workingArea,
        monthlySalary,
        fullName,
        contactNumber,
      });

      await logAuditEvent({
        userId: userDoc.uid,
        userName: 'Director',
        userRole: userDoc.role,
        action: 'STAFF_ACCOUNT_CREATED',
        module: 'staff',
        recordId: uid,
      });

      setCreateModalOpen(false);
      setFullName('');
      setEmail('');
      setTempPass('');
      alert('Staff credentials created successfully. Staff member can now login and complete profile.');
    } catch (err: any) {
      console.error('Create staff error:', err);
      setError(err.message || 'Failed to create staff account. Secure with Janta Live Setu.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRestoreStaff = (staffItem: StaffProfile) => {
    requirePinVerification(`Restore Staff Member (${staffItem.fullName})`, async () => {
      try {
        const restoredStatus = await restoreStaffProfile(staffItem.userId, userDoc?.uid || 'director');
        await logAuditEvent({
          userId: userDoc?.uid || 'director',
          userName: 'Director',
          userRole: 'director',
          action: 'STAFF_RESTORED_FROM_BIN',
          module: 'staff',
          recordId: staffItem.userId,
        });
        alert(`Staff member ${staffItem.fullName} restored successfully under status (${restoredStatus.toUpperCase()}).`);
      } catch (err: any) {
        alert('Failed to restore staff member. Check security permissions.');
      }
    });
  };

  const handlePermanentDestroyStaff = (staffItem: StaffProfile) => {
    setSelectedStaffForPermanentDestroy(staffItem);
    setPermanentDestroyConfirmText('');
    setPermanentDestroyModalOpen(true);
  };

  const confirmPermanentDestroy = () => {
    if (!selectedStaffForPermanentDestroy) return;
    if (permanentDestroyConfirmText.trim() !== 'DELETE FOREVER') {
      alert('Please type DELETE FOREVER to confirm permanent record destruction.');
      return;
    }

    requirePinVerification('PERMANENTLY DESTROY STAFF RECORD', async () => {
      try {
        await deleteStaffProfile(selectedStaffForPermanentDestroy.userId);
        await logAuditEvent({
          userId: userDoc?.uid || 'director',
          userName: 'Director',
          userRole: 'director',
          action: 'STAFF_PERMANENTLY_DESTROYED',
          module: 'staff',
          recordId: selectedStaffForPermanentDestroy.userId,
        });
        setPermanentDestroyModalOpen(false);
        alert(`Staff record for ${selectedStaffForPermanentDestroy.fullName} has been permanently destroyed.`);
      } catch (err: any) {
        alert('Failed to permanently destroy staff record.');
      }
    });
  };

  // Build single canonical staff list by merging staffProfiles and users
  const uniqueStaffMap = new Map<string, StaffProfile>();

  // 1. Process staffProfiles
  rawStaffList.forEach((s) => {
    const key = s.userId || s.id;
    if (!key) return;
    uniqueStaffMap.set(key, { ...s, id: key, userId: key });
  });

  // 2. Merge with users collection to ensure any staff member in users is represented
  rawUsersList.forEach((u) => {
    if (u.role === 'director') return;
    const key = u.uid;
    if (!key) return;

    const existing = uniqueStaffMap.get(key);
    const uStatus = (u.status as string)?.toLowerCase();
    const isDeletedUser = uStatus === 'deleted';

    if (existing) {
      if (isDeletedUser) {
        uniqueStaffMap.set(key, {
          ...existing,
          approvalStatus: 'deleted',
          status: 'deleted',
          deletedAt: u.deletedAt || existing.deletedAt,
          deletedBy: u.deletedBy || existing.deletedBy,
          previousStatus: u.previousStatus || existing.previousStatus,
          deletionReason: u.deletionReason || existing.deletionReason,
        });
      }
    } else {
      uniqueStaffMap.set(key, {
        id: key,
        userId: key,
        idNumber: u.idNumber || `JLS-${key.slice(-4)}`,
        fullName: u.name || u.email?.split('@')[0] || 'Staff Member',
        fatherName: '',
        motherName: '',
        email: u.email || '',
        contactNumber: u.phone || 'N/A',
        emergencyContact: '',
        address: u.address || '',
        designation: u.designation || 'Staff Member',
        workingArea: u.city || 'Head Office',
        monthlySalary: u.monthlySalary || 0,
        photoUrl: u.photoUrl || '',
        approvalStatus: isDeletedUser ? 'deleted' : ((u.status as StaffApprovalStatus) || 'approved'),
        status: isDeletedUser ? 'deleted' : ((u.status as StaffApprovalStatus) || 'approved'),
        deletedAt: u.deletedAt,
        deletedBy: u.deletedBy,
        previousStatus: u.previousStatus,
        deletionReason: u.deletionReason,
        joinedDate: u.createdAt ? u.createdAt.split('T')[0] : '2026-01-01',
        validUpto: '31 DEC 2028',
        createdById: 'director',
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: u.updatedAt || new Date().toISOString(),
      });
    }
  });

  const isDeleted = (s: StaffProfile) =>
    s.approvalStatus?.toLowerCase() === 'deleted' || s.status?.toLowerCase() === 'deleted';

  const allStaffArray = Array.from(uniqueStaffMap.values());
  const activeStaffList = allStaffArray.filter((s) => !isDeleted(s));
  const binStaffList = allStaffArray.filter((s) => isDeleted(s));

  const filteredStaff = allStaffArray.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.workingArea.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') {
      return matchesSearch && !isDeleted(s);
    }
    if (statusFilter === 'deleted') {
      return matchesSearch && isDeleted(s);
    }
    return matchesSearch && !isDeleted(s) && (s.approvalStatus === statusFilter || s.status === statusFilter);
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-brand-600" />
            Staff Entry & Management
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Manage employee credentials, designations, salaries, approval workflow, and permissions.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => setCreateModalOpen(true)}
        >
          Create Staff Account
        </Button>
      </div>

      {/* TABS & FILTERS */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Active Staff ({activeStaffList.length})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Approved & Active
          </button>
          <button
            onClick={() => setStatusFilter('under_review')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'under_review'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pending Approval
          </button>
          <button
            onClick={() => setStatusFilter('suspended')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'suspended'
                ? 'bg-red-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Suspended
          </button>
          <button
            onClick={() => setStatusFilter('deleted')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'deleted'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            Bin / Trash ({binStaffList.length})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <Input
              placeholder="Search by name, email, designation, or area..."
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
                { value: 'all', label: `All Active Staff (${activeStaffList.length})` },
                { value: 'approved', label: 'Approved & Active' },
                { value: 'under_review', label: 'Pending Approval' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'deleted', label: `🗑 Bin / Trash (${binStaffList.length})` },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* STAFF LIST TABLE / CARDS */}
      {loading ? (
        <p className="text-xs text-gray-400 animate-pulse text-center py-8">Loading staff directory...</p>
      ) : filteredStaff.length === 0 ? (
        statusFilter === 'deleted' ? (
          <Card className="p-12 text-center space-y-3 border-dashed border-2 border-gray-200">
            <Trash2 className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-gray-800">Trash / Bin is Empty</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Deleted staff members will appear here. You can view details, restore them back to active status, or permanently destroy records.
            </p>
          </Card>
        ) : (
          <Card className="p-8 text-center text-gray-500 text-xs italic">
            No staff records match your current search filters.
          </Card>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => {
            const isStaffDeleted = isDeleted(staff);
            return (
              <Card key={staff.id} hoverable className="p-5 space-y-4 flex flex-col justify-between">
                <div className="flex items-start gap-3">
                  <img
                    src={
                      staff.photoUrl ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
                    }
                    alt={staff.fullName}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-brand-500 shrink-0"
                  />
                  <div className="truncate flex-1">
                    <h3 className="text-base font-extrabold text-gray-900 truncate">{staff.fullName}</h3>
                    <p className="text-xs font-bold text-brand-600 uppercase tracking-wider">{staff.designation}</p>
                    <p className="text-[11px] text-gray-400 truncate">{staff.workingArea}</p>

                    <Badge
                      variant={
                        isStaffDeleted
                          ? 'danger'
                          : staff.approvalStatus === 'approved'
                          ? 'success'
                          : staff.approvalStatus === 'under_review'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                      className="mt-1.5 uppercase font-mono"
                    >
                      {isStaffDeleted ? 'DELETED' : staff.approvalStatus}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-400">ID Number:</span>
                    <span className="font-mono font-bold text-gray-900">{staff.idNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span className="font-medium text-gray-900 truncate max-w-[170px]">{staff.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contact:</span>
                    <span className="font-medium text-gray-900">{staff.contactNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Monthly Salary:</span>
                    <span className="font-bold text-emerald-600">₹{staff.monthlySalary?.toLocaleString('en-IN')}</span>
                  </div>
                  {isStaffDeleted && (
                    <div className="pt-2 border-t text-[11px] text-red-600 space-y-0.5 bg-red-50/60 p-2.5 rounded-xl border border-red-100">
                      <p className="font-bold">Deleted on: {staff.deletedAt ? staff.deletedAt.split('T')[0] : 'N/A'}</p>
                      <p>Deleted By: <span className="font-mono font-bold">{staff.deletedBy || 'Director'}</span></p>
                      <p>Previous Status: <span className="font-mono font-bold uppercase">{staff.previousStatus || 'APPROVED'}</span></p>
                      {staff.deletionReason && (
                        <p className="italic text-[10px] text-red-500">Reason: "{staff.deletionReason}"</p>
                      )}
                    </div>
                  )}
                </div>

                {isStaffDeleted ? (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        icon={<RotateCcw className="w-3.5 h-3.5 text-emerald-600" />}
                        onClick={() => handleRestoreStaff(staff)}
                      >
                        Restore
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="flex-1"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => handlePermanentDestroyStaff(staff)}
                      >
                        Delete Forever
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs font-semibold text-gray-600 hover:bg-gray-100"
                      icon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => navigate(`/staff/${staff.id}`)}
                    >
                      View Profile Details
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    icon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => navigate(`/staff/${staff.id}`)}
                  >
                    View Complete Staff File & ID Card
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE STAFF MODAL */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create Staff Account Credentials">
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <Input
            label="Staff Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Staff Login Email"
              type="email"
              placeholder="name@jantalive.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Temporary Password"
              type="password"
              placeholder="••••••••"
              value={tempPass}
              onChange={(e) => setTempPass(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="4-Digit Initial Security PIN"
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              required
            />

            <Select
              label="Role Level"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              options={[
                { value: 'staff', label: 'Normal Staff Role' },
                { value: 'admin', label: 'Operational Admin Role' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              required
            />
            <Input
              label="Working Area"
              value={workingArea}
              onChange={(e) => setWorkingArea(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Monthly Salary (₹)"
              type="number"
              value={monthlySalary}
              onChange={(e) => setMonthlySalary(parseInt(e.target.value, 10))}
              required
            />
            <Input
              label="Contact Mobile"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-xs text-red-600 font-medium text-center">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="w-full" loading={createLoading}>
              Create Credentials
            </Button>
          </div>
        </form>
      </Modal>

      {/* PERMANENT DESTROY MODAL */}
      <Modal
        isOpen={permanentDestroyModalOpen}
        onClose={() => setPermanentDestroyModalOpen(false)}
        title="Permanently Destroy Staff Record"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-red-900">
              <h4 className="font-extrabold text-sm">Destructive Action Warning</h4>
              <p>
                You are about to permanently destroy the system profile for{' '}
                <span className="font-extrabold">{selectedStaffForPermanentDestroy?.fullName}</span> (ID:{' '}
                <span className="font-mono font-bold">{selectedStaffForPermanentDestroy?.idNumber}</span>).
              </p>
              <p className="text-[11px] text-red-700">
                This record will be permanently deleted from the staff directory and Bin. Historical accounting, attendance, and expense records will remain preserved for legal/financial audit.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-gray-700">
              Type <span className="font-mono text-red-600 font-extrabold select-all">DELETE FOREVER</span> to confirm:
            </p>
            <Input
              placeholder="DELETE FOREVER"
              value={permanentDestroyConfirmText}
              onChange={(e) => setPermanentDestroyConfirmText(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="w-full" onClick={() => setPermanentDestroyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="w-full"
              disabled={permanentDestroyConfirmText.trim() !== 'DELETE FOREVER'}
              onClick={confirmPermanentDestroy}
            >
              Destroy Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
