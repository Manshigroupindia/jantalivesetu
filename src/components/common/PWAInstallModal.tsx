import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Share, Monitor, Smartphone, HelpCircle } from 'lucide-react';
import { usePWA } from '../../contexts/PWAContext';
import { useCompany } from '../../contexts/CompanyContext';

export const PWAInstallModal: React.FC = () => {
  const { installModalOpen, closeInstallModal, isIOS, isMobile } = usePWA();
  const { companySettings } = useCompany();

  return (
    <Modal isOpen={installModalOpen} onClose={closeInstallModal} maxWidth="md">
      <div className="py-2 space-y-5 text-center">
        {/* BRAND LOGO */}
        <div className="flex justify-center">
          {companySettings?.logoUrl ? (
            <img
              src={companySettings.logoUrl}
              alt={companySettings.companyName || 'Company Logo'}
              className="w-16 h-16 rounded-2xl object-contain shadow-lg border border-gray-100 bg-white p-1"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white font-black text-2xl flex items-center justify-center shadow-lg border border-brand-700">
              {companySettings?.companyName ? companySettings.companyName.substring(0, 2).toUpperCase() : 'JL'}
            </div>
          )}
        </div>

        {/* HEADER & DESCRIPTION */}
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
            Install {companySettings?.companyName || 'Janta Live Setu'}
          </h3>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Follow these quick steps to add Janta Live Setu to your home screen or desktop.
          </p>
        </div>

        {/* PLATFORM-SPECIFIC INSTRUCTIONS */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800 border-b border-gray-200 pb-2">
            <HelpCircle className="w-4 h-4 text-brand-600" />
            <span>Installation Guide</span>
          </div>

          {isIOS ? (
            <div className="space-y-2 text-xs text-gray-700 font-medium">
              <p className="flex items-center gap-2 font-bold text-brand-700">
                <Share className="w-4 h-4" /> Safari on iPhone / iPad:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600 pl-1">
                <li>Tap the <strong>Share</strong> icon at the bottom of Safari.</li>
                <li>Scroll down and select <strong>Add to Home Screen</strong>.</li>
                <li>Tap <strong>Add</strong> in the top-right corner.</li>
              </ol>
            </div>
          ) : isMobile ? (
            <div className="space-y-2 text-xs text-gray-700 font-medium">
              <p className="flex items-center gap-2 font-bold text-brand-700">
                <Smartphone className="w-4 h-4" /> Chrome / Edge on Android:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600 pl-1">
                <li>Tap the <strong>menu icon (⋮)</strong> in the top right corner.</li>
                <li>Select <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li>
                <li>Confirm to add the app icon to your home screen.</li>
              </ol>
            </div>
          ) : (
            <div className="space-y-2 text-xs text-gray-700 font-medium">
              <p className="flex items-center gap-2 font-bold text-brand-700">
                <Monitor className="w-4 h-4" /> Chrome / Edge Desktop:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600 pl-1">
                <li>Look for the <strong>Install icon (⬇)</strong> on the right side of the address bar.</li>
                <li>OR click the browser menu (⋮ / ⋯) → <strong>Save and Share</strong> → <strong>Install Janta Live Setu</strong>.</li>
                <li>Confirm to launch as a standalone desktop application.</li>
              </ol>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="pt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={closeInstallModal} className="w-full justify-center font-bold">
            Got it / Close
          </Button>
        </div>

        <p className="text-[11px] text-gray-400 font-medium">Secure with Janta Live Setu</p>
      </div>
    </Modal>
  );
};
