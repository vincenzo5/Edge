/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import JournalSettingsView from "./JournalSettingsView";
import { JournalTileViewProvider } from "@/app/components/app-workspace/JournalTileViewContext";

vi.mock("@/app/components/journal/JournalSyncProvider", () => ({
  useJournalSync: () => ({ syncing: false, syncNow: vi.fn() }),
}));

vi.mock("@/app/components/journal/JournalTradesProvider", () => ({
  useJournalTrades: () => ({ loadTrades: vi.fn() }),
}));

vi.mock("@/app/components/journal/JournalHistorySyncChip", () => ({
  default: () => null,
}));

vi.mock("@/app/components/journal/JournalImportDialog", () => ({
  default: () => (
    <button type="button" aria-label="Import Flex CSV">
      Import
    </button>
  ),
}));

describe("JournalSettingsView", () => {
  it("renders setups settings", () => {
    render(<JournalSettingsView />);
    expect(screen.getByTestId("journal-settings-view")).toBeInTheDocument();
    expect(screen.getByTestId("journal-capital-settings")).toBeInTheDocument();
    expect(screen.getByTestId("journal-setups-settings")).toBeInTheDocument();
    expect(screen.queryByText("Settings coming soon.")).not.toBeInTheDocument();
  });

  it("keeps journal header tabs and scope controls while settings is open", () => {
    render(
      <JournalTileViewProvider view="settings" listView="dashboard" setView={vi.fn()}>
        <JournalSettingsView />
      </JournalTileViewProvider>,
    );

    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Trades" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Open Positions" })).toBeInTheDocument();
    expect(screen.getByTestId("journal-scope-bar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Journal settings" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
