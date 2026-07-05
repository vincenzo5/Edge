import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import HomeResearchPanel from "./HomeResearchPanel";

vi.mock("@/lib/persistence/client/marketResearchNotesClient", () => ({
  fetchMarketResearchNotes: vi.fn(),
}));

import { fetchMarketResearchNotes } from "@/lib/persistence/client/marketResearchNotesClient";

const mockedFetch = vi.mocked(fetchMarketResearchNotes);

describe("HomeResearchPanel", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("renders empty state when no notes are returned", async () => {
    mockedFetch.mockResolvedValue([]);
    render(<HomeResearchPanel />);

    await waitFor(() => {
      expect(screen.getByText("No research notes yet.")).toBeInTheDocument();
    });
  });

  it("renders recent notes", async () => {
    mockedFetch.mockResolvedValue([
      {
        id: "note-1",
        symbol: "AAPL",
        chartInterval: "1d",
        researchNoteType: "thesis",
        researchThesis: { title: "AAPL breakout" },
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
      },
      {
        id: "note-2",
        symbol: "MSFT",
        chartInterval: "1d",
        researchNoteType: "note",
        researchThesis: { title: "Cloud watch" },
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z",
      },
      {
        id: "note-3",
        symbol: "NVDA",
        chartInterval: "1d",
        researchNoteType: "target",
        researchThesis: { title: "Target update" },
        createdAt: "2026-07-03T00:00:00.000Z",
        updatedAt: "2026-07-03T00:00:00.000Z",
      },
    ] as never);

    render(<HomeResearchPanel />);

    await waitFor(() => {
      expect(screen.getByText("AAPL breakout")).toBeInTheDocument();
      expect(screen.getByText("Cloud watch")).toBeInTheDocument();
      expect(screen.getByText("Target update")).toBeInTheDocument();
    });
  });
});
