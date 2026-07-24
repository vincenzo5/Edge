import { describe, expect, it } from "vitest";

import { shouldSuppressNotificationDedupe } from "./dedupe";

describe("notification dedupe", () => {
  it("suppresses duplicate keys within the dedupe window", () => {
    const now = Date.now();
    expect(shouldSuppressNotificationDedupe(new Date(now - 5_000).toISOString(), now)).toBe(true);
  });

  it("allows duplicate keys after the dedupe window", () => {
    const now = Date.now();
    expect(shouldSuppressNotificationDedupe(new Date(now - 60_000).toISOString(), now)).toBe(false);
  });
});
