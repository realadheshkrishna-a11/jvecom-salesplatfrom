import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { gamificationService } from '@/services/gamification.service';
import type { LeaderboardEntry } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Trophy, Flame, Zap, Award, Crown, Medal, ArrowUpRight } from 'lucide-react';

export function LeaderboardPage() {
  const { organization, profile } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';

  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<'REVENUE' | 'SALES_COUNT' | 'XP'>('REVENUE');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await gamificationService.getLeaderboard(orgId, metric, 20);
        if (res && res.length > 0) {
          setEntries(res);
        } else {
          setEntries([]);
        }
      } catch (err) {
        console.error('Error in Leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, metric]);

  const topThree = entries.slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Sales Leaderboard"
        subtitle="Celebrate top-performing sales closers across revenue generation, deal velocity, and XP milestones."
      >
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/50">
          <Button
            size="sm"
            variant={metric === 'REVENUE' ? 'default' : 'ghost'}
            className="text-xs h-7"
            onClick={() => setMetric('REVENUE')}
          >
            Revenue
          </Button>
          <Button
            size="sm"
            variant={metric === 'SALES_COUNT' ? 'default' : 'ghost'}
            className="text-xs h-7"
            onClick={() => setMetric('SALES_COUNT')}
          >
            Deals Closed
          </Button>
          <Button
            size="sm"
            variant={metric === 'XP' ? 'default' : 'ghost'}
            className="text-xs h-7"
            onClick={() => setMetric('XP')}
          >
            XP Points
          </Button>
        </div>
      </PageHeader>

      {/* Podium for Top 3 */}
      {topThree.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 pt-6 pb-2 max-w-2xl mx-auto">
          {/* 2nd Place */}
          <Card className="order-1 flex flex-col items-center justify-end p-5 text-center bg-card border-border/60 relative mt-6">
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-lg mb-2 shadow-md">
              🥈
            </div>
            <h4 className="font-bold text-sm text-foreground">{topThree[1].first_name} {topThree[1].last_name}</h4>
            <p className="text-[11px] text-muted-foreground">{topThree[1].team_name}</p>
            <div className="mt-2 text-sm font-bold text-foreground">
              {metric === 'REVENUE' ? formatCurrency(topThree[1].revenue) :
               metric === 'SALES_COUNT' ? `${topThree[1].sales_count} deals` :
               `${formatNumber(topThree[1].xp)} XP`}
            </div>
          </Card>

          {/* 1st Place Champion */}
          <Card className="order-2 flex flex-col items-center justify-end p-6 text-center bg-gradient-to-b from-amber-500/10 via-card to-card border-amber-500/40 relative shadow-lg shadow-amber-500/5">
            <div className="absolute -top-4 w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Crown className="w-5 h-5" />
            </div>
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-2xl mb-2 mt-2 border-2 border-amber-500">
              🥇
            </div>
            <h4 className="font-bold text-base text-foreground">{topThree[0].first_name} {topThree[0].last_name}</h4>
            <p className="text-xs text-muted-foreground">{topThree[0].team_name}</p>
            <div className="mt-3 text-base font-bold text-amber-500">
              {metric === 'REVENUE' ? formatCurrency(topThree[0].revenue) :
               metric === 'SALES_COUNT' ? `${topThree[0].sales_count} deals` :
               `${formatNumber(topThree[0].xp)} XP`}
            </div>
          </Card>

          {/* 3rd Place */}
          <Card className="order-3 flex flex-col items-center justify-end p-5 text-center bg-card border-border/60 relative mt-8">
            <div className="w-12 h-12 rounded-full bg-amber-800/10 flex items-center justify-center font-bold text-amber-700 text-lg mb-2 shadow-md">
              🥉
            </div>
            <h4 className="font-bold text-sm text-foreground">{topThree[2].first_name} {topThree[2].last_name}</h4>
            <p className="text-[11px] text-muted-foreground">{topThree[2].team_name}</p>
            <div className="mt-2 text-sm font-bold text-foreground">
              {metric === 'REVENUE' ? formatCurrency(topThree[2].revenue) :
               metric === 'SALES_COUNT' ? `${topThree[2].sales_count} deals` :
               `${formatNumber(topThree[2].xp)} XP`}
            </div>
          </Card>
        </div>
      )}

      {/* Full Leaderboard Table */}
      {loading ? (
        <LoadingSpinner text="Computing real-time rankings..." />
      ) : (
        <Card className="border-border/60">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead>Sales Closer</TableHead>
                  <TableHead>Squad / Team</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Deals</TableHead>
                  <TableHead className="text-right">XP Points</TableHead>
                  <TableHead className="text-right">Target Attainment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const isMe = entry.user_id === profile?.id;
                  return (
                    <TableRow key={entry.rank} className={isMe ? 'bg-primary/5 font-semibold' : ''}>
                      <TableCell className="text-center font-bold">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                          entry.rank === 1 ? 'bg-amber-500 text-white' :
                          entry.rank === 2 ? 'bg-slate-300 text-slate-800' :
                          entry.rank === 3 ? 'bg-amber-700 text-white' : 'text-muted-foreground'
                        }`}>
                          {entry.rank}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-sm">
                          {entry.first_name} {entry.last_name}
                          {isMe && <Badge variant="default" className="ml-2 text-[9px]">You</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {entry.team_name || 'Individual'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm">
                        {formatCurrency(entry.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {entry.sales_count}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-purple-600 dark:text-purple-400 font-bold">
                        {formatNumber(entry.xp)} XP
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm">
                        <span className={entry.target_achievement >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}>
                          {entry.target_achievement}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
