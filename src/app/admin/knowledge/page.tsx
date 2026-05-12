import { and, desc, eq } from "drizzle-orm";

import { addKnowledgeSourceAction, createTenantAction, syncKnowledgeSourceAction } from "@/app/admin/actions";
import { getDb, knowledgeSources, tenants } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const tenantRows = isDemoMode()
    ? getDemoTenants(session.customerId)
    : await getDb()
        .select()
        .from(tenants)
        .where(eq(tenants.customerId, session.customerId))
        .orderBy(desc(tenants.updatedAt));
  const activeTenant = tenantRows.find((tenant) => tenant.id === params.tenantId) || tenantRows[0];
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
      : [];

  return (
    <AdminShell title="知识库" description="一个企业可拆分多个租户空间；每个租户拥有独立知识来源、向量片段、会话与线索归属。">
      {isDemoMode() ? (
        <div className="mb-5 rounded-[22px] border border-[#ffd6a5] bg-[#fff4df] p-4 text-sm font-semibold text-[#9b5a17] dark:border-[#ffb48b]/30 dark:bg-[#ffb48b]/14 dark:text-[#ffd2b7]">
          当前为演示模式，URL 添加与同步不会写入数据库。连接 Postgres + pgvector 后，这里会展示真实抓取、切块和入库状态。
        </div>
      ) : null}
      <section className="mb-6 rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
        <div className="mb-5 flex items-center gap-3">
          <span className="h-10 w-2 rounded-full bg-[#9bdcff]" />
          <div>
            <h2 className="text-2xl font-bold text-[#1f2024] dark:text-white">租户空间</h2>
            <p className="mt-1 text-sm font-semibold text-[#777e89]">适合按事业部、品牌、客户项目或解决方案线拆分知识库。</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {tenantRows.map((tenant) => {
            const active = tenant.id === activeTenant?.id;
            return (
              <a
                key={tenant.id}
                href={`/admin/knowledge?tenantId=${tenant.id}`}
                className={[
                  "rounded-[18px] px-4 py-3 text-sm font-bold transition",
                  active
                    ? "bg-[#1f2329] text-white shadow-[0_14px_30px_rgba(31,35,41,0.16)] dark:bg-white dark:text-[#1f2329]"
                    : "bg-[#f6f6f7] text-[#5d646f] hover:bg-white hover:text-[#2f7df6] hover:shadow-sm dark:bg-white/8 dark:text-white/65 dark:hover:bg-white/12 dark:hover:text-white",
                ].join(" ")}
              >
                {tenant.name}
              </a>
            );
          })}
        </div>

        <form action={createTenantAction} className="mt-5 grid gap-3 md:grid-cols-[0.8fr_1fr_auto]">
          <input
            name="name"
            placeholder="新租户名称，例如 售前咨询"
            className="min-w-0 rounded-[18px] border border-black/[0.06] bg-[#f5f5f6] px-4 py-3 text-sm font-semibold text-[#1f2024] outline-none transition placeholder:text-[#a8adb6] focus:border-[#2f7df6]/40 focus:bg-white focus:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder:text-white/30"
          />
          <input
            name="description"
            placeholder="用途说明，可选"
            className="min-w-0 rounded-[18px] border border-black/[0.06] bg-[#f5f5f6] px-4 py-3 text-sm font-semibold text-[#1f2024] outline-none transition placeholder:text-[#a8adb6] focus:border-[#2f7df6]/40 focus:bg-white focus:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder:text-white/30"
          />
          <button className="rounded-[18px] bg-[#1f2329] px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-[#1f2329]">
            新建租户
          </button>
        </form>
      </section>

      <section className="rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
        <div className="mb-5 flex items-center gap-3">
          <span className="h-10 w-2 rounded-full bg-[#c7b6ff]" />
          <div>
            <h2 className="text-2xl font-bold text-[#1f2024] dark:text-white">添加 URL</h2>
            <p className="mt-1 text-sm font-semibold text-[#777e89]">
              当前写入：{activeTenant?.name || "暂无租户"}。抓取官网页面后进入清洗、切块和向量化流程。
            </p>
          </div>
        </div>
        <form action={addKnowledgeSourceAction} className="flex flex-col gap-3 md:flex-row">
          <input type="hidden" name="tenantId" value={activeTenant?.id || ""} />
          <input
            name="url"
            type="url"
            required
            placeholder="https://example.com/product"
            className="min-w-0 flex-1 rounded-[18px] border border-black/[0.06] bg-[#f5f5f6] px-4 py-3 text-sm font-semibold text-[#1f2024] outline-none transition placeholder:text-[#a8adb6] focus:border-[#2f7df6]/40 focus:bg-white focus:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder:text-white/30 dark:focus:border-[#2f7df6]/60 dark:focus:bg-white/12"
          />
          <button className="rounded-[18px] bg-[#2f7df6] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(47,125,246,0.24)] transition hover:-translate-y-0.5 hover:bg-[#1d6ef0]">
            添加 URL
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
              <span className="rounded-full bg-[#edf8e8] px-3 py-1.5 text-xs font-bold text-[#6bb956]">{source.status}</span>
            </div>
            <div className="text-xs font-semibold text-[#777e89]">
              {source.lastSyncedAt ? source.lastSyncedAt.toLocaleString("zh-CN") : "尚未同步"}
            </div>
            <form action={syncKnowledgeSourceAction}>
              <input type="hidden" name="sourceId" value={source.id} />
              <button className="rounded-[14px] border border-black/[0.07] bg-white px-3 py-2 text-xs font-bold transition hover:border-[#2f7df6]/30 hover:text-[#2f7df6] hover:shadow-sm dark:border-white/10 dark:bg-white/8 dark:text-white dark:hover:border-[#2f7df6]/50">
                同步
              </button>
            </form>
          </div>
        ))}
        {sources.length === 0 ? (
          <div className="px-4 py-14 text-center text-sm font-semibold text-[#9aa0aa] dark:text-white/45">还没有添加知识来源。</div>
        ) : null}
      </section>
    </AdminShell>
  );
}

function getDemoTenants(customerId: string) {
  return [
    {
      id: "22222222-2222-4222-8222-222222222222",
      customerId,
      name: "默认租户",
      description: "官网 AI 客服默认租户",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      customerId,
      name: "售前咨询",
      description: "售前 FAQ、方案和案例资料",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}
