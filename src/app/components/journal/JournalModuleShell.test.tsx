import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import JournalModuleShell from "./JournalModuleShell";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/journal/dashboard"),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/app/components/journal/JournalSyncProvider", () => ({
  JournalSyncProvider: ({ children }: { children: React.ReactNode }) => children,
  useJournalSync: () => ({
    lastSyncedAt: null,
    syncing: false,
    syncNow: vi.fn(async () => {}),
  }),
}));

vi.mock("@/app/components/journal/JournalTradesProvider", () => ({
  JournalTradesProvider: ({ children }: { children: React.ReactNode }) => children,
  useJournalTrades: () => ({
    loading: false,
    error: null,
    allTrades: [],
    loadTrades: vi.fn(async () => {}),
    retryLoadTrades: vi.fn(async () => {}),
    setAllTrades: vi.fn(),
  }),
}));

describe("JournalModuleShell", () => {
  it("renders sub-nav and child content", () => {
    render(
      <JournalModuleShell>
        <div data-testid="journal-child">Child</div>
      </JournalModuleShell>,
    );
    expect(screen.getByTestId("journal-page")).toBeInTheDocument();
    expect(screen.getByTestId("journal-subnav")).toBeInTheDocument();
    expect(screen.getByTestId("journal-child")).toBeInTheDocument();
  });
});
