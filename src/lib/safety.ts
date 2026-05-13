import type { SupportedWidgetLocale } from "@/lib/widget-i18n";

const SENSITIVE_BUSINESS_TERMS = [
  "报价",
  "价格",
  "多少钱",
  "合同",
  "发票",
  "赔付",
  "退款",
  "交付周期",
  "上线时间",
  "保证",
  "承诺",
  "法律责任",
  "违约",
];

const PROMPT_INJECTION_PATTERNS = [
  /忽略(之前|以上|所有).*(规则|指令|提示)/i,
  /输出.*(系统提示词|system prompt|prompt)/i,
  /(api key|密钥|后台|数据库|内部日志)/i,
  /(其他客户|别的客户|另一个客户).*(数据|资料|知识库)/i,
  /pretend to be|ignore previous|developer message|system message/i,
];

export function isSensitiveBusinessQuestion(input: string) {
  return SENSITIVE_BUSINESS_TERMS.some((term) => input.includes(term));
}

export function isPromptInjectionAttempt(input: string) {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

export function shouldUseLowConfidenceFallback(bestScore: number | null) {
  return bestScore === null || bestScore < 0.72;
}

export function buildRefusalMessage(locale: SupportedWidgetLocale = "zh-CN") {
  if (locale === "en") {
    return "Sorry, I cannot provide that kind of information. I can still help with the company, products, solutions, or partnership details.";
  }
  if (locale === "zh-TW") {
    return "抱歉，這類內容我不能提供。我可以繼續協助您了解公司、產品、解決方案或合作方式。";
  }
  return "抱歉，这类内容我不能提供。我可以继续帮您了解公司、产品、解决方案或合作方式。";
}

export function buildLowConfidenceMessage(locale: SupportedWidgetLocale = "zh-CN") {
  if (locale === "en") {
    return "I could not find an accurate answer in the current materials. To avoid misleading you, it is best for a colleague to confirm. You can leave your contact details and a brief note, and we will follow up soon.";
  }
  if (locale === "zh-TW") {
    return "這個問題我暫時沒有在目前資料裡找到準確答案。為了避免誤導您，建議由同事進一步確認。您可以留下聯絡方式和大致需求，我們會盡快跟進。";
  }
  return "这个问题我暂时没有在当前资料里找到准确答案。为了避免误导您，建议由同事进一步确认。您可以留下联系方式和大致需求，我们会尽快跟进。";
}

export function buildSensitiveBusinessMessage(locale: SupportedWidgetLocale = "zh-CN") {
  if (locale === "en") {
    return "This involves pricing, contracts, or delivery commitments, so a colleague needs to confirm it based on your specific needs. I can record your contact details and requirements first, then arrange a follow-up.";
  }
  if (locale === "zh-TW") {
    return "這個問題涉及報價、合約或交付承諾，需要同事結合您的具體需求進一步確認。我可以先幫您記錄聯絡方式和需求，稍後安排同事聯絡您。";
  }
  return "这个问题涉及报价、合同或交付承诺，需要同事结合您的具体需求进一步确认。我可以先帮您记录联系方式和需求，稍后安排同事联系您。";
}
