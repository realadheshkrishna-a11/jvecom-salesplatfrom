// =============================================================================
// SalesOS — Role-Based Access Control (single source of truth)
// =============================================================================
// Every module an Org Admin can grant during invitation is defined here, along
// with the routes it unlocks. The sidebar, route guard, dashboard shortcuts and
// the invite dialog all read from this file so permissions stay consistent.
// =============================================================================

import { UserRole } from '@/types';
import type { Profile } from '@/types';

export type ModuleId =
  | 'dashboard' | 'crm' | 'sales' | 'b2b-orders' | 'products' | 'customers'
  | 'mail' | 'targets' | 'leaderboard' | 'gamification' | 'commissions'
  | 'bonuses' | 'analytics' | 'employees' | 'teams' | 'reports'
  | 'notifications' | 'audit-logs' | 'settings';

export interface ModuleDef {
  id: ModuleId;
  label: string;
  description: string;
  /** Primary route for shortcuts */
  path: string;
  /** Route prefixes this module unlocks */
  paths: string[];
  /** Modules that grant admin-level powers (shown with a warning in the invite dialog) */
  sensitive?: boolean;
}

export const MODULES: ModuleDef[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Personal overview', path: '/dashboard', paths: ['/dashboard'] },
  { id: 'crm', label: 'CRM', description: 'Leads pipeline', path: '/leads', paths: ['/leads'] },
  { id: 'sales', label: 'Sales', description: 'Record & view sales', path: '/sales', paths: ['/sales'] },
  { id: 'b2b-orders', label: 'B2B Orders', description: 'Wholesale orders', path: '/b2b-orders', paths: ['/b2b-orders', '/orders'] },
  { id: 'products', label: 'Products', description: 'Catalogue & pricing', path: '/products', paths: ['/products'] },
  { id: 'customers', label: 'Customers', description: 'Accounts & contacts', path: '/customers', paths: ['/customers'] },
  { id: 'mail', label: 'Mail', description: 'Team inbox', path: '/mail', paths: ['/mail'] },
  { id: 'targets', label: 'Targets', description: 'Quotas & goals', path: '/targets', paths: ['/targets'] },
  { id: 'leaderboard', label: 'Leaderboard', description: 'Rankings', path: '/leaderboard', paths: ['/leaderboard'] },
  { id: 'gamification', label: 'XP & Achievements', description: 'Levels & badges', path: '/gamification', paths: ['/gamification', '/achievements'] },
  { id: 'commissions', label: 'Commissions', description: 'Earnings', path: '/commissions', paths: ['/commissions', '/compensation'] },
  { id: 'bonuses', label: 'Bonuses', description: 'Incentives', path: '/bonuses', paths: ['/bonuses'] },
  { id: 'analytics', label: 'Analytics', description: 'Business insights', path: '/analytics', paths: ['/analytics'] },
  { id: 'employees', label: 'Employees', description: 'Invite & manage staff', path: '/employees', paths: ['/employees'], sensitive: true },
  { id: 'teams', label: 'Teams', description: 'Team structure', path: '/teams', paths: ['/teams'] },
  { id: 'reports', label: 'Reports', description: 'Exports & reports', path: '/reports', paths: ['/reports'] },
  { id: 'notifications', label: 'Notifications', description: 'Alerts', path: '/notifications', paths: ['/notifications'] },
  { id: 'audit-logs', label: 'Audit Logs', description: 'Security history', path: '/audit-logs', paths: ['/audit-logs'], sensitive: true },
  { id: 'settings', label: 'Settings', description: 'Preferences', path: '/settings', paths: ['/settings'] },
];

const ALL_MODULE_IDS = MODULES.map(m => m.id);

/** Dashboard is always granted so every employee has a personalised landing page. */
export const ALWAYS_ALLOWED: ModuleId[] = ['dashboard'];

/** Default module set pre-selected for each role in the invite dialog. */
export const ROLE_DEFAULT_MODULES: Record<UserRole, ModuleId[]> = {
  [UserRole.SUPER_ADMIN]: ALL_MODULE_IDS,
  [UserRole.ORG_ADMIN]: ALL_MODULE_IDS,
  [UserRole.MANAGER]: [
    'dashboard', 'crm', 'sales', 'b2b-orders', 'customers', 'mail', 'targets',
    'leaderboard', 'analytics', 'teams', 'reports', 'notifications', 'settings',
  ],
  [UserRole.SALES_REP]: [
    'dashboard', 'crm', 'sales', 'b2b-orders', 'customers', 'mail', 'targets',
    'leaderboard', 'gamification', 'commissions', 'bonuses', 'notifications', 'settings',
  ],
};

export function isModuleId(value: string): value is ModuleId {
  return (ALL_MODULE_IDS as string[]).includes(value);
}

/** Serialise a module selection for storage in `profiles.access_only`. */
export function serializeAccess(modules: Iterable<string>): string {
  const set = new Set<string>([...modules].filter(isModuleId));
  ALWAYS_ALLOWED.forEach(m => set.add(m));
  // Keep a stable order matching MODULES
  return ALL_MODULE_IDS.filter(id => set.has(id)).join(',');
}

/**
 * Resolve the effective set of modules for a profile.
 * - SUPER_ADMIN: everything.
 * - access_only missing / 'ALL' (legacy accounts): the role's default set.
 * - Explicit list (set by Org Admin at invitation): exactly that list (+ dashboard).
 */
export function getAllowedModules(profile: Pick<Profile, 'role' | 'access_only'> | null | undefined): Set<ModuleId> {
  if (!profile) return new Set();
  const role = profile.role as UserRole;
  if (role === UserRole.SUPER_ADMIN) return new Set(ALL_MODULE_IDS);

  const raw = (profile.access_only ?? '').trim();
  if (!raw || raw.toUpperCase() === 'ALL') {
    return new Set(ROLE_DEFAULT_MODULES[role] ?? ALWAYS_ALLOWED);
  }

  const set = new Set<ModuleId>(ALWAYS_ALLOWED);
  raw.split(',').map(s => s.trim().toLowerCase()).filter(isModuleId).forEach(m => set.add(m));
  return set;
}

/** Find the module that owns a route (longest-prefix match). */
export function moduleForPath(pathname: string): ModuleDef | undefined {
  let best: { mod: ModuleDef; len: number } | undefined;
  for (const mod of MODULES) {
    for (const p of mod.paths) {
      if ((pathname === p || pathname.startsWith(`${p}/`)) && (!best || p.length > best.len)) {
        best = { mod, len: p.length };
      }
    }
  }
  return best?.mod;
}

export function canAccessModule(profile: Parameters<typeof getAllowedModules>[0], moduleId: ModuleId): boolean {
  return getAllowedModules(profile).has(moduleId);
}

/** Routes not owned by any module are allowed (e.g. SUPER_ADMIN-only areas guard themselves). */
export function canAccessPath(profile: Parameters<typeof getAllowedModules>[0], pathname: string): boolean {
  const mod = moduleForPath(pathname);
  return mod ? canAccessModule(profile, mod.id) : true;
}

/** Landing route after login: dashboard (always allowed). */
export function getHomePath(): string {
  return '/dashboard';
}

