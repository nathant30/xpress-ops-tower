-- SQLite-compatible version of pricing activation requests and approvals
-- Supports dual-approval workflow with diff tracking

CREATE TABLE IF NOT EXISTS pricing_activation_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  requested_by TEXT NOT NULL,                     -- UUID as TEXT in SQLite
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  diff TEXT NOT NULL,                             -- JSON as TEXT in SQLite (old→new values)
  status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','cancelled')) DEFAULT 'pending',
  emergency_blocked INTEGER NOT NULL DEFAULT 0,  -- BOOLEAN as INTEGER in SQLite
  effective_at TEXT,                              -- When activation should take effect
  supersede_profile_id INTEGER,                   -- Profile being replaced
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pricing_activation_approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  approver_id TEXT NOT NULL,                      -- UUID as TEXT in SQLite
  approved_at TEXT NOT NULL DEFAULT (datetime('now')),
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (request_id) REFERENCES pricing_activation_requests(id) ON DELETE CASCADE,
  UNIQUE (request_id, approver_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS par_profile_idx ON pricing_activation_requests(profile_id);
CREATE INDEX IF NOT EXISTS par_status_idx ON pricing_activation_requests(status);
CREATE INDEX IF NOT EXISTS paa_request_idx ON pricing_activation_approvals(request_id);