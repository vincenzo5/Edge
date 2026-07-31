import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { SerializedDrawing } from "@edge/chart-core/contracts";
import PositionPlanPanel from "./PositionPlanPanel";

vi.mock("../RiskSettingsProvider", () => ({
  useRiskSettingsOptional: () => ({
    dollarRisk: 500,
    settings: { sizingMode: "absolute" as const, absoluteRisk: 500 },
  }),
}));

function longDrawing(): SerializedDrawing {
  return {
    id: "draw-1",
    name: "long_position",
    label: "Long",
    points: [
      { timestamp: 1000, value: 100 },
      { timestamp: 1000, value: 95 },
      { timestamp: 2000, value: 110 },
      { timestamp: 2000, value: 100 },
    ],
  };
}

const toolbarAnchor = { left: 110, top: 56, width: 280, height: 36 };

function renderPanel(
  overrides: Partial<Parameters<typeof PositionPlanPanel>[0]> = {},
) {
  const onGeometryChange = vi.fn();
  const onDragOffsetChange = vi.fn();
  render(
    <PositionPlanPanel
      drawing={longDrawing()}
      toolbarAnchor={toolbarAnchor}
      containerWidth={800}
      containerHeight={400}
      dragOffset={{ x: 0, y: 0 }}
      onDragOffsetChange={onDragOffsetChange}
      onGeometryChange={onGeometryChange}
      {...overrides}
    />,
  );
  return { onGeometryChange, onDragOffsetChange };
}

describe("PositionPlanPanel", () => {
  it("renders editable fields and derived sizing for position drawings", () => {
    renderPanel();

    const panel = screen.getByTestId("position-plan-panel");
    expect(panel).toHaveTextContent("Plan");
    expect(panel).toHaveTextContent("Long");
    expect(screen.getByTestId("position-plan-entry")).toHaveValue("100.00");
    expect(screen.getByTestId("position-plan-stop")).toHaveValue("95.00");
    expect(screen.getByTestId("position-plan-target")).toHaveValue("110.00");
    expect(panel).toHaveTextContent("R:R");
    expect(panel).toHaveTextContent("2");
    expect(panel).toHaveTextContent("Qty");
    expect(panel).toHaveTextContent("100");
    expect(panel).toHaveTextContent("$500");
  });

  it("stacks below the toolbar by default", () => {
    renderPanel();
    const panel = screen.getByTestId("position-plan-panel");
    expect(panel).toHaveStyle({ top: "98px", left: "110px" });
  });

  it("commits entry changes on blur", () => {
    const { onGeometryChange } = renderPanel();

    const entry = screen.getByTestId("position-plan-entry") as HTMLInputElement;
    fireEvent.change(entry, { target: { value: "102.50" } });
    fireEvent.blur(entry);

    expect(onGeometryChange).toHaveBeenCalledWith({
      entry: 102.5,
      stop: 95,
      target: 110,
    });
  });

  it("moves when the drag handle is used", () => {
    const { onDragOffsetChange } = renderPanel();

    const handle = screen.getByTestId("position-plan-drag-handle");
    fireEvent.pointerDown(handle, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 120, clientY: 130, pointerId: 1 });

    expect(onDragOffsetChange).toHaveBeenCalledWith({ x: 20, y: 30 });
  });

  it("syncs unfocused fields when drawing geometry changes", () => {
    const { rerender } = render(
      <PositionPlanPanel
        drawing={longDrawing()}
        toolbarAnchor={toolbarAnchor}
        containerWidth={800}
        containerHeight={400}
        dragOffset={{ x: 0, y: 0 }}
        onDragOffsetChange={vi.fn()}
        onGeometryChange={vi.fn()}
      />,
    );

    rerender(
      <PositionPlanPanel
        drawing={{
          ...longDrawing(),
          points: [
            { timestamp: 1000, value: 105 },
            { timestamp: 1000, value: 98 },
            { timestamp: 2000, value: 119 },
            { timestamp: 2000, value: 105 },
          ],
        }}
        toolbarAnchor={toolbarAnchor}
        containerWidth={800}
        containerHeight={400}
        dragOffset={{ x: 0, y: 0 }}
        onDragOffsetChange={vi.fn()}
        onGeometryChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("position-plan-entry")).toHaveValue("105.00");
    expect(screen.getByTestId("position-plan-stop")).toHaveValue("98.00");
    expect(screen.getByTestId("position-plan-target")).toHaveValue("119.00");
  });

  it("returns null for non-position drawings", () => {
    const { container } = render(
      <PositionPlanPanel
        drawing={{
          name: "trend_line",
          points: [
            { timestamp: 0, value: 1 },
            { timestamp: 1, value: 2 },
          ],
        }}
        toolbarAnchor={toolbarAnchor}
        containerWidth={800}
        containerHeight={400}
        dragOffset={{ x: 0, y: 0 }}
        onDragOffsetChange={vi.fn()}
        onGeometryChange={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders policy section when onPolicyChange provided", () => {
    renderPanel({
      onPolicyChange: vi.fn(),
      onTradeSetup: vi.fn(),
      policyTemplates: [{ id: "break_even", name: "Break-even", rules: [] }],
      selectedPolicyId: "break_even",
      policyChips: [{ label: "Manage", ok: true }],
    });

    expect(screen.getByTestId("position-plan-policy")).toBeInTheDocument();
    expect(screen.getByTestId("position-plan-policy-select")).toHaveValue("break_even");
    expect(screen.getByTestId("position-plan-trade-setup")).toBeInTheDocument();
  });
});
