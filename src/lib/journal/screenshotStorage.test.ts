import { describe, expect, it } from "vitest";

import {
  isAllowedJournalScreenshotMime,
  journalScreenshotAbsolutePath,
  journalScreenshotStorageKey,
  validateJournalScreenshotUpload,
} from "@/lib/journal/screenshotValidation";

describe("screenshotStorage", () => {
  it("maps storage keys with file extensions", () => {
    expect(
      journalScreenshotStorageKey("user-1", "trade-1", "shot-1", "image/png"),
    ).toBe("user-1/trade-1/shot-1.png");
    expect(
      journalScreenshotAbsolutePath("user-1/trade-1/shot-1.png"),
    ).toContain("data/journal-screenshots/user-1/trade-1/shot-1.png");
  });

  it("validates allowed mime types and limits", () => {
    expect(isAllowedJournalScreenshotMime("image/png")).toBe(true);
    expect(isAllowedJournalScreenshotMime("image/gif")).toBe(false);

    const ok = validateJournalScreenshotUpload("image/png", 1024, 0);
    expect(ok.ok).toBe(true);

    const tooLarge = validateJournalScreenshotUpload("image/png", 6 * 1024 * 1024, 0);
    expect(tooLarge.ok).toBe(false);

    const tooMany = validateJournalScreenshotUpload("image/png", 1024, 10);
    expect(tooMany.ok).toBe(false);
  });
});
