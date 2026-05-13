import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const protocol = forwardedProto || request.nextUrl.protocol.replace(":", "");
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  const fallbackBaseUrl = `${protocol}://${host}`;
  const script = `
(function () {
  var currentScript = document.currentScript;
  var widgetOrigin = ${JSON.stringify(fallbackBaseUrl)};
  try {
    widgetOrigin = new URL(currentScript && currentScript.src ? currentScript.src : widgetOrigin, window.location.href).origin;
  } catch (error) {}
  var siteId = currentScript && currentScript.dataset ? currentScript.dataset.siteId : "";
  var tenantId = currentScript && currentScript.dataset ? currentScript.dataset.tenantId : "";
  var previewStyle = currentScript && currentScript.dataset ? currentScript.dataset.previewStyle : "";
  var previewText = currentScript && currentScript.dataset ? currentScript.dataset.previewText : "";
  var iframe = document.createElement("iframe");
  iframe.title = "Lopuo Signal AI 营销助手";
  iframe.src = widgetOrigin + "/widget?siteId=" + encodeURIComponent(siteId || "") + "&tenantId=" + encodeURIComponent(tenantId || "") + "&previewStyle=" + encodeURIComponent(previewStyle || "") + "&previewText=" + encodeURIComponent(previewText || "");
  iframe.style.position = "fixed";
  iframe.style.right = "20px";
  iframe.style.bottom = "20px";
  iframe.style.width = "96px";
  iframe.style.height = "196px";
  iframe.style.border = "0";
  iframe.style.zIndex = "2147483647";
  iframe.style.colorScheme = "normal";
  iframe.style.background = "transparent";
  iframe.style.backgroundColor = "transparent";
  iframe.style.boxShadow = "none";
  iframe.style.borderRadius = "0";
  iframe.style.overflow = "visible";
  iframe.style.transition = "width 180ms ease, height 180ms ease, right 180ms ease, bottom 180ms ease";
  iframe.setAttribute("allow", "clipboard-write");
  document.body.appendChild(iframe);

  window.addEventListener("message", function (event) {
    if (event.origin !== widgetOrigin || !event.data || event.data.type !== "lopuo-ai-widget-resize") {
      return;
    }
    var isOpen = Boolean(event.data.open);
    var launcherStyle = event.data.launcherStyle || "vertical";
    var isMobile = window.innerWidth < 640;
    if (isOpen && isMobile) {
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "100vw";
      iframe.style.height = "100dvh";
      iframe.style.borderRadius = "0";
    } else if (isOpen) {
      iframe.style.right = "24px";
      iframe.style.bottom = "24px";
      iframe.style.width = "400px";
      iframe.style.height = "640px";
      iframe.style.borderRadius = "0";
    } else {
      iframe.style.right = "20px";
      iframe.style.bottom = "20px";
      iframe.style.borderRadius = "0";
      iframe.style.background = "transparent";
      iframe.style.backgroundColor = "transparent";
      iframe.style.boxShadow = "none";
      if (launcherStyle === "pill") {
        iframe.style.width = "276px";
        iframe.style.height = "92px";
      } else if (launcherStyle === "vertical") {
        iframe.style.width = "96px";
        iframe.style.height = "196px";
      } else {
        iframe.style.width = "76px";
        iframe.style.height = "76px";
      }
    }
  });
})();
`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
