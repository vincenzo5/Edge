import type {
  JournalFill,
  JournalTrade,
  JournalTradeFillLink,
  JournalTradeLeg,
} from "@/lib/journal/types";

const SPREAD_WINDOW_MS = 2000;

function tradeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `trade-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sortFills(fills: JournalFill[]): JournalFill[] {
  return [...fills].sort((a, b) => Date.parse(a.fillTime) - Date.parse(b.fillTime));
}

function conIdKey(fill: JournalFill): string {
  if (fill.contract.conId != null) return String(fill.contract.conId);
  return [
    fill.contract.symbol ?? "",
    fill.contract.secType ?? "",
    fill.contract.strike ?? "",
    fill.contract.right ?? "",
    fill.contract.lastTradeDateOrContractMonth ?? "",
  ].join("|");
}

function underlyingSymbol(fill: JournalFill): string {
  return (fill.contract.symbol ?? "UNKNOWN").toUpperCase();
}

function isBuySide(side: string): boolean {
  const upper = side.toUpperCase();
  return upper.includes("BOT") || upper === "BUY";
}

function signedQuantity(fill: JournalFill): number {
  return isBuySide(fill.side) ? fill.quantity : -fill.quantity;
}

function toLeg(fill: JournalFill, netQuantity: number): JournalTradeLeg {
  return {
    conId: fill.contract.conId ?? null,
    symbol: fill.contract.symbol ?? null,
    secType: fill.contract.secType ?? null,
    strike: fill.contract.strike ?? null,
    right: fill.contract.right ?? null,
    expiry: fill.contract.lastTradeDateOrContractMonth ?? null,
    localSymbol: fill.contract.localSymbol ?? null,
    multiplier: fill.contract.multiplier ?? null,
    netQuantity,
  };
}

type SpreadEvent = {
  key: string;
  fills: JournalFill[];
  at: number;
};

function buildSpreadEvents(fills: JournalFill[]): SpreadEvent[] {
  const sorted = sortFills(fills);
  const events: SpreadEvent[] = [];
  const used = new Set<string>();

  const byOrderId = new Map<number, JournalFill[]>();
  for (const fill of sorted) {
    if (fill.orderId == null) continue;
    const list = byOrderId.get(fill.orderId) ?? [];
    list.push(fill);
    byOrderId.set(fill.orderId, list);
  }

  for (const group of byOrderId.values()) {
    if (group.length <= 1) continue;
    const firstTime = Date.parse(group[0].fillTime);
    const windowed = group.filter(
      (fill) => Math.abs(Date.parse(fill.fillTime) - firstTime) <= SPREAD_WINDOW_MS,
    );
    if (windowed.length <= 1) continue;
    const distinctConIds = new Set(windowed.map((fill) => conIdKey(fill)));
    if (distinctConIds.size <= 1) continue;
    const key = windowed[0].orderRef?.trim() || `order:${windowed[0].orderId}`;
    for (const fill of windowed) used.add(fill.execId);
    events.push({ key, fills: sortFills(windowed), at: firstTime });
  }

  const byRef = new Map<string, JournalFill[]>();
  for (const fill of sorted) {
    if (!fill.orderRef?.trim() || used.has(fill.execId)) continue;
    const key = fill.orderRef.trim();
    const list = byRef.get(key) ?? [];
    list.push(fill);
    byRef.set(key, list);
  }

  for (const [key, group] of byRef.entries()) {
    if (group.length <= 1) continue;
    const distinctConIds = new Set(group.map((fill) => conIdKey(fill)));
    if (distinctConIds.size <= 1) continue;
    for (const fill of group) used.add(fill.execId);
    events.push({ key, fills: sortFills(group), at: Date.parse(group[0].fillTime) });
  }

  return events.sort((a, b) => a.at - b.at);
}

function finalizeTrade(
  trade: JournalTrade,
  entryValue: number,
  entryQty: number,
  exitValue: number,
  exitQty: number,
  grossPnL: number,
  totalCommission: number,
): JournalTrade {
  return {
    ...trade,
    avgEntry: entryQty > 0 ? entryValue / entryQty : trade.avgEntry ?? null,
    avgExit: exitQty > 0 ? exitValue / exitQty : trade.avgExit ?? null,
    grossPnL: grossPnL !== 0 ? grossPnL : trade.grossPnL ?? null,
    netPnL:
      grossPnL !== 0 || totalCommission !== 0 ? grossPnL - totalCommission : trade.netPnL ?? null,
    totalCommission: totalCommission > 0 ? totalCommission : trade.totalCommission ?? null,
  };
}

function processSingleLegFifo(fills: JournalFill[]): JournalTrade[] {
  const byConId = new Map<string, JournalFill[]>();
  for (const fill of fills) {
    const key = conIdKey(fill);
    const list = byConId.get(key) ?? [];
    list.push(fill);
    byConId.set(key, list);
  }

  const trades: JournalTrade[] = [];

  for (const legFills of byConId.values()) {
    let net = 0;
    let trade: JournalTrade | null = null;
    let entryValue = 0;
    let entryQty = 0;
    let exitValue = 0;
    let exitQty = 0;
    let grossPnL = 0;
    let totalCommission = 0;
    const fillExecIds: string[] = [];
    const fillLinks: JournalTradeFillLink[] = [];

    for (const fill of sortFills(legFills)) {
      const prevNet = net;
      const signed = signedQuantity(fill);
      net += signed;
      totalCommission += fill.commission ?? 0;
      if (fill.realizedPNL != null) grossPnL += fill.realizedPNL;

      fillExecIds.push(fill.execId);
      fillLinks.push({
        execId: fill.execId,
        role: Math.abs(net) >= Math.abs(prevNet) && prevNet !== 0 && Math.sign(net) === Math.sign(prevNet)
          ? "open"
          : Math.abs(net) > Math.abs(prevNet) || prevNet === 0
            ? "open"
            : "close",
      });

      if (prevNet === 0 && net !== 0) {
        trade = {
          id: tradeId(),
          status: "open",
          direction: net > 0 ? "long" : "short",
          symbol: underlyingSymbol(fill),
          secType: fill.contract.secType ?? "STK",
          openedAt: fill.fillTime,
          netQuantity: Math.abs(net),
          fillExecIds: [],
          fillLinks: [],
        };
        entryValue = fill.price * fill.quantity;
        entryQty = fill.quantity;
        exitValue = 0;
        exitQty = 0;
      } else if (trade && Math.abs(net) > Math.abs(prevNet)) {
        entryValue += fill.price * fill.quantity;
        entryQty += fill.quantity;
      } else if (trade && Math.abs(net) < Math.abs(prevNet)) {
        exitValue += fill.price * fill.quantity;
        exitQty += fill.quantity;
      }

      if (trade) {
        trade.netQuantity = Math.abs(net);
        trade.fillExecIds = [...fillExecIds];
        trade.fillLinks = [...fillLinks];
      }

      if (trade && net === 0) {
        trade.status = "closed";
        trade.closedAt = fill.fillTime;
        trades.push(
          finalizeTrade(trade, entryValue, entryQty, exitValue, exitQty, grossPnL, totalCommission),
        );
        trade = null;
        entryValue = entryQty = exitValue = exitQty = 0;
        grossPnL = 0;
        totalCommission = 0;
        fillExecIds.length = 0;
        fillLinks.length = 0;
      }
    }

    if (trade && net !== 0) {
      trades.push(
        finalizeTrade(trade, entryValue, entryQty, exitValue, exitQty, grossPnL, totalCommission),
      );
    }
  }

  return trades;
}

function processSpreadEvents(events: SpreadEvent[]): JournalTrade[] {
  const trades: JournalTrade[] = [];
  const openSpreads = new Map<string, JournalTrade>();

  for (const event of events) {
    const legTotals = new Map<string, number>();
    for (const fill of event.fills) {
      const key = conIdKey(fill);
      legTotals.set(key, (legTotals.get(key) ?? 0) + signedQuantity(fill));
    }

    const legs: JournalTradeLeg[] = event.fills.map((fill) =>
      toLeg(fill, legTotals.get(conIdKey(fill)) ?? signedQuantity(fill)),
    );
    const symbol = underlyingSymbol(event.fills[0]);
    const grossLegQty = [...legTotals.values()].reduce((sum, qty) => sum + Math.abs(qty), 0);
    const netDirection =
      [...legTotals.values()].reduce((sum, qty) => sum + qty, 0) >= 0 ? "long" : "short";
    const totalCommission = event.fills.reduce((sum, fill) => sum + (fill.commission ?? 0), 0);
    const grossPnL = event.fills.reduce((sum, fill) => sum + (fill.realizedPNL ?? 0), 0);
    const fillExecIds = event.fills.map((fill) => fill.execId);
    const fillLinks = event.fills.map((fill) => ({ execId: fill.execId, role: "open" as const }));

    const existing = openSpreads.get(event.key);
    if (!existing) {
      const trade: JournalTrade = {
        id: tradeId(),
        status: "open",
        direction: netDirection,
        symbol,
        secType: event.fills.length > 1 || event.fills[0].contract.secType === "OPT" ? "spread" : "OPT",
        openedAt: event.fills[0].fillTime,
        netQuantity: grossLegQty,
        legs,
        fillExecIds,
        fillLinks,
        totalCommission,
        grossPnL: grossPnL !== 0 ? grossPnL : null,
        netPnL: grossPnL !== 0 || totalCommission !== 0 ? grossPnL - totalCommission : null,
      };
      openSpreads.set(event.key, trade);
      trades.push(trade);
      continue;
    }

    existing.status = "closed";
    existing.closedAt = event.fills[event.fills.length - 1].fillTime;
    existing.fillExecIds = [...new Set([...existing.fillExecIds, ...fillExecIds])];
    existing.fillLinks = [
      ...(existing.fillLinks ?? []),
      ...event.fills.map((fill) => ({ execId: fill.execId, role: "close" as const })),
    ];
    existing.grossPnL = (existing.grossPnL ?? 0) + grossPnL;
    existing.totalCommission = (existing.totalCommission ?? 0) + totalCommission;
    existing.netPnL = (existing.grossPnL ?? 0) - (existing.totalCommission ?? 0);
    openSpreads.delete(event.key);
  }

  return trades;
}

export function groupFillsIntoTrades(fills: JournalFill[]): JournalTrade[] {
  const sorted = sortFills(fills);
  const spreadEvents = buildSpreadEvents(sorted);
  const spreadExecIds = new Set(spreadEvents.flatMap((event) => event.fills.map((fill) => fill.execId)));
  const singleLegFills = sorted.filter((fill) => !spreadExecIds.has(fill.execId));

  const spreadTrades = processSpreadEvents(spreadEvents);
  const singleTrades = processSingleLegFifo(singleLegFills);

  return [...spreadTrades, ...singleTrades].sort(
    (a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt),
  );
}

export function rebuildTradesFromFills(fills: JournalFill[]): JournalTrade[] {
  return groupFillsIntoTrades(fills);
}
