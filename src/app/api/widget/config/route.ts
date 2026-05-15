import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getDb, sites, tenants } from "@/db";
import { getDemoWidgetConfig, isDemoMode } from "@/lib/demo-mode";
import { isAllowedOrigin } from "@/lib/utils";
import {
  normalizeLauncherBottomOffset,
  normalizeLauncherAnchorGap,
  normalizeLauncherAnchorSelector,
  normalizeLauncherHorizontalOffset,
  normalizeLauncherPosition,
  normalizeWidgetCustomCss,
  normalizeWidgetCustomJs,
} from "@/lib/widget-launcher";

export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get("siteId");
  const requestedTenantId = request.nextUrl.searchParams.get("tenantId");

  if (!siteId) {
    return noStoreJson({ error: "siteId is required." }, { status: 400 });
  }

  if (isDemoMode()) {
    return noStoreJson(
      getDemoWidgetConfig({
        siteId,
        previewStyle: request.nextUrl.searchParams.get("previewStyle"),
        previewText: request.nextUrl.searchParams.get("previewText"),
        previewPosition: request.nextUrl.searchParams.get("previewPosition"),
        previewBottomOffset: request.nextUrl.searchParams.get("previewBottomOffset"),
        previewHorizontalOffset: request.nextUrl.searchParams.get("previewHorizontalOffset"),
        previewAnchorSelector: request.nextUrl.searchParams.get("previewAnchorSelector"),
        previewAnchorGap: request.nextUrl.searchParams.get("previewAnchorGap"),
      }),
    );
  }

  const db = getDb();
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);

  if (!site) {
    return noStoreJson({ error: "Site not found." }, { status: 404 });
  }

  const origin = request.headers.get("origin") || request.headers.get("referer");
  if (!isAllowedOrigin(origin, site.allowedOrigins)) {
    return noStoreJson({ error: "Origin is not allowed." }, { status: 403 });
  }

  let tenantId = site.defaultTenantId;
  if (requestedTenantId) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, requestedTenantId), eq(tenants.customerId, site.customerId)))
      .limit(1);

    if (!tenant) {
      return noStoreJson({ error: "Tenant not found." }, { status: 404 });
    }

    tenantId = tenant.id;
  }

  return noStoreJson({
    siteId: site.id,
    tenantId,
    customerId: site.customerId,
    widgetName: site.widgetName,
    widgetLogoType: site.widgetLogoType,
    widgetLogoUrl: site.widgetLogoUrl,
    widgetLogoText: site.widgetLogoText,
    launcherText: site.launcherText,
    launcherStyle: site.launcherStyle,
    launcherPosition: normalizeLauncherPosition(site.launcherPosition),
    launcherBottomOffset: normalizeLauncherBottomOffset(site.launcherBottomOffset),
    launcherHorizontalOffset: normalizeLauncherHorizontalOffset(site.launcherHorizontalOffset),
    launcherAnchorSelector: normalizeLauncherAnchorSelector(site.launcherAnchorSelector),
    launcherAnchorGap: normalizeLauncherAnchorGap(site.launcherAnchorGap),
    launcherImageUrl: site.launcherImageUrl,
    launcherBadgeText: site.launcherBadgeText,
    launcherAnimation: site.launcherAnimation,
    widgetAdvancedEnabled: site.widgetAdvancedEnabled,
    widgetCustomCss: site.widgetAdvancedEnabled ? normalizeWidgetCustomCss(site.widgetCustomCss || "") : "",
    widgetCustomJs: site.widgetAdvancedEnabled ? normalizeWidgetCustomJs(site.widgetCustomJs || "") : "",
    welcomeTitle: site.welcomeTitle,
    welcomeMessage: site.welcomeMessage,
    themeColor: site.themeColor,
    suggestedQuestions: site.suggestedQuestions,
    showSources: site.showSources,
    collectLeadEnabled: site.collectLeadEnabled,
    multilingualEnabled: site.multilingualEnabled,
    defaultLocale: site.defaultLocale,
    enabledLocales: site.enabledLocales,
  });
}

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
