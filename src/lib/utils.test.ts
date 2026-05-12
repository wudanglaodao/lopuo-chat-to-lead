import { describe, expect, it } from "vitest";

import { isAllowedOrigin, normalizeOrigin } from "./utils";

describe("origin allow list", () => {
  it("normalizes hosts and treats apex/www as the same site", () => {
    expect(normalizeOrigin("https://www.lopuo.work/path")).toBe("www.lopuo.work");
    expect(isAllowedOrigin("https://www.lopuo.work/demo", ["lopuo.work"])).toBe(true);
    expect(isAllowedOrigin("https://lopuo.work/demo", ["www.lopuo.work"])).toBe(true);
  });

  it("keeps unrelated domains isolated", () => {
    expect(isAllowedOrigin("https://other.example", ["lopuo.work"])).toBe(false);
  });
});
