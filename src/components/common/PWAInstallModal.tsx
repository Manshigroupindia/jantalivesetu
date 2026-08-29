import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Download, Share, Monitor, Smartphone, HelpCircle } from 'lucide-react';
import { usePWA } from '../../contexts/PWAContext';
import { useCompany } from '../../contexts/CompanyContext';

export const PWAInstallModal: React.FC = () => {
  const { installModalOpen, closeInstallModal, deferredPrompt, triggerInstall, isIOS, isMobile } = usePWA();
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
            Install Janta Live Setu on your desktop or mobile device for quick, app-like access.
          </p>
        </div>

        {/* CONDITION 1: NATIVE INSTALL PROMPT AVAILABLE */}
        {deferredPrompt ? (
          <div className="bg-brand-50/60 border border-brand-100 rounded-2xl p-4 text-center space-y-3">
            <p className="text-xs font-semibold text-brand-900">
              Your browser supports direct one-click installation!
            </p>
            <Button
              variant="primary"
              size="lg"
              icon={<Download className="w-4 h-4" />}
              onClick={triggerInstall}
              className="w-full justify-center font-bold py-3 text-sm rounded-xl shadow-md"
            >
              Install App Now
            </Button>
          </div>
        ) : (
          /* CONDITION 2: PLATFORM-SPECIFIC INSTRUCTIONS */
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-800 border-b border-gray-200 pb-2">
              <HelpCircle className="w-4 h-4 text-brand-600" />
              <span>How to Install Manually</span>
            </div>

            {isIOS ? (
              <div className="space-y-2 text-xs text-gray-700 font-medium">
                <p className="flex items-center gap-2 font-bold text-brand-700">
                  <Share className="w-4 h-4" /> Safari on iPhone / iPad:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 pl-1">
                  <li>Tap the <strong>Share</strong> button (⎋) at the bottom of your browser.</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong> (➕).</li>
                  <li>Tap <strong>Add</strong> in the top right corner.</li>
                </ol>
              </div>
            ) : isMobile ? (
              <div className="space-y-2 text-xs text-gray-700 font-medium">
                <p className="flex items-center gap-2 font-bold text-brand-700">
                  <Smartphone className="w-4 h-4" /> Chrome / Edge on Android:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 pl-1">
                  <li>Tap the browser <strong>menu icon</strong> (⋮) in the top right corner.</li>
                  <li>Select <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li>
                  <li>Follow the screen prompt to complete installation.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-gray-700 font-medium">
                <p className="flex items-center gap-2 font-bold text-brand-700">
                  <Monitor className="w-4 h-4" /> Chrome / Edge Desktop:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 pl-1">
                  <li>Click the <strong>Install icon</strong> (⬇) in the address bar (right side).</li>
                  <li>OR click the browser menu (⋮ / ⋯) → <strong>Save and Share</strong> → <strong>Install Janta Live Setu</strong>.</li>
                  <li>Confirm installation to create a desktop shortcut.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="pt-2 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={closeInstallModal} className="w-full justify-center">
            Close / Maybe Later
          </Button>
        </div>

        <p className="text-[11px] text-gray-400 font-medium">Secure with Janta Live Setu</p>
      </div>
    </Modal>
  );
};
