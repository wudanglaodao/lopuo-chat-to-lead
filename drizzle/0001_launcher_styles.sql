ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS launcher_style text NOT NULL DEFAULT 'vertical',
  ADD COLUMN IF NOT EXISTS launcher_image_url text,
  ADD COLUMN IF NOT EXISTS launcher_badge_text text,
  ADD COLUMN IF NOT EXISTS launcher_animation text NOT NULL DEFAULT 'pulse';
