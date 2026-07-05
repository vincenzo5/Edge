import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import HomeJournalPanel from "./HomeJournalPanel";

describe("HomeJournalPanel", () => {
  it("shows coming soon copy and journal link", () => {
    render(<HomeJournalPanel />);

    expect(screen.getByText(/Trading journal is coming soon/)).toBeInTheDocument();
    expect(screen.getByTestId("home-journal-open")).toHaveAttribute("href", "/journal");
  });
});

describe("HomeModuleDrawer", () => {
  it("opens drawer panel and closes on escape", async () => {
    const onClose = vi.fn();
    const { default: HomeModuleDrawer } = await import("./HomeModuleDrawer");

    render(
      <HomeModuleDrawer
        open
        panel="journal"
        onPanelChange={vi.fn()}
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId("home-module-drawer")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when backdrop is clicked", async () => {
    const onClose = vi.fn();
    const { default: HomeModuleDrawer } = await import("./HomeModuleDrawer");

    render(
      <HomeModuleDrawer
        open
        panel="research"
        onPanelChange={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByTestId("home-module-drawer-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });
});
