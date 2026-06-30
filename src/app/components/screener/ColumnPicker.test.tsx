/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ColumnPicker from "./ColumnPicker";
import { DEFAULT_SCREENER_COLUMNS } from "@/lib/screener/types";

describe("ColumnPicker", () => {
  it("opens dropdown and toggles columns", () => {
    const onChange = vi.fn();
    const onReset = vi.fn();

    render(
      <ColumnPicker
        columns={DEFAULT_SCREENER_COLUMNS}
        onColumnsChange={onChange}
        onResetColumns={onReset}
      />,
    );

    fireEvent.click(screen.getByTestId("screener-column-picker-trigger"));
    expect(screen.getByTestId("screener-column-toggle-industry")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Industry"));
    expect(onChange).toHaveBeenCalled();
  });

  it("resets columns to default", () => {
    const onReset = vi.fn();
    render(
      <ColumnPicker
        columns={["symbol", "industry"]}
        onColumnsChange={vi.fn()}
        onResetColumns={onReset}
      />,
    );

    fireEvent.click(screen.getByTestId("screener-column-picker-trigger"));
    fireEvent.click(screen.getByText("Reset to default"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("shows indicator section when indicator columns provided", () => {
    render(
      <ColumnPicker
        columns={DEFAULT_SCREENER_COLUMNS}
        indicatorColumns={[{ key: "rsi", label: "rsi" }]}
        visibleIndicatorKeys={["rsi"]}
        onColumnsChange={vi.fn()}
        onResetColumns={vi.fn()}
        onToggleIndicatorColumn={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("screener-column-picker-trigger"));
    expect(screen.getByTestId("screener-indicator-column-toggle-rsi")).toBeTruthy();
  });
});
