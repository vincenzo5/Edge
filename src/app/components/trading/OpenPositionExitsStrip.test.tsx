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
          },
        })}
        symbol="AAPL"
      />,
    );
    expect(screen.getByTestId("open-position-manage-AAPL")).toHaveTextContent(
      "Manage: Half + trail · armed",
    );
    expect(screen.getByTestId("open-position-manage-distance-AAPL")).toHaveTextContent(
      "+0.8R to scale",
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
});
