-- Integrity check reports from nightly jobs
-- Tracks data quality issues, orphaned records, compliance violations

CREATE TABLE IF NOT EXISTS pricing_integrity_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_type TEXT NOT NULL CHECK (report_type IN ('nightly', 'on_demand', 'compliance_audit')),
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  generated_by TEXT,                              -- UUID of user or 'system' for automated
  total_issues INTEGER NOT NULL DEFAULT 0,
  critical_issues INTEGER NOT NULL DEFAULT 0,
  warning_issues INTEGER NOT NULL DEFAULT 0,
  issues TEXT NOT NULL,                           -- JSON array of IntegrityIssue objects
  remediation_status TEXT CHECK (remediation_status IN ('pending', 'in_progress', 'resolved', 'ignored')) DEFAULT 'pending',
  remediated_by TEXT,                             -- UUID of user who resolved issues
  remediated_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Table for tracking individual integrity issues
CREATE TABLE IF NOT EXISTS pricing_integrity_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL,
  code TEXT NOT NULL,                             -- 'ORPHANED_LINK', 'MISSING_EARNINGS_POLICY', etc.
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'error', 'critical')),
  entity_type TEXT NOT NULL,                      -- 'pricing_profile_links', 'pricing_components', etc.
  entity_id TEXT,                                 -- ID of affected entity
  context TEXT,                                   -- JSON context data
  status TEXT CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')) DEFAULT 'open',
  assigned_to TEXT,                               -- UUID of user assigned to fix
  resolved_at TEXT,
  resolution_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (report_id) REFERENCES pricing_integrity_reports(id) ON DELETE CASCADE
);

-- Indexes for integrity tracking
CREATE INDEX IF NOT EXISTS pir_type_date_idx ON pricing_integrity_reports(report_type, generated_at);
CREATE INDEX IF NOT EXISTS pii_status_idx ON pricing_integrity_issues(status, severity);
CREATE INDEX IF NOT EXISTS pii_entity_idx ON pricing_integrity_issues(entity_type, entity_id);