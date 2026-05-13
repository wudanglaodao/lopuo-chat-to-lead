import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { updateSettingsAction } from "@/app/admin/actions";
import { getDb, sites } from "@/db";
import { AdminShell } from "@/components/admin/admin-shell";
import { TenantManagementPanel } from "@/components/admin/tenant-management-panel";
import { getTenantOptions, resolveActiveTenant } from "@/lib/admin-tenants";
import { requireAdmin } from "@/lib/auth";
import { getDemoWidgetConfig, isDemoMode } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";

type TenantSettingsTab = "tenants" | "security";

const tabs: Array<{ id: TenantSettingsTab; label: string; description: string }> = [
  { id: "tenants", label: "租户管理", description: "企业下多个租户空间" },
  { id: "security", label: "模型与安全", description: "模型覆盖与提示词" },
];

export default async function TenantSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; tenantId?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;

  if (params.tab === "content" || params.tab === "style" || params.tab === "script" || params.tab === "preview") {
    redirect(`/admin/settings?tab=${params.tab}${params.tenantId ? `&tenantId=${params.tenantId}` : ""}`);
  }

  const activeTab = normalizeTab(params.tab);
  const demoConfig = getDemoWidgetConfig({ siteId: session.siteId });
  const site = isDemoMode()
    ? {
        ...demoConfig,
        id: session.siteId,
        customerId: session.customerId,
        name: "演示站点",
        domain: "lopuo.work",
        defaultTenantId: "22222222-2222-4222-8222-222222222222",
        allowedOrigins: ["lopuo.work", "www.lopuo.work", "localhost:3000", "127.0.0.1:3000"],
        systemPrompt: "",
        deepseekModel: "",
        embeddingModel: "",
      }
    : (await getDb().select().from(sites).where(eq(sites.id, session.siteId)).limit(1))[0];

  if (!site) {
    throw new Error("Site not found.");
  }

  const tenantRows = await getTenantOptions(session.customerId);
  const activeTenant = resolveActiveTenant(tenantRows, params.tenantId, site.defaultTenantId);

  return (
    <AdminShell
      title="设置"
      description="管理企业租户空间、默认租户、模型覆盖项和 AI 安全边界。"
      tenantSwitcher={{
        activeTenantId: activeTenant?.id,
        hrefBase: "/admin/settings/tenants",
        query: { tab: activeTab },
        tenants: tenantRows,
      }}
      settingsSubnav={[
        {
          label: "配置",
          description: "对话、样式、脚本、预览",
          items: [
            {
              href: `/admin/settings${activeTenant?.id ? `?tenantId=${activeTenant.id}` : ""}`,
              label: "配置",
              description: "对话、样式、脚本、预览",
              active: false,
            },
          ],
        },
        {
          label: "租户管理",
          description: "租户空间、模型安全",
          items: [
            {
              href: `/admin/settings/tenants?tab=${activeTab}${activeTenant?.id ? `&tenantId=${activeTenant.id}` : ""}`,
              label: "租户管理",
              description: "租户空间、模型安全",
              active: true,
            },
          ],
        },
      ]}
    >
      {isDemoMode() ? (
        <div className="mb-5 rounded-[22px] border border-[#ffd6a5] bg-[#fff4df] p-4 text-sm font-semibold text-[#9b5a17] dark:border-[#ffb48b]/30 dark:bg-[#ffb48b]/14 dark:text-[#ffd2b7]">
          当前为预览模式，租户和模型配置可用于查看结构；保存不会持久化。
        </div>
      ) : null}

      <div className="max-w-7xl space-y-6">
        <TabNav activeTab={activeTab} activeTenantId={activeTenant?.id} />

        {activeTab === "tenants" ? (
          <TenantManagementPanel tenantRows={tenantRows} activeTenantId={activeTenant?.id} defaultTenantId={site.defaultTenantId} />
        ) : null}

        {activeTab === "security" ? (
          <form action={updateSettingsAction} className="space-y-6">
            <input type="hidden" name="settingsSection" value="security" />
            <SettingsSection accent="#bdf2a0" title="模型与安全" description="配置模型覆盖项和客户补充提示词。默认会使用 Vercel 环境变量中的模型配置。">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="对话模型" name="deepseekModel" defaultValue={site.deepseekModel || ""} placeholder="默认使用 LLM_MODEL" />
                <Field label="Embedding 模型" name="embeddingModel" defaultValue={site.embeddingModel || ""} placeholder="默认使用环境变量" />
              </div>
              <TextArea label="客户补充提示词" name="systemPrompt" defaultValue={site.systemPrompt || ""} rows={5} />
            </SettingsSection>
            <SaveBar />
          </form>
        ) : null}
      </div>
    </AdminShell>
  );
}

function TabNav({ activeTab, activeTenantId }: { activeTab: TenantSettingsTab; activeTenantId?: string | null }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-[24px] border border-black/[0.06] bg-white p-2 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        const href = `/admin/settings/tenants?tab=${tab.id}${activeTenantId ? `&tenantId=${activeTenantId}` : ""}`;
        return (
          <Link
            key={tab.id}
            href={href}
            className={[
              "min-w-[180px] rounded-[18px] px-4 py-3 transition",
              active
                ? "bg-[#ff6b4a] text-white shadow-[0_14px_30px_rgba(255,107,74,0.2)] dark:bg-[#ff6b4a] dark:text-white"
                : "text-[#777e89] hover:bg-[#f6f6f7] hover:text-[#1f2024] dark:text-white/55 dark:hover:bg-white/8 dark:hover:text-white",
            ].join(" ")}
          >
            <span className="block text-sm font-bold">{tab.label}</span>
            <span className="mt-1 block text-xs font-semibold opacity-70">{tab.description}</span>
          </Link>
        );
      })}
    </div>
  );
}

function SettingsSection({
  accent,
  title,
  description,
  children,
}: {
  accent: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
      <div className="flex items-center gap-3">
        <span className="h-10 w-2 rounded-full" style={{ backgroundColor: accent }} />
        <div>
          <h2 className="text-2xl font-bold text-[#1f2024] dark:text-white">{title}</h2>
          <p className="mt-1 text-sm font-semibold text-[#777e89]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function SaveBar() {
  return (
    <div className="sticky bottom-4 z-10 flex justify-end">
      <button className="rounded-[18px] bg-[#ff6b4a] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(255,107,74,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ff5530]">
        保存设置
      </button>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#777e89] dark:text-white/60">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[18px] border border-black/[0.06] bg-[#f5f5f6] px-4 py-3 text-sm font-semibold text-[#1f2024] outline-none transition placeholder:text-[#a8adb6] focus:border-[#2f7df6]/40 focus:bg-white focus:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder:text-white/30 dark:focus:border-[#2f7df6]/60 dark:focus:bg-white/12"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  rows,
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#777e89] dark:text-white/60">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="mt-2 w-full rounded-[18px] border border-black/[0.06] bg-[#f5f5f6] px-4 py-3 text-sm font-semibold leading-6 text-[#1f2024] outline-none transition focus:border-[#2f7df6]/40 focus:bg-white focus:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-white/8 dark:text-white dark:focus:border-[#2f7df6]/60 dark:focus:bg-white/12"
      />
    </label>
  );
}

function normalizeTab(value?: string): TenantSettingsTab {
  return tabs.some((tab) => tab.id === value) ? (value as TenantSettingsTab) : "tenants";
}
