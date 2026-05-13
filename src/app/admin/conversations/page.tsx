import { and, desc, eq } from "drizzle-orm";
import { ArrowUpRight, Check, Clock3, Filter, MessageSquareText, Search, UserRound } from "lucide-react";
import Link from "next/link";

import { conversations, sites } from "@/db";
import { getDb } from "@/db";
import { getTenantOptions, resolveActiveTenant } from "@/lib/admin-tenants";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

type ConversationRow = {
  id: string;
  pageUrl: string | null;
  hasMiss: boolean;
  hasLead: boolean;
  updatedAt?: Date;
  tenant?: { id: string; name: string } | null;
  messages: Array<{ id: string; role: string; content: string }>;
  leads: Array<{
    id: string;
    name?: string | null;
    phone?: string | null;
    wechat?: string | null;
    email?: string | null;
    company?: string | null;
  }>;
};

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const [site] = isDemoMode()
    ? [{ defaultTenantId: "22222222-2222-4222-8222-222222222222" }]
    : await getDb().select({ defaultTenantId: sites.defaultTenantId }).from(sites).where(eq(sites.id, session.siteId)).limit(1);
  const tenantRows = await getTenantOptions(session.customerId);
  const activeTenant = resolveActiveTenant(tenantRows, params.tenantId, site?.defaultTenantId);
  const rows: ConversationRow[] = isDemoMode()
    ? getDemoConversations().filter((conversation) => !activeTenant || conversation.tenant?.id === activeTenant.id)
    : await getDb().query.conversations.findMany({
        where: and(
          eq(conversations.customerId, session.customerId),
          eq(conversations.siteId, session.siteId),
          activeTenant ? eq(conversations.tenantId, activeTenant.id) : undefined,
        ),
        with: {
          tenant: true,
          messages: true,
          leads: true,
        },
        orderBy: desc(conversations.updatedAt),
        limit: 50,
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
            <div className="grid grid-cols-[44px_1.25fr_150px_1.1fr_120px_110px_1fr_86px] gap-4 border-b border-black/[0.06] px-2 pb-4 text-sm font-bold text-[#777e89] dark:border-white/10 dark:text-white/45">
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
                const lead = conversation.leads[0];
                const preview = getPreview(conversation);
                const leadContact = lead ? lead.phone || lead.wechat || lead.email || "已留咨" : "未留咨";
                return (
                  <div
                    key={conversation.id}
                    className={[
                      "grid grid-cols-[44px_1.25fr_150px_1.1fr_120px_110px_1fr_86px] items-center gap-4 px-2 py-4 text-sm transition",
                      index === 1 ? "rounded-[18px] bg-[#f0f2f5] dark:bg-white/8" : "hover:bg-[#f7f7f8] dark:hover:bg-white/[0.05]",
                    ].join(" ")}
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
                      {conversation.messages.length}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-[#1f2024] dark:text-white">{lead?.company || "未留公司"}</div>
                      <div className="mt-1 truncate text-sm font-semibold text-[#777e89]">{leadContact}</div>
                    </div>
                    <Link
                      href={`/admin/conversations/${conversation.id}${activeTenant?.id ? `?tenantId=${activeTenant.id}` : ""}`}
                      className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-[#eeeeef] text-[#777e89] transition hover:bg-[#2f7df6] hover:text-white dark:bg-white/8 dark:text-white/55 dark:hover:bg-[#2f7df6] dark:hover:text-white"
                      aria-label="查看会话"
                    >
                      <ArrowUpRight className="h-5 w-5" />
                    </Link>
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
  return conversation.messages.find((message) => message.role === "user")?.content || "暂无咨询内容";
}

function formatTime(value?: Date) {
  if (!value) return "刚刚";
  return value.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
      messages: [
        { id: "demo-message-1", role: "user", content: "你们能帮我的企业解决什么具体问题？" },
        {
          id: "demo-message-2",
          role: "assistant",
          content: "接入知识库后，AI 会基于官网内容回答，并在商务承诺问题上引导留咨跟进。",
        },
      ],
      leads: [{ id: "demo-lead-1", name: "演示客户", phone: "138****0000", company: "某某科技" }],
    },
    {
      id: "demo-conversation-2",
      pageUrl: "http://localhost:3000/demo?style=pill",
      hasMiss: true,
      hasLead: false,
      updatedAt: new Date(Date.now() - 1000 * 60 * 16),
      tenant: { id: "33333333-3333-4333-8333-333333333333", name: "售前咨询" },
      messages: [
        { id: "demo-message-3", role: "user", content: "具体报价怎么做？" },
        { id: "demo-message-4", role: "assistant", content: "这个问题需要同事结合需求确认，我可以先记录联系方式。" },
      ],
      leads: [],
    },
    {
      id: "demo-conversation-3",
      pageUrl: "http://localhost:3000/demo?style=vertical",
      hasMiss: false,
      hasLead: true,
      updatedAt: new Date(Date.now() - 1000 * 60 * 48),
      tenant: { id: "33333333-3333-4333-8333-333333333333", name: "售前咨询" },
      messages: [
        { id: "demo-message-5", role: "user", content: "增长超人是一家怎样的公司？" },
        { id: "demo-message-6", role: "assistant", content: "这是基于官网知识库整理的公司介绍。" },
      ],
      leads: [{ id: "demo-lead-2", name: "王女士", wechat: "wx-demo", company: "品牌咨询公司" }],
    },
    {
      id: "demo-conversation-4",
      pageUrl: "http://localhost:3000/demo?style=mascot",
      hasMiss: false,
      hasLead: false,
      updatedAt: new Date(Date.now() - 1000 * 60 * 90),
      tenant: { id: "22222222-2222-4222-8222-222222222222", name: "官网客服" },
      messages: [
        { id: "demo-message-7", role: "user", content: "你们有哪些解决方案？" },
        { id: "demo-message-8", role: "assistant", content: "可以从官网知识库中提取服务、产品和案例内容进行回答。" },
      ],
      leads: [],
    },
  ];
}
