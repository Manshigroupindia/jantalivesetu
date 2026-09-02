import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FileUploader } from '../../components/common/FileUploader';
import { NotificationSettingsCard } from '../../components/common/NotificationSettingsCard';
import { Settings, Lock, Building } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { setCompanySettings } from '../../services/firestoreService';
import { setSecurityPin } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { useSecurity } from '../../contexts/SecurityContext';
import { useNotification } from '../../contexts/NotificationContext';

export const SettingsPage: React.FC = () => {
  const { companySettings } = useCompany();
  const { userDoc } = useAuth();
  const { requirePinVerification } = useSecurity();
  const { showToast } = useNotification();

  const [companyName, setCompanyName] = useState(companySettings?.companyName || 'Janta Live');
  const [logoUrl, setLogoUrl] = useState(companySettings?.logoUrl || '');
  const [deityImageUrl, setDeityImageUrl] = useState(companySettings?.deityImageUrl || '');
  const [headOfficeAddress, setHeadOfficeAddress] = useState(companySettings?.headOfficeAddress || '');
  const [helplineNumber, setHelplineNumber] = useState(companySettings?.helplineNumber || '');
  const [websiteUrl, setWebsiteUrl] = useState(companySettings?.websiteUrl || '');

  // Rates
  const [teaUnitPrice, setTeaUnitPrice] = useState(companySettings?.teaUnitPrice || 10);
  const [waterBottlePrice, setWaterBottlePrice] = useState(companySettings?.waterBottlePrice || 20);
  const [electricityUnitRate, setElectricityUnitRate] = useState(companySettings?.electricityUnitRate || 14);

  // Security PIN
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveCompanySettings = () => {
    requirePinVerification('Update Company & CMS Settings', async () => {
      setSaving(true);
      try {
        await setCompanySettings({
          companyName,
          logoUrl,
          deityImageUrl,
          headOfficeAddress,
          helplineNumber,
          websiteUrl,
          teaUnitPrice,
          waterBottlePrice,
          electricityUnitRate,
          isSetupCompleted: true,
          setupCompleted: true,
        });

        showToast('Company settings saved.', 'success');
      } catch (err) {
        showToast('Failed to save settings.', 'error');
      } finally {
        setSaving(false);
      }
    });
  };

  const handleUpdatePin = () => {
    if (!userDoc) return;
    if (newPin.length !== 4 || newPin !== confirmPin) {
      showToast('PIN must be 4 digits and match confirmation.', 'warning');
      return;
    }

    requirePinVerification('Update 4-Digit Security PIN', async () => {
      try {
        await setSecurityPin(userDoc.uid, newPin);
        setNewPin('');
        setConfirmPin('');
        showToast('Security PIN updated successfully.', 'success');
      } catch (err) {
        showToast('Failed to update PIN.', 'error');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-brand-600" />
          CMS & Branding Settings
        </h1>
        <p className="text-xs text-gray-500 font-medium">
          Configure company branding, logo, head office details, utility unit rates, and security PIN.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COMPANY SETTINGS */}
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-extrabold text-gray-900 border-b pb-2 flex items-center gap-2">
            <Building className="w-5 h-5 text-brand-600" /> Company Info & Branding
          </h3>

          <Input label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <Input label="Head Office Address" value={headOfficeAddress} onChange={(e) => setHeadOfficeAddress(e.target.value)} />

          <FileUploader
            label="Company Logo"
            folder="janta-live-setu/company"
            currentUrl={logoUrl}
            onFileUploaded={(url) => setLogoUrl(url)}
          />

          <FileUploader
            label="Optional Deity Image"
            folder="janta-live-setu/company"
            currentUrl={deityImageUrl}
            onFileUploaded={(url) => setDeityImageUrl(url)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Helpline Number" value={helplineNumber} onChange={(e) => setHelplineNumber(e.target.value)} />
            <Input label="Website URL" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3 border-t pt-4">
            <Input label="Tea Rate (₹)" type="number" value={teaUnitPrice} onChange={(e) => setTeaUnitPrice(parseFloat(e.target.value))} />
            <Input label="Water Rate (₹)" type="number" value={waterBottlePrice} onChange={(e) => setWaterBottlePrice(parseFloat(e.target.value))} />
            <Input label="Power Rate (₹)" type="number" value={electricityUnitRate} onChange={(e) => setElectricityUnitRate(parseFloat(e.target.value))} />
          </div>

          <Button variant="primary" className="w-full" loading={saving} onClick={handleSaveCompanySettings}>
            Save Settings (Requires PIN)
          </Button>
        </Card>

        {/* SECURITY PIN UPDATE */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-extrabold text-gray-900 border-b pb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-brand-600" /> Update Security PIN
            </h3>

            <Input
              label="New 4-Digit PIN"
              type="password"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />

            <Input
              label="Confirm New PIN"
              type="password"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />

            <Button variant="secondary" className="w-full" onClick={handleUpdatePin}>
              Update Security PIN
            </Button>
          </Card>

          <NotificationSettingsCard />
        </div>
      </div>
    </div>
  );
};
