import { load } from "cheerio";
import { and, eq, sql } from "drizzle-orm";

import { getDb, knowledgeChunks, knowledgeSources, sites } from "@/db";
import { embedMany, getEmbeddingModel } from "@/lib/ai/embeddings";
import { chunkText, contentHash, estimateTokenCount, normalizeText } from "@/lib/text";

export type ExtractedPage = {
  title: string;
  content: string;
};

type PageDocument = ExtractedPage & {
  url: string;
};

export async function addKnowledgeSource({
  customerId,
  tenantId,
  siteId,
  url,
}: {
  customerId: string;
  tenantId: string;
  siteId: string;
  url: string;
}) {
  const db = getDb();
  const normalizedUrl = normalizeUrl(url);

  const [source] = await db
    .insert(knowledgeSources)
    .values({
      customerId,
      tenantId,
      siteId,
      url: normalizedUrl,
      status: "pending",
    })
    .onConflictDoUpdate({
      target: [knowledgeSources.tenantId, knowledgeSources.url],
      set: {
        status: "pending",
        lastError: null,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return source;
}

export async function syncKnowledgeSource(sourceId: string, customerId: string) {
  const db = getDb();
  const [source] = await db.query.knowledgeSources.findMany({
    where: and(eq(knowledgeSources.id, sourceId), eq(knowledgeSources.customerId, customerId)),
    limit: 1,
  });

  if (!source) {
    throw new Error("Knowledge source not found.");
  }

  try {
    await db
      .update(knowledgeSources)
      .set({ status: "syncing", lastError: null, updatedAt: sql`now()` })
      .where(eq(knowledgeSources.id, source.id));

    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "Lopuo Signal Bot/0.1",
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }

    const body = await response.text();
    const contentType = response.headers.get("content-type") || "";
    const isSitemap = isSitemapResponse(source.url, contentType, body);
    const sourceTitle = isSitemap ? `Sitemap: ${new URL(source.url).hostname}` : null;
    const pages = isSitemap
      ? await fetchSitemapPages(source.url, body)
      : [{ ...extractPageContent(body, source.url), url: source.url }];

    const chunkRows = dedupePageChunks(
      pages.flatMap((page) =>
        chunkText(page.content).map((chunk) => ({
          page,
          chunk,
          hash: contentHash(chunk),
        })),
      ),
    );

    const embeddings = chunkRows.length ? await embedMany(chunkRows.map((row) => row.chunk)) : [];
    const embeddingModel = getEmbeddingModel();

    await db.transaction(async (tx) => {
      await tx.delete(knowledgeChunks).where(eq(knowledgeChunks.sourceId, source.id));

      if (chunkRows.length > 0) {
        await tx
          .insert(knowledgeChunks)
          .values(
            chunkRows.map((row, index) => ({
              customerId: source.customerId,
              tenantId: source.tenantId,
              siteId: source.siteId,
              sourceId: source.id,
              url: row.page.url,
              title: row.page.title,
              content: row.chunk,
              contentHash: row.hash,
              embedding: embeddings[index],
              embeddingModel,
              tokenCount: estimateTokenCount(row.chunk),
            })),
          )
          .onConflictDoNothing({
            target: [knowledgeChunks.tenantId, knowledgeChunks.contentHash],
          });
      }

      await tx
        .update(knowledgeSources)
        .set({
          title: sourceTitle || pages[0]?.title || source.url,
          status: "synced",
          lastSyncedAt: new Date(),
          lastError: null,
          updatedAt: sql`now()`,
        })
        .where(eq(knowledgeSources.id, source.id));
    });

    return {
      sourceId: source.id,
      title: sourceTitle || pages[0]?.title || source.url,
      pageCount: pages.length,
      chunkCount: chunkRows.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error.";
    await db
      .update(knowledgeSources)
      .set({
        status: "failed",
        lastError: message,
        updatedAt: sql`now()`,
      })
      .where(eq(knowledgeSources.id, source.id));
    throw error;
  }
}

export async function getSiteForOrigin(siteId: string, origin: string | null) {
  const db = getDb();
  const [site] = await db.query.sites.findMany({
    where: eq(sites.id, siteId),
    with: { customer: true },
    limit: 1,
  });

  if (!site) {
    return null;
  }

  return { site, origin };
}

export function extractPageContent(html: string, url: string): ExtractedPage {
  const $ = load(html);

  $("script, style, noscript, svg, canvas, iframe, nav, footer, header, aside, form").remove();
  $("[aria-hidden='true'], [hidden]").remove();

  const title =
    normalizeText($("title").first().text()) ||
    normalizeText($("h1").first().text()) ||
    new URL(url).hostname;

  const bodyText = normalizeText(
    $("main").text() ||
      $("article").text() ||
      $("body").text(),
  );

  return {
    title,
    content: bodyText,
  };
}

export function normalizeUrl(url: string) {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.toString();
}

export function isSitemapUrl(url: string) {
  const pathname = new URL(url).pathname.toLowerCase();
  return pathname.endsWith(".xml") || pathname.includes("sitemap");
}

export function extractSitemapLocs(xml: string) {
  const $ = load(xml, { xmlMode: true });
  return $("loc")
    .toArray()
    .map((element) => normalizeText($(element).text()))
    .filter(Boolean);
}

function isSitemapResponse(url: string, contentType: string, body: string) {
  const trimmed = body.trimStart();
  return (
    isSitemapUrl(url) ||
    contentType.includes("xml") ||
    trimmed.startsWith("<?xml") ||
    trimmed.startsWith("<urlset") ||
    trimmed.startsWith("<sitemapindex")
  );
}

async function fetchSitemapPages(sourceUrl: string, sitemapXml: string) {
  const maxPages = Number(process.env.SITEMAP_MAX_URLS || 50);
  const pageUrls = await collectSitemapPageUrls(sourceUrl, sitemapXml, maxPages, new Set<string>());
  const pages: PageDocument[] = [];
  const failures: string[] = [];

  for (const url of pageUrls.slice(0, maxPages)) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Lopuo Signal Bot/0.1",
        },
      });

      if (!response.ok) {
        failures.push(`${url} (${response.status})`);
        continue;
      }

      const html = await response.text();
      const page = extractPageContent(html, url);
      if (page.content) {
        pages.push({ ...page, url });
      }
    } catch (error) {
      failures.push(error instanceof Error ? `${url} (${error.message})` : url);
    }
  }

  if (pages.length === 0) {
    throw new Error(failures.length ? `Sitemap pages failed: ${failures.slice(0, 3).join("; ")}` : "Sitemap has no crawlable page URLs.");
  }

  return pages;
}

async function collectSitemapPageUrls(sourceUrl: string, sitemapXml: string, maxPages: number, visited: Set<string>): Promise<string[]> {
  const sourceOrigin = new URL(sourceUrl).origin;
  const locs = uniqueUrls(
    extractSitemapLocs(sitemapXml)
      .map((loc) => safeAbsoluteUrl(loc, sourceUrl))
      .filter((url): url is string => Boolean(url))
      .filter((url) => new URL(url).origin === sourceOrigin),
  );

  const pageUrls = locs.filter((url) => !isSitemapUrl(url));
  const sitemapUrls = locs.filter((url) => isSitemapUrl(url));

  for (const sitemapUrl of sitemapUrls) {
    if (pageUrls.length >= maxPages || visited.has(sitemapUrl)) {
      continue;
    }

    visited.add(sitemapUrl);
    const response = await fetch(sitemapUrl, {
      headers: {
        "User-Agent": "Lopuo Signal Bot/0.1",
      },
    });

    if (!response.ok) {
      continue;
    }

    const nestedXml = await response.text();
    pageUrls.push(...(await collectSitemapPageUrls(sitemapUrl, nestedXml, maxPages - pageUrls.length, visited)));
  }

  return uniqueUrls(pageUrls).slice(0, maxPages);
}

function safeAbsoluteUrl(url: string, baseUrl: string) {
  try {
    return normalizeUrl(new URL(url, baseUrl).toString());
  } catch {
    return null;
  }
}

function uniqueUrls(urls: string[]) {
  return Array.from(new Set(urls));
}

function dedupePageChunks(rows: Array<{ page: PageDocument; chunk: string; hash: string }>) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.hash)) {
      return false;
    }
    seen.add(row.hash);
    return true;
  });
}
