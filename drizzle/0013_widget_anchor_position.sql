ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS launcher_anchor_selector text,
  ADD COLUMN IF NOT EXISTS launcher_anchor_gap integer NOT NULL DEFAULT 8;
