import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { FileUploader } from '../common/FileUploader';
import { Building, Lock, CheckCircle2, Shield, MapPin, Sparkles } from 'lucide-react';
import { setCompanySettings, setUserDoc } from '../../services/firestoreService';
import { setSecurityPin } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { logAuditEvent } from '../../services/auditService';

export const DirectorSetupWizard: React.FC = () => {
  const { userDoc, refreshUserDoc } = useAuth();
  const { refetchCompanySettings } = useCompany();
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState('Janta Live');
  const [logoUrl, setLogoUrl] = useState('');
  const [deityImageUrl, setDeityImageUrl] = useState('');
  const [headOfficeAddress, setHeadOfficeAddress] = useState('Regd By Govt of India Vide Reg No. U92190DL2021PTC386070, New Delhi, India');
  const [officeLocationName, setOfficeLocationName] = useState('Headquarters, New Delhi');
  const [latitude, setLatitude] = useState(28.6139);
  const [longitude, setLongitude] = useState(77.2090);
  const [googleMapsUrl, setGoogleMapsUrl] = useState('https://maps.google.com/?q=28.6139,77.2090');
  const [websiteUrl, setWebsiteUrl] = useState('https://jantalive.com');
  const [helplineNumber, setHelplineNumber] = useState('+91 98765 43210');
  const [phoneNumbers, setPhoneNumbers] = useState('+91 98765 43210, +91 98765 43211');
  const [emailAddresses, setEmailAddresses] = useState('devenjhaofficial@gmail.com, support@jantalive.com');

  // Security PIN state
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleFinishSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc) return;

    if (pin.length !== 4) {
      setError('Security PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PIN confirmation does not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nowIso = new Date().toISOString();

      // 1. Save canonical company settings document with explicit setup completion flags
      await setCompanySettings({
        companyName,
        logoUrl,
        deityImageUrl,
        headOfficeAddress,
        officeLocationName,
        latitude,
        longitude,
        googleMapsUrl,
        websiteUrl,
        helplineNumber,
        phoneNumbers: phoneNumbers.split(',').map((s) => s.trim()),
        emailAddresses: emailAddresses.split(',').map((s) => s.trim()),
        isSetupCompleted: true,
        setupCompleted: true,
        setupCompletedAt: nowIso,
      });

      // 2. Set Security PIN for Director
      await setSecurityPin(userDoc.uid, pin);

      // 3. Mark First Login Completed in user document
      await setUserDoc(userDoc.uid, { firstLoginCompleted: true });

      // 4. Record Audit Log
      await logAuditEvent({
        userId: userDoc.uid,
        userName: 'Director',
        userRole: 'director',
        action: 'COMPANY_SETUP_COMPLETED',
        module: 'companySettings',
      });

      // 5. Re-fetch company settings & user doc to confirm setup state
      if (refetchCompanySettings) {
        await refetchCompanySettings();
      }
      await refreshUserDoc();

      // 6. Navigate to Dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Director setup error:', err);
      setError('Company setup could not be completed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4 sm:p-6">
      <Card className="max-w-2xl w-full shadow-2xl border-gray-100 p-6 sm:p-8 space-y-6">
        {/* HEADER */}
        <div className="text-center space-y-2 border-b pb-5 border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-brand-200">
            <Building className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Company Setup Wizard</h2>
          <p className="text-xs text-gray-500 font-medium">
            Welcome Director! Please complete the mandatory Janta Live company initialization.
          </p>
        </div>

        {/* STEP PROGRESS BAR */}
        <div className="flex items-center justify-between px-4">
          <div className={`flex items-center gap-2 text-xs font-extrabold ${step === 1 ? 'text-brand-600' : 'text-emerald-600'}`}>
            <span className="w-6 h-6 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center">1</span>
            <span>Info & Contact</span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-gray-200" />
          <div className={`flex items-center gap-2 text-xs font-extrabold ${step === 2 ? 'text-brand-600' : 'text-gray-400'}`}>
            <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">2</span>
            <span>Branding & Location</span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-gray-200" />
          <div className={`flex items-center gap-2 text-xs font-extrabold ${step === 3 ? 'text-brand-600' : 'text-gray-400'}`}>
            <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">3</span>
            <span>Security PIN</span>
          </div>
        </div>

        {/* STEP 1: INFO & CONTACT */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <Input
              label="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />

            <Input
              label="Head Office Address"
              value={headOfficeAddress}
              onChange={(e) => setHeadOfficeAddress(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Helpline Number"
                value={helplineNumber}
                onChange={(e) => setHelplineNumber(e.target.value)}
                required
              />

              <Input
                label="Website URL"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>

            <Input
              label="Multiple Phone Numbers (Comma Separated)"
              value={phoneNumbers}
              onChange={(e) => setPhoneNumbers(e.target.value)}
            />

            <Input
              label="Multiple Email Addresses (Comma Separated)"
              value={emailAddresses}
              onChange={(e) => setEmailAddresses(e.target.value)}
            />

            <Button type="button" variant="primary" className="w-full mt-4" onClick={() => setStep(2)}>
              Continue to Branding & Location
            </Button>
          </div>
        )}

        {/* STEP 2: BRANDING & LOCATION */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <FileUploader
              label="Janta Live Official Logo"
              folder="janta-live-setu/company"
              currentUrl={logoUrl}
              onFileUploaded={(url) => setLogoUrl(url)}
            />

            <FileUploader
              label="Optional Deity / God Image"
              folder="janta-live-setu/company"
              currentUrl={deityImageUrl}
              onFileUploaded={(url) => setDeityImageUrl(url)}
            />

            <Input
              label="Office Location Name"
              value={officeLocationName}
              onChange={(e) => setOfficeLocationName(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
              />
              <Input
                label="Longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
              />
            </div>

            <Input
              label="Google Maps Link"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
            />

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="w-1/3" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="button" variant="primary" className="w-2/3" onClick={() => setStep(3)}>
                Continue to Security PIN
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: SECURITY PIN & FINISH */}
        {step === 3 && (
          <form onSubmit={handleFinishSetup} className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-brand-50/50 p-4 rounded-xl border border-brand-100 text-center space-y-1">
              <Shield className="w-6 h-6 text-brand-600 mx-auto" />
              <h4 className="text-sm font-bold text-gray-900">Create Director Security PIN</h4>
              <p className="text-xs text-gray-500">
                This 4-digit PIN will authorize sensitive financial actions, salary payouts, and staff approvals.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="4-Digit Security PIN"
                type="password"
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
              />

              <Input
                label="Confirm Security PIN"
                type="password"
                maxLength={4}
                placeholder="••••"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
              />
            </div>

            {error && <p className="text-xs text-red-600 font-medium text-center">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="w-1/3" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button type="submit" variant="primary" className="w-2/3" loading={loading}>
                Complete Setup & Enter CMS
              </Button>
            </div>
          </form>
        )}

        <p className="text-[11px] text-gray-400 font-medium text-center">Secure with Janta Live Setu</p>
      </Card>
    </div>
  );
};
