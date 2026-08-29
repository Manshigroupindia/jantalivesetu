import React, { createContext, useContext, useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAContextType {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isStandalone: boolean;
  isIOS: boolean;
  isMobile: boolean;
  installModalOpen: boolean;
  openInstallModal: () => void;
  closeInstallModal: () => void;
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
  triggerInstall: async () => {},
});

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [installModalOpen, setInstallModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const checkStandalone = (): boolean => {
      const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
      const isNavStandalone = (navigator as any).standalone === true;
      return isStandaloneMatch || isNavStandalone;
    };

    setIsStandalone(checkStandalone());

    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(iosDevice);
    setIsMobile(window.innerWidth <= 768 || /mobile|android|touch/.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('[PWA] beforeinstallprompt event captured in PWAProvider.');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      console.log('[PWA] appinstalled event captured in PWAProvider.');
      setDeferredPrompt(null);
      setIsStandalone(true);
      setInstallModalOpen(false);
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

  const triggerInstall = async () => {
    if (deferredPrompt) {
      try {
        console.log('[PWA] Triggering native prompt via triggerInstall...');
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        console.log(`[PWA] Choice outcome: ${choiceResult.outcome}`);
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsStandalone(true);
        }
      } catch (err) {
        console.error('[PWA] Error triggering native install prompt:', err);
      } finally {
        setInstallModalOpen(false);
      }
    } else {
      // If native prompt not available yet, open platform instruction modal
      setInstallModalOpen(true);
    }
  };

  return (
    <PWAContext.Provider
      value={{
        deferredPrompt,
        isStandalone,
        isIOS,
        isMobile,
        installModalOpen,
        openInstallModal,
        closeInstallModal,
        triggerInstall,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => useContext(PWAContext);
