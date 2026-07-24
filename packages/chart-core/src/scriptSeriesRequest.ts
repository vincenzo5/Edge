import type { Interval } from './contracts';
import { SUPPORTED_INTERVALS } from './dataSource';
import type { ScriptSeriesRequest } from './scriptContracts';

export type ScriptSeriesKeyContext = {
  symbol: string;
  interval: Interval;
};

const INTERVAL_SET = new Set<string>(SUPPORTED_INTERVALS);

export function normalizeScriptSeriesSymbol(symbol: string | undefined, fallback: string): string {
  const value = (symbol ?? fallback).trim().toUpperCase();
  if (!value) throw new Error('Series symbol is required');
  return value;
}

export function normalizeScriptSeriesInterval(
  interval: string | undefined,
  fallback: Interval,
): Interval {
  const value = (interval ?? fallback) as Interval;
  if (!INTERVAL_SET.has(value)) {
    throw new Error(`Unsupported interval: ${String(interval ?? fallback)}`);
  }
  return value;
}

export function serializeScriptSeriesKey(
  request: ScriptSeriesRequest,
  context: ScriptSeriesKeyContext,
): string {
  const symbol = normalizeScriptSeriesSymbol(request.symbol, context.symbol);
  const interval = normalizeScriptSeriesInterval(request.interval, context.interval);
  return `${symbol}|${interval}`;
}

export function isPrimaryScriptSeriesKey(
  key: string,
  context: ScriptSeriesKeyContext,
): boolean {
  return key === serializeScriptSeriesKey({}, context);
}

export function dedupeScriptSeriesKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function parseScriptSeriesKey(key: string): { symbol: string; interval: Interval } {
  const pipe = key.indexOf('|');
  if (pipe <= 0 || pipe >= key.length - 1) {
    throw new Error(`Invalid series key: ${key}`);
  }
  const symbol = key.slice(0, pipe);
  const interval = normalizeScriptSeriesInterval(key.slice(pipe + 1), '1d');
  return { symbol, interval };
}
