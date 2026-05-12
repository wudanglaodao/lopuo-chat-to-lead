import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getDb, sites } from "@/db";
import { getDemoWidgetConfig, isDemoMode } from "@/lib/demo-mode";
import { isAllowedOrigin } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get("siteId");

  if (!siteId) {
    return NextResponse.json({ error: "siteId is required." }, { status: 400 });
  }

  if (isDemoMode()) {
    return NextResponse.json(
      getDemoWidgetConfig({
        siteId,
        previewStyle: request.nextUrl.searchParams.get("previewStyle"),
        previewText: request.nextUrl.searchParams.get("previewText"),
      }),
    );
  }

  const db = getDb();
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);

  if (!site) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  const origin = request.headers.get("origin") || request.headers.get("referer");
  if (!isAllowedOrigin(origin, site.allowedOrigins)) {
    return NextResponse.json({ error: "Origin is not allowed." }, { status: 403 });
  }

  return NextResponse.json({
    siteId: site.id,
    customerId: site.customerId,
    widgetName: site.widgetName,
    launcherText: site.launcherText,
    launcherStyle: site.launcherStyle,
    launcherImageUrl: site.launcherImageUrl,
    launcherBadgeText: site.launcherBadgeText,
    launcherAnimation: site.launcherAnimation,
    welcomeMessage: site.welcomeMessage,
    themeColor: site.themeColor,
    suggestedQuestions: site.suggestedQuestions,
    showSources: site.showSources,
    collectLeadEnabled: site.collectLeadEnabled,
  });
}
