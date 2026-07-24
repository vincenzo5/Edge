import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MarketDataSettingsSection from "./MarketDataSettingsSection";
import type { ServerHealthPayload } from "@/lib/marketData/health";
import { createDefaultDataProviderPreference } from "@/lib/marketData/providerWaterfall";

const setPreference = vi.fn();

vi.mock("@/lib/marketData/useDataProviderPreference", () => ({
  useDataProviderPreference: () => ({
    preference: createDefaultDataProviderPreference(),
    setPreference,
  }),
}));

const mockHealthPayload: ServerHealthPayload = {
  generatedAt: Date.now(),
  providers: [
    {
      id: "tws",
      label: "IB Gateway",
      configured: true,
      status: "healthy",
      detail: "Connected",
    },
    {
      id: "ibkr",
      label: "IBKR",
      configured: true,
      status: "healthy",
      detail: "Authenticated",
    },
    {
      id: "yahoo",
      label: "Yahoo",
      configured: true,
      status: "healthy",
      detail: "Fallback available",
    },
  ],
  recentWarnings: [],
  cache: {
    kind: "memory",
    degraded: false,
    lastPingOk: null,
    lastPingAt: null,
  },
};

describe("MarketDataSettingsSection", () => {
  beforeEach(() => {
    setPreference.mockClear();
  });

  it("renders provider status table and preference controls", () => {
    render(
      <MarketDataSettingsSection
        enabled
        health={mockHealthPayload}
        healthLoading={false}
        healthError={null}
      />,
    );

    expect(screen.getByTestId("app-settings-market-data-section")).toBeInTheDocument();
    expect(screen.getByTestId("app-settings-provider-table")).toBeInTheDocument();
    expect(screen.getByTestId("app-settings-provider-preference-list")).toBeInTheDocument();
    expect(screen.getByTestId("app-settings-provider-preference-tws")).toBeInTheDocument();
  });

  it("moves provider order up when reorder button clicked", () => {
    render(
      <MarketDataSettingsSection
        enabled
        health={mockHealthPayload}
        healthLoading={false}
        healthError={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Move IBKR Client Portal up/i }));
    expect(setPreference).toHaveBeenCalledWith(
      expect.objectContaining({
        orderedProviders: ["ibkr", "tws", "massive", "yahoo"],
      }),
    );
  });
});
