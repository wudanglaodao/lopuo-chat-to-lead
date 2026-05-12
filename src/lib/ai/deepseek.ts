import { BASE_SYSTEM_PROMPT } from "@/lib/defaults";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DeepSeekChoice = {
  message?: {
    content?: string;
  };
};

type DeepSeekResponse = {
  choices?: DeepSeekChoice[];
};

export function getDeepSeekModel(siteModel?: string | null) {
  return siteModel || process.env.DEEPSEEK_MODEL || "deepseek-chat";
}

export async function generateDeepSeekAnswer({
  messages,
  model,
}: {
  messages: ChatMessage[];
  model?: string | null;
}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const selectedModel = getDeepSeekModel(model);

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production" && process.env.ALLOW_FAKE_LLM !== "false") {
      return fakeAnswer(messages);
    }

    throw new Error("DEEPSEEK_API_KEY is required.");
  }

  const baseUrl = process.env.DEEPSEEK_API_BASE_URL || "https://api.deepseek.com/v1";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: selectedModel,
      messages,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as DeepSeekResponse;
  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("DeepSeek returned an empty answer.");
  }

  return content;
}

export function buildSystemPrompt({
  customerName,
  customPrompt,
}: {
  customerName: string;
  customPrompt?: string | null;
}) {
  return [
    BASE_SYSTEM_PROMPT,
    `当前服务客户：${customerName}`,
    customPrompt ? `客户补充规则：${customPrompt}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function fakeAnswer(messages: ChatMessage[]) {
  const userQuestion = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const context = messages.find((message) => message.role === "system")?.content ?? "";
  const sourceHint = context.includes("知识库片段")
    ? "我已根据当前知识库资料整理了答复。"
    : "当前没有可用知识库资料。";

  return `${sourceHint}\n\n关于「${userQuestion.slice(0, 80)}」，建议先基于官网资料确认核心信息；如果您希望获得更具体的方案或报价，可以留下联系方式，我们会安排同事继续沟通。`;
}
