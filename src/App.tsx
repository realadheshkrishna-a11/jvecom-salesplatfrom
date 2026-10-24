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

// Coming Soon
import { ComingSoonPage } from '@/features/coming-soon/ComingSoonPage';

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

                {/* CRM & Sales — Active */}
                <Route path="/leads" element={<LeadKanbanPage />} />
                <Route path="/sales" element={<SaleListPage />} />
                <Route path="/sales/create" element={<CreateSalePage />} />
                <Route path="/products" element={<ProductListPage />} />
                <Route path="/customers" element={<CustomerListPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/mail" element={<MailPage />} />

                {/* Coming Soon — all other features */}
                <Route path="/coming-soon" element={<ComingSoonPage />} />
                <Route path="/targets" element={<ComingSoonPage />} />
                <Route path="/leaderboard" element={<ComingSoonPage />} />
                <Route path="/gamification" element={<ComingSoonPage />} />
                <Route path="/achievements" element={<ComingSoonPage />} />
                <Route path="/commissions" element={<ComingSoonPage />} />
                <Route path="/bonuses" element={<ComingSoonPage />} />
                <Route path="/compensation" element={<ComingSoonPage />} />
                <Route path="/analytics" element={<ComingSoonPage />} />
                <Route path="/reports" element={<ComingSoonPage />} />
                <Route path="/employees" element={<ComingSoonPage />} />
                <Route path="/employees/:id" element={<ComingSoonPage />} />
                <Route path="/teams" element={<ComingSoonPage />} />
                <Route path="/notifications" element={<ComingSoonPage />} />
                <Route path="/audit-logs" element={<ComingSoonPage />} />
                <Route path="/settings" element={<ComingSoonPage />} />
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
