/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { useFocusTrap } from "./useFocusTrap";

describe("useFocusTrap", () => {
  it("focuses initialFocusRef on activate instead of the first focusable", () => {
    function Wired() {
      const containerRef = useRef<HTMLDivElement>(null);
      const inputRef = useRef<HTMLInputElement>(null);
      useFocusTrap(true, containerRef, { initialFocusRef: inputRef });
      return (
        <div ref={containerRef}>
          <button type="button">Close</button>
          <input ref={inputRef} data-testid="trap-input" aria-label="Search" />
        </div>
      );
    }

    render(<Wired />);
    expect(screen.getByTestId("trap-input")).toHaveFocus();
  });

  it("does not steal focus when onEscape identity changes while active", () => {
    function Harness() {
      const [escapeVersion, setEscapeVersion] = useState(0);
      const containerRef = useRef<HTMLDivElement>(null);
      const inputRef = useRef<HTMLInputElement>(null);
      const triggerRef = useRef<HTMLButtonElement>(null);

      useFocusTrap(true, containerRef, {
        onEscape: () => {
          void escapeVersion;
        },
        returnFocusRef: triggerRef,
        initialFocusRef: inputRef,
      });

      return (
        <>
          <button ref={triggerRef} type="button">
            Trigger
          </button>
          <div ref={containerRef}>
            <button type="button">Close</button>
            <input ref={inputRef} data-testid="trap-input" aria-label="Search" />
          </div>
          <button type="button" onClick={() => setEscapeVersion((v) => v + 1)}>
            Rerender escape
          </button>
        </>
      );
    }

    render(<Harness />);
    const input = screen.getByTestId("trap-input");
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: "AAP" } });
    fireEvent.click(screen.getByRole("button", { name: "Rerender escape" }));

    expect(input).toHaveFocus();
    expect(input).toHaveValue("AAP");
  });

  it("still invokes the latest onEscape handler", () => {
    const first = vi.fn();
    const second = vi.fn();

    function Harness({ onEscape }: { onEscape: () => void }) {
      const containerRef = useRef<HTMLDivElement>(null);
      useFocusTrap(true, containerRef, { onEscape });
      return (
        <div ref={containerRef}>
          <button type="button">Close</button>
        </div>
      );
    }

    const { rerender } = render(<Harness onEscape={first} />);
    rerender(<Harness onEscape={second} />);

    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
