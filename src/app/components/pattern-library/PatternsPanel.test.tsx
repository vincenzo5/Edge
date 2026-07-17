import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PatternsPanel } from "./PatternsPanel";
import { PatternLibraryProvider } from "./PatternLibraryContext";
import { AppActionsProvider } from "../AppActionsContext";

const sampleRecords = [
  {
    id: "capture-brk-a-1780407000000",
    symbol: "BRK-A",
    timeframe: "1d",
    asOf: "2026-06-02T13:30:00.000Z",
    setupFamilyId: "unclassified",
    quality: 3,
    decision: "take",
    thesis: "setup → pullback → trigger → outcome",
    sectionLabels: ["setup", "pullback", "trigger", "outcome"],
    capturedAt: "2026-07-17T13:50:20.322Z",
    hasSvg: true,
  },
];

function renderPanel() {
  return render(
    <AppActionsProvider
      value={{
        getLayout: vi.fn(),
        isHydrated: () => true,
        applyCellUpdate: vi.fn(),
        patchActiveCell: vi.fn(),
        setActiveCellIndex: vi.fn(),
        setLayoutId: vi.fn(),
        setGridMode: vi.fn(),
        setLayoutSync: vi.fn(),
        setTheme: vi.fn(),
        setSidebarPanel: vi.fn(),
      }}
    >
      <PatternLibraryProvider>
        <PatternsPanel />
      </PatternLibraryProvider>
    </AppActionsProvider>,
  );
}

describe("PatternsPanel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/pattern-library/records")) {
          return new Response(JSON.stringify({ ok: true, records: sampleRecords }), {
            status: 200,
          });
        }
        if (url.includes("/api/pattern-library/records/capture-brk-a")) {
          return new Response(
            JSON.stringify({
              ok: true,
              record: {
                ...sampleRecords[0],
                regime: "downtrend",
                plan: {
                  direction: "long",
                  entry: 707210,
                  stop: 698343,
                  targets: [724140],
                  thesis: sampleRecords[0].thesis,
                },
                outcome: {
                  resolved: false,
                  win: null,
                  rMultiple: null,
                  mfe: null,
                  mae: null,
                  holdBars: null,
                },
                ohlcv: [
                  { timestamp: 1, open: 1, high: 2, low: 0.5, close: 1.5 },
                  { timestamp: 2, open: 1.5, high: 2.5, low: 1, close: 2 },
                ],
                chartStyleId: "edge-frozen-v1",
                capture: {
                  patternStart: { barIndex: 0, timestamp: 1 },
                  patternEnd: { barIndex: 1, timestamp: 2 },
                  sections: [
                    {
                      id: "section-1",
                      label: "setup",
                      fromBar: 0,
                      toBar: 0,
                      fromTimestamp: 1,
                      toTimestamp: 1,
                    },
                  ],
                  paddingBars: { left: 5, right: 0 },
                  interval: "1d",
                  capturedAt: sampleRecords[0].capturedAt,
                },
              },
            }),
            { status: 200 },
          );
        }
        if (url.endsWith("/api/pattern-library/taxonomy")) {
          return new Response(
            JSON.stringify({
              ok: true,
              setupFamilies: [{ id: "unclassified", name: "Unclassified" }],
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders capture cards from the list API", async () => {
    renderPanel();
    expect(await screen.findByTestId("patterns-panel")).toBeInTheDocument();
    expect(await screen.findByText("BRK-A · 1d")).toBeInTheDocument();
    expect(screen.getByText(/setup → pullback → trigger → outcome/)).toBeInTheDocument();
  });

  it("opens detail drawer when a card is clicked", async () => {
    renderPanel();
    await screen.findByTestId("pattern-capture-card-capture-brk-a-1780407000000");
    fireEvent.click(screen.getByTestId("pattern-capture-card-capture-brk-a-1780407000000"));
    await waitFor(() => {
      expect(screen.getByTestId("pattern-capture-detail-drawer-panel")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Go to chart" })).toBeInTheDocument();
  });
});
