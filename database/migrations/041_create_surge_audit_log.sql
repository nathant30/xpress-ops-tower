-- SQLite-compatible surge audit log table
-- Comprehensive audit trail for all surge-related changes

CREATE TABLE IF NOT EXISTS surge_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT NOT NULL,
  service_key TEXT NOT NULL,
  user_id TEXT NOT NULL,                              -- UUID as TEXT in SQLite
  action TEXT NOT NULL,                               -- 'profile_update','override_create','schedule_create','model_change'
  old_value TEXT,                                     -- JSON as TEXT in SQLite
  new_value TEXT,                                     -- JSON as TEXT in SQLite
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (region_id) REFERENCES regions(region_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS surge_audit_idx 
  ON surge_audit_log(region_id, service_key, created_at DESC);