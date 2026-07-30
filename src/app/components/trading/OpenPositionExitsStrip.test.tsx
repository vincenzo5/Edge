import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OpenPositionExitsStrip } from "./OpenPositionExitsStrip";
import type { OpenPositionExitsSummary } from "@/lib/trading/summarizeOpenPositionExits";

function summary(overrides: Partial<OpenPositionExitsSummary> = {}): OpenPositionExitsSummary {
  return {
    protect: {
      attached: true,
      kind: "stop",
      label: "STP 180.00",
    },
    manage: {
      attached: false,
      label: "Off",
      nextDistance: null,
      nextActionPreview: null,
      completedLabels: [],
      pauseMessage: null,
    },
    warnings: [],
    ...overrides,
  };
}

describe("OpenPositionExitsStrip", () => {
  it("shows protect label when attached", () => {
    render(<OpenPositionExitsStrip summary={summary()} symbol="AAPL" />);
    expect(screen.getByTestId("open-position-protect-AAPL")).toHaveTextContent(
      "Protect: STP 180.00",
    );
  });

  it("shows manage lines when attached", () => {
    render(
      <OpenPositionExitsStrip
        summary={summary({
          manage: {
            attached: true,
            label: "Manage: Half + trail · armed",
            nextDistance: "+0.8R to scale",
            nextActionPreview: "Scale 50% at 105.00 → reduce 5 shares",
            completedLabels: [],
            pauseMessage: null,
          },
        })}
        symbol="AAPL"
      />,
    );
    expect(screen.getByTestId("open-position-manage-AAPL")).toHaveTextContent(
      "Manage: Half + trail · armed",
    );
    expect(screen.getByTestId("open-position-manage-next-AAPL")).toHaveTextContent(
      "+0.8R to scale · Scale 50% at 105.00 → reduce 5 shares",
    );
  });

  it("shows completed rules and pause message", () => {
    render(
      <OpenPositionExitsStrip
        summary={summary({
          manage: {
            attached: true,
            label: "Manage: Half + trail · paused",
            nextDistance: "trail",
            nextActionPreview: "Trail remainder → trail remainder",
            completedLabels: ["scale"],
            pauseMessage: "Manage paused — stop moved manually",
          },
        })}
        symbol="AAPL"
      />,
    );
    expect(screen.getByTestId("open-position-manage-done-AAPL")).toHaveTextContent("Done: scale");
    expect(screen.getByTestId("open-position-manage-pause-AAPL")).toHaveTextContent(
      "Manage paused — stop moved manually",
    );
  });

  it("shows unprotected callout and protect action", () => {
    const onProtect = vi.fn();
    render(
      <OpenPositionExitsStrip
        summary={summary({
          protect: { attached: false, kind: "unprotected", label: "Unprotected" },
          warnings: ["unprotected"],
        })}
        symbol="AAPL"
        onProtect={onProtect}
      />,
    );
    expect(screen.getByTestId("open-position-unprotected-AAPL")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("open-position-protect-action-AAPL"));
    expect(onProtect).toHaveBeenCalled();
  });

  it("shows failure mode when protect attached", () => {
    render(<OpenPositionExitsStrip summary={summary()} symbol="AAPL" />);
    expect(screen.getByTestId("open-position-failure-mode-AAPL")).toHaveTextContent(
      "Broker stop stays live if Edge is down",
    );
  });

  it("shows critical manage_without_protect callout", () => {
    const onProtect = vi.fn();
    render(
      <OpenPositionExitsStrip
        summary={summary({
          protect: { attached: false, kind: "unprotected", label: "Unprotected" },
          manage: {
            attached: true,
            label: "Manage: Half + trail · armed",
            nextDistance: "+0.8R to scale",
            nextActionPreview: "Scale 50%",
            completedLabels: [],
            pauseMessage: null,
          },
          warnings: ["manage_without_protect"],
        })}
        symbol="AAPL"
        onProtect={onProtect}
      />,
    );
    expect(screen.getByTestId("open-position-manage-without-protect-AAPL")).toBeInTheDocument();
    expect(screen.queryByTestId("open-position-failure-mode-AAPL")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("open-position-protect-action-AAPL"));
    expect(onProtect).toHaveBeenCalled();
  });
});
