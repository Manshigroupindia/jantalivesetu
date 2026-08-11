import React, { createContext, useContext, useState, useRef } from 'react';
import { verifyAccessPassword } from '../firebase/services/settingsService';
import { useAuth } from './AuthContext';
import { logAuditEvent } from '../firebase/services/auditService';

interface SecurityContextType {
  isVerified: boolean;
  requestSecurityVerification: (onSuccess: () => void, title?: string, description?: string) => void;
  verifyEnteredPassword: (password: string) => Promise<boolean>;
  modalOpen: boolean;
  modalTitle: string;
  modalDescription: string;
  closeModal: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('Security Access Required');
  const [modalDescription, setModalDescription] = useState<string>(
    'Please enter the Website Access Password to perform this sensitive action.'
  );

  const pendingActionRef = useRef<(() => void) | null>(null);
  const verifyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const grantTemporarySession = () => {
    setIsVerified(true);
    if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
    
    // Auto lock verified session after 60 seconds
    verifyTimerRef.current = setTimeout(() => {
      setIsVerified(false);
    }, 60000);
  };

  const requestSecurityVerification = (onSuccess: () => void, title?: string, description?: string) => {
    if (isVerified) {
      onSuccess();
      return;
    }
    
    pendingActionRef.current = onSuccess;
    if (title) setModalTitle(title);
    if (description) setModalDescription(description);
    setModalOpen(true);
  };

  const verifyEnteredPassword = async (enteredPassword: string): Promise<boolean> => {
    const valid = await verifyAccessPassword(enteredPassword);
    if (valid) {
      grantTemporarySession();
      setModalOpen(false);

      if (profile) {
        await logAuditEvent(
          profile.uid,
          profile.displayName,
          profile.role,
          'VIEW_SENSITIVE_DATA',
          'security',
          'access_verification',
          'Access password verified'
        );
      }

      if (pendingActionRef.current) {
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        action();
      }
      return true;
    }
    return false;
  };

  const closeModal = () => {
    setModalOpen(false);
    pendingActionRef.current = null;
  };

  return (
    <SecurityContext.Provider
      value={{
        isVerified,
        requestSecurityVerification,
        verifyEnteredPassword,
        modalOpen,
        modalTitle,
        modalDescription,
        closeModal,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = (): SecurityContextType => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};
