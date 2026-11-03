import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { gamificationService } from '@/services/gamification.service';
import type { XPTransaction } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSpinner } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/utils';
import { Trophy, Zap, Award, Target, Flame, ArrowUpRight } from 'lucide-react';

export function XPPage() {
  const { profile } = useAuth();
  const userId = profile?.id || '44444444-4444-4444-4444-444444444441';

  const [loading, setLoading] = useState(true);
  const [totalXP, setTotalXP] = useState(2450);
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [xpVal, txRes] = await Promise.allSettled([
          gamificationService.getUserXP(userId),
          gamificationService.getXPTransactions(userId, 30),
        ]);

        if (xpVal.status === 'fulfilled' && xpVal.value > 0) {
          setTotalXP(xpVal.value);
        }

        if (txRes.status === 'fulfilled' && txRes.value.length > 0) {
          setTransactions(txRes.value);
        } else {
          setTransactions([]);
        }
      } catch (err) {
        console.error('Error loading XP data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  const level = {
    current: 2,
    name: 'Achiever',
    nextName: 'Closer',
    nextXP: 2500,
    prevXP: 1000,
  };

  const progress = Math.min(100, Math.round(((totalXP - level.prevXP) / (level.nextXP - level.prevXP)) * 100));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Experience Points (XP) Ledger"
        subtitle="Transparent transactional record of all points awarded for sales, milestones, and achievements."
      />

      {/* Level Progress Banner */}
      <Card className="border-border/60 bg-gradient-to-r from-blue-950/20 via-card to-purple-950/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl shrink-0">
                <Zap className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                  Current Tier: Level {level.current}
                </span>
                <h3 className="text-2xl font-bold text-foreground mt-0.5">{level.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(totalXP)} Total Lifetime Points
                </p>
              </div>
            </div>

            <div className="w-full md:w-72 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Next: Level 3 ({level.nextName})</span>
                <span className="text-primary font-bold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{level.prevXP} XP</span>
                <span className="font-semibold text-foreground">{level.nextXP - totalXP} XP remaining</span>
                <span>{level.nextXP} XP</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History Table */}
      {loading ? (
        <LoadingSpinner text="Reading immutable XP ledger..." />
      ) : (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">XP Transaction Ledger</CardTitle>
            <CardDescription>Audited ledger of point dispatches and reversals</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {tx.source_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {tx.description}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      +{tx.points} XP
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
