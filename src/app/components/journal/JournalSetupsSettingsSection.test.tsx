/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import JournalSetupsSettingsSection from "./JournalSetupsSettingsSection";
import {
  DEFAULT_JOURNAL_SETUP_VALUES,
  JOURNAL_SETUP_VALUES_STORAGE_KEY,
  readJournalSetupValues,
} from "@/lib/journal/journalSetupPreference";

vi.mock("@/lib/userPreferences/userPreferencesSync", () => ({
  notifyUserPreferencesChanged: vi.fn(),
}));

describe("JournalSetupsSettingsSection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders default setups", () => {
    render(<JournalSetupsSettingsSection />);
    expect(screen.getByTestId("journal-setups-settings")).toBeInTheDocument();
    for (const setup of DEFAULT_JOURNAL_SETUP_VALUES) {
      expect(screen.getByTestId(`journal-setup-row-${setup}`)).toBeInTheDocument();
    }
  });

  it("adds a custom setup", () => {
    render(<JournalSetupsSettingsSection />);
    fireEvent.change(screen.getByTestId("journal-setups-new-input"), {
      target: { value: "VWAP reclaim" },
    });
    fireEvent.click(screen.getByTestId("journal-setups-add"));
    expect(readJournalSetupValues()).toContain("VWAP reclaim");
    expect(screen.getByTestId("journal-setup-row-VWAP reclaim")).toBeInTheDocument();
  });

  it("deletes a setup and resets defaults", () => {
    render(<JournalSetupsSettingsSection />);
    fireEvent.click(screen.getByTestId("journal-setup-delete-breakout"));
    expect(readJournalSetupValues()).not.toContain("breakout");

    fireEvent.click(screen.getByTestId("journal-setups-reset"));
    expect(readJournalSetupValues()).toEqual([...DEFAULT_JOURNAL_SETUP_VALUES]);
  });

  it("renames a setup", () => {
    render(<JournalSetupsSettingsSection />);
    fireEvent.click(screen.getByTestId("journal-setup-label-breakout"));
    fireEvent.change(screen.getByTestId("journal-setup-edit-breakout"), {
      target: { value: "Breakout retest" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(readJournalSetupValues()).toContain("Breakout retest");
    expect(localStorage.getItem(JOURNAL_SETUP_VALUES_STORAGE_KEY)).toContain("Breakout retest");
  });
});
