import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { updateSettingsAction } from "@/app/admin/actions";
import { getDb, sites } from "@/db";
import { AiContentAssistant } from "@/components/admin/ai-content-assistant";
import { AdminShell } from "@/components/admin/admin-shell";
import { getTenantOptions, resolveActiveTenant } from "@/lib/admin-tenants";
import { requireAdmin } from "@/lib/auth";
import { AI_TONE_PRESETS, DEFAULT_AI_TONE, DEFAULT_BUSINESS_FLOW, DEFAULT_TONE_KEYWORDS, DEFAULT_WELCOME_TITLE } from "@/lib/defaults";
import { getDemoWidgetConfig, isDemoMode } from "@/lib/demo-mode";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SettingsTab = "content" | "style" | "script" | "preview";

const tabs: Array<{ id: SettingsTab; label: string; description: string }> = [
  { id: "content", label: "对话内容", description: "欢迎语、推荐问题、留资" },
  { id: "style", label: "入口样式", description: "按钮、头像、主题色" },
  { id: "script", label: "脚本嵌入", description: "官网安装代码" },
  { id: "preview", label: "Demo 预览", description: "新窗口查看效果" },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; tenantId?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  if (params.tab === "tenants" || params.tab === "security") {
    redirect(`/admin/settings/tenants?tab=${params.tab}${params.tenantId ? `&tenantId=${params.tenantId}` : ""}`);
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
  const embedBaseUrl = getEmbedBaseUrl(site.domain);
  const embedCode = `<script src="${embedBaseUrl}/widget.js" data-site-id="${site.id}"></script>`;
  const allowedOrigins = Array.from(new Set([site.domain, `www.${site.domain.replace(/^www\./, "")}`, ...site.allowedOrigins])).join("\n");

  return (
    <AdminShell
      title="设置"
      description="配置官网 AI 客服的对话内容、语气流程、入口样式、脚本安装和 Demo 预览。"
      tenantSwitcher={{
        activeTenantId: activeTenant?.id,
        hrefBase: "/admin/settings",
        query: { tab: activeTab },
        tenants: tenantRows,
      }}
      settingsSubnav={[
        {
          label: "配置",
          description: "对话、样式、脚本、预览",
          items: [
            {
              href: `/admin/settings?tab=${activeTab}${activeTenant?.id ? `&tenantId=${activeTenant.id}` : ""}`,
              label: "配置",
              description: "对话、样式、脚本、预览",
              active: true,
            },
          ],
        },
        {
          label: "租户管理",
          description: "租户空间、模型安全",
          items: [
            {
              href: `/admin/settings/tenants${activeTenant?.id ? `?tenantId=${activeTenant.id}` : ""}`,
              label: "租户管理",
              description: "租户空间、模型安全",
              active: false,
            },
          ],
        },
      ]}
    >
      {isDemoMode() ? (
        <div className="mb-5 rounded-[22px] border border-[#ffd6a5] bg-[#fff4df] p-4 text-sm font-semibold text-[#9b5a17] dark:border-[#ffb48b]/30 dark:bg-[#ffb48b]/14 dark:text-[#ffd2b7]">
          当前为预览模式，表单可用于查看配置项；保存不会持久化。可通过 `/demo?style=pill`、`/demo?style=vertical`
          或 `/demo?style=mascot` 快速预览不同入口样式。
        </div>
      ) : null}

      <div className="max-w-7xl space-y-6">
        <TabNav activeTab={activeTab} activeTenantId={activeTenant?.id} />

        {activeTab === "content" ? (
          <form action={updateSettingsAction} className="space-y-6">
            <input type="hidden" name="settingsSection" value="content" />
            <SettingsSection accent="#c7b6ff" title="对话内容" description="配置访客打开窗口后看到的欢迎语、推荐问题、语气流程和留资开关。">
              <AiContentAssistant
                defaultWelcomeTitle={site.welcomeTitle || DEFAULT_WELCOME_TITLE}
                defaultWelcomeMessage={site.welcomeMessage}
                defaultSuggestedQuestions={site.suggestedQuestions}
                defaultAiTone={site.aiTone || DEFAULT_AI_TONE}
                toneOptions={Object.entries(AI_TONE_PRESETS)}
                defaultToneKeywords={site.toneKeywords?.length ? site.toneKeywords : DEFAULT_TONE_KEYWORDS}
                defaultBusinessFlow={site.businessFlow || DEFAULT_BUSINESS_FLOW}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Checkbox label="前台展示来源链接" name="showSources" defaultChecked={site.showSources} />
                <Checkbox label="启用留资收集" name="collectLeadEnabled" defaultChecked={site.collectLeadEnabled} />
              </div>
            </SettingsSection>
            <SaveBar />
          </form>
        ) : null}

        {activeTab === "style" ? (
          <form action={updateSettingsAction} className="space-y-6">
            <input type="hidden" name="settingsSection" value="style" />
            <SettingsSection accent="#ffb48b" title="入口样式" description="控制官网右下角入口的文字、样式、头像、主题色和动效。">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="助手名称" name="widgetName" defaultValue={site.widgetName} />
                <Field label="入口文案" name="launcherText" defaultValue={site.launcherText} />
                <Field label="主题色" name="themeColor" defaultValue={site.themeColor} />
                <Select
                  label="入口样式"
                  name="launcherStyle"
                  defaultValue={site.launcherStyle}
                  options={[
                    ["pill", "胶囊入口：获取方案"],
                    ["vertical", "竖向卡片：咨询方案"],
                    ["mascot", "动漫头像：吉祥物角标"],
                  ]}
                />
                <Select
                  label="入口动效"
                  name="launcherAnimation"
                  defaultValue={site.launcherAnimation}
                  options={[
                    ["pulse", "呼吸光圈"],
                    ["float", "轻微漂浮"],
                    ["bounce", "轻弹提醒"],
                    ["none", "无动效"],
                  ]}
                />
                <Field
                  label="动漫头像图片 URL"
                  name="launcherImageUrl"
                  defaultValue={site.launcherImageUrl || ""}
                  placeholder="可选，不填则使用默认绿色吉祥物"
                />
                <Field label="角标文字" name="launcherBadgeText" defaultValue={site.launcherBadgeText || ""} placeholder="例如 1、NEW、!" />
              </div>
              <div className="flex flex-wrap gap-3">
                <PreviewLink href="/demo?style=pill&text=获取方案">胶囊入口预览</PreviewLink>
                <PreviewLink href="/demo?style=vertical">竖向入口预览</PreviewLink>
                <PreviewLink href="/demo?style=mascot">吉祥物入口预览</PreviewLink>
              </div>
            </SettingsSection>
            <SaveBar />
          </form>
        ) : null}

        {activeTab === "script" ? (
          <form action={updateSettingsAction} className="space-y-6">
            <input type="hidden" name="settingsSection" value="script" />
            <SettingsSection accent="#9bdcff" title="脚本嵌入" description="复制脚本到官网底部，发布前确认允许嵌入域名包含正式域名。">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#777e89] dark:text-white/60">嵌入代码</div>
                  <pre className="mt-2 max-w-full overflow-x-auto rounded-[18px] border border-[#9bdcff]/45 bg-[#f6fbff] p-4 text-sm font-semibold leading-6 text-[#1f2024] dark:border-[#9bdcff]/20 dark:bg-white/8 dark:text-white/80">
                    <code>{embedCode}</code>
                  </pre>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[#777e89] dark:text-white/55">
                    建议放在官网全站模板的 <code className="rounded bg-[#fff1e8] px-1 dark:bg-white/10">{"</body>"}</code> 前，脚本会自动创建右下角客服入口。
                  </p>
                </div>
                <div className="rounded-[22px] bg-[#f6f6f7] p-4 text-sm font-semibold text-[#5d646f] dark:bg-white/8 dark:text-white/65">
                  <div className="text-[#1f2024] dark:text-white">当前站点</div>
                  <div className="mt-3 space-y-2 break-all">
                    <div>站点域名：{site.domain}</div>
                    <div>
                      站点 ID：<span className="font-mono text-xs">{site.id}</span>
                    </div>
                    <a href="/demo" className="inline-flex rounded-[14px] bg-[#2f7df6] px-4 py-2 text-white transition hover:-translate-y-0.5">
                      打开本地预览
                    </a>
                  </div>
                </div>
              </div>
              <TextArea label="允许嵌入域名，每行一个" name="allowedOrigins" defaultValue={allowedOrigins} rows={4} />
            </SettingsSection>
            <SaveBar />
          </form>
        ) : null}

        {activeTab === "preview" ? (
          <SettingsSection accent="#d8c7ff" title="Demo 预览" description="在新窗口快速检查不同入口样式和前台对话效果。">
            <div className="grid gap-4 md:grid-cols-3">
              <PreviewCard href="/demo" title="默认预览" description="使用当前配置和默认入口样式打开预览页面。" />
              <PreviewCard
                href={`/demo?style=${site.launcherStyle || "vertical"}`}
                title="当前入口样式"
                description={`按当前设置的 ${site.launcherStyle || "vertical"} 样式预览。`}
              />
              <PreviewCard href="/demo?style=mascot" title="吉祥物样式" description="单独查看动漫头像入口和角标动效。" />
            </div>
            <div className="rounded-[22px] bg-[#f6f6f7] p-4 text-sm font-semibold leading-6 text-[#5d646f] dark:bg-white/8 dark:text-white/65">
              预览页会读取当前站点配置，用来检查官网入口、欢迎语、推荐问题和留资表单是否符合预期。
            </div>
          </SettingsSection>
        ) : null}
      </div>
    </AdminShell>
  );
}

function TabNav({ activeTab, activeTenantId }: { activeTab: SettingsTab; activeTenantId?: string | null }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-[24px] border border-black/[0.06] bg-white p-2 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        const href = `/admin/settings?tab=${tab.id}${activeTenantId ? `&tenantId=${activeTenantId}` : ""}`;
        return (
          <Link
            key={tab.id}
            href={href}
            className={[
              "min-w-[160px] rounded-[18px] px-4 py-3 transition",
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

function Select({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#777e89] dark:text-white/60">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-[18px] border border-black/[0.06] bg-[#f5f5f6] px-4 py-3 text-sm font-semibold text-[#1f2024] outline-none transition focus:border-[#2f7df6]/40 focus:bg-white focus:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-white/8 dark:text-white dark:focus:border-[#2f7df6]/60 dark:focus:bg-white/12"
      >
        {options.map(([value, labelText]) => (
          <option key={value} value={value} className="bg-white text-[#1f2024] dark:bg-[#171a20] dark:text-white">
            {labelText}
          </option>
        ))}
      </select>
    </label>
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

function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-3 rounded-[18px] bg-[#f6f6f7] px-4 py-3 text-sm font-bold text-[#5d646f] dark:bg-white/8 dark:text-white/65">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[#2f7df6]" />
      {label}
    </label>
  );
}

function PreviewLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      className="rounded-[16px] bg-[#f6f6f7] px-4 py-2 text-sm font-bold text-[#5d646f] transition hover:-translate-y-0.5 hover:bg-white hover:text-[#2f7df6] hover:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:bg-white/8 dark:text-white/65 dark:hover:bg-white/12 dark:hover:text-white"
    >
      {children}
    </a>
  );
}

function PreviewCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <a
      href={href}
      target="_blank"
      className="group rounded-[22px] border border-black/[0.06] bg-[#f6f6f7] p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_42px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
    >
      <span className="inline-flex rounded-[14px] bg-[#ff6b4a] px-3 py-1.5 text-xs font-bold text-white transition group-hover:bg-[#2f7df6] dark:bg-[#ff6b4a] dark:text-white">
        打开预览
      </span>
      <h3 className="mt-4 text-lg font-bold text-[#1f2024] dark:text-white">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#777e89] dark:text-white/55">{description}</p>
    </a>
  );
}

function getEmbedBaseUrl(domain: string) {
  if (domain.includes("localhost") || domain.startsWith("127.")) {
    return absoluteUrl("").replace(/\/$/, "");
  }

  const normalizedDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const host = normalizedDomain.startsWith("www.") ? normalizedDomain : `www.${normalizedDomain}`;
  return `https://${host}`;
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

function normalizeTab(value?: string): SettingsTab {
  return tabs.some((tab) => tab.id === value) ? (value as SettingsTab) : "content";
}
