-- Modular linking: surge/surcharge/toll/special/pop profiles connected to a base profile
-- SQLite compatible version

CREATE TABLE IF NOT EXISTS pricing_profile_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,     -- the base profile
  link_type TEXT NOT NULL CHECK (link_type IN ('surge','surcharge','toll','special','pop')),
  linked_profile_id INTEGER NOT NULL,
  
  FOREIGN KEY (profile_id) REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (linked_profile_id) REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  UNIQUE (profile_id, link_type, linked_profile_id)
);

CREATE INDEX IF NOT EXISTS ppl_profile_idx ON pricing_profile_links(profile_id);