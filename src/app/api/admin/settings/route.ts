import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb, sites, tenants } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_AI_TONE, DEFAULT_BUSINESS_FLOW, DEFAULT_TONE_KEYWORDS, DEFAULT_WELCOME_TITLE } from "@/lib/defaults";
import { getDemoWidgetConfig, isDemoMode } from "@/lib/demo-mode";
import { WIDGET_LOGO_TYPES, normalizeWidgetLogoText, normalizeWidgetLogoType } from "@/lib/widget-brand";
import { SUPPORTED_WIDGET_LOCALES } from "@/lib/widget-i18n";
import {
  LAUNCHER_POSITIONS,
  MAX_LAUNCHER_BOTTOM_OFFSET,
  MAX_LAUNCHER_HORIZONTAL_OFFSET,
  MAX_WIDGET_CUSTOM_CODE_LENGTH,
  normalizeWidgetCustomCss,
  normalizeWidgetCustomJs,
} from "@/lib/widget-launcher";

const settingsSchema = z.object({
  defaultTenantId: z.string().uuid().optional().nullable(),
  widgetName: z.string().min(1).max(80),
  widgetLogoType: z.enum(WIDGET_LOGO_TYPES).default("image"),
  widgetLogoUrl: z.string().url().optional().nullable().or(z.literal("")),
  widgetLogoText: z.string().max(40).optional().nullable(),
  launcherText: z.string().min(1).max(80),
  welcomeTitle: z.string().min(1).max(120),
  welcomeMessage: z.string().min(1).max(1000),
  themeColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  launcherStyle: z.enum(["pill", "vertical", "mascot"]),
  launcherPosition: z.enum(LAUNCHER_POSITIONS).default("bottom-right"),
  launcherBottomOffset: z.coerce.number().int().min(0).max(MAX_LAUNCHER_BOTTOM_OFFSET).default(20),
  launcherHorizontalOffset: z.coerce.number().int().min(0).max(MAX_LAUNCHER_HORIZONTAL_OFFSET).default(20),
  launcherImageUrl: z.string().url().optional().nullable().or(z.literal("")),
  launcherBadgeText: z.string().max(8).optional().nullable(),
  launcherAnimation: z.enum(["none", "pulse", "bounce", "float"]),
  widgetAdvancedEnabled: z.boolean().default(false),
  widgetCustomCss: z.string().max(MAX_WIDGET_CUSTOM_CODE_LENGTH).optional().nullable(),
  widgetCustomJs: z.string().max(MAX_WIDGET_CUSTOM_CODE_LENGTH).optional().nullable(),
  suggestedQuestions: z.array(z.string().min(1).max(160)).min(1).max(8),
  allowedOrigins: z.array(z.string().min(1).max(200)).max(20),
  showSources: z.boolean(),
  collectLeadEnabled: z.boolean(),
  aiTone: z.string().min(1).max(40),
  toneKeywords: z.array(z.string().min(1).max(40)).max(20),
  businessFlow: z.string().max(4000).optional().nullable(),
  multilingualEnabled: z.boolean().default(false),
  defaultLocale: z.enum(SUPPORTED_WIDGET_LOCALES).default("zh-CN"),
  enabledLocales: z.array(z.enum(SUPPORTED_WIDGET_LOCALES)).min(1).max(3).default(["zh-CN"]),
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
        aiTone: DEFAULT_AI_TONE,
        toneKeywords: DEFAULT_TONE_KEYWORDS,
        businessFlow: DEFAULT_BUSINESS_FLOW,
        welcomeTitle: DEFAULT_WELCOME_TITLE,
        multilingualEnabled: false,
        defaultLocale: "zh-CN",
        enabledLocales: ["zh-CN"],
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
  const values = {
    ...body,
    widgetLogoType: normalizeWidgetLogoType(body.widgetLogoType),
    widgetLogoUrl: body.widgetLogoUrl || null,
    widgetLogoText: normalizeWidgetLogoText(body.widgetLogoText || body.widgetName),
    widgetCustomCss: body.widgetAdvancedEnabled ? normalizeWidgetCustomCss(body.widgetCustomCss || "") || null : null,
    widgetCustomJs: body.widgetAdvancedEnabled ? normalizeWidgetCustomJs(body.widgetCustomJs || "") || null : null,
  };
  if (isDemoMode()) {
    return NextResponse.json({
      site: {
        id: session.siteId,
        customerId: session.customerId,
        name: "演示站点",
        domain: "lopuo.work",
        ...values,
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
      ...values,
      updatedAt: sql`now()`,
    })
    .where(eq(sites.id, session.siteId))
    .returning();

  return NextResponse.json({ site });
}
