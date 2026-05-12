import { describe, expect, it } from "vitest";

import { chunkText, contentHash, normalizeText } from "./text";

describe("text utilities", () => {
  it("normalizes repeated whitespace", () => {
    expect(normalizeText("  A   B\n\n\nC  ")).toBe("A B\n\nC");
  });

  it("creates stable content hashes", () => {
    expect(contentHash("hello   world")).toBe(contentHash("hello world"));
  });

  it("chunks long text with bounded chunk sizes", () => {
    const chunks = chunkText("第一段。第二段。第三段。第四段。第五段。", 12, 3);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 12)).toBe(true);
  });
});
