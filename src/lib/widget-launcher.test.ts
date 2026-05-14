import { describe, expect, it } from "vitest";

import {
  normalizeLauncherBottomOffset,
  normalizeLauncherHorizontalOffset,
  normalizeLauncherPosition,
  normalizeWidgetCustomCss,
  normalizeWidgetCustomJs,
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
    expect(normalizeLauncherHorizontalOffset(null)).toBe(20);
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
