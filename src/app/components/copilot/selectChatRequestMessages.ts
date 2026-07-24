import type { ChatMessage } from "@/lib/ai/agent/contracts";
import type { CopilotMessage } from "./useCopilotThread";

export const COPILOT_REQUEST_MAX_MESSAGES = 40;
export const COPILOT_REQUEST_MAX_CONTENT_CHARS = 4000;

export function truncateChatRequestContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  if (maxChars <= 1) return "…";
  return `${content.slice(0, maxChars - 1)}…`;
}

export function selectChatRequestMessages(
  messages: CopilotMessage[],
  options?: {
    maxMessages?: number;
    maxContentChars?: number;
    attachmentDataUrls?: Map<string, string>;
  },
): ChatMessage[] {
  const maxMessages = options?.maxMessages ?? COPILOT_REQUEST_MAX_MESSAGES;
  const maxContentChars = options?.maxContentChars ?? COPILOT_REQUEST_MAX_CONTENT_CHARS;
  const attachmentDataUrls = options?.attachmentDataUrls;

  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: truncateChatRequestContent(message.content, maxContentChars),
      ...(message.attachments?.length
        ? {
            attachments: message.attachments.map((attachment) => ({
              id: attachment.id,
              mimeType: attachment.mimeType,
              ...(attachmentDataUrls?.get(attachment.id)
                ? { dataUrl: attachmentDataUrls.get(attachment.id) }
                : {}),
            })),
          }
        : {}),
    }))
    .slice(-maxMessages);
}
