import type { Interval } from "@/lib/chart/contracts";

type ChartLinkTrade = {
  id?: string;
  symbol: string;
  openedAt?: string;
  closedAt?: string | null;
};

const TWO_DAYS_MS = 2 * 86_400_000;

export function chartSymbolForTrade(trade: ChartLinkTrade): string {
  return trade.symbol.toUpperCase();
}

export function resolveChartInterval(
  trade: Pick<ChartLinkTrade, "openedAt" | "closedAt">,
): Interval {
  if (!trade.openedAt) return "1d";
  const opened = Date.parse(trade.openedAt);
  const closed = trade.closedAt ? Date.parse(trade.closedAt) : Date.now();
  const durationMs = closed - opened;
  return durationMs <= TWO_DAYS_MS ? "5m" : "1d";
}

export function buildChartDeepLink(
  trade: ChartLinkTrade,
  options?: { interval?: Interval },
): string {
  const interval = options?.interval ?? resolveChartInterval(trade);
  const params = new URLSearchParams({
    symbol: chartSymbolForTrade(trade),
    interval,
  });
  if (trade.id) params.set("journalTrade", trade.id);
  if (trade.openedAt) params.set("goto", String(Date.parse(trade.openedAt)));
  return `/chart?${params.toString()}`;
}

export type ChartDeepLinkParams = {
  symbol?: string;
  interval?: Interval;
  journalTrade?: string;
  goto?: number;
};

export function parseChartDeepLinkParams(
  searchParams: URLSearchParams,
): ChartDeepLinkParams | null {
  const symbol = searchParams.get("symbol")?.trim();
  const interval = searchParams.get("interval")?.trim() as Interval | undefined;
  const journalTrade = searchParams.get("journalTrade")?.trim();
  const gotoRaw = searchParams.get("goto")?.trim();
  const goto = gotoRaw ? Number.parseInt(gotoRaw, 10) : undefined;

  if (!symbol && !journalTrade) return null;

  return {
    symbol: symbol?.toUpperCase(),
    interval,
    journalTrade,
    goto: Number.isFinite(goto) ? goto : undefined,
  };
}
