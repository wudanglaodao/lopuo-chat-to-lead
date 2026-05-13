import { sql } from "drizzle-orm";
import { ArrowUpRight, Code2, DatabaseZap, MessageSquareText, Settings2, Sparkles, UsersRound } from "lucide-react";
import Link from "next/link";

import { conversations, getDb, knowledgeSources, leads } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getAdminSiteTenantContext } from "@/lib/admin-tenants";
import { isDemoMode } from "@/lib/demo-mode";
import { AdminShell, StatCard } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminHomePage({
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

  if (isDemoMode()) {
    const tenantId = activeTenant?.id;

    return (
      <AdminShell
        title="总览"
        description="当前是无数据库预览模式，可先查看助手样式、交互和后台结构。"
        tenantSwitcher={{
          activeTenantId: activeTenant?.id,
          hrefBase: "/admin",
          tenants: tenantRows,
        }}
      >
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon="database" tone="blue" label="获客场景" value={2} hint="企业下业务空间" delta={{ value: "0%", direction: "up" }} />
          <StatCard icon="chat" tone="purple" label="会话" value={1} hint="演示会话样例" delta={{ value: "37.8%", direction: "up" }} />
          <StatCard icon="click" tone="orange" label="消息" value={3} hint="前台预览模拟" delta={{ value: "12.4%", direction: "down" }} />
          <StatCard icon="lead" tone="green" label="线索" value={1} hint="已留咨访客" delta={{ value: "24.6%", direction: "up" }} />
        </div>
        <QuickEntryMenu tenantId={tenantId} />
      </AdminShell>
    );
  }
  const stats = await getAdminStats({
    customerId: session.customerId,
    siteId: session.siteId,
  });

  return (
    <AdminShell
      title="总览"
      description="查看当前站点的知识库、会话、留咨线索和 AI 问答运行概况。"
      tenantSwitcher={{
        activeTenantId: activeTenant?.id,
        hrefBase: "/admin",
        tenants: tenantRows,
      }}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon="database" tone="blue" label="获客场景" value={tenantRows.length} hint="企业下业务空间" delta={{ value: "0%", direction: "up" }} />
        <StatCard icon="chat" tone="purple" label="会话" value={stats.conversationCount} hint="访客咨询会话" delta={{ value: "37.8%", direction: "up" }} />
        <StatCard icon="click" tone="orange" label="知识来源" value={stats.sourceCount} hint="已配置 URL 数量" delta={{ value: "12.4%", direction: "down" }} />
        <StatCard icon="lead" tone="green" label="线索" value={stats.leadCount} hint="已留咨访客" delta={{ value: "24.6%", direction: "up" }} />
      </div>
      <QuickEntryMenu tenantId={activeTenant?.id} />
    </AdminShell>
  );
}

function QuickEntryMenu({ tenantId }: { tenantId?: string | null }) {
  const tenantQuery = tenantId ? `?tenantId=${tenantId}` : "";
  const settingsTenantQuery = tenantId ? `&tenantId=${tenantId}` : "";
  const entries = [
    {
      title: "同步知识库",
      description: "添加 URL 或 sitemap，更新向量内容",
      href: `/admin/knowledge${tenantQuery}`,
      icon: DatabaseZap,
      tone: "bg-[#d9f2ff] text-[#1f2024]",
    },
    {
      title: "查看会话",
      description: "查看咨询记录、未命中和留资",
      href: `/admin/conversations${tenantQuery}`,
      icon: MessageSquareText,
      tone: "bg-[#d8c7ff] text-[#1f2024]",
    },
    {
      title: "配置入口样式",
      description: "调整按钮、文案、头像和主题色",
      href: `/admin/settings?tab=style${settingsTenantQuery}`,
      icon: Settings2,
      tone: "bg-[#ffccb0] text-[#1f2024]",
    },
    {
      title: "安装脚本",
      description: "复制官网嵌入代码与白名单",
      href: `/admin/settings?tab=script${settingsTenantQuery}`,
      icon: Code2,
      tone: "bg-[#bdf2a0] text-[#1f2024]",
    },
    {
      title: "Demo 预览",
      description: "新窗口检查前台客服效果",
      href: "/demo",
      icon: Sparkles,
      tone: "bg-[#e8f1ff] text-[#2f7df6]",
      external: true,
    },
    {
      title: "租户管理",
      description: "维护业务空间与模型安全边界",
      href: `/admin/settings/tenants${tenantQuery}`,
      icon: UsersRound,
      tone: "bg-[#fff4df] text-[#9b5a17]",
    },
  ];

  return (
    <section className="mt-6 rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-10 w-2 rounded-full bg-[#9bdcff]" />
          <div>
            <h2 className="text-2xl font-bold dark:text-white">快捷入口</h2>
            <p className="mt-1 text-sm font-semibold text-[#777e89]">常用配置与运营动作，一步直达。</p>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => {
          const Icon = entry.icon;
          return (
            <Link
              key={entry.title}
              href={entry.href}
              target={entry.external ? "_blank" : undefined}
              className="group flex items-center gap-4 rounded-[22px] border border-black/[0.06] bg-[#f7f7f8] p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_34px_rgba(31,32,36,0.08)] dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${entry.tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-[#1f2024] dark:text-white">{entry.title}</span>
                <span className="mt-1 block truncate text-sm font-semibold text-[#777e89] dark:text-white/55">{entry.description}</span>
              </span>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-[#9aa0aa] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#2f7df6]" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

async function getAdminStats({
  customerId,
  siteId,
}: {
  customerId: string;
  siteId: string;
}) {
  const [stats] = await getDb().execute<{
    sourceCount: number | string;
    conversationCount: number | string;
    leadCount: number | string;
  }>(sql`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM ${knowledgeSources}
        WHERE ${knowledgeSources.customerId} = ${customerId}
          AND ${knowledgeSources.siteId} = ${siteId}
      ) AS "sourceCount",
      (
        SELECT COUNT(*)::int
        FROM ${conversations}
        WHERE ${conversations.customerId} = ${customerId}
          AND ${conversations.siteId} = ${siteId}
      ) AS "conversationCount",
      (
        SELECT COUNT(*)::int
        FROM ${leads}
        WHERE ${leads.customerId} = ${customerId}
          AND ${leads.siteId} = ${siteId}
      ) AS "leadCount"
  `);

  return {
    sourceCount: Number(stats?.sourceCount || 0),
    conversationCount: Number(stats?.conversationCount || 0),
    leadCount: Number(stats?.leadCount || 0),
  };
}
