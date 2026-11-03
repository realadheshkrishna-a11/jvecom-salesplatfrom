import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { gamificationService } from '@/services/gamification.service';
import type { Achievement, UserAchievement } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Zap, Award, Flame, Target, Star, CheckCircle2, Lock } from 'lucide-react';

export function AchievementsPage() {
  const { organization, profile } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';

  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [achRes, userAchRes] = await Promise.allSettled([
          gamificationService.getAchievements(orgId),
          gamificationService.getUserAchievements(profile?.id || '44444444-4444-4444-4444-444444444441'),
        ]);

        if (achRes.status === 'fulfilled' && achRes.value.length > 0) {
          setAchievements(achRes.value);
        } else {
          setAchievements([]);
        }

        if (userAchRes.status === 'fulfilled' && userAchRes.value.length > 0) {
          setUnlockedIds(new Set(userAchRes.value.map(ua => ua.achievement_id)));
        } else {
          // Fallback unlocked badges for user demo
          setUnlockedIds(new Set(['1', '2', '4']));
        }
      } catch (err) {
        console.error('Error loading achievements:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, profile]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Honors &amp; Achievements"
        subtitle="Earn badges, status, and milestone reward XP for extraordinary closing feats."
      />

      {loading ? (
        <LoadingSpinner text="Cataloging badges..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievements.map((ach) => {
            const isUnlocked = unlockedIds.has(ach.id);

            return (
              <Card
                key={ach.id}
                className={`border transition-all ${
                  isUnlocked
                    ? 'border-border/80 bg-gradient-to-br from-card to-muted/20 shadow-xs'
                    : 'border-border/40 bg-muted/20 opacity-70'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl ${
                        isUnlocked
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isUnlocked ? <Trophy className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                    </div>
                    <Badge variant={isUnlocked ? 'success' : 'outline'} className="text-[10px]">
                      {isUnlocked ? 'Unlocked' : 'Locked'}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold mt-3">{ach.name}</CardTitle>
                  <CardDescription className="text-xs">{ach.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-border/40">
                    <span className="text-muted-foreground">Reward XP</span>
                    <span className="font-bold text-primary">+{ach.xp_reward} XP</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
