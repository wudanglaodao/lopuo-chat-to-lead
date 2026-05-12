import { describe, expect, it } from "vitest";

import { vectorLiteral } from "./rag";

describe("rag utilities", () => {
  it("rejects invalid vector values", () => {
    expect(() => vectorLiteral([0.1, Number.NaN])).toThrow("non-finite");
  });
});
