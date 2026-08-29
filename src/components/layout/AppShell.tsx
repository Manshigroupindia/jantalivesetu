import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { LockScreen } from '../security/LockScreen';
import { PinVerificationModal } from '../security/PinVerificationModal';
import { ReauthenticationModal } from '../security/ReauthenticationModal';
import { PWAInstallPrompt } from '../common/PWAInstallPrompt';
import { PWAInstallModal } from '../common/PWAInstallModal';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { usePWA } from '../../contexts/PWAContext';
import { AlertCircle, X } from 'lucide-react';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { installMessage, clearInstallMessage } = usePWA();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-surface-bg flex flex-col md:flex-row text-gray-900 selection:bg-brand-500 selection:text-white">
        {/* FULL SCREEN LOCK OVERLAY */}
        <LockScreen />

        {/* PWA INSTALL BANNER & GUIDE MODAL */}
        <PWAInstallPrompt />
        <PWAInstallModal />

        {/* PWA UNAVAILABLE TOAST */}
        {installMessage && (
          <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:right-6 md:left-auto z-50 max-w-sm bg-gray-900 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-xs border border-gray-700 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-medium leading-tight">{installMessage}</span>
            </div>
            <button onClick={clearInstallMessage} className="text-gray-400 hover:text-white p-1 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* DESKTOP SIDEBAR */}
        <Sidebar />

        {/* MAIN CONTENT WRAPPER */}
        <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
          {/* MOBILE HEADER & DRAWER */}
          <MobileNav />

          {/* DESKTOP HEADER */}
          <Header />

          {/* MAIN PAGE VIEW */}
          <main key={location.pathname} className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
            {children}
          </main>
        </div>

        {/* REUSABLE SECURITY MODALS */}
        <PinVerificationModal />
        <ReauthenticationModal />
      </div>
    </ErrorBoundary>
  );
};
