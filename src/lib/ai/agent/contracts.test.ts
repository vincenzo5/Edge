import { describe, expect, it } from "vitest";
import { parseChatRequest } from "./contracts";

describe("chatRequestSchema", () => {
  it("rejects more than 64 messages", () => {
    const messages = Array.from({ length: 65 }, (_, index) => ({
      role: "user" as const,
      content: `msg-${index}`,
    }));

    expect(() => parseChatRequest({ messages })).toThrow();
  });

  it("rejects message content over 8000 chars", () => {
    expect(() =>
      parseChatRequest({
        messages: [{ role: "user", content: "x".repeat(8001) }],
      }),
    ).toThrow();
  });

  it("accepts bounded request payloads", () => {
    const parsed = parseChatRequest({
      messages: [{ role: "user", content: "hello" }],
      permissionMode: "write",
    });
    expect(parsed.messages).toHaveLength(1);
  });

  it("rejects workspace snapshots over 4000 chars", () => {
    expect(() =>
      parseChatRequest({
        messages: [{ role: "user", content: "hello" }],
        workspaceSnapshot: "x".repeat(4001),
      }),
    ).toThrow();
  });
});
