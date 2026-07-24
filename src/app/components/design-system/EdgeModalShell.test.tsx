/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import EdgeModalShell from "./EdgeModalShell";
import { ModalContainmentProvider } from "./ModalContainmentContext";

describe("EdgeModalShell", () => {
  it("exposes dialog semantics and traps focus", () => {
    render(
      <EdgeModalShell open title="Import trades" onClose={vi.fn()}>
        <button type="button">Choose file</button>
      </EdgeModalShell>,
    );

    const dialog = screen.getByRole("dialog", { name: "Import trades" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
  });

  it("calls onClose from close button", () => {
    const onClose = vi.fn();
    render(
      <EdgeModalShell open title="Import trades" onClose={onClose}>
        <p>Body</p>
      </EdgeModalShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose from Escape", async () => {
    const onClose = vi.fn();
    render(
      <EdgeModalShell open title="Import trades" onClose={onClose}>
        <p>Body</p>
      </EdgeModalShell>,
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    fireEvent.keyDown(document, { key: "Escape", bubbles: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("defaults to viewport containment and portals to document.body", () => {
    render(
      <EdgeModalShell open title="Symbol search" onClose={vi.fn()} testId="symbol-search-modal">
        <p>Body</p>
      </EdgeModalShell>,
    );

    const backdrop = screen.getByTestId("symbol-search-modal");
    expect(backdrop).toHaveAttribute("data-modal-containment", "viewport");
    expect(backdrop.className).toContain("fixed");
    expect(backdrop.className).toContain("z-[1300]");
    expect(backdrop.className).not.toContain("absolute");
    expect(backdrop.parentElement).toBe(document.body);
  });

  it("portals into a parent overlay host when containment is parent", () => {
    function Harness() {
      const [root, setRoot] = useState<HTMLDivElement | null>(null);
      return (
        <div data-testid="chart-section" className="relative" style={{ width: 400, height: 300 }}>
          <ModalContainmentProvider mode="parent" root={root}>
            <EdgeModalShell open title="Symbol search" onClose={vi.fn()} testId="symbol-search-modal">
              <p>Body</p>
            </EdgeModalShell>
            <div ref={setRoot} data-testid="chart-modal-root" className="absolute inset-0" />
          </ModalContainmentProvider>
        </div>
      );
    }

    render(<Harness />);

    const host = screen.getByTestId("chart-modal-root");
    const backdrop = screen.getByTestId("symbol-search-modal");
    expect(host.contains(backdrop)).toBe(true);
    expect(backdrop).toHaveAttribute("data-modal-containment", "parent");
    expect(backdrop.className).toContain("absolute");
    expect(backdrop.className).not.toMatch(/(?:^|\s)fixed(?:\s|$)/);
  });
});
