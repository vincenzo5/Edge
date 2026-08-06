import { describe, expect, it, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import JournalCapitalSettingsSection from "./JournalCapitalSettingsSection";
import {
  DEFAULT_JOURNAL_CAPITAL_EVENTS,
  readJournalCapitalEvents,
  sumJournalNetDeposits,
} from "@/lib/journal/journalCapitalPreference";

describe("JournalCapitalSettingsSection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows net deposits from statement seed", () => {
    render(<JournalCapitalSettingsSection />);
    expect(screen.getByTestId("journal-capital-net-total")).toHaveTextContent("$28,000.00");
    expect(screen.getAllByText(/\+?\$500\.00/).length).toBeGreaterThan(0);
  });

  it("adds a manual deposit", () => {
    render(<JournalCapitalSettingsSection />);
    fireEvent.change(screen.getByTestId("journal-capital-amount-input"), {
      target: { value: "2500" },
    });
    fireEvent.click(screen.getByTestId("journal-capital-add"));
    expect(readJournalCapitalEvents()).toHaveLength(DEFAULT_JOURNAL_CAPITAL_EVENTS.length + 1);
    expect(screen.getByTestId("journal-capital-net-total")).toHaveTextContent("$30,500.00");
  });

  it("removes a capital event", () => {
    render(<JournalCapitalSettingsSection />);
    const first = readJournalCapitalEvents()[0]!;
    fireEvent.click(screen.getByTestId(`journal-capital-remove-${first.id}`));
    expect(readJournalCapitalEvents()).toHaveLength(DEFAULT_JOURNAL_CAPITAL_EVENTS.length - 1);
    expect(sumJournalNetDeposits(readJournalCapitalEvents())).toBe(27_500);
  });
});
