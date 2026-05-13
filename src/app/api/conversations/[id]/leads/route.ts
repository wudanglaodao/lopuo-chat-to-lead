import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";

import { conversations, getDb, leads } from "@/db";
import { isDemoMode } from "@/lib/demo-mode";
import { buildLeadFallbackSummary, updateLeadSummary } from "@/lib/leads";

const leadSchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().max(120).optional(),
  phone: z.string().max(60).optional(),
  wechat: z.string().max(80).optional(),
  email: z.string().email().optional().or(z.literal("")),
  company: z.string().max(160).optional(),
  requirement: z.string().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = leadSchema.parse(await request.json());

  if (isDemoMode()) {
    return NextResponse.json({ leadId: `demo-lead-${Date.now()}` });
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

  const [lead] = await db
    .insert(leads)
    .values({
      customerId: conversation.customerId,
      tenantId: conversation.tenantId,
      siteId: conversation.siteId,
      conversationId: conversation.id,
      name: body.name,
      phone: body.phone,
      wechat: body.wechat,
      email: body.email || undefined,
      company: body.company,
      requirement: body.requirement,
      summary: buildLeadFallbackSummary(body),
      summaryModel: "fallback",
      summaryUpdatedAt: new Date(),
    })
    .returning();

  await db
    .update(conversations)
    .set({ hasLead: true, updatedAt: sql`now()` })
    .where(eq(conversations.id, conversation.id));

  after(async () => {
    try {
      await updateLeadSummary(lead.id, {
        customerId: conversation.customerId,
        tenantId: conversation.tenantId,
        siteId: conversation.siteId,
        conversationId: conversation.id,
        name: body.name,
        phone: body.phone,
        wechat: body.wechat,
        email: body.email || null,
        company: body.company,
        requirement: body.requirement,
      });
    } catch (error) {
      console.warn("[lead.summary.update.failed]", {
        leadId: lead.id,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  return NextResponse.json({ leadId: lead.id });
}
