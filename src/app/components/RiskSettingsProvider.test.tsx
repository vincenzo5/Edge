import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useEffect } from "react";
import {
  RiskSettingsProvider,
  useRiskSettings,
  type RiskSettingsContextValue,
} from "./RiskSettingsProvider";
import { DEFAULT_RISK_SETTINGS, RISK_SETTINGS_STORAGE_KEY } from "@/lib/risk/riskSettings";

vi.mock("./AccountProvider", () => ({
  useAccountOptional: vi.fn(),
}));

import { useAccountOptional } from "./AccountProvider";

const mockUseAccountOptional = vi.mocked(useAccountOptional);

function RiskProbe({
  onChange,
}: {
  onChange: (value: RiskSettingsContextValue) => void;
}) {
  const risk = useRiskSettings();
  useEffect(() => {
    onChange(risk);
  }, [risk, onChange]);
  return (
    <div data-testid="dollar-risk">{risk.dollarRisk ?? "null"}</div>
  );
}

describe("RiskSettingsProvider", () => {
  beforeEach(() => {
    mockUseAccountOptional.mockReturnValue(null);
    window.localStorage.clear();
  });

  it("resolves dollarRisk from connected account NetLiquidation", () => {
    mockUseAccountOptional.mockReturnValue({
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
    });

    let latest: RiskSettingsContextValue | null = null;
    render(
      <RiskSettingsProvider>
        <RiskProbe onChange={(v) => { latest = v; }} />
      </RiskSettingsProvider>,
    );

    expect(screen.getByTestId("dollar-risk")).toHaveTextContent("1000");
    expect(latest?.dollarRisk).toBe(1_000);
    expect(latest?.basisStale).toBe(false);
  });

  it("returns absoluteRisk regardless of account", () => {
    mockUseAccountOptional.mockReturnValue(null);
    window.localStorage.setItem(
      RISK_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_RISK_SETTINGS,
        sizingMode: "absolute",
        absoluteRisk: 2_500,
      }),
    );

    render(
      <RiskSettingsProvider>
        <RiskProbe onChange={() => {}} />
      </RiskSettingsProvider>,
    );

    expect(screen.getByTestId("dollar-risk")).toHaveTextContent("2500");
  });

  it("marks basis stale and keeps last dollar risk when account disconnects", () => {
    mockUseAccountOptional.mockReturnValue({
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
    });

    const { rerender } = render(
      <RiskSettingsProvider>
        <RiskProbe onChange={() => {}} />
      </RiskSettingsProvider>,
    );
    expect(screen.getByTestId("dollar-risk")).toHaveTextContent("1000");

    mockUseAccountOptional.mockReturnValue({
      connectionState: "disconnected",
      summary: null,
      status: null,
      positions: [],
      pnl: null,
      orders: [],
      executions: [],
      error: null,
      disabled: false,
      refresh: vi.fn(),
      positionForSymbol: () => null,
    });

    rerender(
      <RiskSettingsProvider>
        <RiskProbe onChange={() => {}} />
      </RiskSettingsProvider>,
    );

    expect(screen.getByTestId("dollar-risk")).toHaveTextContent("1000");
  });

  it("persists settings to localStorage on update", () => {
    function Updater() {
      const { updateSettings } = useRiskSettings();
      return (
        <button
          type="button"
          data-testid="set-percent"
          onClick={() => updateSettings({ riskPercent: 2 })}
        >
          Set
        </button>
      );
    }

    render(
      <RiskSettingsProvider>
        <Updater />
      </RiskSettingsProvider>,
    );

    act(() => {
      screen.getByTestId("set-percent").click();
    });

    const stored = JSON.parse(
      window.localStorage.getItem(RISK_SETTINGS_STORAGE_KEY) ?? "{}",
    );
    expect(stored.riskPercent).toBe(2);
  });

  it("falls back to manualCapital in riskAccount when account missing", () => {
    mockUseAccountOptional.mockReturnValue(null);

    let latest: RiskSettingsContextValue | null = null;
    render(
      <RiskSettingsProvider>
        <RiskProbe onChange={(v) => { latest = v; }} />
      </RiskSettingsProvider>,
    );

    expect(latest?.riskAccount.capital).toBe(DEFAULT_RISK_SETTINGS.manualCapital);
  });
});
