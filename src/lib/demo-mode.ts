import { DEFAULT_SUGGESTED_QUESTIONS, DEFAULT_WELCOME_MESSAGE } from "@/lib/defaults";
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
    widgetName: "AI 助理",
    launcherText: previewText || (launcherStyle === "pill" ? "与 AI 聊天" : "AI 助理"),
    launcherStyle,
    launcherImageUrl: "",
    launcherBadgeText: "1",
    launcherAnimation: "pulse",
    welcomeMessage: DEFAULT_WELCOME_MESSAGE,
    themeColor: "#ff0a68",
    suggestedQuestions: DEFAULT_SUGGESTED_QUESTIONS,
    showSources: true,
    collectLeadEnabled: true,
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
    "这是开发演示模式下的模拟回复。",
    "",
    `关于「${message.slice(0, 80)}」，AI 助理会先基于客户官网知识库整理答案；如果问题涉及报价、合同或交付承诺，会引导留下联系方式由同事跟进。`,
    "",
    "配置数据库、知识库和模型 Key 后，这里会切换为真实 RAG + 大模型回复。",
  ].join("\n");
}
