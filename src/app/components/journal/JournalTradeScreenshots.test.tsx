/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
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
  writeCaptureSeed: vi.fn(),
  buildJournalCaptureSeed: vi.fn(() => ({
    requestId: "req-1",
    tradeId: "trade-1",
    symbol: "BRUN",
    cellConfig: { symbol: "BRUN" },
    theme: "dark" as const,
  })),
  createCaptureToken: vi.fn(() => "token-1"),
  openJournalCaptureWindow: vi.fn(() => ({ ok: true as const, window: {} as Window })),
  publishCaptureDone: vi.fn(),
}));

vi.mock("@/app/components/ActiveChartContext", () => ({
  useActiveChart: () => null,
}));

vi.mock("@/app/components/AppThemeProvider", () => ({
  useAppThemeOptional: () => ({ theme: "dark" }),
}));

vi.mock("@/lib/journal/captureSeed", () => ({
  buildJournalCaptureSeed: mocks.buildJournalCaptureSeed,
  createCaptureToken: mocks.createCaptureToken,
  writeCaptureSeed: mocks.writeCaptureSeed,
}));

vi.mock("@/lib/journal/openJournalCaptureWindow", () => ({
  openJournalCaptureWindow: mocks.openJournalCaptureWindow,
}));

vi.mock("@/lib/journal/captureChannel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/journal/captureChannel")>();
  return {
    ...actual,
    subscribeCaptureChannel: (handler: (message: unknown) => void) => {
      mocks.publishCaptureDone.mockImplementation(() => {
        handler({
          type: "captureDone",
          requestId: "req-1",
          tradeId: "trade-1",
          screenshotId: "shot-new",
          snapshotId: "snap-1",
        });
      });
      return () => {};
    },
  };
});

vi.mock("@/lib/persistence/client/journalClient", () => ({
  fetchJournalTradeScreenshots: mocks.fetchJournalTradeScreenshots,
  uploadJournalTradeScreenshot: mocks.uploadJournalTradeScreenshot,
  deleteJournalTradeScreenshotRemote: vi.fn(async () => true),
  patchJournalTradeScreenshotRemote: vi.fn(async () => null),
  resolveJournalTradeScreenshotBlobUrl: vi.fn(async () => "blob:preview"),
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders screenshot gallery and upload controls", async () => {
    render(<JournalTradeScreenshots tradeId="trade-1" symbol="BRUN" />);
    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-hero")).toBeInTheDocument();
    });
    expect(screen.getByTestId("journal-trade-screenshots-upload")).toBeInTheDocument();
    expect(screen.getByTestId("journal-trade-screenshots-capture")).toBeEnabled();
  });

  it("renders empty hero drop zone when no screenshots", async () => {
    mocks.fetchJournalTradeScreenshots.mockResolvedValue([]);
    render(<JournalTradeScreenshots tradeId="trade-1" symbol="BRUN" />);
    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-empty")).toBeInTheDocument();
    });
    expect(screen.getByTestId("journal-trade-screenshots-capture")).toBeEnabled();
  });

  it("opens capture window and writes seed on capture click", async () => {
    mocks.fetchJournalTradeScreenshots.mockResolvedValue([]);
    render(<JournalTradeScreenshots tradeId="trade-1" symbol="BRUN" />);
    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-capture")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("journal-trade-screenshots-capture"));

    expect(mocks.buildJournalCaptureSeed).toHaveBeenCalled();
    expect(mocks.writeCaptureSeed).toHaveBeenCalledWith("token-1", expect.any(Object));
    expect(mocks.openJournalCaptureWindow).toHaveBeenCalledWith({
      token: "token-1",
      tradeId: "trade-1",
    });
  });

  it("shows popup blocked error when capture window fails to open", async () => {
    mocks.fetchJournalTradeScreenshots.mockResolvedValue([]);
    mocks.openJournalCaptureWindow.mockReturnValueOnce({ ok: false, reason: "popup_blocked" });

    render(<JournalTradeScreenshots tradeId="trade-1" symbol="BRUN" />);
    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-capture")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("journal-trade-screenshots-capture"));

    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-error")).toHaveTextContent(
        "Popup blocked",
      );
    });
  });

  it("uploads a selected file", async () => {
    render(<JournalTradeScreenshots tradeId="trade-1" symbol="BRUN" />);
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
    render(<JournalTradeScreenshots tradeId="trade-1" symbol="BRUN" />);
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
