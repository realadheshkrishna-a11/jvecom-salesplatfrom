import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { LoadingSpinner } from '@/components/common/EmptyState';

export function ProtectedRoute() {
  const { user, profile, initialized } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner text="Connecting to SalesOS..." />
      </div>
    );
  }

  // A session without a linked employee profile is never allowed in
  if (!user || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
