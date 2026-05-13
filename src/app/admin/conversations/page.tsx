import { sql } from "drizzle-orm";
import { ArrowUpRight, Check, Clock3, Filter, MessageSquareText, Search, UserRound } from "lucide-react";
import Link from "next/link";

import { conversations, leads, messages, tenants } from "@/db";
import { getDb } from "@/db";
import { getAdminSiteTenantContext } from "@/lib/admin-tenants";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { AdminShell } from "@/components/admin/admin-shell";
import { ConversationDeleteForm } from "@/components/admin/conversation-delete-form";

export const dynamic = "force-dynamic";

type ConversationRow = {
  id: string;
  pageUrl: string | null;
  hasMiss: boolean;
  hasLead: boolean;
  updatedAt?: Date | string | null;
  tenant?: { id: string; name: string } | null;
  previewContent?: string | null;
  messageCount: number;
  lead?: {
    id?: string | null;
    name?: string | null;
    phone?: string | null;
    wechat?: string | null;
    email?: string | null;
    company?: string | null;
  } | null;
};

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const { tenantRows, activeTenant } = await getAdminSiteTenantContext({
    customerId: session.customerId,
    siteId: session.siteId,
    requestedTenantId: params.tenantId,
  });
  const rows: ConversationRow[] = isDemoMode()
    ? getDemoConversations().filter((conversation) => !activeTenant || conversation.tenant?.id === activeTenant.id)
    : await getConversationListRows({
        customerId: session.customerId,
        siteId: session.siteId,
        tenantId: activeTenant?.id,
      });

  return (
    <AdminShell
      title="会话"
      description="查看访客咨询、AI 回复、未命中问题和留咨记录。"
      tenantSwitcher={{
        activeTenantId: activeTenant?.id,
        hrefBase: "/admin/conversations",
        tenants: tenantRows,
      }}
    >
      <section className="overflow-hidden rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-2 rounded-full bg-[#c7b6ff]" />
            <h2 className="text-2xl font-bold text-[#1f2024] dark:text-white">访客会话</h2>
          </div>
          <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-[18px] bg-[#f3f3f4] px-4 py-3 text-[#9aa0aa] dark:bg-white/8 dark:text-white/45 md:max-w-md">
            <Search className="h-5 w-5" />
            <span className="text-sm font-semibold">搜索访客、需求或消息</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="rounded-[16px] bg-[#1f2329] px-5 py-3 text-sm font-bold text-white dark:bg-white dark:text-[#1f2329]" type="button">
              高意向
            </button>
            <button className="rounded-[16px] px-5 py-3 text-sm font-bold text-[#777e89] dark:text-white/45" type="button">
              新咨询
            </button>
            <button
              className="grid h-12 w-12 place-items-center rounded-[16px] border border-black/[0.08] text-[#777e89] dark:border-white/10 dark:text-white/55"
              type="button"
              aria-label="筛选会话"
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-7 overflow-x-auto">
          <div className="min-w-[1120px]">
            <div className="grid grid-cols-[44px_1.25fr_150px_1.1fr_120px_110px_1fr_112px] gap-4 border-b border-black/[0.06] px-2 pb-4 text-sm font-bold text-[#777e89] dark:border-white/10 dark:text-white/45">
              <div />
              <div>访客</div>
              <div>场景</div>
              <div>来源页面</div>
              <div>状态</div>
              <div>消息</div>
              <div>留咨</div>
              <div />
            </div>

            <div className="divide-y divide-black/[0.06] dark:divide-white/10">
              {rows.map((conversation, index) => {
                const lead = conversation.lead;
                const preview = getPreview(conversation);
                const leadContact = lead ? lead.phone || lead.wechat || lead.email || "已留咨" : "未留咨";
                return (
                  <div
                    key={conversation.id}
                    className="grid grid-cols-[44px_1.25fr_150px_1.1fr_120px_110px_1fr_112px] items-center gap-4 px-2 py-4 text-sm transition hover:bg-[#f7f7f8] dark:hover:bg-white/[0.05]"
                  >
                    <div>
                      <span className="grid h-7 w-7 place-items-center rounded-lg border-2 border-[#d3d7de] dark:border-white/20">
                        {conversation.hasLead ? <Check className="h-4 w-4 text-[#6bb956]" /> : null}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar index={index} />
                      <div className="min-w-0">
                        <div className="truncate text-base font-bold text-[#1f2024] dark:text-white">{lead?.name || `访客 ${index + 1}`}</div>
                        <div className="mt-1 truncate text-sm font-semibold text-[#777e89]">{preview}</div>
                      </div>
                    </div>
                    <div>
                      <TenantPill name={conversation.tenant?.name || "默认场景"} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-[#5d646f] dark:text-white/70">{conversation.pageUrl || "未知页面"}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#9aa0aa]">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatTime(conversation.updatedAt)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {conversation.hasMiss ? <Badge tone="amber">未命中</Badge> : <Badge tone="green">正常</Badge>}
                      {conversation.hasLead ? <Badge tone="blue">留咨</Badge> : null}
                    </div>
                    <div className="flex items-center gap-2 font-bold text-[#1f2024] dark:text-white">
                      <MessageSquareText className="h-4 w-4 text-[#9aa0aa]" />
                      {conversation.messageCount}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-[#1f2024] dark:text-white">{lead?.company || "未留公司"}</div>
                      <div className="mt-1 truncate text-sm font-semibold text-[#777e89]">{leadContact}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <Link
                        href={`/admin/conversations/${conversation.id}${activeTenant?.id ? `?tenantId=${activeTenant.id}` : ""}`}
                        className="grid h-10 w-10 place-items-center rounded-full bg-[#eeeeef] text-[#777e89] transition hover:bg-[#2f7df6] hover:text-white dark:bg-white/8 dark:text-white/55 dark:hover:bg-[#2f7df6] dark:hover:text-white"
                        aria-label="查看会话"
                      >
                        <ArrowUpRight className="h-5 w-5" />
                      </Link>
                      <ConversationDeleteForm conversationId={conversation.id} />
                    </div>
                  </div>
                );
              })}
            </div>

            {rows.length === 0 ? (
              <div className="px-4 py-16 text-center text-sm font-semibold text-[#9aa0aa]">还没有访客会话。</div>
            ) : null}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function Avatar({ index }: { index: number }) {
  const colors = ["bg-[#ffd98a]", "bg-[#c7b6ff]", "bg-[#a7e3ff]", "bg-[#ffccb0]", "bg-[#bdf2a0]"];
  return (
    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${colors[index % colors.length]} text-[#1f2024]`}>
      <UserRound className="h-6 w-6" />
    </span>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "green" | "blue" | "amber" }) {
  const className =
    tone === "green"
      ? "bg-[#edf8e8] text-[#6bb956] dark:bg-[#6bb956]/18 dark:text-[#a5dd95]"
      : tone === "blue"
        ? "bg-[#e8f1ff] text-[#2f7df6] dark:bg-[#2f7df6]/18 dark:text-[#8bbcff]"
        : "bg-[#fff4df] text-[#9b5a17] dark:bg-[#ffb48b]/16 dark:text-[#ffd2b7]";

  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>{children}</span>;
}

function TenantPill({ name }: { name: string }) {
  return (
    <span className="inline-flex max-w-[140px] truncate rounded-full bg-[#f0ebff] px-3 py-1.5 text-xs font-bold text-[#6c4fd1] dark:bg-[#c7b6ff]/18 dark:text-[#d8ccff]">
      {name}
    </span>
  );
}

function getPreview(conversation: ConversationRow) {
  return conversation.previewContent || "暂无咨询内容";
}

function formatTime(value?: Date | string | null) {
  if (!value) return "刚刚";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getConversationListRows({
  customerId,
  siteId,
  tenantId,
}: {
  customerId: string;
  siteId: string;
  tenantId?: string | null;
}) {
  const db = getDb();
  const tenantFilter = tenantId ? sql`AND ${conversations.tenantId} = ${tenantId}` : sql``;
  const rows = await db.execute<{
    id: string;
    pageUrl: string | null;
    hasMiss: boolean;
    hasLead: boolean;
    updatedAt: Date | string | null;
    tenantId: string | null;
    tenantName: string | null;
    previewContent: string | null;
    messageCount: number | string;
    leadId: string | null;
    leadName: string | null;
    leadPhone: string | null;
    leadWechat: string | null;
    leadEmail: string | null;
    leadCompany: string | null;
  }>(sql`
    WITH recent_conversations AS MATERIALIZED (
      SELECT
        ${conversations.id} AS id,
        ${conversations.pageUrl} AS page_url,
        ${conversations.hasMiss} AS has_miss,
        ${conversations.hasLead} AS has_lead,
        ${conversations.updatedAt} AS updated_at,
        ${conversations.tenantId} AS tenant_id
      FROM ${conversations}
      WHERE ${conversations.customerId} = ${customerId}
        AND ${conversations.siteId} = ${siteId}
        ${tenantFilter}
      ORDER BY ${conversations.updatedAt} DESC
      LIMIT 50
    )
    SELECT
      recent_conversations.id AS "id",
      recent_conversations.page_url AS "pageUrl",
      recent_conversations.has_miss AS "hasMiss",
      recent_conversations.has_lead AS "hasLead",
      recent_conversations.updated_at AS "updatedAt",
      ${tenants.id} AS "tenantId",
      ${tenants.name} AS "tenantName",
      message_stats.preview_content AS "previewContent",
      COALESCE(message_stats.message_count, 0) AS "messageCount",
      first_lead.id AS "leadId",
      first_lead.name AS "leadName",
      first_lead.phone AS "leadPhone",
      first_lead.wechat AS "leadWechat",
      first_lead.email AS "leadEmail",
      first_lead.company AS "leadCompany"
    FROM recent_conversations
    LEFT JOIN ${tenants} ON ${tenants.id} = recent_conversations.tenant_id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS message_count,
        (ARRAY_AGG(${messages.content} ORDER BY ${messages.createdAt} ASC) FILTER (WHERE ${messages.role} = 'user'))[1] AS preview_content
      FROM ${messages}
      WHERE ${messages.conversationId} = recent_conversations.id
    ) message_stats ON true
    LEFT JOIN LATERAL (
      SELECT
        ${leads.id} AS id,
        ${leads.name} AS name,
        ${leads.phone} AS phone,
        ${leads.wechat} AS wechat,
        ${leads.email} AS email,
        ${leads.company} AS company
      FROM ${leads}
      WHERE ${leads.conversationId} = recent_conversations.id
      ORDER BY ${leads.createdAt} ASC
      LIMIT 1
    ) first_lead ON true
    ORDER BY recent_conversations.updated_at DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    pageUrl: row.pageUrl,
    hasMiss: row.hasMiss,
    hasLead: row.hasLead,
    updatedAt: row.updatedAt,
    tenant: row.tenantId && row.tenantName ? { id: row.tenantId, name: row.tenantName } : null,
    previewContent: row.previewContent,
    messageCount: Number(row.messageCount || 0),
    lead: row.leadId
      ? {
          id: row.leadId,
          name: row.leadName,
          phone: row.leadPhone,
          wechat: row.leadWechat,
          email: row.leadEmail,
          company: row.leadCompany,
        }
      : null,
  }));
}

function getDemoConversations(): ConversationRow[] {
  return [
    {
      id: "demo-conversation",
      pageUrl: "http://localhost:3000/demo",
      hasMiss: false,
      hasLead: true,
      updatedAt: new Date(),
      tenant: { id: "22222222-2222-4222-8222-222222222222", name: "官网客服" },
      previewContent: "你们能帮我的企业解决什么具体问题？",
      messageCount: 2,
      lead: { id: "demo-lead-1", name: "演示客户", phone: "138****0000", company: "某某科技" },
    },
    {
      id: "demo-conversation-2",
      pageUrl: "http://localhost:3000/demo?style=pill",
      hasMiss: true,
      hasLead: false,
      updatedAt: new Date(Date.now() - 1000 * 60 * 16),
      tenant: { id: "33333333-3333-4333-8333-333333333333", name: "售前咨询" },
      previewContent: "具体报价怎么做？",
      messageCount: 2,
      lead: null,
    },
    {
      id: "demo-conversation-3",
      pageUrl: "http://localhost:3000/demo?style=vertical",
      hasMiss: false,
      hasLead: true,
      updatedAt: new Date(Date.now() - 1000 * 60 * 48),
      tenant: { id: "33333333-3333-4333-8333-333333333333", name: "售前咨询" },
      previewContent: "增长超人是一家怎样的公司？",
      messageCount: 2,
      lead: { id: "demo-lead-2", name: "王女士", wechat: "wx-demo", company: "品牌咨询公司" },
    },
    {
      id: "demo-conversation-4",
      pageUrl: "http://localhost:3000/demo?style=mascot",
      hasMiss: false,
      hasLead: false,
      updatedAt: new Date(Date.now() - 1000 * 60 * 90),
      tenant: { id: "22222222-2222-4222-8222-222222222222", name: "官网客服" },
      previewContent: "你们有哪些解决方案？",
      messageCount: 2,
      lead: null,
    },
  ];
}
