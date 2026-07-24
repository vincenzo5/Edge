import "server-only";

import type { QuoteSnapshot } from "@/lib/watchlist/types";
import type { EquityCandle } from "@/lib/marketData/contracts/equities";
import { getServerMarketDataService } from "@/lib/marketData/service/server";
import {
  alertRequiresQuotes,
  normalizeAlertConditions,
} from "@/lib/alerts/alertConditions";
import {
  defaultAlertMessage,
  evaluateCombinedAlertDefinition,
  isAlertInCooldown,
} from "@/lib/alerts/evaluateAlerts";
import { minCandlesForIndicatorCondition } from "@/lib/alerts/indicatorAlertEval";
import { chunkSymbols, resolveAlertSymbols } from "@/lib/alerts/resolveAlertSymbols";
import { emitNotification } from "@/lib/notifications/emitNotification";
import { buildWorkspaceDeepLink } from "@/lib/appWorkspace/deepLinks";
import {
  createAlertTriggerEvent,
  expireAlertsPastDue,
  listActiveAlertDefinitions,
  updateAlertDefinitionById,
} from "@/lib/persistence/repositories/alertRepository";
import type {
  AlertCondition,
  AlertDefinitionResponse,
  AlertIndicatorInterval,
  AlertSymbolState,
} from "@/lib/persistence/schemas/alerts";

export type AlertEvaluationResult = {
  evaluated: number;
  triggered: number;
  skippedStale: boolean;
  symbols: string[];
};

function quotePrice(quote: QuoteSnapshot): number | null {
  if (quote.regularMarketPrice == null || !Number.isFinite(quote.regularMarketPrice)) return null;
  return quote.regularMarketPrice;
}

function indicatorIntervals(conditions: AlertCondition[]): AlertIndicatorInterval[] {
  const intervals = new Set<AlertIndicatorInterval>();
  for (const condition of conditions) {
    if (condition.kind === "indicator_level" || condition.kind === "indicator_cross") {
      intervals.add(condition.interval);
    }
  }
  return [...intervals];
}

function rangeForAlertInterval(interval: AlertIndicatorInterval): "3mo" | "1y" {
  return interval === "1wk" || interval === "1d" ? "1y" : "3mo";
}

async function fetchCandlesForSymbolInterval(
  symbol: string,
  interval: AlertIndicatorInterval,
  minBars: number,
): Promise<EquityCandle[] | null> {
  const service = getServerMarketDataService();
  const result = await service.getCandles({
    symbol,
    interval,
    range: rangeForAlertInterval(interval),
  });
  if (result.stale || result.data.candles.length < minBars) return null;
  return result.data.candles as EquityCandle[];
}

async function buildCandlesByInterval(
  symbol: string,
  conditions: AlertCondition[],
): Promise<Map<string, EquityCandle[]>> {
  const map = new Map<string, EquityCandle[]>();
  for (const interval of indicatorIntervals(conditions)) {
    const minBars = Math.max(
      ...conditions
        .filter(
          (condition): condition is Extract<
            AlertCondition,
            { kind: "indicator_level" } | { kind: "indicator_cross" }
          > =>
            (condition.kind === "indicator_level" || condition.kind === "indicator_cross") &&
            condition.interval === interval,
        )
        .map((condition) => minCandlesForIndicatorCondition(condition)),
      1,
    );
    const candles = await fetchCandlesForSymbolInterval(symbol, interval, minBars);
    if (candles) map.set(interval, candles);
  }
  return map;
}

function mergeSymbolState(
  current: AlertSymbolState | null | undefined,
  symbol: string,
  entry: AlertSymbolState[string],
  firedAt?: string,
): AlertSymbolState {
  return {
    ...(current ?? {}),
    [symbol]: {
      ...entry,
      ...(firedAt ? { lastFiredAt: firedAt } : {}),
    },
  };
}

function resolveTriggerPrice(
  alert: AlertDefinitionResponse,
  symbol: string,
  quotePriceValue: number | null,
): number {
  const priceLeg = normalizeAlertConditions(alert).find((condition) => condition.kind === "price");
  if (priceLeg?.kind === "price") return priceLeg.price;
  const entry = alert.symbolState?.[symbol];
  if (entry?.lastSeriesA != null && Number.isFinite(entry.lastSeriesA)) return entry.lastSeriesA;
  return quotePriceValue ?? alert.price;
}

export async function runAlertEvaluation(): Promise<AlertEvaluationResult> {
  await expireAlertsPastDue();
  const activeAlerts = await listActiveAlertDefinitions();
  if (activeAlerts.length === 0) {
    return { evaluated: 0, triggered: 0, skippedStale: false, symbols: [] };
  }

  const symbolScopes = await Promise.all(
    activeAlerts.map(async (alert) => ({
      alert,
      scope: await resolveAlertSymbols({
        userId: alert.userId,
        symbol: alert.symbol,
        watchlistId: alert.watchlistId,
      }),
    })),
  );

  const quoteSymbols = [
    ...new Set(
      symbolScopes.flatMap(({ alert, scope }) => {
        if (scope.skippedReason) return [];
        const conditions = normalizeAlertConditions(alert);
        if (!alertRequiresQuotes(conditions)) return [];
        return scope.symbols;
      }),
    ),
  ];

  const service = getServerMarketDataService();
  const quoteBySymbol = new Map<string, number>();

  if (quoteSymbols.length > 0) {
    for (const chunk of chunkSymbols(quoteSymbols)) {
      const quoteResult = await service.getWatchlistQuotes(chunk);
      if (quoteResult.stale) {
        return {
          evaluated: activeAlerts.length,
          triggered: 0,
          skippedStale: true,
          symbols: quoteSymbols,
        };
      }
      for (const quote of quoteResult.data) {
        const price = quotePrice(quote);
        if (price != null) quoteBySymbol.set(quote.symbol, price);
      }
    }
  }

  let triggered = 0;
  const firedAt = new Date().toISOString();
  const nowMs = Date.now();

  for (const { alert, scope } of symbolScopes) {
    if (scope.skippedReason) continue;

    const conditions = normalizeAlertConditions(alert);
    let symbolState = alert.symbolState ?? {};

    for (const symbol of scope.symbols) {
      const quote = alertRequiresQuotes(conditions) ? (quoteBySymbol.get(symbol) ?? null) : null;
      if (alertRequiresQuotes(conditions) && quote == null) continue;

      const candlesByInterval = await buildCandlesByInterval(symbol, conditions);
      const evaluation = evaluateCombinedAlertDefinition({
        alert,
        symbol,
        quotePrice: quote,
        candlesByInterval,
        symbolState,
        nowMs,
      });

      symbolState = mergeSymbolState(symbolState, symbol, evaluation.nextSymbolStateEntry);

      const trendlinePriceUpdate =
        symbol === scope.symbols[0] ? evaluation.trendlinePriceUpdate : undefined;

      await updateAlertDefinitionById(alert.id, {
        lastPrice: quote ?? alert.lastPrice,
        symbolState,
        ...(trendlinePriceUpdate ? { price: trendlinePriceUpdate.price } : {}),
      });

      if (!evaluation.shouldFire) continue;

      const entry = evaluation.nextSymbolStateEntry;
      const lastFiredAt = entry.lastFiredAt ?? alert.lastFiredAt;
      if (isAlertInCooldown(lastFiredAt, alert.cooldownMs, nowMs)) continue;

      const triggerPrice = resolveTriggerPrice(alert, symbol, quote);
      const message =
        alert.message?.trim() ||
        defaultAlertMessage({
          symbol,
          operator: alert.operator,
          price: triggerPrice,
          priceHigh: alert.priceHigh,
          drawingKind: alert.drawingKind,
          alert,
        });

      const notification = await emitNotification({
        userId: alert.userId,
        source: "alert",
        title: message,
        body: quote != null ? `Triggered at ${quote.toFixed(2)}` : "Indicator condition met",
        href: buildWorkspaceDeepLink({ surface: "alerts", selectedAlertId: alert.id }),
        dedupeKey: `alert:${alert.id}:${symbol}:${Math.floor(nowMs / alert.cooldownMs)}`,
      });

      await createAlertTriggerEvent({
        userId: alert.userId,
        alertId: alert.id,
        symbol,
        operator: alert.operator,
        triggerPrice,
        quotePrice: quote ?? triggerPrice,
        notificationId: notification?.id ?? null,
      });

      symbolState = mergeSymbolState(symbolState, symbol, entry, firedAt);
      const nextStatus = alert.recurrence === "once" ? "triggered" : "active";
      await updateAlertDefinitionById(alert.id, {
        lastFiredAt: firedAt,
        status: nextStatus,
        symbolState,
      });

      triggered += 1;

      if (alert.recurrence === "once") break;
    }
  }

  const allSymbols = [
    ...new Set(symbolScopes.flatMap(({ scope }) => scope.symbols)),
  ];

  return {
    evaluated: activeAlerts.length,
    triggered,
    skippedStale: false,
    symbols: allSymbols,
  };
}
