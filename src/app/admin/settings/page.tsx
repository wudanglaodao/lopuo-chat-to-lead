import { eq } from "drizzle-orm";

import { updateSettingsAction } from "@/app/admin/actions";
import { getDb, sites, tenants } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getDemoWidgetConfig, isDemoMode } from "@/lib/demo-mode";
import { absoluteUrl } from "@/lib/utils";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireAdmin();
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

  const tenantRows = isDemoMode()
    ? getDemoTenants(session.customerId)
    : await getDb().select().from(tenants).where(eq(tenants.customerId, session.customerId));
  const embedBaseUrl = getEmbedBaseUrl(site.domain);
  const embedTenantId = site.defaultTenantId || tenantRows[0]?.id || "";
  const embedCode = `<script src="${embedBaseUrl}/widget.js" data-site-id="${site.id}" data-tenant-id="${embedTenantId}"></script>`;
  const allowedOrigins = Array.from(new Set([site.domain, `www.${site.domain.replace(/^www\./, "")}`, ...site.allowedOrigins])).join("\n");

  return (
    <AdminShell title="设置" description="分别配置官网嵌入、入口样式、对话内容和模型安全策略。">
      {isDemoMode() ? (
        <div className="mb-5 rounded-[22px] border border-[#ffd6a5] bg-[#fff4df] p-4 text-sm font-semibold text-[#9b5a17] dark:border-[#ffb48b]/30 dark:bg-[#ffb48b]/14 dark:text-[#ffd2b7]">
          当前为演示模式，表单可用于查看配置项；保存不会持久化。可通过 `/demo?style=pill`、`/demo?style=vertical`
          或 `/demo?style=mascot` 快速预览不同入口样式。
        </div>
      ) : null}
      <form
        action={updateSettingsAction}
        className="max-w-6xl space-y-6"
      >
        <SettingsSection
          accent="#9bdcff"
          title="官网嵌入"
          description="复制脚本到官网底部，发布前确认允许嵌入域名包含正式域名。"
        >
          <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
            <div>
              <div className="text-sm font-bold text-[#777e89] dark:text-white/60">嵌入代码</div>
              <pre className="mt-2 overflow-x-auto rounded-[18px] border border-black/[0.06] bg-[#111318] p-4 text-sm font-semibold leading-6 text-[#d9f7ff] dark:border-white/10 dark:bg-black/35">
                <code>{embedCode}</code>
              </pre>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#777e89] dark:text-white/55">
                建议放在官网全站模板的 <code className="rounded bg-black/5 px-1 dark:bg-white/10">{"</body>"}</code> 前，脚本会自动创建右下角客服入口。
              </p>
            </div>
            <div className="rounded-[22px] bg-[#f6f6f7] p-4 text-sm font-semibold text-[#5d646f] dark:bg-white/8 dark:text-white/65">
              <div className="text-[#1f2024] dark:text-white">当前站点</div>
              <div className="mt-3 space-y-2">
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
          <Select
            label="官网默认租户"
            name="defaultTenantId"
            defaultValue={site.defaultTenantId || tenantRows[0]?.id || ""}
            options={tenantRows.map((tenant) => [tenant.id, tenant.name])}
          />
        </SettingsSection>

        <SettingsSection accent="#ffb48b" title="入口样式" description="控制官网右下角入口的文字、样式、头像、主题色和动效。">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="AI 名称" name="widgetName" defaultValue={site.widgetName} />
            <Field label="入口文案" name="launcherText" defaultValue={site.launcherText} />
            <Field label="主题色" name="themeColor" defaultValue={site.themeColor} />
            <Select
              label="入口样式"
              name="launcherStyle"
              defaultValue={site.launcherStyle}
              options={[
                ["pill", "粉色胶囊：与 AI 聊天"],
                ["vertical", "竖向卡片：AI 助理"],
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
            <Field
              label="角标文字"
              name="launcherBadgeText"
              defaultValue={site.launcherBadgeText || ""}
              placeholder="例如 1、NEW、!"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <PreviewLink href="/demo?style=pill&text=与%20AI%20聊天">胶囊入口预览</PreviewLink>
            <PreviewLink href="/demo?style=vertical">竖向入口预览</PreviewLink>
            <PreviewLink href="/demo?style=mascot">吉祥物入口预览</PreviewLink>
          </div>
        </SettingsSection>

        <SettingsSection accent="#c7b6ff" title="对话内容" description="配置访客打开窗口后看到的欢迎语、推荐问题、来源展示和留资开关。">
          <TextArea label="欢迎语" name="welcomeMessage" defaultValue={site.welcomeMessage} rows={4} />
          <TextArea label="推荐问题，每行一个" name="suggestedQuestions" defaultValue={site.suggestedQuestions.join("\n")} rows={6} />
          <div className="grid gap-3 md:grid-cols-2">
            <Checkbox label="前台展示来源链接" name="showSources" defaultChecked={site.showSources} />
            <Checkbox label="启用留资收集" name="collectLeadEnabled" defaultChecked={site.collectLeadEnabled} />
          </div>
        </SettingsSection>

        <SettingsSection accent="#bdf2a0" title="模型与安全" description="配置模型覆盖项和客户补充提示词。默认会使用 Vercel 环境变量中的模型配置。">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="对话模型" name="deepseekModel" defaultValue={site.deepseekModel || ""} placeholder="默认使用 LLM_MODEL" />
            <Field label="Embedding 模型" name="embeddingModel" defaultValue={site.embeddingModel || ""} placeholder="默认使用环境变量" />
          </div>
          <TextArea label="客户补充提示词" name="systemPrompt" defaultValue={site.systemPrompt || ""} rows={5} />
        </SettingsSection>

        <div className="sticky bottom-4 z-10 flex justify-end">
          <button className="rounded-[18px] bg-[#2f7df6] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(47,125,246,0.24)] transition hover:-translate-y-0.5 hover:bg-[#1d6ef0]">
            保存设置
          </button>
        </div>
      </form>
    </AdminShell>
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
