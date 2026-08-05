import {
  ALL_POLICY_IDS,
  POLICY_LEVERS,
  POLICY_NAMES,
  REPLAY_NOTE,
  SIMULATED_POLICY_IDS,
} from "./policyCatalog";
import { simulatePolicy } from "./simulatePolicy";
import { buildClosePath } from "./buildClosePath";
import { resolveRUnit } from "./resolveRUnit";
import type {
  DailyBar,
  JournalTradeForReplay,
  PolicyId,
  PolicyReplayPayload,
  RankedScoreboardRow,
  ReplayTradeRow,
  ScoreboardRow,
  TradeDirection,
} from "./types";

export function computeScoreboard(realizedRs: number[]): ScoreboardRow | null {
  if (realizedRs.length === 0) return null;
  const wins = realizedRs.filter((r) => r > 0);
  const losses = realizedRs.filter((r) => r < 0);
  const grossWin = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
  const net = realizedRs.reduce((a, b) => a + b, 0);

  let equity = 0;
  let peak = 0;
  let maxDd = 0;
  for (const r of realizedRs) {
    equity += r;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, peak - equity);
  }

  return {
    n: realizedRs.length,
    netR: round2(net),
    winRate: round1((wins.length / realizedRs.length) * 100),
    wins: wins.length,
    losses: losses.length,
    avgWin: wins.length ? round2(grossWin / wins.length) : 0,
    avgLoss: losses.length ? round2(grossLoss / losses.length) : 0,
    profitFactor:
      grossLoss > 0 ? round2(grossWin / grossLoss) : grossWin > 0 ? null : 0,
    expectancy: round2(net / realizedRs.length),
    maxDdR: round2(maxDd),
  };
}

export function rankScoreboard(
  board: Record<PolicyId, ScoreboardRow>,
): RankedScoreboardRow[] {
  return ALL_POLICY_IDS.map((id) => ({
    id,
    name: POLICY_NAMES[id],
    ...board[id],
  })).sort((a, b) => b.netR - a.netR);
}

export function buildScoreboards(trades: ReplayTradeRow[]): {
  scoreboard: Record<PolicyId, ScoreboardRow>;
  scoreboardLong: Record<PolicyId, ScoreboardRow>;
  scoreboardShort: Record<PolicyId, ScoreboardRow>;
} {
  const longs = trades.filter((t) => t.direction === "long");
  const shorts = trades.filter((t) => t.direction === "short");

  const scoreboard = boardFromTrades(trades);
  const scoreboardLong = boardFromTrades(longs);
  const scoreboardShort = boardFromTrades(shorts);
  return { scoreboard, scoreboardLong, scoreboardShort };
}

function boardFromTrades(trades: ReplayTradeRow[]): Record<PolicyId, ScoreboardRow> {
  const out = {} as Record<PolicyId, ScoreboardRow>;
  for (const id of ALL_POLICY_IDS) {
    const rs = trades.map((t) => t.results[id].r);
    out[id] = computeScoreboard(rs) ?? emptyScoreboard();
  }
  return out;
}

function emptyScoreboard(): ScoreboardRow {
  return {
    n: 0,
    netR: 0,
    winRate: 0,
    wins: 0,
    losses: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    expectancy: 0,
    maxDdR: 0,
  };
}

export function replayTrade(args: {
  trade: JournalTradeForReplay;
  bars: DailyBar[];
}): ReplayTradeRow | null {
  const { trade, bars } = args;
  const openedAtMs = Date.parse(trade.openedAt);
  const closedAtMs = Date.parse(trade.closedAt);
  if (!Number.isFinite(openedAtMs) || !Number.isFinite(closedAtMs)) return null;

  const rUnit = resolveRUnit({
    plannedRiskUsd: trade.plannedRiskUsd,
    openQty: trade.openQty,
    bars,
    openedAtMs,
  });
  if (!rUnit) return null;

  const path = buildClosePath({
    direction: trade.direction,
    entry: trade.avgEntry,
    avgExit: trade.avgExit,
    rUnitPrice: rUnit.rUnitPrice,
    bars,
    openedAtMs,
    closedAtMs,
    netPnl: trade.netPnl,
    openQty: trade.openQty,
    plannedRiskUsd: trade.plannedRiskUsd,
  });

  const results = {} as Record<PolicyId, { r: number; x: string }>;
  for (const policyId of SIMULATED_POLICY_IDS) {
    const sim = simulatePolicy(path.pathR, policyId);
    results[policyId] = { r: sim.realizedR, x: sim.exitReason };
  }
  results.actual = { r: path.actualR, x: "actual fill exit" };

  const riskDollarsAt1R =
    trade.plannedRiskUsd != null && trade.plannedRiskUsd > 0
      ? trade.plannedRiskUsd
      : round2(trade.openQty * rUnit.rUnitPrice);

  return {
    id: trade.id.slice(0, 8),
    symbol: trade.symbol,
    direction: trade.direction,
    openedAt: trade.openedAt.slice(0, 10),
    closedAt: trade.closedAt.slice(0, 10),
    openQty: trade.openQty,
    avgEntry: round4(trade.avgEntry),
    avgExit: round4(trade.avgExit),
    netPnl: round2(trade.netPnl),
    rUnitPrice: round4(rUnit.rUnitPrice),
    rUnitSource: rUnit.source,
    riskDollarsAt1R,
    actualR: path.actualR,
    mfeR: path.mfeR,
    maeR: path.maeR,
    results,
  };
}

export function buildPolicyReplayPayload(args: {
  account: string;
  trades: ReplayTradeRow[];
  excluded: string[];
  fetchedAt?: string;
}): PolicyReplayPayload {
  const { account, trades, excluded, fetchedAt = new Date().toISOString() } = args;
  const longs = trades.filter((t) => t.direction === "long");
  const shorts = trades.filter((t) => t.direction === "short");
  const { scoreboard, scoreboardLong, scoreboardShort } = buildScoreboards(trades);

  return {
    source: `IBKR live ${account} via Edge journal (read-only)`,
    note: REPLAY_NOTE,
    excluded,
    account,
    fetchedAt,
    pathModel: "daily closes",
    tradeCount: trades.length,
    longCount: longs.length,
    shortCount: shorts.length,
    names: { ...POLICY_NAMES },
    levers: { ...POLICY_LEVERS },
    policyOrder: [...ALL_POLICY_IDS],
    trades,
    scoreboard,
    scoreboardLong,
    scoreboardShort,
    rankAll: rankScoreboard(scoreboard),
    rankLong: rankScoreboard(scoreboardLong),
    rankShort: rankScoreboard(scoreboardShort),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
