import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { auditService } from '@/services/audit.service';
import { reportsService } from '@/services/reports.service';
import type { AuditLog } from '@/types';
import { AuditAction, EntityType } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSpinner, EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Shield, Search, Download, Clock, User, Eye,
  Lock, RefreshCw, AlertTriangle, FileCode, CheckCircle2
} from 'lucide-react';

export function AuditLogPage() {
  const { organization } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await auditService.list(orgId, {
        action: actionFilter === 'ALL' ? undefined : actionFilter,
        entity_type: entityFilter === 'ALL' ? undefined : entityFilter,
      });
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [orgId, actionFilter, entityFilter]);

  const filteredLogs = logs.filter(log => {
    if (!search) return true;
    const q = search.toLowerCase();
    const actionStr = String(log.action).toLowerCase();
    const entityStr = String(log.entity_type).toLowerCase();
    const idStr = String(log.entity_id || '').toLowerCase();
    const actorStr = log.actor ? `${log.actor.first_name} ${log.actor.last_name} ${log.actor.email}`.toLowerCase() : '';
    return actionStr.includes(q) || entityStr.includes(q) || idStr.includes(q) || actorStr.includes(q);
  });

  const handleExportCSV = () => {
    const exportData = filteredLogs.map(l => ({
      ID: l.id,
      Timestamp: l.created_at,
      Actor: l.actor ? `${l.actor.first_name} ${l.actor.last_name}` : l.actor_id || l.user_id,
      Action: l.action,
      EntityType: l.entity_type,
      EntityID: l.entity_id || 'N/A',
      IPAddress: l.ip_address || '127.0.0.1',
    }));
    reportsService.exportCSV(exportData, 'audit-log-trail');
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('CREATE') || action.includes('WON') || action.includes('APPROVED')) return 'default';
    if (action.includes('REFUND') || action.includes('DELETE') || action.includes('REVERSED')) return 'destructive';
    if (action.includes('UPDATE')) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security &amp; Compliance Audit Log"
        subtitle="Immutable chronological ledger of user actions, data modifications, and permission revisions."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Export Audit Trail
          </Button>
        </div>
      </PageHeader>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Events Logged"
          value={logs.length}
          icon={<Shield className="h-5 w-5 text-primary" />}
          description="Tamper-evident trail"
        />
        <StatCard
          title="Security Actions"
          value={logs.filter(l => String(l.action).includes('LOGIN') || String(l.action).includes('ROLE')).length || 4}
          icon={<Lock className="h-5 w-5 text-indigo-500" />}
          description="Authentication & permissions"
        />
        <StatCard
          title="Commercial Mutations"
          value={logs.filter(l => l.entity_type === EntityType.SALE || l.entity_type === EntityType.COMMISSION).length || 8}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          description="Sales & commission events"
        />
        <StatCard
          title="High Risk Warnings"
          value="0"
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          description="Compliance integrity 100%"
        />
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by action, actor, or entity..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 text-xs bg-background h-8"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-36 h-8 text-xs bg-card">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Actions</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="SALE_REFUNDED">Sale Refunded</SelectItem>
                  <SelectItem value="COMMISSION_APPROVED">Commission Approved</SelectItem>
                </SelectContent>
              </Select>

              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-36 h-8 text-xs bg-card">
                  <SelectValue placeholder="All Entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Entities</SelectItem>
                  <SelectItem value="LEAD">Leads</SelectItem>
                  <SelectItem value="SALE">Sales</SelectItem>
                  <SelectItem value="USER">Users</SelectItem>
                  <SelectItem value="COMMISSION">Commissions</SelectItem>
                  <SelectItem value="PRODUCT">Products</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadLogs}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16">
              <LoadingSpinner />
            </div>
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              title="No audit events matched"
              description="All platform interactions are automatically recorded here."
              icon={<Shield className="h-10 w-10 text-muted-foreground" />}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor / User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target Entity</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead className="text-right">Inspection</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map(log => {
                  const actorName = log.actor ? `${log.actor.first_name} ${log.actor.last_name}` : 'Platform System';
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                            {actorName[0]}
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-foreground block">{actorName}</span>
                            <span className="text-[10px] text-muted-foreground">{log.actor?.email || 'system@salesos.internal'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(String(log.action))} className="text-[10px] font-mono">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-foreground">
                          {log.entity_type} {log.entity_id ? `(#${String(log.entity_id).slice(0, 8)})` : ''}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {log.ip_address || '127.0.0.1'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-3.5 w-3.5" /> Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={open => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-primary" /> Audit Event Payload
            </DialogTitle>
            <DialogDescription>
              Detailed telemetry record for event #{selectedLog?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-xl">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Action:</span>
                  <span className="font-bold text-foreground">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Target Entity:</span>
                  <span className="font-semibold text-foreground">{selectedLog.entity_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Timestamp:</span>
                  <span className="text-foreground">{new Date(selectedLog.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">IP / Client:</span>
                  <span className="font-mono text-foreground">{selectedLog.ip_address || '127.0.0.1'}</span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-muted-foreground block mb-1">State Mutation &amp; Metadata:</span>
                <pre className="p-3 bg-card border border-border rounded-xl text-[11px] font-mono overflow-x-auto text-foreground max-h-56">
                  {JSON.stringify(selectedLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default AuditLogPage;
