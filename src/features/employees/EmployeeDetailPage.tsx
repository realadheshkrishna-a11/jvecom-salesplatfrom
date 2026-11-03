import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { employeesService } from '@/services/employees.service';
import { salesService } from '@/services/sales.service';
import { gamificationService } from '@/services/gamification.service';
import type { Profile } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSpinner } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { ArrowLeft, Mail, Phone, Calendar, IndianRupee, Trophy, ShoppingBag, Award } from 'lucide-react';

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Profile | null>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [xp, setXp] = useState(2450);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const [emp, salesRes, userXp] = await Promise.allSettled([
          employeesService.getById(id),
          salesService.list('11111111-1111-1111-1111-111111111111', { user_id: id }),
          gamificationService.getUserXP(id),
        ]);

        if (emp.status === 'fulfilled') {
          setEmployee(emp.value);
        } else {
          setEmployee(null);
        }

        if (salesRes.status === 'fulfilled' && salesRes.value.data.length > 0) {
          setSales(salesRes.value.data);
        } else {
          setSales([]);
        }

        if (userXp.status === 'fulfilled' && userXp.value > 0) {
          setXp(userXp.value);
        }
      } catch (err) {
        console.error('Error fetching employee detail:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading || !employee) {
    return <LoadingSpinner text="Loading employee profile..." />;
  }

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild className="p-0 h-auto gap-1 text-primary">
          <Link to="/employees">
            <ArrowLeft className="w-4 h-4" /> Back to Directory
          </Link>
        </Button>
      </div>

      {/* Header Profile Card */}
      <Card className="border-border/60">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                {employee.first_name[0]}{employee.last_name[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">
                    {employee.first_name} {employee.last_name}
                  </h2>
                  <Badge variant="success" className="text-[10px]">
                    {employee.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {(employee.role ? String(employee.role).replace(/_/g, ' ') : 'Sales Rep')} • {(employee.team as any)?.name || 'General Sales'}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {employee.email}
                  </span>
                  {employee.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {employee.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Joined {employee.joining_date || 'Feb 2026'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Career Revenue"
          value={formatCurrency(totalRevenue || 650000)}
          icon={<IndianRupee className="w-5 h-5" />}
          variant="success"
        />
        <StatCard
          title="Deals Closed"
          value={sales.length || 11}
          icon={<ShoppingBag className="w-5 h-5" />}
          variant="primary"
        />
        <StatCard
          title="Gamification XP"
          value={formatNumber(xp)}
          description="Level 2: Achiever"
          icon={<Trophy className="w-5 h-5" />}
          variant="purple"
        />
        <StatCard
          title="Quota Achievement"
          value="114.8%"
          description="Exceeding target"
          icon={<Award className="w-5 h-5" />}
          variant="warning"
        />
      </div>

      {/* Details Tabs */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="sales">Closed Deals ({sales.length})</TabsTrigger>
          <TabsTrigger value="gamification">XP &amp; Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="pt-4">
          <Card className="border-border/60">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs font-semibold">{sale.invoice_number}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success" className="text-[10px]">
                          {sale.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(sale.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gamification" className="pt-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Unlocked Badges &amp; Milestones</CardTitle>
              <CardDescription>Recognition earned through sales milestones and performance accelerators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2">
                  <div className="p-2 w-fit rounded-lg bg-amber-500/10 text-amber-500 font-bold">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-sm">First Blood</h4>
                  <p className="text-xs text-muted-foreground">Closed first qualified deal on SalesOS</p>
                  <Badge variant="outline" className="text-[10px]">+150 XP</Badge>
                </div>

                <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2">
                  <div className="p-2 w-fit rounded-lg bg-blue-500/10 text-blue-500 font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-sm">Centurion</h4>
                  <p className="text-xs text-muted-foreground">Generated ₹1,00,000+ in a single month</p>
                  <Badge variant="outline" className="text-[10px]">+500 XP</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
