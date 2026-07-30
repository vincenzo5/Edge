import type { Interval } from "@edge/chart-core";

import type { PreviewTable, ProfileOptions, ResearchBar } from "./contracts";
import { MAX_PREVIEW_TABLE_ROWS } from "./constants";
import {
  formatNumber,
  formatPercent,
  intervalStepMs,
  mean,
  pearsonCorrelation,
  stdDev,
} from "./math";

export type ProfileMetrics = {
  keyMetrics: Record<string, string | number>;
  previewTable: PreviewTable;
  warnings: string[];
};

function closeReturns(bars: ResearchBar[]): number[] {
  const returns: number[] = [];
  for (let index = 1; index < bars.length; index += 1) {
    const prev = bars[index - 1]!.c;
    const current = bars[index]!.c;
    if (prev === 0) continue;
    returns.push((current - prev) / prev);
  }
  return returns;
}

function missingBarRate(bars: ResearchBar[], interval: Interval): number {
  if (bars.length < 2) return 0;
  const step = intervalStepMs(interval);
  let gaps = 0;
  let expected = 0;
  for (let index = 1; index < bars.length; index += 1) {
    const delta = bars[index]!.t - bars[index - 1]!.t;
    if (delta <= step) continue;
    expected += Math.floor(delta / step) - 1;
    gaps += Math.floor(delta / step) - 1;
  }
  if (expected <= 0) return 0;
  return gaps / expected;
}

function rollingVolatility(returns: number[], window: number): number {
  if (returns.length < window) return 0;
  const slice = returns.slice(-window);
  return stdDev(slice);
}

export function computeProfileMetrics(args: {
  barsBySymbol: Record<string, ResearchBar[]>;
  interval: Interval;
  options?: ProfileOptions;
}): ProfileMetrics {
  const warnings: string[] = [];
  const symbols = Object.keys(args.barsBySymbol).sort();
  const rollingWindow = args.options?.rollingWindow ?? 20;
  const correlationMaxSymbols = args.options?.correlationMaxSymbols ?? 10;

  let totalBars = 0;
  let totalMissingRate = 0;
  const previewRows: PreviewTable["rows"] = [];

  for (const symbol of symbols) {
    const bars = args.barsBySymbol[symbol] ?? [];
    totalBars += bars.length;
    const missingRate = missingBarRate(bars, args.interval);
    totalMissingRate += missingRate;
    const closes = bars.map((bar) => bar.c);
    const volumes = bars.map((bar) => bar.v ?? 0);
    const returns = closeReturns(bars);

    previewRows.push([
      symbol,
      bars.length,
      formatPercent(missingRate),
      formatNumber(mean(closes)),
      formatNumber(stdDev(closes)),
      formatNumber(mean(volumes)),
      formatPercent(rollingVolatility(returns, rollingWindow)),
    ]);
  }

  const keyMetrics: Record<string, string | number> = {
    Symbols: symbols.length,
    "Total bars": totalBars,
    Interval: args.interval,
    "Avg missing-bar rate": formatPercent(symbols.length ? totalMissingRate / symbols.length : 0),
    "Rolling window": rollingWindow,
  };

  const correlationSymbols = symbols.slice(0, correlationMaxSymbols);
  if (symbols.length > correlationMaxSymbols) {
    warnings.push(
      `Correlation matrix capped at ${correlationMaxSymbols} symbols (${symbols.length} requested).`,
    );
  }

  if (correlationSymbols.length >= 2) {
    const returnSeries = correlationSymbols.map(
      (symbol) => closeReturns(args.barsBySymbol[symbol] ?? []),
    );
    let strongestPair = "";
    let strongestValue = 0;
    for (let left = 0; left < correlationSymbols.length; left += 1) {
      for (let right = left + 1; right < correlationSymbols.length; right += 1) {
        const correlation = pearsonCorrelation(returnSeries[left]!, returnSeries[right]!);
        if (Math.abs(correlation) >= Math.abs(strongestValue)) {
          strongestValue = correlation;
          strongestPair = `${correlationSymbols[left]}/${correlationSymbols[right]}`;
        }
      }
    }
    if (strongestPair) {
      keyMetrics["Strongest return correlation"] = `${strongestPair} ${formatNumber(strongestValue)}`;
    }
  }

  return {
    keyMetrics,
    previewTable: {
      columns: ["Symbol", "Bars", "Missing", "Mean close", "Close σ", "Mean vol", "Rolling vol"],
      rows: previewRows.slice(0, MAX_PREVIEW_TABLE_ROWS),
    },
    warnings,
  };
}
