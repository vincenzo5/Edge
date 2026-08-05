/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  readCaptureSeed: vi.fn(),
  clearCaptureSeed: vi.fn(),
  captureTradeChartFork: vi.fn(),
  publishCaptureDone: vi.fn(),
  publishCaptureCancelled: vi.fn(),
  publishCaptureFailed: vi.fn(),
  closeWindow: vi.fn(),
}));

const activeChartMock = vi.hoisted(() => ({
  value: {
    chartCommands: {
      canCaptureSnapshot: () => true,
      captureSnapshot: vi.fn(async () => new Blob([Uint8Array.from([1])], { type: "image/png" })),
    },
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams("token=token-1&tradeId=trade-1"),
}));

vi.mock("@/lib/journal/captureSeed", () => ({
  readCaptureSeed: mocks.readCaptureSeed,
  clearCaptureSeed: mocks.clearCaptureSeed,
}));

vi.mock("@/lib/journal/captureTradeChartFork", () => ({
  captureTradeChartFork: mocks.captureTradeChartFork,
}));

vi.mock("@/lib/journal/captureChannel", () => ({
  publishCaptureDone: mocks.publishCaptureDone,
  publishCaptureCancelled: mocks.publishCaptureCancelled,
  publishCaptureFailed: mocks.publishCaptureFailed,
}));

vi.mock("@/app/components/ActiveChartContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/components/ActiveChartContext")>();
  return {
    ...actual,
    useActiveChart: () => activeChartMock.value,
  };
});

vi.mock("@/app/components/ChartCell", () => ({
  default: () => <div data-testid="mock-chart-cell" />,
}));

vi.mock("@/app/components/MarketDataProvider", () => ({
  MarketDataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/app/components/home/AppChromeProviders", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/app/components/AppTimeZoneProvider", () => ({
  AppTimeZoneProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/app/components/ChartSyncContext", () => ({
  ChartSyncProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import JournalCaptureStudio from "./JournalCaptureStudio";

const seed = {
  requestId: "req-1",
  tradeId: "trade-1",
  symbol: "BRUN",
  cellConfig: {
    symbol: "BRUN",
    range: "6mo",
    interval: "1d",
    rangePreset: null,
    chartType: "candle_solid" as const,
    indicators: [],
    drawings: [],
  },
  theme: "dark" as const,
};

describe("JournalCaptureStudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readCaptureSeed.mockReturnValue(seed);
    mocks.captureTradeChartFork.mockResolvedValue({
      ok: true,
      snapshotId: "snap-1",
      screenshotId: "shot-1",
    });
    vi.spyOn(window, "close").mockImplementation(mocks.closeWindow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows missing seed error when token is invalid", () => {
    mocks.readCaptureSeed.mockReturnValue(null);
    render(<JournalCaptureStudio />);
    expect(screen.getByTestId("journal-capture-studio-missing-seed")).toBeInTheDocument();
  });

  it("captures chart fork and publishes done", async () => {
    render(<JournalCaptureStudio />);

    await waitFor(() => {
      expect(screen.getByTestId("journal-capture-studio")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("journal-capture-save"));

    await waitFor(() => {
      expect(mocks.captureTradeChartFork).toHaveBeenCalled();
      expect(mocks.publishCaptureDone).toHaveBeenCalledWith({
        requestId: "req-1",
        tradeId: "trade-1",
        screenshotId: "shot-1",
        snapshotId: "snap-1",
      });
      expect(mocks.clearCaptureSeed).toHaveBeenCalledWith("token-1");
      expect(mocks.closeWindow).toHaveBeenCalled();
    });
  });

  it("publishes cancelled and closes on cancel", async () => {
    render(<JournalCaptureStudio />);

    await waitFor(() => {
      expect(screen.getByTestId("journal-capture-studio")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("journal-capture-cancel"));

    expect(mocks.publishCaptureCancelled).toHaveBeenCalledWith({
      requestId: "req-1",
      tradeId: "trade-1",
    });
    expect(mocks.clearCaptureSeed).toHaveBeenCalledWith("token-1");
    expect(mocks.closeWindow).toHaveBeenCalled();
  });

  it("shows error and keeps window open when capture fails", async () => {
    mocks.captureTradeChartFork.mockResolvedValueOnce({
      ok: false,
      error: "Could not save chart snapshot to journal trade.",
    });

    render(<JournalCaptureStudio />);

    await waitFor(() => {
      expect(screen.getByTestId("journal-capture-studio")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("journal-capture-save"));

    await waitFor(() => {
      expect(screen.getByTestId("journal-capture-studio-error")).toHaveTextContent(
        "Could not save chart snapshot",
      );
      expect(mocks.publishCaptureFailed).toHaveBeenCalled();
    });
    expect(mocks.closeWindow).not.toHaveBeenCalled();
  });
});
