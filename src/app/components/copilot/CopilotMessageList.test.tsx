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

  it("wraps non-confirm tool steps in Thoughts and keeps confirm chips outside", () => {
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

    expect(screen.getByTestId("copilot-thoughts")).toBeTruthy();
    expect(screen.getByTestId("copilot-tool-c3")).toBeTruthy();
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
    expect(screen.getByText(/Thinking/)).toBeTruthy();
  });

  it("renders artifact cards outside Thoughts with pin control", () => {
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
});
