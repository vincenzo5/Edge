import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

import { CopilotPanel } from "./CopilotPanel";
import { CopilotProvider } from "./CopilotContext";
import { AppActionsProvider } from "../AppActionsContext";
import { AiToolsProvider } from "../AiToolsProvider";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import * as streamChatModule from "./streamChat";
import * as confirmToolModule from "./confirmToolExecution";
import * as copilotThreadsClient from "@/lib/persistence/client/copilotThreadsClient";

const THREAD_ID = "11111111-1111-4111-8111-111111111111";

function renderPanel(variant: "sidebar" | "page" | "tile" = "sidebar") {
  const appActions = {
    getLayout: () => DEFAULT_LAYOUT,
    isHydrated: () => true,
    applyCellUpdate: vi.fn(),
    patchActiveCell: vi.fn(),
    setActiveCellIndex: vi.fn(),
    setLayoutId: vi.fn(),
    setGridMode: vi.fn(),
    setLayoutSync: vi.fn(),
    setTheme: vi.fn(),
    setSidebarPanel: vi.fn(),
  };

  return render(
    <AppActionsProvider value={appActions}>
      <AiToolsProvider>
        <CopilotProvider>
          <CopilotPanel variant={variant} />
        </CopilotProvider>
      </AiToolsProvider>
    </AppActionsProvider>,
  );
}

describe("CopilotPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(copilotThreadsClient, "hydrateCopilotThreadsState").mockResolvedValue({
      activeThreadId: THREAD_ID,
      title: "New chat",
      modelId: "x-ai/grok-4.5",
      messages: [],
      threads: [
        {
          id: THREAD_ID,
          title: "New chat",
          schemaVersion: 1,
          syncRevision: 1,
          updatedAt: "2026-07-22T12:00:00.000Z",
          messageCount: 0,
        },
      ],
      syncRevision: 1,
    });
    vi.spyOn(copilotThreadsClient, "saveCopilotThreadState").mockResolvedValue({
      syncRevision: 1,
      title: "New chat",
    });
    vi.spyOn(copilotThreadsClient, "createCopilotThreadState").mockResolvedValue({
      threadId: "22222222-2222-4222-8222-222222222222",
      syncRevision: 1,
      title: "New chat",
      modelId: "x-ai/grok-4.5",
    });
    vi.spyOn(copilotThreadsClient, "loadCopilotThread").mockResolvedValue(null);
    vi.spyOn(copilotThreadsClient, "deleteCopilotThreadState").mockResolvedValue(undefined);
    vi.spyOn(copilotThreadsClient, "renameCopilotThreadState").mockResolvedValue({
      syncRevision: 2,
      title: "Renamed thread",
    });
  });

  it("shows workflow prompt chips in empty state", async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId("copilot-prompt-library")).toBeTruthy();
    });
    expect(screen.getByTestId("copilot-prompt-prepare_analysis")).toBeTruthy();
    expect(screen.getByTestId("copilot-prompt-summarize_thesis")).toBeTruthy();
  });

  it("sends workflow prompt when chip is clicked", async () => {
    const streamChatSpy = vi.spyOn(streamChatModule, "streamChat").mockResolvedValue({
      ok: true,
    });

    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId("copilot-prompt-summarize_thesis")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("copilot-prompt-summarize_thesis"));

    await waitFor(() => {
      expect(streamChatSpy).toHaveBeenCalled();
    });

    expect(streamChatSpy.mock.calls[0]?.[0].messages.at(-1)?.content).toContain(
      "data source",
    );
  });

  it("shows empty state before first message", async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId("copilot-empty")).toBeTruthy();
    });
    expect(screen.queryByRole("heading", { name: "Copilot" })).toBeNull();
  });

  it("hides dense header on empty and shows full brand on page variant", async () => {
    renderPanel("page");
    await waitFor(() => {
      expect(screen.getByTestId("copilot-empty-brand")).toBeTruthy();
    });
    expect(screen.getByTestId("copilot-empty-brand")).toHaveAttribute(
      "data-brand-variant",
      "full",
    );
    expect(screen.queryByTestId("copilot-model-select")).toBeNull();
    expect(screen.getByTestId("copilot-settings")).toBeTruthy();
  });

  it("shows mark-only brand in sidebar empty state", async () => {
    renderPanel("sidebar");
    await waitFor(() => {
      expect(screen.getByTestId("copilot-empty-brand")).toBeTruthy();
    });
    expect(screen.getByTestId("copilot-empty-brand")).toHaveAttribute(
      "data-brand-variant",
      "mark",
    );
  });

  it("uses hero composer placeholder on empty state", async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId("copilot-composer-input")).toBeTruthy();
    });
    expect(screen.getByPlaceholderText("What do you want to know?")).toBeTruthy();
    expect(screen.getByTestId("copilot-composer")).toHaveAttribute(
      "data-copilot-composer-mode",
      "hero",
    );
    expect(screen.getByTestId("copilot-query-bar")).toBeTruthy();
    expect(screen.getByTestId("copilot-attach")).toBeTruthy();
    expect(screen.getByTestId("copilot-model-chip")).toHaveTextContent(/Grok 4\.5/i);
  });

  it("streams assistant text and tool chips", async () => {
    vi.spyOn(streamChatModule, "streamChat").mockImplementation(async (_req, options) => {
      options.onEvent({ type: "text-delta", delta: "Hello" });
      options.onEvent({
        type: "tool-call",
        callId: "c1",
        name: "search_symbols",
        arguments: { query: "AAPL" },
      });
      options.onEvent({
        type: "tool-result",
        callId: "c1",
        ok: true,
        summary: "1 symbol",
      });
      options.onEvent({ type: "done" });
      return { ok: true };
    });

    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId("copilot-composer-input")).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId("copilot-composer-input"), {
      target: { value: "Find AAPL" },
    });
    fireEvent.click(screen.getByTestId("copilot-send"));

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeTruthy();
    });
    expect(screen.getByTestId("copilot-thoughts")).toBeTruthy();
    expect(screen.getByTestId("copilot-tool-c1")).toBeTruthy();
    expect(screen.getByText(/1 symbol/)).toBeTruthy();
  });

  it("shows config error when OpenRouter key is missing", async () => {
    vi.spyOn(streamChatModule, "streamChat").mockResolvedValue({
      ok: false,
      error: {
        kind: "missing_key",
        message: "Set OPENROUTER_API_KEY",
      },
    });

    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId("copilot-composer-input")).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId("copilot-composer-input"), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByTestId("copilot-send"));

    await waitFor(() => {
      expect(screen.getByTestId("copilot-config-banner")).toBeTruthy();
    });
  });

  it("shows confirm card and runs accept path", async () => {
    vi.spyOn(streamChatModule, "streamChat").mockImplementation(async (_req, options) => {
      options.onEvent({
        type: "tool-call",
        callId: "c2",
        name: "delete_drawing",
        arguments: { drawingId: "d1" },
      });
      options.onEvent({
        type: "confirm-required",
        callId: "c2",
        name: "delete_drawing",
        reason: "Confirm destructive action",
        arguments: { drawingId: "d1" },
      });
      options.onEvent({
        type: "tool-result",
        callId: "c2",
        ok: false,
        summary: "delete_drawing: awaiting your confirmation in chat",
      });
      options.onEvent({ type: "done" });
      return { ok: true };
    });

    vi.spyOn(confirmToolModule, "executeConfirmedTool").mockResolvedValue({
      ok: true,
      data: { deleted: true },
    });

    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId("copilot-composer-input")).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId("copilot-composer-input"), {
      target: { value: "Remove line" },
    });
    fireEvent.click(screen.getByTestId("copilot-send"));

    await waitFor(() => {
      expect(screen.getByTestId("copilot-confirm-accept-c2")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("copilot-confirm-accept-c2"));

    await waitFor(() => {
      expect(confirmToolModule.executeConfirmedTool).toHaveBeenCalled();
    });
  });

  it("creates a new chat thread from the header", async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId("copilot-new-chat")).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId("copilot-new-chat"));
    await waitFor(() => {
      expect(copilotThreadsClient.createCopilotThreadState).toHaveBeenCalled();
    });
  });

  it("renders in-bar model picker after first message", async () => {
    vi.spyOn(streamChatModule, "streamChat").mockResolvedValue({
      ok: true,
    });

    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId("copilot-composer-input")).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId("copilot-composer-input"), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByTestId("copilot-send"));

    await waitFor(() => {
      expect(screen.getByTestId("copilot-model-chip")).toHaveTextContent(/Grok 4\.5/i);
    });
    expect(screen.queryByTestId("copilot-model-select")).toBeNull();
  });

  it("changes model via in-bar picker and uses it on next send", async () => {
    const streamChatSpy = vi.spyOn(streamChatModule, "streamChat").mockResolvedValue({
      ok: true,
    });

    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId("copilot-composer-input")).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId("copilot-composer-input"), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByTestId("copilot-send"));

    await waitFor(() => {
      expect(screen.getByTestId("copilot-model-chip")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("copilot-model-chip"));
    fireEvent.click(screen.getByTestId("copilot-model-option-openai/gpt-5.6-sol"));

    fireEvent.change(screen.getByTestId("copilot-composer-input"), {
      target: { value: "second message" },
    });
    fireEvent.click(screen.getByTestId("copilot-send"));

    await waitFor(() => {
      expect(streamChatSpy.mock.calls.length).toBeGreaterThan(1);
    });

    expect(streamChatSpy.mock.calls.at(-1)?.[0]).toMatchObject({
      modelId: "openai/gpt-5.6-sol",
    });
  });

  it("opens Copilot model settings from the header cog", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            popular: [{ id: "openai/gpt-5.6-sol", label: "GPT-5.6 Sol", tools: true }],
            recent: [],
          }),
          { status: 200 },
        ),
      ),
    );

    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId("copilot-settings")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("copilot-settings"));

    await waitFor(() => {
      expect(screen.getByTestId("copilot-model-settings-modal")).toBeTruthy();
    });
  });

  it("passes selected modelId when sending a message", async () => {
    const streamChatSpy = vi.spyOn(streamChatModule, "streamChat").mockResolvedValue({
      ok: true,
    });

    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId("copilot-composer-input")).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId("copilot-composer-input"), {
      target: { value: "Summarize chart" },
    });
    fireEvent.click(screen.getByTestId("copilot-send"));

    await waitFor(() => {
      expect(streamChatSpy).toHaveBeenCalled();
    });

    expect(streamChatSpy.mock.calls[0]?.[0]).toMatchObject({
      modelId: "x-ai/grok-4.5",
    });
  });

  it("shows history rail on page variant after first message", async () => {
    vi.spyOn(streamChatModule, "streamChat").mockResolvedValue({
      ok: true,
    });

    renderPanel("page");
    await waitFor(() => {
      expect(screen.getByTestId("copilot-composer-input")).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId("copilot-composer-input"), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByTestId("copilot-send"));

    await waitFor(() => {
      expect(screen.getByTestId("copilot-history-rail")).toBeTruthy();
    });
    expect(screen.queryByTestId("copilot-thread-select")).toBeNull();
  });

  it("keeps sidebar thread select instead of history rail", async () => {
    vi.spyOn(copilotThreadsClient, "hydrateCopilotThreadsState").mockResolvedValue({
      activeThreadId: THREAD_ID,
      title: "New chat",
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
          content: "Hi",
          toolSteps: [],
          status: "done",
        },
      ],
      threads: [
        {
          id: THREAD_ID,
          title: "New chat",
          schemaVersion: 1,
          syncRevision: 1,
          updatedAt: "2026-07-22T12:00:00.000Z",
          messageCount: 2,
        },
      ],
      syncRevision: 1,
    });

    renderPanel("sidebar");
    await waitFor(() => {
      expect(screen.getByTestId("copilot-thread-select")).toBeTruthy();
    });
    expect(screen.queryByTestId("copilot-history-rail")).toBeNull();
  });

  it("regenerates the last assistant turn", async () => {
    const streamChatSpy = vi.spyOn(streamChatModule, "streamChat").mockResolvedValue({
      ok: true,
    });

    vi.spyOn(copilotThreadsClient, "hydrateCopilotThreadsState").mockResolvedValue({
      activeThreadId: THREAD_ID,
      title: "New chat",
      modelId: "x-ai/grok-4.5",
      messages: [
        {
          id: "m1",
          role: "user",
          content: "Summarize chart",
          toolSteps: [],
          status: "done",
        },
        {
          id: "m2",
          role: "assistant",
          content: "Old answer",
          toolSteps: [],
          status: "done",
        },
      ],
      threads: [
        {
          id: THREAD_ID,
          title: "New chat",
          schemaVersion: 1,
          syncRevision: 1,
          updatedAt: "2026-07-22T12:00:00.000Z",
          messageCount: 2,
        },
      ],
      syncRevision: 1,
    });

    renderPanel();
    await waitFor(() => {
      expect(screen.getByTestId("copilot-regenerate-m2")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("copilot-regenerate-m2"));

    await waitFor(() => {
      expect(streamChatSpy).toHaveBeenCalled();
    });

    expect(streamChatSpy.mock.calls.at(-1)?.[0].messages.at(-1)?.content).toBe(
      "Summarize chart",
    );
  });
});
