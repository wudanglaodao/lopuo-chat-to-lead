ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS widget_logo_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS widget_logo_url text DEFAULT 'https://www.lopuo.com/wp-content/themes/lopuo-theme/assets/img/lopuo-logo-black.svg?ver=0.8.14',
  ADD COLUMN IF NOT EXISTS widget_logo_text text NOT NULL DEFAULT 'Lopuo';
