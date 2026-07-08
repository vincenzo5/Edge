import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/persistence/client/journalClient", () => ({
  fetchJournalTrades: vi.fn(async () => [
    {
      id: "t1",
      status: "closed",
      direction: "long",
      symbol: "AAPL",
      secType: "STK",
      openedAt: "2026-06-01T13:30:00.000Z",
      closedAt: "2026-06-02T13:30:00.000Z",
      netPnL: 50,
      fillExecIds: ["e1"],
      tags: [],
      setup: null,
      reviewNote: null,
      createdAt: "2026-06-01T13:30:00.000Z",
      updatedAt: "2026-06-02T13:30:00.000Z",
    },
  ]),
}));

import HomeJournalPanel from "./HomeJournalPanel";

describe("HomeJournalPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows recent closed trades preview", async () => {
    render(<HomeJournalPanel />);
    expect(screen.getByTestId("home-journal-open")).toHaveAttribute("href", "/journal");
    await waitFor(() => {
      expect(screen.getByText(/AAPL · STK/)).toBeInTheDocument();
    });
  });
});
