import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CopilotProvider, useCopilot } from "./CopilotContext";
import * as copilotThreadsClient from "@/lib/persistence/client/copilotThreadsClient";

const THREAD_A = "11111111-1111-4111-8111-111111111111";
const THREAD_B = "22222222-2222-4222-8222-222222222222";

vi.mock("../AppActionsContext", () => ({
  useAppActions: () => ({
    setSidebarPanel: vi.fn(),
  }),
}));

vi.mock("../AiToolsProvider", () => ({
  useExecuteAiTool: () => vi.fn(),
  AiToolsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <CopilotProvider>{children}</CopilotProvider>;
}

describe("CopilotContext openAnnotationInChat", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(copilotThreadsClient, "hydrateCopilotThreadsState").mockResolvedValue({
      activeThreadId: THREAD_A,
      title: "Saved thread",
      modelId: "x-ai/grok-4.5",
      messages: [
        {
          id: "msg-a",
          role: "assistant",
          content: "line here",
          toolSteps: [],
          status: "done",
        },
      ],
      threads: [
        {
          id: THREAD_A,
          title: "Saved thread",
          schemaVersion: 1,
          syncRevision: 1,
          updatedAt: "2026-07-22T12:00:00.000Z",
          messageCount: 1,
        },
      ],
      syncRevision: 1,
    });
    vi.spyOn(copilotThreadsClient, "saveCopilotThreadState").mockResolvedValue({
      syncRevision: 1,
      title: "Saved thread",
    });
    vi.spyOn(copilotThreadsClient, "loadCopilotThread").mockResolvedValue({
      record: {
        id: THREAD_B,
        title: "Linked thread",
        schemaVersion: 1,
        syncRevision: 1,
        updatedAt: "2026-07-22T13:00:00.000Z",
        messages: [
          {
            id: "msg-b",
            role: "assistant",
            content: "linked",
            toolSteps: [],
            status: "done",
          },
        ],
      },
      source: "local",
    });
  });

  it("switches threads before focusing annotation message", async () => {
    const { result } = renderHook(() => useCopilot(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).not.toBeNull();

    await act(async () => {
      result.current?.openAnnotationInChat({
        threadId: THREAD_B,
        messageId: "msg-b",
      });
      await Promise.resolve();
    });

    expect(copilotThreadsClient.loadCopilotThread).toHaveBeenCalledWith(THREAD_B);
    expect(result.current?.threadId).toBe(THREAD_B);
    expect(result.current?.focusMessageId).toBe("msg-b");
  });
});
