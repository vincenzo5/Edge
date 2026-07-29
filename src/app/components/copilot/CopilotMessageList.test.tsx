/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopilotArtifactCard } from "./CopilotArtifactCard";
import { CopilotMessageList } from "./CopilotMessageList";
import type { CopilotMessage } from "./useCopilotThread";

const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

function mockCopilotScrollContainer() {
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    if (this.getAttribute("data-testid") === "copilot-message-list") {
      return {
        width: 640,
        height: 480,
        top: 0,
        left: 0,
        bottom: 480,
        right: 640,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    }
    return originalGetBoundingClientRect.call(this);
  };

  class MockResizeObserver {
    private callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      const rect = target.getBoundingClientRect();
      this.callback(
        [
          {
            target,
            contentRect: {
              width: rect.width,
              height: rect.height,
              top: 0,
              left: 0,
              bottom: rect.height,
              right: rect.width,
              x: 0,
              y: 0,
              toJSON: () => ({}),
            },
          } as ResizeObserverEntry,
        ],
        this,
      );
    }

    unobserve() {}

    disconnect() {}
  }

  vi.stubGlobal("ResizeObserver", MockResizeObserver);
}

const baseMessages: CopilotMessage[] = [
  {
    id: "u1",
    role: "user",
    content: "Find AAPL",
    toolSteps: [],
    status: "done",
  },
  {
    id: "a1",
    role: "assistant",
    content: "Here is AAPL.",
    toolSteps: [
      {
        callId: "c1",
        name: "search_symbols",
        status: "done",
        summary: "1 symbol",
      },
    ],
    status: "done",
  },
];

describe("CopilotMessageList", () => {
  beforeEach(() => {
    mockCopilotScrollContainer();
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    vi.unstubAllGlobals();
  });

  it("centers messages in the same max-width column as the composer bar", () => {
    render(
      <CopilotMessageList
        messages={baseMessages}
        configError={null}
        onResolveConfirm={vi.fn()}
      />,
    );

    const list = screen.getByTestId("copilot-message-list");
    const column = screen.getByTestId("copilot-message-column");
    expect(list.className).toContain("px-[var(--edge-space-4)]");
    expect(list.className).toContain("pb-0");
    expect(column.className).toContain("max-w-[var(--copilot-bar-max-width)]");
    expect(column.className).toContain("mx-auto");
    expect(column.className).toContain("w-full");
    // Match attach (+) glyph: query-bar pad + centered icon inset.
    expect(column.className).toContain("px-[var(--copilot-message-inline-inset)]");
  });

  it("wraps non-confirm tool steps in Steps and keeps confirm chips outside", () => {
    const messages: CopilotMessage[] = [
      ...baseMessages.slice(0, 1),
      {
        id: "a2",
        role: "assistant",
        content: "Confirm delete?",
        toolSteps: [
          {
            callId: "c2",
            name: "delete_drawing",
            status: "pending-confirm",
            confirmReason: "Confirm destructive action",
          },
          {
            callId: "c3",
            name: "search_symbols",
            status: "done",
            summary: "1 symbol",
          },
        ],
        status: "done",
      },
    ];

    render(
      <CopilotMessageList
        messages={messages}
        configError={null}
        onResolveConfirm={vi.fn()}
      />,
    );

    const thoughts = screen.getByTestId("copilot-thoughts");
    expect(thoughts).toBeTruthy();
    expect(thoughts.tagName).toBe("DETAILS");
    expect(thoughts.className).not.toMatch(/border|bg-\[/);
    expect(thoughts.querySelector("summary")?.textContent).toMatch(/Steps · 1/);
    const stepRow = screen.getByTestId("copilot-tool-c3");
    expect(stepRow.textContent).toMatch(/Symbol search/);
    expect(stepRow.textContent).toMatch(/1 symbol/);
    expect(stepRow.textContent).not.toMatch(/search_symbols/);
    expect(stepRow.className).toMatch(/min-w-0/);
    expect(thoughts.className).toMatch(/min-w-0/);
    expect(screen.getByTestId("copilot-confirm-accept-c2")).toBeTruthy();
    expect(screen.queryByTestId("copilot-confirm-accept-c3")).toBeNull();
  });

  it("shows copy and regenerate actions on the last completed assistant turn", () => {
    const onRegenerate = vi.fn();

    render(
      <CopilotMessageList
        messages={baseMessages}
        configError={null}
        onResolveConfirm={vi.fn()}
        onRegenerate={onRegenerate}
      />,
    );

    fireEvent.click(screen.getByTestId("copilot-regenerate-a1"));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("copilot-copy-a1")).toBeTruthy();
    expect(screen.getByTestId("copilot-message-actions-a1")).toHaveAttribute(
      "data-reveal",
      "always",
    );
  });

  it("shows hover-revealed actions on earlier assistant turns", () => {
    const messages: CopilotMessage[] = [
      ...baseMessages,
      {
        id: "u2",
        role: "user",
        content: "And NVDA?",
        toolSteps: [],
        status: "done",
      },
      {
        id: "a2",
        role: "assistant",
        content: "Here is NVDA.",
        toolSteps: [],
        status: "done",
      },
    ];

    render(
      <CopilotMessageList
        messages={messages}
        configError={null}
        onResolveConfirm={vi.fn()}
        onRegenerate={vi.fn()}
      />,
    );

    expect(screen.getByTestId("copilot-message-actions-a1")).toHaveAttribute(
      "data-reveal",
      "hover",
    );
    expect(screen.getByTestId("copilot-copy-a1")).toBeTruthy();
    expect(screen.queryByTestId("copilot-regenerate-a1")).toBeNull();
    expect(screen.getByTestId("copilot-message-actions-a2")).toHaveAttribute(
      "data-reveal",
      "always",
    );
    expect(screen.getByTestId("copilot-regenerate-a2")).toBeTruthy();
  });

  it("hides regenerate while streaming", () => {
    const streamingMessages: CopilotMessage[] = [
      ...baseMessages.slice(0, 1),
      {
        id: "a-stream",
        role: "assistant",
        content: "",
        toolSteps: [],
        status: "streaming",
      },
    ];

    render(
      <CopilotMessageList
        messages={streamingMessages}
        configError={null}
        onResolveConfirm={vi.fn()}
        isStreaming
        onRegenerate={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("copilot-regenerate-a-stream")).toBeNull();
    expect(screen.getByTestId("copilot-working-indicator")).toBeTruthy();
    expect(screen.getByTestId("copilot-working-label")).toHaveTextContent(/Working for \d+s/);
  });

  it("renders artifact cards outside Steps with pin control", () => {
    const onPinArtifact = vi.fn();
    const messages: CopilotMessage[] = [
      {
        id: "a-artifact",
        role: "assistant",
        content: "Chart state loaded.",
        toolSteps: [
          {
            callId: "c-chart",
            name: "get_chart_state",
            status: "done",
            summary: "get_chart_state ok",
            artifactHint: {
              type: "chart",
              symbol: "NVDA",
              interval: "5",
              title: "NVDA · 5",
            },
          },
        ],
        status: "done",
      },
    ];

    render(
      <CopilotMessageList
        messages={messages}
        configError={null}
        onResolveConfirm={vi.fn()}
        onPinArtifact={onPinArtifact}
        isArtifactPinned={() => false}
      />,
    );

    expect(screen.getByTestId("copilot-artifact-c-chart")).toBeTruthy();
    expect(screen.queryByTestId("copilot-thoughts")).toBeNull();
    fireEvent.click(screen.getByTestId("copilot-artifact-pin"));
    expect(onPinArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ type: "chart", symbol: "NVDA" }),
      { messageId: "a-artifact", toolCallId: "c-chart" },
    );
  });

  it("shows pinned state on artifact cards", () => {
    render(
      <CopilotArtifactCard
        hint={{ type: "chart", symbol: "AAPL", interval: "D", title: "AAPL · D" }}
        pinned
        onPin={vi.fn()}
      />,
    );

    expect(screen.getByTestId("copilot-artifact-pinned")).toBeTruthy();
  });

  it("shows scroll-to-bottom when scrolled up and jumps to latest on click", () => {
    const manyMessages: CopilotMessage[] = Array.from({ length: 40 }, (_, index) => ({
      id: `m-${index}`,
      role: index % 2 === 0 ? "user" : "assistant",
      content: `Message ${index}`,
      toolSteps: [],
      status: "done",
    }));

    render(
      <div className="flex h-[480px] min-h-0 flex-col">
        <CopilotMessageList
          messages={manyMessages}
          configError={null}
          onResolveConfirm={vi.fn()}
        />
      </div>,
    );

    const list = screen.getByTestId("copilot-message-list");
    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 2000 });
    Object.defineProperty(list, "clientHeight", { configurable: true, value: 480 });
    Object.defineProperty(list, "scrollTop", {
      configurable: true,
      writable: true,
      value: 0,
    });

    fireEvent.wheel(list, { deltaY: -120 });
    fireEvent.scroll(list);
    expect(screen.getByTestId("copilot-scroll-to-bottom")).toBeTruthy();

    fireEvent.click(screen.getByTestId("copilot-scroll-to-bottom"));
    expect(list.scrollTop).toBe(2000);
    expect(screen.queryByTestId("copilot-scroll-to-bottom")).toBeNull();

    Object.defineProperty(list, "scrollTop", {
      configurable: true,
      writable: true,
      value: 1520,
    });
    fireEvent.scroll(list);
    expect(screen.queryByTestId("copilot-scroll-to-bottom")).toBeNull();
  });

  it("pins to latest when a new user message is sent even if scrolled up", () => {
    const initialMessages: CopilotMessage[] = Array.from({ length: 20 }, (_, index) => ({
      id: `m-${index}`,
      role: index % 2 === 0 ? "user" : "assistant",
      content: `Message ${index}`,
      toolSteps: [],
      status: "done",
    }));

    const { rerender } = render(
      <div className="flex h-[480px] min-h-0 flex-col">
        <CopilotMessageList
          messages={initialMessages}
          configError={null}
          onResolveConfirm={vi.fn()}
        />
      </div>,
    );

    const list = screen.getByTestId("copilot-message-list");
    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 2000 });
    Object.defineProperty(list, "clientHeight", { configurable: true, value: 480 });
    Object.defineProperty(list, "scrollTop", {
      configurable: true,
      writable: true,
      value: 0,
    });
    fireEvent.wheel(list, { deltaY: -120 });
    fireEvent.scroll(list);
    expect(screen.getByTestId("copilot-scroll-to-bottom")).toBeTruthy();

    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 2400 });

    const nextMessages: CopilotMessage[] = [
      ...initialMessages,
      {
        id: "u-new",
        role: "user",
        content: "New question",
        toolSteps: [],
        status: "done",
      },
      {
        id: "a-new",
        role: "assistant",
        content: "",
        toolSteps: [],
        status: "streaming",
      },
    ];

    rerender(
      <div className="flex h-[480px] min-h-0 flex-col">
        <CopilotMessageList
          messages={nextMessages}
          configError={null}
          onResolveConfirm={vi.fn()}
        />
      </div>,
    );

    expect(list.scrollTop).toBe(2400);
    expect(screen.queryByTestId("copilot-scroll-to-bottom")).toBeNull();
  });

  it("hides scroll-to-bottom when already near the latest messages", () => {
    render(
      <CopilotMessageList
        messages={baseMessages}
        configError={null}
        onResolveConfirm={vi.fn()}
      />,
    );

    const list = screen.getByTestId("copilot-message-list");
    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 500 });
    Object.defineProperty(list, "clientHeight", { configurable: true, value: 480 });
    Object.defineProperty(list, "scrollTop", {
      configurable: true,
      writable: true,
      value: 0,
    });

    fireEvent.wheel(list, { deltaY: -40 });
    fireEvent.scroll(list);
    expect(screen.queryByTestId("copilot-scroll-to-bottom")).toBeNull();
  });

  it("does not snap back while slowly scrolling up through the near-bottom zone", () => {
    const manyMessages: CopilotMessage[] = Array.from({ length: 40 }, (_, index) => ({
      id: `m-${index}`,
      role: index % 2 === 0 ? "user" : "assistant",
      content: `Message ${index}`,
      toolSteps: [],
      status: "done",
    }));

    render(
      <div className="flex h-[480px] min-h-0 flex-col">
        <CopilotMessageList
          messages={manyMessages}
          configError={null}
          onResolveConfirm={vi.fn()}
        />
      </div>,
    );

    const list = screen.getByTestId("copilot-message-list");
    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 2000 });
    Object.defineProperty(list, "clientHeight", { configurable: true, value: 480 });
    Object.defineProperty(list, "scrollTop", {
      configurable: true,
      writable: true,
      value: 1520,
    });
    fireEvent.scroll(list);

    // Weak upward step still inside the 96px near-bottom threshold.
    Object.defineProperty(list, "scrollTop", {
      configurable: true,
      writable: true,
      value: 1480,
    });
    fireEvent.wheel(list, { deltaY: -20 });
    fireEvent.scroll(list);

    // Content/layout resize must not yank a user who has started scrolling up.
    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 2050 });
    fireEvent.scroll(list);
    expect(list.scrollTop).toBe(1480);

    // Continue past the threshold without needing a fast fling.
    Object.defineProperty(list, "scrollTop", {
      configurable: true,
      writable: true,
      value: 1200,
    });
    fireEvent.wheel(list, { deltaY: -40 });
    fireEvent.scroll(list);
    expect(list.scrollTop).toBe(1200);
    expect(screen.getByTestId("copilot-scroll-to-bottom")).toBeTruthy();
  });

  it("virtualizes long threads without mounting every message bubble", () => {
    const manyMessages: CopilotMessage[] = Array.from({ length: 120 }, (_, index) => ({
      id: `m-${index}`,
      role: index % 2 === 0 ? "user" : "assistant",
      content: `Message ${index}`,
      toolSteps: [],
      status: "done",
    }));

    render(
      <div className="flex h-[480px] min-h-0 flex-col">
        <CopilotMessageList
          messages={manyMessages}
          configError={null}
          onResolveConfirm={vi.fn()}
        />
      </div>,
    );

    const bubbles = screen.getAllByTestId(/^copilot-message-m-/);
    expect(bubbles.length).toBeGreaterThan(0);
    expect(bubbles.length).toBeLessThan(120);
  });

  it("keeps streaming bubble mounted while token content updates", () => {
    const history: CopilotMessage[] = Array.from({ length: 40 }, (_, index) => ({
      id: `hist-${index}`,
      role: index % 2 === 0 ? "user" : "assistant",
      content: `History ${index}`,
      toolSteps: [],
      status: "done",
    }));
    const streamingMessages: CopilotMessage[] = [
      ...history,
      {
        id: "stream-1",
        role: "assistant",
        content: "Partial",
        toolSteps: [],
        status: "streaming",
      },
    ];

    const { rerender } = render(
      <div className="flex h-[480px] min-h-0 flex-col">
        <CopilotMessageList
          messages={streamingMessages}
          configError={null}
          onResolveConfirm={vi.fn()}
          isStreaming
        />
      </div>,
    );

    expect(screen.getByTestId("copilot-message-stream-1")).toBeTruthy();
    expect(screen.getAllByTestId(/^copilot-message-hist-/).length).toBeLessThan(40);

    rerender(
      <div className="flex h-[480px] min-h-0 flex-col">
        <CopilotMessageList
          messages={[
            ...history,
            {
              id: "stream-1",
              role: "assistant",
              content: "Partial response grows",
              toolSteps: [],
              status: "streaming",
            },
          ]}
          configError={null}
          onResolveConfirm={vi.fn()}
          isStreaming
        />
      </div>,
    );

    expect(screen.getByTestId("copilot-message-stream-1")).toHaveTextContent(
      "Partial response grows",
    );
    expect(screen.getAllByTestId(/^copilot-message-hist-/).length).toBeLessThan(40);
  });

  it("does not yank scroll position when unpinned and stream content grows", () => {
    const history: CopilotMessage[] = Array.from({ length: 30 }, (_, index) => ({
      id: `hist-${index}`,
      role: index % 2 === 0 ? "user" : "assistant",
      content: `History ${index}`,
      toolSteps: [],
      status: "done",
    }));
    const initialStreaming: CopilotMessage[] = [
      ...history,
      {
        id: "stream-1",
        role: "assistant",
        content: "Partial",
        toolSteps: [],
        status: "streaming",
      },
    ];

    const { rerender } = render(
      <div className="flex h-[480px] min-h-0 flex-col">
        <CopilotMessageList
          messages={initialStreaming}
          configError={null}
          onResolveConfirm={vi.fn()}
          isStreaming
        />
      </div>,
    );

    const list = screen.getByTestId("copilot-message-list");
    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 3000 });
    Object.defineProperty(list, "clientHeight", { configurable: true, value: 480 });
    Object.defineProperty(list, "scrollTop", {
      configurable: true,
      writable: true,
      value: 0,
    });

    fireEvent.wheel(list, { deltaY: -120 });
    fireEvent.scroll(list);
    expect(screen.getByTestId("copilot-scroll-to-bottom")).toBeTruthy();

    Object.defineProperty(list, "scrollTop", {
      configurable: true,
      writable: true,
      value: 400,
    });
    const pinnedScrollTop = list.scrollTop;

    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 3600 });

    rerender(
      <div className="flex h-[480px] min-h-0 flex-col">
        <CopilotMessageList
          messages={[
            ...history,
            {
              id: "stream-1",
              role: "assistant",
              content: "Partial response grows much longer during stream",
              toolSteps: [],
              status: "streaming",
            },
          ]}
          configError={null}
          onResolveConfirm={vi.fn()}
          isStreaming
        />
      </div>,
    );

    expect(list.scrollTop).toBe(pinnedScrollTop);
    expect(screen.getByTestId("copilot-scroll-to-bottom")).toBeTruthy();
  });
});
