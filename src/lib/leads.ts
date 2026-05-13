import { and, desc, eq } from "drizzle-orm";

import { getDb, leads, messages } from "@/db";
import { generateChatAnswer, getChatModel } from "@/lib/ai/chat";

type LeadContact = {
  name?: string | null;
  phone?: string | null;
  wechat?: string | null;
  email?: string | null;
  company?: string | null;
};

export type LeadSummaryInput = LeadContact & {
  customerId: string;
  siteId: string;
  tenantId?: string | null;
  conversationId: string;
  requirement?: string | null;
  recentUserMessage?: string | null;
};

export function buildLeadFallbackSummary(input: Pick<LeadSummaryInput, "requirement" | "recentUserMessage"> & LeadContact) {
  const contactParts = [
    input.name ? `联系人：${input.name}` : null,
    input.company ? `公司：${input.company}` : null,
    input.phone ? `电话：${input.phone}` : null,
    input.wechat ? `微信：${input.wechat}` : null,
    input.email ? `邮箱：${input.email}` : null,
  ].filter(Boolean);
  const base = input.requirement?.trim() || input.recentUserMessage?.trim();

  if (base && contactParts.length) {
    return truncateSummary(`${contactParts.join("，")}；需求：${base}`);
  }
  if (base) {
    return truncateSummary(base);
  }
  if (contactParts.length) {
    return truncateSummary(`${contactParts.join("，")}；已留下联系方式，等待销售跟进。`);
  }
  return "访客已留下联系方式，等待销售跟进。";
}

export async function updateLeadSummary(leadId: string, input: LeadSummaryInput) {
  const result = await generateLeadSummary(input);

  await getDb()
    .update(leads)
    .set({
      summary: result.summary,
      summaryModel: result.model,
      summaryUpdatedAt: result.updatedAt,
    })
    .where(
      and(
        eq(leads.id, leadId),
        eq(leads.customerId, input.customerId),
        eq(leads.siteId, input.siteId),
      ),
    );
}

async function generateLeadSummary(input: LeadSummaryInput) {
  const fallback = buildLeadFallbackSummary(input);

  if (!canUseSummaryModel()) {
    return {
      summary: fallback,
      model: "fallback",
      updatedAt: new Date(),
    };
  }

  try {
    const recentMessages = await getDb()
      .select({
        role: messages.role,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, input.conversationId),
          eq(messages.customerId, input.customerId),
          eq(messages.siteId, input.siteId),
        ),
      )
      .orderBy(desc(messages.createdAt))
      .limit(12);

    const transcript = recentMessages
      .reverse()
      .map((message) => `${message.role === "assistant" ? "AI" : "访客"}：${message.content}`)
      .join("\n");
    const model = getChatModel();
    const summary = await generateChatAnswer({
      model,
      messages: [
        {
          role: "system",
          content: "你是后台销售助理。请基于会话、需求和联系方式，生成一句中文线索摘要，80 字以内，只输出摘要本身。",
        },
        {
          role: "user",
          content: [
            `联系方式：${formatContact(input) || "未记录"}`,
            `需求备注：${input.requirement?.trim() || "未填写"}`,
            `最近会话：\n${transcript || input.recentUserMessage || "暂无"}`,
          ].join("\n\n"),
        },
      ],
    });

    return {
      summary: normalizeSummary(summary, fallback),
      model,
      updatedAt: new Date(),
    };
  } catch (error) {
    console.warn("[lead.summary.failed]", {
      leadConversationId: input.conversationId,
      error: error instanceof Error ? error.message : error,
    });
    return {
      summary: fallback,
      model: "fallback",
      updatedAt: new Date(),
    };
  }
}

function canUseSummaryModel() {
  return Boolean(
    process.env.LLM_API_KEY ||
      process.env.DEEPSEEK_API_KEY ||
      process.env.ALLOW_FAKE_LLM === "true",
  );
}

function formatContact(input: LeadContact) {
  return [
    input.name ? `姓名 ${input.name}` : null,
    input.company ? `公司 ${input.company}` : null,
    input.phone ? `电话 ${input.phone}` : null,
    input.wechat ? `微信 ${input.wechat}` : null,
    input.email ? `邮箱 ${input.email}` : null,
  ]
    .filter(Boolean)
    .join("，");
}

function normalizeSummary(value: string, fallback: string) {
  const normalized = value
    .replace(/^摘要[:：]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return truncateSummary(normalized || fallback);
}

function truncateSummary(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}
