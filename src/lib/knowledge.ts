import { load, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import { and, eq, sql } from "drizzle-orm";

import { getDb, knowledgeChunks, knowledgeSources, sites } from "@/db";
import { generateChatAnswer, type ChatMessage } from "@/lib/ai/chat";
import { embedMany, getEmbeddingModel } from "@/lib/ai/embeddings";
import { chunkText, contentHash, estimateTokenCount, normalizeText } from "@/lib/text";

export type ExtractedPage = {
  title: string;
  content: string;
};

type PageDocument = ExtractedPage & {
  url: string;
};

type ExtractedFact = {
  type: string;
  label: string;
  value: string;
  url?: string | null;
};

type LlmFactPayload = {
  contacts?: ExtractedFact[];
  facts?: ExtractedFact[];
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
      : [await extractPageDocument(body, source.url)];

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
  const deterministicFacts = extractDeterministicFacts($, url);

  $("script, style, noscript, svg, canvas, iframe, nav, footer, header, form").remove();
  $("aside").each((_, element) => {
    if (!isContactLikeElement($, element)) {
      $(element).remove();
    }
  });
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
  const factsText = formatExtractedFacts("结构化页面信息", deterministicFacts);

  return {
    title,
    content: [factsText, bodyText].filter(Boolean).join("\n\n"),
  };
}

async function extractPageDocument(html: string, url: string): Promise<PageDocument> {
  const page = extractPageContent(html, url);
  const llmFacts = await extractVerifiedLlmFacts(html, url);
  const llmFactsText = formatExtractedFacts("AI 结构化页面事实（已通过原文校验）", llmFacts);

  return {
    ...page,
    url,
    content: [llmFactsText, page.content].filter(Boolean).join("\n\n"),
  };
}

function extractDeterministicFacts($: CheerioAPI, pageUrl: string) {
  const facts: ExtractedFact[] = [];

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href")?.trim();
    if (!href) return;

    const lines = textLines($, element);
    const fact = factFromLink(href, safeAbsoluteUrl(href, pageUrl) || href, lines);
    if (fact) {
      facts.push(fact);
    }
  });

  $("[class], [id], [aria-label], address").each((_, element) => {
    if (!isContactLikeElement($, element)) return;
    facts.push(...factsFromText(textLines($, element).join("\n")));
  });

  return dedupeExtractedFacts(facts);
}

function factFromLink(href: string, absoluteHref: string, lines: string[]): ExtractedFact | null {
  const hrefLower = href.toLowerCase();
  const text = lines.join(" ");

  if (hrefLower.startsWith("mailto:")) {
    const email = href.replace(/^mailto:/i, "").split("?")[0];
    return makeFact("contact", "邮箱", email, absoluteHref);
  }

  if (hrefLower.startsWith("tel:")) {
    const phone = href.replace(/^tel:/i, "").split("?")[0];
    return makeFact("contact", "电话", phone, absoluteHref);
  }

  if (/(^|\/\/)(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(absoluteHref)) {
    return makeFact("contact", "WhatsApp", extractPhoneLikeValue(absoluteHref) || valueAfterLabel(lines, ["whatsapp"]) || absoluteHref, absoluteHref);
  }

  if (/line\.me/i.test(absoluteHref)) {
    return makeFact("contact", "Line", valueAfterLabel(lines, ["line"]) || absoluteHref, absoluteHref);
  }

  if (/(wechat|微信|wx\b)/i.test(text)) {
    return makeFact("contact", "WeChat/微信", valueAfterLabel(lines, ["wechat", "微信", "wx"]) || absoluteHref, absoluteHref);
  }

  if (isSocialUrl(absoluteHref)) {
    return makeFact("social", socialLabel(absoluteHref), text || absoluteHref, absoluteHref);
  }

  return null;
}

function factsFromText(input: string) {
  const facts: ExtractedFact[] = [];
  const text = normalizeText(input);
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  for (const email of text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []) {
    facts.push(makeFact("contact", "邮箱", email));
  }

  const wechat = valueAfterLabel(lines, ["wechat", "微信", "wx"]);
  if (wechat) {
    facts.push(makeFact("contact", "WeChat/微信", wechat));
  }

  const line = valueAfterLabel(lines, ["line"]);
  if (line) {
    facts.push(makeFact("contact", "Line", line));
  }

  const whatsapp = valueAfterLabel(lines, ["whatsapp"]);
  if (whatsapp) {
    facts.push(makeFact("contact", "WhatsApp", whatsapp));
  }

  return facts;
}

async function extractVerifiedLlmFacts(html: string, url: string) {
  if (!isLlmFactExtractionEnabled()) {
    return [];
  }

  try {
    const evidence = buildLlmExtractionEvidence(html, url);
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: [
          "你是网页知识库采集助手，只从用户给出的网页证据中抽取事实。",
          "不要推测、不要补全网页中没有出现的信息。",
          "输出必须是 JSON，不要 Markdown，不要解释。",
          "JSON 结构：{\"contacts\":[{\"type\":\"contact\",\"label\":\"邮箱\",\"value\":\"info@example.com\",\"url\":\"mailto:info@example.com\"}],\"facts\":[{\"type\":\"service\",\"label\":\"服务\",\"value\":\"网页中逐字出现的事实\"}]}",
          "contacts 用于邮箱、电话、微信、WhatsApp、Line、社交媒体等联系信息。",
          "facts 用于服务、地址、营业时间、价格、FAQ 等页面明示信息。",
          "每个 value 必须尽量逐字引用网页证据中出现的文本或链接值。",
        ].join("\n"),
      },
      {
        role: "user",
        content: `来源 URL：${url}\n\n网页证据：\n${evidence}`,
      },
    ];
    const answer = await generateChatAnswer({
      messages,
      model: process.env.KNOWLEDGE_EXTRACTION_MODEL || null,
    });
    const payload = parseLlmFactPayload(answer);
    const facts = [...(payload.contacts ?? []), ...(payload.facts ?? [])]
      .map(cleanFact)
      .filter((fact): fact is ExtractedFact => Boolean(fact))
      .filter((fact) => factHasEvidence(fact, evidence));

    return dedupeExtractedFacts(facts);
  } catch {
    return [];
  }
}

function buildLlmExtractionEvidence(html: string, url: string) {
  const $ = load(html);
  $("script, style, noscript, svg, canvas").remove();

  const links = $("a[href]")
    .toArray()
    .map((element) => {
      const href = $(element).attr("href")?.trim();
      if (!href) return "";
      const text = textLines($, element).join(" ");
      return `${text || "链接"} => ${safeAbsoluteUrl(href, url) || href}`;
    })
    .filter(Boolean)
    .join("\n");

  const metaDescription = $("meta[name='description']").attr("content") || "";
  const visibleText = normalizeText($("main").text() || $("article").text() || $("body").text());

  return normalizeText(
    [
      `标题：${$("title").first().text()}`,
      metaDescription ? `描述：${metaDescription}` : null,
      "页面文本：",
      visibleText,
      links ? `页面链接：\n${links}` : null,
    ]
      .filter(Boolean)
      .join("\n\n"),
  ).slice(0, Number(process.env.KNOWLEDGE_EXTRACTION_MAX_CHARS || 12000));
}

function isLlmFactExtractionEnabled() {
  if (process.env.KNOWLEDGE_LLM_EXTRACTION === "false") {
    return false;
  }

  if (process.env.DEEPSEEK_API_KEY) {
    return true;
  }

  return Boolean(process.env.LLM_API_KEY && process.env.LLM_API_BASE_URL);
}

function parseLlmFactPayload(answer: string): LlmFactPayload {
  const json = extractJson(answer);
  if (!json) {
    return {};
  }

  try {
    const parsed = JSON.parse(json) as LlmFactPayload;
    return {
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts : [],
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
    };
  } catch {
    return {};
  }
}

function extractJson(input: string) {
  const fenced = input.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    return fenced.trim();
  }

  const first = input.indexOf("{");
  const last = input.lastIndexOf("}");
  if (first === -1 || last <= first) {
    return null;
  }

  return input.slice(first, last + 1).trim();
}

function cleanFact(input: unknown): ExtractedFact | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;
  const label = stringValue(record.label);
  const value = stringValue(record.value);

  if (!label || !value) {
    return null;
  }

  return makeFact(stringValue(record.type) || "fact", label, value, stringValue(record.url));
}

function factHasEvidence(fact: ExtractedFact, evidence: string) {
  return evidenceIncludes(evidence, fact.value) || Boolean(fact.url && evidenceIncludes(evidence, fact.url));
}

function evidenceIncludes(evidence: string, value: string) {
  const needle = canonicalEvidence(value);
  if (needle.length < 2) {
    return false;
  }

  if (canonicalEvidence(evidence).includes(needle)) {
    return true;
  }

  const digits = value.replace(/\D/g, "");
  return digits.length >= 6 && evidence.replace(/\D/g, "").includes(digits);
}

function isContactLikeElement($: CheerioAPI, element: AnyNode) {
  const selected = $(element);
  const descriptor = [
    selected.attr("class"),
    selected.attr("id"),
    selected.attr("aria-label"),
    selected.attr("itemtype"),
    selected.text().slice(0, 1000),
  ]
    .filter(Boolean)
    .join(" ");

  return /(contact|联系方式|联系|wechat|微信|whatsapp|line|邮箱|email|电话|tel|social|社交)/i.test(descriptor);
}

function textLines($: CheerioAPI, element: AnyNode) {
  const selected = $(element);
  const descendantLines = selected
    .find("strong, small, em, b, p, h1, h2, h3, h4, h5, h6, li")
    .toArray()
    .flatMap((child) => $(child).text().split(/\n+/))
    .map((line) => normalizeText(line))
    .filter(Boolean);
  const rawLines = selected
    .text()
    .split(/\n+/)
    .map((line) => normalizeText(line))
    .filter(Boolean);

  return Array.from(new Set([...descendantLines, ...rawLines]));
}

function valueAfterLabel(lines: string[], labels: string[]) {
  const normalizedLabels = labels.map((label) => label.toLowerCase());
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lowerLine = line.toLowerCase();
    const matchedLabel = normalizedLabels.find((label) => lowerLine === label || lowerLine.includes(`${label}:`) || lowerLine.includes(`${label}：`));
    if (!matchedLabel) continue;

    const inlineValue = line.split(/[:：]/).slice(1).join(":").trim();
    if (isUsefulFactValue(inlineValue)) {
      return inlineValue;
    }

    const nextLine = lines[index + 1];
    if (isUsefulFactValue(nextLine)) {
      return nextLine;
    }
  }

  return null;
}

function isUsefulFactValue(value?: string | null) {
  if (!value) {
    return false;
  }

  return !/^(发送项目咨询|点击|查看|预约咨询|联系|联系方式|direct contact|社交媒体)$/i.test(value.trim());
}

function extractPhoneLikeValue(input: string) {
  return input.match(/\+?\d[\d\s().-]{6,}\d/)?.[0]?.replace(/[^\d+]/g, "") || null;
}

function isSocialUrl(url: string) {
  return /(facebook\.com|instagram\.com|linkedin\.com|x\.com|twitter\.com|youtube\.com|tiktok\.com)/i.test(url);
}

function socialLabel(url: string) {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "社交媒体";
    }
  })();

  if (host.includes("facebook")) return "Facebook";
  if (host.includes("instagram")) return "Instagram";
  if (host.includes("linkedin")) return "LinkedIn";
  if (host.includes("youtube")) return "YouTube";
  if (host.includes("tiktok")) return "TikTok";
  if (host === "x.com" || host.includes("twitter")) return "X/Twitter";
  return host;
}

function makeFact(type: string, label: string, value: string, url?: string | null): ExtractedFact {
  return {
    type: normalizeText(type),
    label: normalizeText(label),
    value: normalizeText(value),
    ...(url ? { url: normalizeText(url) } : {}),
  };
}

function formatExtractedFacts(title: string, facts: ExtractedFact[]) {
  const normalizedFacts = dedupeExtractedFacts(facts.map(cleanFact).filter((fact): fact is ExtractedFact => Boolean(fact)));
  if (normalizedFacts.length === 0) {
    return "";
  }

  return [
    title,
    ...normalizedFacts.map((fact) => {
      const typeLabel = fact.type === "social" ? "社交媒体" : fact.type === "contact" ? "联系方式" : "页面事实";
      const value = fact.url && fact.url !== fact.value ? `${fact.value}（${fact.url}）` : fact.value;
      return `- ${typeLabel} - ${fact.label}: ${value}`;
    }),
  ].join("\n");
}

function dedupeExtractedFacts(facts: ExtractedFact[]) {
  const byKey = new Map<string, ExtractedFact>();

  for (const fact of facts) {
    if (!fact.value) {
      continue;
    }

    const subject = fact.type === "social" ? fact.url || fact.value : fact.value;
    const key = canonicalEvidence(`${fact.type}:${fact.label}:${subject}`);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, fact);
      continue;
    }

    const existingUsesRawUrl = existing.url && existing.value === existing.url;
    const factHasReadableValue = !fact.url || fact.value !== fact.url;
    if ((!existing.url && fact.url) || (existingUsesRawUrl && factHasReadableValue)) {
      byKey.set(key, fact);
    }
  }

  return Array.from(byKey.values());
}

function canonicalEvidence(input: string) {
  return normalizeText(input).toLowerCase().replace(/\s+/g, "");
}

function stringValue(value: unknown) {
  return typeof value === "string" ? normalizeText(value) : "";
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
      const page = await extractPageDocument(html, url);
      if (page.content) {
        pages.push(page);
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
