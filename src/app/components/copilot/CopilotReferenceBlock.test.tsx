/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopilotReferenceBlock } from "./CopilotReferenceBlock";

describe("CopilotReferenceBlock", () => {
  it("opens symbol-interval chips via onOpen", () => {
    const onOpen = vi.fn();
    render(
      <CopilotReferenceBlock
        block={{
          kind: "reference",
          chips: [
            {
              id: "ref-1",
              label: "AAPL · 1D",
              target: { type: "symbol-interval", symbol: "AAPL", interval: "1D" },
            },
          ],
        }}
        onOpen={onOpen}
      />,
    );

    fireEvent.click(screen.getByTestId("copilot-reference-chip-ref-1"));
    expect(onOpen).toHaveBeenCalledWith("/chart?symbol=AAPL&interval=1D");
  });

  it("opens href targets", () => {
    const onOpen = vi.fn();
    render(
      <CopilotReferenceBlock
        block={{
          kind: "reference",
          chips: [
            {
              id: "ref-2",
              label: "Provider docs",
              target: { type: "href", href: "https://example.com/docs" },
            },
          ],
        }}
        onOpen={onOpen}
      />,
    );

    fireEvent.click(screen.getByTestId("copilot-reference-chip-ref-2"));
    expect(onOpen).toHaveBeenCalledWith("https://example.com/docs");
  });

  it("collapses overflow chips until expanded", () => {
    const chips = Array.from({ length: 6 }, (_, index) => ({
      id: `ref-${index}`,
      label: `SYM${index} · D`,
      target: { type: "symbol-interval" as const, symbol: `SYM${index}`, interval: "D" },
    }));

    render(
      <CopilotReferenceBlock
        block={{ kind: "reference", chips }}
        onOpen={vi.fn()}
        visibleChipCount={4}
      />,
    );

    expect(screen.getByTestId("copilot-reference-chip-ref-0")).toBeTruthy();
    expect(screen.getByTestId("copilot-reference-chip-ref-3")).toBeTruthy();
    expect(screen.queryByTestId("copilot-reference-chip-ref-4")).toBeNull();
    expect(screen.getByTestId("copilot-reference-overflow")).toHaveTextContent("+2");

    fireEvent.click(screen.getByTestId("copilot-reference-overflow"));
    expect(screen.getByTestId("copilot-reference-chip-ref-5")).toBeTruthy();
    expect(screen.queryByTestId("copilot-reference-overflow")).toBeNull();
  });

  it("renders labeled sources disclosure when chip count exceeds threshold", () => {
    const chips = Array.from({ length: 4 }, (_, index) => ({
      id: `ref-${index}`,
      label: `SYM${index} · D`,
      target: { type: "symbol-interval" as const, symbol: `SYM${index}`, interval: "D" },
    }));

    render(
      <CopilotReferenceBlock
        block={{ kind: "reference", chips }}
        onOpen={vi.fn()}
        labeled
        collapseThreshold={3}
      />,
    );

    expect(screen.getByTestId("copilot-sources-disclosure")).toBeTruthy();
    expect(screen.getByText("4 sources")).toBeTruthy();
  });

  it("renders a Sources label for small labeled sets", () => {
    render(
      <CopilotReferenceBlock
        block={{
          kind: "reference",
          chips: [
            {
              id: "ref-1",
              label: "AAPL · 1D",
              target: { type: "symbol-interval", symbol: "AAPL", interval: "1D" },
            },
          ],
        }}
        onOpen={vi.fn()}
        labeled
      />,
    );

    expect(screen.getByText("Sources")).toBeTruthy();
    expect(screen.queryByTestId("copilot-sources-disclosure")).toBeNull();
  });
});
