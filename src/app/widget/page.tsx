import { WidgetApp } from "@/components/widget/widget-app";

export const dynamic = "force-dynamic";

export default async function WidgetPage({
  searchParams,
}: {
  searchParams: Promise<{ siteId?: string; tenantId?: string; previewStyle?: string; previewText?: string }>;
}) {
  const params = await searchParams;
  return (
    <WidgetApp
      siteId={params.siteId || ""}
      tenantId={params.tenantId || ""}
      previewStyle={params.previewStyle || ""}
      previewText={params.previewText || ""}
    />
  );
}
