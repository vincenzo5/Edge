import "server-only";

import type { ChatAttachment, ChatMessage } from "@/lib/ai/agent/contracts";
import { readCopilotAttachmentBytes } from "@/lib/persistence/repositories/copilotAttachmentRepository";

export async function resolveChatAttachmentDataUrls(
  userId: string | null,
  messages: ChatMessage[],
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();

  for (const message of messages) {
    for (const attachment of message.attachments ?? []) {
      if (resolved.has(attachment.id)) continue;

      if (attachment.dataUrl?.trim()) {
        resolved.set(attachment.id, attachment.dataUrl.trim());
        continue;
      }

      if (!userId) continue;

      const payload = await readCopilotAttachmentBytes(userId, attachment.id);
      if (!payload) continue;

      const dataUrl = `data:${payload.mimeType};base64,${payload.bytes.toString("base64")}`;
      resolved.set(attachment.id, dataUrl);
    }
  }

  return resolved;
}

export function messageHasUnresolvedAttachments(
  message: ChatMessage,
  resolved: Map<string, string>,
): boolean {
  return (message.attachments ?? []).some((attachment) => !resolved.has(attachment.id));
}

export function attachmentDataUrlsForMessage(
  message: ChatMessage,
  resolved: Map<string, string>,
): string[] {
  return (message.attachments ?? [])
    .map((attachment: ChatAttachment) => resolved.get(attachment.id))
    .filter((url): url is string => Boolean(url));
}
