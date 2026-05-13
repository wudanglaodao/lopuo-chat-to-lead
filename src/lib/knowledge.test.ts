import { describe, expect, it } from "vitest";

import { extractSitemapLocs, isSitemapUrl, normalizeUrl } from "./knowledge";

describe("knowledge source utilities", () => {
  it("detects sitemap source urls", () => {
    expect(isSitemapUrl("https://www.lopuo.com/sitemap.xml")).toBe(true);
    expect(isSitemapUrl("https://www.lopuo.com/product")).toBe(false);
  });

  it("extracts sitemap loc entries", () => {
    const locs = extractSitemapLocs(`
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset>
        <url><loc>https://www.lopuo.com/</loc></url>
        <url><loc>https://www.lopuo.com/about</loc></url>
      </urlset>
    `);

    expect(locs).toEqual(["https://www.lopuo.com/", "https://www.lopuo.com/about"]);
  });

  it("normalizes source urls without hash fragments", () => {
    expect(normalizeUrl("https://www.lopuo.com/about#team")).toBe("https://www.lopuo.com/about");
  });
});
