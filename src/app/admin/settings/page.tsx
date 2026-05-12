import { eq } from "drizzle-orm";

import { updateSettingsAction } from "@/app/admin/actions";
import { getDb, sites } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getDemoWidgetConfig, isDemoMode } from "@/lib/demo-mode";
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
        domain: "localhost:3000",
        allowedOrigins: ["localhost:3000", "127.0.0.1:3000"],
        systemPrompt: "",
        deepseekModel: "",
        embeddingModel: "",
      }
    : (await getDb().select().from(sites).where(eq(sites.id, session.siteId)).limit(1))[0];

  if (!site) {
    throw new Error("Site not found.");
  }

  return (
    <AdminShell title="设置" description="配置前台 Widget、推荐问题、域名白名单和模型参数。">
      {isDemoMode() ? (
        <div className="mb-5 rounded-[22px] border border-[#ffd6a5] bg-[#fff4df] p-4 text-sm font-semibold text-[#9b5a17] dark:border-[#ffb48b]/30 dark:bg-[#ffb48b]/14 dark:text-[#ffd2b7]">
          当前为演示模式，表单可用于查看配置项；保存不会持久化。可通过 `/demo?style=pill`、`/demo?style=vertical`
          或 `/demo?style=mascot` 快速预览不同入口样式。
        </div>
      ) : null}
      <form
        action={updateSettingsAction}
        className="max-w-4xl space-y-6 rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none"
      >
        <div className="flex items-center gap-3">
          <span className="h-10 w-2 rounded-full bg-[#ffb48b]" />
          <div>
            <h2 className="text-2xl font-bold text-[#1f2024] dark:text-white">Widget 外观</h2>
            <p className="mt-1 text-sm font-semibold text-[#777e89]">配置入口文案、样式、头像和动效。</p>
          </div>
        </div>
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
          <Field label="DeepSeek 模型" name="deepseekModel" defaultValue={site.deepseekModel || ""} placeholder="默认使用环境变量" />
          <Field label="Embedding 模型" name="embeddingModel" defaultValue={site.embeddingModel || ""} placeholder="默认使用环境变量" />
        </div>
        <TextArea label="欢迎语" name="welcomeMessage" defaultValue={site.welcomeMessage} rows={4} />
        <TextArea label="推荐问题，每行一个" name="suggestedQuestions" defaultValue={site.suggestedQuestions.join("\n")} rows={6} />
        <TextArea label="允许嵌入域名，每行一个" name="allowedOrigins" defaultValue={site.allowedOrigins.join("\n")} rows={4} />
        <TextArea label="客户补充提示词" name="systemPrompt" defaultValue={site.systemPrompt || ""} rows={5} />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-[18px] bg-[#f6f6f7] px-4 py-3 text-sm font-bold text-[#5d646f] dark:bg-white/8 dark:text-white/65">
            <input type="checkbox" name="showSources" defaultChecked={site.showSources} className="h-4 w-4 accent-[#2f7df6]" />
            前台展示来源链接
          </label>
          <label className="flex items-center gap-3 rounded-[18px] bg-[#f6f6f7] px-4 py-3 text-sm font-bold text-[#5d646f] dark:bg-white/8 dark:text-white/65">
            <input type="checkbox" name="collectLeadEnabled" defaultChecked={site.collectLeadEnabled} className="h-4 w-4 accent-[#2f7df6]" />
            启用留资收集
          </label>
        </div>
        <button className="rounded-[18px] bg-[#2f7df6] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(47,125,246,0.24)] transition hover:-translate-y-0.5 hover:bg-[#1d6ef0]">
          保存设置
        </button>
      </form>
    </AdminShell>
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
