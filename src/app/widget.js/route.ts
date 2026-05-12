import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;
  const script = `
(function () {
  var currentScript = document.currentScript;
  var siteId = currentScript && currentScript.dataset ? currentScript.dataset.siteId : "";
  var tenantId = currentScript && currentScript.dataset ? currentScript.dataset.tenantId : "";
  var previewStyle = currentScript && currentScript.dataset ? currentScript.dataset.previewStyle : "";
  var previewText = currentScript && currentScript.dataset ? currentScript.dataset.previewText : "";
  var iframe = document.createElement("iframe");
  iframe.title = "AI 客服助手";
  iframe.src = ${JSON.stringify(baseUrl)} + "/widget?siteId=" + encodeURIComponent(siteId || "") + "&tenantId=" + encodeURIComponent(tenantId || "") + "&previewStyle=" + encodeURIComponent(previewStyle || "") + "&previewText=" + encodeURIComponent(previewText || "");
  iframe.style.position = "fixed";
  iframe.style.right = "20px";
  iframe.style.bottom = "20px";
  iframe.style.width = "92px";
  iframe.style.height = "92px";
  iframe.style.border = "0";
  iframe.style.zIndex = "2147483647";
  iframe.style.colorScheme = "normal";
  iframe.style.background = "transparent";
  iframe.style.transition = "width 180ms ease, height 180ms ease, right 180ms ease, bottom 180ms ease";
  iframe.setAttribute("allow", "clipboard-write");
  document.body.appendChild(iframe);

  window.addEventListener("message", function (event) {
    if (event.origin !== ${JSON.stringify(baseUrl)} || !event.data || event.data.type !== "lopuo-ai-widget-resize") {
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
    } else if (isOpen) {
      iframe.style.right = "24px";
      iframe.style.bottom = "24px";
      iframe.style.width = "440px";
      iframe.style.height = "680px";
    } else {
      iframe.style.right = "20px";
      iframe.style.bottom = "20px";
      if (launcherStyle === "pill") {
        iframe.style.width = "292px";
        iframe.style.height = "118px";
      } else if (launcherStyle === "vertical") {
        iframe.style.width = "104px";
        iframe.style.height = "204px";
      } else {
        iframe.style.width = "128px";
        iframe.style.height = "128px";
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
