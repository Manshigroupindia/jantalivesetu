import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface SecurityContextType {
  isPinLocked: boolean;
  lockPinSession: () => void;
  unlockPinSession: () => void;
  requirePinVerification: (actionName: string, onVerified: () => void) => void;
  requireReauthVerification: (actionName: string, onVerified: () => void) => void;
  activeActionName: string | null;
  pendingCallback: (() => void) | null;
  cancelSecurityVerification: () => void;
  pinModalOpen: boolean;
  reauthModalOpen: boolean;
}

const SecurityContext = createContext<SecurityContextType>({
  isPinLocked: false,
  lockPinSession: () => {},
  unlockPinSession: () => {},
  requirePinVerification: () => {},
  requireReauthVerification: () => {},
  activeActionName: null,
  pendingCallback: null,
  cancelSecurityVerification: () => {},
  pinModalOpen: false,
  reauthModalOpen: false,
});

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userDoc } = useAuth();
  const [isPinLocked, setIsPinLocked] = useState<boolean>(() => {
    return sessionStorage.getItem('jantaLiveSetuSessionLocked') === 'true';
  });
  const [pinModalOpen, setPinModalOpen] = useState<boolean>(false);
  const [reauthModalOpen, setReauthModalOpen] = useState<boolean>(false);
  const [activeActionName, setActiveActionName] = useState<string | null>(null);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  // Tab switch & background inactivity detector
  useEffect(() => {
    if (!userDoc || !userDoc.pinHash) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // When tab is hidden/switched away, lock PIN session according to security policy
        lockPinSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userDoc]);

  const lockPinSession = () => {
    setIsPinLocked(true);
    sessionStorage.setItem('jantaLiveSetuSessionLocked', 'true');
  };

  const unlockPinSession = () => {
    setIsPinLocked(false);
    sessionStorage.removeItem('jantaLiveSetuSessionLocked');
    setPinModalOpen(false);
  };

  const requirePinVerification = (actionName: string, onVerified: () => void) => {
    setActiveActionName(actionName);
    setPendingCallback(() => onVerified);
    setPinModalOpen(true);
  };

  const requireReauthVerification = (actionName: string, onVerified: () => void) => {
    setActiveActionName(actionName);
    setPendingCallback(() => onVerified);
    setReauthModalOpen(true);
  };

  const cancelSecurityVerification = () => {
    setPinModalOpen(false);
    setReauthModalOpen(false);
    setActiveActionName(null);
    setPendingCallback(null);
  };

  return (
    <SecurityContext.Provider
      value={{
        isPinLocked,
        lockPinSession,
        unlockPinSession,
        requirePinVerification,
        requireReauthVerification,
        activeActionName,
        pendingCallback,
        cancelSecurityVerification,
        pinModalOpen,
        reauthModalOpen,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => useContext(SecurityContext);
