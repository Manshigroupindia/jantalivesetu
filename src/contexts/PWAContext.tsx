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

// Module-level global variable to catch beforeinstallprompt BEFORE React mounts
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    console.log('[PWA Global] beforeinstallprompt captured at module level!');
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
  });
}

interface PWAContextType {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isStandalone: boolean;
  isIOS: boolean;
  isMobile: boolean;
  installModalOpen: boolean;
  openInstallModal: () => void;
  closeInstallModal: () => void;
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
  installModalOpen: false,
  openInstallModal: () => {},
  closeInstallModal: () => {},
  installMessage: null,
  clearInstallMessage: () => {},
  installApp: async () => {},
  triggerInstall: async () => {},
});

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [installModalOpen, setInstallModalOpen] = useState<boolean>(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);

  useEffect(() => {
    console.log('[PWA Provider] Initialized');

    // Check if prompt was caught before React mounted
    if (globalDeferredPrompt) {
      console.log('[PWA Provider] Attached pre-captured globalDeferredPrompt');
      setDeferredPrompt(globalDeferredPrompt);
    }

    const checkStandalone = (): boolean => {
      const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
      const nav = window.navigator as NavigatorWithStandalone;
      const isNavStandalone = nav.standalone === true;
      return isStandaloneMatch || isNavStandalone;
    };

    const standaloneState = checkStandalone();
    setIsStandalone(standaloneState);

    if (standaloneState) {
      console.log('[PWA Provider] App running in standalone mode');
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const win = window as WindowWithMSStream;
    const iosDevice = /iphone|ipad|ipod/.test(userAgent) && !win.MSStream;
    setIsIOS(iosDevice);
    setIsMobile(window.innerWidth <= 768 || /mobile|android|touch/.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('[PWA Provider] beforeinstallprompt captured in effect');
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      console.log('[PWA Provider] appinstalled event fired');
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsStandalone(true);
      setInstallModalOpen(false);
      setInstallMessage(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const openInstallModal = () => setInstallModalOpen(true);
  const closeInstallModal = () => setInstallModalOpen(false);
  const clearInstallMessage = () => setInstallMessage(null);

  const installApp = async () => {
    console.log('[PWA Provider] installApp called');
    const activePrompt = deferredPrompt || globalDeferredPrompt;

    if (activePrompt) {
      try {
        console.log('[PWA Provider] Requesting native install prompt');
        await activePrompt.prompt();
        const choiceResult = await activePrompt.userChoice;
        console.log(`[PWA Provider] User choice outcome: ${choiceResult.outcome}`);

        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA Provider] Installation accepted');
          globalDeferredPrompt = null;
          setDeferredPrompt(null);
          setIsStandalone(true);
          setInstallModalOpen(false);
        } else {
          console.log('[PWA Provider] Installation dismissed');
        }
      } catch (err) {
        console.error('[PWA Provider] Error invoking native prompt:', err);
        setInstallModalOpen(true);
      }
    } else {
      console.log('[PWA Provider] Native prompt unavailable - opening instruction modal');
      setInstallModalOpen(true);
    }
  };

  return (
    <PWAContext.Provider
      value={{
        deferredPrompt: deferredPrompt || globalDeferredPrompt,
        isStandalone,
        isIOS,
        isMobile,
        installModalOpen,
        openInstallModal,
        closeInstallModal,
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
