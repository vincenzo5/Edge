"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RiskAccount } from "@edge/chart-core";
import { useAccountOptional } from "./AccountProvider";
import {
  DEFAULT_RISK_SETTINGS,
  loadRiskSettingsFromStorage,
  resolveAccountBasisValue,
  resolveDollarRisk,
  saveRiskSettingsToStorage,
  toRiskAccount,
  type RiskSettings,
} from "@/lib/risk/riskSettings";

export type RiskSettingsContextValue = {
  settings: RiskSettings;
  dollarRisk: number | null;
  /** Last resolved dollar risk when basis goes stale (percent mode). */
  lastDollarRisk: number | null;
  accountBasisValue: number | null;
  basisStale: boolean;
  riskAccount: RiskAccount;
  updateSettings: (patch: Partial<RiskSettings>) => void;
  resetSettings: () => void;
};

const RiskSettingsContext = createContext<RiskSettingsContextValue | null>(null);

export function RiskSettingsProvider({ children }: { children: ReactNode }) {
  const account = useAccountOptional();
  const [settings, setSettings] = useState<RiskSettings>(DEFAULT_RISK_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const lastDollarRiskRef = useRef<number | null>(null);

  useEffect(() => {
    setSettings(loadRiskSettingsFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveRiskSettingsToStorage(settings);
  }, [settings, hydrated]);

  const updateSettings = useCallback((patch: Partial<RiskSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_RISK_SETTINGS);
  }, []);

  const accountSummary = account?.summary ?? null;
  const accountConnected = account?.connectionState === "connected";

  const value = useMemo<RiskSettingsContextValue>(() => {
    const accountBasisValue = resolveAccountBasisValue(settings, accountSummary);
    const basisStale =
      settings.accountBasis !== "Manual" &&
      (!accountConnected || accountBasisValue == null);
    const resolved = resolveDollarRisk(settings, accountSummary);
    if (resolved != null) {
      lastDollarRiskRef.current = resolved;
    }
    const lastDollarRisk = lastDollarRiskRef.current;
    const dollarRisk = resolved ?? (basisStale ? lastDollarRisk : null);

    return {
      settings,
      accountBasisValue,
      basisStale,
      dollarRisk,
      lastDollarRisk,
      riskAccount: toRiskAccount(settings, accountSummary),
      updateSettings,
      resetSettings,
    };
  }, [
    settings,
    accountSummary,
    accountConnected,
    updateSettings,
    resetSettings,
  ]);

  return (
    <RiskSettingsContext.Provider value={value}>{children}</RiskSettingsContext.Provider>
  );
}

export function useRiskSettings(): RiskSettingsContextValue {
  const ctx = useContext(RiskSettingsContext);
  if (!ctx) {
    throw new Error("useRiskSettings must be used within RiskSettingsProvider");
  }
  return ctx;
}

export function useRiskSettingsOptional(): RiskSettingsContextValue | null {
  return useContext(RiskSettingsContext);
}
