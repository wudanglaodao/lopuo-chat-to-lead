ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS summary_model text,
  ADD COLUMN IF NOT EXISTS summary_updated_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS leads_customer_site_tenant_created_idx
  ON leads(customer_id, site_id, tenant_id, created_at DESC);
