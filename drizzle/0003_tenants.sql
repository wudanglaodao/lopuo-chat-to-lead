CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenants_customer_idx ON tenants(customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_customer_name_idx ON tenants(customer_id, name);

INSERT INTO tenants (customer_id, name, description)
SELECT customers.id, '默认租户', '官网 AI 客服默认租户'
FROM customers
WHERE NOT EXISTS (
  SELECT 1
  FROM tenants
  WHERE tenants.customer_id = customers.id
    AND tenants.name = '默认租户'
);

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS default_tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL;

UPDATE sites
SET default_tenant_id = tenants.id
FROM tenants
WHERE tenants.customer_id = sites.customer_id
  AND tenants.name = '默认租户'
  AND sites.default_tenant_id IS NULL;

ALTER TABLE knowledge_sources
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

UPDATE knowledge_sources
SET tenant_id = sites.default_tenant_id
FROM sites
WHERE knowledge_sources.site_id = sites.id
  AND knowledge_sources.tenant_id IS NULL;

UPDATE knowledge_chunks
SET tenant_id = sites.default_tenant_id
FROM sites
WHERE knowledge_chunks.site_id = sites.id
  AND knowledge_chunks.tenant_id IS NULL;

ALTER TABLE knowledge_sources
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE knowledge_chunks
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL;

UPDATE conversations
SET tenant_id = sites.default_tenant_id
FROM sites
WHERE conversations.site_id = sites.id
  AND conversations.tenant_id IS NULL;

UPDATE messages
SET tenant_id = conversations.tenant_id
FROM conversations
WHERE messages.conversation_id = conversations.id
  AND messages.tenant_id IS NULL;

UPDATE leads
SET tenant_id = conversations.tenant_id
FROM conversations
WHERE leads.conversation_id = conversations.id
  AND leads.tenant_id IS NULL;

ALTER TABLE knowledge_sources DROP CONSTRAINT IF EXISTS knowledge_sources_site_id_url_key;
ALTER TABLE knowledge_chunks DROP CONSTRAINT IF EXISTS knowledge_chunks_site_id_content_hash_key;
DROP INDEX IF EXISTS knowledge_sources_site_url_idx;
DROP INDEX IF EXISTS knowledge_chunks_site_hash_idx;

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_sources_tenant_url_idx ON knowledge_sources(tenant_id, url);
CREATE INDEX IF NOT EXISTS knowledge_sources_tenant_idx ON knowledge_sources(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_chunks_tenant_hash_idx ON knowledge_chunks(tenant_id, content_hash);
CREATE INDEX IF NOT EXISTS knowledge_chunks_tenant_idx ON knowledge_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS conversations_tenant_updated_idx ON conversations(tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS leads_tenant_created_idx ON leads(tenant_id, created_at DESC);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
