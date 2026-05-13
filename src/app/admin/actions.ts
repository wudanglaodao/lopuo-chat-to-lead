"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb, sites, tenants } from "@/db";
import { clearSessionCookie, requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { addKnowledgeSource, syncKnowledgeSource } from "@/lib/knowledge";
import {
  DEFAULT_WIDGET_LOCALE,
  normalizeEnabledLocales,
  normalizeWidgetLocale,
} from "@/lib/widget-i18n";

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/admin/login");
}

export async function addKnowledgeSourceAction(formData: FormData) {
  const session = await requireAdmin();
  const url = String(formData.get("url") || "").trim();
  const tenantId = String(formData.get("tenantId") || "").trim();

  if (!url || !tenantId) {
    return;
  }

  if (isDemoMode()) {
    revalidatePath("/admin/knowledge");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/settings/tenants");
    return;
  }

  const db = getDb();
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.id, tenantId), eq(tenants.customerId, session.customerId)))
    .limit(1);

  if (!tenant) {
    return;
  }

  await addKnowledgeSource({
    customerId: session.customerId,
    tenantId,
    siteId: session.siteId,
    url,
  });

  revalidatePath("/admin/knowledge");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings/tenants");
}

export async function createTenantAction(formData: FormData) {
  const session = await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!name) {
    return;
  }

  if (isDemoMode()) {
    revalidatePath("/admin/knowledge");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/settings/tenants");
    return;
  }

  const db = getDb();
  await db
    .insert(tenants)
    .values({
      customerId: session.customerId,
      name,
      description: description || null,
    })
    .onConflictDoUpdate({
      target: [tenants.customerId, tenants.name],
      set: {
        description: description || null,
        status: "active",
        updatedAt: sql`now()`,
      },
    });

  revalidatePath("/admin/knowledge");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings/tenants");
}

export async function syncKnowledgeSourceAction(formData: FormData) {
  const session = await requireAdmin();
  const sourceId = String(formData.get("sourceId") || "");

  if (!sourceId) {
    return;
  }

  if (isDemoMode()) {
    revalidatePath("/admin/knowledge");
    return;
  }

  await syncKnowledgeSource(sourceId, session.customerId);
  revalidatePath("/admin/knowledge");
}

export async function updateSettingsAction(formData: FormData) {
  const session = await requireAdmin();
  const section = String(formData.get("settingsSection") || "all");

  if (isDemoMode()) {
    revalidatePath("/admin/settings");
    revalidatePath("/admin/settings/tenants");
    return;
  }

  const db = getDb();
  const requestedDefaultTenantId = String(formData.get("defaultTenantId") || "").trim();
  let defaultTenantId: string | null | undefined;

  if (requestedDefaultTenantId) {
    const [defaultTenant] = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, requestedDefaultTenantId), eq(tenants.customerId, session.customerId)))
      .limit(1);
    defaultTenantId = defaultTenant?.id || null;
  }

  const values: Partial<typeof sites.$inferInsert> = { updatedAt: sql`now()` as never };

  if (section === "script" || section === "all") {
    if (defaultTenantId !== undefined) {
      values.defaultTenantId = defaultTenantId;
    }
    values.allowedOrigins = String(formData.get("allowedOrigins") || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (section === "style" || section === "all") {
    values.widgetName = String(formData.get("widgetName") || "AI 营销助手");
    values.launcherText = String(formData.get("launcherText") || "咨询方案");
    values.themeColor = String(formData.get("themeColor") || "#16a34a");
    values.launcherStyle = String(formData.get("launcherStyle") || "vertical");
    values.launcherImageUrl = String(formData.get("launcherImageUrl") || "").trim() || null;
    values.launcherBadgeText = String(formData.get("launcherBadgeText") || "").trim() || null;
    values.launcherAnimation = String(formData.get("launcherAnimation") || "pulse");
  }

  if (section === "content" || section === "all") {
    values.welcomeTitle = String(formData.get("welcomeTitle") || "您好，我是 AI 营销助手");
    values.welcomeMessage = String(formData.get("welcomeMessage") || "");
    values.suggestedQuestions = String(formData.get("suggestedQuestions") || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    values.showSources = formData.get("showSources") === "on";
    values.collectLeadEnabled = formData.get("collectLeadEnabled") === "on";
    values.aiTone = String(formData.get("aiTone") || "friendly");
    values.toneKeywords = String(formData.get("toneKeywords") || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    values.businessFlow = String(formData.get("businessFlow") || "").trim() || null;
  }

  if (section === "multilingual" || section === "all") {
    const defaultLocale = normalizeWidgetLocale(String(formData.get("defaultLocale") || "")) || DEFAULT_WIDGET_LOCALE;
    const requestedLocales = formData
      .getAll("enabledLocales")
      .map((item) => String(item || ""));

    values.multilingualEnabled = formData.get("multilingualEnabled") === "on";
    values.defaultLocale = defaultLocale;
    values.enabledLocales = normalizeEnabledLocales(requestedLocales, defaultLocale);
  }

  if (section === "security" || section === "all") {
    values.systemPrompt = String(formData.get("systemPrompt") || "").trim() || null;
    values.deepseekModel = String(formData.get("deepseekModel") || "").trim() || null;
    values.embeddingModel = String(formData.get("embeddingModel") || "").trim() || null;
  }

  await db.update(sites).set(values).where(eq(sites.id, session.siteId));

  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings/tenants");
}
