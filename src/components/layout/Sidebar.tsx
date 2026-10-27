import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import {
  LayoutDashboard, Users, UserCircle, Package, ShoppingCart,
  Target, Trophy, Zap, DollarSign, Gift, BarChart3,
  FileText, Bell, Shield, Settings, Building2,
  Briefcase, TrendingUp, ChevronLeft, Menu,
  Handshake, UserCog, Mail, Inbox, Send, FileEdit, Trash2,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { emailService } from '@/services/email.service';
import { useState as useStateLocal, useEffect as useEffectLocal } from 'react';
import { UserRole } from '@/types';
import { useState } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
  comingSoon?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, roles: [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER, UserRole.SALES_REP] },
  { label: 'CRM', path: '/leads', icon: <Handshake size={20} />, roles: [UserRole.ORG_ADMIN, UserRole.MANAGER, UserRole.SALES_REP] },
  { label: 'Sales', path: '/sales', icon: <ShoppingCart size={20} />, roles: [UserRole.ORG_ADMIN, UserRole.MANAGER, UserRole.SALES_REP] },
  { label: 'Products', path: '/products', icon: <Package size={20} />, roles: [UserRole.ORG_ADMIN] },
  { label: 'Customers', path: '/customers', icon: <UserCircle size={20} />, roles: [UserRole.ORG_ADMIN, UserRole.MANAGER, UserRole.SALES_REP] },
  { label: 'Mail', path: '/mail', icon: <Mail size={20} />, roles: [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER, UserRole.SALES_REP] },
  { label: 'Targets', path: '/targets', icon: <Target size={20} />, roles: [UserRole.ORG_ADMIN, UserRole.MANAGER, UserRole.SALES_REP], comingSoon: true },
  { label: 'Leaderboard', path: '/leaderboard', icon: <Trophy size={20} />, roles: [UserRole.ORG_ADMIN, UserRole.MANAGER, UserRole.SALES_REP], comingSoon: true },
  { label: 'XP & Achievements', path: '/gamification', icon: <Zap size={20} />, roles: [UserRole.ORG_ADMIN, UserRole.SALES_REP], comingSoon: true },
  { label: 'Commissions', path: '/commissions', icon: <DollarSign size={20} />, roles: [UserRole.ORG_ADMIN, UserRole.SALES_REP], comingSoon: true },
  { label: 'Bonuses', path: '/bonuses', icon: <Gift size={20} />, roles: [UserRole.ORG_ADMIN, UserRole.SALES_REP], comingSoon: true },
  { label: 'Analytics', path: '/analytics', icon: <BarChart3 size={20} />, roles: [UserRole.ORG_ADMIN, UserRole.MANAGER], comingSoon: true },
  { label: 'Employees', path: '/employees', icon: <Users size={20} />, roles: [UserRole.ORG_ADMIN], comingSoon: true },
  { label: 'Teams', path: '/teams', icon: <Briefcase size={20} />, roles: [UserRole.ORG_ADMIN, UserRole.MANAGER], comingSoon: true },
  { label: 'Reports', path: '/reports', icon: <FileText size={20} />, roles: [UserRole.ORG_ADMIN, UserRole.MANAGER], comingSoon: true },
  { label: 'Notifications', path: '/notifications', icon: <Bell size={20} />, roles: [UserRole.ORG_ADMIN, UserRole.MANAGER, UserRole.SALES_REP], comingSoon: true },
  { label: 'Audit Logs', path: '/audit-logs', icon: <Shield size={20} />, roles: [UserRole.ORG_ADMIN], comingSoon: true },
  { label: 'Settings', path: '/settings', icon: <Settings size={20} />, roles: [UserRole.ORG_ADMIN, UserRole.MANAGER, UserRole.SALES_REP], comingSoon: true },
];

const superAdminItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, roles: [UserRole.SUPER_ADMIN] },
  { label: 'Mail', path: '/mail', icon: <Mail size={20} />, roles: [UserRole.SUPER_ADMIN] },
  { label: 'Organizations', path: '/organizations', icon: <Building2 size={20} />, roles: [UserRole.SUPER_ADMIN] },
  { label: 'Users', path: '/admin/users', icon: <UserCog size={20} />, roles: [UserRole.SUPER_ADMIN] },
  { label: 'Settings', path: '/settings', icon: <Settings size={20} />, roles: [UserRole.SUPER_ADMIN] },
];

export function Sidebar() {
  const { profile, organization } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mailExpanded, setMailExpanded] = useState(true);
  const [folderCounts, setFolderCounts] = useStateLocal({
    inbox: 0,
    sent: 0,
    drafts: 0,
    trash: 0,
    unread: 0,
  });

  const userEmail = profile?.email ?? '';

  useEffectLocal(() => {
    const updateCounts = () => {
      setFolderCounts(emailService.getFolderCounts(userEmail));
    };
    updateCounts();
    const interval = setInterval(updateCounts, 4000);
    return () => clearInterval(interval);
  }, [userEmail]);

  if (!profile) return null;

  const role = profile.role as UserRole;
  const items = role === UserRole.SUPER_ADMIN
    ? superAdminItems
    : navItems.filter(item => item.roles.includes(role));

  const isMailActive = location.pathname.startsWith('/mail');
  const currentParams = new URLSearchParams(location.search);
  const currentFolder = currentParams.get('folder') || 'inbox';

  const mailSubItems = [
    { key: 'inbox', label: 'Inbox', path: '/mail?folder=inbox', icon: <Inbox size={15} />, count: folderCounts.unread, isUnread: true },
    { key: 'sent', label: 'Sent', path: '/mail?folder=sent', icon: <Send size={15} />, count: folderCounts.sent },
    { key: 'drafts', label: 'Drafts', path: '/mail?folder=drafts', icon: <FileEdit size={15} />, count: folderCounts.drafts },
    { key: 'trash', label: 'Trash', path: '/mail?folder=trash', icon: <Trash2 size={15} />, count: folderCounts.trash },
  ];

  const sidebarContent = (
    <div className={cn(
      "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
      collapsed ? "w-16" : "w-[244px]"
    )}>
      {/* Logo / Brand */}
      <div className="flex h-[72px] items-center gap-3 border-b border-sidebar-border/70 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary shadow-[0_6px_16px_rgba(37,99,235,0.2)]">
          <TrendingUp className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col animate-fade-in">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">SalesOS</span>
            <span className="text-[10px] text-sidebar-foreground/60 truncate max-w-[150px]">
              {organization?.name || 'Platform'}
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto hidden lg:flex h-7 w-7 items-center justify-center rounded-md hover:bg-sidebar-accent transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="flex flex-col gap-1 px-3">
          {items.map((item) => {
            const isMail = item.path === '/mail';

            if (isMail) {
              const active = isMailActive;

              return (
                <div key="/mail" className="flex flex-col">
                  {/* Mail Parent Item */}
                  <div className="flex items-center">
                    <Link
                      to="/mail?folder=inbox"
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      <span className={cn("shrink-0", active && "text-sidebar-primary")}>
                        {item.icon}
                      </span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && folderCounts.unread > 0 && (
                        <span className="ml-auto flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {folderCounts.unread}
                        </span>
                      )}
                    </Link>

                    {!collapsed && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setMailExpanded(!mailExpanded);
                        }}
                        className="p-1.5 ml-1 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 rounded-md transition-colors"
                        title={mailExpanded ? "Collapse folders" : "Expand folders"}
                      >
                        {mailExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    )}
                  </div>

                  {/* Mail Sub-folders (Inbox, Sent, Drafts, Trash) */}
                  {!collapsed && mailExpanded && (
                    <div className="ml-4 pl-3 border-l border-sidebar-border/60 my-1 flex flex-col gap-0.5 animate-fade-in">
                      {mailSubItems.map(sub => {
                        const isSubActive = isMailActive && currentFolder === sub.key;

                        return (
                          <Link
                            key={sub.key}
                            to={sub.path}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                              isSubActive
                                ? "bg-sidebar-accent/80 text-sidebar-primary font-semibold"
                                : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                            )}
                          >
                            <span className={cn("shrink-0", isSubActive ? "text-sidebar-primary" : "text-sidebar-foreground/50")}>
                              {sub.icon}
                            </span>
                            <span className="truncate">{sub.label}</span>
                            {sub.count > 0 && (
                              <span
                                className={cn(
                                  "ml-auto text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                                  sub.isUnread
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-sidebar-accent text-sidebar-foreground/70"
                                )}
                              >
                                {sub.count}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

            const navTo = item.comingSoon ? '/coming-soon' : item.path;

            return (
              <Link
                key={item.path}
                to={navTo}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <span className={cn("shrink-0", isActive && "text-sidebar-primary")}>
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.comingSoon && (
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    Soon
                  </span>
                )}
                {isActive && !collapsed && !item.comingSoon && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary animate-pulse-soft" />
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User profile */}
      <div className="border-t border-sidebar-border/70 p-4">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs">
              {getInitials(profile.first_name, profile.last_name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-col min-w-0 animate-fade-in">
              <span className="text-sm font-medium truncate">
                {profile.first_name} {profile.last_name}
              </span>
              <span className="text-[10px] text-sidebar-foreground/60 truncate capitalize">
                {(profile.role ? String(profile.role).replace(/_/g, ' ').toLowerCase() : 'sales rep')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 flex lg:hidden h-10 w-10 items-center justify-center rounded-lg bg-sidebar text-sidebar-foreground shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 lg:hidden transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-screen sticky top-0">
        {sidebarContent}
      </div>
    </>
  );
}
