import { WidgetApp } from "@/components/widget/widget-app";

export const dynamic = "force-dynamic";

export default async function WidgetPage({
  searchParams,
}: {
  searchParams: Promise<{
    siteId?: string;
    tenantId?: string;
    locale?: string;
    previewStyle?: string;
    previewText?: string;
    previewPosition?: string;
    previewBottomOffset?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <>
      <style>{`
        html,
        body {
          background: transparent !important;
          color-scheme: normal;
        }

        body {
          margin: 0;
          min-height: 100dvh;
          overflow: hidden;
        }
      `}</style>
      <WidgetApp
        siteId={params.siteId || ""}
        tenantId={params.tenantId || ""}
        requestedLocale={params.locale || ""}
        previewStyle={params.previewStyle || ""}
        previewText={params.previewText || ""}
        previewPosition={params.previewPosition || ""}
        previewBottomOffset={params.previewBottomOffset || ""}
      />
    </>
  );
}
