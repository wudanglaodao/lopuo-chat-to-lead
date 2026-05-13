ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS multilingual_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_locale text NOT NULL DEFAULT 'zh-CN',
  ADD COLUMN IF NOT EXISTS enabled_locales jsonb NOT NULL DEFAULT '["zh-CN"]'::jsonb;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'zh-CN';
