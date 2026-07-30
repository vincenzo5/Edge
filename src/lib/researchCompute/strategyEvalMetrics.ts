import type { Candle } from "@edge/chart-core";

import type {
  DatasetIdentity,
  EquityCurvePoint,
  PreviewTable,
  ResearchBar,
  SignalDirection,
  StrategyEvalSpec,
  StrategyTrade,
} from "./contracts";
import { assertSignalGraphLimits } from "./contracts";
import { MAX_PREVIEW_TABLE_ROWS } from "./constants";
import { formatNumber, formatPercent, mean, stdDev } from "./math";
import { evalSignalEvents } from "./signalStudyMetrics";

export type StrategyEvalMetrics = {
  keyMetrics: Record<string, string | number>;
  previewTable: PreviewTable;
  warnings: string[];
  trades: StrategyTrade[];
  equityCurve: EquityCurvePoint[];
};

function toCandles(bars: ResearchBar[]): Candle[] {
  return bars.map((bar) => ({
    t: bar.t,
    o: bar.o,
    h: bar.h,
    l: bar.l,
    c: bar.c,
    v: bar.v,
  }));
}

function fillPrice(
  bar: ResearchBar,
  fillTiming: StrategyEvalSpec["fillTiming"],
): number | null {
  const raw = fillTiming === "next_open" ? bar.o : bar.c;
  return Number.isFinite(raw) ? raw : null;
}


function slippageAdjust(
  price: number,
  slippageBps: number,
  direction: SignalDirection,
  isEntry: boolean,
): number {
  const factor = slippageBps / 10_000;
  if (direction === "long") {
    return isEntry ? price * (1 + factor) : price * (1 - factor);
  }
  return isEntry ? price * (1 - factor) : price * (1 + factor);
}

function feeAmount(notional: number, feesBps: number): number {
  return (notional * feesBps) / 10_000;
}

function simulateSymbolTrades(args: {
  symbol: string;
  bars: ResearchBar[];
  spec: StrategyEvalSpec;
}): StrategyTrade[] {
  const { bars, spec, symbol } = args;
  if (bars.length === 0) return [];

  const candles = toCandles(bars);
  const entryEvents = evalSignalEvents(spec.entry, candles);
  const exitEvents = evalSignalEvents(spec.exit, candles);
  const trades: StrategyTrade[] = [];
  const shares = spec.sizing.shares;

  let entryFillIndex: number | null = null;
  let entryPx = 0;
  let entryT = 0;

  for (let barIndex = 0; barIndex < bars.length; barIndex += 1) {
    if (entryFillIndex == null) {
      if (!entryEvents[barIndex]) continue;
      const fillIndex = barIndex + spec.entryLagBars;
      if (fillIndex >= bars.length) continue;
      const bar = bars[fillIndex]!;
      const rawPx = fillPrice(bar, spec.fillTiming);
      if (rawPx == null) continue;
      entryFillIndex = fillIndex;
      entryPx = slippageAdjust(rawPx, spec.slippageBps, spec.direction, true);
      entryT = bar.t;
      continue;
    }

    const barsHeld = barIndex - entryFillIndex + 1;
    const exitSignal = exitEvents[barIndex] === true;
    const maxHoldReached = barsHeld >= spec.maxHoldBars;

    if (!exitSignal && !maxHoldReached) continue;

    let exitFillIndex = maxHoldReached && !exitSignal
      ? entryFillIndex + spec.maxHoldBars - 1
      : barIndex + spec.entryLagBars;

    if (exitFillIndex >= bars.length) {
      exitFillIndex = bars.length - 1;
    }
    if (exitFillIndex <= entryFillIndex) {
      exitFillIndex = Math.min(entryFillIndex + 1, bars.length - 1);
    }

    const exitBar = bars[exitFillIndex]!;
    const rawExitPx = fillPrice(exitBar, spec.fillTiming);
    if (rawExitPx == null) {
      entryFillIndex = null;
      continue;
    }

    const exitPx = slippageAdjust(rawExitPx, spec.slippageBps, spec.direction, false);
    const entryNotional = entryPx * shares;
    const exitNotional = exitPx * shares;
    const entryFee = feeAmount(entryNotional, spec.feesBps);
    const exitFee = feeAmount(exitNotional, spec.feesBps);
    const feesPaid = entryFee + exitFee;

    const grossPnl =
      spec.direction === "long"
        ? (exitPx - entryPx) * shares
        : (entryPx - exitPx) * shares;
    const pnl = grossPnl - feesPaid;
    const returnPct = entryNotional > 0 ? pnl / entryNotional : 0;

    trades.push({
      symbol,
      entryT,
      exitT: exitBar.t,
      side: spec.direction,
      shares,
      entryPx,
      exitPx,
      pnl,
      returnPct,
      holdBars: exitFillIndex - entryFillIndex,
      feesPaid,
    });

    entryFillIndex = null;
    barIndex = exitFillIndex;
  }

  if (entryFillIndex != null && bars.length > 0) {
    const exitFillIndex = bars.length - 1;
    const exitBar = bars[exitFillIndex]!;
    const rawExitPx = fillPrice(exitBar, spec.fillTiming);
    if (rawExitPx != null && exitFillIndex > entryFillIndex) {
      const exitPx = slippageAdjust(rawExitPx, spec.slippageBps, spec.direction, false);
      const entryNotional = entryPx * shares;
      const exitNotional = exitPx * shares;
      const entryFee = feeAmount(entryNotional, spec.feesBps);
      const exitFee = feeAmount(exitNotional, spec.feesBps);
      const feesPaid = entryFee + exitFee;
      const grossPnl =
        spec.direction === "long"
          ? (exitPx - entryPx) * shares
          : (entryPx - exitPx) * shares;
      const pnl = grossPnl - feesPaid;
      trades.push({
        symbol,
        entryT,
        exitT: exitBar.t,
        side: spec.direction,
        shares,
        entryPx,
        exitPx,
        pnl,
        returnPct: entryNotional > 0 ? pnl / entryNotional : 0,
        holdBars: exitFillIndex - entryFillIndex,
        feesPaid,
      });
    }
  }

  return trades;
}

function buildEquityCurve(
  trades: StrategyTrade[],
  startingEquity: number,
): EquityCurvePoint[] {
  const sorted = [...trades].sort((a, b) => a.exitT - b.exitT);
  const curve: EquityCurvePoint[] = [{ t: sorted[0]?.entryT ?? 0, equity: startingEquity }];
  let equity = startingEquity;
  for (const trade of sorted) {
    equity += trade.pnl;
    curve.push({ t: trade.exitT, equity });
  }
  return curve;
}

function maxDrawdownFromEquity(curve: EquityCurvePoint[]): number {
  if (curve.length < 2) return 0;
  let peak = curve[0]!.equity;
  let maxDd = 0;
  for (const point of curve) {
    peak = Math.max(peak, point.equity);
    const dd = peak > 0 ? (peak - point.equity) / peak : 0;
    maxDd = Math.max(maxDd, dd);
  }
  return maxDd;
}

function computeExposurePct(
  trades: StrategyTrade[],
  barsBySymbol: Record<string, ResearchBar[]>,
): number {
  let totalBars = 0;
  let inMarketBars = 0;
  for (const symbol of Object.keys(barsBySymbol)) {
    const bars = barsBySymbol[symbol] ?? [];
    totalBars += bars.length;
    for (const trade of trades.filter((t) => t.symbol === symbol)) {
      const entryIdx = bars.findIndex((b) => b.t === trade.entryT);
      const exitIdx = bars.findIndex((b) => b.t === trade.exitT);
      if (entryIdx >= 0 && exitIdx >= entryIdx) {
        inMarketBars += exitIdx - entryIdx + 1;
      }
    }
  }
  return totalBars > 0 ? inMarketBars / totalBars : 0;
}

export function computeStrategyEvalMetrics(args: {
  barsBySymbol: Record<string, ResearchBar[]>;
  spec: StrategyEvalSpec;
  datasetIdentity?: DatasetIdentity;
}): StrategyEvalMetrics {
  const warnings: string[] = [];
  const spec = args.spec;

  assertSignalGraphLimits(spec.entry);
  assertSignalGraphLimits(spec.exit);

  if (spec.entryLagBars < 1) {
    warnings.push("entryLagBars must be ≥ 1 to avoid same-bar look-ahead");
  }
  if (spec.feesBps === 0 && spec.slippageBps === 0) {
    warnings.push("Zero fees and slippage — metrics are pre-cost; add costs for realistic evaluation");
  }

  const symbolCount = Object.keys(args.barsBySymbol).length;
  if (symbolCount > 1) {
    warnings.push(
      "Multi-symbol evaluation runs independent per-symbol simulations — not a portfolio net",
    );
  }

  if (args.datasetIdentity) {
    warnings.push(
      `Dataset provenance: provider=${args.datasetIdentity.provider}, adjustment=${args.datasetIdentity.adjustment}, timezone=${args.datasetIdentity.timezone} — check survivorship / universe bias`,
    );
  }

  warnings.push("Vectorized research — not broker-accurate event-driven simulation");

  const allTrades: StrategyTrade[] = [];
  for (const symbol of Object.keys(args.barsBySymbol).sort()) {
    const bars = args.barsBySymbol[symbol] ?? [];
    if (bars.length === 0) continue;
    allTrades.push(...simulateSymbolTrades({ symbol, bars, spec }));
  }

  if (allTrades.length === 0) {
    warnings.push("No trades generated — check entry/exit signals or warm-up period");
  } else if (
    allTrades.some((trade) => trade.exitT === Object.values(args.barsBySymbol).flat().at(-1)?.t)
  ) {
    warnings.push("One or more trades closed at dataset end — results may be incomplete");
  }

  const startingEquity = spec.startingEquity;
  const equityCurve = buildEquityCurve(allTrades, startingEquity);
  const netPnl = allTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  const feesPaid = allTrades.reduce((sum, trade) => sum + trade.feesPaid, 0);
  const wins = allTrades.filter((trade) => trade.pnl > 0).length;
  const winRate = allTrades.length > 0 ? wins / allTrades.length : 0;
  const totalReturn = startingEquity > 0 ? netPnl / startingEquity : 0;
  const maxDrawdown = maxDrawdownFromEquity(equityCurve);
  const avgHoldBars =
    allTrades.length > 0 ? mean(allTrades.map((trade) => trade.holdBars)) : 0;
  const exposurePct = computeExposurePct(allTrades, args.barsBySymbol);
  const turnoverNotional = allTrades.reduce(
    (sum, trade) => sum + trade.entryPx * trade.shares + trade.exitPx * trade.shares,
    0,
  );
  const turnover = startingEquity > 0 ? turnoverNotional / startingEquity : 0;

  const barReturns: number[] = [];
  for (let index = 1; index < equityCurve.length; index += 1) {
    const prev = equityCurve[index - 1]!.equity;
    const curr = equityCurve[index]!.equity;
    if (prev > 0) barReturns.push((curr - prev) / prev);
  }
  const sharpe =
    barReturns.length >= 2 && stdDev(barReturns) > 0
      ? (mean(barReturns) / stdDev(barReturns)) * Math.sqrt(252)
      : 0;

  const keyMetrics: Record<string, string | number> = {
    "Trade count": allTrades.length,
    "Win rate": formatPercent(winRate),
    "Total return": formatPercent(totalReturn),
    "Max drawdown": formatPercent(maxDrawdown),
    "Avg hold bars": formatNumber(avgHoldBars, 1),
    "Exposure %": formatPercent(exposurePct),
    Turnover: formatNumber(turnover, 2),
    "Net PnL": formatNumber(netPnl, 2),
    "Fees paid": formatNumber(feesPaid, 2),
    Sharpe: formatNumber(sharpe, 2),
    Direction: spec.direction,
    "Fill timing": spec.fillTiming,
    "Fees bps": spec.feesBps,
    "Slippage bps": spec.slippageBps,
  };

  const previewRows: PreviewTable["rows"] = allTrades.slice(0, MAX_PREVIEW_TABLE_ROWS).map(
    (trade) => [
      trade.symbol,
      trade.side,
      trade.entryT,
      trade.exitT,
      formatNumber(trade.entryPx, 2),
      formatNumber(trade.exitPx, 2),
      formatNumber(trade.pnl, 2),
      formatPercent(trade.returnPct),
      trade.holdBars,
    ],
  );

  return {
    keyMetrics,
    previewTable: {
      columns: [
        "Symbol",
        "Side",
        "Entry T",
        "Exit T",
        "Entry px",
        "Exit px",
        "PnL",
        "Return",
        "Hold bars",
      ],
      rows: previewRows,
    },
    warnings,
    trades: allTrades,
    equityCurve,
  };
}
