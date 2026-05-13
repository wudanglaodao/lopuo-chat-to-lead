CREATE INDEX IF NOT EXISTS conversations_customer_site_updated_idx
  ON conversations(customer_id, site_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS conversations_customer_site_tenant_updated_idx
  ON conversations(customer_id, site_id, tenant_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS messages_conversation_role_created_idx
  ON messages(conversation_id, role, created_at);

CREATE INDEX IF NOT EXISTS leads_conversation_created_idx
  ON leads(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS knowledge_sources_tenant_updated_idx
  ON knowledge_sources(tenant_id, updated_at DESC);
