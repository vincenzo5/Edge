"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import type { StrategyLegInput } from "@/lib/risk/optionsStrategyRisk";
import {
  createOptionsSessionState,
  shouldResetOptionsSession,
  type OptionsCalculatorState,
  type OptionsPanelMode,
  type OptionsSessionState,
  type RiskCalculatorSeedLeg,
} from "@/lib/options/optionsSession";

export type OptionsSessionContextValue = {
  state: OptionsSessionState;
  scope: { symbol: string | null; expiration: string | null };
  setScope: (symbol: string | null, expiration: string | null) => void;
  setMode: (mode: OptionsPanelMode) => void;
  patchCalculator: (patch: Partial<OptionsCalculatorState>) => void;
  setLegs: (updater: (prev: StrategyLegInput[]) => StrategyLegInput[]) => void;
  seedFromAnalyze: (
    contract: OptionContractSnapshot,
    action?: "buy" | "sell",
    quantity?: number,
  ) => void;
  clearSeed: () => void;
};

const OptionsSessionContext = createContext<OptionsSessionContextValue | null>(null);

export function OptionsSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OptionsSessionState>(() => createOptionsSessionState());
  const [scope, setScopeState] = useState<{ symbol: string | null; expiration: string | null }>({
    symbol: null,
    expiration: null,
  });
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  const setScope = useCallback((symbol: string | null, expiration: string | null) => {
    const prev = scopeRef.current;
    const next = { symbol, expiration };
    if (shouldResetOptionsSession(prev, next)) {
      setState(createOptionsSessionState());
    }
    setScopeState(next);
  }, []);

  const setMode = useCallback((mode: OptionsPanelMode) => {
    setState((current) => ({ ...current, mode }));
  }, []);

  const patchCalculator = useCallback((patch: Partial<OptionsCalculatorState>) => {
    setState((current) => ({
      ...current,
      calculator: { ...current.calculator, ...patch },
    }));
  }, []);

  const setLegs = useCallback((updater: (prev: StrategyLegInput[]) => StrategyLegInput[]) => {
    setState((current) => ({
      ...current,
      calculator: {
        ...current.calculator,
        legs: updater(current.calculator.legs),
      },
    }));
  }, []);

  const seedFromAnalyze = useCallback(
    (contract: OptionContractSnapshot, action: "buy" | "sell" = "buy", quantity = 1) => {
      const seed: RiskCalculatorSeedLeg = { contract, action, quantity };
      setState((current) => ({
        ...current,
        mode: "calculator",
        pendingSeedLeg: seed,
      }));
    },
    [],
  );

  const clearSeed = useCallback(() => {
    setState((current) =>
      current.pendingSeedLeg ? { ...current, pendingSeedLeg: null } : current,
    );
  }, []);

  const value = useMemo(
    (): OptionsSessionContextValue => ({
      state,
      scope,
      setScope,
      setMode,
      patchCalculator,
      setLegs,
      seedFromAnalyze,
      clearSeed,
    }),
    [state, scope, setScope, setMode, patchCalculator, setLegs, seedFromAnalyze, clearSeed],
  );

  return (
    <OptionsSessionContext.Provider value={value}>{children}</OptionsSessionContext.Provider>
  );
}

export function useOptionsSession(): OptionsSessionContextValue {
  const ctx = useContext(OptionsSessionContext);
  if (!ctx) {
    throw new Error("useOptionsSession must be used within OptionsSessionProvider");
  }
  return ctx;
}

export function useOptionsSessionOptional(): OptionsSessionContextValue | null {
  return useContext(OptionsSessionContext);
}
