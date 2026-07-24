import { join } from "node:path";

export const COPILOT_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const COPILOT_ATTACHMENT_MAX_PER_MESSAGE = 4;

export const COPILOT_ATTACHMENT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type CopilotAttachmentMimeType = (typeof COPILOT_ATTACHMENT_MIME_TYPES)[number];

export type CopilotAttachmentSource = "upload" | "paste" | "chart_capture";

export function isAllowedCopilotAttachmentMime(
  mimeType: string,
): mimeType is CopilotAttachmentMimeType {
  return (COPILOT_ATTACHMENT_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function validateCopilotAttachmentUpload(
  mimeType: string,
  byteSize: number,
  existingCount: number,
): { ok: true; mimeType: CopilotAttachmentMimeType } | { ok: false; error: string } {
  if (!isAllowedCopilotAttachmentMime(mimeType)) {
    return { ok: false, error: "Unsupported image type. Use PNG, JPEG, or WebP." };
  }
  if (!Number.isFinite(byteSize) || byteSize <= 0) {
    return { ok: false, error: "Attachment file is empty." };
  }
  if (byteSize > COPILOT_ATTACHMENT_MAX_BYTES) {
    return {
      ok: false,
      error: `Attachment exceeds ${COPILOT_ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB limit.`,
    };
  }
  if (existingCount >= COPILOT_ATTACHMENT_MAX_PER_MESSAGE) {
    return {
      ok: false,
      error: `Maximum ${COPILOT_ATTACHMENT_MAX_PER_MESSAGE} attachments per message.`,
    };
  }
  return { ok: true, mimeType };
}

export function copilotAttachmentStorageKey(
  userId: string,
  attachmentId: string,
  mimeType: CopilotAttachmentMimeType,
): string {
  const ext = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
  return `${userId}/${attachmentId}.${ext}`;
}

export function copilotAttachmentRootDir(cwd = process.cwd()): string {
  return join(cwd, "data", "copilot-attachments");
}

export function copilotAttachmentAbsolutePath(storageKey: string, cwd = process.cwd()): string {
  return join(copilotAttachmentRootDir(cwd), storageKey);
}

export function copilotAttachmentImageUrl(attachmentId: string): string {
  return `/api/me/copilot/attachments/${attachmentId}`;
}
