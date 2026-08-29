import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { Button } from '../ui/Button';
import { useCompany } from '../../contexts/CompanyContext';

// Proper TypeScript definition for BeforeInstallPromptEvent
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const STORAGE_KEY_DISMISSED = 'jantaLiveSetuPWADismissedAt';
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 Hours temporary dismissal cooldown

export const PWAInstallPrompt: React.FC = () => {
  const { companySettings } = useCompany();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // 1. Detect Standalone Mode (Only hide if actually running inside standalone PWA window)
    const checkStandalone = (): boolean => {
      const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
      const isNavStandalone = (navigator as any).standalone === true;
      return isStandaloneMatch || isNavStandalone;
    };

    const standalone = checkStandalone();
    setIsStandalone(standalone);
    if (standalone) {
      console.log('[PWA] App is running in standalone mode.');
    }

    // 2. Check 24-hour dismissal timestamp
    const dismissedTime = localStorage.getItem(STORAGE_KEY_DISMISSED);
    if (dismissedTime) {
      const elapsed = Date.now() - parseInt(dismissedTime, 10);
      if (elapsed < DISMISS_COOLDOWN_MS) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(STORAGE_KEY_DISMISSED);
        setIsDismissed(false);
      }
    }

    // 3. Detect Device Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(iosDevice);
    setIsMobile(window.innerWidth <= 768 || /mobile|android|touch/.test(userAgent));

    // 4. Capture native beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('[PWA] beforeinstallprompt event captured successfully.');
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
    };

    // 5. Capture native appinstalled event
    const handleAppInstalled = () => {
      console.log('[PWA] appinstalled event captured.');
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // HIDE IF: Running in standalone mode OR user dismissed within 24 hours
  if (isStandalone || isDismissed) {
    return null;
  }

  // HIDE IF: Neither deferredPrompt nor iOS instructions are applicable
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  // Trigger Native PWA Install Prompt
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      console.log('[PWA] Triggering native installation prompt...');
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      console.log(`[PWA] User choice outcome: ${choiceResult.outcome}`);
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      } else {
        handleDismiss();
      }
    } catch (err) {
      console.error('[PWA] Error triggering install prompt:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  // Handle Temporary Dismissal (×)
  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(STORAGE_KEY_DISMISSED, Date.now().toString());
  };

  return (
    <div className="fixed top-3 left-3 right-3 md:left-auto md:right-6 md:w-96 z-50 animate-in slide-in-from-top-4 duration-300">
      <div className="bg-white border-2 border-brand-100 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 relative overflow-hidden backdrop-blur-md bg-white/95">
        {/* TOP ACCENT LINE */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-red-600" />

        {/* LOGO & DETAILS */}
        <div className="flex items-center gap-3 min-w-0">
          {companySettings?.logoUrl ? (
            <img
              src={companySettings.logoUrl}
              alt={companySettings.companyName || 'Company Logo'}
              className="w-10 h-10 rounded-xl object-contain shadow-md shrink-0 border border-gray-100 bg-white p-0.5"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-black text-sm flex items-center justify-center shadow-md shrink-0 border border-brand-700">
              {companySettings?.companyName ? companySettings.companyName.substring(0, 2).toUpperCase() : 'JL'}
            </div>
          )}

          <div className="truncate">
            <h4 className="text-xs font-black text-gray-900 tracking-tight flex items-center gap-1.5 truncate">
              {isMobile
                ? `Download ${companySettings?.companyName || 'Janta Live Setu'}`
                : `Install ${companySettings?.companyName || 'Janta Live Setu'}`}
            </h4>
            <p className="text-[11px] font-semibold text-gray-500 truncate">
              {isIOS
                ? 'Tap Share → Add to Home Screen'
                : isMobile
                ? 'Install the app for faster access.'
                : 'Add to desktop for instant access.'}
            </p>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2 shrink-0">
          {deferredPrompt ? (
            <Button
              variant="primary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleInstallClick}
              className="text-xs font-bold py-1.5 px-3 rounded-xl shadow-sm"
            >
              {isMobile ? 'Download App' : 'Install App'}
            </Button>
          ) : isIOS ? (
            <div className="flex items-center gap-1 text-[11px] font-bold text-brand-600 bg-brand-50 px-2.5 py-1.5 rounded-xl border border-brand-200">
              <Share className="w-3.5 h-3.5" />
              <span>Share</span>
            </div>
          ) : null}

          {/* CLOSE BUTTON */}
          <button
            onClick={handleDismiss}
            aria-label="Close install prompt"
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
