import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { SecurityProvider } from './contexts/SecurityContext';
import { NotificationProvider } from './contexts/NotificationContext';

import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/security/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';

import { LoginPage } from './features/auth/LoginPage';
import { DirectorSetupWizard } from './components/setup/DirectorSetupWizard';
import { StaffProfileWizard } from './components/setup/StaffProfileWizard';
import { PendingApprovalPage } from './features/auth/PendingApprovalPage';

import { ExecutiveDashboard } from './features/dashboard/ExecutiveDashboard';
import { StaffDashboard } from './features/dashboard/StaffDashboard';

import { WorkAssignmentPage } from './features/work/WorkAssignmentPage';
import { AttendancePage } from './features/attendance/AttendancePage';
import { ChatPage } from './features/chat/ChatPage';
import { ExpensesPage } from './features/expenses/ExpensesPage';
import { StaffExpenseDetailPage } from './features/expenses/StaffExpenseDetailPage';
import { SalaryPage } from './features/salary/SalaryPage';
import { StaffListPage } from './features/staff/StaffListPage';
import { StaffDetailPage } from './features/staff/StaffDetailPage';

import { TeaSnacksPage } from './features/office/TeaSnacksPage';
import { WaterRecordPage } from './features/office/WaterRecordPage';
import { ElectricityRecordPage } from './features/office/ElectricityRecordPage';
import { OfficeRentPage } from './features/office/OfficeRentPage';
import { OfficeCleanlinessPage } from './features/office/OfficeCleanlinessPage';

import { NoticeBoardPage } from './features/notices/NoticeBoardPage';
import { HolidayCalendarPage } from './features/notices/HolidayCalendarPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { AuditLogsPage } from './features/audit/AuditLogsPage';
import { ClientDirectoryPage } from './features/clients/ClientDirectoryPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { NotFoundPage } from './features/error/NotFoundPage';

const DashboardResolver: React.FC = () => {
  const { userDoc } = useAuth();
  if (userDoc?.role === 'director') {
    return <ExecutiveDashboard />;
  }
  return <StaffDashboard />;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NotificationProvider>
          <AuthProvider>
            <CompanyProvider>
              <SecurityProvider>
              <Routes>
                {/* AUTH ROUTES */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/pending-approval" element={<PendingApprovalPage />} />

                {/* SETUP WIZARDS */}
                <Route path="/setup/director" element={<DirectorSetupWizard />} />
                <Route path="/setup/staff" element={<StaffProfileWizard />} />

                {/* PROTECTED CMS APP SHELL ROUTES */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <AppShell>
                        <Routes>
                          <Route path="dashboard" element={<DashboardResolver />} />
                          <Route path="profile" element={<ProfilePage />} />
                          <Route path="work" element={<WorkAssignmentPage />} />
                          <Route path="attendance" element={<AttendancePage />} />
                          <Route path="chat" element={<ChatPage />} />
                          <Route path="expenses" element={<ExpensesPage />} />
                          <Route path="expenses/staff/:staffId" element={<StaffExpenseDetailPage />} />
                          <Route path="salary" element={<SalaryPage />} />
                          <Route path="staff" element={<StaffListPage />} />
                          <Route path="staff/:id" element={<StaffDetailPage />} />

                          <Route path="tea-snacks" element={<TeaSnacksPage />} />
                          <Route path="water" element={<WaterRecordPage />} />
                          <Route path="electricity" element={<ElectricityRecordPage />} />
                          <Route path="office/rent" element={<OfficeRentPage />} />
                          <Route path="office/cleanliness" element={<OfficeCleanlinessPage />} />
                          <Route path="office/toilet-cleaning" element={<OfficeCleanlinessPage />} />

                          <Route path="notices" element={<NoticeBoardPage />} />
                          <Route path="holidays" element={<HolidayCalendarPage />} />
                          <Route path="reports" element={<ReportsPage />} />
                          <Route path="audit" element={<AuditLogsPage />} />
                          <Route path="clients" element={<ClientDirectoryPage />} />
                          <Route path="settings" element={<SettingsPage />} />

                          <Route path="404" element={<NotFoundPage />} />
                          <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                      </AppShell>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </SecurityProvider>
          </CompanyProvider>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
