/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DataChatBlock } from "@/lib/copilot/chatBlocks";
import { CopilotDataBlock } from "./CopilotDataBlock";

const kvBlock: DataChatBlock = {
  kind: "data",
  shape: "kv",
  title: "Screener results",
  entries: [{ key: "Summary", value: "Tech momentum" }],
  pinHint: {
    type: "screener",
    title: "Screener results",
    queryLabel: "Tech momentum",
  },
};

const tableBlock: DataChatBlock = {
  kind: "data",
  shape: "table",
  title: "Watchlist",
  columns: [
    { id: "symbol", label: "Symbol" },
    { id: "change", label: "Change" },
  ],
  rows: [
    { symbol: "AAPL", change: "+1.2%" },
    { symbol: "MSFT", change: "-0.4%" },
  ],
  pinHint: {
    type: "screener",
    title: "Watchlist",
  },
};

describe("CopilotDataBlock", () => {
  it("renders kv data with title and pin control", () => {
    const onPin = vi.fn();

    render(
      <CopilotDataBlock
        block={kvBlock}
        testId="copilot-data-screener"
        onPin={onPin}
      />,
    );

    expect(screen.getByTestId("copilot-data-screener")).toBeTruthy();
    expect(screen.getByText("Screener results")).toBeTruthy();
    expect(screen.getByText("Tech momentum")).toBeTruthy();
    expect(screen.getByTestId("copilot-artifact-pin")).toBeTruthy();

    fireEvent.click(screen.getByTestId("copilot-artifact-pin"));
    expect(onPin).toHaveBeenCalledTimes(1);
  });

  it("renders table layout for table-shaped blocks", () => {
    render(<CopilotDataBlock block={tableBlock} testId="copilot-data-table" />);

    expect(screen.getByTestId("copilot-data-table")).toHaveAttribute(
      "data-block-shape",
      "table",
    );
    expect(screen.getByText("AAPL")).toBeTruthy();
    expect(screen.getByText("MSFT")).toBeTruthy();
  });

  it("fires open handler for openable pin hints", () => {
    const onOpen = vi.fn();

    render(<CopilotDataBlock block={kvBlock} onOpen={onOpen} />);

    fireEvent.click(screen.getByTestId("copilot-data-open"));
    expect(onOpen).toHaveBeenCalledWith("/workspace?surface=screener&screenerView=screens");
  });

  it("shows pinned state", () => {
    render(<CopilotDataBlock block={kvBlock} pinned onPin={vi.fn()} />);
    expect(screen.getByTestId("copilot-artifact-pinned")).toBeTruthy();
  });
});
