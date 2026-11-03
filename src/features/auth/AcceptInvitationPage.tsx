import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { Lock, User, CheckCircle2 } from 'lucide-react';

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    },
  });

  const onSubmit = async (values: { password: string; confirmPassword: string; firstName: string; lastName: string }) => {
    if (values.password !== values.confirmPassword) {
      toastError('Passwords mismatch', 'Please ensure both passwords match');
      return;
    }
    if (values.password.length < 6) {
      toastError('Password too short', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // In a live flow with Supabase Auth invitation tokens
      const { error } = await supabase.auth.updateUser({
        password: values.password,
        data: {
          first_name: values.firstName,
          last_name: values.lastName,
        },
      });

      if (error) throw error;

      toastSuccess('Account activated!', 'Your SalesOS workspace is ready.');
      navigate('/');
    } catch (err: unknown) {
      toastError('Activation failed', err instanceof Error ? err.message : 'Please check your invitation link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md border-border/60 shadow-xl shadow-neutral-950/5">
        <CardHeader className="space-y-1 text-center">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold mx-auto flex items-center justify-center mb-2">
            S
          </div>
          <CardTitle className="text-2xl font-bold">Join Your Team</CardTitle>
          <CardDescription>
            Complete your profile to accept the invitation and enter SalesOS
          </CardDescription>
        </CardHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    id="firstName"
                    placeholder="Alex"
                    className="pl-9"
                    required
                    {...form.register('firstName')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Morgan"
                  required
                  {...form.register('lastName')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  required
                  {...form.register('password')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  required
                  {...form.register('confirmPassword')}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Activating account...' : 'Activate & Enter SalesOS'}
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/dashboard">Return to dashboard</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
