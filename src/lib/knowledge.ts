import { load } from "cheerio";
import { and, eq, sql } from "drizzle-orm";

import { getDb, knowledgeChunks, knowledgeSources, sites } from "@/db";
import { embedMany, getEmbeddingModel } from "@/lib/ai/embeddings";
import { chunkText, contentHash, estimateTokenCount, normalizeText } from "@/lib/text";

export type ExtractedPage = {
  title: string;
  content: string;
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
        "User-Agent": "Lopuo AI Customer Service Bot/0.1",
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const page = extractPageContent(html, source.url);
    const chunks = chunkText(page.content);
    const uniqueChunks = dedupeChunks(chunks);
    const embeddings = await embedMany(uniqueChunks);
    const embeddingModel = getEmbeddingModel();

    await db.transaction(async (tx) => {
      await tx.delete(knowledgeChunks).where(eq(knowledgeChunks.sourceId, source.id));

      if (uniqueChunks.length > 0) {
        await tx.insert(knowledgeChunks).values(
          uniqueChunks.map((chunk, index) => ({
            customerId: source.customerId,
            tenantId: source.tenantId,
            siteId: source.siteId,
            sourceId: source.id,
            url: source.url,
            title: page.title,
            content: chunk,
            contentHash: contentHash(chunk),
            embedding: embeddings[index],
            embeddingModel,
            tokenCount: estimateTokenCount(chunk),
          })),
        );
      }

      await tx
        .update(knowledgeSources)
        .set({
          title: page.title,
          status: "synced",
          lastSyncedAt: new Date(),
          lastError: null,
          updatedAt: sql`now()`,
        })
        .where(eq(knowledgeSources.id, source.id));
    });

    return {
      sourceId: source.id,
      title: page.title,
      chunkCount: uniqueChunks.length,
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

function dedupeChunks(chunks: string[]) {
  const seen = new Set<string>();
  return chunks.filter((chunk) => {
    const hash = contentHash(chunk);
    if (seen.has(hash)) {
      return false;
    }
    seen.add(hash);
    return true;
  });
}
