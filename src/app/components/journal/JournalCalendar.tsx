"use client";

import type { CalendarMonth, DailyPnLRow } from "@/lib/journal/journalStats";
import { buildCalendarMonth } from "@/lib/journal/journalStats";

function formatMoney(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return value < 0 ? `-${formatted}` : formatted;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  year: number;
  month: number;
  dailyRows: DailyPnLRow[];
  onDayClick: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
};

export default function JournalCalendar({
  year,
  month,
  dailyRows,
  onDayClick,
  onMonthChange,
}: Props) {
  const calendar: CalendarMonth = buildCalendarMonth(year, month, dailyRows);
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  function goToCurrentMonth() {
    onMonthChange(now.getFullYear(), now.getMonth());
  }

  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    onMonthChange(next.getFullYear(), next.getMonth());
  }

  return (
    <section
      data-testid="journal-calendar"
      className="flex h-full min-h-0 flex-col rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-3"
    >
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--edge-text-strong)]">Calendar P&L</h2>
        <div className="flex items-center gap-2">
          {!isCurrentMonth ? (
            <button
              type="button"
              data-testid="journal-calendar-this-month"
              className="rounded border border-[var(--edge-border)] px-2 py-1 text-xs"
              onClick={goToCurrentMonth}
            >
              This Month
            </button>
          ) : null}
          <button
            type="button"
            data-testid="journal-calendar-prev"
            className="rounded border border-[var(--edge-border)] px-2 py-1 text-xs"
            onClick={() => shiftMonth(-1)}
          >
            Prev
          </button>
          <span className="text-xs text-[var(--edge-text-secondary)]">{monthLabel}</span>
          <button
            type="button"
            data-testid="journal-calendar-next"
            className="rounded border border-[var(--edge-border)] px-2 py-1 text-xs"
            onClick={() => shiftMonth(1)}
          >
            Next
          </button>
        </div>
      </div>
      <div
        data-testid="journal-calendar-grid"
        className="grid min-h-0 flex-1 grid-cols-7 gap-1 text-[10px]"
        style={{
          gridTemplateRows: `auto repeat(${calendar.cells.length / 7}, minmax(0, 1fr))`,
        }}
      >
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-1 text-center text-[var(--edge-text-secondary)]">
            {label}
          </div>
        ))}
        {calendar.cells.map((cell) => {
          const pnlClass =
            cell.netPnL == null || cell.netPnL === 0
              ? ""
              : cell.netPnL > 0
                ? "bg-[color-mix(in_srgb,var(--edge-positive)_18%,transparent)]"
                : "bg-[color-mix(in_srgb,var(--edge-negative)_18%,transparent)]";
          return (
            <button
              key={cell.date}
              type="button"
              data-testid={`journal-calendar-day-${cell.date}`}
              disabled={!cell.inMonth}
              className={`flex h-full min-h-0 flex-col rounded border px-1 py-1 text-left ${
                cell.inMonth
                  ? `border-[var(--edge-border-subtle)] ${pnlClass} hover:border-[var(--edge-accent-blue)]`
                  : "border-transparent opacity-30"
              }`}
              onClick={() => {
                if (!cell.inMonth) return;
                onDayClick(cell.date);
              }}
            >
              <div className="text-[var(--edge-text-secondary)]">{cell.date.slice(8, 10)}</div>
              {cell.inMonth && cell.tradeCount > 0 ? (
                <>
                  <div
                    className={`text-xs font-medium ${
                      cell.netPnL != null && cell.netPnL > 0
                        ? "text-[var(--edge-positive)]"
                        : cell.netPnL != null && cell.netPnL < 0
                          ? "text-[var(--edge-negative)]"
                          : "text-[var(--edge-text-strong)]"
                    }`}
                  >
                    {cell.netPnL != null ? formatMoney(cell.netPnL) : "—"}
                  </div>
                  <div className="text-[var(--edge-text-secondary)]">{cell.tradeCount} trades</div>
                </>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
