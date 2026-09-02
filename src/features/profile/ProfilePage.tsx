import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { ImageCropperModal } from '../../components/common/ImageCropperModal';
import { DigitalIdCard } from '../../components/common/DigitalIdCard';
import { NotificationSettingsCard } from '../../components/common/NotificationSettingsCard';
import {
  User as UserIcon,
  Shield,
  FileText,
  Edit3,
  Lock,
  Camera
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useNotification } from '../../contexts/NotificationContext';
import { saveStaffProfile, setUserDoc, getStaffProfileById } from '../../services/firestoreService';
import { uploadToCloudinary } from '../../services/cloudinaryService';
import { StaffProfile } from '../../types';
import { formatINR } from '../../utils/formatters';

export const ProfilePage: React.FC = () => {
  const { userDoc, staffProfile, refreshUserDoc } = useAuth();
  const { companySettings } = useCompany();
  const { isDirector } = usePermissions();
  const { showToast } = useNotification();

  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);

  // Staff Profile State
  const [profile, setProfile] = useState<StaffProfile | null>(staffProfile || null);

  // Common Profile Fields
  const [fullName, setFullName] = useState(userDoc?.name || '');
  const [contactNumber, setContactNumber] = useState(staffProfile?.contactNumber || '');
  const [address, setAddress] = useState(staffProfile?.address || '');
  const [photoUrl, setPhotoUrl] = useState(staffProfile?.photoUrl || userDoc?.photoUrl || '');

  // Director Specific Personal Fields
  const [altPhone, setAltPhone] = useState(userDoc?.altPhone || '');
  const [city, setCity] = useState(userDoc?.city || 'New Delhi');
  const [state, setState] = useState(userDoc?.state || 'Delhi');
  const [pincode, setPincode] = useState(userDoc?.pincode || '110001');
  const [country, setCountry] = useState(userDoc?.country || 'India');
  const [bio, setBio] = useState(userDoc?.bio || '');

  // Staff Specific Fields
  const [fatherName, setFatherName] = useState(staffProfile?.fatherName || '');
  const [motherName, setMotherName] = useState(staffProfile?.motherName || '');
  const [emergencyContact, setEmergencyContact] = useState(staffProfile?.emergencyContact || '');

  // Image Cropper State
  const [selectedFileForCrop, setSelectedFileForCrop] = useState<File | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [pendingCroppedBlob, setPendingCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);

  // Load canonical profile from Firestore
  useEffect(() => {
    if (!userDoc?.uid) return;
    setLoading(true);

    if (isDirector) {
      setFullName(userDoc.name || '');
      setContactNumber(userDoc.phone || '');
      setAltPhone(userDoc.altPhone || '');
      setAddress(userDoc.address || '');
      setCity(userDoc.city || 'New Delhi');
      setState(userDoc.state || 'Delhi');
      setPincode(userDoc.pincode || '110001');
      setCountry(userDoc.country || 'India');
      setBio(userDoc.bio || '');
      setPhotoUrl(userDoc.photoUrl || '');
      setLoading(false);
    } else {
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
    }
  }, [userDoc, isDirector]);

  if (!userDoc) {
    return <p className="text-xs text-gray-400 py-12 text-center">Please login to view your profile.</p>;
  }

  // Handle Photo Selection for Cropping
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      showToast('Please select a valid image file (JPG, PNG, or WEBP).', 'warning');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      showToast('Selected image size exceeds 10MB limit. Please select a smaller photo.', 'warning');
      return;
    }

    setSelectedFileForCrop(file);
    setCropModalOpen(true);
    // Reset file input value
    e.target.value = '';
  };

  const handleCropComplete = (croppedBlob: Blob, previewUrl: string) => {
    setPendingCroppedBlob(croppedBlob);
    setCroppedPreviewUrl(previewUrl);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setPendingCroppedBlob(null);
    if (croppedPreviewUrl) {
      URL.revokeObjectURL(croppedPreviewUrl);
      setCroppedPreviewUrl(null);
    }

    if (isDirector) {
      setFullName(userDoc.name || '');
      setContactNumber(userDoc.phone || '');
      setAltPhone(userDoc.altPhone || '');
      setAddress(userDoc.address || '');
      setCity(userDoc.city || 'New Delhi');
      setState(userDoc.state || 'Delhi');
      setPincode(userDoc.pincode || '110001');
      setCountry(userDoc.country || 'India');
      setBio(userDoc.bio || '');
      setPhotoUrl(userDoc.photoUrl || '');
    } else if (profile) {
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
      let finalPhotoUrl = photoUrl;

      // Upload pending cropped blob if present
      if (pendingCroppedBlob) {
        try {
          const uploadRes = await uploadToCloudinary(
            pendingCroppedBlob,
            'janta-live-setu/staff',
            'image'
          );
          finalPhotoUrl = uploadRes.secureUrl || uploadRes.url;
        } catch (uploadErr) {
          console.error('Photo upload failed:', uploadErr);
          showToast('Unable to upload profile photo. Please try again.', 'error');
          setSubmitting(false);
          return;
        }
      }

      if (isDirector) {
        // Save Director Personal Profile to user doc
        await setUserDoc(userDoc.uid, {
          name: fullName,
          phone: contactNumber,
          altPhone,
          address,
          city,
          state,
          pincode,
          country,
          bio,
          photoUrl: finalPhotoUrl,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Save Staff Profile to staffProfiles collection
        const updatedProfileData: StaffProfile = {
          id: profile?.id || userDoc.uid,
          userId: userDoc.uid,
          idNumber: profile?.idNumber || `JLS-${userDoc.uid.slice(0, 5).toUpperCase()}`,
          fullName,
          fatherName,
          motherName,
          email: userDoc.email,
          contactNumber,
          emergencyContact,
          address,
          designation: profile?.designation || userDoc.designation || 'Staff',
          workingArea: profile?.workingArea || 'Office',
          monthlySalary: profile?.monthlySalary || 12000,
          photoUrl: finalPhotoUrl,
          documentsUrl: profile?.documentsUrl || '',
          approvalStatus: profile?.approvalStatus || 'approved',
          joinedDate: profile?.joinedDate || (userDoc.createdAt ? userDoc.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
          validUpto: profile?.validUpto || '31 DEC 2028',
          createdById: profile?.createdById || userDoc.uid,
          createdAt: profile?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await saveStaffProfile(updatedProfileData);

        // Update User Doc
        await setUserDoc(userDoc.uid, {
          name: fullName,
          photoUrl: finalPhotoUrl,
          updatedAt: new Date().toISOString(),
        });

        setProfile(updatedProfileData);
      }

      setPhotoUrl(finalPhotoUrl);
      setPendingCroppedBlob(null);
      setCroppedPreviewUrl(null);
      await refreshUserDoc();
      setEditing(false);
      showToast('Profile updated successfully.', 'success');
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      showToast('Unable to update profile. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const activeAvatarSrc =
    croppedPreviewUrl ||
    photoUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <UserIcon className="w-7 h-7 text-brand-600" />
            {isDirector ? 'Director Profile' : 'My User Profile'}
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            {isDirector
              ? 'Manage your personal Director profile contact details and credentials.'
              : 'Manage your personal contact details and view official employment credentials.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isDirector && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIdCard(!showIdCard)}
            >
              {showIdCard ? 'Hide Digital ID' : 'View Digital ID Card'}
            </Button>
          )}

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

      {/* STAFF DIGITAL ID CARD DISPLAY */}
      {!isDirector && showIdCard && (
        <Card className="p-6 bg-gray-50 flex items-center justify-center border-gray-200">
          <DigitalIdCard
            staff={
              profile || {
                id: userDoc.uid,
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
                photoUrl: activeAvatarSrc,
                approvalStatus: 'approved',
                joinedDate: userDoc.createdAt ? userDoc.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
                validUpto: '31 DEC 2028',
                createdById: userDoc.uid,
                createdAt: userDoc.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
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
          {/* LEFT COL: PROFILE AVATAR CARD */}
          <div className="space-y-6">
            <Card className="p-6 space-y-4 text-center">
            <div className="relative inline-block mx-auto group">
              <img
                src={activeAvatarSrc}
                alt={fullName}
                className="w-32 h-32 rounded-3xl object-cover border-4 border-brand-500 mx-auto shadow-md"
              />
              <Badge
                variant={isDirector ? 'warning' : 'info'}
                size="sm"
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 shadow-sm font-black uppercase"
              >
                {userDoc.role}
              </Badge>
            </div>

            {/* PHOTO CROP ACTION WHEN EDITING */}
            {editing && (
              <div className="pt-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-600 bg-brand-50 px-3.5 py-2 rounded-xl border border-brand-200 hover:bg-brand-100 transition-colors shadow-sm">
                  <Camera className="w-4 h-4" />
                  {croppedPreviewUrl ? 'Change / Recrop Photo' : 'Change Photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>

                {croppedPreviewUrl && (
                  <p className="text-[10px] font-bold text-emerald-600 mt-1.5">
                    ✓ Cropped 1:1 Preview Ready (Click Save Changes to Apply)
                  </p>
                )}
              </div>
            )}

            <div className="pt-2">
              <h2 className="text-xl font-extrabold text-gray-900">{fullName || userDoc.name || 'User'}</h2>
              <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mt-0.5">
                {isDirector ? 'Managing Director' : profile?.designation || userDoc.designation || 'Staff Member'}
              </p>
              {!isDirector && <p className="text-xs text-gray-500">{profile?.workingArea || 'Office'}</p>}
            </div>

            {/* DIRECTOR PERSONAL SUMMARY OR STAFF EMPLOYMENT SUMMARY */}
            {isDirector ? (
              <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/60 text-xs text-left space-y-2 text-amber-900">
                <div className="flex items-center gap-1.5 font-black text-amber-800 border-b pb-1 border-amber-200/40">
                  <Shield className="w-4 h-4" /> Executive Management
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900/80">
                  Authorized Director Account for Janta Live Setu Corporate Administration.
                </p>
              </div>
            ) : (
              <>
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

                {/* MONTHLY BASE SALARY (READ ONLY FOR STAFF) */}
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
                </div>
              </>
            )}
          </Card>

          <NotificationSettingsCard />
        </div>

        {/* RIGHT COL: DIRECTOR OR STAFF DETAILS FORM */}
          <Card className="p-6 space-y-6 lg:col-span-2">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-gray-700" />
                {isDirector ? 'Director Personal & Contact Information' : 'Staff Personal Information'}
              </h3>
              {editing && (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  Editing Personal Details
                </span>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {isDirector ? (
                  /* DIRECTOR EDIT FORM */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                      <Input
                        label="Official Email Address"
                        value={userDoc.email}
                        disabled
                        className="bg-gray-100 cursor-not-allowed"
                      />
                      <Input
                        label="Primary Mobile Number"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        placeholder="Enter primary mobile number"
                        required
                      />
                      <Input
                        label="Alternate Mobile Number"
                        value={altPhone}
                        onChange={(e) => setAltPhone(e.target.value)}
                        placeholder="Enter alternate contact number"
                      />
                    </div>

                    <Input
                      label="Address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address"
                      required
                    />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Input
                        label="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                      />
                      <Input
                        label="State"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        required
                      />
                      <Input
                        label="PIN Code"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        required
                      />
                      <Input
                        label="Country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 block">About / Executive Bio</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        placeholder="Brief executive profile summary"
                        className="w-full text-xs p-3 border rounded-xl border-gray-200 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                ) : (
                  /* STAFF EDIT FORM */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                      <Input
                        label="Email Address"
                        value={userDoc.email}
                        disabled
                        className="bg-gray-100 cursor-not-allowed"
                      />
                      <Input
                        label="Father's Name"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                      />
                      <Input
                        label="Mother's Name"
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                      />
                      <Input
                        label="Contact Mobile"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        required
                      />
                      <Input
                        label="Emergency Contact"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                      />
                    </div>

                    <Input
                      label="Residential Address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                    />

                    {/* RESTRICTED COMPANY CONTROLLED FIELDS (READ ONLY FOR STAFF) */}
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
                  </div>
                )}

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
              /* READ-ONLY DISPLAY VIEW */
              <div className="space-y-6">
                {isDirector ? (
                  /* DIRECTOR READ-ONLY VIEW */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-gray-400 font-semibold uppercase block">Full Name</span>
                      <span className="text-sm font-bold text-gray-900">{fullName || 'Director'}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-gray-400 font-semibold uppercase block">Email Address</span>
                      <span className="text-sm font-bold text-gray-900">{userDoc.email}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-gray-400 font-semibold uppercase block">Primary Mobile</span>
                      <span className="text-sm font-bold text-gray-900">{contactNumber || 'Not set'}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-gray-400 font-semibold uppercase block">Alternate Mobile</span>
                      <span className="text-sm font-bold text-gray-900">{altPhone || 'Not set'}</span>
                    </div>

                    <div className="sm:col-span-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-gray-400 font-semibold uppercase block">Address</span>
                      <span className="text-sm font-bold text-gray-900">
                        {address ? `${address}, ${city}, ${state} - ${pincode}, ${country}` : 'Not set'}
                      </span>
                    </div>

                    {bio && (
                      <div className="sm:col-span-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 font-semibold uppercase block">Executive Bio</span>
                        <span className="text-xs text-gray-800 leading-relaxed block mt-1">{bio}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* STAFF READ-ONLY VIEW */
                  <div className="space-y-4">
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
              </div>
            )}
          </Card>
        </div>
      )}

      {/* IMAGE CROPPER MODAL */}
      <ImageCropperModal
        isOpen={cropModalOpen}
        imageFile={selectedFileForCrop}
        onClose={() => {
          setCropModalOpen(false);
          setSelectedFileForCrop(null);
        }}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};
