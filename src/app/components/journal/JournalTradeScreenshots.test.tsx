import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  fetchJournalTradeScreenshots: vi.fn(async () => []),
  uploadJournalTradeScreenshot: vi.fn(async () => ({
    id: "shot-new",
    tradeId: "trade-1",
    sortIndex: 0,
    caption: null,
    mimeType: "image/png" as const,
    byteSize: 8,
    width: null,
    height: null,
    source: "upload" as const,
    createdAt: "2026-07-20T12:00:00.000Z",
    updatedAt: "2026-07-20T12:00:00.000Z",
  })),
  resolveJournalTradeScreenshotBlobUrl: vi.fn(async () => "blob:preview"),
}));

vi.mock("@/app/components/ActiveChartContext", () => ({
  useActiveChart: () => ({
    chartCommands: {
      canCaptureSnapshot: () => false,
      captureSnapshot: vi.fn(),
    },
  }),
}));

vi.mock("@/lib/persistence/client/journalClient", () => ({
  fetchJournalTradeScreenshots: mocks.fetchJournalTradeScreenshots,
  uploadJournalTradeScreenshot: mocks.uploadJournalTradeScreenshot,
  deleteJournalTradeScreenshotRemote: vi.fn(async () => true),
  patchJournalTradeScreenshotRemote: vi.fn(async () => null),
  resolveJournalTradeScreenshotBlobUrl: mocks.resolveJournalTradeScreenshotBlobUrl,
  journalTradeScreenshotImageUrl: (tradeId: string, shotId: string) =>
    `/api/me/journal/trades/${tradeId}/screenshots/${shotId}`,
}));

import JournalTradeScreenshots from "./JournalTradeScreenshots";

describe("JournalTradeScreenshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchJournalTradeScreenshots.mockResolvedValue([
      {
        id: "shot-1",
        tradeId: "trade-1",
        sortIndex: 0,
        caption: "Entry",
        mimeType: "image/png",
        byteSize: 100,
        width: null,
        height: null,
        source: "upload",
        createdAt: "2026-07-20T12:00:00.000Z",
        updatedAt: "2026-07-20T12:00:00.000Z",
      },
    ]);
  });

  it("renders screenshot gallery and upload controls", async () => {
    render(<JournalTradeScreenshots tradeId="trade-1" />);
    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-hero")).toBeInTheDocument();
    });
    expect(screen.getByTestId("journal-trade-screenshots-upload")).toBeInTheDocument();
    expect(screen.getByTestId("journal-trade-screenshots-capture")).toBeDisabled();
    expect(screen.queryByTestId("journal-trade-screenshot-shot-1")).not.toBeInTheDocument();
  });

  it("renders empty hero drop zone when no screenshots", async () => {
    mocks.fetchJournalTradeScreenshots.mockResolvedValue([]);
    render(<JournalTradeScreenshots tradeId="trade-1" />);
    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-empty")).toBeInTheDocument();
    });
  });

  it("uploads a selected file", async () => {
    render(<JournalTradeScreenshots tradeId="trade-1" />);
    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-upload")).toBeInTheDocument();
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([Uint8Array.from([1, 2, 3])], "shot.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mocks.uploadJournalTradeScreenshot).toHaveBeenCalled();
    });
  });

  it("opens the screenshot lightbox on document.body", async () => {
    render(<JournalTradeScreenshots tradeId="trade-1" />);
    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-hero")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Open screenshot preview" }));

    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-lightbox")).toBeInTheDocument();
    });
    expect(document.body.contains(screen.getByTestId("journal-trade-screenshots-lightbox"))).toBe(
      true,
    );
  });
});
