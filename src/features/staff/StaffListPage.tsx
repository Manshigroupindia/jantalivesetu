import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Users, UserPlus, Search, Eye } from 'lucide-react';
import { useRealtimeCollection } from '../../hooks/useRealtime';
import { StaffProfile, UserRole } from '../../types';
import { createStaffAccountByDirector } from '../../services/authService';
import { logAuditEvent } from '../../services/auditService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const StaffListPage: React.FC = () => {
  const navigate = useNavigate();
  const { userDoc } = useAuth();
  const { data: staffList, loading } = useRealtimeCollection<StaffProfile>('staffProfiles');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New Staff Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [tempPass, setTempPass] = useState('');
  const [pin, setPin] = useState('1234');
  const [role, setRole] = useState<UserRole>('staff');
  const [designation, setDesignation] = useState('Reporter');
  const [workingArea, setWorkingArea] = useState('New Delhi');
  const [monthlySalary, setMonthlySalary] = useState(15000);
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

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.workingArea.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || s.approvalStatus === statusFilter;
    return matchesSearch && matchesStatus;
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

      {/* FILTERS */}
      <Card className="p-4 flex flex-col sm:flex-row items-center gap-3">
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
              { value: 'all', label: 'All Statuses' },
              { value: 'approved', label: 'Approved & Active' },
              { value: 'under_review', label: 'Pending Approval' },
              { value: 'suspended', label: 'Suspended' },
            ]}
          />
        </div>
      </Card>

      {/* STAFF LIST TABLE / CARDS */}
      {loading ? (
        <p className="text-xs text-gray-400 animate-pulse text-center py-8">Loading staff directory...</p>
      ) : filteredStaff.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 text-xs italic">
          No staff records match your current search filters.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => (
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
                      staff.approvalStatus === 'approved'
                        ? 'success'
                        : staff.approvalStatus === 'under_review'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                    className="mt-1.5"
                  >
                    {staff.approvalStatus.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span className="text-gray-400">ID Number:</span>
                  <span className="font-mono font-bold text-gray-900">{staff.idNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Monthly Salary:</span>
                  <span className="font-bold text-emerald-600">₹{staff.monthlySalary?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Contact:</span>
                  <span className="font-medium text-gray-900">{staff.contactNumber}</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                icon={<Eye className="w-3.5 h-3.5" />}
                onClick={() => navigate(`/staff/${staff.id}`)}
              >
                View Complete Staff File & ID Card
              </Button>
            </Card>
          ))}
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
    </div>
  );
};
