import { and, eq } from "drizzle-orm";

import { conversations, getDb, knowledgeSources, leads, messages, sites } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getDemoWidgetConfig, isDemoMode } from "@/lib/demo-mode";
import { AdminShell, StatCard } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const session = await requireAdmin();

  if (isDemoMode()) {
    const site = getDemoWidgetConfig({ siteId: session.siteId });

    return (
      <AdminShell title="总览" description="当前是无数据库演示模式，可先查看 Widget 样式、交互和后台结构。">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon="database" tone="blue" label="知识来源" value={0} hint="可添加官网 URL" delta={{ value: "0%", direction: "up" }} />
          <StatCard icon="chat" tone="purple" label="会话" value={1} hint="演示会话样例" delta={{ value: "37.8%", direction: "up" }} />
          <StatCard icon="click" tone="orange" label="消息" value={3} hint="前台 Demo 模拟" delta={{ value: "12.4%", direction: "down" }} />
          <StatCard icon="lead" tone="green" label="线索" value={1} hint="已留资访客" delta={{ value: "24.6%", direction: "up" }} />
        </div>
        <section className="mt-6 rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
          <div className="flex items-center gap-3">
            <span className="h-10 w-2 rounded-full bg-[#9bdcff]" />
            <h2 className="text-2xl font-bold dark:text-white">当前站点</h2>
          </div>
          <div className="mt-6 grid gap-3 text-sm font-semibold text-[#5d646f] dark:text-white/65 md:grid-cols-2">
            <div className="rounded-[18px] bg-[#f6f6f7] px-4 py-3 dark:bg-white/8">站点名称：演示站点</div>
            <div>
              <div className="rounded-[18px] bg-[#f6f6f7] px-4 py-3 dark:bg-white/8">
                站点 ID：<span className="font-mono text-xs">{session.siteId}</span>
              </div>
            </div>
            <div className="rounded-[18px] bg-[#f6f6f7] px-4 py-3 dark:bg-white/8">域名：lopuo.work</div>
            <div className="rounded-[18px] bg-[#f6f6f7] px-4 py-3 dark:bg-white/8">Widget 名称：{site.widgetName}</div>
            <div className="rounded-[18px] bg-[#f6f6f7] px-4 py-3 dark:bg-white/8">入口样式：{site.launcherStyle}</div>
            <div className="rounded-[18px] bg-[#f6f6f7] px-4 py-3 dark:bg-white/8">入口文案：{site.launcherText}</div>
          </div>
          <p className="mt-5 rounded-[18px] bg-[#fff3df] px-4 py-3 text-sm font-semibold text-[#9b5a17] dark:bg-[#ffb48b]/14 dark:text-[#ffd2b7]">
            要启用真实知识库同步、会话入库和配置持久化，请配置 `DATABASE_URL` 后执行迁移与 seed。
          </p>
        </section>
      </AdminShell>
    );
  }

  const db = getDb();

  const [site] = await db.select().from(sites).where(eq(sites.id, session.siteId)).limit(1);
  const sourceRows = await db
    .select()
    .from(knowledgeSources)
    .where(and(eq(knowledgeSources.customerId, session.customerId), eq(knowledgeSources.siteId, session.siteId)));
  const conversationRows = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.customerId, session.customerId), eq(conversations.siteId, session.siteId)));
  const leadRows = await db
    .select()
    .from(leads)
    .where(and(eq(leads.customerId, session.customerId), eq(leads.siteId, session.siteId)));
  const messageRows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.customerId, session.customerId), eq(messages.siteId, session.siteId)));

  return (
    <AdminShell title="总览" description="查看当前站点的知识库、会话、留资和 AI 问答运行概况。">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon="database" tone="blue" label="知识来源" value={sourceRows.length} hint="已配置 URL 数量" delta={{ value: "0%", direction: "up" }} />
        <StatCard icon="chat" tone="purple" label="会话" value={conversationRows.length} hint="访客咨询会话" delta={{ value: "37.8%", direction: "up" }} />
        <StatCard icon="click" tone="orange" label="消息" value={messageRows.length} hint="用户与 AI 消息" delta={{ value: "12.4%", direction: "down" }} />
        <StatCard icon="lead" tone="green" label="线索" value={leadRows.length} hint="已留资访客" delta={{ value: "24.6%", direction: "up" }} />
      </div>
      <section className="mt-6 rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
        <div className="flex items-center gap-3">
          <span className="h-10 w-2 rounded-full bg-[#9bdcff]" />
          <h2 className="text-2xl font-bold dark:text-white">当前站点</h2>
        </div>
        <div className="mt-6 grid gap-3 text-sm font-semibold text-[#5d646f] dark:text-white/65 md:grid-cols-2">
          <div className="rounded-[18px] bg-[#f6f6f7] px-4 py-3 dark:bg-white/8">站点名称：{site?.name}</div>
          <div className="rounded-[18px] bg-[#f6f6f7] px-4 py-3 dark:bg-white/8">
            站点 ID：<span className="font-mono text-xs">{session.siteId}</span>
          </div>
          <div className="rounded-[18px] bg-[#f6f6f7] px-4 py-3 dark:bg-white/8">域名：{site?.domain}</div>
          <div className="rounded-[18px] bg-[#f6f6f7] px-4 py-3 dark:bg-white/8">Widget 名称：{site?.widgetName}</div>
        </div>
      </section>
    </AdminShell>
  );
}
