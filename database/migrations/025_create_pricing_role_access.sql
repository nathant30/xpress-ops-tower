-- Fine-grained pricing roles in addition to global RBAC
-- SQLite compatible version

CREATE TABLE IF NOT EXISTS pricing_role_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL, -- UUID as text in SQLite
  scope TEXT NOT NULL DEFAULT 'global',  -- 'global' or region code/id
  role TEXT NOT NULL
    CHECK (role IN ('pricing_viewer','pricing_editor','pricing_strategist','pricing_admin')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Fast gating by user/scope
CREATE INDEX IF NOT EXISTS pricing_role_access_user_scope_idx
  ON pricing_role_access(user_id, scope);