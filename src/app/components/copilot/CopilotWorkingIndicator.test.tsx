import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopilotWorkingIndicator } from "./CopilotWorkingIndicator";

describe("CopilotWorkingIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders ascending price bars and live working timer", () => {
    const startedAt = Date.now();
    render(<CopilotWorkingIndicator startedAt={startedAt} />);

    expect(screen.getByTestId("copilot-working-indicator")).toBeTruthy();
    expect(screen.getByTestId("copilot-working-label")).toHaveTextContent("Working for 0s");
    expect(screen.getByTestId("copilot-working-bars")).toBeTruthy();

    const bars = document.querySelectorAll(".copilot-working-bar");
    expect(bars).toHaveLength(5);

    const heights = [...bars].map((bar) =>
      Number.parseFloat((bar as HTMLElement).style.height),
    );
    expect(heights).toEqual([5, 8, 11, 14, 17]);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("copilot-working-label")).toHaveTextContent("Working for 1s");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId("copilot-working-label")).toHaveTextContent("Working for 3s");
    expect(screen.getByLabelText("Working for 3 seconds")).toBeTruthy();
  });
});
