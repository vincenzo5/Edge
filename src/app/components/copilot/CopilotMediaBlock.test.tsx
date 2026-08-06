/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MediaChatBlock } from "@/lib/copilot/chatBlocks";
import { CopilotMediaBlock } from "./CopilotMediaBlock";

const imageBlock: MediaChatBlock = {
  kind: "media",
  src: "https://example.com/chart.png",
  mimeType: "image/png",
  caption: "AAPL daily",
  openLabel: "Open",
  openHref: "https://example.com/chart.png",
};

const chartBlock: MediaChatBlock = {
  kind: "media",
  caption: "NVDA · 5",
  openLabel: "Open",
  openHref: "/chart?symbol=NVDA&interval=5",
  pinHint: {
    type: "chart",
    symbol: "NVDA",
    interval: "5",
    title: "NVDA · 5",
  },
};

describe("CopilotMediaBlock", () => {
  it("renders image media with open control", () => {
    const onOpen = vi.fn();

    render(
      <CopilotMediaBlock
        block={imageBlock}
        testId="copilot-media-image"
        onOpen={onOpen}
      />,
    );

    expect(screen.getByTestId("copilot-media-image")).toBeTruthy();
    expect(screen.getByAltText("AAPL daily")).toBeTruthy();
    fireEvent.click(screen.getByTestId("copilot-media-open"));
    expect(onOpen).toHaveBeenCalledWith("https://example.com/chart.png");
  });

  it("renders caption-only chart media with pin control", () => {
    const onPin = vi.fn();

    render(
      <CopilotMediaBlock
        block={chartBlock}
        testId="copilot-media-chart"
        onPin={onPin}
      />,
    );

    expect(screen.getByText("NVDA · 5")).toBeTruthy();
    fireEvent.click(screen.getByTestId("copilot-artifact-pin"));
    expect(onPin).toHaveBeenCalledTimes(1);
  });

  it("shows pinned state", () => {
    render(<CopilotMediaBlock block={chartBlock} pinned onPin={vi.fn()} />);
    expect(screen.getByTestId("copilot-artifact-pinned")).toBeTruthy();
  });
});
