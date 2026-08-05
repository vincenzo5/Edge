export type PolicyId =
  | "actual"
  | "fixed_1r"
  | "fixed_2r"
  | "fixed_3r"
  | "be_only"
  | "half_be"
  | "half_trail"
  | "scale_3x"
  | "full_trail_tight"
  | "full_trail_wide"
  | "swing_harvest"
  | "step_trail_025"
  | "step_trail_05"
  | "step_trail_1";

export type TradeDirection = "long" | "short";

/** Sequential daily-close path in R multiples from entry. */
export type TradePath = {
  pathR: number[];
  mfeR: number;
  maeR: number;
  actualR: number;
};

export type PolicySimResult = {
  realizedR: number;
  exitReason: string;
};

export type ScoreboardRow = {
  n: number;
  netR: number;
  winRate: number;
  wins: number;
  losses: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number | null;
  expectancy: number;
  maxDdR: number;
};

export type RankedScoreboardRow = ScoreboardRow & {
  id: PolicyId;
  name: string;
};

export type ReplayTradeRow = {
  id: string;
  symbol: string;
  direction: TradeDirection;
  openedAt: string;
  closedAt: string;
  openQty: number;
  avgEntry: number;
  avgExit: number;
  netPnl: number;
  rUnitPrice: number;
  rUnitSource: "planned_risk" | "atr14";
  riskDollarsAt1R: number;
  actualR: number;
  mfeR: number;
  maeR: number;
  results: Record<PolicyId, { r: number; x: string }>;
};

export type PolicyReplayPayload = {
  source: string;
  note: string;
  excluded: string[];
  account: string;
  fetchedAt: string;
  pathModel: "daily closes";
  tradeCount: number;
  longCount: number;
  shortCount: number;
  names: Record<PolicyId, string>;
  levers: Record<PolicyId, string>;
  policyOrder: PolicyId[];
  trades: ReplayTradeRow[];
  scoreboard: Record<PolicyId, ScoreboardRow>;
  scoreboardLong: Record<PolicyId, ScoreboardRow>;
  scoreboardShort: Record<PolicyId, ScoreboardRow>;
  rankAll: RankedScoreboardRow[];
  rankLong: RankedScoreboardRow[];
  rankShort: RankedScoreboardRow[];
};

export type DailyBar = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type JournalTradeForReplay = {
  id: string;
  direction: TradeDirection;
  symbol: string;
  openedAt: string;
  closedAt: string;
  openQty: number;
  avgEntry: number;
  avgExit: number;
  netPnl: number;
  plannedRiskUsd: number | null;
};
