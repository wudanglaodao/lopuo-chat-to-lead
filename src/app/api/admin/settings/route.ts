import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb, sites, tenants } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getDemoWidgetConfig, isDemoMode } from "@/lib/demo-mode";

const settingsSchema = z.object({
  defaultTenantId: z.string().uuid().optional().nullable(),
  widgetName: z.string().min(1).max(80),
  launcherText: z.string().min(1).max(80),
  welcomeMessage: z.string().min(1).max(1000),
  themeColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  launcherStyle: z.enum(["pill", "vertical", "mascot"]),
  launcherImageUrl: z.string().url().optional().nullable().or(z.literal("")),
  launcherBadgeText: z.string().max(8).optional().nullable(),
  launcherAnimation: z.enum(["none", "pulse", "bounce", "float"]),
  suggestedQuestions: z.array(z.string().min(1).max(160)).min(1).max(8),
  allowedOrigins: z.array(z.string().min(1).max(200)).max(20),
  showSources: z.boolean(),
  collectLeadEnabled: z.boolean(),
  systemPrompt: z.string().max(4000).optional().nullable(),
  deepseekModel: z.string().max(120).optional().nullable(),
  embeddingModel: z.string().max(120).optional().nullable(),
});

export async function GET() {
  const session = await requireAdmin();
  if (isDemoMode()) {
    return NextResponse.json({
      site: {
        ...getDemoWidgetConfig({ siteId: session.siteId }),
        id: session.siteId,
        customerId: session.customerId,
        name: "演示站点",
        domain: "lopuo.work",
        defaultTenantId: "22222222-2222-4222-8222-222222222222",
        allowedOrigins: ["lopuo.work", "www.lopuo.work", "localhost:3000", "127.0.0.1:3000"],
        systemPrompt: "",
        deepseekModel: "",
        embeddingModel: "",
      },
    });
  }

  const db = getDb();
  const [site] = await db.select().from(sites).where(eq(sites.id, session.siteId)).limit(1);
  return NextResponse.json({ site });
}

export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  const body = settingsSchema.parse(await request.json());
  if (isDemoMode()) {
    return NextResponse.json({
      site: {
        id: session.siteId,
        customerId: session.customerId,
        name: "演示站点",
        domain: "lopuo.work",
        ...body,
      },
    });
  }

  const db = getDb();
  if (body.defaultTenantId) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, body.defaultTenantId), eq(tenants.customerId, session.customerId)))
      .limit(1);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }
  }

  const [site] = await db
    .update(sites)
    .set({
      ...body,
      updatedAt: sql`now()`,
    })
    .where(eq(sites.id, session.siteId))
    .returning();

  return NextResponse.json({ site });
}
