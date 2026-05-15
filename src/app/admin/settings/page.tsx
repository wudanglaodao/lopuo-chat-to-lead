import Link from "next/link";
import { redirect } from "next/navigation";

import { updateSettingsAction } from "@/app/admin/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { LazyAiContentAssistant } from "@/components/admin/lazy-ai-content-assistant";
import { getAdminSiteTenantContext } from "@/lib/admin-tenants";
import { requireAdmin } from "@/lib/auth";
import { AI_TONE_PRESETS, DEFAULT_AI_TONE, DEFAULT_BUSINESS_FLOW, DEFAULT_TONE_KEYWORDS, DEFAULT_WELCOME_TITLE } from "@/lib/defaults";
import { isDemoMode } from "@/lib/demo-mode";
import { absoluteUrl } from "@/lib/utils";
import {
  DEFAULT_WIDGET_LOGO_TEXT,
  DEFAULT_WIDGET_LOGO_URL,
  normalizeWidgetLogoText,
  normalizeWidgetLogoType,
} from "@/lib/widget-brand";
import {
  DEFAULT_WIDGET_LOCALE,
  SUPPORTED_WIDGET_LOCALES,
  WIDGET_LOCALE_LABELS,
  normalizeEnabledLocales,
  normalizeWidgetLocale,
} from "@/lib/widget-i18n";
import {
  MAX_LAUNCHER_ANCHOR_GAP,
  MAX_LAUNCHER_BOTTOM_OFFSET,
  MAX_LAUNCHER_HORIZONTAL_OFFSET,
  MAX_WIDGET_CUSTOM_CODE_LENGTH,
  normalizeLauncherAnchorGap,
  normalizeLauncherAnchorSelector,
  normalizeLauncherBottomOffset,
  normalizeLauncherHorizontalOffset,
  normalizeLauncherPosition,
} from "@/lib/widget-launcher";

export const dynamic = "force-dynamic";

type SettingsTab = "content" | "style" | "multilingual" | "script";

const tabs: Array<{ id: SettingsTab; label: string; description: string }> = [
  { id: "content", label: "对话内容", description: "欢迎语、推荐问题、留资" },
  { id: "style", label: "入口样式", description: "按钮、头像、位置" },
  { id: "multilingual", label: "多语言", description: "默认语言、自动适配" },
  { id: "script", label: "脚本嵌入", description: "官网安装代码" },
];

const launcherPositionOptions: Array<[string, string]> = [
  ["bottom-right", "右下角：默认停靠位置"],
  ["bottom-left", "左下角：避开右侧悬浮元素"],
];

const widgetLogoTypeOptions: Array<[string, string]> = [
  ["image", "图片 Logo"],
  ["text", "文本"],
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
  const { site, tenantRows, activeTenant } = await getAdminSiteTenantContext({
    customerId: session.customerId,
    siteId: session.siteId,
    requestedTenantId: params.tenantId,
  });
  const embedBaseUrl = getEmbedBaseUrl(site.domain);
  const allowedOrigins = Array.from(new Set([site.domain, `www.${site.domain.replace(/^www\./, "")}`, ...site.allowedOrigins])).join("\n");
  const defaultLocale = normalizeWidgetLocale(site.defaultLocale) || DEFAULT_WIDGET_LOCALE;
  const enabledLocales = normalizeEnabledLocales(site.enabledLocales || [], defaultLocale);
  const launcherPosition = normalizeLauncherPosition(site.launcherPosition);
  const launcherBottomOffset = normalizeLauncherBottomOffset(site.launcherBottomOffset);
  const launcherHorizontalOffset = normalizeLauncherHorizontalOffset(site.launcherHorizontalOffset);
  const launcherAnchorSelector = normalizeLauncherAnchorSelector(site.launcherAnchorSelector);
  const launcherAnchorGap = normalizeLauncherAnchorGap(site.launcherAnchorGap);
  const widgetLogoType = normalizeWidgetLogoType(site.widgetLogoType);
  const widgetLogoText = normalizeWidgetLogoText(site.widgetLogoText || site.widgetName || DEFAULT_WIDGET_LOGO_TEXT);
  const anchorAttributes = launcherAnchorSelector
    ? ` data-launcher-anchor-selector="${launcherAnchorSelector}" data-launcher-anchor-gap="${launcherAnchorGap}"`
    : "";
  const embedCode = `<script src="${embedBaseUrl}/widget.js" data-site-id="${site.id}" data-launcher-position="${launcherPosition}" data-launcher-horizontal-offset="${launcherHorizontalOffset}" data-launcher-bottom-offset="${launcherBottomOffset}"${anchorAttributes}></script>`;
  const previewAnchorQuery = launcherAnchorSelector
    ? `&anchorSelector=${encodeURIComponent(launcherAnchorSelector)}&anchorGap=${launcherAnchorGap}`
    : "";

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
          description: "对话、样式、多语言、脚本",
          items: [
            {
              href: `/admin/settings?tab=${activeTab}${activeTenant?.id ? `&tenantId=${activeTenant.id}` : ""}`,
              label: "配置",
              description: "对话、样式、多语言、脚本",
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
          当前为预览模式，表单可用于查看配置项；保存不会持久化。可通过右侧预览入口或样式区快捷按钮，新窗口检查不同入口样式。
        </div>
      ) : null}

      <div className="max-w-7xl space-y-6">
        <TabNav activeTab={activeTab} activeTenantId={activeTenant?.id} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0">
            {activeTab === "content" ? (
              <form action={updateSettingsAction} className="space-y-6">
                <input type="hidden" name="settingsSection" value="content" />
                <SettingsSection accent="#c7b6ff" title="对话内容" description="配置访客打开窗口后看到的欢迎语、推荐问题、语气流程和留资开关。">
                  <LazyAiContentAssistant
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
                <SettingsSection accent="#ffb48b" title="入口样式" description="控制官网入口的文字、样式、位置、头像、主题色和动效。">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="助手名称" name="widgetName" defaultValue={site.widgetName} />
                    <Select
                      label="弹窗头部品牌"
                      name="widgetLogoType"
                      defaultValue={widgetLogoType}
                      options={widgetLogoTypeOptions}
                    />
                    <Field
                      label="头部 Logo 图片 URL"
                      name="widgetLogoUrl"
                      type="url"
                      defaultValue={site.widgetLogoUrl || DEFAULT_WIDGET_LOGO_URL}
                      placeholder="https://example.com/logo.svg"
                    />
                    <Field
                      label="头部品牌文本"
                      name="widgetLogoText"
                      defaultValue={widgetLogoText}
                      placeholder="Lopuo"
                    />
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
                  <div className="border-t border-black/[0.06] pt-5 dark:border-white/10">
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-[#1f2024] dark:text-white">位置设置</h3>
                      <p className="mt-1 text-sm font-semibold text-[#777e89] dark:text-white/55">
                        定义入口在访客页面的可见边缘位置；手机打开对话时仍会铺满屏幕，关闭态会自动收拢侧边距。
                      </p>
                    </div>
                    <div className="grid gap-5 md:grid-cols-3">
                      <Select
                        label="入口位置"
                        name="launcherPosition"
                        defaultValue={launcherPosition}
                        options={launcherPositionOptions}
                      />
                      <Field
                        label="距离侧边（px）"
                        name="launcherHorizontalOffset"
                        type="number"
                        min={0}
                        max={MAX_LAUNCHER_HORIZONTAL_OFFSET}
                        step={1}
                        defaultValue={String(launcherHorizontalOffset)}
                        placeholder="20"
                      />
                      <Field
                        label="距离底部（px）"
                        name="launcherBottomOffset"
                        type="number"
                        min={0}
                        max={MAX_LAUNCHER_BOTTOM_OFFSET}
                        step={1}
                        defaultValue={String(launcherBottomOffset)}
                        placeholder="20"
                      />
                    </div>
                    <div className="mt-5 grid gap-5 md:grid-cols-[1fr_180px]">
                      <Field
                        label="对齐已有悬浮按钮（可选）"
                        name="launcherAnchorSelector"
                        defaultValue={launcherAnchorSelector}
                        placeholder=".lopuo-scroll-top"
                      />
                      <Field
                        label="叠放间距（px）"
                        name="launcherAnchorGap"
                        type="number"
                        min={0}
                        max={MAX_LAUNCHER_ANCHOR_GAP}
                        step={1}
                        defaultValue={String(launcherAnchorGap)}
                        placeholder="8"
                      />
                    </div>
                    <p className="mt-3 text-xs font-semibold leading-5 text-[#777e89] dark:text-white/45">
                      例如 lopuo.com 可填 <code className="rounded bg-[#f5f5f6] px-1.5 py-0.5 dark:bg-white/10">.lopuo-scroll-top</code>，入口会跟随返回顶部按钮的右侧边距并叠在它上方；找不到该元素时使用上方基础位置。
                    </p>
                  </div>
                  <div className="border-t border-black/[0.06] pt-5 dark:border-white/10">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-[#1f2024] dark:text-white">高级模式</h3>
                        <p className="mt-1 text-sm font-semibold text-[#777e89] dark:text-white/55">
                          使用受控 CSS 声明和 JS Hook 扩展特殊页面场景。
                        </p>
                      </div>
                      <Checkbox label="启用高级模式" name="widgetAdvancedEnabled" defaultChecked={site.widgetAdvancedEnabled} />
                    </div>
                    <div className="grid gap-5 lg:grid-cols-2">
                      <TextArea
                        label="Advanced Custom CSS"
                        name="widgetCustomCss"
                        defaultValue={site.widgetCustomCss || ""}
                        rows={7}
                        maxLength={MAX_WIDGET_CUSTOM_CODE_LENGTH}
                        placeholder={":root {\n  --lopuo-widget-scale: 1;\n}\n.lopuo-widget-launcher {\n  border-radius: 999px;\n}"}
                      />
                      <TextArea
                        label="Advanced Custom JS"
                        name="widgetCustomJs"
                        defaultValue={site.widgetCustomJs || ""}
                        rows={7}
                        maxLength={MAX_WIDGET_CUSTOM_CODE_LENGTH}
                        placeholder={"onReady: data=lopuo-ready\nonOpen: track=widget_open\nonClose: class=widget-closed"}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <PreviewLink href={`/demo?style=pill&text=获取方案&position=${launcherPosition}&horizontalOffset=${launcherHorizontalOffset}&bottomOffset=${launcherBottomOffset}${previewAnchorQuery}`}>胶囊入口预览</PreviewLink>
                    <PreviewLink href={`/demo?style=vertical&position=${launcherPosition}&horizontalOffset=${launcherHorizontalOffset}&bottomOffset=${launcherBottomOffset}${previewAnchorQuery}`}>竖向入口预览</PreviewLink>
                    <PreviewLink href={`/demo?style=mascot&position=${launcherPosition}&horizontalOffset=${launcherHorizontalOffset}&bottomOffset=${launcherBottomOffset}${previewAnchorQuery}`}>吉祥物入口预览</PreviewLink>
                    <PreviewLink href={`/demo?style=${site.launcherStyle || "vertical"}&position=bottom-left&horizontalOffset=${launcherHorizontalOffset}&bottomOffset=${launcherBottomOffset}${previewAnchorQuery}`}>左下位置预览</PreviewLink>
                    <PreviewLink href={`/demo?style=${site.launcherStyle || "vertical"}&position=bottom-right&horizontalOffset=${launcherHorizontalOffset}&bottomOffset=${launcherBottomOffset}${previewAnchorQuery}`}>右下位置预览</PreviewLink>
                  </div>
                </SettingsSection>
                <SaveBar />
              </form>
            ) : null}

            {activeTab === "script" ? (
              <form action={updateSettingsAction} className="space-y-6">
                <input type="hidden" name="settingsSection" value="script" />
                <SettingsSection accent="#9bdcff" title="脚本嵌入" description="复制脚本到官网底部，发布前确认允许嵌入域名包含正式域名。">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#777e89] dark:text-white/60">嵌入代码</div>
                    <pre className="mt-2 max-w-full overflow-x-auto rounded-[18px] border border-[#9bdcff]/45 bg-[#f6fbff] p-4 text-sm font-semibold leading-6 text-[#1f2024] dark:border-[#9bdcff]/20 dark:bg-white/8 dark:text-white/80">
                      <code>{embedCode}</code>
                    </pre>
                    <p className="mt-3 text-sm font-semibold leading-6 text-[#777e89] dark:text-white/55">
                      建议放在官网全站模板的 <code className="rounded bg-[#fff1e8] px-1 dark:bg-white/10">{"</body>"}</code> 前，脚本会按配置创建客服入口。
                    </p>
                  </div>
                  <TextArea label="允许嵌入域名，每行一个" name="allowedOrigins" defaultValue={allowedOrigins} rows={4} />
                </SettingsSection>
                <SaveBar />
              </form>
            ) : null}

            {activeTab === "multilingual" ? (
              <form action={updateSettingsAction} className="space-y-6">
                <input type="hidden" name="settingsSection" value="multilingual" />
                <SettingsSection accent="#7dd3fc" title="多语言" description="开启后，弹窗会优先使用脚本指定语言，其次自动识别访客设备语言，未匹配时使用默认语言。">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Checkbox label="启用多语言自动适配" name="multilingualEnabled" defaultChecked={site.multilingualEnabled} />
                    <Select
                      label="默认语言"
                      name="defaultLocale"
                      defaultValue={defaultLocale}
                      options={SUPPORTED_WIDGET_LOCALES.map((locale) => [locale, WIDGET_LOCALE_LABELS[locale]] as [string, string])}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#777e89] dark:text-white/60">启用语言</div>
                    <div className="mt-2 grid gap-3 md:grid-cols-3">
                      {SUPPORTED_WIDGET_LOCALES.map((locale) => (
                        <Checkbox
                          key={locale}
                          label={WIDGET_LOCALE_LABELS[locale]}
                          name="enabledLocales"
                          value={locale}
                          defaultChecked={enabledLocales.includes(locale)}
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-6 text-[#777e89] dark:text-white/55">
                      默认语言会自动加入启用语言。脚本也可以加 <code className="rounded bg-[#fff1e8] px-1 dark:bg-white/10">data-locale=&quot;en&quot;</code> 指定语言。
                    </p>
                  </div>
                </SettingsSection>
                <SaveBar />
              </form>
            ) : null}
          </div>

          <PreviewAside
            launcherStyle={site.launcherStyle || "vertical"}
            launcherPosition={launcherPosition}
            launcherHorizontalOffset={launcherHorizontalOffset}
            launcherBottomOffset={launcherBottomOffset}
            launcherAnchorSelector={launcherAnchorSelector}
            launcherAnchorGap={launcherAnchorGap}
          />
        </div>
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

function PreviewAside({
  launcherStyle,
  launcherPosition,
  launcherHorizontalOffset,
  launcherBottomOffset,
  launcherAnchorSelector,
  launcherAnchorGap,
}: {
  launcherStyle: string;
  launcherPosition: string;
  launcherHorizontalOffset: number;
  launcherBottomOffset: number;
  launcherAnchorSelector: string;
  launcherAnchorGap: number;
}) {
  const currentStyle = ["pill", "vertical", "mascot"].includes(launcherStyle) ? launcherStyle : "vertical";
  const currentPosition = normalizeLauncherPosition(launcherPosition);
  const currentHorizontalOffset = normalizeLauncherHorizontalOffset(launcherHorizontalOffset);
  const currentBottomOffset = normalizeLauncherBottomOffset(launcherBottomOffset);
  const currentAnchorSelector = normalizeLauncherAnchorSelector(launcherAnchorSelector);
  const currentAnchorGap = normalizeLauncherAnchorGap(launcherAnchorGap);
  const anchorQuery = currentAnchorSelector
    ? `&anchorSelector=${encodeURIComponent(currentAnchorSelector)}&anchorGap=${currentAnchorGap}`
    : "";

  return (
    <aside className="xl:sticky xl:top-28 xl:self-start">
      <div className="rounded-[24px] border border-black/[0.06] bg-white p-4 shadow-[0_18px_42px_rgba(31,32,36,0.06)] dark:border-white/10 dark:bg-[#171a20] dark:shadow-none">
        <div className="flex items-center gap-3">
          <span className="h-9 w-1.5 rounded-full bg-[#9bdcff]" />
          <div>
            <div className="text-base font-bold text-[#1f2024] dark:text-white">效果预览</div>
            <div className="mt-0.5 text-xs font-semibold text-[#777e89]">新窗口查看当前样式</div>
          </div>
        </div>
        <a
          href={`/demo?style=${currentStyle}&position=${currentPosition}&horizontalOffset=${currentHorizontalOffset}&bottomOffset=${currentBottomOffset}${anchorQuery}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex w-full items-center justify-center rounded-[16px] bg-[#2f7df6] px-4 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(47,125,246,0.2)] transition hover:-translate-y-0.5 hover:bg-[#1d6ef0]"
        >
          打开当前预览
        </a>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MiniPreviewLink href={`/demo?style=pill&text=获取方案&position=${currentPosition}&horizontalOffset=${currentHorizontalOffset}&bottomOffset=${currentBottomOffset}`}>胶囊</MiniPreviewLink>
          <MiniPreviewLink href={`/demo?style=vertical&position=${currentPosition}&horizontalOffset=${currentHorizontalOffset}&bottomOffset=${currentBottomOffset}`}>竖向</MiniPreviewLink>
          <MiniPreviewLink href={`/demo?style=mascot&position=${currentPosition}&horizontalOffset=${currentHorizontalOffset}&bottomOffset=${currentBottomOffset}`}>头像</MiniPreviewLink>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniPreviewLink href={`/demo?style=${currentStyle}&position=bottom-right&horizontalOffset=${currentHorizontalOffset}&bottomOffset=${currentBottomOffset}`}>右下</MiniPreviewLink>
          <MiniPreviewLink href={`/demo?style=${currentStyle}&position=bottom-left&horizontalOffset=${currentHorizontalOffset}&bottomOffset=${currentBottomOffset}`}>左下</MiniPreviewLink>
        </div>
      </div>
    </aside>
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
  type = "text",
  min,
  max,
  step,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  type?: "text" | "number" | "url";
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#777e89] dark:text-white/60">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="mt-2 w-full rounded-[18px] border border-black/[0.06] bg-[#f5f5f6] px-4 py-3 text-sm font-semibold text-[#1f2024] outline-none transition placeholder:text-[#a8adb6] focus:border-[#2f7df6]/40 focus:bg-white focus:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder:text-white/30 dark:focus:border-[#2f7df6]/60 dark:focus:bg-white/12"
      />
    </label>
  );
}

function Checkbox({
  label,
  name,
  defaultChecked,
  value,
}: {
  label: string;
  name: string;
  defaultChecked: boolean;
  value?: string;
}) {
  return (
    <label className="flex items-center gap-3 rounded-[18px] bg-[#f6f6f7] px-4 py-3 text-sm font-bold text-[#5d646f] dark:bg-white/8 dark:text-white/65">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="h-4 w-4 accent-[#2f7df6]" />
      {label}
    </label>
  );
}

function PreviewLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-[16px] bg-[#f6f6f7] px-4 py-2 text-sm font-bold text-[#5d646f] transition hover:-translate-y-0.5 hover:bg-white hover:text-[#2f7df6] hover:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:bg-white/8 dark:text-white/65 dark:hover:bg-white/12 dark:hover:text-white"
    >
      {children}
    </a>
  );
}

function MiniPreviewLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-[12px] bg-[#f6f6f7] px-2 py-2 text-center text-xs font-bold text-[#777e89] transition hover:bg-white hover:text-[#2f7df6] dark:bg-white/8 dark:text-white/55 dark:hover:bg-white/12 dark:hover:text-white"
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
  maxLength,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows: number;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#777e89] dark:text-white/60">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[18px] border border-black/[0.06] bg-[#f5f5f6] px-4 py-3 text-sm font-semibold leading-6 text-[#1f2024] outline-none transition focus:border-[#2f7df6]/40 focus:bg-white focus:shadow-[0_12px_28px_rgba(47,125,246,0.12)] dark:border-white/10 dark:bg-white/8 dark:text-white dark:focus:border-[#2f7df6]/60 dark:focus:bg-white/12"
      />
    </label>
  );
}

function normalizeTab(value?: string): SettingsTab {
  return tabs.some((tab) => tab.id === value) ? (value as SettingsTab) : "content";
}
