import { describe, expect, it } from "vitest";

import { extractContact } from "./contact";

describe("contact extraction", () => {
  it("extracts common lead fields", () => {
    expect(extractContact("我的电话是13800138000，邮箱 hi@example.com，微信 wx: lopuo_ai")).toEqual({
      phone: "13800138000",
      email: "hi@example.com",
      wechat: "lopuo_ai",
    });
  });
});
