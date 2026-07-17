'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Interval, Theme } from '@/lib/chart/contracts';
import type { GoToRequest, GoToResult } from '@/lib/chart/goTo';
import { EdgeButton, EdgeModalShell, EdgeSegmentedTabs } from './design-system';

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
    case 'no_chart':
      return 'No active chart is available.';
    default:
      return 'Could not navigate to that date.';
  }
}

const fieldClass =
  'rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-1 text-sm text-[var(--edge-text-primary)]';

export default function ChartGoToModal({
  open,
  theme,
  interval,
  defaultTimestampMs,
  onClose,
  onGoTo,
}: Props) {
  void theme;
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

  return (
    <EdgeModalShell
      open={open}
      title="Go to"
      onClose={onClose}
      maxWidth="sm"
      align="center"
      testId="go-to-modal"
      footer={
        <div className="flex justify-end gap-2 px-4 py-3">
          <EdgeButton variant="secondary" onClick={onClose}>
            Cancel
          </EdgeButton>
          <EdgeButton
            variant="primary"
            onClick={() => void handleSubmit()}
            disabled={submitting || rangeInvalid}
          >
            Go to
          </EdgeButton>
        </div>
      }
    >
      <div className="border-b border-[var(--edge-border)] px-4 py-2">
        <EdgeSegmentedTabs
          segments={[
            { id: 'date', label: 'Date' },
            { id: 'range', label: 'Custom range' },
          ]}
          value={tab}
          onChange={(id) => setTab(id as Tab)}
        />
      </div>

      <div className="space-y-3 p-4">
        {tab === 'date' ? (
          <div className="flex gap-2">
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className={`${fieldClass} flex-1`}
            />
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              disabled={!showTime}
              title={showTime ? undefined : 'Time selection applies to intraday intervals only'}
              className={`${fieldClass} w-24 ${!showTime ? 'opacity-50' : ''}`}
            />
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="date"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                className={`${fieldClass} flex-1`}
                aria-label="Range start date"
              />
              <input
                type="time"
                value={rangeFromTime}
                onChange={(e) => setRangeFromTime(e.target.value)}
                disabled={!showTime}
                className={`${fieldClass} w-24 ${!showTime ? 'opacity-50' : ''}`}
              />
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                className={`${fieldClass} flex-1`}
                aria-label="Range end date"
              />
              <input
                type="time"
                value={rangeToTime}
                onChange={(e) => setRangeToTime(e.target.value)}
                disabled={!showTime}
                className={`${fieldClass} w-24 ${!showTime ? 'opacity-50' : ''}`}
              />
            </div>
          </>
        )}

        {rangeInvalid && (
          <p className="text-sm text-[var(--edge-negative)]">
            Start date must be on or before end date.
          </p>
        )}
        {error && <p className="text-sm text-[var(--edge-negative)]">{error}</p>}
      </div>
    </EdgeModalShell>
  );
}
