"use client";

import type { CSSProperties } from "react";

import type { CalendarMonth, DailyPnLRow } from "@/lib/journal/journalStats";
import {
  CALENDAR_WEEKDAY_COLUMNS,
  buildCalendarMonth,
  calendarHeatIntensity,
  calendarMaxAbsPnL,
  computeCalendarMonthSummary,
  computeCalendarWeekTotals,
} from "@/lib/journal/journalStats";

function formatCompactMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return `${sign}$${abs.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatSummaryMoney(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  if (value < 0) return `−${formatted}`;
  if (value > 0) return `+${formatted}`;
  return formatted;
}

function formatDayMeta(tradeCount: number, winCount: number): string {
  const winRate = tradeCount > 0 ? Math.round((winCount / tradeCount) * 100) : 0;
  const tradeLabel = tradeCount === 1 ? "1 trade" : `${tradeCount} trades`;
  return `${tradeLabel} · ${winRate}%`;
}

function heatmapStyle(netPnL: number | null, intensity: number): CSSProperties | undefined {
  if (intensity <= 0 || netPnL == null || netPnL === 0) return undefined;
  const mix = 12 + intensity * 33;
  const token = netPnL > 0 ? "var(--edge-positive)" : "var(--edge-negative)";
  return {
    backgroundColor: `color-mix(in srgb, ${token} ${mix}%, transparent)`,
  };
}

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

type Props = {
  year: number;
  month: number;
  dailyRows: DailyPnLRow[];
  selectedDate?: string | null;
  onDayClick: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
};

export default function JournalCalendar({
  year,
  month,
  dailyRows,
  selectedDate = null,
  onDayClick,
  onMonthChange,
}: Props) {
  const calendar: CalendarMonth = buildCalendarMonth(year, month, dailyRows);
  const monthSummary = computeCalendarMonthSummary(dailyRows, year, month);
  const weekTotals = computeCalendarWeekTotals(calendar.cells);
  const maxAbsPnL = calendarMaxAbsPnL(calendar.cells);
  const rowCount = calendar.cells.length / CALENDAR_WEEKDAY_COLUMNS;
  const now = new Date();
  const todayIso = localIsoDate(now);
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
      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--edge-text-strong)]">{monthLabel}</h2>
          <p
            className="mt-1 text-xs text-[var(--edge-text-secondary)]"
            data-testid="journal-calendar-month-summary"
          >
            <span
              className={
                monthSummary.netPnL > 0
                  ? "text-[var(--edge-positive)]"
                  : monthSummary.netPnL < 0
                    ? "text-[var(--edge-negative)]"
                    : "text-[var(--edge-text-strong)]"
              }
            >
              {formatSummaryMoney(monthSummary.netPnL)}
            </span>
            {" · "}
            {monthSummary.winDays}W / {monthSummary.lossDays}L
            {" · "}
            {monthSummary.tradeCount} {monthSummary.tradeCount === 1 ? "trade" : "trades"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            data-testid="journal-calendar-prev"
            className="rounded border border-[var(--edge-border)] px-2 py-1 text-xs"
            onClick={() => shiftMonth(-1)}
          >
            Prev
          </button>
          <button
            type="button"
            data-testid="journal-calendar-next"
            className="rounded border border-[var(--edge-border)] px-2 py-1 text-xs"
            onClick={() => shiftMonth(1)}
          >
            Next
          </button>
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
        </div>
      </div>
      <div
        data-testid="journal-calendar-grid"
        className="grid min-h-0 flex-1 grid-cols-6 gap-1 text-[10px]"
        style={{
          gridTemplateRows: `auto repeat(${rowCount}, minmax(0, 1fr))`,
        }}
      >
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-1 text-center text-[var(--edge-text-secondary)]">
            {label}
          </div>
        ))}
        <div className="px-1 text-center text-[var(--edge-text-secondary)]">Week</div>
        {Array.from({ length: rowCount }, (_, rowIndex) => {
          const rowStart = rowIndex * CALENDAR_WEEKDAY_COLUMNS;
          const rowCells = calendar.cells.slice(rowStart, rowStart + CALENDAR_WEEKDAY_COLUMNS);
          const weekTotal = weekTotals[rowIndex] ?? 0;

          return (
            <div key={`row-${rowIndex}`} className="contents">
              {rowCells.map((cell) => {
                const isToday = cell.inMonth && cell.date === todayIso;
                const isSelected = cell.inMonth && cell.date === selectedDate;
                const intensity = calendarHeatIntensity(cell.netPnL, maxAbsPnL);
                const pnlClass =
                  cell.netPnL != null && cell.netPnL > 0
                    ? "text-[var(--edge-positive)]"
                    : cell.netPnL != null && cell.netPnL < 0
                      ? "text-[var(--edge-negative)]"
                      : "text-[var(--edge-text-strong)]";

                return (
                  <button
                    key={cell.date}
                    type="button"
                    data-testid={`journal-calendar-day-${cell.date}`}
                    data-today={isToday ? "true" : undefined}
                    data-selected={isSelected ? "true" : undefined}
                    disabled={!cell.inMonth}
                    style={heatmapStyle(cell.netPnL, intensity)}
                    className={`flex h-full min-h-0 flex-col rounded border px-1 py-1 text-left ${
                      cell.inMonth
                        ? isSelected
                          ? "border-[var(--edge-accent-blue)] ring-1 ring-[var(--edge-accent-blue)]"
                          : isToday
                            ? "border-[var(--edge-accent-blue)] ring-1 ring-[color-mix(in_srgb,var(--edge-accent-blue)_45%,transparent)] hover:border-[var(--edge-accent-blue)]"
                            : "border-[var(--edge-border-subtle)] hover:border-[var(--edge-accent-blue)]"
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
                        <div className={`text-xs font-medium ${pnlClass}`}>
                          {cell.netPnL != null ? formatCompactMoney(cell.netPnL) : "—"}
                        </div>
                        <div className="text-[var(--edge-text-secondary)]">
                          {formatDayMeta(cell.tradeCount, cell.winCount)}
                        </div>
                      </>
                    ) : null}
                  </button>
                );
              })}
              <div
                data-testid={`journal-calendar-week-${rowIndex}`}
                className="flex h-full min-h-0 flex-col justify-center rounded border border-[var(--edge-border-subtle)] px-1 py-1 text-center"
              >
                {weekTotal !== 0 ? (
                  <div
                    className={`text-xs font-medium ${
                      weekTotal > 0
                        ? "text-[var(--edge-positive)]"
                        : "text-[var(--edge-negative)]"
                    }`}
                  >
                    {formatCompactMoney(weekTotal)}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
