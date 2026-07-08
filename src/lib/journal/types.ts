import type { BrokerageContract } from "@/lib/marketData/contracts/brokerage";

export type JournalFillSource = "live" | "flex_csv" | "flex_api";

export type JournalFill = {
  id?: string;
  execId: string;
  account?: string | null;
  fillTime: string;
  side: string;
  quantity: number;
  price: number;
  avgPrice?: number | null;
  orderId?: number | null;
  permId?: number | null;
  orderRef?: string | null;
  exchange?: string | null;
  contract: BrokerageContract;
  commission?: number | null;
  commissionCurrency?: string | null;
  realizedPNL?: number | null;
  source: JournalFillSource;
  createdAt?: string;
};

export type JournalTradeLeg = {
  conId?: number | null;
  symbol?: string | null;
  secType?: string | null;
  strike?: number | null;
  right?: string | null;
  expiry?: string | null;
  localSymbol?: string | null;
  multiplier?: string | null;
  netQuantity?: number | null;
};

export type JournalTradeStatus = "open" | "closed";
export type JournalTradeDirection = "long" | "short";
export type JournalSetup =
  | "breakout"
  | "pullback"
  | "earnings"
  | "spread"
  | "other";

export type PlannedRiskMode = "usd" | "pct";

export type JournalTradeFillLink = {
  execId: string;
  role: "open" | "close";
};

export type JournalTrade = {
  id: string;
  status: JournalTradeStatus;
  direction: JournalTradeDirection;
  symbol: string;
  secType: string;
  openedAt: string;
  closedAt?: string | null;
  netQuantity?: number | null;
  avgEntry?: number | null;
  avgExit?: number | null;
  grossPnL?: number | null;
  netPnL?: number | null;
  totalCommission?: number | null;
  legs?: JournalTradeLeg[];
  fillExecIds: string[];
  fillLinks?: JournalTradeFillLink[];
  tags?: string[];
  setup?: JournalSetup | null;
  reviewNote?: string | null;
  plannedRiskMode?: PlannedRiskMode | null;
  plannedRiskValue?: number | null;
  plannedRiskUsd?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type JournalSnapshot = {
  fills: JournalFill[];
  trades: JournalTrade[];
  updatedAt: number;
};

export type JournalImportResult = {
  imported: number;
  skipped: number;
  duplicates: number;
  tradesRebuilt: number;
};

export const JOURNAL_LOCAL_STORAGE_KEY = "edge.journal.v1";

export const JOURNAL_SETUP_VALUES: JournalSetup[] = [
  "breakout",
  "pullback",
  "earnings",
  "spread",
  "other",
];
