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

export function buildRefusalMessage() {
  return "抱歉，这类内容我不能提供。我可以继续帮您了解公司、产品、解决方案或合作方式。";
}

export function buildLowConfidenceMessage() {
  return "这个问题我暂时没有在当前资料里找到准确答案。为了避免误导您，建议由同事进一步确认。您可以留下联系方式和大致需求，我们会尽快跟进。";
}

export function buildSensitiveBusinessMessage() {
  return "这个问题涉及报价、合同或交付承诺，需要同事结合您的具体需求进一步确认。我可以先帮您记录联系方式和需求，稍后安排同事联系您。";
}
