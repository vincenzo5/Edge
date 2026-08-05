import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/components/journal/JournalCaptureStudio", () => ({
  default: () => <div data-testid="journal-capture-studio-page">Capture studio</div>,
}));

import JournalCapturePage from "./page";

describe("JournalCapturePage", () => {
  it("renders capture studio inside suspense", () => {
    render(<JournalCapturePage />);
    expect(screen.getByTestId("journal-capture-studio-page")).toBeInTheDocument();
  });
});
