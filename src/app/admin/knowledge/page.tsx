import { and, desc, eq, sql } from "drizzle-orm";
import { Info } from "lucide-react";

import { addKnowledgeSourceAction } from "@/app/admin/actions";
import { getDb, knowledgeChunks, knowledgeSources } from "@/db";
import { formatAdminDateTime } from "@/lib/admin-time";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { AdminShell } from "@/components/admin/admin-shell";
import { KnowledgeSyncForm } from "@/components/admin/knowledge-sync-form";
import { getAdminSiteTenantContext } from "@/lib/admin-tenants";

export const dynamic = "force-dynamic";

type KnowledgeSourceWithStats = typeof knowledgeSources.$inferSelect & {
  chunkCount: number;
  pageCount: number;
};

const STALE_SYNCING_MINUTES = 30;
const STALE_SYNCING_MS = STALE_SYNCING_MINUTES * 60 * 1000;

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
  const sources: KnowledgeSourceWithStats[] = isDemoMode()
    ? []
    : activeTenant
      ? await getKnowledgeSourcesWithStats({
          customerId: session.customerId,
          siteId: session.siteId,
          tenantId: activeTenant.id,
        })
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

      <section className="mt-6 rounded-[28px] border border-black/[0.06] bg-white shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
        <div className="grid grid-cols-[1fr_120px_180px_48px_120px] gap-4 rounded-t-[28px] border-b border-black/[0.06] bg-[#fbfbfc] px-5 py-4 text-xs font-bold uppercase text-[#9aa0aa] dark:border-white/10 dark:bg-white/[0.04] dark:text-white/45">
          <div>来源</div>
          <div>状态</div>
          <div>最近同步</div>
          <div />
          <div />
        </div>
        {sources.map((source) => {
          const displayStatus = getDisplayStatus(source);

          return (
            <div
              key={source.id}
              className="grid grid-cols-[1fr_120px_180px_48px_120px] gap-4 border-b border-black/[0.04] px-5 py-4 text-sm last:border-0 dark:border-white/10"
            >
              <div className="min-w-0">
                <div className="truncate font-bold text-[#1f2024] dark:text-white">{source.title || source.url}</div>
                <div className="mt-1 truncate text-xs font-semibold text-[#9aa0aa]">{source.url}</div>
                {source.lastError ? <div className="mt-2 text-xs font-semibold text-[#ff5a4f]">{source.lastError}</div> : null}
              </div>
              <div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${getStatusTone(displayStatus)}`}>{displayStatus}</span>
              </div>
              <div className="text-xs font-semibold leading-5 text-[#777e89]">
                {formatSyncTime(source)}
              </div>
              <SyncResultHint source={source} />
              <KnowledgeSyncForm sourceId={source.id} />
            </div>
          );
        })}
        {sources.length === 0 ? (
          <div className="px-4 py-14 text-center text-sm font-semibold text-[#9aa0aa] dark:text-white/45">还没有添加知识来源。</div>
        ) : null}
      </section>
    </AdminShell>
  );
}

async function getKnowledgeSourcesWithStats({
  customerId,
  siteId,
  tenantId,
}: {
  customerId: string;
  siteId: string;
  tenantId: string;
}) {
  const db = getDb();
  const [sourceRows, statRows] = await Promise.all([
    db
      .select()
      .from(knowledgeSources)
      .where(
        and(
          eq(knowledgeSources.customerId, customerId),
          eq(knowledgeSources.siteId, siteId),
          eq(knowledgeSources.tenantId, tenantId),
        ),
      )
      .orderBy(desc(knowledgeSources.updatedAt))
      .limit(100),
    db
      .select({
        sourceId: knowledgeChunks.sourceId,
        chunkCount: sql<number>`count(*)::int`,
        pageCount: sql<number>`count(distinct ${knowledgeChunks.url})::int`,
      })
      .from(knowledgeChunks)
      .where(
        and(
          eq(knowledgeChunks.customerId, customerId),
          eq(knowledgeChunks.siteId, siteId),
          eq(knowledgeChunks.tenantId, tenantId),
        ),
      )
      .groupBy(knowledgeChunks.sourceId),
  ]);

  const statsBySourceId = new Map(
    statRows.map((row) => [
      row.sourceId,
      {
        chunkCount: Number(row.chunkCount) || 0,
        pageCount: Number(row.pageCount) || 0,
      },
    ]),
  );

  return sourceRows.map((source) => {
    const stats = statsBySourceId.get(source.id);
    return {
      ...source,
      chunkCount: stats?.chunkCount || 0,
      pageCount: stats?.pageCount || 0,
    };
  });
}

function getStatusTone(status: string) {
  if (status === "failed") return "bg-[#ffe8e5] text-[#ff5a4f] dark:bg-[#ff5a4f]/18 dark:text-[#ff9a92]";
  if (status === "stalled") return "bg-[#fff4df] text-[#9b5a17] dark:bg-[#ffb48b]/16 dark:text-[#ffd2b7]";
  if (status === "syncing") return "bg-[#e8f1ff] text-[#2f7df6] dark:bg-[#2f7df6]/18 dark:text-[#8bbcff]";
  if (status === "pending") return "bg-[#fff4df] text-[#9b5a17] dark:bg-[#ffb48b]/16 dark:text-[#ffd2b7]";
  return "bg-[#edf8e8] text-[#6bb956] dark:bg-[#6bb956]/18 dark:text-[#a5dd95]";
}

function getDisplayStatus(source: Pick<KnowledgeSourceWithStats, "status" | "updatedAt">) {
  if (source.status === "syncing" && isStaleSyncing(source.updatedAt)) {
    return "stalled";
  }

  return source.status;
}

function isStaleSyncing(updatedAt?: Date | null) {
  if (!updatedAt) {
    return false;
  }

  return Date.now() - updatedAt.getTime() > STALE_SYNCING_MS;
}

function formatSyncTime(source: { lastSyncedAt?: Date | null }) {
  if (source.lastSyncedAt) {
    return formatAdminDateTime(source.lastSyncedAt);
  }

  return "尚未同步";
}

function SyncResultHint({ source }: { source: KnowledgeSourceWithStats }) {
  const displayStatus = getDisplayStatus(source);
  const tone = getResultHintTone(displayStatus);
  const result = getSyncResultSummary(source, displayStatus);
  const title = result.lines.join("\n");

  return (
    <div className="relative flex items-start">
      <button
        type="button"
        aria-label={`查看 ${source.title || source.url} 最近一次数据抓取结果`}
        title={title}
        className={`peer mt-0.5 grid h-7 w-7 place-items-center rounded-full border transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7df6]/40 ${tone.button}`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <div className="pointer-events-none absolute right-0 top-9 z-30 hidden w-72 rounded-[18px] border border-black/[0.08] bg-white p-4 text-left shadow-[0_18px_42px_rgba(31,32,36,0.16)] peer-hover:block peer-focus-visible:block dark:border-white/10 dark:bg-[#20242c] dark:shadow-none">
        <div className="text-sm font-bold text-[#1f2024] dark:text-white">最近一次抓取结果</div>
        <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone.badge}`}>
          {result.label}
        </div>
        <div className="mt-3 space-y-1.5 text-xs font-semibold leading-5 text-[#777e89] dark:text-white/60">
          {result.lines.slice(1).map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getResultHintTone(status: string) {
  if (status === "failed") {
    return {
      button: "border-[#ff5a4f]/20 bg-[#ffe8e5] text-[#ff5a4f] hover:border-[#ff5a4f]/40 dark:border-[#ff5a4f]/25 dark:bg-[#ff5a4f]/16 dark:text-[#ff9a92]",
      badge: "bg-[#ffe8e5] text-[#ff5a4f] dark:bg-[#ff5a4f]/18 dark:text-[#ff9a92]",
    };
  }

  if (status === "syncing") {
    return {
      button: "border-[#2f7df6]/20 bg-[#e8f1ff] text-[#2f7df6] hover:border-[#2f7df6]/40 dark:border-[#2f7df6]/25 dark:bg-[#2f7df6]/16 dark:text-[#8bbcff]",
      badge: "bg-[#e8f1ff] text-[#2f7df6] dark:bg-[#2f7df6]/18 dark:text-[#8bbcff]",
    };
  }

  if (status === "stalled") {
    return {
      button: "border-[#ffb48b]/30 bg-[#fff4df] text-[#9b5a17] hover:border-[#ffb48b]/60 dark:border-[#ffb48b]/25 dark:bg-[#ffb48b]/16 dark:text-[#ffd2b7]",
      badge: "bg-[#fff4df] text-[#9b5a17] dark:bg-[#ffb48b]/16 dark:text-[#ffd2b7]",
    };
  }

  if (status === "pending") {
    return {
      button: "border-[#ffb48b]/30 bg-[#fff4df] text-[#9b5a17] hover:border-[#ffb48b]/60 dark:border-[#ffb48b]/25 dark:bg-[#ffb48b]/16 dark:text-[#ffd2b7]",
      badge: "bg-[#fff4df] text-[#9b5a17] dark:bg-[#ffb48b]/16 dark:text-[#ffd2b7]",
    };
  }

  return {
    button: "border-[#6bb956]/20 bg-[#edf8e8] text-[#6bb956] hover:border-[#6bb956]/40 dark:border-[#6bb956]/25 dark:bg-[#6bb956]/16 dark:text-[#a5dd95]",
    badge: "bg-[#edf8e8] text-[#6bb956] dark:bg-[#6bb956]/18 dark:text-[#a5dd95]",
  };
}

function getSyncResultSummary(source: KnowledgeSourceWithStats, displayStatus = getDisplayStatus(source)) {
  const syncedAt = source.lastSyncedAt ? formatAdminDateTime(source.lastSyncedAt) : "";
  const updatedAt = source.updatedAt ? formatAdminDateTime(source.updatedAt) : "";
  const contentStats = `当前入库：${source.pageCount} 个页面 / ${source.chunkCount} 个切块`;

  if (source.status === "failed") {
    return {
      label: "抓取失败",
      lines: [
        "抓取失败",
        source.lastError ? `错误：${source.lastError}` : "错误：未记录具体原因",
        syncedAt ? `上次成功：${syncedAt}` : "上次成功：暂无",
        contentStats,
      ],
    };
  }

  if (displayStatus === "stalled") {
    return {
      label: "抓取可能中断",
      lines: [
        "抓取可能中断",
        updatedAt ? `状态更新时间：${updatedAt}` : "状态更新时间：暂无",
        `说明：超过 ${STALE_SYNCING_MINUTES} 分钟没有更新，可能是请求超时或服务重启。`,
        syncedAt ? `最近成功：${syncedAt}` : "最近成功：暂无",
        contentStats,
      ],
    };
  }

  if (displayStatus === "syncing") {
    return {
      label: "正在抓取",
      lines: [
        "正在抓取",
        updatedAt ? `状态更新时间：${updatedAt}` : "状态更新时间：暂无",
        syncedAt ? `最近成功：${syncedAt}` : "最近成功：暂无",
        contentStats,
      ],
    };
  }

  if (displayStatus === "pending") {
    return {
      label: "等待同步",
      lines: ["等待同步", "还没有执行数据抓取。", contentStats],
    };
  }

  return {
    label: "抓取成功",
    lines: [
      "抓取成功",
      syncedAt ? `完成时间：${syncedAt}` : "完成时间：暂无",
      contentStats,
      source.chunkCount === 0 ? "提示：本次没有可入库内容，可能页面为空或内容重复。" : "结果：已更新知识库内容。",
    ],
  };
}
