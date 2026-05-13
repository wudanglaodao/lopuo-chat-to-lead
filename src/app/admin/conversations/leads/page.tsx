import { sql } from "drizzle-orm";
import {
  ArrowUpRight,
  Clock3,
  ExternalLink,
  Mail,
  MessageSquareText,
  Phone,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { conversations, getDb, leads, tenants } from "@/db";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSiteTenantContext } from "@/lib/admin-tenants";
import { formatAdminShortDateTime } from "@/lib/admin-time";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";

type LeadListRow = {
  id: string;
  conversationId: string;
  name: string | null;
  phone: string | null;
  wechat: string | null;
  email: string | null;
  company: string | null;
  requirement: string | null;
  summary: string | null;
  summaryModel: string | null;
  summaryUpdatedAt: Date | string | null;
  createdAt: Date | string | null;
  pageUrl: string | null;
  tenant: { id: string; name: string } | null;
};

export default async function ConversationLeadsPage({
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
  const rows = isDemoMode()
    ? getDemoLeadRows().filter((lead) => !activeTenant || lead.tenant?.id === activeTenant.id)
    : await getLeadListRows({
        customerId: session.customerId,
        siteId: session.siteId,
        tenantId: activeTenant?.id,
      });

  return (
    <AdminShell
      title="会话线索"
      description="集中查看访客联系方式、AI 会话摘要、来源页面和所属租户，快速跳回完整会话。"
      tenantSwitcher={{
        activeTenantId: activeTenant?.id,
        hrefBase: "/admin/conversations/leads",
        tenants: tenantRows,
      }}
    >
      <section className="overflow-hidden rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-2 rounded-full bg-[#bdf2a0]" />
            <div>
              <h2 className="text-2xl font-bold text-[#1f2024] dark:text-white">最近线索</h2>
              <p className="mt-1 text-sm font-semibold text-[#777e89]">
                当前租户：{activeTenant?.name || "全部租户"}，展示最近 50 条。
              </p>
            </div>
          </div>
          <Link
            href={`/admin/conversations${activeTenant?.id ? `?tenantId=${activeTenant.id}` : ""}`}
            className="inline-flex items-center gap-2 rounded-[16px] bg-[#f0f6ff] px-4 py-3 text-sm font-bold text-[#2f7df6] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:bg-[#2f7df6]/15 dark:text-[#9bc4ff] dark:hover:bg-white/12"
          >
            <MessageSquareText className="h-4 w-4" />
            会话列表
          </Link>
        </div>

        <div className="mt-7 overflow-x-auto">
          <div className="min-w-[1180px]">
            <div className="grid grid-cols-[1.05fr_1fr_1.4fr_1.1fr_150px_140px_86px] gap-4 border-b border-black/[0.06] px-2 pb-4 text-sm font-bold text-[#777e89] dark:border-white/10 dark:text-white/45">
              <div>联系人</div>
              <div>联系方式</div>
              <div>AI 摘要</div>
              <div>来源页面</div>
              <div>租户</div>
              <div>创建时间</div>
              <div />
            </div>

            <div className="divide-y divide-black/[0.06] dark:divide-white/10">
              {rows.map((lead, index) => (
                <div
                  key={lead.id}
                  className="grid grid-cols-[1.05fr_1fr_1.4fr_1.1fr_150px_140px_86px] items-center gap-4 px-2 py-5 text-sm transition hover:bg-[#f7f7f8] dark:hover:bg-white/[0.05]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar index={index} />
                    <div className="min-w-0">
                      <div className="truncate text-base font-bold text-[#1f2024] dark:text-white">
                        {lead.name || lead.company || "未命名线索"}
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold text-[#777e89]">
                        {lead.company || lead.requirement || "等待销售补充信息"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ContactLine icon={Phone} value={lead.phone || lead.wechat} fallback="未留电话/微信" />
                    <ContactLine icon={Mail} value={lead.email} fallback="未留邮箱" />
                  </div>

                  <div className="min-w-0">
                    <p className="line-clamp-3 text-sm font-semibold leading-6 text-[#5d646f] dark:text-white/70">
                      {lead.summary || lead.requirement || "暂无摘要"}
                    </p>
                    <div className="mt-2 text-xs font-semibold text-[#9aa0aa]">
                      {lead.summaryModel ? `摘要模型：${lead.summaryModel}` : "摘要待生成"}
                    </div>
                  </div>

                  <div className="min-w-0">
                    {lead.pageUrl ? (
                      <a
                        href={lead.pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-start gap-2 font-bold text-[#5d646f] transition hover:text-[#2f7df6] dark:text-white/70 dark:hover:text-[#9bc4ff]"
                      >
                        <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[#9aa0aa] transition group-hover:text-[#2f7df6]" />
                        <span className="truncate">{lead.pageUrl}</span>
                      </a>
                    ) : (
                      <span className="font-semibold text-[#9aa0aa]">未知页面</span>
                    )}
                  </div>

                  <div>
                    <TenantPill name={lead.tenant?.name || "默认场景"} />
                  </div>

                  <div className="text-xs font-semibold leading-5 text-[#777e89] dark:text-white/55">
                    <div className="flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatTime(lead.createdAt)}
                    </div>
                    {lead.summaryUpdatedAt ? (
                      <div className="mt-1 text-[#9aa0aa]">摘要 {formatTime(lead.summaryUpdatedAt)}</div>
                    ) : null}
                  </div>

                  <Link
                    href={`/admin/conversations/${lead.conversationId}${activeTenant?.id ? `?tenantId=${activeTenant.id}` : ""}`}
                    className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-[#eeeeef] text-[#777e89] transition hover:bg-[#2f7df6] hover:text-white dark:bg-white/8 dark:text-white/55 dark:hover:bg-[#2f7df6] dark:hover:text-white"
                    aria-label="查看会话"
                  >
                    <ArrowUpRight className="h-5 w-5" />
                  </Link>
                </div>
              ))}
            </div>

            {rows.length === 0 ? (
              <div className="px-4 py-16 text-center text-sm font-semibold text-[#9aa0aa]">当前租户还没有会话线索。</div>
            ) : null}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

async function getLeadListRows({
  customerId,
  siteId,
  tenantId,
}: {
  customerId: string;
  siteId: string;
  tenantId?: string | null;
}) {
  const tenantFilter = tenantId ? sql`AND ${leads.tenantId} = ${tenantId}` : sql``;
  const rows = await getDb().execute<{
    id: string;
    conversationId: string;
    name: string | null;
    phone: string | null;
    wechat: string | null;
    email: string | null;
    company: string | null;
    requirement: string | null;
    summary: string | null;
    summaryModel: string | null;
    summaryUpdatedAt: Date | string | null;
    createdAt: Date | string | null;
    pageUrl: string | null;
    tenantId: string | null;
    tenantName: string | null;
  }>(sql`
    WITH recent_leads AS MATERIALIZED (
      SELECT
        ${leads.id} AS id,
        ${leads.conversationId} AS conversation_id,
        ${leads.tenantId} AS tenant_id,
        ${leads.name} AS name,
        ${leads.phone} AS phone,
        ${leads.wechat} AS wechat,
        ${leads.email} AS email,
        ${leads.company} AS company,
        ${leads.requirement} AS requirement,
        ${leads.summary} AS summary,
        ${leads.summaryModel} AS summary_model,
        ${leads.summaryUpdatedAt} AS summary_updated_at,
        ${leads.createdAt} AS created_at
      FROM ${leads}
      WHERE ${leads.customerId} = ${customerId}
        AND ${leads.siteId} = ${siteId}
        ${tenantFilter}
      ORDER BY ${leads.createdAt} DESC
      LIMIT 50
    )
    SELECT
      recent_leads.id AS "id",
      recent_leads.conversation_id AS "conversationId",
      recent_leads.name AS "name",
      recent_leads.phone AS "phone",
      recent_leads.wechat AS "wechat",
      recent_leads.email AS "email",
      recent_leads.company AS "company",
      recent_leads.requirement AS "requirement",
      recent_leads.summary AS "summary",
      recent_leads.summary_model AS "summaryModel",
      recent_leads.summary_updated_at AS "summaryUpdatedAt",
      recent_leads.created_at AS "createdAt",
      ${conversations.pageUrl} AS "pageUrl",
      ${tenants.id} AS "tenantId",
      ${tenants.name} AS "tenantName"
    FROM recent_leads
    LEFT JOIN ${conversations} ON ${conversations.id} = recent_leads.conversation_id
    LEFT JOIN ${tenants} ON ${tenants.id} = recent_leads.tenant_id
    ORDER BY recent_leads.created_at DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversationId,
    name: row.name,
    phone: row.phone,
    wechat: row.wechat,
    email: row.email,
    company: row.company,
    requirement: row.requirement,
    summary: row.summary,
    summaryModel: row.summaryModel,
    summaryUpdatedAt: row.summaryUpdatedAt,
    createdAt: row.createdAt,
    pageUrl: row.pageUrl,
    tenant: row.tenantId && row.tenantName ? { id: row.tenantId, name: row.tenantName } : null,
  }));
}

function Avatar({ index }: { index: number }) {
  const colors = ["bg-[#bdf2a0]", "bg-[#a7e3ff]", "bg-[#ffd98a]", "bg-[#c7b6ff]", "bg-[#ffccb0]"];
  return (
    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${colors[index % colors.length]} text-[#1f2024]`}>
      <UserRoundCheck className="h-6 w-6" />
    </span>
  );
}

function ContactLine({
  icon: Icon,
  value,
  fallback,
}: {
  icon: LucideIcon;
  value?: string | null;
  fallback: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-[14px] bg-[#f6f6f7] px-3 py-2 text-xs font-bold text-[#5d646f] dark:bg-white/8 dark:text-white/65">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[#9aa0aa]" />
      <span className="truncate">{value || fallback}</span>
    </div>
  );
}

function TenantPill({ name }: { name: string }) {
  return (
    <span className="inline-flex max-w-[140px] truncate rounded-full bg-[#f0ebff] px-3 py-1.5 text-xs font-bold text-[#6c4fd1] dark:bg-[#c7b6ff]/18 dark:text-[#d8ccff]">
      {name}
    </span>
  );
}

function formatTime(value?: Date | string | null) {
  if (!value) return "未记录";
  return formatAdminShortDateTime(value);
}

function getDemoLeadRows(): LeadListRow[] {
  return [
    {
      id: "demo-lead-1",
      conversationId: "demo-conversation",
      name: "演示客户",
      phone: "138****0000",
      wechat: null,
      email: "demo@example.com",
      company: "某某科技",
      requirement: "想了解官网 AI 客服接入方案。",
      summary: "访客关注官网 AI 客服接入方式，希望了解方案和后续落地安排。",
      summaryModel: "demo",
      summaryUpdatedAt: new Date(),
      createdAt: new Date(Date.now() - 1000 * 60 * 6),
      pageUrl: "http://localhost:3000/demo",
      tenant: { id: "22222222-2222-4222-8222-222222222222", name: "官网客服" },
    },
    {
      id: "demo-lead-2",
      conversationId: "demo-conversation-3",
      name: "王女士",
      phone: null,
      wechat: "wx-demo",
      email: null,
      company: "品牌咨询公司",
      requirement: "希望确认售前方案和报价范围。",
      summary: "访客来自售前咨询场景，已留微信，重点关注方案边界和报价区间。",
      summaryModel: "demo",
      summaryUpdatedAt: new Date(Date.now() - 1000 * 60 * 42),
      createdAt: new Date(Date.now() - 1000 * 60 * 48),
      pageUrl: "http://localhost:3000/demo?style=vertical",
      tenant: { id: "33333333-3333-4333-8333-333333333333", name: "售前咨询" },
    },
  ];
}
