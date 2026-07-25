import type { CopilotMessage } from "./useCopilotThread";

export type CopilotMessageSections = {
  historyMessages: CopilotMessage[];
  streamingMessage: CopilotMessage | null;
};

export function splitCopilotMessages(messages: CopilotMessage[]): CopilotMessageSections {
  const streamingIndex = messages.findIndex(
    (message) => message.role === "assistant" && message.status === "streaming",
  );
  if (streamingIndex < 0) {
    return { historyMessages: messages, streamingMessage: null };
  }

  return {
    historyMessages: messages.filter((_, index) => index !== streamingIndex),
    streamingMessage: messages[streamingIndex] ?? null,
  };
}
