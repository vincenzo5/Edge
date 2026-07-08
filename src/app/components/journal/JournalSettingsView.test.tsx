import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import JournalSettingsView from "./JournalSettingsView";

describe("JournalSettingsView", () => {
  it("shows placeholder message", () => {
    render(<JournalSettingsView />);
    expect(screen.getByTestId("journal-settings-view")).toBeInTheDocument();
    expect(screen.getByText("Settings coming soon.")).toBeInTheDocument();
  });
});
