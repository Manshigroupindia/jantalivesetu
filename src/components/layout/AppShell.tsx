import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { PinVerificationModal } from '../security/PinVerificationModal';
import { ReauthenticationModal } from '../security/ReauthenticationModal';
import { ErrorBoundary } from '../common/ErrorBoundary';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-surface-bg flex flex-col md:flex-row text-gray-900 selection:bg-brand-500 selection:text-white">
        {/* DESKTOP SIDEBAR */}
        <Sidebar />

        {/* MAIN CONTENT WRAPPER */}
        <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
          {/* MOBILE HEADER & DRAWER */}
          <MobileNav />

          {/* DESKTOP HEADER */}
          <Header />

          {/* MAIN PAGE VIEW */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
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
