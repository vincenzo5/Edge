import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
  copilotAttachmentAbsolutePath,
  copilotAttachmentStorageKey,
} from "@/lib/copilot/attachmentValidation";

export {
  COPILOT_ATTACHMENT_MAX_BYTES,
  COPILOT_ATTACHMENT_MAX_PER_MESSAGE,
  COPILOT_ATTACHMENT_MIME_TYPES,
  isAllowedCopilotAttachmentMime,
  copilotAttachmentAbsolutePath,
  copilotAttachmentRootDir,
  copilotAttachmentStorageKey,
  validateCopilotAttachmentUpload,
} from "@/lib/copilot/attachmentValidation";
export type {
  CopilotAttachmentMimeType,
  CopilotAttachmentSource,
} from "@/lib/copilot/attachmentValidation";

export async function writeCopilotAttachmentFile(
  storageKey: string,
  bytes: Buffer,
  cwd = process.cwd(),
): Promise<void> {
  const absolutePath = copilotAttachmentAbsolutePath(storageKey, cwd);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);
}

export async function readCopilotAttachmentFile(
  storageKey: string,
  cwd = process.cwd(),
): Promise<Buffer> {
  return readFile(copilotAttachmentAbsolutePath(storageKey, cwd));
}

export async function deleteCopilotAttachmentFile(
  storageKey: string,
  cwd = process.cwd(),
): Promise<void> {
  try {
    await rm(copilotAttachmentAbsolutePath(storageKey, cwd), { force: true });
  } catch {
    // Best-effort cleanup when file already removed.
  }
}
