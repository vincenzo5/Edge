import type { BrokerageContract } from "@/lib/marketData/contracts/brokerage";
import type { ManagePlaybookJournal } from "@/lib/persistence/schemas/journal";

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
export type JournalSetup = string;

export type PlannedRiskMode = "usd" | "pct";

export type JournalTradeRating = 1 | 2 | 3 | 4 | 5;

export const JOURNAL_RATING_VALUES: JournalTradeRating[] = [1, 2, 3, 4, 5];

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
  initialStop?: number | null;
  rating?: JournalTradeRating | null;
  ignored?: boolean;
  mfeUsd?: number | null;
  mfaUsd?: number | null;
  excursionInterval?: "1m" | "5m" | null;
  excursionComputedAt?: string | null;
  managePlaybook?: ManagePlaybookJournal | null;
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
export const JOURNAL_SCREENSHOTS_IDB_NAME = "edge.journal.screenshots.v1";
export const JOURNAL_SCREENSHOTS_IDB_STORE = "screenshots";
export const JOURNAL_CHART_SNAPSHOTS_IDB_NAME = "edge.journal.chartSnapshots.v1";
export const JOURNAL_CHART_SNAPSHOTS_IDB_STORE = "chartSnapshots";

export type JournalScreenshotSource = "upload" | "paste" | "chart_capture";

export {
  DEFAULT_JOURNAL_SETUP_VALUES as JOURNAL_SETUP_VALUES,
  type DefaultJournalSetupValue,
} from "@/lib/journal/journalSetupPreference";
