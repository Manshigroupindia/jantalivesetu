import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { Spinner } from '../ui/Spinner';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser, userDoc, staffProfile, loading: authLoading } = useAuth();
  const { companySettings, loading: companyLoading } = useCompany();
  const location = useLocation();

  if (authLoading || companyLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-bg gap-3">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-gray-500">Secure with Janta Live Setu...</p>
      </div>
    );
  }

  if (!firebaseUser || !userDoc) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Single Source of Truth for Director Company Setup Completion
  const isDirectorSetupComplete = Boolean(
    (companySettings?.setupCompleted === true || companySettings?.isSetupCompleted === true) &&
    userDoc.firstLoginCompleted === true
  );

  if (userDoc.role === 'director') {
    if (!isDirectorSetupComplete) {
      if (location.pathname !== '/setup/director') {
        return <Navigate to="/setup/director" replace />;
      }
    } else {
      // If director setup IS complete and path is /setup/director, route to /dashboard
      if (location.pathname === '/setup/director') {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  // Staff First Login Profile Completion & Approval Guard
  if (userDoc.role === 'staff') {
    if (userDoc.status === 'pending_profile' || !staffProfile) {
      if (location.pathname !== '/setup/staff') {
        return <Navigate to="/setup/staff" replace />;
      }
    } else if (userDoc.status === 'under_review' || !userDoc.approved) {
      if (location.pathname !== '/pending-approval') {
        return <Navigate to="/pending-approval" replace />;
      }
    } else if (userDoc.status === 'suspended' || userDoc.status === 'deactivated') {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="bg-white p-8 rounded-2xl border border-red-200 shadow-card max-w-md text-center space-y-3">
            <h2 className="text-xl font-bold text-red-600">Access Restricted</h2>
            <p className="text-sm text-gray-600">
              Your account has been deactivated or suspended. Please contact the Director.
            </p>
            <p className="text-xs text-gray-400">Secure with Janta Live Setu</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
