import { join } from "node:path";

export const JOURNAL_SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;
export const JOURNAL_SCREENSHOT_MAX_PER_TRADE = 10;

export const JOURNAL_SCREENSHOT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type JournalScreenshotMimeType = (typeof JOURNAL_SCREENSHOT_MIME_TYPES)[number];

export type JournalScreenshotSource = "upload" | "paste" | "chart_capture";

export function isAllowedJournalScreenshotMime(
  mimeType: string,
): mimeType is JournalScreenshotMimeType {
  return (JOURNAL_SCREENSHOT_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function validateJournalScreenshotUpload(
  mimeType: string,
  byteSize: number,
  existingCount: number,
): { ok: true; mimeType: JournalScreenshotMimeType } | { ok: false; error: string } {
  if (!isAllowedJournalScreenshotMime(mimeType)) {
    return { ok: false, error: "Unsupported image type. Use PNG, JPEG, or WebP." };
  }
  if (!Number.isFinite(byteSize) || byteSize <= 0) {
    return { ok: false, error: "Screenshot file is empty." };
  }
  if (byteSize > JOURNAL_SCREENSHOT_MAX_BYTES) {
    return {
      ok: false,
      error: `Screenshot exceeds ${JOURNAL_SCREENSHOT_MAX_BYTES / (1024 * 1024)} MB limit.`,
    };
  }
  if (existingCount >= JOURNAL_SCREENSHOT_MAX_PER_TRADE) {
    return {
      ok: false,
      error: `Maximum ${JOURNAL_SCREENSHOT_MAX_PER_TRADE} screenshots per trade.`,
    };
  }
  return { ok: true, mimeType };
}

export function journalScreenshotStorageKey(
  userId: string,
  tradeId: string,
  screenshotId: string,
  mimeType: JournalScreenshotMimeType,
): string {
  const ext = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
  return `${userId}/${tradeId}/${screenshotId}.${ext}`;
}

export function journalScreenshotRootDir(cwd = process.cwd()): string {
  return join(cwd, "data", "journal-screenshots");
}

export function journalScreenshotAbsolutePath(
  storageKey: string,
  cwd = process.cwd(),
): string {
  return join(journalScreenshotRootDir(cwd), storageKey);
}
