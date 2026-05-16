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
  var locale = currentScript && currentScript.dataset ? currentScript.dataset.locale : "";
  var previewStyle = currentScript && currentScript.dataset ? currentScript.dataset.previewStyle : "";
  var previewText = currentScript && currentScript.dataset ? currentScript.dataset.previewText : "";
  var previewPosition = currentScript && currentScript.dataset ? currentScript.dataset.previewPosition : "";
  var previewHorizontalOffset = currentScript && currentScript.dataset ? currentScript.dataset.previewHorizontalOffset : "";
  var previewBottomOffset = currentScript && currentScript.dataset ? currentScript.dataset.previewBottomOffset : "";
  var previewAnchorSelector = currentScript && currentScript.dataset ? currentScript.dataset.previewAnchorSelector : "";
  var previewAnchorGap = currentScript && currentScript.dataset ? currentScript.dataset.previewAnchorGap : "";
  var launcherPosition = currentScript && currentScript.dataset ? currentScript.dataset.launcherPosition : "";
  var launcherHorizontalOffset = currentScript && currentScript.dataset ? currentScript.dataset.launcherHorizontalOffset : "";
  var launcherBottomOffset = currentScript && currentScript.dataset ? currentScript.dataset.launcherBottomOffset : "";
  var launcherAnchorSelector = currentScript && currentScript.dataset ? currentScript.dataset.launcherAnchorSelector : "";
  var launcherAnchorGap = currentScript && currentScript.dataset ? currentScript.dataset.launcherAnchorGap : "";
  var CLOSED_LAUNCHER_INTERACTION_GUTTER = 48;
  var lastFrameState = {
    isOpen: false,
    launcherStyle: previewStyle,
    launcherPosition: previewPosition || launcherPosition,
    launcherHorizontalOffset: previewHorizontalOffset || launcherHorizontalOffset,
    launcherBottomOffset: previewBottomOffset || launcherBottomOffset,
    launcherAnchorSelector: previewAnchorSelector || launcherAnchorSelector,
    launcherAnchorGap: previewAnchorGap || launcherAnchorGap
  };
  function normalizeLauncherStyle(style) {
    return style === "pill" || style === "vertical" || style === "mascot" ? style : "";
  }
  function normalizeLauncherPosition(position) {
    return position === "bottom-left" || position === "bottom-right" ? position : "";
  }
  function normalizeOffset(offset) {
    var parsed = parseInt(offset, 10);
    if (!Number.isFinite(parsed)) {
      return 20;
    }
    return Math.min(240, Math.max(0, Math.round(parsed)));
  }
  function normalizeAnchorSelector(selector) {
    selector = String(selector || "").trim().slice(0, 120);
    if (!selector) return "";
    return /^(?:[.#][A-Za-z0-9_-]{1,80}|\\[data-[A-Za-z0-9_-]{1,64}(?:=[A-Za-z0-9_-]{1,64})?\\])$/.test(selector) ? selector : "";
  }
  function normalizeAnchorGap(gap) {
    var parsed = parseInt(gap, 10);
    if (!Number.isFinite(parsed)) {
      return 8;
    }
    return Math.min(80, Math.max(0, Math.round(parsed)));
  }
  function resolveResponsiveOffset(offset) {
    var normalized = normalizeOffset(offset);
    if (normalized <= 18) {
      return normalized;
    }
    return Math.min(normalized, Math.max(18, Math.round(window.innerWidth * 0.024)));
  }
  function getLauncherVisualSize(style) {
    if (style === "pill") return { width: 244, height: 64 };
    if (style === "mascot") return { width: 52, height: 52 };
    return { width: 64, height: 154 };
  }
  function getFrameMetrics(style, horizontalOffset, bottomOffset) {
    var visualSize = getLauncherVisualSize(style);
    var horizontalGutter = CLOSED_LAUNCHER_INTERACTION_GUTTER;
    var bottomGutter = CLOSED_LAUNCHER_INTERACTION_GUTTER;
    return {
      visualWidth: visualSize.width,
      visualHeight: visualSize.height,
      horizontalGutter: horizontalGutter,
      bottomGutter: bottomGutter,
      frameWidth: visualSize.width + horizontalGutter * 2,
      frameHeight: visualSize.height + bottomGutter * 2,
      frameHorizontalOffset: horizontalOffset - horizontalGutter,
      frameBottomOffset: bottomOffset - bottomGutter
    };
  }
  function resolveAnchorPosition(position, selector, gap, metrics) {
    selector = normalizeAnchorSelector(selector);
    if (!selector || window.innerWidth < 640) {
      return null;
    }

    var anchor;
    try {
      anchor = document.querySelector(selector);
    } catch (error) {
      return null;
    }
    if (!anchor) {
      return null;
    }
    var style = window.getComputedStyle(anchor);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) <= 0.05) {
      return null;
    }

    var rect = anchor.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) {
      return null;
    }

    var sideOffset = position === "bottom-left" ? rect.left : window.innerWidth - rect.right;
    var bottomOffset = Math.max(0, window.innerHeight - rect.top + normalizeAnchorGap(gap));
    return {
      horizontalOffset: Math.round(sideOffset),
      bottomOffset: Math.round(bottomOffset),
      frameHorizontalOffset: Math.round(sideOffset) - metrics.horizontalGutter,
      frameBottomOffset: Math.round(bottomOffset) - metrics.bottomGutter
    };
  }
  function applyHorizontalPosition(position, offset) {
    if (position === "bottom-left") {
      iframe.style.left = offset;
      iframe.style.right = "";
    } else {
      iframe.style.left = "";
      iframe.style.right = offset;
    }
  }
  function applyClosedAlignment(position, metrics) {
    if (position === "bottom-left") {
      iframe.style.justifyItems = "start";
      iframe.style.alignItems = "end";
      iframe.style.paddingLeft = metrics.horizontalGutter + "px";
      iframe.style.paddingRight = metrics.horizontalGutter + "px";
    } else {
      iframe.style.justifyItems = "end";
      iframe.style.alignItems = "end";
      iframe.style.paddingLeft = metrics.horizontalGutter + "px";
      iframe.style.paddingRight = metrics.horizontalGutter + "px";
    }
    iframe.style.paddingTop = metrics.bottomGutter + "px";
    iframe.style.paddingBottom = metrics.bottomGutter + "px";
  }
  function applyFrameState(isOpen, launcherStyle, launcherPosition, horizontalOffset, bottomOffset, anchorSelector, anchorGap) {
    var normalizedStyle = normalizeLauncherStyle(launcherStyle) || "vertical";
    var normalizedPosition = normalizeLauncherPosition(launcherPosition) || "bottom-right";
    var normalizedHorizontal = resolveResponsiveOffset(horizontalOffset);
    var normalizedBottom = normalizeOffset(bottomOffset);
    var metrics = getFrameMetrics(normalizedStyle, normalizedHorizontal, normalizedBottom);
    var anchorPosition = resolveAnchorPosition(normalizedPosition, anchorSelector, anchorGap, metrics);
    var frameHorizontalOffset = anchorPosition ? anchorPosition.frameHorizontalOffset : metrics.frameHorizontalOffset;
    var frameBottomOffset = anchorPosition ? anchorPosition.frameBottomOffset : metrics.frameBottomOffset;
    var closedHorizontal = frameHorizontalOffset + "px";
    var closedBottom = frameBottomOffset + "px";
    var openHorizontal = (anchorPosition ? anchorPosition.horizontalOffset : normalizedHorizontal) + "px";
    var openBottom = normalizedBottom + "px";
    var isMobile = window.innerWidth < 640;
    lastFrameState = {
      isOpen: isOpen,
      launcherStyle: normalizedStyle,
      launcherPosition: normalizedPosition,
      launcherHorizontalOffset: horizontalOffset,
      launcherBottomOffset: bottomOffset,
      launcherAnchorSelector: anchorSelector,
      launcherAnchorGap: anchorGap
    };
    if (isOpen && isMobile) {
      iframe.style.left = "0";
      iframe.style.right = "";
      iframe.style.bottom = "0";
      iframe.style.width = "100vw";
      iframe.style.height = "100dvh";
      iframe.style.borderRadius = "0";
      iframe.style.display = "block";
      iframe.style.padding = "0";
    } else if (isOpen) {
      applyHorizontalPosition(normalizedPosition, openHorizontal);
      iframe.style.bottom = openBottom;
      iframe.style.width = "400px";
      iframe.style.height = "640px";
      iframe.style.borderRadius = "0";
      iframe.style.display = "block";
      iframe.style.padding = "0";
    } else {
      applyHorizontalPosition(normalizedPosition, closedHorizontal);
      iframe.style.bottom = closedBottom;
      iframe.style.borderRadius = "0";
      iframe.style.background = "transparent";
      iframe.style.backgroundColor = "transparent";
      iframe.style.boxShadow = "none";
      iframe.style.display = "grid";
      iframe.style.width = metrics.frameWidth + "px";
      iframe.style.height = metrics.frameHeight + "px";
      applyClosedAlignment(normalizedPosition, metrics);
    }
  }
  function refreshFramePosition() {
    applyFrameState(
      lastFrameState.isOpen,
      lastFrameState.launcherStyle,
      lastFrameState.launcherPosition,
      lastFrameState.launcherHorizontalOffset,
      lastFrameState.launcherBottomOffset,
      lastFrameState.launcherAnchorSelector,
      lastFrameState.launcherAnchorGap
    );
  }
  function scheduleFrameRefresh() {
    if (scheduleFrameRefresh.queued) return;
    scheduleFrameRefresh.queued = true;
    window.requestAnimationFrame(function () {
      scheduleFrameRefresh.queued = false;
      refreshFramePosition();
    });
  }
  var iframe = document.createElement("iframe");
  iframe.title = "Lopuo Signal AI 营销助手";
  iframe.src = widgetOrigin + "/widget?siteId=" + encodeURIComponent(siteId || "") + "&tenantId=" + encodeURIComponent(tenantId || "") + "&locale=" + encodeURIComponent(locale || "") + "&previewStyle=" + encodeURIComponent(previewStyle || "") + "&previewText=" + encodeURIComponent(previewText || "") + "&previewPosition=" + encodeURIComponent(previewPosition || launcherPosition || "") + "&previewHorizontalOffset=" + encodeURIComponent(previewHorizontalOffset || launcherHorizontalOffset || "") + "&previewBottomOffset=" + encodeURIComponent(previewBottomOffset || launcherBottomOffset || "") + "&previewAnchorSelector=" + encodeURIComponent(previewAnchorSelector || launcherAnchorSelector || "") + "&previewAnchorGap=" + encodeURIComponent(previewAnchorGap || launcherAnchorGap || "");
  iframe.style.position = "fixed";
  iframe.style.right = "20px";
  iframe.style.bottom = normalizeOffset(previewBottomOffset || launcherBottomOffset) + "px";
  iframe.style.border = "0";
  iframe.style.zIndex = "2147483647";
  iframe.style.colorScheme = "normal";
  iframe.style.background = "transparent";
  iframe.style.backgroundColor = "transparent";
  iframe.style.boxShadow = "none";
  iframe.style.borderRadius = "0";
  iframe.style.overflow = "visible";
  iframe.style.transition = "width 180ms ease, height 180ms ease, left 180ms ease, right 180ms ease, bottom 180ms ease";
  iframe.setAttribute("allow", "clipboard-write");
  applyFrameState(
    false,
    previewStyle,
    previewPosition || launcherPosition,
    previewHorizontalOffset || launcherHorizontalOffset,
    previewBottomOffset || launcherBottomOffset,
    previewAnchorSelector || launcherAnchorSelector,
    previewAnchorGap || launcherAnchorGap
  );
  document.body.appendChild(iframe);
  window.addEventListener("resize", scheduleFrameRefresh, { passive: true });
  window.addEventListener("scroll", scheduleFrameRefresh, { passive: true });

  window.addEventListener("message", function (event) {
    if (event.origin !== widgetOrigin || !event.data || event.data.type !== "lopuo-ai-widget-resize") {
      return;
    }
    var isOpen = Boolean(event.data.open);
    applyFrameState(
      isOpen,
      event.data.launcherStyle,
      event.data.launcherPosition,
      event.data.launcherHorizontalOffset,
      event.data.launcherBottomOffset,
      event.data.launcherAnchorSelector,
      event.data.launcherAnchorGap
    );
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
