import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/toast';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';

// Auth Pages
import { LoginPage } from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { AcceptInvitationPage } from '@/features/auth/AcceptInvitationPage';

// Dashboards
import { DashboardRouter } from '@/features/dashboard/DashboardRouter';

// Active Features
import { LeadKanbanPage } from '@/features/leads/LeadKanbanPage';
import { SaleListPage } from '@/features/sales/SaleListPage';
import { CreateSalePage } from '@/features/sales/CreateSalePage';
import { ProductListPage } from '@/features/products/ProductListPage';
import { CustomerListPage } from '@/features/customers/CustomerListPage';
import { CustomerDetailPage } from '@/features/customers/CustomerDetailPage';
import { MailPage } from '@/features/mail/MailPage';

// Targets & Gamification
import { TargetListPage } from '@/features/targets/TargetListPage';
import { LeaderboardPage } from '@/features/gamification/LeaderboardPage';
import { XPPage } from '@/features/gamification/XPPage';
import { AchievementsPage } from '@/features/gamification/AchievementsPage';

// Compensation & Earnings
import { CommissionListPage } from '@/features/commissions/CommissionListPage';
import { BonusListPage } from '@/features/bonuses/BonusListPage';
import { CompensationDashboardPage } from '@/features/compensation/CompensationDashboardPage';

// Analytics & Reports
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage';
import { ReportsPage } from '@/features/reports/ReportsPage';

// Employees & Teams
import { EmployeeListPage } from '@/features/employees/EmployeeListPage';
import { EmployeeDetailPage } from '@/features/employees/EmployeeDetailPage';
import { TeamListPage } from '@/features/teams/TeamListPage';

// Notifications, Audit & Settings
import { NotificationListPage } from '@/features/notifications/NotificationListPage';
import { AuditLogPage } from '@/features/audit/AuditLogPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

            {/* Protected SaaS App Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardRouter />} />

                {/* CRM, Sales & Mail */}
                <Route path="/leads" element={<LeadKanbanPage />} />
                <Route path="/sales" element={<SaleListPage />} />
                <Route path="/sales/create" element={<CreateSalePage />} />
                <Route path="/products" element={<ProductListPage />} />
                <Route path="/customers" element={<CustomerListPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/mail" element={<MailPage />} />

                {/* Quota Targets & Gamification */}
                <Route path="/targets" element={<TargetListPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/gamification" element={<XPPage />} />
                <Route path="/achievements" element={<AchievementsPage />} />

                {/* Compensation & Incentives */}
                <Route path="/commissions" element={<CommissionListPage />} />
                <Route path="/bonuses" element={<BonusListPage />} />
                <Route path="/compensation" element={<CompensationDashboardPage />} />

                {/* Analytics & Business Intelligence */}
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/reports" element={<ReportsPage />} />

                {/* People & Teams */}
                <Route path="/employees" element={<EmployeeListPage />} />
                <Route path="/employees/:id" element={<EmployeeDetailPage />} />
                <Route path="/teams" element={<TeamListPage />} />

                {/* Notifications, Security Audit & Settings */}
                <Route path="/notifications" element={<NotificationListPage />} />
                <Route path="/audit-logs" element={<AuditLogPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
