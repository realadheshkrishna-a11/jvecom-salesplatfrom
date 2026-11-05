-- =============================================================================
-- Migration 007: Employee module permissions (RBAC)
-- =============================================================================
-- Stores the modules an Org Admin grants an employee during invitation.
-- Format: comma-separated module ids, e.g. 'dashboard,crm,sales,customers'.
-- 'ALL' (legacy default) means "use the role's default module set".
-- Module ids are defined in src/lib/permissions.ts.
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS access_only TEXT NOT NULL DEFAULT 'ALL';

ALTER TABLE employee_invitations
  ADD COLUMN IF NOT EXISTS access_only TEXT NOT NULL DEFAULT 'ALL';

ALTER TABLE employee_invitations
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE employee_invitations
  ADD COLUMN IF NOT EXISTS user_id UUID;

COMMENT ON COLUMN profiles.access_only IS
  'Comma-separated module ids granted by the Org Admin (see src/lib/permissions.ts). ALL = role defaults.';

