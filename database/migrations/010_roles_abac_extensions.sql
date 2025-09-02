-- ABAC extensions + safety flags
DO $$ BEGIN
  CREATE TYPE pii_scope_enum AS ENUM ('none','masked','full');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE approval_status_enum AS ENUM ('pending','approved','rejected','cancelled','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend rbac_roles table with ABAC attributes
ALTER TABLE rbac_roles
  ADD COLUMN IF NOT EXISTS pii_scope pii_scope_enum NOT NULL DEFAULT 'masked',
  ADD COLUMN IF NOT EXISTS allowed_regions TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS domain TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS is_immutable BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sensitive BOOLEAN NOT NULL DEFAULT FALSE;

-- Map users to roles (if you don't already have this)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID,
  PRIMARY KEY (user_id, role_id)
);

-- Full role snapshots for rollback/audit
CREATE TABLE IF NOT EXISTS rbac_role_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
  version INT NOT NULL,
  snapshot JSONB NOT NULL,       -- entire role record including perms, abac
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_id, version)
);

-- Pending changes for dual-control
CREATE TABLE IF NOT EXISTS rbac_role_pending_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL,
  approver_id UUID,
  change JSONB NOT NULL,               -- partial/new role fields to apply
  status approval_status_enum NOT NULL DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,              -- e.g., now()+ interval '4 hours'
  CONSTRAINT approver_diff CHECK (approver_id IS NULL OR approver_id <> proposed_by)
);

-- Helper: next version number per role
CREATE OR REPLACE FUNCTION next_role_version(p_role_id UUID)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE v INT;
BEGIN
  SELECT COALESCE(MAX(version), 0)+1 INTO v FROM rbac_role_versions WHERE role_id = p_role_id;
  RETURN v;
END $$;

-- On direct UPDATE, write a version snapshot (for non-sensitive roles)
CREATE OR REPLACE FUNCTION rbac_roles_versioning()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO rbac_role_versions (role_id, version, snapshot, changed_by)
  VALUES (
    NEW.id,
    next_role_version(NEW.id),
    to_jsonb(OLD),
    NEW.updated_by
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_rbac_roles_versioning ON rbac_roles;
CREATE TRIGGER trg_rbac_roles_versioning
AFTER UPDATE ON rbac_roles
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION rbac_roles_versioning();

-- Baseline roles safety (mark as immutable+sensitive)
UPDATE rbac_roles
SET is_immutable = TRUE, sensitive = TRUE
WHERE LOWER(name) IN ('ground_ops','support','executive','iam_admin');