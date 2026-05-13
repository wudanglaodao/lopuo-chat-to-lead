import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { conversations, getDb, leads, messages } from "@/db";
import { extractContact } from "@/lib/contact";
import { buildDemoAssistantMessage, isDemoMode } from "@/lib/demo-mode";
import { answerQuestion, type TimingTracker } from "@/lib/rag";

const sendMessageSchema = z.object({
  siteId: z.string().uuid(),
  message: z.string().min(1).max(3000),
  stream: z.boolean().optional(),
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
    const payload = buildDemoPayload(body.message, shouldSaveLead, leadPrompt);
    if (wantsStream) {
      return createEventStream(async (send) => {
        send({ type: "status", message: "正在整理演示回答" });
        await streamText(payload.message.content, (content) => send({ type: "delta", content }));
        send({ type: "done", ...payload });
      });
    }
    return NextResponse.json(payload);
  }

  if (wantsStream) {
    return createEventStream(async (send) => {
      const timing = createTimingTracker({
        conversationId: id,
        siteId: body.siteId,
        mode: "stream",
      });

      send({ type: "status", message: "正在理解问题" });
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
    });
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

  await timing.track("db.insert_user_message", () =>
    db.insert(messages).values({
      customerId: conversation.customerId,
      tenantId: conversation.tenantId,
      siteId: conversation.siteId,
      conversationId: conversation.id,
      role: "user",
      content: body.message,
    }),
  );

  onStatus?.("正在检索知识库");
  const result = await answerQuestion({
    customerId: conversation.customerId,
    tenantId: conversation.tenantId,
    siteId: conversation.siteId,
    conversationId: conversation.id,
    question: body.message,
    timing,
    onToken,
  });

  let leadSaved = false;
  if (shouldSaveLead) {
    await timing.track("db.insert_lead", () =>
      db.insert(leads).values({
        customerId: conversation.customerId,
        tenantId: conversation.tenantId,
        siteId: conversation.siteId,
        conversationId: conversation.id,
        phone: contact.phone,
        wechat: contact.wechat,
        email: contact.email,
        requirement: body.message,
      }),
    );
    leadSaved = true;
  }

  const [assistantMessage] = await timing.track("db.insert_assistant_message", () =>
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
  return /报价|价格|多少钱|收费|预算|方案|顾问|联系|预约|咨询|合作|上线|周期|演示|试用|购买|采购|需求/.test(message);
}

function buildDemoPayload(
  message: string,
  leadSaved: boolean,
  leadPrompt: boolean,
): MessagePayload {
  return {
    message: {
      id: crypto.randomUUID(),
      role: "assistant",
      content: buildDemoAssistantMessage(message),
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

function createEventStream(run: (send: (event: StreamEvent) => void) => Promise<void>) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await run(send);
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI 回复失败，请稍后再试。";
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
