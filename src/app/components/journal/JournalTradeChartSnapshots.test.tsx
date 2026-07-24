import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import { ActiveChartProvider } from "@/app/components/ActiveChartContext";
import JournalTradeChartSnapshots from "./JournalTradeChartSnapshots";

const mocks = vi.hoisted(() => ({
  fetchJournalTradeChartSnapshots: vi.fn(async () => []),
  captureTradeChartFork: vi.fn(),
}));

vi.mock("@/lib/persistence/client/journalClient", () => ({
  fetchJournalTradeChartSnapshots: mocks.fetchJournalTradeChartSnapshots,
  fetchJournalFills: vi.fn(async () => []),
  deleteJournalTradeChartSnapshotRemote: vi.fn(async () => true),
}));

vi.mock("@/lib/journal/captureTradeChartFork", () => ({
  captureTradeChartFork: mocks.captureTradeChartFork,
}));

const activeChartMock = vi.hoisted(() => ({
  value: null as {
    config: { symbol: string };
    chartCommands: { canCaptureSnapshot: () => boolean; captureSnapshot: () => Promise<Blob> };
  } | null,
}));

vi.mock("@/app/components/ActiveChartContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/components/ActiveChartContext")>();
  return {
    ...actual,
    useActiveChart: () => activeChartMock.value,
  };
});

const trade: JournalTradeResponse = {
  id: "00000000-0000-4000-8000-000000000001",
  status: "open",
  direction: "long",
  symbol: "BRUN",
  secType: "STK",
  openedAt: "2026-07-01T13:30:00.000Z",
  fillExecIds: [],
  createdAt: "2026-07-01T13:30:00.000Z",
  updatedAt: "2026-07-01T13:30:00.000Z",
};

describe("JournalTradeChartSnapshots", () => {
  it("enables capture when workspace active chart symbol matches trade", async () => {
    activeChartMock.value = {
      config: { symbol: "BRUN" },
      chartCommands: {
        canCaptureSnapshot: () => true,
        captureSnapshot: vi.fn(async () => new Blob()),
      },
    };
    mocks.captureTradeChartFork.mockResolvedValue({ ok: true, snapshotId: "snap-1" });

    render(
      <ActiveChartProvider>
        <JournalTradeChartSnapshots trade={trade} fills={[]} />
      </ActiveChartProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-chart-capture-active")).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId("journal-trade-chart-capture-active"));

    await waitFor(() => {
      expect(mocks.captureTradeChartFork).toHaveBeenCalled();
    });
  });

  it("disables capture when no workspace active chart is registered", async () => {
    activeChartMock.value = null;

    render(
      <ActiveChartProvider>
        <JournalTradeChartSnapshots trade={trade} fills={[]} />
      </ActiveChartProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-chart-capture-active")).toBeDisabled();
    });
  });
});
