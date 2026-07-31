/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CopilotMessageBubble from "./CopilotMessageBubble";
import type { CopilotMessage } from "./useCopilotThread";

describe("CopilotMessageBubble", () => {
  it("renders user attachments through the media block shell", () => {
    const message: CopilotMessage = {
      id: "u-1",
      role: "user",
      content: "What do you see?",
      attachments: [
        {
          id: "att-1",
          mimeType: "image/png",
          name: "capture.png",
        },
      ],
      toolSteps: [],
      status: "done",
    };

    render(
      <CopilotMessageBubble
        message={message}
        onResolveConfirm={vi.fn()}
        onOpenHref={vi.fn()}
      />,
    );

    expect(screen.getByTestId("copilot-message-attachments-u-1")).toBeTruthy();
    expect(screen.getByTestId("copilot-media-att-1")).toBeTruthy();
    expect(screen.getByText("capture.png")).toBeTruthy();
  });

  it("renders screener artifact hints through the data block shell", () => {
    const onPinArtifact = vi.fn();
    const message: CopilotMessage = {
      id: "a-1",
      role: "assistant",
      content: "Here are the results.",
      toolSteps: [
        {
          callId: "c-screen",
          name: "summarize_screen",
          status: "done",
          artifactHint: {
            type: "screener",
            title: "Momentum screen",
            queryLabel: "Large-cap momentum",
          },
        },
      ],
      status: "done",
    };

    render(
      <CopilotMessageBubble
        message={message}
        onResolveConfirm={vi.fn()}
        onPinArtifact={onPinArtifact}
        onOpenHref={vi.fn()}
      />,
    );

    expect(screen.getByTestId("copilot-artifact-c-screen")).toBeTruthy();
    expect(screen.getByText("Momentum screen")).toBeTruthy();
    expect(screen.getByText("Large-cap momentum")).toBeTruthy();
    fireEvent.click(screen.getByTestId("copilot-artifact-pin"));
    expect(onPinArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ type: "screener" }),
      { messageId: "a-1", toolCallId: "c-screen" },
    );
  });

  it("renders chart artifact hints through the media block shell", () => {
    const message: CopilotMessage = {
      id: "a-2",
      role: "assistant",
      content: "Chart loaded.",
      toolSteps: [
        {
          callId: "c-chart",
          name: "get_chart_state",
          status: "done",
          artifactHint: {
            type: "chart",
            symbol: "NVDA",
            interval: "5",
            title: "NVDA · 5",
          },
        },
      ],
      status: "done",
    };

    render(
      <CopilotMessageBubble
        message={message}
        onResolveConfirm={vi.fn()}
        onOpenHref={vi.fn()}
      />,
    );

    expect(screen.getByTestId("copilot-artifact-c-chart")).toBeTruthy();
    expect(screen.getByTestId("copilot-reference-a-2")).toBeTruthy();
    expect(screen.getByTestId("copilot-media-open")).toBeTruthy();
  });

  it("renders reference chips under chart tool turns", () => {
    const onOpenHref = vi.fn();
    const message: CopilotMessage = {
      id: "a-3",
      role: "assistant",
      content: "Loaded the chart.",
      toolSteps: [
        {
          callId: "c-chart-ref",
          name: "get_chart_state",
          status: "done",
          artifactHint: {
            type: "chart",
            symbol: "AAPL",
            interval: "1D",
            title: "AAPL · 1D",
          },
        },
      ],
      status: "done",
    };

    render(
      <CopilotMessageBubble
        message={message}
        onResolveConfirm={vi.fn()}
        onOpenHref={onOpenHref}
      />,
    );

    expect(screen.getByTestId("copilot-reference-a-3")).toBeTruthy();
    fireEvent.click(screen.getByTestId("copilot-reference-chip-c-chart-ref-chart"));
    expect(onOpenHref).toHaveBeenCalledWith("/chart?symbol=AAPL&interval=1D");
  });

  it("renders follow-up chips when showFollowups is true", () => {
    const onSelectFollowup = vi.fn();
    const message: CopilotMessage = {
      id: "a-4",
      role: "assistant",
      content: "Done.",
      toolSteps: [],
      status: "done",
    };

    render(
      <CopilotMessageBubble
        message={message}
        onResolveConfirm={vi.fn()}
        showFollowups
        onSelectFollowup={onSelectFollowup}
      />,
    );

    expect(screen.getByTestId("copilot-followups-a-4")).toBeTruthy();
    fireEvent.click(screen.getByTestId("copilot-followup-chip-prepare_analysis"));
    expect(onSelectFollowup).toHaveBeenCalledWith(
      expect.stringContaining("Prepare the active symbol for analysis"),
    );
  });

  it("hides follow-up chips when showFollowups is false", () => {
    const message: CopilotMessage = {
      id: "a-5",
      role: "assistant",
      content: "Done.",
      toolSteps: [],
      status: "done",
    };

    render(
      <CopilotMessageBubble
        message={message}
        onResolveConfirm={vi.fn()}
        showFollowups={false}
        onSelectFollowup={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("copilot-followups-a-5")).toBeNull();
  });

  it("shows Thought for Ns and expandable trace chips when duration is set", () => {
    const message: CopilotMessage = {
      id: "a-6",
      role: "assistant",
      content: "Answer.",
      toolSteps: [
        {
          callId: "c-read",
          name: "get_chart_state",
          status: "done",
          summary: "CSCO · 1d interval",
        },
      ],
      status: "done",
      thoughtDurationSec: 4,
    };

    render(<CopilotMessageBubble message={message} onResolveConfirm={vi.fn()} />);

    expect(screen.getByTestId("copilot-thoughts").textContent).toMatch(/Thought for 4s/);
    const chip = screen.getByTestId("copilot-tool-c-read");
    expect(chip.tagName).toBe("BUTTON");
    expect(chip.textContent).toMatch(/Chart state/);
    expect(chip.textContent).toMatch(/CSCO · 1d interval/);
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("data-expanded", "true");
  });

  it("wraps assistant prose, sources, and follow-ups in answer compose", () => {
    const message: CopilotMessage = {
      id: "a-7",
      role: "assistant",
      content: "Streaming answer.",
      toolSteps: [
        {
          callId: "c-ref",
          name: "get_chart_state",
          status: "done",
          artifactHint: { type: "chart", symbol: "AAPL", interval: "1D" },
        },
      ],
      status: "streaming",
    };

    render(
      <CopilotMessageBubble
        message={message}
        onResolveConfirm={vi.fn()}
        onOpenHref={vi.fn()}
        showFollowups
        onSelectFollowup={vi.fn()}
      />,
    );

    const compose = screen.getByTestId("copilot-answer-compose");
    expect(compose).toBeTruthy();
    expect(compose.querySelector(".copilot-streaming-cursor")).toBeTruthy();
    expect(screen.getByText("Sources")).toBeTruthy();
    expect(screen.getByText("Follow-ups")).toBeTruthy();
  });
});
