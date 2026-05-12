import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { conversations, getDb, sites } from "@/db";
import { getDemoConversationId, isDemoMode } from "@/lib/demo-mode";

const createConversationSchema = z.object({
  siteId: z.string().uuid(),
  visitorId: z.string().min(1).max(200),
  conversationId: z.string().uuid().optional(),
  pageUrl: z.string().max(2000).optional().nullable(),
  referrer: z.string().max(2000).optional().nullable(),
});

const createDemoConversationSchema = createConversationSchema.extend({
  conversationId: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const payload = await request.json();

  if (isDemoMode()) {
    createDemoConversationSchema.parse(payload);
    return NextResponse.json({ conversationId: getDemoConversationId() });
  }

  const body = createConversationSchema.parse(payload);
  const db = getDb();
  const [site] = await db.select().from(sites).where(eq(sites.id, body.siteId)).limit(1);

  if (!site) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  if (body.conversationId) {
    const [existing] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, body.conversationId),
          eq(conversations.siteId, site.id),
          eq(conversations.customerId, site.customerId),
        ),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json({ conversationId: existing.id });
    }
  }

  const [conversation] = await db
    .insert(conversations)
    .values({
      customerId: site.customerId,
      siteId: site.id,
      visitorId: body.visitorId,
      pageUrl: body.pageUrl,
      referrer: body.referrer,
      updatedAt: sql`now()`,
    })
    .returning();

  return NextResponse.json({ conversationId: conversation.id });
}
