import { createHash } from "node:crypto";

export function normalizeText(input: string) {
  return input
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function contentHash(input: string) {
  return createHash("sha256").update(normalizeText(input)).digest("hex");
}

export function estimateTokenCount(input: string) {
  const cjkCount = (input.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const latinWords = input.replace(/[\u4e00-\u9fff]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.ceil(cjkCount * 0.6 + latinWords * 1.3);
}

export function chunkText(input: string, maxChars = 700, overlapChars = 80) {
  const normalized = normalizeText(input);
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .split(/\n{2,}|(?<=[。！？!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }

    if (`${current}\n\n${paragraph}`.length <= maxChars) {
      current = `${current}\n\n${paragraph}`;
      continue;
    }

    chunks.push(current);
    const overlap = current.slice(Math.max(0, current.length - overlapChars));
    current = `${overlap}\n\n${paragraph}`.trim();
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.flatMap((chunk) => splitOversizedChunk(chunk, maxChars, overlapChars));
}

function splitOversizedChunk(chunk: string, maxChars: number, overlapChars: number) {
  if (chunk.length <= maxChars) {
    return [chunk];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < chunk.length) {
    const end = Math.min(chunk.length, start + maxChars);
    chunks.push(chunk.slice(start, end).trim());
    if (end === chunk.length) break;
    start = Math.max(0, end - overlapChars);
  }

  return chunks.filter(Boolean);
}
