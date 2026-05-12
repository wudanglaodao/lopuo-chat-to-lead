import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { conversations, getDb, messages } from "@/db";
import { buildDemoAssistantMessage, isDemoMode } from "@/lib/demo-mode";
import { answerQuestion } from "@/lib/rag";

const sendMessageSchema = z.object({
  siteId: z.string().uuid(),
  message: z.string().min(1).max(3000),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = sendMessageSchema.parse(await request.json());

  if (isDemoMode()) {
    return NextResponse.json({
      message: {
        id: crypto.randomUUID(),
        role: "assistant",
        content: buildDemoAssistantMessage(body.message),
        sources: [
          {
            id: "demo-source",
            url: "/demo",
            title: "Demo 官网页面",
            score: 0.92,
          },
        ],
        isMiss: false,
      },
    });
  }

  const db = getDb();

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.siteId, body.siteId)))
    .limit(1);

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  await db.insert(messages).values({
    customerId: conversation.customerId,
    siteId: conversation.siteId,
    conversationId: conversation.id,
    role: "user",
    content: body.message,
  });

  const result = await answerQuestion({
    customerId: conversation.customerId,
    siteId: conversation.siteId,
    conversationId: conversation.id,
    question: body.message,
  });

  const [assistantMessage] = await db
    .insert(messages)
    .values({
      customerId: conversation.customerId,
      siteId: conversation.siteId,
      conversationId: conversation.id,
      role: "assistant",
      content: result.answer,
      sources: result.sources,
      latencyMs: result.latencyMs,
      model: result.model,
      isMiss: result.isMiss,
    })
    .returning();

  await db
    .update(conversations)
    .set({
      hasMiss: conversation.hasMiss || result.isMiss,
      updatedAt: sql`now()`,
    })
    .where(eq(conversations.id, conversation.id));

  return NextResponse.json({
    message: {
      id: assistantMessage.id,
      role: "assistant",
      content: assistantMessage.content,
      sources: result.sources,
      isMiss: result.isMiss,
    },
  });
}
