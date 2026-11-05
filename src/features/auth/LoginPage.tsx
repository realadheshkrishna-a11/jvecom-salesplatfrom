import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { loginSchema, type LoginInput } from '@/schemas';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Zap,
  TrendingUp,
  Award,
  Layers,
  AlertCircle,
  Building2,
  UserCheck,
} from 'lucide-react';

export function LoginPage() {
  const { user, signIn, signInWithDemo, demoAccounts, demoEnabled, loading: authLoading, initialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { error: toastError, success: toastSuccess } = useToast();

  const queryParams = new URLSearchParams(location.search);
  const emailParam = queryParams.get('email');
  const isInvitedFlow = Boolean(emailParam);

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeRoleLoading, setActiveRoleLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: emailParam || (typeof localStorage !== 'undefined' ? localStorage.getItem('salesos_remembered_email') || 'admin@jvecom.in' : 'admin@jvecom.in'),
      password: '',
    },
  });

  useEffect(() => {
    if (emailParam) {
      form.setValue('email', emailParam, { shouldValidate: true });
    }
  }, [emailParam, form]);

  // If already authenticated, redirect immediately
  if (user && initialized) {
    return <Navigate to={from} replace />;
  }

  const handleCredentialsSubmit = async (values: LoginInput) => {
    setSubmitting(true);
    setErrorMessage(null);

    if (rememberMe && typeof localStorage !== 'undefined') {
      localStorage.setItem('salesos_remembered_email', values.email);
    }

    const { error } = await signIn(values.email, values.password);
    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      toastError('Login Failed', error.message);
    } else {
      toastSuccess('Welcome back!', 'Successfully signed in to SalesOS.');
      navigate(from, { replace: true });
    }
  };

  const handleOneClickLogin = async (roleOrEmail: UserRole | string, roleTitle: string) => {
    setActiveRoleLoading(roleTitle);
    setErrorMessage(null);

    const { error } = await signInWithDemo(roleOrEmail);
    setActiveRoleLoading(null);

    if (error) {
      setErrorMessage(error.message);
      toastError('Sign-in Error', error.message);
    } else {
      toastSuccess(`Welcome!`, `Signed in as ${roleTitle}.`);
      navigate(from, { replace: true });
    }
  };

  const handleFillCredentials = (email: string, pass: string) => {
    form.setValue('email', email, { shouldValidate: true });
    form.setValue('password', pass, { shouldValidate: true });
    setErrorMessage(null);
  };

  const getRoleBadgeVariant = (role: UserRole): 'default' | 'secondary' | 'warning' | 'success' => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'warning';
      case UserRole.ORG_ADMIN:
        return 'default';
      case UserRole.MANAGER:
        return 'secondary';
      case UserRole.SALES_REP:
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground antialiased selection:bg-blue-600 selection:text-white">
      {/* Left Hero / Brand Pane (Visible on large screens) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-12 flex-col justify-between overflow-hidden border-r border-border/40">
        {/* Glow ambient spots */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
              <span className="font-extrabold text-white text-xl tracking-tight">S</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-white">SalesOS</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400">by JVECOM Wholesale & Distribution</p>
            </div>
          </div>
        </div>

        {/* Central Value Proposition */}
        <div className="relative z-10 space-y-8 my-auto py-8 max-w-lg">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Next-Gen Sales Execution & CRM Platform</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Empower your sales force with real-time speed & precision.
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Unified workspace for enterprise sales reps, managers, and executives: pipeline Kanban, automated commission structures, quota tracking, and ERP integration.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="space-y-3.5 text-sm">
            <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3 border border-white/10 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-white">Visual Lead Pipeline & Fast Ordering</p>
                <p className="text-xs text-slate-400">Drag & drop Kanban stages with instant B2B quotation generation.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3 border border-white/10 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-white">Automated Commission & Bonus Rules</p>
                <p className="text-xs text-slate-400">Transparent incentive calculation tied directly to closed deals.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3 border border-white/10 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-white">XP Levels & Live Leaderboards</p>
                <p className="text-xs text-slate-400">Gamified milestone rewards designed to accelerate closing velocity.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust & Compliance Indicator */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Supabase Cloud Auth & Local Resilience Engine</span>
          </div>
          <span>v1.0.0 Production</span>
        </div>
      </div>

      {/* Right Login Action Pane */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile / Compact Header */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md">
              <span className="font-bold text-white text-lg">S</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-foreground">SalesOS</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.2 rounded-full bg-blue-500/10 text-blue-600">
                  CRM
                </span>
              </div>
              <p className="text-xs text-muted-foreground">JVECOM Sales Platform</p>
            </div>
          </div>

          <Card className="border-border/70 shadow-2xl shadow-neutral-950/5">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold tracking-tight">Sign in</CardTitle>
                <Badge variant="outline" className="text-xs font-normal border-blue-500/30 text-blue-600 dark:text-blue-400">
                  Protected Workspace
                </Badge>
              </div>
              <CardDescription>
                {isInvitedFlow
                  ? 'Welcome to the team! Enter your invited credentials below.'
                  : 'Enter your credentials to access your CRM workspace.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Invited employee welcome banner */}
              {isInvitedFlow && (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                  <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="leading-relaxed">
                    <strong>Welcome to SalesOS!</strong> Your account is activated. Enter the temporary password provided in your invitation email to access your assigned modules.
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1 text-xs leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {demoEnabled && demoAccounts.length > 0 ? (
                <Tabs defaultValue="credentials" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="credentials" className="text-xs font-semibold">
                      Email Login
                    </TabsTrigger>
                    <TabsTrigger value="quick-roles" className="text-xs font-semibold">
                      1-Click Roles
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Standard Credentials Form */}
                  <TabsContent value="credentials" className="space-y-4 mt-0">
                    <form onSubmit={form.handleSubmit(handleCredentialsSubmit)} className="space-y-4">
                      {/* Email Input */}
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-semibold">
                          Work Email
                        </Label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="employee@jvecom.in"
                            autoComplete="email"
                            className="pl-9 h-10 text-sm"
                            {...form.register('email')}
                          />
                        </div>
                        {form.formState.errors.email && (
                          <p className="text-xs text-destructive font-medium">{form.formState.errors.email.message}</p>
                        )}
                      </div>

                      {/* Password Input */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password" className="text-xs font-semibold">
                            Password
                          </Label>
                          <Link
                            to="/forgot-password"
                            className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline"
                          >
                            Forgot password?
                          </Link>
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="pl-9 pr-9 h-10 text-sm"
                            {...form.register('password')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {form.formState.errors.password && (
                          <p className="text-xs text-destructive font-medium">{form.formState.errors.password.message}</p>
                        )}
                      </div>

                      {/* Remember Me */}
                      <div className="flex items-center space-x-2 pt-1">
                        <input
                          id="remember"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={e => setRememberMe(e.target.checked)}
                          className="h-4 w-4 rounded border-input text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer select-none">
                          Remember my work email on this device
                        </label>
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        className="w-full h-10 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                        disabled={submitting || authLoading}
                      >
                        {submitting ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Authenticating...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            Sign In to Workspace
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </form>

                    {/* Quick autofill helper chips */}
                    <div className="pt-2">
                      <p className="text-[11px] font-medium text-muted-foreground mb-2 text-center">
                        Quick demo autofill:
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleFillCredentials('admin@jvecom.in', 'Admin@123')}
                          className="text-xs h-8 px-2 border-border/80 hover:bg-muted/60"
                        >
                          Org Admin
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleFillCredentials('manager@jvecom.in', 'Manager@123')}
                          className="text-xs h-8 px-2 border-border/80 hover:bg-muted/60"
                        >
                          Sales Mgr
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleFillCredentials('rep@jvecom.in', 'Rep@123')}
                          className="text-xs h-8 px-2 border-border/80 hover:bg-muted/60"
                        >
                          Sales Rep
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab 2: 1-Click Role Direct Sign-in */}
                  <TabsContent value="quick-roles" className="space-y-2.5 mt-0">
                    <p className="text-xs text-muted-foreground pb-1">
                      Select a persona to immediately access the CRM with appropriate role permissions:
                    </p>

                    <div className="space-y-2">
                      {demoAccounts.map(account => {
                        const isLoggingThis = activeRoleLoading === account.name;
                        return (
                          <div
                            key={account.id}
                            onClick={() => handleOneClickLogin(account.role, account.name)}
                            className="group relative flex items-center justify-between p-3 rounded-xl border border-border/70 hover:border-blue-500/50 bg-card hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-all shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                                {account.profile.first_name[0]}
                                {account.profile.last_name[0]}
                              </div>
                              <div className="space-y-0.5 text-left">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {account.name}
                                  </span>
                                  <Badge variant={getRoleBadgeVariant(account.role)} className="text-[10px] py-0 px-1.5 h-4">
                                    {account.badge}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                                  {account.email}
                                </p>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2.5 text-xs text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0"
                              disabled={activeRoleLoading !== null}
                            >
                              {isLoggingThis ? (
                                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <span>Enter &rarr;</span>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                /* Production mode without demo tabs */
                <form onSubmit={form.handleSubmit(handleCredentialsSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold">
                      Work Email
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="employee@jvecom.in"
                        autoComplete="email"
                        className="pl-9 h-10 text-sm"
                        {...form.register('email')}
                      />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-xs text-destructive font-medium">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-semibold">
                        Password
                      </Label>
                      <Link
                        to="/forgot-password"
                        className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="pl-9 pr-9 h-10 text-sm"
                        {...form.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.formState.errors.password && (
                      <p className="text-xs text-destructive font-medium">{form.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      id="remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-input text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer select-none">
                      Remember my work email on this device
                    </label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                    disabled={submitting || authLoading}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Authenticating...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Sign In to Workspace
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-0 border-t border-border/50 py-4">
              <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                <Link
                  to="/accept-invitation"
                  className="hover:text-foreground underline underline-offset-4 transition-colors"
                >
                  Accept invitation token
                </Link>
                <span className="text-[11px] opacity-70">SalesOS Cloud & Local</span>
              </div>
            </CardFooter>
          </Card>

          {/* Bottom Security / Trust Notice */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>End-to-End Enterprise Encryption & RBAC Guaranteed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
export default LoginPage;
