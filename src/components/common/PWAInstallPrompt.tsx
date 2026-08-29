import React, { useState, useEffect } from 'react';
import { Download, X, Share, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

// Proper TypeScript definition for BeforeInstallPromptEvent
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const STORAGE_KEY_INSTALLED = 'jantaLiveSetuPWAInstalled';
const STORAGE_KEY_DISMISSED = 'jantaLiveSetuPWADismissedAt';
const DISMISS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 Days cooldown after manual dismiss

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // 1. Detect Standalone Mode (Already installed & opened as PWA)
    const checkStandalone = () => {
      const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
      const isNavStandalone = (navigator as any).standalone === true;
      return isStandaloneMatch || isNavStandalone;
    };

    const standalone = checkStandalone();
    setIsStandalone(standalone);

    // 2. Check localStorage for permanent install state
    const installedStorage = localStorage.getItem(STORAGE_KEY_INSTALLED) === 'true';
    setIsInstalled(installedStorage);

    // 3. Check dismissal timestamp
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

    // 4. Detect Mobile & iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    setIsIOS(iosDevice);
    setIsMobile(window.innerWidth <= 768 || /mobile|android|touch/.test(userAgent));

    // 5. Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
    };

    // 6. Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem(STORAGE_KEY_INSTALLED, 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // If already running as PWA or installed or dismissed, DO NOT RENDER
  if (isStandalone || isInstalled || isDismissed) {
    return null;
  }

  // If no deferred prompt is available and not iOS, DO NOT RENDER
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  // Handle PWA Installation Click
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        localStorage.setItem(STORAGE_KEY_INSTALLED, 'true');
      } else {
        handleDismiss();
      }
    } catch (err) {
      console.error('Error triggering PWA install prompt:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  // Handle Dismissal (×)
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
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-black text-sm flex items-center justify-center shadow-md shrink-0 border border-brand-700">
            JL
          </div>

          <div className="truncate">
            <h4 className="text-xs font-black text-gray-900 tracking-tight flex items-center gap-1.5 truncate">
              {isMobile ? 'Download Janta Live Setu' : 'Install Janta Live Setu'}
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
