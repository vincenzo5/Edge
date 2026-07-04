import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import type {
  EntryPriceMode,
  ExitPriceMode,
  IvScenario,
  StrategyLegInput,
} from "@/lib/risk/optionsStrategyRisk";

export type OptionsPanelMode = "chain" | "calculator";

export type RiskCalculatorSeedLeg = {
  contract: OptionContractSnapshot;
  action?: "buy" | "sell";
  quantity?: number;
};

export type OptionsCalculatorState = {
  legs: StrategyLegInput[];
  entryPriceMode: EntryPriceMode;
  exitPriceMode: ExitPriceMode;
  ivScenario: IvScenario;
};

export type OptionsSessionState = {
  mode: OptionsPanelMode;
  calculator: OptionsCalculatorState;
  pendingSeedLeg: RiskCalculatorSeedLeg | null;
};

export const DEFAULT_OPTIONS_CALCULATOR: OptionsCalculatorState = {
  legs: [],
  entryPriceMode: "mid",
  exitPriceMode: "bid",
  ivScenario: "unchanged",
};

export const DEFAULT_OPTIONS_SESSION: OptionsSessionState = {
  mode: "chain",
  calculator: DEFAULT_OPTIONS_CALCULATOR,
  pendingSeedLeg: null,
};

export function createOptionsSessionState(
  overrides?: Partial<OptionsSessionState>,
): OptionsSessionState {
  return {
    ...DEFAULT_OPTIONS_SESSION,
    ...overrides,
    calculator: {
      ...DEFAULT_OPTIONS_CALCULATOR,
      ...overrides?.calculator,
    },
  };
}

/** Returns true when symbol or expiration scope changed and session should reset. */
export function shouldResetOptionsSession(
  prev: { symbol: string | null; expiration: string | null },
  next: { symbol: string | null; expiration: string | null },
): boolean {
  if (prev.symbol !== next.symbol) return true;
  if (prev.symbol == null) return false;
  if (
    prev.expiration != null &&
    next.expiration != null &&
    prev.expiration !== next.expiration
  ) {
    return true;
  }
  return false;
}

export function scopeKey(symbol: string | null, expiration: string | null): string {
  return `${symbol ?? ""}:${expiration ?? ""}`;
}
