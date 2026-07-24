import { describe, expect, it } from "vitest";

import { createNotificationSchema } from "./notifications";

describe("createNotificationSchema href allowlist", () => {
  it("accepts safe href values", () => {
    expect(
      createNotificationSchema.safeParse({
        title: "Alert",
        body: "Triggered",
        href: "/workspace?surface=alerts",
      }).success,
    ).toBe(true);
    expect(
      createNotificationSchema.safeParse({
        title: "Alert",
        body: "Triggered",
        href: "https://example.com",
      }).success,
    ).toBe(true);
  });

  it("rejects unsafe href schemes", () => {
    const parsed = createNotificationSchema.safeParse({
      title: "Alert",
      body: "Triggered",
      href: "javascript:alert(1)",
    });
    expect(parsed.success).toBe(false);
  });
});
