-- Enhanced audit log with structured old→new value tracking
-- Supports all pricing changes with immutable append-only design

-- Drop and recreate with enhanced schema
DROP TABLE IF EXISTS pricing_audit_log;

CREATE TABLE IF NOT EXISTS pricing_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,                          -- UUID as TEXT in SQLite
  action TEXT NOT NULL CHECK (action IN (
    'update_component',
    'update_description', 
    'publish_toggle',
    'transparency_change',
    'earnings_change',
    'link_change',
    'profile_status_change',
    'profile_create',
    'profile_activate',
    'profile_retire'
  )),
  old_value TEXT,                                 -- JSON as TEXT (nullable for creates)
  new_value TEXT,                                 -- JSON as TEXT (nullable for deletes)
  entity_type TEXT,                               -- 'profile', 'component', 'earnings_policy', 'link'
  entity_id TEXT,                                 -- ID of specific entity being changed
  change_reason TEXT,                             -- Optional reason/context
  ip_address TEXT,                                -- For security tracking
  user_agent TEXT,                                -- Browser/API client info
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles(id) ON DELETE CASCADE
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS pal_profile_idx ON pricing_audit_log(profile_id);
CREATE INDEX IF NOT EXISTS pal_user_idx ON pricing_audit_log(user_id);
CREATE INDEX IF NOT EXISTS pal_action_idx ON pricing_audit_log(action);
CREATE INDEX IF NOT EXISTS pal_created_idx ON pricing_audit_log(created_at);
CREATE INDEX IF NOT EXISTS pal_entity_idx ON pricing_audit_log(entity_type, entity_id);