import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { DigitalIdCard } from '../../components/common/DigitalIdCard';
import { useCompany } from '../../contexts/CompanyContext';
import { useSecurity } from '../../contexts/SecurityContext';
import { getStaffProfileById, saveStaffProfile, setUserDoc } from '../../services/firestoreService';
import { StaffProfile } from '../../types';
import { ArrowLeft, CheckCircle2, XCircle, Shield, FileText, DollarSign, Mail, Phone, MapPin } from 'lucide-react';
import { formatINR } from '../../utils/formatters';
import { logAuditEvent } from '../../services/auditService';
import { useAuth } from '../../contexts/AuthContext';

export const StaffDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companySettings } = useCompany();
  const { userDoc: currentUser } = useAuth();
  const { requirePinVerification } = useSecurity();

  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);

  // Edit fields
  const [salary, setSalary] = useState<number>(0);
  const [designation, setDesignation] = useState('');
  const [workingArea, setWorkingArea] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getStaffProfileById(id)
      .then((data) => {
        setStaff(data);
        if (data) {
          setSalary(data.monthlySalary);
          setDesignation(data.designation);
          setWorkingArea(data.workingArea);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="text-xs text-gray-400 animate-pulse py-12 text-center">Loading staff profile file...</p>;
  }

  if (!staff) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-sm font-bold text-gray-800">Staff Profile Record Not Found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/staff')}>
          Back to Staff Directory
        </Button>
      </div>
    );
  }

  const handleApproveStaff = () => {
    requirePinVerification('Approve Staff Member & Activate CMS Access', async () => {
      setUpdating(true);
      try {
        await saveStaffProfile({ ...staff, approvalStatus: 'approved' });
        await setUserDoc(staff.userId, { status: 'active', approved: true });

        await logAuditEvent({
          userId: currentUser?.uid || 'director',
          userName: 'Director',
          userRole: 'director',
          action: 'STAFF_APPROVED',
          module: 'staff',
          recordId: staff.userId,
        });

        setStaff((prev) => (prev ? { ...prev, approvalStatus: 'approved' } : null));
        alert('Staff profile approved & account activated successfully.');
      } catch (err: any) {
        alert('Failed to approve staff profile.');
      } finally {
        setUpdating(false);
      }
    });
  };

  const handleSuspendStaff = () => {
    requirePinVerification('Suspend Staff Member Account', async () => {
      setUpdating(true);
      try {
        await saveStaffProfile({ ...staff, approvalStatus: 'suspended' });
        await setUserDoc(staff.userId, { status: 'suspended', approved: false });

        await logAuditEvent({
          userId: currentUser?.uid || 'director',
          userName: 'Director',
          userRole: 'director',
          action: 'STAFF_SUSPENDED',
          module: 'staff',
          recordId: staff.userId,
        });

        setStaff((prev) => (prev ? { ...prev, approvalStatus: 'suspended' } : null));
        alert('Staff profile suspended.');
      } catch (err: any) {
        alert('Failed to suspend staff.');
      } finally {
        setUpdating(false);
      }
    });
  };

  const handleSaveSalaryAndDetails = () => {
    requirePinVerification('Update Salary & Designation Settings', async () => {
      setUpdating(true);
      try {
        await saveStaffProfile({
          ...staff,
          monthlySalary: salary,
          designation,
          workingArea,
        });

        setStaff((prev) =>
          prev ? { ...prev, monthlySalary: salary, designation, workingArea } : null
        );
        alert('Staff profile details updated.');
      } catch (err: any) {
        alert('Failed to update details.');
      } finally {
        setUpdating(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* TOP HEADER */}
      <div className="flex items-center justify-between border-b pb-4 border-gray-100">
        <button
          onClick={() => navigate('/staff')}
          className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Staff Directory
        </button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowIdCard(!showIdCard)}
        >
          {showIdCard ? 'Hide Digital ID Card' : 'View Digital ID Card'}
        </Button>
      </div>

      {/* ID CARD MODAL OR SECTION */}
      {showIdCard && (
        <Card className="p-6 bg-gray-50 flex items-center justify-center border-gray-200">
          <DigitalIdCard staff={staff} company={companySettings} />
        </Card>
      )}

      {/* PROFILE DETAILS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COL 1: PROFILE SUMMARY */}
        <Card className="p-6 space-y-4 text-center">
          <img
            src={
              staff.photoUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
            }
            alt={staff.fullName}
            className="w-28 h-28 rounded-2xl object-cover border-4 border-brand-500 mx-auto shadow-md"
          />

          <div>
            <h2 className="text-xl font-extrabold text-gray-900">{staff.fullName}</h2>
            <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mt-0.5">{staff.designation}</p>
            <p className="text-xs text-gray-500">{staff.workingArea}</p>

            <Badge
              variant={
                staff.approvalStatus === 'approved'
                  ? 'success'
                  : staff.approvalStatus === 'under_review'
                  ? 'warning'
                  : 'danger'
              }
              size="md"
              className="mt-2"
            >
              {staff.approvalStatus.toUpperCase()}
            </Badge>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 border text-xs text-left space-y-1.5 text-gray-700">
            <div className="flex justify-between">
              <span className="text-gray-400">ID Number:</span>
              <span className="font-mono font-bold">{staff.idNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Joined Date:</span>
              <span className="font-semibold">{staff.joinedDate || '2026-01-01'}</span>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="space-y-2 pt-2">
            {staff.approvalStatus !== 'approved' && (
              <Button
                variant="primary"
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                icon={<CheckCircle2 className="w-4 h-4" />}
                loading={updating}
                onClick={handleApproveStaff}
              >
                Approve & Activate Staff
              </Button>
            )}

            {staff.approvalStatus === 'approved' && (
              <Button
                variant="danger"
                size="sm"
                className="w-full"
                icon={<XCircle className="w-4 h-4" />}
                loading={updating}
                onClick={handleSuspendStaff}
              >
                Suspend Staff Account
              </Button>
            )}
          </div>
        </Card>

        {/* COL 2 & 3: PERSONAL & FINANCIAL DETAILS */}
        <div className="lg:col-span-2 space-y-6">
          {/* PERSONAL INFO */}
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-extrabold text-gray-900 border-b pb-2">Personal & Family Background</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400 font-semibold uppercase block">Father's Name</span>
                <span className="text-sm font-bold text-gray-900">{staff.fatherName || 'N/A'}</span>
              </div>

              <div>
                <span className="text-gray-400 font-semibold uppercase block">Mother's Name</span>
                <span className="text-sm font-bold text-gray-900">{staff.motherName || 'N/A'}</span>
              </div>

              <div>
                <span className="text-gray-400 font-semibold uppercase block">Contact Mobile</span>
                <span className="text-sm font-bold text-gray-900">{staff.contactNumber}</span>
              </div>

              <div>
                <span className="text-gray-400 font-semibold uppercase block">Emergency Contact</span>
                <span className="text-sm font-bold text-gray-900">{staff.emergencyContact || 'N/A'}</span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-gray-400 font-semibold uppercase block">Residential Address</span>
                <span className="text-sm font-bold text-gray-900">{staff.address}</span>
              </div>
            </div>

            {staff.documentsUrl && (
              <div className="pt-3 border-t">
                <a
                  href={staff.documentsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 bg-brand-50 px-3 py-2 rounded-xl border border-brand-200 hover:underline"
                >
                  <FileText className="w-4 h-4" /> View Uploaded Verification PDF / Documents
                </a>
              </div>
            )}
          </Card>

          {/* FINANCIAL & DESIGNATION MANAGEMENT */}
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-extrabold text-gray-900 border-b pb-2">Salary & Designation Management</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Monthly Salary (₹)"
                type="number"
                value={salary}
                onChange={(e) => setSalary(parseInt(e.target.value, 10))}
              />
              <Input
                label="Designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
              <Input
                label="Working Area"
                value={workingArea}
                onChange={(e) => setWorkingArea(e.target.value)}
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              loading={updating}
              onClick={handleSaveSalaryAndDetails}
            >
              Update Salary & Details (Requires PIN)
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
