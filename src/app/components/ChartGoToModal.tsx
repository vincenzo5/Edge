'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Interval, Theme } from '@/lib/chart/contracts';
import type { GoToRequest, GoToResult } from '@/lib/chart/goTo';

type Tab = 'date' | 'range';

type Props = {
  open: boolean;
  theme: Theme;
  interval: Interval;
  defaultTimestampMs: number | null;
  onClose: () => void;
  onGoTo: (req: GoToRequest) => Promise<GoToResult>;
};

const INTRADAY_INTERVALS = new Set<Interval>(['1m', '5m', '15m', '30m', '1h', '2h']);

function msToDateInput(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function inputToMs(dateStr: string, timeStr = '00:00'): number | null {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  if (![y, m, d, hh, mm].every(Number.isFinite)) return null;
  const ms = new Date(y, m - 1, d, hh, mm).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function resultMessage(result: GoToResult): string | null {
  if (result.ok) return null;
  switch (result.reason) {
    case 'out_of_range':
      return 'Date is outside loaded history. Try a longer range or pan left.';
    case 'replay_active':
      return 'Exit Bar Replay before using Go to.';
    case 'invalid_range':
      return 'Start date must be on or before end date.';
    case 'invalid_date':
      return 'Enter a valid date and time.';
    case 'no_data':
      return 'No chart data loaded yet.';
    default:
      return 'Could not navigate to that date.';
  }
}

export default function ChartGoToModal({
  open,
  theme,
  interval,
  defaultTimestampMs,
  onClose,
  onGoTo,
}: Props) {
  const isDark = theme === 'dark';
  const todayInput = msToDateInput(Date.now());
  const initialDate = defaultTimestampMs != null ? msToDateInput(defaultTimestampMs) : todayInput;

  const [tab, setTab] = useState<Tab>('date');
  const [dateValue, setDateValue] = useState(initialDate);
  const [timeValue, setTimeValue] = useState('00:00');
  const [rangeFrom, setRangeFrom] = useState(initialDate);
  const [rangeTo, setRangeTo] = useState(initialDate);
  const [rangeFromTime, setRangeFromTime] = useState('00:00');
  const [rangeToTime, setRangeToTime] = useState('00:00');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showTime = INTRADAY_INTERVALS.has(interval);

  useEffect(() => {
    if (!open) return;
    setTab('date');
    setDateValue(initialDate);
    setTimeValue('00:00');
    setRangeFrom(initialDate);
    setRangeTo(initialDate);
    setRangeFromTime('00:00');
    setRangeToTime('00:00');
    setError(null);
    setSubmitting(false);
  }, [open, initialDate]);

  const rangeInvalid = useMemo(() => {
    if (tab !== 'range') return false;
    const fromMs = inputToMs(rangeFrom, showTime ? rangeFromTime : '00:00');
    const toMs = inputToMs(rangeTo, showTime ? rangeToTime : '00:00');
    return fromMs != null && toMs != null && fromMs > toMs;
  }, [tab, rangeFrom, rangeTo, rangeFromTime, rangeToTime, showTime]);

  const handleSubmit = useCallback(async () => {
    if (rangeInvalid) return;
    setSubmitting(true);
    setError(null);
    try {
      const req: GoToRequest | null =
        tab === 'date'
          ? (() => {
              const at = inputToMs(dateValue, showTime ? timeValue : '00:00');
              return at == null ? null : { mode: 'date', at };
            })()
          : (() => {
              const from = inputToMs(rangeFrom, showTime ? rangeFromTime : '00:00');
              const to = inputToMs(rangeTo, showTime ? rangeToTime : '00:00');
              return from == null || to == null ? null : { mode: 'range', from, to };
            })();
      if (!req) {
        setError(resultMessage({ ok: false, reason: 'invalid_date' }));
        return;
      }
      const result = await onGoTo(req);
      if (result.ok) {
        onClose();
        return;
      }
      setError(resultMessage(result));
    } finally {
      setSubmitting(false);
    }
  }, [tab, dateValue, timeValue, rangeFrom, rangeTo, rangeFromTime, rangeToTime, rangeInvalid, showTime, onGoTo, onClose]);

  if (!open) return null;

  const inputClass = `rounded border px-2 py-1 text-sm ${
    isDark
      ? 'border-[#1E2030] bg-[#0A0B0E] text-[#E8E9ED]'
      : 'border-gray-300 bg-white text-gray-900'
  }`;

  const tabClass = (active: boolean) =>
    `border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? isDark
          ? 'border-[#E8E9ED] text-[#E8E9ED]'
          : 'border-gray-900 text-gray-900'
        : isDark
          ? 'border-transparent text-[#8B8FA3] hover:text-[#E8E9ED]'
          : 'border-transparent text-gray-500 hover:text-gray-800'
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm overflow-hidden rounded-lg border shadow-xl ${
          isDark ? 'border-[#1E2030] bg-[#12131A]' : 'border-gray-200 bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="go-to-title"
      >
        <div
          className={`flex items-center justify-between border-b px-4 py-3 ${
            isDark ? 'border-[#1E2030]' : 'border-gray-200'
          }`}
        >
          <h3 id="go-to-title" className={`text-base font-semibold ${isDark ? 'text-[#E8E9ED]' : ''}`}>
            Go to
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={isDark ? 'text-[#8B8FA3] hover:text-[#E8E9ED]' : 'text-gray-500 hover:text-gray-700'}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className={`flex border-b ${isDark ? 'border-[#1E2030]' : 'border-gray-200'}`}>
          <button type="button" className={tabClass(tab === 'date')} onClick={() => setTab('date')}>
            Date
          </button>
          <button type="button" className={tabClass(tab === 'range')} onClick={() => setTab('range')}>
            Custom range
          </button>
        </div>

        <div className="space-y-3 p-4">
          {tab === 'date' ? (
            <div className="flex gap-2">
              <input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className={`${inputClass} flex-1`}
              />
              <input
                type="time"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                disabled={!showTime}
                title={showTime ? undefined : 'Time selection applies to intraday intervals only'}
                className={`${inputClass} w-24 opacity-50`}
              />
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className={`${inputClass} flex-1`}
                  aria-label="Range start date"
                />
                <input
                  type="time"
                  value={rangeFromTime}
                  onChange={(e) => setRangeFromTime(e.target.value)}
                  disabled={!showTime}
                  className={`${inputClass} w-24 opacity-50`}
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className={`${inputClass} flex-1`}
                  aria-label="Range end date"
                />
                <input
                  type="time"
                  value={rangeToTime}
                  onChange={(e) => setRangeToTime(e.target.value)}
                  disabled={!showTime}
                  className={`${inputClass} w-24 opacity-50`}
                />
              </div>
            </>
          )}

          {rangeInvalid && (
            <p className="text-sm text-red-500">Start date must be on or before end date.</p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div
          className={`flex justify-end gap-2 border-t px-4 py-3 ${
            isDark ? 'border-[#1E2030]' : 'border-gray-200'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`rounded border px-4 py-1.5 text-sm font-medium ${
              isDark
                ? 'border-[#1E2030] text-[#E8E9ED] hover:bg-[#1E2030]'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || rangeInvalid}
            className={`rounded px-4 py-1.5 text-sm font-medium disabled:opacity-50 ${
              isDark ? 'bg-[#E8E9ED] text-[#0A0B0E]' : 'bg-gray-900 text-white'
            }`}
          >
            Go to
          </button>
        </div>
      </div>
    </div>
  );
}
