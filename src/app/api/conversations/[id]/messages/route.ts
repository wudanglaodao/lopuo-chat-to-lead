import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";

import { conversations, getDb, leads, messages } from "@/db";
import { extractContact } from "@/lib/contact";
import { buildDemoAssistantMessage, isDemoMode } from "@/lib/demo-mode";
import { buildLeadFallbackSummary, updateLeadSummary } from "@/lib/leads";
import { answerQuestion, type TimingTracker } from "@/lib/rag";
import { DEFAULT_WIDGET_LOCALE, WIDGET_UI_TEXT, normalizeWidgetLocale } from "@/lib/widget-i18n";

const sendMessageSchema = z.object({
  siteId: z.string().uuid(),
  message: z.string().min(1).max(3000),
  stream: z.boolean().optional(),
  locale: z.string().max(20).optional().nullable(),
});

type MessagePayload = {
  message: {
    id: string;
    role: "assistant";
    content: string;
    sources: Array<{ id: string; url: string; title: string | null; score: number }>;
    isMiss: boolean;
  };
  leadSaved: boolean;
  leadPrompt: boolean;
};

type StreamEvent =
  | { type: "status"; message: string }
  | { type: "delta"; content: string }
  | MessagePayload & { type: "done" }
  | { type: "error"; message: string };

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = sendMessageSchema.parse(await request.json());
  const contact = extractContact(body.message);
  const shouldSaveLead = Boolean(contact.phone || contact.email || contact.wechat);
  const leadPrompt = !shouldSaveLead && hasLeadIntent(body.message);
  const wantsStream =
    body.stream === true || request.headers.get("accept")?.includes("text/event-stream");

  if (isDemoMode()) {
    const locale = normalizeWidgetLocale(body.locale) || DEFAULT_WIDGET_LOCALE;
    const payload = buildDemoPayload(body.message, shouldSaveLead, leadPrompt, locale);
    if (wantsStream) {
      return createEventStream(async (send) => {
        send({ type: "status", message: getStatusText(locale, "demo") });
        await streamText(payload.message.content, (content) => send({ type: "delta", content }));
        send({ type: "done", ...payload });
      }, WIDGET_UI_TEXT[locale].answerFailed);
    }
    return NextResponse.json(payload);
  }

  if (wantsStream) {
    const streamLocale = normalizeWidgetLocale(body.locale) || DEFAULT_WIDGET_LOCALE;
    return createEventStream(async (send) => {
      const timing = createTimingTracker({
        conversationId: id,
        siteId: body.siteId,
        mode: "stream",
      });

      const locale = streamLocale;
      send({ type: "status", message: getStatusText(locale, "thinking") });
      try {
        const payload = await processMessage({
          id,
          body,
          contact,
          shouldSaveLead,
          leadPrompt,
          timing,
          onToken: (content) => send({ type: "delta", content }),
          onStatus: (message) => send({ type: "status", message }),
        });
        send({ type: "done", ...payload });
      } finally {
        timing.summary();
      }
    }, WIDGET_UI_TEXT[streamLocale].answerFailed);
  }

  const timing = createTimingTracker({
    conversationId: id,
    siteId: body.siteId,
    mode: "json",
  });
  try {
    const payload = await processMessage({
      id,
      body,
      contact,
      shouldSaveLead,
      leadPrompt,
      timing,
    });
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof ResponseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  } finally {
    timing.summary();
  }
}

async function processMessage({
  id,
  body,
  contact,
  shouldSaveLead,
  leadPrompt,
  timing,
  onToken,
  onStatus,
}: {
  id: string;
  body: z.infer<typeof sendMessageSchema>;
  contact: ReturnType<typeof extractContact>;
  shouldSaveLead: boolean;
  leadPrompt: boolean;
  timing: TimingTracker;
  onToken?: (content: string) => void | Promise<void>;
  onStatus?: (message: string) => void;
}): Promise<MessagePayload> {
  const db = getDb();

  const [conversation] = await timing.track("db.conversation_lookup", () =>
    db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.siteId, body.siteId)))
      .limit(1),
  );

  if (!conversation) {
    throw new ResponseError("Conversation not found.", 404);
  }

  const locale =
    normalizeWidgetLocale(body.locale) ||
    normalizeWidgetLocale(conversation.locale) ||
    DEFAULT_WIDGET_LOCALE;

  const [userMessage] = await timing.track("db.insert_user_message", () =>
    db
      .insert(messages)
      .values({
        customerId: conversation.customerId,
        tenantId: conversation.tenantId,
        siteId: conversation.siteId,
        conversationId: conversation.id,
        role: "user",
        content: body.message,
      })
      .returning({ id: messages.id }),
  );

  onStatus?.(getStatusText(locale, "retrieving"));
  const result = await answerQuestion({
    customerId: conversation.customerId,
    tenantId: conversation.tenantId,
    siteId: conversation.siteId,
    conversationId: conversation.id,
    question: body.message,
    locale,
    excludeMessageId: userMessage.id,
    timing,
    onToken,
  });

  const leadPromise = shouldSaveLead
    ? timing.track("db.insert_lead", () =>
      db
        .insert(leads)
        .values({
          customerId: conversation.customerId,
          tenantId: conversation.tenantId,
          siteId: conversation.siteId,
          conversationId: conversation.id,
          phone: contact.phone,
          wechat: contact.wechat,
          email: contact.email,
          requirement: body.message,
          summary: buildLeadFallbackSummary({
            ...contact,
            requirement: body.message,
            recentUserMessage: body.message,
          }),
          summaryModel: "fallback",
          summaryUpdatedAt: new Date(),
        })
        .returning({ id: leads.id }),
    )
    : Promise.resolve(null);

  const assistantPromise = timing.track("db.insert_assistant_message", () =>
    db
      .insert(messages)
      .values({
        customerId: conversation.customerId,
        tenantId: conversation.tenantId,
        siteId: conversation.siteId,
        conversationId: conversation.id,
        role: "assistant",
        content: result.answer,
        sources: result.sources,
        latencyMs: result.latencyMs,
        model: result.model,
        isMiss: result.isMiss,
      })
      .returning(),
  );
  const [[assistantMessage], savedLeadRows] = await Promise.all([assistantPromise, leadPromise]);
  const savedLead = savedLeadRows?.[0];
  const leadSaved = shouldSaveLead;

  if (savedLead) {
    after(async () => {
      try {
        await updateLeadSummary(savedLead.id, {
          customerId: conversation.customerId,
          tenantId: conversation.tenantId,
          siteId: conversation.siteId,
          conversationId: conversation.id,
          phone: contact.phone,
          wechat: contact.wechat,
          email: contact.email,
          requirement: body.message,
          recentUserMessage: body.message,
        });
      } catch (error) {
        console.warn("[lead.summary.update.failed]", {
          leadId: savedLead.id,
          error: error instanceof Error ? error.message : error,
        });
      }
    });
  }

  await timing.track("db.update_conversation", () =>
    db
      .update(conversations)
      .set({
        hasLead: conversation.hasLead || leadSaved,
        hasMiss: conversation.hasMiss || result.isMiss,
        updatedAt: sql`now()`,
      })
      .where(eq(conversations.id, conversation.id)),
  );

  return {
    message: {
      id: assistantMessage.id,
      role: "assistant",
      content: assistantMessage.content,
      sources: result.sources,
      isMiss: result.isMiss,
    },
    leadSaved,
    leadPrompt: !leadSaved && leadPrompt,
  };
}

function hasLeadIntent(message: string) {
  return /报价|報價|价格|價格|多少钱|多少錢|收费|收費|预算|預算|方案|顾问|顧問|联系|聯絡|预约|預約|咨询|諮詢|合作|上线|上線|周期|週期|演示|試用|试用|购买|購買|采购|採購|需求|price|pricing|quote|budget|plan|consult|contact|call|demo|trial|buy|purchase|requirement/i.test(message);
}

function getStatusText(locale: ReturnType<typeof normalizeWidgetLocale> | typeof DEFAULT_WIDGET_LOCALE, status: "demo" | "thinking" | "retrieving") {
  const uiText = WIDGET_UI_TEXT[locale || DEFAULT_WIDGET_LOCALE];
  if (status === "retrieving") {
    if (locale === "en") return "Searching the knowledge base";
    if (locale === "zh-TW") return "正在檢索知識庫";
    return "正在检索知识库";
  }
  if (status === "demo") {
    if (locale === "en") return "Preparing the demo reply";
    if (locale === "zh-TW") return "正在整理演示回覆";
    return "正在整理演示回答";
  }
  return uiText.thinking;
}

function buildDemoPayload(
  message: string,
  leadSaved: boolean,
  leadPrompt: boolean,
  locale: string,
): MessagePayload {
  return {
    message: {
      id: crypto.randomUUID(),
      role: "assistant",
      content: buildDemoAssistantMessage(message, locale),
      sources: [
        {
          id: "demo-source",
          url: "/demo",
          title: "预览官网页面",
          score: 0.92,
        },
      ],
      isMiss: false,
    },
    leadSaved,
    leadPrompt,
  };
}

function createEventStream(
  run: (send: (event: StreamEvent) => void) => Promise<void>,
  fallbackErrorMessage: string,
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await run(send);
      } catch (error) {
        const message = error instanceof Error ? error.message : fallbackErrorMessage;
        send({ type: "error", message });
        console.error("[message-stream.error]", error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}

async function streamText(text: string, onToken: (content: string) => void) {
  const chunks = chunkText(text, 20);
  for (const chunk of chunks) {
    onToken(chunk);
  }
}

function chunkText(text: string, size: number) {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }
  return chunks.length ? chunks : [text];
}

function createTimingTracker(context: Record<string, unknown>): TimingTracker & { summary: () => void } {
  const requestId = crypto.randomUUID();
  const startedAt = performance.now();
  const entries: Array<{ stage: string; durationMs?: number; totalMs: number }> = [];

  const log = (payload: Record<string, unknown>) => {
    console.info("[message.timing]", {
      requestId,
      ...context,
      ...payload,
    });
  };

  return {
    mark(stage, details) {
      const totalMs = Math.round(performance.now() - startedAt);
      entries.push({ stage, totalMs });
      log({ stage, totalMs, ...details });
    },
    async track(stage, action) {
      const stageStartedAt = performance.now();
      try {
        return await action();
      } finally {
        const durationMs = Math.round(performance.now() - stageStartedAt);
        const totalMs = Math.round(performance.now() - startedAt);
        entries.push({ stage, durationMs, totalMs });
        log({ stage, durationMs, totalMs });
      }
    },
    summary() {
      log({
        stage: "summary",
        totalMs: Math.round(performance.now() - startedAt),
        entries,
      });
    },
  };
}

class ResponseError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
