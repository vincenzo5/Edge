import type {
  CopilotMessage,
  CopilotMessageAttachment,
  CopilotToolStep,
} from "@/lib/copilot/types";
import type { PersistedCopilotMessage } from "@/lib/persistence/schemas/copilotThreads";

const DEFAULT_THREAD_TITLE = "New chat";
const MAX_TITLE_LENGTH = 60;

export function redactToolStepForPersist(step: CopilotToolStep) {
  return {
    callId: step.callId,
    name: step.name,
    status: step.status,
    ...(step.summary ? { summary: step.summary } : {}),
    ...(step.confirmReason ? { confirmReason: step.confirmReason } : {}),
  };
}

function redactAttachmentForPersist(attachment: CopilotMessageAttachment) {
  return {
    id: attachment.id,
    mimeType: attachment.mimeType,
    ...(attachment.name ? { name: attachment.name } : {}),
    ...(attachment.source ? { source: attachment.source } : {}),
  };
}

export function redactMessagesForPersist(messages: CopilotMessage[]): PersistedCopilotMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    ...(message.attachments?.length
      ? { attachments: message.attachments.map(redactAttachmentForPersist) }
      : {}),
    toolSteps: message.toolSteps.map(redactToolStepForPersist),
    ...(message.status ? { status: message.status } : {}),
    ...(message.error ? { error: message.error } : {}),
  }));
}

export function hydrateMessagesFromPersist(messages: PersistedCopilotMessage[]): CopilotMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    ...(message.attachments?.length
      ? {
          attachments: message.attachments.map((attachment) => ({
            ...attachment,
          })),
        }
      : {}),
    toolSteps: message.toolSteps.map((step) => ({ ...step })),
    ...(message.status ? { status: message.status } : {}),
    ...(message.error ? { error: message.error } : {}),
  }));
}

export function deriveThreadTitle(
  messages: CopilotMessage[],
  currentTitle?: string,
): string {
  if (currentTitle && currentTitle.trim() && currentTitle !== DEFAULT_THREAD_TITLE) {
    return currentTitle.trim().slice(0, MAX_TITLE_LENGTH);
  }

  const firstUser = messages.find(
    (message) =>
      message.role === "user" && (message.content.trim() || (message.attachments?.length ?? 0) > 0),
  );
  if (!firstUser) {
    return DEFAULT_THREAD_TITLE;
  }

  const trimmed = firstUser.content.trim().replace(/\s+/g, " ");
  if (trimmed.length <= MAX_TITLE_LENGTH) {
    return trimmed || "Image attachment";
  }
  return `${trimmed.slice(0, MAX_TITLE_LENGTH - 1)}…`;
}

export { DEFAULT_THREAD_TITLE, MAX_TITLE_LENGTH };
