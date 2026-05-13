import { describe, expect, it } from "vitest";

import { extractPageContent, extractSitemapLocs, isSitemapUrl, normalizeUrl } from "./knowledge";

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

  it("keeps contact-like aside content during page extraction", () => {
    const page = extractPageContent(
      `
        <html>
          <head><title>联系 Lopuo</title></head>
          <body>
            <main>
              <h1>联系我们</h1>
              <aside class="contact-panel" aria-label="联系方式">
                <a href="https://line.me/ti/p/VBKMBIn6bl"><strong>Line</strong><small>luopu01</small></a>
                <a href="https://wa.me/8618709166166"><strong>WhatsApp</strong><small>发送项目咨询</small></a>
                <a href="mailto:info@lopuo.com"><strong>邮箱</strong><small>info@lopuo.com</small></a>
                <a href="https://go.example/card"><strong>WeChat</strong><small>wixhelper</small></a>
              </aside>
            </main>
          </body>
        </html>
      `,
      "https://www.lopuo.com/contact/",
    );

    expect(page.content).toContain("Line: luopu01");
    expect(page.content).toContain("WhatsApp: 8618709166166");
    expect(page.content).toContain("邮箱: info@lopuo.com");
    expect(page.content).toContain("WeChat/微信: wixhelper");
  });

  it("removes generic aside content to avoid noisy recommendations", () => {
    const page = extractPageContent(
      `
        <html>
          <head><title>服务</title></head>
          <body>
            <main>
              <h1>核心服务</h1>
              <p>我们提供 Web/App 应用开发。</p>
              <aside class="related-posts">相关文章 旧活动 链接列表</aside>
            </main>
          </body>
        </html>
      `,
      "https://www.lopuo.com/services/",
    );

    expect(page.content).toContain("Web/App 应用开发");
    expect(page.content).not.toContain("旧活动");
  });
});
