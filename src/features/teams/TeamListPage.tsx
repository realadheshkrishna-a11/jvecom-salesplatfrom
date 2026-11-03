import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { teamsService } from '@/services/teams.service';
import type { Team } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { Users, Plus, Shield, UserCheck, ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { teamSchema, type TeamInput } from '@/schemas';

export function TeamListPage() {
  const { organization, isAdmin } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<TeamInput>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const loadTeams = async () => {
    try {
      setLoading(true);
      const res = await teamsService.list(orgId);
      if (res && res.length > 0) {
        setTeams(res);
      } else {
        setTeams([]);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, [orgId]);

  const onCreateTeam = async (values: TeamInput) => {
    try {
      await teamsService.create(orgId, values);
      success('Team Created', `Squad "${values.name}" is now active`);
      setIsDialogOpen(false);
      form.reset();
      loadTeams();
    } catch (err: unknown) {
      toastError('Failed to create team', err instanceof Error ? err.message : 'Please check team details');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Teams &amp; Squads"
        subtitle="Organize reps into competitive regional squads with dedicated managers and targets."
      >
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Sales Team</DialogTitle>
                <DialogDescription>Define squad name and purpose</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onCreateTeam)} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Team Name</Label>
                  <Input id="name" placeholder="e.g. Alpha Squad (North)" {...form.register('name')} />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Mission / Scope</Label>
                  <Textarea
                    id="description"
                    placeholder="Region coverage, product focus, or deal size focus..."
                    {...form.register('description')}
                  />
                </div>
                <DialogFooter className="pt-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Team</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {loading ? (
        <LoadingSpinner text="Loading sales teams..." />
      ) : teams.length === 0 ? (
        <EmptyState
          title="No teams created yet"
          description="Create regional squads or product divisions to structure your sales force."
          actionLabel="Create Team"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Card key={team.id} className="border-border/60 hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                    <Users className="w-5 h-5" />
                  </div>
                  <Badge variant="success" className="text-[10px]">
                    {team.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold mt-2">{team.name}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {team.description || 'Dedicated sales unit driving revenue targets.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pb-3 pt-0">
                <div className="flex items-center justify-between text-xs py-2 border-y border-border/50">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" /> Squad Lead
                  </span>
                  <span className="font-semibold text-foreground">
                    {team.manager ? `${team.manager.first_name} ${team.manager.last_name}` : 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Team Roster
                  </span>
                  <span className="font-bold text-primary">
                    {team.member_count ?? 4} Reps
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Manage Squad Roster
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
