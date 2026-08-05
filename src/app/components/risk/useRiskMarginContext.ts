"use client";

import { useEffect, useMemo, useState } from "react";
import type { RiskDirection } from "@edge/chart-core";
import { fetchWhatIfPreview, WhatIfClientError } from "@/lib/brokerage/whatIfClient";
import type { WhatIfResult } from "@/lib/marketData/contracts/brokerage";
import {
  classifyMarginStatus,
  classifyUtilizationStatus,
  computeMaxAffordableShares,
  parseMarginSnapshot,
  resolveMarginImpact,
  type MarginImpact,
  type MarginSnapshot,
  type MarginStatus,
  type MaxAffordableShares,
} from "@/lib/risk/marginContext";
import { useAccountOptional } from "../AccountProvider";

const DEBOUNCE_MS = 400;

export type RiskMarginContextInput = {
  symbol: string | null;
  shares: number | null;
  direction: RiskDirection | null;
  notional: number | null;
  /** Entry / mark price for IBKR short price-tier estimates when what-if omits deltas. */
  entryPrice?: number | null;
  enabled: boolean;
};

export type RiskMarginContextValue = {
  accountConnected: boolean;
  current: MarginSnapshot | null;
  impact: MarginImpact | null;
  /** Health after trade (impact-driven). */
  impactStatus: MarginStatus | null;
  /** Health of current book utilization. */
  currentStatus: MarginStatus | null;
  /** Largest affordable share count for the symbol from AvailableFunds. */
  maxAffordable: MaxAffordableShares | null;
  loading: boolean;
  error: string | null;
};

export function useRiskMarginContext(input: RiskMarginContextInput): RiskMarginContextValue {
  const account = useAccountOptional();
  const [whatIf, setWhatIf] = useState<WhatIfResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountConnected =
    account != null && !account.disabled && account.connectionState === "connected";

  const current = useMemo(() => {
    if (!accountConnected) return null;
    return parseMarginSnapshot(account?.summary?.tags);
  }, [account?.summary?.tags, accountConnected]);

  const marginProbeReady =
    input.enabled && input.symbol != null && input.direction != null && accountConnected;

  const previewReady =
    marginProbeReady && input.shares != null && input.shares > 0;

  const whatIfQuantity =
    previewReady && input.shares != null && input.shares > 0 ? input.shares : 1;

  const whatIfKey = marginProbeReady
    ? `${input.symbol}:${whatIfQuantity}:${input.direction}`
    : null;

  useEffect(() => {
    if (!whatIfKey || !input.symbol || !input.direction) {
      setWhatIf(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const action = input.direction === "long" ? "BUY" : "SELL";

    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      void fetchWhatIfPreview(
        {
          symbol: input.symbol!,
          action,
          quantity: whatIfQuantity,
          orderType: "MKT",
          outsideRth: false,
        },
        {
          signal: controller.signal,
          environment: account?.tradingEnvironment ?? "paper",
        },
      )
        .then((result) => {
          if (controller.signal.aborted) return;
          setWhatIf(result);
          setError(null);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setWhatIf(null);
          setError(err instanceof WhatIfClientError ? err.message : "Preview unavailable");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    whatIfKey,
    input.symbol,
    input.direction,
    whatIfQuantity,
    account?.tradingEnvironment,
  ]);

  const impact = useMemo(() => {
    if (!current || !previewReady) return null;
    return resolveMarginImpact(current, whatIf, input.notional, {
      direction: input.direction ?? undefined,
      pricePerShare: input.entryPrice ?? undefined,
    });
  }, [
    current,
    whatIf,
    previewReady,
    input.notional,
    input.direction,
    input.entryPrice,
  ]);

  const impactStatus = useMemo(() => {
    if (!impact || !current || !previewReady) return null;
    return classifyMarginStatus(impact.initMarginChange, current.availableFunds, {
      projectedUtilization: impact.projectedUtilization,
      headroomAfter: impact.headroomAfter,
    });
  }, [impact, current, previewReady]);

  const currentStatus = useMemo(() => {
    if (!current) return null;
    return classifyUtilizationStatus(current.utilization);
  }, [current]);

  const maxAffordable = useMemo(() => {
    if (!marginProbeReady || !current) return null;

    const initMarginChange =
      impact?.initMarginChange ??
      (whatIf?.initMarginChange != null && whatIf.initMarginChange > 0
        ? whatIf.initMarginChange
        : null);

    return computeMaxAffordableShares({
      availableFunds: current.availableFunds,
      initMarginChange,
      quantity: whatIfQuantity,
      pricePerShare: input.entryPrice ?? null,
      direction: input.direction === "short" ? "short" : "long",
    });
  }, [
    marginProbeReady,
    current,
    impact?.initMarginChange,
    whatIf?.initMarginChange,
    whatIfQuantity,
    input.entryPrice,
    input.direction,
  ]);

  return {
    accountConnected,
    current,
    impact,
    impactStatus,
    currentStatus,
    maxAffordable,
    loading: marginProbeReady && loading,
    error: previewReady && error != null && impact == null ? error : null,
  };
}
