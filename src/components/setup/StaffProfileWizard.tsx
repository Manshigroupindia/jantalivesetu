import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { FileUploader } from '../common/FileUploader';
import { UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { saveStaffProfile, setUserDoc, getStaffProfileById } from '../../services/firestoreService';
import { generateStaffIdNumber } from '../../utils/idGenerator';
import { StaffProfile } from '../../types';

export const StaffProfileWizard: React.FC = () => {
  const { userDoc, refreshUserDoc } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(userDoc?.name || '');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [email] = useState(userDoc?.email || '');
  const [address, setAddress] = useState('');
  const [designation, setDesignation] = useState(userDoc?.designation || 'Reporter');
  const [workingArea, setWorkingArea] = useState('New Delhi');
  const [photoUrl, setPhotoUrl] = useState('');
  const [documentsUrl, setDocumentsUrl] = useState('');
  const [existingProfile, setExistingProfile] = useState<StaffProfile | null>(null);

  useEffect(() => {
    if (!userDoc?.uid) return;
    getStaffProfileById(userDoc.uid).then((prof: StaffProfile | null) => {
      if (prof) {
        setExistingProfile(prof);
        if (prof.fullName) setFullName(prof.fullName);
        if (prof.fatherName) setFatherName(prof.fatherName);
        if (prof.motherName) setMotherName(prof.motherName);
        if (prof.contactNumber) setContactNumber(prof.contactNumber);
        if (prof.emergencyContact) setEmergencyContact(prof.emergencyContact);
        if (prof.address) setAddress(prof.address);
        if (prof.designation) setDesignation(prof.designation);
        if (prof.workingArea) setWorkingArea(prof.workingArea);
        if (prof.photoUrl) setPhotoUrl(prof.photoUrl);
        if (prof.documentsUrl) setDocumentsUrl(prof.documentsUrl);
      }
    });
  }, [userDoc?.uid]);

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;

    if (!photoUrl) {
      setError('Staff profile photo is mandatory.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const idNumber = existingProfile?.idNumber || generateStaffIdNumber();
      const configuredSalary = existingProfile?.monthlySalary || 12000;

      await saveStaffProfile({
        userId: userDoc.uid,
        idNumber,
        fullName,
        fatherName,
        motherName,
        email,
        contactNumber,
        emergencyContact,
        address,
        designation,
        workingArea,
        monthlySalary: configuredSalary,
        photoUrl,
        documentsUrl,
        approvalStatus: 'under_review',
        joinedDate: existingProfile?.joinedDate || new Date().toISOString().split('T')[0],
        validUpto: existingProfile?.validUpto || '31 DEC 2028',
        createdById: existingProfile?.createdById || userDoc.uid,
      });

      // Update User Document Status to under_review
      await setUserDoc(userDoc.uid, {
        status: 'under_review',
        approved: false,
        name: fullName,
        designation,
        photoUrl,
      });

      await refreshUserDoc();
      navigate('/pending-approval');
    } catch (err: any) {
      console.error('Staff profile submission error:', err);
      setError('Failed to submit staff profile. Secure with Janta Live Setu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
      <Card className="max-w-2xl w-full shadow-2xl border-gray-100 p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2 border-b pb-5 border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-lg">
            <UserCheck className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Complete Your Staff Profile</h2>
          <p className="text-xs text-gray-500 font-medium">
            Welcome to Janta Live Setu! Please submit your official details for Director approval.
          </p>
        </div>

        <form onSubmit={handleSubmitProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FileUploader
              label="Staff Photo (Mandatory)"
              folder="janta-live-setu/staff"
              accept="image/*"
              currentUrl={photoUrl}
              onFileUploaded={(url) => setPhotoUrl(url)}
            />

            <FileUploader
              label="Documents / PDF (ID Proof, Qualifications)"
              folder="janta-live-setu/documents"
              accept="image/*,.pdf"
              currentUrl={documentsUrl}
              onFileUploaded={(url) => setDocumentsUrl(url)}
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
              label="Email Address"
              value={email}
              disabled
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Father's Name"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              required
            />
            <Input
              label="Mother's Name"
              value={motherName}
              onChange={(e) => setMotherName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Number"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              required
            />
            <Input
              label="Emergency Contact Number"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              required
            />
          </div>

          <Input
            label="Residential Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />

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

          {error && <p className="text-xs text-red-600 font-medium text-center">{error}</p>}

          <Button type="submit" variant="primary" className="w-full" loading={loading} disabled={loading}>
            {loading ? 'Submitting Profile...' : 'Submit Profile for Director Approval'}
          </Button>

          <p className="text-[11px] text-gray-400 font-medium text-center">Secure with Janta Live Setu</p>
        </form>
      </Card>
    </div>
  );
};
