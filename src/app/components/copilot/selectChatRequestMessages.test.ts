import { describe, expect, it } from "vitest";
import type { CopilotMessage } from "./useCopilotThread";
import {
  COPILOT_REQUEST_MAX_CONTENT_CHARS,
  COPILOT_REQUEST_MAX_MESSAGES,
  selectChatRequestMessages,
  truncateChatRequestContent,
} from "./selectChatRequestMessages";

function message(
  id: string,
  role: "user" | "assistant",
  content: string,
): CopilotMessage {
  return {
    id,
    role,
    content,
    toolSteps: [],
    status: "done",
  };
}

describe("selectChatRequestMessages", () => {
  it("keeps only the last N user/assistant messages", () => {
    const messages = Array.from({ length: 50 }, (_, index) =>
      message(`m-${index}`, index % 2 === 0 ? "user" : "assistant", `turn-${index}`),
    );

    const selected = selectChatRequestMessages(messages);
    expect(selected).toHaveLength(COPILOT_REQUEST_MAX_MESSAGES);
    expect(selected[0]?.content).toBe(`turn-${50 - COPILOT_REQUEST_MAX_MESSAGES}`);
    expect(selected.at(-1)?.content).toBe("turn-49");
  });

  it("truncates message content for the request payload only", () => {
    const longContent = "x".repeat(COPILOT_REQUEST_MAX_CONTENT_CHARS + 100);
    const selected = selectChatRequestMessages([message("m1", "user", longContent)]);

    expect(selected).toHaveLength(1);
    expect(selected[0]?.content.length).toBe(COPILOT_REQUEST_MAX_CONTENT_CHARS);
    expect(selected[0]?.content.endsWith("…")).toBe(true);
  });

  it("truncates with ellipsis helper", () => {
    expect(truncateChatRequestContent("hello", 10)).toBe("hello");
    expect(truncateChatRequestContent("hello world", 6)).toBe("hello…");
  });
});
