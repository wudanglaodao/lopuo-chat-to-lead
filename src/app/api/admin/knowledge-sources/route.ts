import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb, knowledgeSources, tenants } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { addKnowledgeSource } from "@/lib/knowledge";

const createSourceSchema = z.object({
  tenantId: z.string().uuid(),
  url: z.string().url(),
});

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isDemoMode()) {
    return NextResponse.json({ sources: [] });
  }

  const tenantId = request.nextUrl.searchParams.get("tenantId");
  const db = getDb();
  const sources = await db
    .select()
    .from(knowledgeSources)
    .where(
      and(
        eq(knowledgeSources.customerId, session.customerId),
        eq(knowledgeSources.siteId, session.siteId),
        tenantId ? eq(knowledgeSources.tenantId, tenantId) : undefined,
      ),
    )
    .orderBy(desc(knowledgeSources.updatedAt));

  return NextResponse.json({ sources });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  const body = createSourceSchema.parse(await request.json());
  if (isDemoMode()) {
    return NextResponse.json({
      source: {
        id: `demo-source-${Date.now()}`,
        customerId: session.customerId,
        tenantId: body.tenantId,
        siteId: session.siteId,
        url: body.url,
        title: body.url,
        status: "demo",
        lastSyncedAt: null,
        lastError: "演示模式不会写入数据库。",
      },
    });
  }

  const db = getDb();
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.id, body.tenantId), eq(tenants.customerId, session.customerId)))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  const source = await addKnowledgeSource({
    customerId: session.customerId,
    tenantId: body.tenantId,
    siteId: session.siteId,
    url: body.url,
  });

  return NextResponse.json({ source });
}
