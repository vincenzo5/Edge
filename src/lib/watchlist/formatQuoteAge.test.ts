import { describe, expect, it } from "vitest";
import { formatQuoteAge, shouldShowQuoteAgeHint } from "./formatQuoteAge";

describe("formatQuoteAge", () => {
  const now = 1_000_000;

  it("formats relative ages", () => {
    expect(formatQuoteAge(now - 500, now)).toBe("just now");
    expect(formatQuoteAge(now - 12_000, now)).toBe("12s");
    expect(formatQuoteAge(now - 120_000, now)).toBe("2m");
  });

  it("shows hint only after 30s", () => {
    expect(shouldShowQuoteAgeHint(now - 20_000, now)).toBe(false);
    expect(shouldShowQuoteAgeHint(now - 35_000, now)).toBe(true);
  });
});
