import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/widget.js/route";

describe("widget embed script", () => {
  it("uses iframe frame size, not iframe padding, for the closed launcher gutter", async () => {
    const response = GET(new NextRequest("https://www.lopuo.work/widget.js"));
    const script = await response.text();

    expect(script).toContain("var CLOSED_LAUNCHER_INTERACTION_GUTTER = 48;");
    expect(script).toContain("frameHorizontalOffset: horizontalOffset - horizontalGutter");
    expect(script).toContain("frameBottomOffset: bottomOffset - bottomGutter");
    expect(script).toContain('iframe.style.padding = "0";');
    expect(script).not.toContain('iframe.style.paddingLeft = metrics.horizontalGutter + "px";');
    expect(script).not.toContain('iframe.style.paddingRight = metrics.horizontalGutter + "px";');
    expect(script).not.toContain('iframe.style.paddingBottom = metrics.bottomGutter + "px";');
  });
});
