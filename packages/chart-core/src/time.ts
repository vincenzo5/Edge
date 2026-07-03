import type { Interval } from './contracts';
import { formatCrosshairTime } from './timeAxis';

/** @deprecated Prefer formatCrosshairTime for crosshair; axis uses computeTimeAxisTicks. */
export function formatAxisTime(ms: number, interval?: Interval): string {
  return formatCrosshairTime(ms, interval);
}

const MS_MIN = 60_000;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;
const MS_WEEK = 7 * MS_DAY;
const MS_MONTH = 30 * MS_DAY;

const INTRADAY_INTERVALS = new Set<Interval>(['1m', '5m', '15m', '30m', '1h', '2h']);

/** Format a signed time delta for ruler / measure labels, scaled to the chart interval. */
export function formatTimeDelta(ms: number, interval?: Interval): string {
  const abs = Math.abs(ms);
  const sign = ms < 0 ? '-' : '';

  if (interval === '1mo') {
    const months = Math.floor(abs / MS_MONTH);
    const remDays = Math.round((abs % MS_MONTH) / MS_DAY);
    if (months === 0) {
      const days = Math.max(1, Math.round(abs / MS_DAY));
      return `${sign}${days}d`;
    }
    return remDays > 0 ? `${sign}${months}mo ${remDays}d` : `${sign}${months}mo`;
  }

  if (interval === '1wk') {
    const weeks = Math.floor(abs / MS_WEEK);
    const remDays = Math.floor((abs % MS_WEEK) / MS_DAY);
    if (weeks === 0) {
      const days = Math.max(1, Math.round(abs / MS_DAY));
      return `${sign}${days}d`;
    }
    return remDays > 0 ? `${sign}${weeks}w ${remDays}d` : `${sign}${weeks}w`;
  }

  if (interval === '1d') {
    const days = Math.max(1, Math.round(abs / MS_DAY));
    return `${sign}${days}d`;
  }

  if (interval && !INTRADAY_INTERVALS.has(interval)) {
    const days = Math.max(1, Math.round(abs / MS_DAY));
    return `${sign}${days}d`;
  }

  if (abs < MS_HOUR) {
    const mins = Math.max(1, Math.round(abs / MS_MIN));
    return `${sign}${mins}m`;
  }

  const hours = Math.floor(abs / MS_HOUR);
  const mins = Math.round((abs % MS_HOUR) / MS_MIN);
  if (mins === 0) return `${sign}${hours}h`;
  return `${sign}${hours}h ${mins}m`;
}
