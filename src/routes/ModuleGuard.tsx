import { Outlet, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { moduleForPath, getHomePath } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Blocks any route whose module the signed-in employee was not granted.
 * Must be nested inside <ProtectedRoute> (which guarantees a user + profile).
 */
export function ModuleGuard() {
  const { canAccessPath } = useAuth();
  const location = useLocation();

  if (!canAccessPath(location.pathname)) {
    const mod = moduleForPath(location.pathname);
    return <AccessDenied moduleLabel={mod?.label} />;
  }
  return <Outlet />;
}

export function AccessDenied({ moduleLabel }: { moduleLabel?: string }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex items-center justify-center py-16">
      <Card className="max-w-md w-full border-border/70">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Access restricted</h2>
            <p className="text-sm text-muted-foreground">
              {moduleLabel
                ? <>You don't have permission to use <strong>{moduleLabel}</strong>.</>
                : <>You don't have permission to view this page.</>}
              {' '}Ask your organization admin if you need access.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <Button asChild size="sm">
              <Link to={getHomePath()}>Go to my dashboard</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sign Out &amp; Switch Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Sends users to their personalised landing page (or login when signed out). */
export function HomeRedirect() {
  const { user, initialized } = useAuth();
  if (!initialized) return null;
  return <Navigate to={user ? getHomePath() : '/login'} replace />;
}
