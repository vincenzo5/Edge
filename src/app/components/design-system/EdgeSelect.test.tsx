/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EdgeSelect from "./EdgeSelect";

const OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "all", label: "All time" },
] as const;

describe("EdgeSelect", () => {
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

  it("renders selected label on chip trigger", () => {
    render(
      <EdgeSelect
        testId="period-select"
        variant="chip"
        label="Period"
        value="all"
        options={[...OPTIONS]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("period-select")).toHaveTextContent("All time");
  });

  it("renders border-legend label associated with the trigger", () => {
    render(
      <EdgeSelect
        testId="period-select"
        variant="chip"
        label="Period"
        value="all"
        options={[...OPTIONS]}
        onChange={vi.fn()}
      />,
    );

    const label = screen.getByText("Period");
    const trigger = screen.getByTestId("period-select");
    expect(label).toHaveAttribute("id");
    expect(trigger).toHaveAttribute("aria-labelledby", label.id);
    expect(label.className).toContain("-translate-y-1/2");
    expect(label.parentElement?.contains(trigger)).toBe(true);
  });

  it("opens menu and selects a value", () => {
    const onChange = vi.fn();
    render(
      <EdgeSelect
        testId="period-select"
        variant="chip"
        value="all"
        options={[...OPTIONS]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByTestId("period-select"));
    fireEvent.click(screen.getByTestId("period-select-option-7d"));
    expect(onChange).toHaveBeenCalledWith("7d");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("dismisses on Escape and returns focus to trigger", () => {
    render(
      <EdgeSelect
        testId="period-select"
        value="all"
        options={[...OPTIONS]}
        onChange={vi.fn()}
      />,
    );

    const trigger = screen.getByTestId("period-select");
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("renders section headers for sectioned options", () => {
    render(
      <EdgeSelect
        testId="period-select"
        value="all"
        sections={[
          { label: "Quick ranges", options: [...OPTIONS] },
          { label: "Custom", options: [{ value: "custom", label: "Custom range…" }] },
        ]}
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("period-select"));
    expect(screen.getByText("Quick ranges")).toBeTruthy();
    expect(screen.getByText("Custom range…")).toBeTruthy();
  });

  it("uses field variant classes", () => {
    render(
      <EdgeSelect
        testId="field-select"
        variant="field"
        density="standard"
        value="all"
        options={[...OPTIONS]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("field-select").className).toContain("--edge-border");
    expect(screen.getByTestId("field-select").className).toContain("min-w-[8rem]");
  });

  it("uses compact field density without forced min width", () => {
    render(
      <EdgeSelect
        testId="field-select-compact"
        variant="field"
        density="compact"
        value="all"
        options={[...OPTIONS]}
        onChange={vi.fn()}
      />,
    );
    const className = screen.getByTestId("field-select-compact").className;
    expect(className).toContain("edge-control-compact");
    expect(className).toContain("min-w-0");
    expect(className).not.toContain("min-w-[8rem]");
  });

  it("does not open when disabled", () => {
    render(
      <EdgeSelect
        testId="period-select"
        disabled
        value="all"
        options={[...OPTIONS]}
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("period-select"));
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
