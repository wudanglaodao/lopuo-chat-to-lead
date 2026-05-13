import Link from "next/link";

import { createTenantAction } from "@/app/admin/actions";
import type { TenantOption } from "@/lib/admin-tenants";

export function TenantManagementPanel({
  tenantRows,
  activeTenantId,
  defaultTenantId,
}: {
  tenantRows: TenantOption[];
  activeTenantId?: string | null;
  defaultTenantId?: string | null;
}) {
  return (
    <section className="space-y-5 rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
      <div className="flex items-center gap-3">
        <span className="h-10 w-2 rounded-full bg-[#9bdcff]" />
        <div>
          <h2 className="text-2xl font-bold text-[#1f2024] dark:text-white">租户管理</h2>
          <p className="mt-1 text-sm font-semibold text-[#777e89]">
            一个企业可拆分多个租户空间；每个租户拥有独立知识来源、会话记录、留资策略和销售归属。
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tenantRows.map((tenant) => {
          const active = tenant.id === activeTenantId;
          return (
            <Link
              key={tenant.id}
              href={`/admin/settings/tenants?tab=tenants&tenantId=${tenant.id}`}
              className={[
                "rounded-[22px] border p-4 transition hover:-translate-y-0.5",
                active
                  ? "border-[#2f7df6]/40 bg-[#f0f6ff] shadow-[0_14px_30px_rgba(47,125,246,0.12)] dark:border-[#2f7df6]/50 dark:bg-[#2f7df6]/12"
                  : "border-black/[0.06] bg-[#f6f6f7] hover:bg-white hover:shadow-sm dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-bold text-[#1f2024] dark:text-white">{tenant.name}</div>
                  <div className="mt-1 line-clamp-2 text-sm font-semibold text-[#777e89] dark:text-white/50">
                    {tenant.description || "独立承载该租户的知识库、访客沟通与留资线索。"}
                  </div>
                </div>
                {tenant.id === defaultTenantId ? (
                  <span className="shrink-0 rounded-full bg-[#edf8e8] px-3 py-1 text-xs font-bold text-[#6bb956] dark:bg-[#6bb956]/18 dark:text-[#a5dd95]">
                    默认
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>

      <form action={createTenantAction} className="grid gap-3 rounded-[22px] bg-[#f6f6f7] p-4 dark:bg-white/8 md:grid-cols-[0.8fr_1fr_auto]">
        <input
          name="name"
          placeholder="新租户名称，例如 售前咨询"
          className="min-w-0 rounded-[18px] border border-black/[0.06] bg-white px-4 py-3 text-sm font-semibold text-[#1f2024] outline-none transition placeholder:text-[#a8adb6] focus:border-[#2f7df6]/40 focus:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-[#171a20] dark:text-white dark:placeholder:text-white/30"
        />
        <input
          name="description"
          placeholder="用途说明，可选"
          className="min-w-0 rounded-[18px] border border-black/[0.06] bg-white px-4 py-3 text-sm font-semibold text-[#1f2024] outline-none transition placeholder:text-[#a8adb6] focus:border-[#2f7df6]/40 focus:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-[#171a20] dark:text-white dark:placeholder:text-white/30"
        />
        <button className="rounded-[18px] bg-[#ff6b4a] px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#ff5530] dark:bg-[#ff6b4a] dark:text-white">
          新建租户
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/admin/knowledge${activeTenantId ? `?tenantId=${activeTenantId}` : ""}`}
          className="rounded-[16px] bg-[#2f7df6] px-4 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#1d6ef0]"
        >
          管理当前租户知识库
        </Link>
        <Link
          href={`/admin/conversations${activeTenantId ? `?tenantId=${activeTenantId}` : ""}`}
          className="rounded-[16px] bg-[#f6f6f7] px-4 py-2 text-sm font-bold text-[#5d646f] transition hover:-translate-y-0.5 hover:bg-white hover:text-[#2f7df6] hover:shadow-sm dark:bg-white/8 dark:text-white/65 dark:hover:bg-white/12 dark:hover:text-white"
        >
          查看当前租户会话
        </Link>
      </div>
    </section>
  );
}
