/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import EdgeAnchoredPopover from "./EdgeAnchoredPopover";
import EdgeMenuItem from "./EdgeMenuItem";

function PopoverHarness() {
  const anchorRef = createRef<HTMLButtonElement>();
  const [open, setOpen] = useState(true);

  return (
    <>
      <button ref={anchorRef} type="button" data-testid="anchor">
        Open
      </button>
      <EdgeAnchoredPopover open={open} anchorRef={anchorRef} onClose={() => setOpen(false)}>
        <EdgeMenuItem label="First" onClick={vi.fn()} />
        <EdgeMenuItem label="Second" onClick={vi.fn()} />
      </EdgeAnchoredPopover>
    </>
  );
}

describe("EdgeAnchoredPopover", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dismisses on Escape and returns focus to anchor", () => {
    render(<PopoverHarness />);
    const anchor = screen.getByTestId("anchor");
    anchor.focus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(anchor);
  });

  it("renders menu items inside the anchored menu shell", () => {
    render(<PopoverHarness />);
    const menuItems = document.body.querySelectorAll('[role="menuitem"]');
    expect(menuItems).toHaveLength(2);
    expect(menuItems[0]?.textContent).toContain("First");
    expect(menuItems[1]?.textContent).toContain("Second");
  });
});
