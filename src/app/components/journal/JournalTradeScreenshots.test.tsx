/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { JournalScreenshotResponse } from "@/lib/persistence/schemas/journal";

const mocks = vi.hoisted(() => ({
  fetchJournalTradeScreenshots: vi.fn(async () => []),
  patchJournalTradeScreenshotRemote: vi.fn(),
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
    tradeId: "server-trade",
    symbol: "BRUN",
    cellConfig: { symbol: "BRUN" },
    theme: "dark" as const,
  })),
  createCaptureToken: vi.fn(() => "token-1"),
  openJournalCaptureWindow: vi.fn(() => ({ ok: true as const, window: {} as Window })),
  resolveJournalTradeIdForPersistence: vi.fn(async ({ tradeId }: { tradeId: string }) =>
    tradeId === "stale-local" ? "server-trade" : tradeId,
  ),
  captureChannelHandler: null as null | ((message: unknown) => void),
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

vi.mock("@/lib/journal/resolveJournalTradeIdForPersistence", () => ({
  resolveJournalTradeIdForPersistence: mocks.resolveJournalTradeIdForPersistence,
}));

vi.mock("@/lib/journal/captureChannel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/journal/captureChannel")>();
  return {
    ...actual,
    subscribeCaptureChannel: (handler: (message: unknown) => void) => {
      mocks.captureChannelHandler = handler;
      return () => {
        mocks.captureChannelHandler = null;
      };
    },
  };
});

vi.mock("@/lib/persistence/client/journalClient", () => ({
  fetchJournalTradeScreenshots: mocks.fetchJournalTradeScreenshots,
  uploadJournalTradeScreenshot: mocks.uploadJournalTradeScreenshot,
  deleteJournalTradeScreenshotRemote: vi.fn(async () => true),
  patchJournalTradeScreenshotRemote: mocks.patchJournalTradeScreenshotRemote,
  resolveJournalTradeScreenshotBlobUrl: vi.fn(async () => "blob:preview"),
  journalTradeScreenshotImageUrl: (tradeId: string, shotId: string) =>
    `/api/me/journal/trades/${tradeId}/screenshots/${shotId}`,
}));

import JournalTradeScreenshots from "./JournalTradeScreenshots";

describe("JournalTradeScreenshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.captureChannelHandler = null;
    mocks.resolveJournalTradeIdForPersistence.mockImplementation(async ({ tradeId }: { tradeId: string }) =>
      tradeId === "stale-local" ? "server-trade" : tradeId,
    );
    mocks.buildJournalCaptureSeed.mockReturnValue({
      requestId: "req-1",
      tradeId: "server-trade",
      symbol: "BRUN",
      cellConfig: { symbol: "BRUN" },
      theme: "dark" as const,
    });
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
    mocks.patchJournalTradeScreenshotRemote.mockImplementation(
      async (_tradeId: string, screenshotId: string, update: { caption: string | null }) => ({
        id: screenshotId,
        tradeId: "trade-1",
        sortIndex: 0,
        caption: update.caption,
        mimeType: "image/png",
        byteSize: 100,
        width: null,
        height: null,
        source: "upload",
        createdAt: "2026-07-20T12:00:00.000Z",
        updatedAt: "2026-07-20T12:00:00.000Z",
      }),
    );
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

  it("renders the caption trigger as a hero image hover control", async () => {
    render(<JournalTradeScreenshots tradeId="trade-1" symbol="BRUN" />);
    const hero = await screen.findByTestId("journal-trade-screenshots-hero");
    const trigger = screen.getByTestId("journal-trade-screenshots-caption-trigger");

    expect(hero).toContainElement(trigger);
    expect(trigger.parentElement?.parentElement).toHaveClass(
      "opacity-0",
      "group-hover/image:opacity-100",
    );
  });

  it("opens the caption popover and cancels without saving", async () => {
    render(<JournalTradeScreenshots tradeId="trade-1" symbol="BRUN" />);
    await screen.findByTestId("journal-trade-screenshots-hero");

    fireEvent.click(screen.getByTestId("journal-trade-screenshots-caption-trigger"));

    expect(await screen.findByTestId("journal-trade-screenshots-caption-popover")).toBeInTheDocument();
    expect(screen.getByText("Caption")).toBeInTheDocument();
    expect(screen.getByTestId("journal-trade-screenshots-caption-save")).toHaveAttribute(
      "aria-label",
      "Save caption",
    );
    expect(screen.getByTestId("journal-trade-screenshots-caption-cancel")).toHaveAttribute(
      "aria-label",
      "Cancel caption",
    );

    fireEvent.change(screen.getByTestId("journal-trade-screenshots-caption-input"), {
      target: { value: "Discard me" },
    });
    fireEvent.click(screen.getByTestId("journal-trade-screenshots-caption-cancel"));

    await waitFor(() => {
      expect(screen.queryByTestId("journal-trade-screenshots-caption-popover")).not.toBeInTheDocument();
    });
    expect(mocks.patchJournalTradeScreenshotRemote).not.toHaveBeenCalled();
    expect(screen.getByTestId("journal-trade-screenshots-caption")).toHaveTextContent("Entry");
  });

  it("does not save a caption on blur or click-outside", async () => {
    render(<JournalTradeScreenshots tradeId="trade-1" symbol="BRUN" />);
    await screen.findByTestId("journal-trade-screenshots-hero");

    fireEvent.click(screen.getByTestId("journal-trade-screenshots-caption-trigger"));
    const input = await screen.findByTestId("journal-trade-screenshots-caption-input");
    fireEvent.change(input, { target: { value: "Do not save" } });
    fireEvent.blur(input);

    expect(mocks.patchJournalTradeScreenshotRemote).not.toHaveBeenCalled();

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByTestId("journal-trade-screenshots-caption-popover")).not.toBeInTheDocument();
    });
    expect(mocks.patchJournalTradeScreenshotRemote).not.toHaveBeenCalled();
    expect(screen.getByTestId("journal-trade-screenshots-caption")).toHaveTextContent("Entry");
  });

  it("saves the caption and displays it to the left of the hero image", async () => {
    render(<JournalTradeScreenshots tradeId="trade-1" symbol="BRUN" />);
    await screen.findByTestId("journal-trade-screenshots-hero");

    fireEvent.click(screen.getByTestId("journal-trade-screenshots-caption-trigger"));
    fireEvent.change(await screen.findByTestId("journal-trade-screenshots-caption-input"), {
      target: { value: "Exit at resistance" },
    });
    const saveButton = screen.getByTestId("journal-trade-screenshots-caption-save");
    fireEvent.mouseDown(saveButton);
    expect(screen.getByTestId("journal-trade-screenshots-caption-popover")).toBeInTheDocument();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mocks.patchJournalTradeScreenshotRemote).toHaveBeenCalledWith("trade-1", "shot-1", {
        caption: "Exit at resistance",
      });
      expect(screen.getByTestId("journal-trade-screenshots-caption")).toHaveTextContent(
        "Exit at resistance",
      );
    });

    const hero = screen.getByTestId("journal-trade-screenshots-hero");
    expect(hero.firstElementChild).toBe(screen.getByTestId("journal-trade-screenshots-caption"));
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

    await waitFor(() => {
      expect(mocks.buildJournalCaptureSeed).toHaveBeenCalled();
      expect(mocks.writeCaptureSeed).toHaveBeenCalledWith("token-1", expect.any(Object));
      expect(mocks.openJournalCaptureWindow).toHaveBeenCalledWith({
        token: "token-1",
        tradeId: "trade-1",
      });
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

  it("shows captured screenshot immediately when list fetch is still empty", async () => {
    mocks.fetchJournalTradeScreenshots.mockResolvedValue([]);
    render(<JournalTradeScreenshots tradeId="trade-1" symbol="BRUN" />);
    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-empty")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("journal-trade-screenshots-capture"));

    await waitFor(() => {
      expect(mocks.openJournalCaptureWindow).toHaveBeenCalled();
    });

    mocks.captureChannelHandler?.({
      type: "captureDone",
      requestId: "req-1",
      tradeId: "trade-1",
      screenshotId: "shot-new",
      snapshotId: "snap-1",
    });

    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-hero")).toBeInTheDocument();
    });
  });

  it("reloads screenshots when capture completes on a rematched server trade id", async () => {
    mocks.fetchJournalTradeScreenshots.mockImplementation(async (id: string) =>
      id === "server-trade"
        ? [
            {
              id: "shot-new",
              tradeId: "server-trade",
              sortIndex: 0,
              caption: null,
              mimeType: "image/png",
              byteSize: 100,
              width: null,
              height: null,
              source: "chart_capture",
              createdAt: "2026-07-20T12:00:00.000Z",
              updatedAt: "2026-07-20T12:00:00.000Z",
            },
          ]
        : [],
    );

    render(<JournalTradeScreenshots tradeId="stale-local" symbol="BRUN" fillExecIds={["exec-1"]} />);
    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-empty")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("journal-trade-screenshots-capture"));

    await waitFor(() => {
      expect(mocks.openJournalCaptureWindow).toHaveBeenCalledWith({
        token: "token-1",
        tradeId: "server-trade",
      });
    });

    mocks.captureChannelHandler?.({
      type: "captureDone",
      requestId: "req-1",
      tradeId: "server-trade",
      screenshotId: "shot-new",
      snapshotId: "snap-1",
    });

    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-hero")).toBeInTheDocument();
    });
    expect(mocks.fetchJournalTradeScreenshots).toHaveBeenCalledWith("server-trade");
  });

  it("does not let an older empty trade-id request overwrite the rematched gallery", async () => {
    let resolveStale!: (rows: JournalScreenshotResponse[]) => void;
    let resolveServer!: (rows: JournalScreenshotResponse[]) => void;
    mocks.fetchJournalTradeScreenshots.mockImplementation(
      (id: string) =>
        new Promise<JournalScreenshotResponse[]>((resolve) => {
          if (id === "stale-local") resolveStale = resolve;
          else resolveServer = resolve;
        }),
    );

    render(<JournalTradeScreenshots tradeId="stale-local" symbol="BRUN" fillExecIds={["exec-1"]} />);
    await waitFor(() => {
      expect(mocks.fetchJournalTradeScreenshots).toHaveBeenCalledWith("server-trade");
    });

    resolveServer([
      {
        id: "shot-new",
        tradeId: "server-trade",
        sortIndex: 0,
        caption: null,
        mimeType: "image/png",
        byteSize: 100,
        width: null,
        height: null,
        source: "chart_capture",
        createdAt: "2026-07-20T12:00:00.000Z",
        updatedAt: "2026-07-20T12:00:00.000Z",
      },
    ]);
    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-hero")).toBeInTheDocument();
    });

    resolveStale([]);
    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-hero")).toBeInTheDocument();
    });
  });

  it("reloads the rematched trade on focus when the popup completion event is missed", async () => {
    const popup = { closed: false } as Window;
    mocks.openJournalCaptureWindow.mockReturnValueOnce({ ok: true, window: popup });
    mocks.fetchJournalTradeScreenshots.mockResolvedValue([]);

    render(<JournalTradeScreenshots tradeId="stale-local" symbol="BRUN" fillExecIds={["exec-1"]} />);
    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-empty")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("journal-trade-screenshots-capture"));
    await waitFor(() => {
      expect(mocks.openJournalCaptureWindow).toHaveBeenCalledWith({
        token: "token-1",
        tradeId: "server-trade",
      });
    });

    Object.defineProperty(popup, "closed", { value: true });
    mocks.fetchJournalTradeScreenshots.mockResolvedValueOnce([
      {
        id: "shot-new",
        tradeId: "server-trade",
        sortIndex: 0,
        caption: null,
        mimeType: "image/png",
        byteSize: 100,
        width: null,
        height: null,
        source: "chart_capture",
        createdAt: "2026-07-20T12:00:00.000Z",
        updatedAt: "2026-07-20T12:00:00.000Z",
      },
    ]);
    fireEvent.focus(window);

    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-screenshots-hero")).toBeInTheDocument();
    });
    expect(mocks.fetchJournalTradeScreenshots).toHaveBeenCalledWith("server-trade");
    expect(screen.getByTestId("journal-trade-screenshots-capture")).toHaveTextContent(
      "Capture chart",
    );
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
