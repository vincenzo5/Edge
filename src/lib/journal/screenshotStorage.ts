import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
  journalScreenshotAbsolutePath,
  journalScreenshotStorageKey,
} from "@/lib/journal/screenshotValidation";

export {
  JOURNAL_SCREENSHOT_MAX_BYTES,
  JOURNAL_SCREENSHOT_MAX_PER_TRADE,
  JOURNAL_SCREENSHOT_MIME_TYPES,
  isAllowedJournalScreenshotMime,
  journalScreenshotAbsolutePath,
  journalScreenshotRootDir,
  journalScreenshotStorageKey,
  validateJournalScreenshotUpload,
} from "@/lib/journal/screenshotValidation";
export type {
  JournalScreenshotMimeType,
  JournalScreenshotSource,
} from "@/lib/journal/screenshotValidation";

export async function writeJournalScreenshotFile(
  storageKey: string,
  bytes: Buffer,
  cwd = process.cwd(),
): Promise<void> {
  const absolutePath = journalScreenshotAbsolutePath(storageKey, cwd);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);
}

export async function readJournalScreenshotFile(
  storageKey: string,
  cwd = process.cwd(),
): Promise<Buffer> {
  return readFile(journalScreenshotAbsolutePath(storageKey, cwd));
}

export async function deleteJournalScreenshotFile(
  storageKey: string,
  cwd = process.cwd(),
): Promise<void> {
  try {
    await rm(journalScreenshotAbsolutePath(storageKey, cwd), { force: true });
  } catch {
    // Best-effort cleanup when file already removed.
  }
}
