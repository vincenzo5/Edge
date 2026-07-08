import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/journal/JournalSyncProvider", () => ({
  useJournalSync: () => ({
    syncing: false,
    syncNow: vi.fn(async () => {}),
  }),
}));

vi.mock("@/app/components/journal/JournalImportDialog", () => ({
  default: ({ onImported }: { onImported: () => void }) => (
    <button type="button" data-testid="journal-import-dialog" onClick={onImported}>
      Import
    </button>
  ),
}));

import JournalGlobalEmptyState from "./JournalGlobalEmptyState";

describe("JournalGlobalEmptyState", () => {
  it("renders global empty message and actions", () => {
    render(<JournalGlobalEmptyState />);
    expect(screen.getByTestId("journal-global-empty")).toBeInTheDocument();
    expect(
      screen.getByText("No trades yet. Import Flex CSV history or sync live IBKR fills."),
    ).toBeInTheDocument();
    expect(screen.getByText("Sync fills")).toBeInTheDocument();
    expect(screen.getByTestId("journal-import-dialog")).toBeInTheDocument();
  });
});
