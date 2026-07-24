import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useCopilotThread } from "./useCopilotThread";
import * as copilotThreadsClient from "@/lib/persistence/client/copilotThreadsClient";
import * as streamChatModule from "./streamChat";

const THREAD_A = "11111111-1111-4111-8111-111111111111";
const THREAD_B = "22222222-2222-4222-8222-222222222222";

vi.mock("../AiToolsProvider", () => ({
  useExecuteAiTool: () => vi.fn(),
}));

describe("useCopilotThread persistence", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(copilotThreadsClient, "hydrateCopilotThreadsState").mockResolvedValue({
      activeThreadId: THREAD_A,
      title: "Saved thread",
      modelId: "x-ai/grok-4.5",
      messages: [
        {
          id: "m1",
          role: "user",
          content: "hello",
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
      syncRevision: 2,
      title: "Saved thread",
    });
    vi.spyOn(copilotThreadsClient, "loadCopilotThread").mockResolvedValue({
      record: {
        id: THREAD_B,
        title: "Other thread",
        schemaVersion: 1,
        syncRevision: 1,
        updatedAt: "2026-07-22T13:00:00.000Z",
        modelId: "anthropic/claude-opus-4.8",
        messages: [
          {
            id: "m2",
            role: "user",
            content: "other",
            toolSteps: [],
            status: "done",
          },
        ],
      },
      source: "local",
    });
    vi.spyOn(copilotThreadsClient, "createCopilotThreadState").mockResolvedValue({
      threadId: THREAD_B,
      syncRevision: 1,
      title: "New chat",
      modelId: "x-ai/grok-4.5",
    });
    vi.spyOn(copilotThreadsClient, "deleteCopilotThreadState").mockResolvedValue(undefined);
    vi.spyOn(copilotThreadsClient, "renameCopilotThreadState").mockResolvedValue({
      syncRevision: 2,
      title: "Renamed",
    });
  });

  it("hydrates persisted messages on mount", async () => {
    const { result } = renderHook(() => useCopilotThread());

    await waitFor(() => {
      expect(result.current.isHydrating).toBe(false);
    });

    expect(result.current.threadId).toBe(THREAD_A);
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.content).toBe("hello");
  });

  it("switches threads and loads messages", async () => {
    const { result } = renderHook(() => useCopilotThread());

    await waitFor(() => {
      expect(result.current.isHydrating).toBe(false);
    });

    await act(async () => {
      await result.current.switchThread(THREAD_B);
    });

    expect(copilotThreadsClient.loadCopilotThread).toHaveBeenCalledWith(THREAD_B);
    expect(result.current.threadId).toBe(THREAD_B);
    expect(result.current.messages[0]?.content).toBe("other");
  });

  it("creates a new chat thread", async () => {
    const { result } = renderHook(() => useCopilotThread());

    await waitFor(() => {
      expect(result.current.isHydrating).toBe(false);
    });

    await act(async () => {
      await result.current.newChat();
    });

    expect(copilotThreadsClient.createCopilotThreadState).toHaveBeenCalled();
    expect(result.current.threadId).toBe(THREAD_B);
    expect(result.current.messages).toHaveLength(0);
  });

  it("loads per-thread modelId when switching threads", async () => {
    const { result } = renderHook(() => useCopilotThread());

    await waitFor(() => {
      expect(result.current.isHydrating).toBe(false);
    });

    expect(result.current.modelId).toBe("x-ai/grok-4.5");

    await act(async () => {
      await result.current.switchThread(THREAD_B);
    });

    expect(result.current.modelId).toBe("anthropic/claude-opus-4.8");
  });

  it("persists model changes and sends modelId to chat", async () => {
    vi.spyOn(streamChatModule, "streamChat").mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useCopilotThread());

    await waitFor(() => {
      expect(result.current.isHydrating).toBe(false);
    });

    act(() => {
      result.current.setModelId("anthropic/claude-opus-4.8");
    });

    expect(result.current.modelId).toBe("anthropic/claude-opus-4.8");

    await act(async () => {
      await result.current.send("hello");
    });

    expect(streamChatModule.streamChat).toHaveBeenCalledWith(
      expect.objectContaining({ modelId: "anthropic/claude-opus-4.8" }),
      expect.any(Object),
    );
  });

  it("windows chat request messages before streaming", async () => {
    vi.spyOn(copilotThreadsClient, "hydrateCopilotThreadsState").mockResolvedValue({
      activeThreadId: THREAD_A,
      title: "Long thread",
      modelId: "x-ai/grok-4.5",
      messages: Array.from({ length: 50 }, (_, index) => ({
        id: `m-${index}`,
        role: index % 2 === 0 ? ("user" as const) : ("assistant"),
        content: `turn-${index}`,
        toolSteps: [],
        status: "done" as const,
      })),
      threads: [
        {
          id: THREAD_A,
          title: "Long thread",
          schemaVersion: 1,
          syncRevision: 1,
          updatedAt: "2026-07-22T12:00:00.000Z",
          messageCount: 50,
        },
      ],
      syncRevision: 1,
    });
    vi.spyOn(streamChatModule, "streamChat").mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useCopilotThread());

    await waitFor(() => {
      expect(result.current.isHydrating).toBe(false);
    });

    await act(async () => {
      await result.current.send("next");
    });

    expect(streamChatModule.streamChat).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user", content: "next" }),
        ]),
      }),
      expect.any(Object),
    );

    const request = vi.mocked(streamChatModule.streamChat).mock.calls[0]?.[0];
    expect(request?.messages.length).toBeLessThanOrEqual(40);
  });

  it("regenerates the last assistant turn without duplicating the user message", async () => {
    vi.spyOn(copilotThreadsClient, "hydrateCopilotThreadsState").mockResolvedValue({
      activeThreadId: THREAD_A,
      title: "Saved thread",
      modelId: "x-ai/grok-4.5",
      messages: [
        {
          id: "m1",
          role: "user",
          content: "hello",
          toolSteps: [],
          status: "done",
        },
        {
          id: "m2",
          role: "assistant",
          content: "old answer",
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
          messageCount: 2,
        },
      ],
      syncRevision: 1,
    });
    vi.spyOn(streamChatModule, "streamChat").mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useCopilotThread());

    await waitFor(() => {
      expect(result.current.isHydrating).toBe(false);
    });

    await act(async () => {
      await result.current.regenerateLast();
    });

    expect(streamChatModule.streamChat).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [expect.objectContaining({ role: "user", content: "hello" })],
      }),
      expect.any(Object),
    );
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]?.content).toBe("hello");
    expect(result.current.messages[1]?.role).toBe("assistant");
  });
});
