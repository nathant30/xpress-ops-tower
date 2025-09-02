-- SQLite-compatible surge hex metadata table
-- Nightly job writes recommended resolution per hex based on data density

CREATE TABLE IF NOT EXISTS surge_hex_meta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT NOT NULL,
  h3_index TEXT NOT NULL,
  trips_30d INTEGER NOT NULL DEFAULT 0,
  recommended_res INTEGER NOT NULL,                   -- recommended H3 resolution for this hex
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (region_id) REFERENCES regions(region_id) ON DELETE CASCADE,
  UNIQUE (h3_index)
);