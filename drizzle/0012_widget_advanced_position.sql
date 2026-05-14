ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS launcher_horizontal_offset integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS widget_advanced_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS widget_custom_css text,
  ADD COLUMN IF NOT EXISTS widget_custom_js text;
