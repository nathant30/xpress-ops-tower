-- SQLite-compatible surge signals table
-- Aggregated signals per hex & minute for ML features and diagnostics

CREATE TABLE IF NOT EXISTS surge_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_id TEXT NOT NULL,
  h3_index TEXT NOT NULL,
  ts_minute TEXT NOT NULL,                            -- timestamp as TEXT in SQLite
  req_count INTEGER NOT NULL DEFAULT 0,               -- rider requests
  searchers INTEGER NOT NULL DEFAULT 0,               -- riders searching but not booked
  active_drivers INTEGER NOT NULL DEFAULT 0,
  avg_eta_sec INTEGER,
  cancels INTEGER NOT NULL DEFAULT 0,
  weather_score REAL,                                 -- normalized 0..1
  traffic_score REAL,
  event_score REAL,
  
  FOREIGN KEY (region_id) REFERENCES regions(region_id) ON DELETE CASCADE,
  UNIQUE (h3_index, ts_minute)
);

CREATE INDEX IF NOT EXISTS surge_signals_hex_time_idx 
  ON surge_signals(h3_index, ts_minute DESC);