import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import type { JournalFillResponse, JournalTradeResponse } from "@/lib/persistence/schemas/journal";

const mocks = vi.hoisted(() => ({
  fetchJournalFills: vi.fn<() => Promise<JournalFillResponse[]>>(),
  patchJournalTradeRemote: vi.fn(),
}));

vi.mock("@/lib/persistence/client/journalClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/persistence/client/journalClient")>();
  return {
    ...actual,
    fetchJournalFills: mocks.fetchJournalFills,
    patchJournalTradeRemote: mocks.patchJournalTradeRemote,
    fetchJournalTradeScreenshots: vi.fn(async () => []),
    fetchJournalTradeChartSnapshots: vi.fn(async () => []),
    resolveJournalTradeScreenshotBlobUrl: vi.fn(async () => null),
  };
});

vi.mock("@/app/components/ActiveChartContext", () => ({
  useActiveChart: () => ({
    chartCommands: {
      canCaptureSnapshot: () => false,
      captureSnapshot: vi.fn(),
    },
  }),
}));

import JournalTradeDetail from "./JournalTradeDetail";
import {
  JOURNAL_SETUP_VALUES_STORAGE_KEY,
  writeJournalSetupValues,
} from "@/lib/journal/journalSetupPreference";

const trade: JournalTradeResponse = {
  id: "00000000-0000-4000-8000-000000000001",
  status: "closed",
  direction: "long",
  symbol: "AAPL",
  secType: "STK",
  openedAt: "2026-07-01T13:30:00.000Z",
  closedAt: "2026-07-01T16:00:00.000Z",
  netQuantity: 100,
  avgEntry: 150.25,
  avgExit: 155.75,
  netPnL: 550,
  totalCommission: 2.1,
  fillExecIds: ["exec-1", "exec-2"],
  tags: [],
  setup: null,
  reviewNote: null,
  createdAt: "2026-07-01T13:30:00.000Z",
  updatedAt: "2026-07-01T16:00:00.000Z",
};

const fills: JournalFillResponse[] = [
  {
    id: "00000000-0000-4000-8000-000000000010",
    execId: "exec-1",
    fillTime: "2026-07-01T13:30:00.000Z",
    side: "BOT",
    quantity: 100,
    price: 150.25,
    orderRef: "61959891",
    contract: { symbol: "AAPL", secType: "STK" },
    source: "live",
    createdAt: "2026-07-01T13:30:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000011",
    execId: "exec-2",
    fillTime: "2026-07-01T16:00:00.000Z",
    side: "SLD",
    quantity: 100,
    price: 155.75,
    orderRef: "4344066",
    contract: { symbol: "AAPL", secType: "STK" },
    source: "live",
    createdAt: "2026-07-01T16:00:00.000Z",
  },
];

describe("JournalTradeDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.fetchJournalFills.mockResolvedValue(fills);
  });

  it("shows scoreboard with entry, stop, exit, and P&L", async () => {
    render(<JournalTradeDetail trade={trade} onUpdated={vi.fn()} embedded />);

    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-scoreboard")).toBeInTheDocument();
    });
    expect(screen.getByTestId("journal-trade-risk-entry")).toHaveTextContent("150.25");
    expect(screen.getByTestId("journal-trade-outcome-exit")).toHaveTextContent("155.75");
    expect(screen.getByTestId("journal-trade-outcome-pnl")).toHaveTextContent("$550.00");
    expect(screen.getByTestId("journal-trade-outcome-badge")).toHaveTextContent("WIN");
  });

  it("keeps scoreboard outside scroll region and orders review before screenshots", async () => {
    render(<JournalTradeDetail trade={trade} onUpdated={vi.fn()} embedded />);

    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-detail-scroll")).toBeInTheDocument();
    });

    const scoreboard = screen.getByTestId("journal-trade-scoreboard");
    const scroll = screen.getByTestId("journal-trade-detail-scroll");
    const review = screen.getByTestId("journal-trade-review");
    const screenshots = screen.getByTestId("journal-trade-screenshots");

    expect(scroll.contains(scoreboard)).toBe(false);
    expect(scroll.contains(review)).toBe(true);
    expect(scroll.contains(screenshots)).toBe(true);

    const reviewBeforeScreenshots =
      review.compareDocumentPosition(screenshots) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(reviewBeforeScreenshots).toBeTruthy();
  });

  it("renders human-readable fills instead of raw exec IDs", async () => {
    render(<JournalTradeDetail trade={trade} onUpdated={vi.fn()} embedded />);

    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-fill-exec-1")).toBeInTheDocument();
    });
    const fillsSection = screen.getByTestId("journal-trade-fills");
    expect(within(fillsSection).getByTestId("journal-trade-fill-exec-1")).toHaveTextContent("BUY");
    expect(within(fillsSection).getByTestId("journal-trade-fill-exec-1")).toHaveTextContent("150.25");
    expect(within(fillsSection).queryByRole("table")?.textContent).not.toContain("exec-1");
  });

  it("does not render footer Open chart link", async () => {
    render(<JournalTradeDetail trade={trade} onUpdated={vi.fn()} embedded />);

    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-detail")).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: "Open chart" })).not.toBeInTheDocument();
  });

  it("toggles ignore-from-stats immediately", async () => {
    const onUpdated = vi.fn();
    mocks.patchJournalTradeRemote.mockResolvedValue({ ...trade, ignored: true });
    render(<JournalTradeDetail trade={trade} onUpdated={onUpdated} embedded />);

    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-ignore-stats")).toBeInTheDocument();
    });

    screen.getByTestId("journal-trade-ignore-stats").click();

    await waitFor(() => {
      expect(mocks.patchJournalTradeRemote).toHaveBeenCalledWith(trade.id, { ignored: true });
      expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ ignored: true }));
    });
  });

  it("renders risk policy section with budget, geometry, protect, and manage timeline", async () => {
    render(
      <JournalTradeDetail
        trade={{
          ...trade,
          plannedRiskMode: "usd",
          plannedRiskValue: 50,
          plannedRiskUsd: 50,
          managePlaybook: {
            templateId: "break_even",
            templateName: "Break-even",
            instanceId: "inst-1",
            plannedRuleCount: 1,
            firedRuleCount: 1,
            positionPlan: {
              entry: 100,
              initialStop: 95,
              qty: 10,
              rUnit: 5,
              side: "BUY",
            },
            protectSummary: "Stop @ 95",
            ruleTimeline: [
              {
                ruleId: "be-at-1r",
                status: "fired",
                firedAt: "2026-07-24T12:00:00.000Z",
              },
            ],
          },
        }}
        onUpdated={vi.fn()}
        embedded
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-risk-policy")).toBeInTheDocument();
    });
    expect(screen.getByTestId("journal-trade-risk-budget")).toHaveTextContent("$50.00");
    expect(screen.getByTestId("journal-trade-risk-r")).toHaveTextContent("11.00R");
    expect(screen.getByTestId("journal-trade-risk-geometry")).toHaveTextContent("Entry 100.00");
    expect(screen.getByTestId("journal-trade-risk-protect")).toHaveTextContent("Stop @ 95");
    expect(screen.getByTestId("journal-trade-manage-adherence")).toHaveTextContent("1 of 1");
    expect(screen.getByTestId("journal-trade-manage-rule-be-at-1r")).toHaveTextContent("Fired");
    expect(screen.getByTestId("journal-trade-stop-plan-hint")).toHaveTextContent(
      "Seeded from plan — save to persist",
    );
    expect(screen.getByTestId("journal-trade-risk-stop")).toHaveValue(95);
    expect(screen.getByTestId("journal-trade-risk-manage")).toBeInTheDocument();
  });

  it("saves stop, setup, tags, rating, and review note together", async () => {
    const onUpdated = vi.fn();
    mocks.patchJournalTradeRemote.mockResolvedValue({
      ...trade,
      initialStop: 145,
      setup: "breakout",
      tags: ["momentum"],
      rating: 4,
      reviewNote: "Clean entry",
      plannedRiskMode: "usd",
      plannedRiskValue: 525,
      plannedRiskUsd: 525,
    });

    render(<JournalTradeDetail trade={trade} onUpdated={onUpdated} embedded />);

    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-risk-stop")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("journal-trade-risk-stop"), {
      target: { value: "145" },
    });
    fireEvent.change(screen.getByPlaceholderText("comma separated"), {
      target: { value: "momentum" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Review note" }), {
      target: { value: "Clean entry" },
    });
    fireEvent.click(screen.getByTestId("journal-trade-rating-star-4"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mocks.patchJournalTradeRemote).toHaveBeenCalledWith(
        trade.id,
        expect.objectContaining({
          initialStop: 145,
          tags: ["momentum"],
          reviewNote: "Clean entry",
          rating: 4,
        }),
      );
      expect(onUpdated).toHaveBeenCalled();
    });
  });

  it("shows custom setup options from journal settings", async () => {
    writeJournalSetupValues(["VWAP reclaim", "Opening drive"]);
    render(<JournalTradeDetail trade={trade} onUpdated={vi.fn()} embedded />);

    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-setup")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("journal-trade-setup"));
    expect(screen.getByTestId("journal-trade-setup-option-VWAP reclaim")).toBeInTheDocument();
  });

  it("keeps orphan setup values selectable when not in catalog", async () => {
    writeJournalSetupValues(["breakout"]);
    render(
      <JournalTradeDetail
        trade={{ ...trade, setup: "legacy setup" }}
        onUpdated={vi.fn()}
        embedded
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("journal-trade-setup")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("journal-trade-setup"));
    expect(screen.getByTestId("journal-trade-setup-option-legacy setup")).toBeInTheDocument();
    expect(localStorage.getItem(JOURNAL_SETUP_VALUES_STORAGE_KEY)).toContain("breakout");
  });
});
