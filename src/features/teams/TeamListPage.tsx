import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { teamsService } from '@/services/teams.service';
import { employeesService } from '@/services/employees.service';
import { leadsService } from '@/services/leads.service';
import { salesService } from '@/services/sales.service';
import { isFakeProfile } from '@/lib/localDb';
import type { Team, Profile, Lead, Sale } from '@/types';
import { UserRole } from '@/types';
import type { TeamInput } from '@/schemas';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/common/EmptyState';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/toast';
import {
  Users,
  Plus,
  Shield,
  UserCheck,
  Trash2,
  Pencil,
  Eye,
  Search,
  Target,
  TrendingUp,
  Activity,
  FileText,
  Power,
  MoreVertical,
  Layers,
  Crown,
  CheckCircle2,
  PhoneCall,
  DollarSign,
} from 'lucide-react';
import { CreateTeamModal } from './components/CreateTeamModal';
import { EditTeamModal } from './components/EditTeamModal';
import { ManageRosterModal } from './components/ManageRosterModal';
import { TeamDetailsModal } from './components/TeamDetailsModal';
import { TeamPerformanceView } from './components/TeamPerformanceView';
import { TeamTargetsView } from './components/TeamTargetsView';
import { TeamActivityView } from './components/TeamActivityView';
import { TeamReportsView } from './components/TeamReportsView';
import { cn } from '@/lib/utils';

export function TeamListPage() {
  const { organization, isAdmin } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'teams' | 'performance' | 'targets' | 'activity' | 'reports'>('teams');
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [rosterTeam, setRosterTeam] = useState<Team | null>(null);
  const [detailsTeam, setDetailsTeam] = useState<Team | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load teams and all employees
  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsRes, empRes, leadsRes, salesRes] = await Promise.allSettled([
        teamsService.list(orgId, { includeInactive: true }),
        employeesService.list(orgId, { pageSize: 1000 }),
        leadsService.list(orgId, { pageSize: 1000 }),
        salesService.list(orgId, { pageSize: 1000 }),
      ]);

      if (teamsRes.status === 'fulfilled') {
        setTeams(teamsRes.value || []);
      }
      if (empRes.status === 'fulfilled') {
        setEmployees((empRes.value.data || []).filter(p => !isFakeProfile(p)));
      }
      if (leadsRes.status === 'fulfilled') {
        setLeads(leadsRes.value.data || []);
      }
      if (salesRes.status === 'fulfilled') {
        setSales(salesRes.value.data || []);
      }
    } catch (err) {
      console.error('Error loading team data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  // Derived Managers & Leaders
  const managers = useMemo(() => {
    return employees.filter(
      (p) => p.role === UserRole.MANAGER || p.role === UserRole.ORG_ADMIN
    );
  }, [employees]);

  // Helper to compute team progress dynamically from live CRM leads/sales
  const getTeamProgress = (team: Team) => {
    const isTelecalling =
      team.team_type?.toLowerCase().includes('telecall') ||
      team.name.toLowerCase().includes('telecall');
    const targetVal = team.target_value ? Number(team.target_value) : 0;
    const teamMembers = employees.filter((e) => e.team_id === team.id);
    const memberIds = new Set(teamMembers.map((m) => m.id));

    let currentVal = 0;
    if (isTelecalling) {
      const teamLeads = leads.filter((l) => l.assigned_to && memberIds.has(l.assigned_to));
      const scopedLeads = teamLeads.length > 0 ? teamLeads : leads;
      currentVal = scopedLeads.filter((l) =>
        ['QUALIFIED', 'DEMO', 'NEGOTIATION', 'WON'].includes(String(l.stage || ''))
      ).length;
    } else {
      const teamSales = sales.filter((s) => s.user_id && memberIds.has(s.user_id));
      const scopedSales = teamSales.length > 0 ? teamSales : sales;
      currentVal = scopedSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
    }

    const progressPct = targetVal > 0 ? Math.min(100, Math.round((currentVal / targetVal) * 100)) : 0;
    return { isTelecalling, targetVal, currentVal, progressPct, teamMembers };
  };

  // Dashboard Stats
  const stats = useMemo(() => {
    const totalTeams = teams.length;
    const activeTeams = teams.filter((t) => t.status === 'ACTIVE').length;
    const inactiveTeams = teams.filter((t) => t.status === 'INACTIVE').length;
    const totalMembers = employees.filter((e) => !!e.team_id).length;

    // Real conversion close rate
    const wonCount = sales.length || leads.filter((l) => String(l.stage) === 'WON').length;
    const totalPipeline = leads.length;
    const conversionRate = totalPipeline > 0 ? `${((wonCount / totalPipeline) * 100).toFixed(1)}%` : '0.0%';

    // Real average target attainment across active squads
    const squadsWithTargets = teams.filter((t) => t.status === 'ACTIVE' && Number(t.target_value) > 0);
    let avgAchievement = '0.0%';
    if (squadsWithTargets.length > 0) {
      const sumPct = squadsWithTargets.reduce((sum, t) => {
        const { progressPct } = getTeamProgress(t);
        return sum + progressPct;
      }, 0);
      avgAchievement = `${(sumPct / squadsWithTargets.length).toFixed(1)}%`;
    }

    return {
      totalTeams,
      activeTeams,
      inactiveTeams,
      totalMembers,
      conversionRate,
      avgAchievement,
    };
  }, [teams, employees, leads, sales]);

  // Filtered Teams
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      const matchSearch =
        `${t.name || ''} ${t.description || ''} ${t.team_type || ''}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || (t.status || 'ACTIVE') === statusFilter;
      const matchType =
        typeFilter === 'ALL' ||
        (t.team_type && t.team_type.toLowerCase().includes(typeFilter.toLowerCase()));
      return matchSearch && matchStatus && matchType;
    });
  }, [teams, search, statusFilter, typeFilter]);

  // Handlers
  const handleCreateTeam = async (values: TeamInput) => {
    try {
      await teamsService.create(orgId, values);
      success('Team Created', `Squad "${values.name}" is now active`);
      loadData();
    } catch (err: unknown) {
      toastError('Failed to create team', err instanceof Error ? err.message : 'Please check team details');
      throw err;
    }
  };

  const handleUpdateTeam = async (id: string, updates: Partial<TeamInput>) => {
    try {
      await teamsService.update(id, updates);
      success('Team Updated', 'Squad settings updated successfully.');
      loadData();
    } catch (err: unknown) {
      toastError('Failed to update squad', err instanceof Error ? err.message : 'Please check squad details');
      throw err;
    }
  };

  const handleToggleStatus = async (team: Team) => {
    const nextStatus = team.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await teamsService.toggleStatus(team.id, nextStatus);
      success(
        nextStatus === 'ACTIVE' ? 'Squad Activated' : 'Squad Paused',
        `"${team.name}" is now ${nextStatus.toLowerCase()}.`
      );
      loadData();
    } catch (err: unknown) {
      toastError('Failed to update squad status', err instanceof Error ? err.message : 'Please try again');
    }
  };

  const handleConfirmDelete = async () => {
    if (!teamToDelete) return;
    try {
      setIsDeleting(true);
      await teamsService.delete(teamToDelete.id);
      success('Team Deleted', `Squad "${teamToDelete.name}" has been removed and members unassigned.`);
      setTeamToDelete(null);
      loadData();
    } catch (err: unknown) {
      toastError('Failed to delete squad', err instanceof Error ? err.message : 'Please try again');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddMember = async (teamId: string, userId: string) => {
    try {
      await teamsService.addMember(teamId, userId, orgId);
      success('Member Added', 'Employee assigned to squad.');
      loadData();
    } catch (err) {
      toastError('Failed to add member', err instanceof Error ? err.message : 'Please try again');
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    try {
      await teamsService.removeMember(teamId, userId);
      success('Member Removed', 'Employee has been unassigned from squad.');
      loadData();
    } catch (err) {
      toastError('Failed to remove member', err instanceof Error ? err.message : 'Please try again');
    }
  };

  const handleTransferMember = async (toTeamId: string, userId: string) => {
    try {
      await teamsService.transferMember(toTeamId, userId, orgId);
      success('Member Transferred', 'Employee relocated to new squad.');
      loadData();
    } catch (err) {
      toastError('Failed to transfer member', err instanceof Error ? err.message : 'Please try again');
    }
  };

  const handleAssignLeader = async (teamId: string, userId: string) => {
    try {
      await teamsService.update(teamId, { manager_id: userId });
      success('Squad Leader Assigned', 'New team lead designated.');
      loadData();
    } catch (err) {
      toastError('Failed to assign leader', err instanceof Error ? err.message : 'Please try again');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border/70">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl sm:text-[1.7rem] font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              Sales Teams &amp; Squads
            </h1>
            {/* Mobile Top-Right Button */}
            <div className="sm:hidden">
              <Button
                size="sm"
                className="gap-1.5 shadow-sm font-semibold text-xs h-8 px-3"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>New Team</span>
              </Button>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Structure sales reps into specialized units: Telecalling lead qualification, sales closing, and regional squads.
          </p>
        </div>

        {/* Desktop / Tablet Top-Right Button */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Button
            className="gap-2 shadow-sm font-semibold h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create New Team</span>
          </Button>
        </div>
      </div>

      {/* 1. Team Dashboard (Stats Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Squads"
          value={stats.totalTeams}
          description="Active & paused"
          icon={<Layers className="w-4 h-4" />}
          variant="default"
        />

        <StatCard
          title="Assigned Reps"
          value={stats.totalMembers}
          description="Reps in squads"
          icon={<Users className="w-4 h-4" />}
          variant="primary"
        />

        <StatCard
          title="Active Teams"
          value={stats.activeTeams}
          description="Operational units"
          icon={<CheckCircle2 className="w-4 h-4" />}
          variant="success"
        />

        <StatCard
          title="Inactive Teams"
          value={stats.inactiveTeams}
          description="Paused squads"
          icon={<Power className="w-4 h-4" />}
          variant="warning"
        />

        <StatCard
          title="Performance"
          value={stats.conversionRate}
          description="Consultation close rate"
          icon={<TrendingUp className="w-4 h-4" />}
          variant="purple"
        />

        <StatCard
          title="Target Attainment"
          value={stats.avgAchievement}
          description="Combined quota %"
          icon={<Target className="w-4 h-4" />}
          variant="success"
        />
      </div>

      {/* Main Section Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-1">
          <TabsList className="bg-transparent h-9 p-0 gap-1.5 sm:gap-2 border-b-0 overflow-x-auto max-w-full justify-start">
            <TabsTrigger
              value="teams"
              className="gap-2 text-xs data-[state=active]:bg-muted data-[state=active]:text-foreground font-semibold px-3 py-1.5"
            >
              <Users className="w-3.5 h-3.5" /> Teams &amp; Squads ({teams.length})
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="gap-2 text-xs data-[state=active]:bg-muted data-[state=active]:text-foreground font-semibold px-3 py-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5" /> Squad Performance
            </TabsTrigger>
            <TabsTrigger
              value="targets"
              className="gap-2 text-xs data-[state=active]:bg-muted data-[state=active]:text-foreground font-semibold px-3 py-1.5"
            >
              <Target className="w-3.5 h-3.5" /> Targets &amp; Quotas
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="gap-2 text-xs data-[state=active]:bg-muted data-[state=active]:text-foreground font-semibold px-3 py-1.5"
            >
              <Activity className="w-3.5 h-3.5" /> Team Activity
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="gap-2 text-xs data-[state=active]:bg-muted data-[state=active]:text-foreground font-semibold px-3 py-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> Team Reports
            </TabsTrigger>
          </TabsList>

          <Button
            size="sm"
            variant="outline"
            className="hidden md:inline-flex items-center gap-1.5 h-8 text-xs font-semibold shrink-0"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 text-primary" /> Create New Team
          </Button>
        </div>

        {/* ================= TAB 1: TEAMS & SQUADS ================= */}
        <TabsContent value="teams" className="space-y-4 mt-0">
          {/* Search, Filter & View Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search squad by name, specialization, or scope..."
                className="pl-9 h-9 text-xs bg-card"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-32 sm:w-36 h-9 text-xs bg-card">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active Squads</SelectItem>
                  <SelectItem value="INACTIVE">Inactive Squads</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36 sm:w-44 h-9 text-xs bg-card">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Squad Types</SelectItem>
                  <SelectItem value="telecall">Telecalling</SelectItem>
                  <SelectItem value="closing">Sales Closing</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                className="gap-1.5 h-9 text-xs font-semibold shrink-0"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Create New Team
              </Button>
            </div>
          </div>

          {/* Teams Grid */}
          {loading ? (
            <LoadingSpinner text="Loading sales teams and squads..." />
          ) : filteredTeams.length === 0 ? (
            <EmptyState
              title="No teams found"
              description="No sales squads match your search criteria. Create a squad or adjust filters."
              actionLabel="Create Team"
              onAction={() => setIsCreateOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTeams.map((team) => {
                const { isTelecalling, targetVal, currentVal, progressPct, teamMembers } = getTeamProgress(team);

                return (
                  <Card
                    key={team.id}
                    className={cn(
                      'border-border/70 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden',
                      team.status === 'INACTIVE' && 'opacity-70 bg-muted/20'
                    )}
                  >
                    <div>
                      {/* Top Header */}
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className={cn(
                              'p-2.5 rounded-xl border',
                              isTelecalling
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            )}
                          >
                            {isTelecalling ? (
                              <PhoneCall className="w-5 h-5" />
                            ) : (
                              <DollarSign className="w-5 h-5" />
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={team.status === 'ACTIVE' ? 'success' : 'secondary'}
                              className="text-[10px]"
                            >
                              {team.status || 'ACTIVE'}
                            </Badge>

                            {/* Team Options Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="text-xs">Squad Options</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setDetailsTeam(team)}>
                                  <Eye className="w-3.5 h-3.5" /> View Team Details
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <>
                                    <DropdownMenuItem onClick={() => setEditingTeam(team)}>
                                      <Pencil className="w-3.5 h-3.5" /> Edit Team
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setRosterTeam(team)}>
                                      <Users className="w-3.5 h-3.5" /> Manage Members
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleStatus(team)}>
                                      <Power className="w-3.5 h-3.5" />
                                      {team.status === 'ACTIVE' ? 'Pause Squad' : 'Activate Squad'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setTeamToDelete(team)}
                                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Delete Team
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="mt-2 space-y-1">
                          <CardTitle className="text-base font-bold text-foreground">
                            {team.name}
                          </CardTitle>
                          {team.team_type && (
                            <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                              {team.team_type}
                            </Badge>
                          )}
                          <CardDescription className="line-clamp-2 text-xs pt-0.5">
                            {team.description || 'Dedicated sales unit driving revenue targets.'}
                          </CardDescription>
                        </div>
                      </CardHeader>

                      {/* Content: Squad Leader, Roster Count & Target Benchmark */}
                      <CardContent className="space-y-3 pb-3 pt-0">
                        <div className="flex items-center justify-between text-xs py-2 border-y border-border/50">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-primary" /> Squad Leader
                          </span>
                          <span className="font-semibold text-foreground truncate max-w-[150px]">
                            {team.manager
                              ? `${team.manager.first_name} ${team.manager.last_name}`
                              : 'Unassigned'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" /> Team Roster
                          </span>
                          <span className="font-bold text-primary">
                            {teamMembers.length} Reps
                          </span>
                        </div>

                        {/* Quota Progress Bar */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Target className="w-3 h-3 text-muted-foreground" />
                              {team.target_period || 'Monthly'} Quota
                            </span>
                            <span className="font-mono font-semibold text-foreground">
                              {progressPct}%
                            </span>
                          </div>
                          <Progress value={progressPct} className="h-1.5" />
                        </div>
                      </CardContent>
                    </div>

                    {/* Card Actions Footer */}
                    <CardFooter className="pt-2 flex items-center gap-2 border-t border-border/50 bg-muted/10">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => setRosterTeam(team)}
                      >
                        <Users className="w-3.5 h-3.5 mr-1 text-primary" /> Manage Squad Roster
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        title="View Details"
                        onClick={() => setDetailsTeam(team)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>

                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete Team"
                          onClick={() => setTeamToDelete(team)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ================= TAB 2: SQUAD PERFORMANCE ================= */}
        <TabsContent value="performance" className="mt-0">
          <TeamPerformanceView teams={teams} />
        </TabsContent>

        {/* ================= TAB 3: TARGETS & QUOTAS ================= */}
        <TabsContent value="targets" className="mt-0">
          <TeamTargetsView teams={teams} allEmployees={employees} />
        </TabsContent>

        {/* ================= TAB 4: TEAM ACTIVITY STREAM ================= */}
        <TabsContent value="activity" className="mt-0">
          <TeamActivityView />
        </TabsContent>

        {/* ================= TAB 5: TEAM REPORTS ================= */}
        <TabsContent value="reports" className="mt-0">
          <TeamReportsView teams={teams} allEmployees={employees} />
        </TabsContent>
      </Tabs>

      {/* Modals & Dialogs */}
      <CreateTeamModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        managers={managers}
        availableEmployees={employees}
        onSubmit={handleCreateTeam}
      />

      <EditTeamModal
        open={!!editingTeam}
        onOpenChange={(open) => !open && setEditingTeam(null)}
        team={editingTeam}
        managers={managers}
        onSubmit={handleUpdateTeam}
      />

      <ManageRosterModal
        open={!!rosterTeam}
        onOpenChange={(open) => !open && setRosterTeam(null)}
        team={rosterTeam}
        allTeams={teams}
        allEmployees={employees}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onTransferMember={handleTransferMember}
        onAssignLeader={handleAssignLeader}
      />

      <TeamDetailsModal
        open={!!detailsTeam}
        onOpenChange={(open) => !open && setDetailsTeam(null)}
        team={detailsTeam}
        members={employees.filter((e) => e.team_id === detailsTeam?.id)}
        currentValue={detailsTeam ? getTeamProgress(detailsTeam).currentVal : 0}
        isAdmin={isAdmin}
        onEdit={(t) => setEditingTeam(t)}
        onManageRoster={(t) => setRosterTeam(t)}
        onDelete={(t) => setTeamToDelete(t)}
        onToggleStatus={handleToggleStatus}
      />

      {/* Delete Team Confirmation Dialog */}
      <Dialog open={!!teamToDelete} onOpenChange={(open) => !open && setTeamToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Confirm Delete Team
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently remove squad <strong>&ldquo;{teamToDelete?.name}&rdquo;</strong>?
              Employees currently assigned to this team will remain in the directory and become unassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setTeamToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
            >
              {isDeleting ? 'Deleting...' : 'Delete Squad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TeamListPage;
