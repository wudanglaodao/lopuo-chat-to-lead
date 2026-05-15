import { describe, expect, it } from "vitest";

import {
  getLauncherFrameMetrics,
  normalizeLauncherBottomOffset,
  normalizeLauncherAnchorGap,
  normalizeLauncherAnchorSelector,
  normalizeLauncherHorizontalOffset,
  normalizeLauncherPosition,
  normalizeWidgetCustomCss,
  normalizeWidgetCustomJs,
  resolveResponsiveLauncherOffset,
} from "@/lib/widget-launcher";

describe("widget launcher settings", () => {
  it("normalizes launcher position", () => {
    expect(normalizeLauncherPosition("bottom-left")).toBe("bottom-left");
    expect(normalizeLauncherPosition("bottom-right")).toBe("bottom-right");
    expect(normalizeLauncherPosition("top-right")).toBe("bottom-right");
    expect(normalizeLauncherPosition("")).toBe("bottom-right");
  });

  it("normalizes bottom and horizontal offsets", () => {
    expect(normalizeLauncherBottomOffset("80")).toBe(80);
    expect(normalizeLauncherBottomOffset("-10")).toBe(0);
    expect(normalizeLauncherBottomOffset("999")).toBe(240);
    expect(normalizeLauncherBottomOffset("bad")).toBe(20);

    expect(normalizeLauncherHorizontalOffset("36")).toBe(36);
    expect(normalizeLauncherHorizontalOffset("-1")).toBe(0);
    expect(normalizeLauncherHorizontalOffset("260")).toBe(240);
    expect(normalizeLauncherHorizontalOffset(null)).toBe(34);
  });

  it("normalizes anchor based positioning inputs", () => {
    expect(normalizeLauncherAnchorSelector(".lopuo-scroll-top")).toBe(".lopuo-scroll-top");
    expect(normalizeLauncherAnchorSelector("#chatDock")).toBe("#chatDock");
    expect(normalizeLauncherAnchorSelector("[data-floating-action]")).toBe("[data-floating-action]");
    expect(normalizeLauncherAnchorSelector("body .bad")).toBe("");
    expect(normalizeLauncherAnchorSelector("script")).toBe("");

    expect(normalizeLauncherAnchorGap("12")).toBe(12);
    expect(normalizeLauncherAnchorGap("-4")).toBe(0);
    expect(normalizeLauncherAnchorGap("140")).toBe(80);
    expect(normalizeLauncherAnchorGap("bad")).toBe(8);
  });

  it("resolves responsive offsets and frame metrics around the visible launcher edge", () => {
    expect(resolveResponsiveLauncherOffset(34, 1440)).toBe(34);
    expect(resolveResponsiveLauncherOffset(34, 390)).toBe(18);
    expect(resolveResponsiveLauncherOffset(12, 390)).toBe(12);

    expect(
      getLauncherFrameMetrics({
        launcherStyle: "vertical",
        launcherPosition: "bottom-right",
        launcherHorizontalOffset: 34,
        launcherBottomOffset: 80,
      }),
    ).toMatchObject({
      frameWidth: 112,
      frameHeight: 202,
      frameHorizontalOffset: 10,
      frameBottomOffset: 56,
    });
  });

  it("keeps only controlled custom css", () => {
    expect(
      normalizeWidgetCustomCss(`
        .lopuo-widget-launcher {
          border-radius: 999px;
          background-color: #ffffff;
          background-image: url(https://example.com/a.png);
        }
      `),
    ).toBe(".lopuo-widget-launcher {\n  border-radius: 999px;\n  background-color: #ffffff;\n}");

    expect(normalizeWidgetCustomCss("<style>.lopuo-widget { color: red; }</style>")).toBe("");
    expect(normalizeWidgetCustomCss("color: #111318; opacity: 0.9;")).toBe(".lopuo-widget {\n  color: #111318;\n  opacity: 0.9;\n}");
  });

  it("keeps only controlled custom js hooks", () => {
    expect(
      normalizeWidgetCustomJs(`
        onReady: data=lopuo-ready
        onOpen: track=widget_open
        onClose: class=widget-closed
        onReady: eval=alert
      `),
    ).toBe("onReady: data=lopuo-ready\nonOpen: track=widget_open\nonClose: class=widget-closed");

    expect(normalizeWidgetCustomJs("<script>alert(1)</script>")).toBe("");
    expect(normalizeWidgetCustomJs("onOpen: track=https://example.com")).toBe("");
  });
});
