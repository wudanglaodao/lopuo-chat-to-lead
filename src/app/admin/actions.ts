"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { conversations, getDb, sites, tenants } from "@/db";
import { clearSessionCookie, requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { addKnowledgeSource, syncKnowledgeSource } from "@/lib/knowledge";
import {
  DEFAULT_WIDGET_LOCALE,
  normalizeEnabledLocales,
  normalizeWidgetLocale,
} from "@/lib/widget-i18n";
import { DEFAULT_WIDGET_LOGO_URL, normalizeWidgetLogoText, normalizeWidgetLogoType } from "@/lib/widget-brand";
import { normalizeLauncherBottomOffset, normalizeLauncherPosition } from "@/lib/widget-launcher";

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

export type KnowledgeSyncState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function syncKnowledgeSourceAction(
  _state: KnowledgeSyncState,
  formData: FormData,
): Promise<KnowledgeSyncState> {
  const session = await requireAdmin();
  const sourceId = String(formData.get("sourceId") || "");

  if (!sourceId) {
    return { status: "error", message: "缺少知识来源 ID。" };
  }

  if (isDemoMode()) {
    revalidatePath("/admin/knowledge");
    return { status: "success", message: "预览模式不会写入数据库。" };
  }

  try {
    const result = await syncKnowledgeSource(sourceId, session.customerId);
    return {
      status: "success",
      message: `同步完成：${result.pageCount} 个页面，${result.chunkCount} 个片段。`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "同步失败，请稍后重试。",
    };
  } finally {
    revalidatePath("/admin/knowledge");
  }
}

export type ConversationDeleteState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function deleteConversationAction(
  _state: ConversationDeleteState,
  formData: FormData,
): Promise<ConversationDeleteState> {
  const session = await requireAdmin();
  const conversationId = String(formData.get("conversationId") || "").trim();
  const returnTo = normalizeAdminReturnTo(String(formData.get("returnTo") || "").trim());

  if (!conversationId) {
    return { status: "error", message: "缺少会话 ID。" };
  }

  if (isDemoMode()) {
    revalidateConversationPaths();
    if (returnTo) {
      redirect(returnTo);
    }
    return { status: "success", message: "预览模式不会删除数据。" };
  }

  const [deleted] = await getDb()
    .delete(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.customerId, session.customerId),
        eq(conversations.siteId, session.siteId),
      ),
    )
    .returning({ id: conversations.id });

  revalidateConversationPaths();

  if (!deleted) {
    return { status: "error", message: "会话不存在或无权删除。" };
  }

  if (returnTo) {
    redirect(returnTo);
  }

  return { status: "success", message: "已删除会话及关联消息、线索。" };
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
    values.widgetLogoType = normalizeWidgetLogoType(String(formData.get("widgetLogoType") || ""));
    values.widgetLogoUrl = String(formData.get("widgetLogoUrl") || "").trim() || DEFAULT_WIDGET_LOGO_URL;
    values.widgetLogoText = normalizeWidgetLogoText(String(formData.get("widgetLogoText") || values.widgetName || ""));
    values.launcherText = String(formData.get("launcherText") || "咨询方案");
    values.themeColor = String(formData.get("themeColor") || "#16a34a");
    values.launcherStyle = String(formData.get("launcherStyle") || "vertical");
    values.launcherPosition = normalizeLauncherPosition(String(formData.get("launcherPosition") || ""));
    values.launcherBottomOffset = normalizeLauncherBottomOffset(String(formData.get("launcherBottomOffset") || ""));
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

function revalidateConversationPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/conversations");
  revalidatePath("/admin/conversations/leads");
}

function normalizeAdminReturnTo(value: string) {
  if (!value) return "";
  if (value === "/admin/conversations" || value.startsWith("/admin/conversations?")) {
    return value;
  }
  return "";
}
