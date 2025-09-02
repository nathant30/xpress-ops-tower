-- Who gets the fare & how we split; tolls default to pass-through
-- SQLite compatible version

CREATE TABLE IF NOT EXISTS pricing_earnings_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  driver_comp_model TEXT NOT NULL
    CHECK (driver_comp_model IN ('commission','salaried','lease','hybrid')),
  fare_recipient TEXT NOT NULL
    CHECK (fare_recipient IN ('driver','xpress','partner_fleet')),
  revenue_split TEXT NOT NULL DEFAULT '{}', -- JSON as TEXT in SQLite
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  UNIQUE (profile_id)
);