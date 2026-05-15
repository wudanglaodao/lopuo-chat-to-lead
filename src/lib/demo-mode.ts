import {
  DEFAULT_AI_TONE,
  DEFAULT_BUSINESS_FLOW,
  DEFAULT_SUGGESTED_QUESTIONS,
  DEFAULT_TONE_KEYWORDS,
  DEFAULT_WELCOME_MESSAGE,
  DEFAULT_WELCOME_TITLE,
} from "@/lib/defaults";
import {
  buildLowConfidenceMessage,
  buildSensitiveBusinessMessage,
  isSensitiveBusinessQuestion,
} from "@/lib/safety";
import { DEFAULT_WIDGET_LOGO_TEXT, DEFAULT_WIDGET_LOGO_TYPE, DEFAULT_WIDGET_LOGO_URL } from "@/lib/widget-brand";
import { normalizeWidgetLocale } from "@/lib/widget-i18n";
import {
  DEFAULT_LAUNCHER_ANCHOR_GAP,
  normalizeLauncherBottomOffset,
  normalizeLauncherAnchorGap,
  normalizeLauncherAnchorSelector,
  normalizeLauncherHorizontalOffset,
  normalizeLauncherPosition,
} from "@/lib/widget-launcher";

export const DEMO_SITE_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_CUSTOMER_ID = "00000000-0000-0000-0000-000000000001";
export const DEMO_TENANT_ID = "22222222-2222-4222-8222-222222222222";

export function isDemoMode() {
  return !process.env.DATABASE_URL && process.env.NODE_ENV !== "production";
}

export function getDemoWidgetConfig({
  siteId = DEMO_SITE_ID,
  previewStyle,
  previewText,
  previewPosition,
  previewBottomOffset,
  previewHorizontalOffset,
  previewAnchorSelector,
  previewAnchorGap,
}: {
  siteId?: string;
  previewStyle?: string | null;
  previewText?: string | null;
  previewPosition?: string | null;
  previewBottomOffset?: string | number | null;
  previewHorizontalOffset?: string | number | null;
  previewAnchorSelector?: string | null;
  previewAnchorGap?: string | number | null;
} = {}) {
  const launcherStyle = ["pill", "vertical", "mascot"].includes(previewStyle || "")
    ? (previewStyle as "pill" | "vertical" | "mascot")
    : "pill";

  return {
    siteId,
    tenantId: DEMO_TENANT_ID,
    customerId: DEMO_CUSTOMER_ID,
    widgetName: "AI 营销助手",
    widgetLogoType: DEFAULT_WIDGET_LOGO_TYPE,
    widgetLogoUrl: DEFAULT_WIDGET_LOGO_URL,
    widgetLogoText: DEFAULT_WIDGET_LOGO_TEXT,
    launcherText: previewText || (launcherStyle === "pill" ? "获取方案" : "咨询方案"),
    launcherStyle,
    launcherPosition: normalizeLauncherPosition(previewPosition),
    launcherBottomOffset: normalizeLauncherBottomOffset(previewBottomOffset),
    launcherHorizontalOffset: normalizeLauncherHorizontalOffset(previewHorizontalOffset),
    launcherAnchorSelector: normalizeLauncherAnchorSelector(previewAnchorSelector),
    launcherAnchorGap: normalizeLauncherAnchorGap(previewAnchorGap ?? DEFAULT_LAUNCHER_ANCHOR_GAP),
    launcherImageUrl: "",
    launcherBadgeText: "1",
    launcherAnimation: "pulse",
    widgetAdvancedEnabled: false,
    widgetCustomCss: "",
    widgetCustomJs: "",
    welcomeTitle: DEFAULT_WELCOME_TITLE,
    welcomeMessage: DEFAULT_WELCOME_MESSAGE,
    themeColor: "#ff0a68",
    suggestedQuestions: DEFAULT_SUGGESTED_QUESTIONS,
    showSources: true,
    collectLeadEnabled: true,
    multilingualEnabled: true,
    defaultLocale: "zh-CN",
    enabledLocales: ["zh-CN", "zh-TW", "en"],
    aiTone: DEFAULT_AI_TONE,
    toneKeywords: DEFAULT_TONE_KEYWORDS,
    businessFlow: DEFAULT_BUSINESS_FLOW,
  };
}

export function getDemoConversationId() {
  return "demo-conversation";
}

export function buildDemoAssistantMessage(message: string, locale = "zh-CN") {
  const normalizedLocale = normalizeWidgetLocale(locale) || "zh-CN";

  if (isSensitiveBusinessQuestion(message)) {
    return buildSensitiveBusinessMessage(normalizedLocale);
  }

  if (/不知道|不存在|没有|随便问/i.test(message)) {
    return buildLowConfidenceMessage(normalizedLocale);
  }

  if (normalizedLocale === "en") {
    return [
      "This is a simulated reply in Lopuo Signal demo mode.",
      "",
      `For "${message.slice(0, 80)}", the AI sales assistant would first organize an answer from the customer's knowledge base. For pricing, partnership details, or delivery commitments, it would naturally invite the visitor to leave contact details so sales can follow up.`,
      "",
      "After the database, content sources, and model key are configured, this will switch to real retrieval plus LLM replies.",
    ].join("\n");
  }

  if (normalizedLocale === "zh-TW") {
    return [
      "這是 Lopuo Signal 演示模式下的模擬回覆。",
      "",
      `關於「${message.slice(0, 80)}」，AI 行銷助手會先基於客戶知識庫整理答案；如果問題涉及報價、合作細節或交付承諾，會自然引導訪客留下聯絡方式，由銷售繼續跟進。`,
      "",
      "配置資料庫、素材庫和模型 Key 後，這裡會切換為真實檢索 + 大模型回覆。",
    ].join("\n");
  }

  return [
    "这是 Lopuo Signal 演示模式下的模拟回复。",
    "",
    `关于「${message.slice(0, 80)}」，AI 营销助手会先基于客户知识库整理答案；如果问题涉及报价、合作细节或交付承诺，会自然引导访客留下联系方式，由销售继续跟进。`,
    "",
    "配置数据库、素材库和模型 Key 后，这里会切换为真实检索 + 大模型回复。",
  ].join("\n");
}
