/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EdgeMicroSelect from "./EdgeMicroSelect";

const OPTIONS = [
  { value: "now", label: "Now" },
  { value: "close", label: "On close" },
] as const;

describe("EdgeMicroSelect", () => {
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

  it("renders selected label on a compact trigger", () => {
    render(
      <EdgeMicroSelect
        testId="fill-select"
        aria-label="Fill timing"
        value="now"
        options={[...OPTIONS]}
        onChange={vi.fn()}
      />,
    );
    const trigger = screen.getByTestId("fill-select");
    expect(trigger).toHaveTextContent("Now");
    expect(trigger).toHaveAttribute("aria-label", "Fill timing");
    expect(trigger.className).toContain("h-[18px]");
  });

  it("opens menu and selects a value", () => {
    const onChange = vi.fn();
    render(
      <EdgeMicroSelect
        testId="fill-select"
        aria-label="Fill timing"
        value="now"
        options={[...OPTIONS]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByTestId("fill-select"));
    fireEvent.click(screen.getByTestId("fill-select-option-close"));
    expect(onChange).toHaveBeenCalledWith("close");
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
