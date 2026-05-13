ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS launcher_bottom_offset integer NOT NULL DEFAULT 20;
