import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { FileUploader } from '../../components/common/FileUploader';
import { DigitalIdCard } from '../../components/common/DigitalIdCard';
import {
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Shield,
  FileText,
  Edit3,
  X,
  CheckCircle2,
  Lock,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { usePermissions } from '../../hooks/usePermissions';
import { saveStaffProfile, setUserDoc, getStaffProfileById } from '../../services/firestoreService';
import { StaffProfile } from '../../types';
import { formatINR } from '../../utils/formatters';

export const ProfilePage: React.FC = () => {
  const { userDoc, staffProfile, refreshUserDoc } = useAuth();
  const { companySettings } = useCompany();
  const { isDirector } = usePermissions();

  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);

  // Local state for profile details
  const [profile, setProfile] = useState<StaffProfile | null>(staffProfile || null);

  // Allowed Personal Editable Fields
  const [fullName, setFullName] = useState(userDoc?.name || staffProfile?.fullName || '');
  const [fatherName, setFatherName] = useState(staffProfile?.fatherName || '');
  const [motherName, setMotherName] = useState(staffProfile?.motherName || '');
  const [contactNumber, setContactNumber] = useState(staffProfile?.contactNumber || '');
  const [emergencyContact, setEmergencyContact] = useState(staffProfile?.emergencyContact || '');
  const [address, setAddress] = useState(staffProfile?.address || '');
  const [photoUrl, setPhotoUrl] = useState(staffProfile?.photoUrl || userDoc?.photoUrl || '');

  // Load canonical staff profile from Firestore on mount
  useEffect(() => {
    if (!userDoc?.uid) return;
    setLoading(true);
    getStaffProfileById(userDoc.uid)
      .then((data) => {
        if (data) {
          setProfile(data);
          setFullName(data.fullName || userDoc.name || '');
          setFatherName(data.fatherName || '');
          setMotherName(data.motherName || '');
          setContactNumber(data.contactNumber || '');
          setEmergencyContact(data.emergencyContact || '');
          setAddress(data.address || '');
          setPhotoUrl(data.photoUrl || userDoc.photoUrl || '');
        }
      })
      .finally(() => setLoading(false));
  }, [userDoc?.uid, userDoc?.name, userDoc?.photoUrl]);

  if (!userDoc) {
    return <p className="text-xs text-gray-400 py-12 text-center">Please login to view your profile.</p>;
  }

  const handleCancelEdit = () => {
    setEditing(false);
    if (profile) {
      setFullName(profile.fullName || userDoc.name || '');
      setFatherName(profile.fatherName || '');
      setMotherName(profile.motherName || '');
      setContactNumber(profile.contactNumber || '');
      setEmergencyContact(profile.emergencyContact || '');
      setAddress(profile.address || '');
      setPhotoUrl(profile.photoUrl || userDoc.photoUrl || '');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Build safe update payload strictly containing allowed personal fields
      const updatedProfileData: StaffProfile = {
        userId: userDoc.uid,
        idNumber: profile?.idNumber || `JLS-${userDoc.uid.slice(0, 5).toUpperCase()}`,
        fullName,
        fatherName,
        motherName,
        email: userDoc.email,
        contactNumber,
        emergencyContact,
        address,
        // Immutable/Read-only fields for staff
        designation: profile?.designation || userDoc.designation || 'Staff',
        workingArea: profile?.workingArea || 'Office',
        monthlySalary: profile?.monthlySalary || 12000,
        photoUrl,
        documentsUrl: profile?.documentsUrl || '',
        approvalStatus: profile?.approvalStatus || 'approved',
        joinedDate: profile?.joinedDate || userDoc.createdAt.split('T')[0],
        validUpto: profile?.validUpto || '31 DEC 2028',
        createdById: profile?.createdById || userDoc.uid,
      };

      await saveStaffProfile(updatedProfileData);

      // Also update name and photoUrl on main user doc
      await setUserDoc(userDoc.uid, {
        name: fullName,
        photoUrl: photoUrl || undefined,
        updatedAt: new Date().toISOString(),
      });

      setProfile(updatedProfileData);
      await refreshUserDoc();
      setEditing(false);
      alert('Profile updated successfully.');
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      alert(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <UserIcon className="w-7 h-7 text-brand-600" />
            My User Profile
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Manage your personal contact details and view official employment credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowIdCard(!showIdCard)}
          >
            {showIdCard ? 'Hide Digital ID' : 'View Digital ID Card'}
          </Button>

          {!editing && (
            <Button
              variant="primary"
              size="sm"
              icon={<Edit3 className="w-4 h-4" />}
              onClick={() => setEditing(true)}
            >
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* DIGITAL ID CARD DISPLAY */}
      {showIdCard && (
        <Card className="p-6 bg-gray-50 flex items-center justify-center border-gray-200">
          <DigitalIdCard
            staff={
              profile || {
                userId: userDoc.uid,
                idNumber: `JLS-${userDoc.uid.slice(0, 5).toUpperCase()}`,
                fullName: userDoc.name || 'User',
                fatherName: fatherName || 'N/A',
                motherName: motherName || 'N/A',
                email: userDoc.email,
                contactNumber: contactNumber || 'N/A',
                emergencyContact: emergencyContact || 'N/A',
                address: address || 'N/A',
                designation: userDoc.designation || 'Staff',
                workingArea: 'Office',
                monthlySalary: 12000,
                photoUrl: photoUrl || '',
                approvalStatus: 'approved',
                joinedDate: userDoc.createdAt.split('T')[0],
                validUpto: '31 DEC 2028',
                createdById: userDoc.uid,
              }
            }
            company={companySettings}
          />
        </Card>
      )}

      {/* PROFILE CONTENT */}
      {loading ? (
        <Card className="p-8 text-center text-xs text-gray-400 animate-pulse">
          Loading your profile...
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COL: PROFILE CARD */}
          <Card className="p-6 space-y-4 text-center">
            <div className="relative inline-block mx-auto">
              <img
                src={
                  photoUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
                }
                alt={fullName}
                className="w-32 h-32 rounded-3xl object-cover border-4 border-brand-500 mx-auto shadow-md"
              />
              <Badge
                variant={userDoc.role === 'director' ? 'warning' : 'info'}
                size="sm"
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 shadow-sm font-black uppercase"
              >
                {userDoc.role}
              </Badge>
            </div>

            <div className="pt-2">
              <h2 className="text-xl font-extrabold text-gray-900">{fullName || userDoc.name || 'User'}</h2>
              <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mt-0.5">
                {profile?.designation || userDoc.designation || 'Staff Member'}
              </p>
              <p className="text-xs text-gray-500">{profile?.workingArea || 'Office'}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-xs text-left space-y-2 text-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-medium">Employee ID:</span>
                <span className="font-mono font-bold text-gray-900">
                  {profile?.idNumber || `JLS-${userDoc.uid.slice(0, 5).toUpperCase()}`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-medium">Joining Date:</span>
                <span className="font-semibold text-gray-900">
                  {profile?.joinedDate || userDoc.createdAt.split('T')[0]}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-medium">Status:</span>
                <Badge variant={userDoc.approved ? 'success' : 'warning'} size="sm">
                  {(userDoc.status || 'Active').toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* MONTHLY SALARY SUMMARY (READ ONLY FOR STAFF) */}
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 text-left">
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                Configured Base Monthly Salary
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xl font-black font-mono text-emerald-950">
                  {formatINR(profile?.monthlySalary || 12000)}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                  READ-ONLY
                </span>
              </div>
              {!isDirector && (
                <p className="text-[10px] text-emerald-700 mt-1 italic">
                  Salary configuration can only be modified by the Director.
                </p>
              )}
            </div>
          </Card>

          {/* RIGHT COL: DETAILS FORM / READ-ONLY VIEW */}
          <Card className="p-6 space-y-6 lg:col-span-2">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-700" />
                Personal Information & Background
              </h3>
              {editing && (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  Editing Personal Fields
                </span>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 block">Profile Photo</label>
                  <FileUploader
                    onUploadSuccess={(url) => setPhotoUrl(url)}
                    folder="profiles"
                    accept="image/*"
                    currentUrl={photoUrl}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                  <Input
                    label="Email Address (System ID)"
                    value={userDoc.email}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  <Input
                    label="Father's Name"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="Enter father's name"
                  />
                  <Input
                    label="Mother's Name"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    placeholder="Enter mother's name"
                  />
                  <Input
                    label="Contact Mobile Number"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    required
                  />
                  <Input
                    label="Emergency Contact Number"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Emergency family contact"
                  />
                </div>

                <Input
                  label="Residential Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Complete residential address"
                  required
                />

                {/* RESTRICTED COMPANY CONTROLLED FIELDS (READ ONLY IN EDIT MODE) */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                  <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-gray-400" />
                    Company-Controlled Restricted Fields (Read-Only)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 font-semibold block">Designation</span>
                      <span className="font-bold text-gray-900">{profile?.designation || 'Staff'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block">Working Area</span>
                      <span className="font-bold text-gray-900">{profile?.workingArea || 'Office'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block">Monthly Base Salary</span>
                      <span className="font-bold text-emerald-700">{formatINR(profile?.monthlySalary || 12000)}</span>
                    </div>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={submitting}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-400 font-semibold uppercase block">Father's Name</span>
                    <span className="text-sm font-bold text-gray-900">{fatherName || 'Not provided'}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-400 font-semibold uppercase block">Mother's Name</span>
                    <span className="text-sm font-bold text-gray-900">{motherName || 'Not provided'}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-400 font-semibold uppercase block">Contact Mobile</span>
                    <span className="text-sm font-bold text-gray-900">{contactNumber || 'Not provided'}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-400 font-semibold uppercase block">Emergency Contact</span>
                    <span className="text-sm font-bold text-gray-900">{emergencyContact || 'Not provided'}</span>
                  </div>

                  <div className="sm:col-span-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-400 font-semibold uppercase block">Residential Address</span>
                    <span className="text-sm font-bold text-gray-900">{address || 'Not provided'}</span>
                  </div>
                </div>

                {profile?.documentsUrl && (
                  <div className="pt-2">
                    <a
                      href={profile.documentsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 bg-brand-50 px-3.5 py-2.5 rounded-xl border border-brand-200 hover:underline"
                    >
                      <FileText className="w-4 h-4" /> View Verification Document PDF
                    </a>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
