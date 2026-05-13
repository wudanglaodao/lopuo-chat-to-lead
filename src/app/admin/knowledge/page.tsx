import { and, desc, eq } from "drizzle-orm";

import { addKnowledgeSourceAction } from "@/app/admin/actions";
import { getDb, knowledgeSources } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { AdminShell } from "@/components/admin/admin-shell";
import { KnowledgeSyncForm } from "@/components/admin/knowledge-sync-form";
import { getAdminSiteTenantContext } from "@/lib/admin-tenants";

export const dynamic = "force-dynamic";

export default async function KnowledgePage({
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
  const sources = isDemoMode()
    ? []
    : activeTenant
      ? await getDb()
          .select()
          .from(knowledgeSources)
          .where(
            and(
              eq(knowledgeSources.customerId, session.customerId),
              eq(knowledgeSources.siteId, session.siteId),
              eq(knowledgeSources.tenantId, activeTenant.id),
            ),
          )
          .orderBy(desc(knowledgeSources.updatedAt))
          .limit(100)
      : [];

  return (
    <AdminShell
      title="知识库"
      description="按当前租户管理 URL 或 sitemap 来源；同步后进入清洗、切块、向量化和来源追踪。"
      tenantSwitcher={{
        activeTenantId: activeTenant?.id,
        hrefBase: "/admin/knowledge",
        tenants: tenantRows,
      }}
    >
      {isDemoMode() ? (
        <div className="mb-5 rounded-[22px] border border-[#ffd6a5] bg-[#fff4df] p-4 text-sm font-semibold text-[#9b5a17] dark:border-[#ffb48b]/30 dark:bg-[#ffb48b]/14 dark:text-[#ffd2b7]">
          当前为预览模式，URL 添加与同步不会写入数据库。连接 Postgres + pgvector 后，这里会展示真实抓取、切块和入库状态。
        </div>
      ) : null}
      <section className="rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
        <div className="mb-5 flex items-center gap-3">
          <span className="h-10 w-2 rounded-full bg-[#c7b6ff]" />
          <div>
            <h2 className="text-2xl font-bold text-[#1f2024] dark:text-white">添加 URL / Sitemap</h2>
            <p className="mt-1 text-sm font-semibold text-[#777e89]">
              当前写入：{activeTenant?.name || "暂无场景"}。可填单页 URL，也可填 sitemap.xml 批量展开页面后向量化。
            </p>
          </div>
        </div>
        <form action={addKnowledgeSourceAction} className="flex flex-col gap-3 md:flex-row">
          <input type="hidden" name="tenantId" value={activeTenant?.id || ""} />
          <input
            name="url"
            type="url"
            required
            placeholder="https://www.lopuo.com/sitemap.xml"
            className="min-w-0 flex-1 rounded-[18px] border border-black/[0.06] bg-[#f5f5f6] px-4 py-3 text-sm font-semibold text-[#1f2024] outline-none transition placeholder:text-[#a8adb6] focus:border-[#2f7df6]/40 focus:bg-white focus:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder:text-white/30 dark:focus:border-[#2f7df6]/60 dark:focus:bg-white/12"
          />
          <button className="rounded-[18px] bg-[#2f7df6] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(47,125,246,0.24)] transition hover:-translate-y-0.5 hover:bg-[#1d6ef0]">
            添加来源
          </button>
        </form>
      </section>

      <section className="mt-6 overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
        <div className="grid grid-cols-[1fr_120px_180px_120px] gap-4 border-b border-black/[0.06] bg-[#fbfbfc] px-5 py-4 text-xs font-bold uppercase text-[#9aa0aa] dark:border-white/10 dark:bg-white/[0.04] dark:text-white/45">
          <div>来源</div>
          <div>状态</div>
          <div>最近同步</div>
          <div />
        </div>
        {sources.map((source) => (
          <div
            key={source.id}
            className="grid grid-cols-[1fr_120px_180px_120px] gap-4 border-b border-black/[0.04] px-5 py-4 text-sm last:border-0 dark:border-white/10"
          >
            <div className="min-w-0">
              <div className="truncate font-bold text-[#1f2024] dark:text-white">{source.title || source.url}</div>
              <div className="mt-1 truncate text-xs font-semibold text-[#9aa0aa]">{source.url}</div>
              {source.lastError ? <div className="mt-2 text-xs font-semibold text-[#ff5a4f]">{source.lastError}</div> : null}
            </div>
            <div>
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${getStatusTone(source.status)}`}>{source.status}</span>
            </div>
            <div className="text-xs font-semibold leading-5 text-[#777e89]">
              {formatSyncTime(source)}
            </div>
            <KnowledgeSyncForm sourceId={source.id} />
          </div>
        ))}
        {sources.length === 0 ? (
          <div className="px-4 py-14 text-center text-sm font-semibold text-[#9aa0aa] dark:text-white/45">还没有添加知识来源。</div>
        ) : null}
      </section>
    </AdminShell>
  );
}

function getStatusTone(status: string) {
  if (status === "failed") return "bg-[#ffe8e5] text-[#ff5a4f] dark:bg-[#ff5a4f]/18 dark:text-[#ff9a92]";
  if (status === "syncing") return "bg-[#e8f1ff] text-[#2f7df6] dark:bg-[#2f7df6]/18 dark:text-[#8bbcff]";
  if (status === "pending") return "bg-[#fff4df] text-[#9b5a17] dark:bg-[#ffb48b]/16 dark:text-[#ffd2b7]";
  return "bg-[#edf8e8] text-[#6bb956] dark:bg-[#6bb956]/18 dark:text-[#a5dd95]";
}

function formatSyncTime(source: {
  status: string;
  lastSyncedAt?: Date | null;
  updatedAt?: Date | null;
}) {
  if (source.lastSyncedAt) {
    return source.lastSyncedAt.toLocaleString("zh-CN");
  }
  if (source.status === "failed" && source.updatedAt) {
    return `失败于 ${source.updatedAt.toLocaleString("zh-CN")}`;
  }
  if (source.status === "syncing" && source.updatedAt) {
    return `开始于 ${source.updatedAt.toLocaleString("zh-CN")}`;
  }
  return "尚未同步";
}
