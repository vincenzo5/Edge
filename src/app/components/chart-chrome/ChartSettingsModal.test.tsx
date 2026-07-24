import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChartSettingsModal from "./ChartSettingsModal";
import type { PresetEnvelope } from "@/lib/chart/presets/types";

type ChartTemplatePreset = Extract<PresetEnvelope, { kind: "chart" }>;

describe("ChartSettingsModal", () => {
  it("renders TradingView-like sections and saves grouped settings", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <ChartSettingsModal
        open
        settings={{ canvas: { showGrid: false } }}
        initialSection="canvas"
        onClose={onClose}
        onSave={onSave}
      />,
    );

    expect(screen.getByText("Symbol")).toBeTruthy();
    expect(screen.getByText("Status line")).toBeTruthy();
    expect(screen.getByText("Scales and lines")).toBeTruthy();
    expect(screen.getByText("Canvas")).toBeTruthy();
    expect(screen.getByText("Events")).toBeTruthy();
    expect(screen.getByText("Trading")).toBeTruthy();
    expect(screen.queryByText("Template")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Ok" }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0].canvas.showGrid).toBe(false);
    expect(onSave.mock.calls[0][0].scales.priceScaleType).toBe("linear");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("saves event badge settings", () => {
    const onSave = vi.fn();
    render(
      <ChartSettingsModal
        open
        settings={{ events: { showNews: false, showOptionsExpiration: false } }}
        initialSection="events"
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    expect(screen.getByText("Event badges")).toBeTruthy();
    expect(screen.getByLabelText("Earnings")).toBeChecked();
    expect(screen.getByLabelText("News")).not.toBeChecked();
    expect(screen.getByLabelText("Options expirations (can be dense)")).not.toBeChecked();

    fireEvent.click(screen.getByLabelText("Options expirations (can be dense)"));
    fireEvent.click(screen.getByRole("button", { name: "Ok" }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0].events.showEarnings).toBe(true);
    expect(onSave.mock.calls[0][0].events.showNews).toBe(false);
    expect(onSave.mock.calls[0][0].events.showOptionsExpiration).toBe(true);
  });

  it("resets to defaults", () => {
    const onSave = vi.fn();
    render(
      <ChartSettingsModal
        open
        settings={{ canvas: { showGrid: false } }}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByText("Reset to defaults"));
    fireEvent.click(screen.getByRole("button", { name: "Ok" }));
    expect(onSave.mock.calls[0][0].canvas.showGrid).toBe(true);
  });

  it("shows template actions in the footer dropdown", () => {
    const onSaveTemplate = vi.fn();
    const onApplyTemplate = vi.fn();
    const chartTemplate: ChartTemplatePreset = {
      version: 1,
      id: "template-1",
      name: "Dark momentum",
      createdAt: 1,
      kind: "chart",
      payload: {
        chartType: "candle_solid",
        chartSettings: {},
        indicators: [],
      },
    };

    render(
      <ChartSettingsModal
        open
        settings={{ canvas: { showGrid: false } }}
        initialSection="canvas"
        onClose={vi.fn()}
        onSave={vi.fn()}
        chartTemplates={[chartTemplate]}
        onSaveTemplate={onSaveTemplate}
        onApplyTemplate={onApplyTemplate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Templates/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Save current as template…" }));
    expect(onSaveTemplate).toHaveBeenCalledOnce();
    expect(onSaveTemplate.mock.calls[0][0].canvas.showGrid).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /Templates/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Dark momentum" }));
    expect(onApplyTemplate).toHaveBeenCalledWith(chartTemplate);
  });
});
