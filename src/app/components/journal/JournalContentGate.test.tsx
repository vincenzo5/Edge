import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const retryLoadTrades = vi.fn(async () => {});
const loadTrades = vi.fn(async () => {});

vi.mock("@/app/components/journal/JournalTradesProvider", () => ({
  useJournalTrades: vi.fn(),
}));

vi.mock("@/app/components/journal/JournalSyncProvider", () => ({
  useJournalSync: () => ({
    syncing: false,
    syncNow: vi.fn(async () => {}),
  }),
}));

vi.mock("@/app/components/journal/JournalImportDialog", () => ({
  default: () => <button type="button">Import</button>,
}));

import { useJournalTrades } from "@/app/components/journal/JournalTradesProvider";
import JournalContentGate from "./JournalContentGate";

describe("JournalContentGate", () => {
  it("renders loading skeleton when fetching with no cache", () => {
    vi.mocked(useJournalTrades).mockReturnValue({
      loading: true,
      error: null,
      allTrades: [],
      loadTrades,
      retryLoadTrades,
      setAllTrades: vi.fn(),
    });

    render(
      <JournalContentGate variant="dashboard">
        <div data-testid="journal-ready-content">Ready</div>
      </JournalContentGate>,
    );

    expect(screen.getByTestId("journal-page-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-ready-content")).not.toBeInTheDocument();
  });

  it("renders global empty when loaded with no trades", () => {
    vi.mocked(useJournalTrades).mockReturnValue({
      loading: false,
      error: null,
      allTrades: [],
      loadTrades,
      retryLoadTrades,
      setAllTrades: vi.fn(),
    });

    render(
      <JournalContentGate variant="trades">
        <div data-testid="journal-ready-content">Ready</div>
      </JournalContentGate>,
    );

    expect(screen.getByTestId("journal-global-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-ready-content")).not.toBeInTheDocument();
  });

  it("renders error state with retry action", () => {
    vi.mocked(useJournalTrades).mockReturnValue({
      loading: false,
      error: "Could not load journal trades.",
      allTrades: [],
      loadTrades,
      retryLoadTrades,
      setAllTrades: vi.fn(),
    });

    render(
      <JournalContentGate variant="dashboard">
        <div data-testid="journal-ready-content">Ready</div>
      </JournalContentGate>,
    );

    expect(screen.getByTestId("journal-content-error")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retryLoadTrades).toHaveBeenCalled();
  });

  it("renders children when data is ready", () => {
    vi.mocked(useJournalTrades).mockReturnValue({
      loading: false,
      error: null,
      allTrades: [{ id: "t1" } as never],
      loadTrades,
      retryLoadTrades,
      setAllTrades: vi.fn(),
    });

    render(
      <JournalContentGate variant="dashboard">
        <div data-testid="journal-ready-content">Ready</div>
      </JournalContentGate>,
    );

    expect(screen.getByTestId("journal-ready-content")).toBeInTheDocument();
  });
});
