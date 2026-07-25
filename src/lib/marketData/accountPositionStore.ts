import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";

const positionsBySymbol = new Map<string, AccountPosition | null>();
const symbolListeners = new Map<string, Set<() => void>>();

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function positionKey(position: AccountPosition | null): string {
  if (!position) return "null";
  return [
    position.contract.symbol,
    position.position,
    position.avgCost,
    position.marketPrice,
    position.marketValue,
    position.unrealizedPNL,
  ].join("|");
}

function notifySymbol(symbol: string): void {
  for (const listener of symbolListeners.get(symbol) ?? []) {
    listener();
  }
}

export function subscribeAccountPosition(symbol: string, listener: () => void): () => void {
  const key = normalizeSymbol(symbol);
  let bucket = symbolListeners.get(key);
  if (!bucket) {
    bucket = new Set();
    symbolListeners.set(key, bucket);
  }
  bucket.add(listener);
  return () => {
    bucket!.delete(listener);
    if (bucket!.size === 0) {
      symbolListeners.delete(key);
    }
  };
}

export function getAccountPosition(symbol: string): AccountPosition | null {
  return positionsBySymbol.get(normalizeSymbol(symbol)) ?? null;
}

export function syncAccountPositions(positions: AccountPosition[]): void {
  const nextBySymbol = new Map<string, AccountPosition>();
  for (const row of positions) {
    const sym = row.contract.symbol?.trim().toUpperCase();
    if (sym) nextBySymbol.set(sym, row);
  }

  const watched = new Set([...positionsBySymbol.keys(), ...nextBySymbol.keys()]);
  for (const symbol of watched) {
    const next = nextBySymbol.get(symbol) ?? null;
    const prev = positionsBySymbol.get(symbol) ?? null;
    if (positionKey(prev) === positionKey(next)) continue;
    positionsBySymbol.set(symbol, next);
    notifySymbol(symbol);
  }
}

export function clearAccountPositionStoreForTests(): void {
  positionsBySymbol.clear();
  symbolListeners.clear();
}
