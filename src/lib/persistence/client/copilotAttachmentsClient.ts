import type { CopilotAttachmentSource } from "@/lib/copilot/attachmentValidation";
import { copilotAttachmentImageUrl } from "@/lib/copilot/attachmentValidation";
import type { CopilotAttachmentResponse } from "@/lib/persistence/schemas/copilotAttachments";
import { persistenceFetch } from "@/lib/persistence/client/persistenceFetch";

const attachmentPreviewBlobCache = new Map<string, Blob>();

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function persistenceResponseError(response: Response, fallback: string): Promise<Error> {
  const body = await parseJsonResponse<{ error?: string }>(response);
  const message =
    typeof body?.error === "string" && body.error.trim() ? body.error.trim() : fallback;
  return new Error(message);
}

export function cacheCopilotAttachmentBlob(attachmentId: string, blob: Blob): void {
  attachmentPreviewBlobCache.set(attachmentId, blob);
}

export function clearCachedCopilotAttachmentBlob(attachmentId: string): void {
  attachmentPreviewBlobCache.delete(attachmentId);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read attachment blob"));
    reader.readAsDataURL(blob);
  });
}

async function createLocalCopilotAttachment(
  file: Blob,
  options: {
    source?: CopilotAttachmentSource;
    filename?: string;
  } = {},
): Promise<CopilotAttachmentResponse> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const attachment: CopilotAttachmentResponse = {
    id,
    mimeType: (file.type || "image/png") as CopilotAttachmentResponse["mimeType"],
    byteSize: file.size,
    name: options.filename ?? null,
    source: options.source ?? "upload",
    createdAt: now,
  };
  cacheCopilotAttachmentBlob(id, file);
  return attachment;
}

export async function uploadCopilotAttachment(
  file: Blob,
  options: {
    source?: CopilotAttachmentSource;
    filename?: string;
  } = {},
): Promise<CopilotAttachmentResponse> {
  const form = new FormData();
  const filename = options.filename ?? "attachment.png";
  form.append("file", file, filename);
  form.append("source", options.source ?? "upload");
  if (options.filename) form.append("name", options.filename);

  const response = await persistenceFetch("/api/me/copilot/attachments", {
    method: "POST",
    body: form,
  });

  if (response.status === 503) {
    return createLocalCopilotAttachment(file, options);
  }

  if (!response.ok) {
    throw await persistenceResponseError(response, "Attachment upload failed.");
  }

  const result = await parseJsonResponse<CopilotAttachmentResponse>(response);
  if (!result) throw new Error("Attachment upload returned an invalid response.");
  cacheCopilotAttachmentBlob(result.id, file);
  return result;
}

export function copilotAttachmentDisplayUrl(attachmentId: string): string {
  return copilotAttachmentImageUrl(attachmentId);
}

export async function resolveCopilotAttachmentPreviewUrl(
  attachmentId: string,
): Promise<string> {
  const cached = attachmentPreviewBlobCache.get(attachmentId);
  if (cached) {
    return URL.createObjectURL(cached);
  }
  return copilotAttachmentDisplayUrl(attachmentId);
}

export async function resolveCopilotAttachmentDataUrl(
  attachmentId: string,
): Promise<string | null> {
  const cached = attachmentPreviewBlobCache.get(attachmentId);
  if (cached) {
    return blobToDataUrl(cached);
  }
  return null;
}
