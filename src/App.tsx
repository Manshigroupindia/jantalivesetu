import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SecurityProvider } from './contexts/SecurityContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Pages
import { LoginPage } from './pages/LoginPage';
import { SecurityVerificationPage } from './pages/SecurityVerificationPage';
import { DashboardHome } from './pages/DashboardHome';
import { WebsitesPage } from './pages/WebsitesPage';
import { WebsiteFormPage } from './pages/WebsiteFormPage';
import { WebsiteDetailPage } from './pages/WebsiteDetailPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { GmailAccountsPage } from './pages/GmailAccountsPage';
import { PlatformsPage } from './pages/PlatformsPage';
import { SocialMediaPage } from './pages/SocialMediaPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { AccessSecurityPage } from './pages/AccessSecurityPage';

// Protected Route Guard Component (Requires both Firebase Auth + Security PIN Verification)
const ProtectedRoute: React.FC<{ children: React.ReactNode; requireSuperAdmin?: boolean }> = ({
  children,
  requireSuperAdmin = false,
}) => {
  const { currentUser, securityVerified, isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs font-semibold">
        Loading Application Security Context...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!securityVerified) {
    return <Navigate to="/security-verification" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SecurityProvider>
          <NotificationProvider>
            <Routes>
              {/* Login Page (Step 1) */}
              <Route path="/login" element={<LoginPage />} />

              {/* 2-Step Security Verification Page (Step 2) */}
              <Route path="/security-verification" element={<SecurityVerificationPage />} />

              {/* Protected Workspace Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardHome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/websites"
                element={
                  <ProtectedRoute>
                    <WebsitesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/websites/new"
                element={
                  <ProtectedRoute>
                    <WebsiteFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/websites/:id"
                element={
                  <ProtectedRoute>
                    <WebsiteDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/websites/:id/edit"
                element={
                  <ProtectedRoute>
                    <WebsiteFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/categories"
                element={
                  <ProtectedRoute>
                    <CategoriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/gmail"
                element={
                  <ProtectedRoute>
                    <GmailAccountsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/platforms"
                element={
                  <ProtectedRoute>
                    <PlatformsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social"
                element={
                  <ProtectedRoute>
                    <SocialMediaPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees"
                element={
                  <ProtectedRoute requireSuperAdmin>
                    <EmployeesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/access-security"
                element={
                  <ProtectedRoute requireSuperAdmin>
                    <AccessSecurityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </NotificationProvider>
        </SecurityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
