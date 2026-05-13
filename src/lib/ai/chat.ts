import {
  AI_TONE_PRESETS,
  BASE_SYSTEM_PROMPT,
  DEFAULT_AI_TONE,
  DEFAULT_BUSINESS_FLOW,
  DEFAULT_TONE_KEYWORDS,
} from "@/lib/defaults";

const DEFAULT_CHAT_MODEL = "mimo-v2.5";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatChoice = {
  delta?: {
    content?: string;
  };
  message?: {
    content?: string;
  };
};

type ChatResponse = {
  choices?: ChatChoice[];
};

export function getChatModel(siteModel?: string | null) {
  return siteModel || process.env.LLM_MODEL || process.env.DEEPSEEK_MODEL || DEFAULT_CHAT_MODEL;
}

export async function generateChatAnswer({
  messages,
  model,
  onToken,
}: {
  messages: ChatMessage[];
  model?: string | null;
  onToken?: (token: string) => void | Promise<void>;
}) {
  const apiKey = process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY;
  const selectedModel = getChatModel(model);

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production" && process.env.ALLOW_FAKE_LLM !== "false") {
      const answer = fakeAnswer(messages);
      if (onToken) {
        await streamFakeAnswer(answer, onToken);
      }
      return answer;
    }

    throw new Error("LLM_API_KEY is required.");
  }

  const baseUrl = getChatBaseUrl();
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
      stream: Boolean(onToken),
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat provider request failed: ${response.status} ${await response.text()}`);
  }

  if (onToken) {
    return streamChatCompletion(response, onToken);
  }

  const payload = (await response.json()) as ChatResponse;
  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Chat provider returned an empty answer.");
  }

  return content;
}

export function buildSystemPrompt({
  customerName,
  customPrompt,
  aiTone,
  toneKeywords,
  businessFlow,
}: {
  customerName: string;
  customPrompt?: string | null;
  aiTone?: string | null;
  toneKeywords?: string[] | null;
  businessFlow?: string | null;
}) {
  const toneKey = aiTone || DEFAULT_AI_TONE;
  const toneDescription = AI_TONE_PRESETS[toneKey] || AI_TONE_PRESETS[DEFAULT_AI_TONE];
  const keywords = toneKeywords?.length ? toneKeywords : DEFAULT_TONE_KEYWORDS;

  return [
    BASE_SYSTEM_PROMPT,
    `当前服务客户：${customerName}`,
    toneDescription ? `语气配置：${toneDescription}` : null,
    keywords.length ? `语气内置词：${keywords.join("、")}` : null,
    `业务流程说明：\n${businessFlow?.trim() || DEFAULT_BUSINESS_FLOW}`,
    customPrompt ? `客户补充规则：${customPrompt}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function getChatBaseUrl() {
  if (process.env.LLM_API_BASE_URL) {
    return process.env.LLM_API_BASE_URL;
  }

  if (process.env.DEEPSEEK_API_KEY) {
    return process.env.DEEPSEEK_API_BASE_URL || "https://api.deepseek.com/v1";
  }

  throw new Error("LLM_API_BASE_URL is required.");
}

function fakeAnswer(messages: ChatMessage[]) {
  const userQuestion = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const context = messages.find((message) => message.role === "system")?.content ?? "";
  const sourceHint = context.includes("知识库片段")
    ? "我已根据当前知识库资料整理了答复。"
    : "当前没有可用知识库资料。";

  return `${sourceHint}\n\n关于「${userQuestion.slice(0, 80)}」，建议先基于官网资料确认核心信息；如果您希望获得更具体的方案或报价，可以留下联系方式，我们会安排同事继续沟通。`;
}

async function streamChatCompletion(
  response: Response,
  onToken: (token: string) => void | Promise<void>,
) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as ChatResponse;
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Chat provider returned an empty answer.");
    }
    await onToken(content);
    return content;
  }

  if (!response.body) {
    throw new Error("Chat provider did not return a readable stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const token = parseStreamLine(line);
      if (!token) continue;
      content += token;
      await onToken(token);
    }
  }

  const finalToken = parseStreamLine(buffer);
  if (finalToken) {
    content += finalToken;
    await onToken(finalToken);
  }

  const normalized = content.trim();
  if (!normalized) {
    throw new Error("Chat provider returned an empty streamed answer.");
  }

  return normalized;
}

function parseStreamLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(":")) return "";

  const data = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
  if (!data || data === "[DONE]") return "";

  try {
    const payload = JSON.parse(data) as ChatResponse;
    return payload.choices?.[0]?.delta?.content || payload.choices?.[0]?.message?.content || "";
  } catch {
    return "";
  }
}

async function streamFakeAnswer(
  answer: string,
  onToken: (token: string) => void | Promise<void>,
) {
  const chunks = chunkText(answer, 18);
  for (const chunk of chunks) {
    await onToken(chunk);
  }
}

function chunkText(text: string, size: number) {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }
  return chunks.length ? chunks : [text];
}
