import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { DataHealthProvider } from "./DataHealthProvider";
import { useRegisterDatasetDemand } from "./useDatasetHealthRegistration";

vi.mock("../ActiveChartContext", () => ({
  useActiveChart: () => null,
}));

vi.mock("../MarketDataProvider", () => ({
  useMarketDataQuotes: () => null,
  useQuoteCount: () => 0,
  useAllQuotes: () => ({}),
}));

vi.mock("../AccountProvider", () => ({
  useAccountOptional: () => null,
}));

vi.mock("../AccountAliasesProvider", () => ({
  useAccountAliasesOptional: () => null,
}));

vi.mock("@/lib/marketData/useDataConnectionPreference", () => ({
  useDataConnectionPreference: () => ({ preference: null }),
}));

vi.mock("@/lib/persistence/sync/usePersistenceSyncHealth", () => ({
  usePersistenceSyncHealth: () => null,
}));

vi.mock("../screener/ScreenerProvider", () => ({
  useScreenerStateOptional: () => null,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <DataHealthProvider>{children}</DataHealthProvider>;
}

describe("useRegisterDatasetDemand", () => {
  it("survives rerenders when screener demand meta is stable", () => {
    const stableMeta = {
      source: "fmp",
      asOf: 1_700_000_000_000,
      lastUpdateAt: 1_700_000_000_000,
      stale: false,
    };

    const { rerender } = renderHook(
      () =>
        useRegisterDatasetDemand("screener_descriptive", stableMeta, {
          active: true,
          warnings: ["FMP endpoint restricted (403)"],
          status: "loaded",
        }),
      { wrapper },
    );

    expect(() => {
      for (let i = 0; i < 5; i++) rerender();
    }).not.toThrow();
  });
});
