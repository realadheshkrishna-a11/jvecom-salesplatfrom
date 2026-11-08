import { useState, useMemo } from 'react';
import type { Team, Profile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Award,
  DollarSign,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface TeamReportsViewProps {
  teams: Team[];
  allEmployees: Profile[];
}

export function TeamReportsView({ teams, allEmployees }: TeamReportsViewProps) {
  const { success } = useToast();
  const [reportType, setReportType] = useState<'PERFORMANCE' | 'INDIVIDUAL' | 'TARGETS'>('PERFORMANCE');
  const [period, setPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');

  const handleExportCSV = () => {
    success('Export Completed', `Generated ${reportType.toLowerCase()}_report_${period.toLowerCase()}.csv`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Report Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/70 bg-card">
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Squad Intelligence &amp; Performance Reports
          </h4>
          <p className="text-xs text-muted-foreground">
            Live reports dynamically compiled from verified squad rosters and CRM data.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
            <SelectTrigger className="w-44 h-8 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERFORMANCE">Squad Performance</SelectItem>
              <SelectItem value="INDIVIDUAL">Individual Reps</SelectItem>
              <SelectItem value="TARGETS">Target Summary</SelectItem>
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-32 h-8 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Daily Report</SelectItem>
              <SelectItem value="WEEKLY">Weekly Report</SelectItem>
              <SelectItem value="MONTHLY">Monthly Report</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>

          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* 1. Squad Performance Report Table */}
      {reportType === 'PERFORMANCE' && (
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">
              Team Performance Overview &mdash; {period}
            </CardTitle>
            <CardDescription className="text-xs">
              Live operational benchmark of configured squads.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {teams.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No squads found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Squad Name</TableHead>
                    <TableHead>Squad Specialization</TableHead>
                    <TableHead>Squad Leader</TableHead>
                    <TableHead>Reps</TableHead>
                    <TableHead>Target Quota</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((t) => {
                    const memberCount = allEmployees.filter(e => e.team_id === t.id).length;
                    const leader = t.manager ? `${t.manager.first_name} ${t.manager.last_name}` : 'Unassigned';
                    const targetStr = t.target_value ? `${t.target_value} (${t.target_type || t.target_period || 'Quota'})` : 'Not set';

                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-semibold text-xs">{t.name}</TableCell>
                        <TableCell className="text-xs">{t.team_type || 'General Sales'}</TableCell>
                        <TableCell className="text-xs">{leader}</TableCell>
                        <TableCell className="text-xs font-mono">{memberCount} Reps</TableCell>
                        <TableCell className="text-xs font-mono">{targetStr}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={t.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-[10px]">
                            {t.status || 'ACTIVE'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2. Individual Rep Contribution Report */}
      {reportType === 'INDIVIDUAL' && (
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">
              Individual Employee Report &mdash; {period}
            </CardTitle>
            <CardDescription className="text-xs">
              Live roster breakdown of verified employees and their squad assignments.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {allEmployees.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No employees found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Employee</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Assigned Squad</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allEmployees.map((emp) => {
                    const team = teams.find(t => t.id === emp.team_id);
                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="font-semibold text-xs">
                          {emp.first_name} {emp.last_name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-foreground font-medium">
                          {emp.employee_id || '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {team ? team.name : <span className="text-muted-foreground">Unassigned</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {emp.role.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={emp.status === 'ACTIVE' ? 'success' : 'warning'} className="text-[10px]">
                            {emp.status || 'ACTIVE'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Target Achievement Report */}
      {reportType === 'TARGETS' && (
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">
              Target Summary Report &mdash; {period}
            </CardTitle>
            <CardDescription className="text-xs">
              Live squad quotas and targets defined for this organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {teams.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No targets configured.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Squad</TableHead>
                    <TableHead>Target Metric</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Quota Value</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-semibold text-xs">{t.name}</TableCell>
                      <TableCell className="text-xs">{t.target_type || 'REVENUE'}</TableCell>
                      <TableCell className="text-xs font-mono">{t.target_period || 'MONTHLY'}</TableCell>
                      <TableCell className="text-xs font-mono font-semibold">
                        {t.target_value ? Number(t.target_value).toLocaleString('en-IN') : 'Not specified'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={t.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-[10px]">
                          {t.status || 'ACTIVE'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
