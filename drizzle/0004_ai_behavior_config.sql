ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS ai_tone text NOT NULL DEFAULT 'friendly',
  ADD COLUMN IF NOT EXISTS tone_keywords jsonb NOT NULL DEFAULT '["友好","克制","先理解意图","不急于留资","像真人客服同事"]'::jsonb,
  ADD COLUMN IF NOT EXISTS business_flow text;
