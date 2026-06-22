import type { Candle, Interval, VisibleRange } from './contracts';
import { plotWidth } from './layout';

export type TimeAxisTick = {
  /** X position in plot coordinates (0 … plot width). */
  x: number;
  label: string;
  /** Year labels use slightly stronger styling (TradingView left-year marker). */
  kind: 'primary' | 'year';
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MS_MIN = 60_000;
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;

type TickUnit =
  | { kind: 'minute'; step: number }
  | { kind: 'hour'; step: number }
  | { kind: 'day'; step: number }
  | { kind: 'week' }
  | { kind: 'month'; step: number }
  | { kind: 'year'; step: number };

function timestampAtIndex(candles: Candle[], index: number): number | null {
  if (candles.length === 0) return null;
  if (index < 0) return candles[0]!.t;
  if (index >= candles.length) return candles[candles.length - 1]!.t;
  return candles[Math.floor(index)]!.t ?? null;
}

/** Interpolate time across the visible index window (includes virtual margin bars). */
export function visibleTimeBounds(
  candles: Candle[],
  startIndex: number,
  endIndex: number,
): { startMs: number; endMs: number } | null {
  const startMs = timestampAtIndex(candles, startIndex);
  const endMs = timestampAtIndex(candles, endIndex);
  if (startMs == null || endMs == null) return null;
  if (endMs === startMs) return { startMs, endMs: startMs + MS_HOUR };
  return { startMs, endMs };
}

function xForTimestamp(
  ms: number,
  startMs: number,
  endMs: number,
  widthPx: number,
): number {
  const span = endMs - startMs;
  if (span <= 0) return 0;
  return ((ms - startMs) / span) * widthPx;
}

function startOfMinute(d: Date, step: number): Date {
  const out = new Date(d);
  out.setSeconds(0, 0);
  out.setMinutes(Math.floor(out.getMinutes() / step) * step);
  return out;
}

function startOfHour(d: Date, step: number): Date {
  const out = new Date(d);
  out.setMinutes(0, 0, 0);
  out.setHours(Math.floor(out.getHours() / step) * step);
  return out;
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfWeek(d: Date): Date {
  const out = startOfDay(d);
  const day = out.getDay();
  out.setDate(out.getDate() - day);
  return out;
}

function startOfMonth(d: Date): Date {
  const out = new Date(d);
  out.setDate(1);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfYear(d: Date): Date {
  const out = new Date(d);
  out.setMonth(0, 1);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addUnit(d: Date, unit: TickUnit): Date {
  const out = new Date(d);
  switch (unit.kind) {
    case 'minute':
      out.setMinutes(out.getMinutes() + unit.step);
      break;
    case 'hour':
      out.setHours(out.getHours() + unit.step);
      break;
    case 'day':
      out.setDate(out.getDate() + unit.step);
      break;
    case 'week':
      out.setDate(out.getDate() + 7);
      break;
    case 'month':
      out.setMonth(out.getMonth() + unit.step);
      break;
    case 'year':
      out.setFullYear(out.getFullYear() + unit.step);
      break;
  }
  return out;
}

function alignToUnit(d: Date, unit: TickUnit): Date {
  switch (unit.kind) {
    case 'minute':
      return startOfMinute(d, unit.step);
    case 'hour':
      return startOfHour(d, unit.step);
    case 'day':
      return startOfDay(d);
    case 'week':
      return startOfWeek(d);
    case 'month':
      return startOfMonth(d);
    case 'year':
      return startOfYear(d);
  }
}

const NICE_MINUTES = [1, 2, 5, 10, 15, 30];
const NICE_HOURS = [1, 2, 3, 4, 6, 12];
const NICE_DAYS = [1, 2, 5, 7];
const NICE_MONTHS = [1, 2, 3, 6];
const NICE_YEARS = [1, 2, 5, 10];

function pickNiceStep(candidates: number[], roughMs: number, unitMs: number): number {
  const roughUnits = roughMs / unitMs;
  for (const c of candidates) {
    if (c >= roughUnits * 0.85) return c;
  }
  return candidates[candidates.length - 1]!;
}

/** Choose calendar-aligned tick spacing from visible span and bar interval. */
export function pickTickUnit(spanMs: number, interval: Interval, targetTicks: number): TickUnit {
  const rough = spanMs / Math.max(3, targetTicks);

  if (spanMs <= 6 * MS_HOUR) {
    return { kind: 'minute', step: pickNiceStep(NICE_MINUTES, rough, MS_MIN) };
  }
  if (spanMs <= 3 * MS_DAY) {
    return { kind: 'hour', step: pickNiceStep(NICE_HOURS, rough, MS_HOUR) };
  }
  if (spanMs <= 21 * MS_DAY) {
    return { kind: 'day', step: pickNiceStep(NICE_DAYS, rough, MS_DAY) };
  }
  if (spanMs <= 120 * MS_DAY) {
    return { kind: 'week' };
  }
  if (spanMs <= 3 * 365 * MS_DAY) {
    return { kind: 'month', step: pickNiceStep(NICE_MONTHS, rough, 30 * MS_DAY) };
  }
  return { kind: 'year', step: pickNiceStep(NICE_YEARS, rough, 365 * MS_DAY) };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatHour(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatTickLabel(d: Date, unit: TickUnit, spanMs: number): string {
  switch (unit.kind) {
    case 'minute':
    case 'hour':
      if (spanMs > MS_DAY) {
        return `${WEEKDAYS[d.getDay()]} ${d.getDate()}`;
      }
      return formatHour(d);
    case 'day':
      if (spanMs <= 14 * MS_DAY) {
        return `${WEEKDAYS[d.getDay()]} ${d.getDate()}`;
      }
      return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    case 'week':
      return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    case 'month':
      if (spanMs > 18 * 30 * MS_DAY) {
        return `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
      }
      return MONTHS[d.getMonth()]!;
    case 'year':
      return String(d.getFullYear());
  }
}

function minLabelGapPx(widthPx: number, targetTicks: number): number {
  return Math.max(48, widthPx / (targetTicks + 1));
}

/** Build TradingView-style time-axis ticks for the visible window. */
export function computeTimeAxisTicks(
  candles: Candle[],
  vp: VisibleRange,
  interval: Interval,
  width: number,
): TimeAxisTick[] {
  const pw = plotWidth(width);
  if (pw <= 0 || candles.length === 0) return [];

  const bounds = visibleTimeBounds(candles, vp.startIndex, vp.endIndex);
  if (!bounds) return [];

  const { startMs, endMs } = bounds;
  const spanMs = endMs - startMs;
  if (spanMs <= 0) return [];

  const targetTicks = Math.max(4, Math.min(10, Math.floor(pw / 72)));
  const unit = pickTickUnit(spanMs, interval, targetTicks);
  const minGap = minLabelGapPx(pw, targetTicks);

  const ticks: TimeAxisTick[] = [];

  // TradingView-style year marker pinned near the left on month/year scales.
  if (unit.kind === 'month' || unit.kind === 'year') {
    ticks.push({
      x: 4,
      label: String(new Date(startMs).getFullYear()),
      kind: 'year',
    });
  }

  let cursor = alignToUnit(new Date(startMs), unit);
  if (cursor.getTime() < startMs) cursor = addUnit(cursor, unit);

  let prevYear: number | null = null;

  while (cursor.getTime() <= endMs + 1) {
    const ms = cursor.getTime();
    const x = xForTimestamp(ms, startMs, endMs, pw);

    const last = ticks[ticks.length - 1];
    if (!last || x - last.x >= minGap) {
      const d = new Date(ms);
      const year = d.getFullYear();

      if (unit.kind === 'month' && d.getMonth() === 0 && prevYear !== year && prevYear !== null) {
        ticks.push({ x, label: String(year), kind: 'year' });
      } else {
        ticks.push({ x, label: formatTickLabel(d, unit, spanMs), kind: 'primary' });
      }

      prevYear = year;
    }

    cursor = addUnit(cursor, unit);
  }

  return ticks;
}

/** Detailed crosshair / tooltip time (always precise). */
export function formatCrosshairTime(ms: number, interval?: Interval): string {
  if (!ms) return '';
  const d = new Date(ms);
  const intraday =
    interval === '1m' ||
    interval === '5m' ||
    interval === '15m' ||
    interval === '30m' ||
    interval === '1h' ||
    interval === '2h';
  if (intraday) {
    const day = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]!} '${String(d.getFullYear()).slice(-2)}`;
    return `${day}  ${formatHour(d)}`;
  }
  if (interval === '1wk' || interval === '1mo') {
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]!} '${String(d.getFullYear()).slice(-2)}`;
}
