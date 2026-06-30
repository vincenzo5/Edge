"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useActiveChart } from "../ActiveChartContext";
import { useMarketDataQuotesForSymbols } from "../MarketDataProvider";
import { useRegisterOptionsHealthMeta } from "../data-health";
import {
  fetchOptionExpirations,
  fetchOptionsChain,
  groupContractsByStrike,
  type OptionsDataMeta,
  type StrikeRow,
} from "@/lib/options/optionsClient";
import {
  isExpirationPinned,
  pinExpirationDrawing,
} from "@/lib/options/pinExpirationDrawing";
import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import {
  addRiskRulerPreset,
  getOptionPresetSelectionStatus,
  type RiskRulerPresetInput,
} from "@/lib/risk/createRiskRulerPreset";
import { OPTION_SETUP_TYPES, type OptionSetupType } from "@edge/chart-core";

export type OptionsChainModel = {
  snapshot: ReturnType<typeof useActiveChart>;
  symbol: string | null;
  spotPrice: number | null;
  expirations: string[];
  expMeta: OptionsDataMeta | undefined;
  expLoading: boolean;
  expError: string | null;
  primaryExpiration: string | null;
  chainMeta: OptionsDataMeta | undefined;
  chainLoading: boolean;
  chainError: string | null;
  contracts: StrikeRow[];
  chainContracts: OptionContractSnapshot[];
  chainMode: "atm" | "full";
  pinnedExpirations: string[];
  presetStatuses: Record<
    OptionSetupType,
    ReturnType<typeof getOptionPresetSelectionStatus>
  > | null;
  selectExpiration: (expiration: string) => void;
  loadAllStrikes: () => void;
  pinExpiration: (expiration: string) => void;
  addRiskRulerPreset: (setupType: OptionSetupType) => void;
  isExpirationPinned: (expiration: string) => boolean;
};

export function useOptionsChainModel(): OptionsChainModel {
  const snapshot = useActiveChart();
  const symbol = snapshot?.config.symbol ?? null;
  const marketQuotes = useMarketDataQuotesForSymbols(symbol ? [symbol] : []);

  const [expirations, setExpirations] = useState<string[]>([]);
  const [expMeta, setExpMeta] = useState<OptionsDataMeta | undefined>();
  const [expLoading, setExpLoading] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);

  const [primaryExpiration, setPrimaryExpiration] = useState<string | null>(null);
  const [chainMeta, setChainMeta] = useState<OptionsDataMeta | undefined>();
  const [chainLoading, setChainLoading] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);
  const [contracts, setContracts] = useState<StrikeRow[]>([]);
  const [chainContracts, setChainContracts] = useState<OptionContractSnapshot[]>([]);
  const [chainMode, setChainMode] = useState<"atm" | "full">("atm");

  const spotPrice = useMemo(() => {
    const candles = snapshot?.dataWindow.candles ?? [];
    const last = candles[candles.length - 1];
    if (last?.c != null) return last.c;
    const quote = marketQuotes.quotes[0];
    return quote?.regularMarketPrice ?? null;
  }, [snapshot?.dataWindow.candles, marketQuotes.quotes]);

  const spotAnchor = useMemo(() => {
    const candles = snapshot?.dataWindow.candles ?? [];
    const lastIndex = candles.length - 1;
    const last = candles[lastIndex];
    if (!last) return null;
    return {
      timestamp: last.t,
      dataIndex: lastIndex,
    };
  }, [snapshot?.dataWindow.candles]);

  const optionsHealthMeta = useMemo(() => {
    if (chainMeta?.source) return chainMeta;
    if (expMeta?.source) return expMeta;
    return null;
  }, [chainMeta, expMeta]);

  const optionsHealthDetail = symbol
    ? `${symbol}${expirations.length ? ` · ${expirations.length} expirations` : ""}`
    : undefined;

  useRegisterOptionsHealthMeta(optionsHealthMeta, optionsHealthDetail);

  useEffect(() => {
    if (!symbol) {
      setExpirations([]);
      setExpMeta(undefined);
      setPrimaryExpiration(null);
      setContracts([]);
      setChainContracts([]);
      return;
    }

    let cancelled = false;
    setExpLoading(true);
    setExpError(null);
    setPrimaryExpiration(null);
    setContracts([]);
    setChainContracts([]);
    setChainMode("atm");

    fetchOptionExpirations(symbol)
      .then((result) => {
        if (cancelled) return;
        const dates = result.expirations.map((row) => row.expiration);
        setExpirations(dates);
        setExpMeta(result.meta);
        if (dates.length > 0) setPrimaryExpiration(dates[0] ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setExpirations([]);
        setExpError(err instanceof Error ? err.message : "Failed to load expirations");
      })
      .finally(() => {
        if (!cancelled) setExpLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    if (!symbol || !primaryExpiration) {
      setContracts([]);
      setChainContracts([]);
      return;
    }

    let cancelled = false;
    setChainLoading(true);
    setChainError(null);

    fetchOptionsChain(symbol, primaryExpiration, {
      strikeWindow:
        chainMode === "full"
          ? { mode: "full" }
          : { mode: "atm", count: 20, spot: spotPrice ?? undefined },
    })
      .then((result) => {
        if (cancelled) return;
        setContracts(groupContractsByStrike(result.chain.contracts));
        setChainContracts(result.chain.contracts);
        setChainMeta(result.meta);
      })
      .catch((err) => {
        if (cancelled) return;
        setContracts([]);
        setChainContracts([]);
        setChainError(err instanceof Error ? err.message : "Failed to load chain");
      })
      .finally(() => {
        if (!cancelled) setChainLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, primaryExpiration, chainMode, spotPrice]);

  const pinnedExpirations = useMemo(() => {
    const drawings = snapshot?.config.drawings ?? [];
    return expirations.filter((exp) => isExpirationPinned(drawings, exp));
  }, [expirations, snapshot?.config.drawings]);

  const checkExpirationPinned = useCallback(
    (expiration: string) =>
      isExpirationPinned(snapshot?.config.drawings ?? [], expiration),
    [snapshot?.config.drawings],
  );

  const handlePinExpiration = useCallback(
    (expiration: string) => {
      if (!snapshot || !symbol) return;
      const nextDrawings = pinExpirationDrawing(
        snapshot.config.drawings ?? [],
        expiration,
        symbol,
      );
      snapshot.onConfigChange({ ...snapshot.config, drawings: nextDrawings });
      snapshot.chartCommands.restoreDrawings(nextDrawings);
    },
    [snapshot, symbol],
  );

  const presetStatuses = useMemo(() => {
    if (spotPrice == null) return null;
    return Object.fromEntries(
      OPTION_SETUP_TYPES.map((setupType) => [
        setupType,
        getOptionPresetSelectionStatus(setupType, chainContracts, spotPrice),
      ]),
    ) as Record<
      OptionSetupType,
      ReturnType<typeof getOptionPresetSelectionStatus>
    >;
  }, [chainContracts, spotPrice]);

  const handleRiskRulerPreset = useCallback(
    (setupType: OptionSetupType) => {
      if (!snapshot || !symbol || spotPrice == null) return;
      const status = presetStatuses?.[setupType];
      if (chainContracts.length > 0 && status && !status.ok) return;
      const input: RiskRulerPresetInput = {
        setupType,
        spotPrice,
        symbol,
        expiration: primaryExpiration ?? undefined,
        timestamp: spotAnchor?.timestamp,
        dataIndex: spotAnchor?.dataIndex,
        contracts: chainContracts.length > 0 ? chainContracts : undefined,
      };
      const nextDrawings = addRiskRulerPreset(snapshot.config.drawings ?? [], input);
      snapshot.onConfigChange({ ...snapshot.config, drawings: nextDrawings });
      snapshot.chartCommands.restoreDrawings(nextDrawings);
    },
    [
      snapshot,
      symbol,
      spotPrice,
      primaryExpiration,
      spotAnchor,
      chainContracts,
      presetStatuses,
    ],
  );

  const loadAllStrikes = useCallback(() => {
    setChainMode("full");
  }, []);

  const selectExpiration = useCallback((expiration: string) => {
    setContracts([]);
    setChainContracts([]);
    setChainMeta(undefined);
    setChainError(null);
    setChainMode("atm");
    setPrimaryExpiration(expiration);
  }, []);

  return {
    snapshot,
    symbol,
    spotPrice,
    expirations,
    expMeta,
    expLoading,
    expError,
    primaryExpiration,
    chainMeta,
    chainLoading,
    chainError,
    contracts,
    chainContracts,
    chainMode,
    pinnedExpirations,
    presetStatuses,
    selectExpiration,
    loadAllStrikes,
    pinExpiration: handlePinExpiration,
    addRiskRulerPreset: handleRiskRulerPreset,
    isExpirationPinned: checkExpirationPinned,
  };
}
