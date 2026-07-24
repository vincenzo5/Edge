import { describe, expect, it } from "vitest";

import {
  deriveThreadTitle,
  hydrateMessagesFromPersist,
  redactMessagesForPersist,
} from "@/lib/copilot/copilotThreadRedact";
import type { CopilotMessage } from "@/app/components/copilot/useCopilotThread";
import { copilotThreadWriteSchema } from "@/lib/persistence/schemas/copilotThreads";

describe("copilotThreadRedact", () => {
  it("strips confirmArguments from persisted tool steps", () => {
    const messages: CopilotMessage[] = [
      {
        id: "m1",
        role: "assistant",
        content: "Done",
        toolSteps: [
          {
            callId: "c1",
            name: "delete_drawing",
            status: "pending-confirm",
            confirmReason: "Confirm destructive action",
            confirmArguments: { drawingId: "secret-id" },
          },
        ],
        status: "done",
      },
    ];

    const persisted = redactMessagesForPersist(messages);
    expect(persisted[0]?.toolSteps[0]).toEqual({
      callId: "c1",
      name: "delete_drawing",
      status: "pending-confirm",
      confirmReason: "Confirm destructive action",
    });
    expect(
      (persisted[0]?.toolSteps[0] as Record<string, unknown>).confirmArguments,
    ).toBeUndefined();

    const parsed = copilotThreadWriteSchema.safeParse({
      schemaVersion: 1,
      baseRevision: 1,
      messages: persisted,
    });
    expect(parsed.success).toBe(true);
  });

  it("derives title from first user message", () => {
    const messages: CopilotMessage[] = [
      {
        id: "u1",
        role: "user",
        content: "Summarize this chart for NVDA",
        toolSteps: [],
        status: "done",
      },
    ];
    expect(deriveThreadTitle(messages, "New chat")).toBe("Summarize this chart for NVDA");
  });

  it("round-trips persisted messages without confirmArguments", () => {
    const persisted = redactMessagesForPersist([
      {
        id: "u1",
        role: "user",
        content: "hello",
        attachments: [
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            mimeType: "image/png",
            name: "chart.png",
            source: "chart_capture",
          },
        ],
        toolSteps: [],
      },
    ]);
    const hydrated = hydrateMessagesFromPersist(persisted);
    expect(hydrated[0]?.content).toBe("hello");
    expect(hydrated[0]?.attachments?.[0]?.id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(hydrated[0]?.attachments?.[0]?.source).toBe("chart_capture");
  });
});
