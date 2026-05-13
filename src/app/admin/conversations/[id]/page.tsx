import { and, asc, eq } from "drizzle-orm";
import {
  ArrowLeft,
  Building2,
  Clock3,
  ExternalLink,
  Mail,
  MessageSquareText,
  Phone,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { conversations, leads, messages, tenants } from "@/db";
import { getDb } from "@/db";
import { AdminShell } from "@/components/admin/admin-shell";
import { ConversationDeleteForm } from "@/components/admin/conversation-delete-form";
import { getAdminSiteTenantContext } from "@/lib/admin-tenants";
import { formatAdminDateTime } from "@/lib/admin-time";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";

type ConversationDetail = {
  id: string;
  visitorId: string;
  pageUrl: string | null;
  referrer: string | null;
  status: string;
  hasMiss: boolean;
  hasLead: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  tenant?: { id: string; name: string } | null;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    sources?: Array<{ id: string; url: string; title: string | null; score: number }>;
    latencyMs?: number | null;
    model?: string | null;
    isMiss?: boolean;
    createdAt?: Date;
  }>;
  leads: Array<{
    id: string;
    name?: string | null;
    phone?: string | null;
    wechat?: string | null;
    email?: string | null;
    company?: string | null;
    requirement?: string | null;
    summary?: string | null;
    summaryModel?: string | null;
    createdAt?: Date;
  }>;
};

export default async function ConversationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const session = await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { tenantRows, activeTenant } = await getAdminSiteTenantContext({
    customerId: session.customerId,
    siteId: session.siteId,
    requestedTenantId: query.tenantId,
  });
  const conversation = isDemoMode()
    ? getDemoConversation(id)
    : await getConversationDetail({
        id,
        customerId: session.customerId,
        siteId: session.siteId,
      });

  if (!conversation) {
    notFound();
  }

  const lead = conversation.leads[0];
  const backHref = `/admin/conversations${activeTenant?.id ? `?tenantId=${activeTenant.id}` : ""}`;

  return (
    <AdminShell
      title="会话详情"
      description="查看访客咨询路径、完整消息记录、AI 回复来源和留资信息。"
      tenantSwitcher={{
        activeTenantId: activeTenant?.id,
        hrefBase: "/admin/conversations",
        tenants: tenantRows,
      }}
    >
      <div className="max-w-7xl space-y-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-[16px] bg-white px-4 py-2 text-sm font-bold text-[#5d646f] shadow-sm transition hover:-translate-y-0.5 hover:text-[#2f7df6] dark:bg-white/8 dark:text-white/65 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          返回会话列表
        </Link>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <div className="rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#ffd98a] text-[#1f2024]">
                    <UserRound className="h-7 w-7" />
                  </span>
                  <div>
                    <h2 className="text-2xl font-bold text-[#1f2024] dark:text-white">{lead?.name || "匿名访客"}</h2>
                    <p className="mt-1 text-sm font-semibold text-[#777e89]">访客 ID：{maskVisitorId(conversation.visitorId)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={conversation.hasMiss ? "amber" : "green"}>{conversation.hasMiss ? "未命中" : "正常"}</Badge>
                  {conversation.hasLead ? <Badge tone="blue">已留资</Badge> : <Badge tone="gray">未留资</Badge>}
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <InfoItem label="租户" value={conversation.tenant?.name || "默认租户"} />
                <InfoItem label="状态" value={conversation.status || "open"} />
                <InfoItem label="创建时间" value={formatDate(conversation.createdAt)} />
                <InfoItem label="最后更新" value={formatDate(conversation.updatedAt)} />
              </div>
            </div>

            <div className="rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
              <div className="mb-5 flex items-center gap-3">
                <span className="h-10 w-2 rounded-full bg-[#c7b6ff]" />
                <div>
                  <h2 className="text-2xl font-bold text-[#1f2024] dark:text-white">对话记录</h2>
                  <p className="mt-1 text-sm font-semibold text-[#777e89]">共 {conversation.messages.length} 条消息</p>
                </div>
              </div>

              <div className="space-y-4">
                {conversation.messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {conversation.messages.length === 0 ? (
                  <div className="rounded-[20px] bg-[#f6f6f7] px-4 py-10 text-center text-sm font-semibold text-[#9aa0aa] dark:bg-white/8">
                    这条会话还没有消息。
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <SideCard title="来源页面">
              <div className="space-y-3 text-sm font-semibold text-[#5d646f] dark:text-white/65">
                <UrlLine label="页面" value={conversation.pageUrl} />
                <UrlLine label="来源" value={conversation.referrer} />
              </div>
            </SideCard>

            <SideCard title="留资信息">
              {lead ? (
                <div className="space-y-3">
                  <ContactLine icon={Building2} label="公司" value={lead.company} />
                  <ContactLine icon={Phone} label="电话" value={lead.phone || lead.wechat} />
                  <ContactLine icon={Mail} label="邮箱" value={lead.email} />
                  {lead.requirement ? (
                    <div className="rounded-[18px] bg-[#f6f6f7] p-4 text-sm font-semibold leading-6 text-[#5d646f] dark:bg-white/8 dark:text-white/65">
                      {lead.requirement}
                    </div>
                  ) : null}
                  {lead.summary ? (
                    <div className="rounded-[18px] border border-[#bdf2a0]/40 bg-[#f7fff2] p-4 text-sm font-semibold leading-6 text-[#4f6b45] dark:border-[#bdf2a0]/20 dark:bg-[#bdf2a0]/10 dark:text-[#cfefc0]">
                      <span className="mb-1 block text-xs text-[#6bb956] dark:text-[#a5dd95]">AI 摘要</span>
                      {lead.summary}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-[18px] bg-[#f6f6f7] p-4 text-sm font-semibold text-[#9aa0aa] dark:bg-white/8">暂无留资。</div>
              )}
            </SideCard>

            <SideCard title="AI 运行信息">
              <div className="space-y-3">
                <InfoItem label="AI 回复数" value={String(conversation.messages.filter((message) => message.role === "assistant").length)} />
                <InfoItem label="未命中消息" value={String(conversation.messages.filter((message) => message.isMiss).length)} />
                <InfoItem label="最近模型" value={conversation.messages.findLast((message) => message.model)?.model || "未记录"} />
              </div>
            </SideCard>

            <SideCard title="清理会话">
              <div className="space-y-3">
                <p className="text-sm font-semibold leading-6 text-[#777e89] dark:text-white/55">
                  删除后会同步清理这条会话下的消息记录和线索，适合清理测试、误触或垃圾数据。
                </p>
                <ConversationDeleteForm conversationId={conversation.id} returnTo={backHref} variant="button" />
              </div>
            </SideCard>
          </aside>
        </section>
      </div>
    </AdminShell>
  );
}

function MessageBubble({ message }: { message: ConversationDetail["messages"][number] }) {
  const isUser = message.role === "user";
  return (
    <div className={["flex gap-3", isUser ? "justify-end" : "justify-start"].join(" ")}>
      {!isUser ? (
        <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#d9f2ff] text-[#1f2024]">
          <MessageSquareText className="h-5 w-5" />
        </span>
      ) : null}
      <div className={["max-w-[76%] space-y-2", isUser ? "items-end" : "items-start"].join(" ")}>
        <div
          className={[
            "rounded-[22px] px-4 py-3 text-sm font-semibold leading-6",
            isUser ? "bg-[#ff6b4a] text-white" : "bg-[#f6f6f7] text-[#1f2024] dark:bg-white/8 dark:text-white/82",
          ].join(" ")}
        >
          {message.content}
        </div>
        <div className={["flex flex-wrap items-center gap-2 text-xs font-semibold text-[#9aa0aa]", isUser ? "justify-end" : "justify-start"].join(" ")}>
          <Clock3 className="h-3.5 w-3.5" />
          <span>{formatDate(message.createdAt)}</span>
          {message.model ? <span>模型：{message.model}</span> : null}
          {message.latencyMs ? <span>{message.latencyMs}ms</span> : null}
          {message.isMiss ? <Badge tone="amber">低置信</Badge> : null}
        </div>
        {!isUser && message.sources?.length ? (
          <div className="space-y-2">
            {message.sources.map((source) => (
              <a
                key={`${message.id}-${source.id}`}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-2 rounded-[16px] border border-black/[0.06] bg-white px-3 py-2 text-xs font-semibold text-[#5d646f] transition hover:text-[#2f7df6] dark:border-white/10 dark:bg-white/8 dark:text-white/65"
              >
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate">{source.title || source.url}</span>
                  <span className="mt-0.5 block text-[#9aa0aa]">相似度 {Math.round(source.score * 100)}%</span>
                </span>
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
      <h3 className="text-lg font-bold text-[#1f2024] dark:text-white">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[#f6f6f7] px-4 py-3 text-sm font-semibold text-[#5d646f] dark:bg-white/8 dark:text-white/65">
      <span className="text-[#9aa0aa]">{label}：</span>
      <span>{value}</span>
    </div>
  );
}

function UrlLine({ label, value }: { label: string; value?: string | null }) {
  if (!value) {
    return <InfoItem label={label} value="未记录" />;
  }

  return (
    <a
      href={value}
      target="_blank"
      rel="noreferrer"
      className="flex items-start gap-2 rounded-[18px] bg-[#f6f6f7] px-4 py-3 transition hover:text-[#2f7df6] dark:bg-white/8"
    >
      <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 break-all">
        <span className="block text-xs text-[#9aa0aa]">{label}</span>
        {value}
      </span>
    </a>
  );
}

function ContactLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-[#f6f6f7] px-4 py-3 text-sm font-semibold text-[#5d646f] dark:bg-white/8 dark:text-white/65">
      <Icon className="h-4 w-4 text-[#9aa0aa]" />
      <span className="text-[#9aa0aa]">{label}</span>
      <span className="ml-auto truncate">{value || "未记录"}</span>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "green" | "blue" | "amber" | "gray" }) {
  const className =
    tone === "green"
      ? "bg-[#edf8e8] text-[#6bb956] dark:bg-[#6bb956]/18 dark:text-[#a5dd95]"
      : tone === "blue"
        ? "bg-[#e8f1ff] text-[#2f7df6] dark:bg-[#2f7df6]/18 dark:text-[#8bbcff]"
        : tone === "amber"
          ? "bg-[#fff4df] text-[#9b5a17] dark:bg-[#ffb48b]/16 dark:text-[#ffd2b7]"
          : "bg-[#f0f2f5] text-[#777e89] dark:bg-white/10 dark:text-white/55";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>{children}</span>;
}

function maskVisitorId(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function formatDate(value?: Date) {
  if (!value) return "未记录";
  return formatAdminDateTime(value, { second: undefined });
}

async function getConversationDetail({
  id,
  customerId,
  siteId,
}: {
  id: string;
  customerId: string;
  siteId: string;
}): Promise<ConversationDetail | undefined> {
  const db = getDb();
  const [conversationRows, messageRows, leadRows] = await Promise.all([
    db
      .select({
        id: conversations.id,
        visitorId: conversations.visitorId,
        pageUrl: conversations.pageUrl,
        referrer: conversations.referrer,
        status: conversations.status,
        hasMiss: conversations.hasMiss,
        hasLead: conversations.hasLead,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        tenantId: tenants.id,
        tenantName: tenants.name,
      })
      .from(conversations)
      .leftJoin(tenants, eq(tenants.id, conversations.tenantId))
      .where(and(eq(conversations.id, id), eq(conversations.customerId, customerId), eq(conversations.siteId, siteId)))
      .limit(1),
    db
      .select({
        id: messages.id,
        role: messages.role,
        content: messages.content,
        sources: messages.sources,
        latencyMs: messages.latencyMs,
        model: messages.model,
        isMiss: messages.isMiss,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(and(eq(messages.conversationId, id), eq(messages.customerId, customerId), eq(messages.siteId, siteId)))
      .orderBy(asc(messages.createdAt)),
    db
      .select({
        id: leads.id,
        name: leads.name,
        phone: leads.phone,
        wechat: leads.wechat,
        email: leads.email,
        company: leads.company,
        requirement: leads.requirement,
        summary: leads.summary,
        summaryModel: leads.summaryModel,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(and(eq(leads.conversationId, id), eq(leads.customerId, customerId), eq(leads.siteId, siteId)))
      .orderBy(asc(leads.createdAt)),
  ]);
  const [conversation] = conversationRows;
  if (!conversation) return undefined;

  return {
    id: conversation.id,
    visitorId: conversation.visitorId,
    pageUrl: conversation.pageUrl,
    referrer: conversation.referrer,
    status: conversation.status,
    hasMiss: conversation.hasMiss,
    hasLead: conversation.hasLead,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    tenant: conversation.tenantId && conversation.tenantName
      ? { id: conversation.tenantId, name: conversation.tenantName }
      : null,
    messages: messageRows,
    leads: leadRows,
  };
}

function getDemoConversation(id: string): ConversationDetail | undefined {
  const rows: ConversationDetail[] = [
    {
      id: "demo-conversation",
      visitorId: "demo-visitor-001",
      pageUrl: "http://localhost:3000/demo",
      referrer: "http://localhost:3000/",
      status: "open",
      hasMiss: false,
      hasLead: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 8),
      updatedAt: new Date(),
      tenant: { id: "22222222-2222-4222-8222-222222222222", name: "官网客服" },
      messages: [
        { id: "demo-message-1", role: "user", content: "你们能帮我的企业解决什么具体问题？", createdAt: new Date(Date.now() - 1000 * 60 * 7) },
        {
          id: "demo-message-2",
          role: "assistant",
          content: "接入知识库后，AI 会基于官网内容回答，并在商务承诺问题上引导留资跟进。",
          model: "mimo-v2.5",
          latencyMs: 860,
          sources: [{ id: "demo-source", url: "/demo", title: "预览官网页面", score: 0.92 }],
          createdAt: new Date(Date.now() - 1000 * 60 * 6),
        },
      ],
      leads: [
        {
          id: "demo-lead-1",
          name: "演示客户",
          phone: "138****0000",
          company: "某某科技",
          requirement: "想了解官网 AI 客服接入方案。",
          summary: "访客关注官网 AI 客服接入方式，希望了解方案和后续落地安排。",
          summaryModel: "demo",
        },
      ],
    },
    {
      id: "demo-conversation-2",
      visitorId: "demo-visitor-002",
      pageUrl: "http://localhost:3000/demo?style=pill",
      referrer: null,
      status: "open",
      hasMiss: true,
      hasLead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 24),
      updatedAt: new Date(Date.now() - 1000 * 60 * 16),
      tenant: { id: "33333333-3333-4333-8333-333333333333", name: "售前咨询" },
      messages: [
        { id: "demo-message-3", role: "user", content: "具体报价怎么做？", createdAt: new Date(Date.now() - 1000 * 60 * 18) },
        {
          id: "demo-message-4",
          role: "assistant",
          content: "这个问题需要同事结合需求确认，我可以先记录联系方式。",
          model: "mimo-v2.5",
          latencyMs: 720,
          isMiss: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 16),
        },
      ],
      leads: [],
    },
  ];

  return rows.find((row) => row.id === id);
}
