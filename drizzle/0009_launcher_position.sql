ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS launcher_position text NOT NULL DEFAULT 'bottom-right';
