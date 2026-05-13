import { desc, eq } from "drizzle-orm";

import { getDb, sites, tenants, type Site, type Tenant } from "@/db";
import { DEMO_TENANT_ID, getDemoWidgetConfig, isDemoMode } from "@/lib/demo-mode";

export type TenantOption = Pick<Tenant, "id" | "customerId" | "name" | "description" | "status">;

export async function getTenantOptions(customerId: string) {
  if (isDemoMode()) {
    return getDemoTenants(customerId);
  }

  return getDb()
    .select()
    .from(tenants)
    .where(eq(tenants.customerId, customerId))
    .orderBy(desc(tenants.updatedAt));
}

export async function getAdminSiteTenantContext({
  customerId,
  siteId,
  requestedTenantId,
}: {
  customerId: string;
  siteId: string;
  requestedTenantId?: string | null;
}) {
  const [site, tenantRows] = await Promise.all([
    getAdminSite(siteId, customerId),
    getTenantOptions(customerId),
  ]);
  const activeTenant = resolveActiveTenant(tenantRows, requestedTenantId, site.defaultTenantId);

  return {
    site,
    tenantRows,
    activeTenant,
  };
}

async function getAdminSite(siteId: string, customerId: string): Promise<Site> {
  if (isDemoMode()) {
    return getDemoAdminSite(siteId, customerId);
  }

  const [site] = await getDb().select().from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site) {
    throw new Error("Site not found.");
  }
  return site;
}

export function resolveActiveTenant(
  tenantRows: TenantOption[],
  requestedTenantId?: string | null,
  fallbackTenantId?: string | null,
) {
  return (
    tenantRows.find((tenant) => tenant.id === requestedTenantId) ||
    tenantRows.find((tenant) => tenant.id === fallbackTenantId) ||
    tenantRows[0] ||
    null
  );
}

export function getDemoTenants(customerId: string): Tenant[] {
  return [
    {
      id: "22222222-2222-4222-8222-222222222222",
      customerId,
      name: "官网客服",
      description: "营销官网默认转化工作区",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      customerId,
      name: "售前咨询",
      description: "售前 FAQ、方案和案例资料",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

function getDemoAdminSite(siteId: string, customerId: string): Site {
  const demoConfig = getDemoWidgetConfig({ siteId });

  return {
    id: siteId,
    customerId,
    defaultTenantId: DEMO_TENANT_ID,
    name: "演示站点",
    domain: "lopuo.work",
    widgetName: demoConfig.widgetName,
    welcomeTitle: demoConfig.welcomeTitle,
    welcomeMessage: demoConfig.welcomeMessage,
    themeColor: demoConfig.themeColor,
    launcherText: demoConfig.launcherText,
    launcherStyle: demoConfig.launcherStyle,
    launcherImageUrl: demoConfig.launcherImageUrl,
    launcherBadgeText: demoConfig.launcherBadgeText,
    launcherAnimation: demoConfig.launcherAnimation,
    suggestedQuestions: demoConfig.suggestedQuestions,
    allowedOrigins: ["lopuo.work", "www.lopuo.work", "localhost:3000", "127.0.0.1:3000"],
    showSources: demoConfig.showSources,
    collectLeadEnabled: demoConfig.collectLeadEnabled,
    aiTone: demoConfig.aiTone,
    toneKeywords: demoConfig.toneKeywords,
    businessFlow: demoConfig.businessFlow,
    multilingualEnabled: false,
    defaultLocale: "zh-CN",
    enabledLocales: ["zh-CN"],
    systemPrompt: "",
    deepseekModel: "",
    embeddingModel: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
