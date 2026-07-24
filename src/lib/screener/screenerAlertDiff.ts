export function normalizeSymbolSet(symbols: string[]): string[] {
  return [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))].sort();
}

export function diffAddedSymbols(previous: string[], next: string[]): string[] {
  const previousSet = new Set(normalizeSymbolSet(previous));
  return normalizeSymbolSet(next).filter((symbol) => !previousSet.has(symbol));
}

export function formatAddedSymbolsBody(symbols: string[], max = 8): string {
  if (symbols.length === 0) return "No new symbols";
  const shown = symbols.slice(0, max).map((symbol) => `+${symbol}`);
  if (symbols.length > max) {
    shown.push(`+${symbols.length - max} more`);
  }
  return shown.join(", ");
}

export function isScreenerAlertInCooldown(
  lastFiredAt: string | null | undefined,
  cooldownMs: number,
  nowMs = Date.now(),
): boolean {
  if (!lastFiredAt) return false;
  const firedMs = Date.parse(lastFiredAt);
  if (!Number.isFinite(firedMs)) return false;
  return nowMs - firedMs < cooldownMs;
}
