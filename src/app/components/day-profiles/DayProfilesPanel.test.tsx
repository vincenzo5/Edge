import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DayProfilesPanel } from "./DayProfilesPanel";
import { PatternLibraryProvider } from "../pattern-library/PatternLibraryContext";
import { AppActionsProvider } from "../AppActionsContext";

const sampleProfiles = [
  {
    symbol: "AAPL",
    date: "2026-07-15",
    universe: "single_name",
    dayType: "trend",
    openType: "open_drive",
    gap: "gap_and_go",
    volatility: "vol_normal",
    participation: "rvol_high",
    catalyst: "",
    relative: "leader",
    gapPct: 1.2,
    rangeAtr: 1.1,
    rvol: 1.4,
    closeLoc: 0.8,
    retPct: 2.1,
    spyRetPct: 0.5,
    status: "confirmed",
    notes: "",
  },
];

function renderPanel() {
  const patchActiveCell = vi.fn();
  const requestChartGoto = vi.fn();

  render(
    <AppActionsProvider
      value={{
        getLayout: vi.fn(),
        isHydrated: () => true,
        applyCellUpdate: vi.fn(),
        patchActiveCell,
        setActiveCellIndex: vi.fn(),
        setLayoutId: vi.fn(),
        setGridMode: vi.fn(),
        setLayoutSync: vi.fn(),
        setTheme: vi.fn(),
        setSidebarPanel: vi.fn(),
      }}
    >
      <PatternLibraryProvider>
        <DayProfilesPanel />
      </PatternLibraryProvider>
    </AppActionsProvider>,
  );

  return { patchActiveCell };
}

describe("DayProfilesPanel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith("/api/day-profiles")) {
          return new Response(JSON.stringify({ ok: true, profiles: sampleProfiles }), {
            status: 200,
          });
        }
        return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders confirmed session cards from the API", async () => {
    renderPanel();
    expect(await screen.findByTestId("day-profiles-panel")).toBeInTheDocument();
    expect(await screen.findByText("AAPL · 2026-07-15")).toBeInTheDocument();
    expect(screen.getByTestId("day-profiles-result-count")).toHaveTextContent("1 session");
  });

  it("opens a session on the chart when a card is clicked", async () => {
    const { patchActiveCell } = renderPanel();
    await screen.findByTestId("day-profile-card-AAPL-2026-07-15");
    fireEvent.click(screen.getByTestId("day-profile-card-AAPL-2026-07-15"));
    await waitFor(() => {
      expect(patchActiveCell).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: "AAPL",
          interval: "5m",
        }),
      );
    });
  });
});
