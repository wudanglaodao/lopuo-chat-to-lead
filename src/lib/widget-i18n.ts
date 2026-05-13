import {
  DEFAULT_SUGGESTED_QUESTIONS,
  DEFAULT_WELCOME_MESSAGE,
  DEFAULT_WELCOME_TITLE,
} from "@/lib/defaults";

export const SUPPORTED_WIDGET_LOCALES = ["zh-CN", "zh-TW", "en"] as const;

export type SupportedWidgetLocale = (typeof SUPPORTED_WIDGET_LOCALES)[number];

export type WidgetLocaleCopy = {
  widgetName: string;
  launcherText: string;
  welcomeTitle: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
};

export type WidgetI18nMap = Partial<Record<SupportedWidgetLocale, Partial<WidgetLocaleCopy>>>;

export const WIDGET_LOCALE_LABELS: Record<SupportedWidgetLocale, string> = {
  "zh-CN": "中文",
  "zh-TW": "繁體中文",
  en: "English",
};

export const DEFAULT_WIDGET_LOCALE: SupportedWidgetLocale = "zh-CN";

export const DEFAULT_WIDGET_COPY_BY_LOCALE: Record<SupportedWidgetLocale, WidgetLocaleCopy> = {
  "zh-CN": {
    widgetName: "AI 营销助手",
    launcherText: "咨询方案",
    welcomeTitle: DEFAULT_WELCOME_TITLE,
    welcomeMessage: DEFAULT_WELCOME_MESSAGE,
    suggestedQuestions: DEFAULT_SUGGESTED_QUESTIONS,
  },
  "zh-TW": {
    widgetName: "AI 行銷助手",
    launcherText: "諮詢方案",
    welcomeTitle: "您好，我是 AI 行銷助手",
    welcomeMessage: "您可以直接詢問公司、產品、解決方案或合作方式，我會盡量根據官網內容為您解答。",
    suggestedQuestions: [
      "我想了解適合我的方案",
      "你們有哪些案例可以參考？",
      "大概怎麼收費？",
      "可以安排顧問聯絡我嗎？",
      "我想留下需求和聯絡方式",
    ],
  },
  en: {
    widgetName: "AI Sales Assistant",
    launcherText: "Chat with us",
    welcomeTitle: "Hi, I am your AI assistant",
    welcomeMessage:
      "Ask me about the company, products, solutions, or partnership details. I will answer based on the website content.",
    suggestedQuestions: [
      "Which solution fits my needs?",
      "Do you have cases I can review?",
      "How is pricing usually structured?",
      "Can a consultant contact me?",
      "I want to share my requirements",
    ],
  },
};

export const WIDGET_UI_TEXT: Record<
  SupportedWidgetLocale,
  {
    banner: string;
    close: string;
    leadPrompt: string;
    missingSiteId: string;
    configLoadFailed: string;
    createConversationFailed: string;
    answerFailed: string;
    sendFailed: string;
    thinking: string;
    thinkingSuffix: string;
    composing: string;
    inputPlaceholder: string;
    sendMessage: string;
    source: string;
    onlineConsult: string;
  }
> = {
  "zh-CN": {
    banner: "可以直接提问，也可以留下联系方式",
    close: "关闭",
    leadPrompt: "如果您希望顾问进一步沟通，也可以把联系方式和大致需求发给我。\n不方便也没关系，我们可以先继续聊。",
    missingSiteId: "缺少 siteId，请检查嵌入代码。",
    configLoadFailed: "配置加载失败",
    createConversationFailed: "会话创建失败",
    answerFailed: "AI 回复失败，请稍后再试。",
    sendFailed: "发送失败",
    thinking: "正在理解问题",
    thinkingSuffix: "...",
    composing: "正在整理回答...",
    inputPlaceholder: "说说你想了解的问题...",
    sendMessage: "发送消息",
    source: "来源",
    onlineConsult: "在线咨询",
  },
  "zh-TW": {
    banner: "可以直接提問，也可以留下聯絡方式",
    close: "關閉",
    leadPrompt: "如果您希望顧問進一步溝通，也可以把聯絡方式和大致需求發給我。\n不方便也沒關係，我們可以先繼續聊。",
    missingSiteId: "缺少 siteId，請檢查嵌入程式碼。",
    configLoadFailed: "設定載入失敗",
    createConversationFailed: "對話建立失敗",
    answerFailed: "AI 回覆失敗，請稍後再試。",
    sendFailed: "傳送失敗",
    thinking: "正在理解問題",
    thinkingSuffix: "...",
    composing: "正在整理回覆...",
    inputPlaceholder: "說說你想了解的問題...",
    sendMessage: "傳送訊息",
    source: "來源",
    onlineConsult: "線上諮詢",
  },
  en: {
    banner: "Ask a question or leave your contact details",
    close: "Close",
    leadPrompt: "If you would like a consultant to follow up, send me your contact details and a brief note about what you need.\nNo pressure. We can keep chatting first.",
    missingSiteId: "Missing siteId. Please check the embed code.",
    configLoadFailed: "Failed to load configuration",
    createConversationFailed: "Failed to start the conversation",
    answerFailed: "The AI reply failed. Please try again later.",
    sendFailed: "Failed to send",
    thinking: "Understanding your question",
    thinkingSuffix: "...",
    composing: "Preparing the reply...",
    inputPlaceholder: "Tell me what you would like to know...",
    sendMessage: "Send message",
    source: "Source",
    onlineConsult: "Online chat",
  },
};

export function normalizeWidgetLocale(value?: string | null): SupportedWidgetLocale | null {
  if (!value) return null;

  const normalized = value.trim().replace("_", "-").toLowerCase();
  if (!normalized) return null;

  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (
    normalized === "zh-tw" ||
    normalized === "zh-hk" ||
    normalized === "zh-mo" ||
    normalized.includes("hant")
  ) {
    return "zh-TW";
  }
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-sg" || normalized.includes("hans")) {
    return "zh-CN";
  }

  return null;
}

export function normalizeEnabledLocales(
  locales: Array<string | null | undefined>,
  defaultLocale: SupportedWidgetLocale,
) {
  const normalized = locales
    .map((locale) => normalizeWidgetLocale(locale))
    .filter((locale): locale is SupportedWidgetLocale => Boolean(locale));
  const deduped = Array.from(new Set([defaultLocale, ...normalized]));
  return deduped.filter((locale) => SUPPORTED_WIDGET_LOCALES.includes(locale));
}

export function resolveWidgetLocale({
  requestedLocale,
  browserLocales,
  multilingualEnabled,
  defaultLocale,
  enabledLocales,
}: {
  requestedLocale?: string | null;
  browserLocales?: Array<string | null | undefined>;
  multilingualEnabled?: boolean | null;
  defaultLocale?: string | null;
  enabledLocales?: string[] | null;
}) {
  const fallback = normalizeWidgetLocale(defaultLocale) || DEFAULT_WIDGET_LOCALE;
  if (!multilingualEnabled) return fallback;

  const enabled = normalizeEnabledLocales(enabledLocales?.length ? enabledLocales : [fallback], fallback);
  const candidates = [requestedLocale, ...(browserLocales || [])]
    .map((locale) => normalizeWidgetLocale(locale))
    .filter((locale): locale is SupportedWidgetLocale => Boolean(locale));

  return candidates.find((locale) => enabled.includes(locale)) || fallback;
}

export function buildBaseWidgetCopy(copy: Partial<WidgetLocaleCopy>): WidgetLocaleCopy {
  return {
    widgetName: normalizeText(copy.widgetName) || "AI 营销助手",
    launcherText: normalizeText(copy.launcherText) || "咨询方案",
    welcomeTitle: normalizeText(copy.welcomeTitle) || "您好，我是 AI 营销助手",
    welcomeMessage: normalizeText(copy.welcomeMessage) || "您好，请告诉我您想了解的问题。",
    suggestedQuestions: normalizeQuestions(copy.suggestedQuestions),
  };
}

export function normalizeWidgetI18nMap(value: unknown, baseCopy: WidgetLocaleCopy): WidgetI18nMap {
  if (!value || typeof value !== "object") {
    return { [DEFAULT_WIDGET_LOCALE]: baseCopy };
  }

  const record = value as Record<string, unknown>;
  const next: WidgetI18nMap = {};

  for (const rawLocale of Object.keys(record)) {
    const locale = normalizeWidgetLocale(rawLocale);
    if (!locale) continue;

    const rawCopy = record[rawLocale];
    if (!rawCopy || typeof rawCopy !== "object") continue;

    const copy = rawCopy as Partial<WidgetLocaleCopy>;
    next[locale] = {
      widgetName: normalizeText(copy.widgetName),
      launcherText: normalizeText(copy.launcherText),
      welcomeTitle: normalizeText(copy.welcomeTitle),
      welcomeMessage: normalizeText(copy.welcomeMessage),
      suggestedQuestions: normalizeQuestions(copy.suggestedQuestions),
    };
  }

  next[DEFAULT_WIDGET_LOCALE] = {
    ...baseCopy,
    ...(next[DEFAULT_WIDGET_LOCALE] || {}),
  };

  return next;
}

export function getWidgetCopyForLocale({
  baseCopy,
  widgetI18n,
  locale,
  defaultLocale,
}: {
  baseCopy: WidgetLocaleCopy;
  widgetI18n?: WidgetI18nMap | null;
  locale: SupportedWidgetLocale;
  defaultLocale?: string | null;
}): WidgetLocaleCopy {
  const fallbackLocale = normalizeWidgetLocale(defaultLocale) || DEFAULT_WIDGET_LOCALE;
  const fallbackCopy = mergeWidgetCopy(baseCopy, widgetI18n?.[fallbackLocale]);
  return mergeWidgetCopy(fallbackCopy, widgetI18n?.[locale]);
}

export function localizeDefaultWidgetCopy({
  copy,
  locale,
}: {
  copy: WidgetLocaleCopy;
  locale: SupportedWidgetLocale;
}): WidgetLocaleCopy {
  if (locale === DEFAULT_WIDGET_LOCALE) {
    return copy;
  }

  const localized = DEFAULT_WIDGET_COPY_BY_LOCALE[locale];
  return {
    widgetName: shouldUseLocalizedValue(copy.widgetName, ["AI 营销助手", "AI 助理"])
      ? localized.widgetName
      : copy.widgetName,
    launcherText: shouldUseLocalizedValue(copy.launcherText, ["咨询方案", "获取方案"])
      ? localized.launcherText
      : copy.launcherText,
    welcomeTitle: shouldUseLocalizedValue(copy.welcomeTitle, [DEFAULT_WELCOME_TITLE])
      ? localized.welcomeTitle
      : copy.welcomeTitle,
    welcomeMessage: shouldUseLocalizedValue(copy.welcomeMessage, [DEFAULT_WELCOME_MESSAGE])
      ? localized.welcomeMessage
      : copy.welcomeMessage,
    suggestedQuestions: areDefaultQuestions(copy.suggestedQuestions)
      ? localized.suggestedQuestions
      : copy.suggestedQuestions,
  };
}

function mergeWidgetCopy(baseCopy: WidgetLocaleCopy, override?: Partial<WidgetLocaleCopy> | null): WidgetLocaleCopy {
  return {
    widgetName: normalizeText(override?.widgetName) || baseCopy.widgetName,
    launcherText: normalizeText(override?.launcherText) || baseCopy.launcherText,
    welcomeTitle: normalizeText(override?.welcomeTitle) || baseCopy.welcomeTitle,
    welcomeMessage: normalizeText(override?.welcomeMessage) || baseCopy.welcomeMessage,
    suggestedQuestions: normalizeQuestions(override?.suggestedQuestions, baseCopy.suggestedQuestions),
  };
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeQuestions(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const questions = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);

  return questions.length ? questions : fallback;
}

function shouldUseLocalizedValue(value: string, defaults: string[]) {
  const normalized = value.trim();
  return defaults.some((item) => item.trim() === normalized);
}

function areDefaultQuestions(value: string[]) {
  if (value.length !== DEFAULT_SUGGESTED_QUESTIONS.length) {
    return false;
  }

  return value.every((question, index) => question.trim() === DEFAULT_SUGGESTED_QUESTIONS[index]);
}
