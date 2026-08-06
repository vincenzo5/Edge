import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CopilotEmptyBrand } from "./CopilotEmptyBrand";
import { CopilotShell } from "./CopilotShell";

describe("CopilotShell", () => {
  it("renders empty hero cluster with brand and composer", () => {
    render(
      <CopilotShell
        variant="page"
        isEmpty
        brand={<div data-testid="brand-slot">Brand</div>}
        composer={<div data-testid="composer-slot">Composer</div>}
      >
        {null}
      </CopilotShell>,
    );

    expect(screen.getByTestId("copilot-panel")).toBeTruthy();
    expect(screen.getByTestId("copilot-empty")).toBeTruthy();
    expect(screen.getByTestId("copilot-empty-cluster")).toBeTruthy();
    expect(screen.getByTestId("brand-slot")).toBeTruthy();
    expect(screen.getByTestId("composer-slot")).toBeTruthy();
    expect(screen.queryByTestId("copilot-top-chrome")).toBeNull();
  });

  it("still renders optional footer slot when provided", () => {
    render(
      <CopilotShell
        variant="page"
        isEmpty
        composer={<div data-testid="composer-slot">Composer</div>}
        footer={<div data-testid="footer-slot">Footer</div>}
      >
        {null}
      </CopilotShell>,
    );

    expect(screen.getByTestId("footer-slot")).toBeTruthy();
  });

  it("renders minimal top chrome on empty when provided", () => {
    render(
      <CopilotShell
        variant="sidebar"
        isEmpty
        topChrome={<button type="button">Settings</button>}
        composer={<div>Composer</div>}
      >
        {null}
      </CopilotShell>,
    );

    const chrome = screen.getByTestId("copilot-top-chrome");
    expect(chrome).toBeTruthy();
    expect(chrome.className).toContain("opacity-0");
    expect(chrome.className).toContain("group-hover:opacity-100");
    expect(screen.getByRole("button", { name: "Settings" })).toBeTruthy();
  });

  it("overlays hover-only top chrome on wide active chat column", () => {
    render(
      <CopilotShell
        variant="page"
        isEmpty={false}
        history={<aside data-testid="history-slot">History</aside>}
        topChrome={<button type="button">Settings</button>}
        composer={<div>Composer</div>}
      >
        <div data-testid="messages-slot">Messages</div>
      </CopilotShell>,
    );

    const chrome = screen.getByTestId("copilot-top-chrome");
    expect(chrome.className).toContain("absolute");
    expect(chrome.className).toContain("opacity-0");
    expect(chrome.className).toContain("group-hover:opacity-100");
    expect(screen.getByTestId("copilot-active-layout").contains(chrome)).toBe(true);
    expect(screen.queryByRole("heading", { name: "Copilot" })).toBeNull();
  });

  it("renders empty layout with history beside hero cluster", () => {
    render(
      <CopilotShell
        variant="page"
        isEmpty
        history={<aside data-testid="history-slot">History</aside>}
        brand={<div data-testid="brand-slot">Brand</div>}
        composer={<div data-testid="composer-slot">Composer</div>}
      >
        {null}
      </CopilotShell>,
    );

    expect(screen.getByTestId("copilot-empty-layout")).toBeTruthy();
    expect(screen.getByTestId("history-slot")).toBeTruthy();
    expect(screen.getByTestId("brand-slot")).toBeTruthy();
    expect(screen.getByTestId("composer-slot")).toBeTruthy();
  });

  it("renders active layout with scroll region and docked composer", () => {
    render(
      <CopilotShell
        variant="page"
        isEmpty={false}
        topChrome={<div data-testid="header-slot">Header</div>}
        composer={<div data-testid="composer-slot">Composer</div>}
      >
        <div data-testid="messages-slot">Messages</div>
      </CopilotShell>,
    );

    expect(screen.getByTestId("header-slot")).toBeTruthy();
    expect(screen.getByTestId("messages-slot")).toBeTruthy();
    expect(screen.getByTestId("composer-slot")).toBeTruthy();
    expect(screen.getByTestId("copilot-composer-dock")).toBeTruthy();
    expect(screen.queryByTestId("copilot-empty")).toBeNull();
  });

  it("renders evidence slot beside the active message column", () => {
    render(
      <CopilotShell
        variant="page"
        isEmpty={false}
        history={<aside data-testid="history-slot">History</aside>}
        evidence={<aside data-testid="evidence-slot">Evidence</aside>}
        composer={<div>Composer</div>}
      >
        <div data-testid="messages-slot">Messages</div>
      </CopilotShell>,
    );

    expect(screen.getByTestId("copilot-active-layout")).toBeTruthy();
    expect(screen.getByTestId("history-slot")).toBeTruthy();
    expect(screen.getByTestId("evidence-slot")).toBeTruthy();
    expect(screen.getByTestId("messages-slot")).toBeTruthy();
  });

  it("centers docked composer on wide hosts", () => {
    render(
      <CopilotShell variant="page" isEmpty={false} composer={<div>Composer</div>}>
        <div>Messages</div>
      </CopilotShell>,
    );

    const dock = screen.getByTestId("copilot-composer-dock");
    expect(dock.className).toContain("justify-center");
    expect(dock.className).toContain("pt-0");
    expect(dock.querySelector(".max-w-\\[var\\(--copilot-bar-max-width\\)\\]")).toBeTruthy();
  });

  it("applies host variant data attribute", () => {
    render(
      <CopilotShell variant="tile" isEmpty composer={<div>Composer</div>}>
        {null}
      </CopilotShell>,
    );

    expect(screen.getByTestId("copilot-panel")).toHaveAttribute(
      "data-copilot-shell-variant",
      "tile",
    );
  });
});

describe("CopilotEmptyBrand", () => {
  it("shows mark-only brand in sidebar variant", () => {
    render(<CopilotEmptyBrand variant="sidebar" />);

    const brand = screen.getByTestId("copilot-empty-brand");
    expect(brand).toHaveAttribute("data-brand-variant", "mark");
    expect(screen.getByRole("img", { name: "Edge" })).toBeTruthy();
  });

  it("shows full wordmark brand on page variant", () => {
    render(<CopilotEmptyBrand variant="page" />);

    const brand = screen.getByTestId("copilot-empty-brand");
    expect(brand).toHaveAttribute("data-brand-variant", "full");
    expect(brand.className).toContain("mb-[var(--copilot-bar-min-height)]");
    expect(brand.className).toContain("w-full");

    const logo = screen.getByRole("img", { name: "Edge" });
    expect(logo.className).toContain(
      "w-[min(32%,calc(var(--copilot-bar-max-width)*0.32))]",
    );
    expect(logo.className).toContain("h-auto");
  });
});
