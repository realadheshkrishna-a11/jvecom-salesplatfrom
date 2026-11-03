import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { notificationsService } from '@/services/notifications.service';
import type { Notification } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Bell, CheckCheck, Clock, Award, Target, UserPlus, Info } from 'lucide-react';

export function NotificationListPage() {
  const { profile } = useAuth();
  const userId = profile?.id || '44444444-4444-4444-4444-444444444441';
  const { success } = useToast();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationsService.list(userId);
      if (res && res.length > 0) {
        setNotifications(res);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      success('Marked All as Read', 'All notifications have been cleared');
    } catch (err) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      success('Marked All as Read', 'All notifications have been cleared');
    }
  };

  const handleMarkSingleAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Notifications &amp; Activity Alerts"
        subtitle="Real-time notifications on deal assignments, follow-ups, quota milestones, and gamification rewards."
      >
        <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="gap-2">
          <CheckCheck className="w-4 h-4" /> Mark all as read
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingSpinner text="Fetching notifications..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="All caught up!"
          description="You have no unread alerts or notifications at this moment."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              className={`border transition-all ${
                !notif.is_read
                  ? 'border-primary/40 bg-card shadow-xs'
                  : 'border-border/40 bg-muted/20 opacity-80'
              }`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    !notif.is_read
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-foreground leading-tight">
                      {notif.title}
                    </h4>
                    <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
                {!notif.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary"
                    onClick={() => handleMarkSingleAsRead(notif.id)}
                  >
                    Dismiss
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
