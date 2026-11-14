import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronRight, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/constants';

interface TopNavProps {
  breadcrumbs?: { label: string; path?: string }[];
}

export function TopNav({ breadcrumbs = [] }: TopNavProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 sm:h-[72px] items-center gap-2 sm:gap-4 border-b border-border/70 bg-background/90 px-3 sm:px-5 lg:px-8 backdrop-blur">
      {/* Breadcrumbs / Page Title */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground flex-1 pl-11 lg:pl-0 min-w-0">
        <span className="text-foreground font-semibold tracking-[-0.02em] text-xs sm:text-sm truncate">SalesOS</span>
        <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
        <span className="text-muted-foreground font-medium text-[11px] sm:text-xs truncate">
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
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
