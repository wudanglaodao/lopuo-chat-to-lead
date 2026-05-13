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
}: {
  siteId?: string;
  previewStyle?: string | null;
  previewText?: string | null;
} = {}) {
  const launcherStyle = ["pill", "vertical", "mascot"].includes(previewStyle || "")
    ? (previewStyle as "pill" | "vertical" | "mascot")
    : "pill";

  return {
    siteId,
    tenantId: DEMO_TENANT_ID,
    customerId: DEMO_CUSTOMER_ID,
    widgetName: "AI 营销助手",
    launcherText: previewText || (launcherStyle === "pill" ? "获取方案" : "咨询方案"),
    launcherStyle,
    launcherImageUrl: "",
    launcherBadgeText: "1",
    launcherAnimation: "pulse",
    welcomeTitle: DEFAULT_WELCOME_TITLE,
    welcomeMessage: DEFAULT_WELCOME_MESSAGE,
    themeColor: "#ff0a68",
    suggestedQuestions: DEFAULT_SUGGESTED_QUESTIONS,
    showSources: true,
    collectLeadEnabled: true,
    aiTone: DEFAULT_AI_TONE,
    toneKeywords: DEFAULT_TONE_KEYWORDS,
    businessFlow: DEFAULT_BUSINESS_FLOW,
  };
}

export function getDemoConversationId() {
  return "demo-conversation";
}

export function buildDemoAssistantMessage(message: string) {
  if (isSensitiveBusinessQuestion(message)) {
    return buildSensitiveBusinessMessage();
  }

  if (/不知道|不存在|没有|随便问/i.test(message)) {
    return buildLowConfidenceMessage();
  }

  return [
    "这是 Lopuo Signal 演示模式下的模拟回复。",
    "",
    `关于「${message.slice(0, 80)}」，AI 营销助手会先基于客户知识库整理答案；如果问题涉及报价、合作细节或交付承诺，会自然引导访客留下联系方式，由销售继续跟进。`,
    "",
    "配置数据库、素材库和模型 Key 后，这里会切换为真实检索 + 大模型回复。",
  ].join("\n");
}
