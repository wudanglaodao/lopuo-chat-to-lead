"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb, sites, tenants } from "@/db";
import { clearSessionCookie, requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { addKnowledgeSource, syncKnowledgeSource } from "@/lib/knowledge";

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

  if (isDemoMode()) {
    revalidatePath("/admin/settings");
    return;
  }

  const db = getDb();
  const requestedDefaultTenantId = String(formData.get("defaultTenantId") || "").trim();
  let defaultTenantId: string | null = null;

  if (requestedDefaultTenantId) {
    const [defaultTenant] = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, requestedDefaultTenantId), eq(tenants.customerId, session.customerId)))
      .limit(1);
    defaultTenantId = defaultTenant?.id || null;
  }

  await db
    .update(sites)
    .set({
      defaultTenantId,
      widgetName: String(formData.get("widgetName") || "AI 助理"),
      launcherText: String(formData.get("launcherText") || "AI 助理"),
      welcomeMessage: String(formData.get("welcomeMessage") || ""),
      themeColor: String(formData.get("themeColor") || "#16a34a"),
      launcherStyle: String(formData.get("launcherStyle") || "vertical"),
      launcherImageUrl: String(formData.get("launcherImageUrl") || "").trim() || null,
      launcherBadgeText: String(formData.get("launcherBadgeText") || "").trim() || null,
      launcherAnimation: String(formData.get("launcherAnimation") || "pulse"),
      suggestedQuestions: String(formData.get("suggestedQuestions") || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      allowedOrigins: String(formData.get("allowedOrigins") || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      showSources: formData.get("showSources") === "on",
      collectLeadEnabled: formData.get("collectLeadEnabled") === "on",
      systemPrompt: String(formData.get("systemPrompt") || "").trim() || null,
      deepseekModel: String(formData.get("deepseekModel") || "").trim() || null,
      embeddingModel: String(formData.get("embeddingModel") || "").trim() || null,
      updatedAt: sql`now()`,
    })
    .where(eq(sites.id, session.siteId));

  revalidatePath("/admin/settings");
}
