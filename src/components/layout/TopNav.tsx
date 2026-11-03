import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Settings, ChevronRight, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/constants';
import { useNotificationCount } from '@/hooks/useNotifications';

interface TopNavProps {
  breadcrumbs?: { label: string; path?: string }[];
}

export function TopNav({ breadcrumbs = [] }: TopNavProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { count: unreadCount } = useNotificationCount();

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-border/70 bg-background/90 px-5 backdrop-blur lg:px-8">
      {/* Breadcrumbs / Page Title */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground flex-1 pl-12 lg:pl-0">
        <span className="text-foreground font-semibold tracking-[-0.02em] text-sm">SalesOS</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-muted-foreground font-medium text-xs">
          {(profile?.role ? String(profile.role).replace(/_/g, ' ') : 'Sales')} Workspace
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Mail Quick Access */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          onClick={() => navigate('/mail?folder=inbox')}
          title="Inbox & Mail"
        >
          <Mail className="h-4.5 w-4.5" />
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          onClick={() => navigate('/notifications')}
          title="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute 1.5 top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex h-9 items-center gap-2 rounded-lg border border-transparent pl-2 pr-2.5 hover:border-border/70">
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                    {profile ? getInitials(profile.first_name, profile.last_name) : 'SO'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-left">
                <span className="text-xs font-semibold leading-tight">
                  {profile ? `${profile.first_name} ${profile.last_name}` : 'SalesOS'}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {profile ? (ROLE_LABELS[profile.role] || profile.role) : 'Workspace'}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold">{profile ? `${profile.first_name} ${profile.last_name}` : 'SalesOS'}</p>
                <p className="text-xs text-muted-foreground">{profile?.email || 'Workspace'}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings &amp; Preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
