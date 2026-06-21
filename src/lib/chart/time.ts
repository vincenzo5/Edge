import type { Interval } from './contracts';

const INTRADAY_INTERVALS = new Set<Interval>(['5m', '15m', '30m', '1h']);

export function formatAxisTime(ms: number, interval?: Interval): string {
  if (!ms) return '';
  const date = new Date(ms);
  if (INTRADAY_INTERVALS.has(interval ?? '1d')) {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('en-US');
}
