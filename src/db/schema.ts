import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

const now = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  serviceMode: text("service_mode").notNull().default("shared"),
  primaryDomain: text("primary_domain"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  createdAt: now(),
  updatedAt: updatedAt(),
});

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("active"),
    createdAt: now(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("tenants_customer_idx").on(table.customerId),
    uniqueIndex("tenants_customer_name_idx").on(table.customerId, table.name),
  ],
);

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    defaultTenantId: uuid("default_tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    domain: text("domain").notNull(),
    widgetName: text("widget_name").notNull().default("AI 助理"),
    welcomeMessage: text("welcome_message").notNull(),
    themeColor: text("theme_color").notNull().default("#16a34a"),
    launcherText: text("launcher_text").notNull().default("AI 助理"),
    launcherStyle: text("launcher_style").notNull().default("vertical"),
    launcherImageUrl: text("launcher_image_url"),
    launcherBadgeText: text("launcher_badge_text"),
    launcherAnimation: text("launcher_animation").notNull().default("pulse"),
    suggestedQuestions: jsonb("suggested_questions")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    allowedOrigins: jsonb("allowed_origins")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    showSources: boolean("show_sources").notNull().default(true),
    collectLeadEnabled: boolean("collect_lead_enabled").notNull().default(true),
    systemPrompt: text("system_prompt"),
    deepseekModel: text("deepseek_model"),
    embeddingModel: text("embedding_model"),
    createdAt: now(),
    updatedAt: updatedAt(),
  },
  (table) => [index("sites_customer_idx").on(table.customerId)],
);

export const customerUsers = pgTable("customer_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"),
  passwordHash: text("password_hash").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: now(),
  updatedAt: updatedAt(),
});

export const knowledgeSources = pgTable(
  "knowledge_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    status: text("status").notNull().default("pending"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: now(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("knowledge_sources_tenant_url_idx").on(table.tenantId, table.url),
    index("knowledge_sources_tenant_idx").on(table.tenantId),
    index("knowledge_sources_site_idx").on(table.siteId),
  ],
);

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => knowledgeSources.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    embedding: vector("embedding", { dimensions: 1024 }).notNull(),
    embeddingModel: text("embedding_model").notNull(),
    tokenCount: integer("token_count").notNull().default(0),
    createdAt: now(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("knowledge_chunks_tenant_hash_idx").on(
      table.tenantId,
      table.contentHash,
    ),
    index("knowledge_chunks_tenant_idx").on(table.tenantId),
    index("knowledge_chunks_site_idx").on(table.siteId),
    index("knowledge_chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    pageUrl: text("page_url"),
    referrer: text("referrer"),
    status: text("status").notNull().default("open"),
    hasLead: boolean("has_lead").notNull().default(false),
    hasMiss: boolean("has_miss").notNull().default(false),
    createdAt: now(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("conversations_tenant_updated_idx").on(table.tenantId, table.updatedAt),
    index("conversations_site_updated_idx").on(table.siteId, table.updatedAt),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    sources: jsonb("sources").$type<KnowledgeSourceHit[]>().notNull().default(sql`'[]'::jsonb`),
    latencyMs: integer("latency_ms"),
    model: text("model"),
    isMiss: boolean("is_miss").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    name: text("name"),
    phone: text("phone"),
    wechat: text("wechat"),
    email: text("email"),
    company: text("company"),
    requirement: text("requirement"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("leads_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("leads_site_created_idx").on(table.siteId, table.createdAt),
  ],
);

export const customerRelations = relations(customers, ({ many }) => ({
  sites: many(sites),
  users: many(customerUsers),
  tenants: many(tenants),
}));

export const tenantRelations = relations(tenants, ({ one, many }) => ({
  customer: one(customers, {
    fields: [tenants.customerId],
    references: [customers.id],
  }),
  sources: many(knowledgeSources),
  chunks: many(knowledgeChunks),
  conversations: many(conversations),
}));

export const siteRelations = relations(sites, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sites.customerId],
    references: [customers.id],
  }),
  defaultTenant: one(tenants, {
    fields: [sites.defaultTenantId],
    references: [tenants.id],
  }),
  sources: many(knowledgeSources),
  conversations: many(conversations),
}));

export const conversationRelations = relations(conversations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [conversations.tenantId],
    references: [tenants.id],
  }),
  messages: many(messages),
  leads: many(leads),
}));

export const messageRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const leadRelations = relations(leads, ({ one }) => ({
  conversation: one(conversations, {
    fields: [leads.conversationId],
    references: [conversations.id],
  }),
}));

export type Customer = typeof customers.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type Site = typeof sites.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Lead = typeof leads.$inferSelect;

export type KnowledgeSourceHit = {
  id: string;
  url: string;
  title: string | null;
  content: string;
  score: number;
};
