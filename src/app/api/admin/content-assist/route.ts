import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb, sites } from "@/db";
import { generateChatAnswer, type ChatMessage } from "@/lib/ai/chat";
import {
  AI_TONE_PRESETS,
  DEFAULT_AI_TONE,
  DEFAULT_BUSINESS_FLOW,
  DEFAULT_SUGGESTED_QUESTIONS,
  DEFAULT_TONE_KEYWORDS,
  DEFAULT_WELCOME_MESSAGE,
  DEFAULT_WELCOME_TITLE,
} from "@/lib/defaults";
import { getDemoWidgetConfig, isDemoMode } from "@/lib/demo-mode";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const assistRequestSchema = z.object({
  action: z.enum(["generate", "improve"]),
  target: z.enum(["all", "welcome", "questions"]),
  welcomeTitle: z.string().max(120).optional(),
  welcomeMessage: z.string().max(1000).optional(),
  suggestedQuestions: z.array(z.string().min(1).max(160)).max(8).optional(),
  aiTone: z.string().min(1).max(40).optional(),
  toneKeywords: z.array(z.string().min(1).max(40)).max(20).optional(),
  businessFlow: z.string().max(4000).optional().nullable(),
});

type AssistResult = {
  welcomeTitle: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
  suggestions: string[];
};

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  const parsed = assistRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid content assist request." }, { status: 400 });
  }

  const input = parsed.data;
  const currentSuggestedQuestions = input.suggestedQuestions?.length
    ? input.suggestedQuestions
    : DEFAULT_SUGGESTED_QUESTIONS;
  const fallback = buildFallbackResult({
    welcomeTitle: input.welcomeTitle,
    welcomeMessage: input.welcomeMessage,
    suggestedQuestions: currentSuggestedQuestions,
  });

  const site = await getSiteContext(session.siteId, session.customerId);
  if (!site) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  const aiTone = input.aiTone || site.aiTone || DEFAULT_AI_TONE;
  const toneKeywords = input.toneKeywords?.length ? input.toneKeywords : site.toneKeywords?.length ? site.toneKeywords : DEFAULT_TONE_KEYWORDS;
  const businessFlow = input.businessFlow?.trim() || site.businessFlow || DEFAULT_BUSINESS_FLOW;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        "你是 B2B 官网 AI 客服配置顾问，负责生成客服弹窗里的欢迎标题、欢迎正文和推荐问题。",
        "必须输出严格 JSON，不要输出 Markdown、代码块或额外解释。",
        "文案要友好、克制，不要一上来索要联系方式；只有用户有明确咨询/报价/合作意图时才适度引导。",
        "欢迎标题控制在 18 字以内；欢迎正文控制在 80 字以内；推荐问题 4 到 5 条，每条 24 字以内，适合放在窄小客服弹窗里。",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify({
        outputShape: {
          welcomeTitle: "string",
          welcomeMessage: "string",
          suggestedQuestions: ["string"],
          suggestions: ["string"],
        },
        action: input.action,
        target: input.target,
        siteName: site.name,
        customerName: site.customerName,
        domain: site.domain,
        tone: AI_TONE_PRESETS[aiTone] || AI_TONE_PRESETS[DEFAULT_AI_TONE],
        toneKeywords,
        businessFlow,
        currentWelcomeTitle: input.welcomeTitle || site.welcomeTitle || DEFAULT_WELCOME_TITLE,
        currentWelcomeMessage: input.welcomeMessage || site.welcomeMessage || DEFAULT_WELCOME_MESSAGE,
        currentSuggestedQuestions,
      }),
    },
  ];

  const answer = await generateChatAnswer({ messages, model: site.deepseekModel });
  const result = parseAssistResult(answer, fallback);

  return NextResponse.json(result);
}

async function getSiteContext(siteId: string, customerId: string) {
  if (isDemoMode()) {
    const demoConfig = getDemoWidgetConfig({ siteId });
    return {
      ...demoConfig,
      name: "演示站点",
      customerName: "演示客户",
      domain: "lopuo.work",
      deepseekModel: null,
    };
  }

  const [site] = await getDb().query.sites.findMany({
    where: and(eq(sites.id, siteId), eq(sites.customerId, customerId)),
    with: {
      customer: true,
    },
    limit: 1,
  });

  if (!site) {
    return null;
  }

  return {
    ...site,
    customerName: site.customer.name,
  };
}

function parseAssistResult(answer: string, fallback: AssistResult): AssistResult {
  const jsonText = extractJsonObject(answer);

  if (!jsonText) {
    return fallback;
  }

  try {
    const payload = JSON.parse(jsonText) as Partial<AssistResult>;
    const welcomeTitle = normalizeLine(payload.welcomeTitle) || fallback.welcomeTitle;
    const welcomeMessage = normalizeLine(payload.welcomeMessage) || fallback.welcomeMessage;
    const suggestedQuestions = Array.isArray(payload.suggestedQuestions)
      ? payload.suggestedQuestions.map(normalizeLine).filter(Boolean).slice(0, 5)
      : [];
    const suggestions = Array.isArray(payload.suggestions)
      ? payload.suggestions.map(normalizeLine).filter(Boolean).slice(0, 4)
      : fallback.suggestions;

    return {
      welcomeTitle,
      welcomeMessage,
      suggestedQuestions: suggestedQuestions.length ? suggestedQuestions : fallback.suggestedQuestions,
      suggestions: suggestions.length ? suggestions : fallback.suggestions,
    };
  } catch {
    return fallback;
  }
}

function extractJsonObject(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return value.slice(start, end + 1);
}

function normalizeLine(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .replace(/^[\s\-*•\d.、]+/, "")
    .trim();
}

function buildFallbackResult({
  welcomeTitle,
  welcomeMessage,
  suggestedQuestions,
}: {
  welcomeTitle?: string;
  welcomeMessage?: string;
  suggestedQuestions: string[];
}): AssistResult {
  return {
    welcomeTitle: welcomeTitle?.trim() || DEFAULT_WELCOME_TITLE,
    welcomeMessage:
      welcomeMessage?.trim() ||
      "您可以直接问我服务、案例、方案或合作方式，我会先基于官网资料回答。",
    suggestedQuestions: suggestedQuestions.length ? suggestedQuestions.slice(0, 5) : DEFAULT_SUGGESTED_QUESTIONS,
    suggestions: ["欢迎语先说明可咨询范围，避免太早索要联系方式。", "推荐问题建议覆盖服务、案例、方案、报价和顾问沟通。"],
  };
}
