import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RiskSettingsPanel } from "./RiskSettingsPanel";
import { RiskSettingsProvider } from "../../RiskSettingsProvider";

vi.mock("../../AccountProvider", () => ({
  useAccountOptional: vi.fn(() => ({
    connectionState: "connected",
    summary: {
      tags: { NetLiquidation: { tag: "NetLiquidation", value: "100000" } },
      updatedAt: Date.now(),
    },
    status: null,
    positions: [],
    pnl: null,
    orders: [],
    executions: [],
    error: null,
    disabled: false,
    refresh: vi.fn(),
    positionForSymbol: () => null,
  })),
}));

function renderPanel() {
  return render(
    <RiskSettingsProvider>
      <RiskSettingsPanel />
    </RiskSettingsProvider>,
  );
}

describe("RiskSettingsPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders risk settings panel with live readout", () => {
    renderPanel();
    expect(screen.getByTestId("risk-settings-panel")).toBeInTheDocument();
    expect(screen.getByTestId("risk-settings-readout")).toHaveTextContent("$1,000");
    expect(screen.getByTestId("risk-settings-readout")).toHaveTextContent("1%");
  });

  it("updates risk percent via input", () => {
    renderPanel();
    fireEvent.change(screen.getByTestId("risk-settings-percent"), {
      target: { value: "2" },
    });
    expect(screen.getByTestId("risk-settings-readout")).toHaveTextContent("$2,000");
  });

  it("switches to absolute mode", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("tab", { name: "$ absolute" }));
    expect(screen.getByTestId("risk-settings-absolute")).toBeInTheDocument();
    expect(screen.queryByTestId("risk-settings-basis")).not.toBeInTheDocument();
  });

  it("resets to defaults", () => {
    renderPanel();
    fireEvent.change(screen.getByTestId("risk-settings-percent"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByTestId("risk-settings-reset"));
    expect(screen.getByTestId("risk-settings-percent")).toHaveValue(1);
  });
});
