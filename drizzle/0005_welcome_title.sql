ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS welcome_title text;

UPDATE sites
SET welcome_title = '您好，我是 ' || widget_name
WHERE welcome_title IS NULL OR trim(welcome_title) = '';

ALTER TABLE sites
  ALTER COLUMN welcome_title SET DEFAULT '您好，我是 AI 营销助手',
  ALTER COLUMN welcome_title SET NOT NULL;
