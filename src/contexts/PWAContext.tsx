import React, { createContext, useContext, useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface WindowWithMSStream extends Window {
  MSStream?: unknown;
}

interface PWAContextType {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isStandalone: boolean;
  isIOS: boolean;
  isMobile: boolean;
  installMessage: string | null;
  clearInstallMessage: () => void;
  installApp: () => Promise<void>;
  triggerInstall: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType>({
  deferredPrompt: null,
  isStandalone: false,
  isIOS: false,
  isMobile: false,
  installMessage: null,
  clearInstallMessage: () => {},
  installApp: async () => {},
  triggerInstall: async () => {},
});

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);

  useEffect(() => {
    console.log('[PWA] Provider initialized');

    const checkStandalone = (): boolean => {
      const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
      const nav = window.navigator as NavigatorWithStandalone;
      const isNavStandalone = nav.standalone === true;
      return isStandaloneMatch || isNavStandalone;
    };

    const standaloneState = checkStandalone();
    setIsStandalone(standaloneState);

    if (standaloneState) {
      console.log('[PWA] Running in standalone mode');
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const win = window as WindowWithMSStream;
    const iosDevice = /iphone|ipad|ipod/.test(userAgent) && !win.MSStream;
    setIsIOS(iosDevice);
    setIsMobile(window.innerWidth <= 768 || /mobile|android|touch/.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('[PWA] beforeinstallprompt fired');
      console.log('[PWA] deferredPrompt stored');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      console.log('[PWA] appinstalled fired');
      setDeferredPrompt(null);
      setIsStandalone(true);
      setInstallMessage(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const clearInstallMessage = () => setInstallMessage(null);

  const installApp = async () => {
    console.log('[PWA] Install button clicked');

    if (deferredPrompt) {
      try {
        console.log('[PWA] Native install prompt requested');
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        console.log(`[PWA] User choice: ${choiceResult.outcome}`);

        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] Native installation accepted by user');
          setDeferredPrompt(null);
          setIsStandalone(true);
        } else {
          console.log('[PWA] Native installation dismissed by user');
        }
      } catch (err) {
        console.error('[PWA] Error executing native install prompt:', err);
      }
    } else {
      console.log('[PWA] Native prompt not available (deferredPrompt is null)');
      setInstallMessage(
        'PWA installation is currently unavailable in this browser or app is already installed.'
      );
      setTimeout(() => {
        setInstallMessage(null);
      }, 6000);
    }
  };

  return (
    <PWAContext.Provider
      value={{
        deferredPrompt,
        isStandalone,
        isIOS,
        isMobile,
        installMessage,
        clearInstallMessage,
        installApp,
        triggerInstall: installApp,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => useContext(PWAContext);
