import {
  cloneCellConfig,
  DEFAULT_CELL,
  type CellConfig,
  type Theme,
} from "@/lib/chartConfig";
import { chartSymbolForTrade } from "@/lib/journal/chartDeepLink";

export type JournalCaptureTradeContext = {
  id: string;
  symbol: string;
  openedAt?: string;
  closedAt?: string | null;
  fillExecIds?: string[];
};

export type JournalCaptureSeed = {
  requestId: string;
  tradeId: string;
  symbol: string;
  fillExecIds?: string[];
  cellConfig: CellConfig;
  theme: Theme;
};

const STORAGE_PREFIX = "edge.journal.captureSeed.v1.";

export function captureSeedStorageKey(token: string): string {
  return `${STORAGE_PREFIX}${token}`;
}

export function createCaptureToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `capture-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createCaptureRequestId(): string {
  return createCaptureToken();
}

export function buildJournalCaptureSeed(args: {
  trade: JournalCaptureTradeContext;
  activeCellConfig?: CellConfig | null;
  theme?: Theme;
}): JournalCaptureSeed {
  const requestId = createCaptureRequestId();
  const symbol = chartSymbolForTrade(args.trade);
  const source = args.activeCellConfig ?? DEFAULT_CELL;
  const cellConfig = cloneCellConfig(source, { sharedDrawingIds: false });
  cellConfig.symbol = symbol;
  if (!args.activeCellConfig) {
    cellConfig.interval = DEFAULT_CELL.interval;
  }

  return {
    requestId,
    tradeId: args.trade.id,
    symbol,
    fillExecIds: args.trade.fillExecIds?.length ? [...args.trade.fillExecIds] : undefined,
    cellConfig,
    theme: args.theme ?? "dark",
  };
}

export function writeCaptureSeed(token: string, seed: JournalCaptureSeed): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(captureSeedStorageKey(token), JSON.stringify(seed));
}

export function readCaptureSeed(token: string): JournalCaptureSeed | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(captureSeedStorageKey(token));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as JournalCaptureSeed;
    if (!parsed?.requestId || !parsed.tradeId || !parsed.cellConfig) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCaptureSeed(token: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(captureSeedStorageKey(token));
}
