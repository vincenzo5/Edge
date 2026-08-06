"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Tooltip from "@/app/components/Tooltip";
import { EdgeSegmentedTabs } from "@/app/components/design-system";
import { useTileDensity } from "@/app/components/app-workspace/TileDensityContext";
import { toneTextClass, type EdgeTone } from "@/lib/design-system/edge";
import {
  journalHeroCardSpanClass,
  journalSummaryGridClass,
} from "@/lib/responsive/tileDensity";
import {
  EMPTY_JOURNAL_TRADE_FREQUENCY,
  scaleJournalMetricByStartingEquity,
  type JournalDashboardMetrics,
  type JournalStats,
  type JournalTradeFrequency,
} from "@/lib/journal/journalStats";

const ACCOUNT_EQUITY_HELP =
  "Total portfolio value (net liquidation) from your connected IB account. Secondary lines show scoped net P&L, percent change vs starting equity, and net R when planned risk is available.";

const TRADE_PACE_HELP =
  "Observed closed-trade pace for the current scope: trades per week and per month (count ÷ elapsed calendar days in the selected period).";

const NET_PNL_HELP =
  "The total realized net profit and loss for all closed trades in the current scope.";

const WIN_RATE_HELP =
  "Reflects the percentage of your winning trades out of total trades taken.";

const EXPECTED_VALUE_HELP =
  "Average profit or loss per trade in the current scope (expectancy). The bar compares average win and average loss magnitudes.";

const DRAWDOWN_HELP =
  "Maximum peak-to-trough decline on the scoped equity curve. Secondary lines show max drawdown as a percent of starting equity and in R when planned risk is available.";

const EQUITY_FLASH_MS = 2_000;

const GAUGE_SIZE = 88;
const GAUGE_CX = GAUGE_SIZE / 2;
const GAUGE_CY = GAUGE_SIZE / 2 + 6;
const GAUGE_R = 32;
const GAUGE_STROKE = 7;

type OutcomeSegment = "win" | "breakeven" | "loss";
type AvgWinLossSegment = "win" | "loss";
type JournalMetricUnit = "usd" | "pct" | "r";

const METRIC_UNIT_SEGMENTS = [
  { id: "usd", label: "$" },
  { id: "pct", label: "%" },
  { id: "r", label: "R" },
] as const;

function formatMoney(value: number, missing = false): string {
  if (missing) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCompactMoney(value: number | null): string {
  if (value == null) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const prefix = `${sign}$`;
  if (abs >= 1_000_000_000) {
    return `${prefix}${(abs / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "")}B`;
  }
  if (abs >= 1_000_000) {
    return `${prefix}${(abs / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  }
  if (abs >= 1_000) {
    return `${prefix}${(abs / 1_000).toFixed(2).replace(/\.?0+$/, "")}K`;
  }
  return formatMoney(value);
}

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value * 1000) / 10}%`;
}

function formatSignedPercent(value: number | null): string {
  if (value == null) return "—";
  const pct = Math.round(value * 1000) / 10;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

function formatR(value: number | null, missing = false): string {
  if (missing || value == null) return "—";
  const rounded = Math.round(value * 100) / 100;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(2).replace(/\.?0+$/, "")}R`;
}

function pnlTone(netPnL: number): EdgeTone {
  if (netPnL > 0) return "positive";
  if (netPnL < 0) return "negative";
  return "neutral";
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const sweep = endAngle >= startAngle ? 1 : 0;
  const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

function buildAvgWinLossBarWidths(
  avgWin: number | null,
  avgLoss: number | null,
): { winPct: number; lossPct: number; hasData: boolean } {
  const absWin = avgWin != null ? Math.abs(avgWin) : 0;
  const absLoss = avgLoss != null ? Math.abs(avgLoss) : 0;
  const gross = absWin + absLoss;
  if (gross === 0) {
    return { winPct: 0, lossPct: 0, hasData: false };
  }
  return {
    winPct: (absWin / gross) * 100,
    lossPct: (absLoss / gross) * 100,
    hasData: true,
  };
}

function avgWinLossHoverPillLabel(
  segment: AvgWinLossSegment,
  avgWin: number | null,
  avgLoss: number | null,
  unit: JournalMetricUnit,
): string {
  if (unit === "r") {
    return segment === "win"
      ? `${formatR(avgWin)} Avg Win`
      : `${formatR(avgLoss)} Avg Loss`;
  }
  if (unit === "pct") {
    return segment === "win"
      ? `${formatSignedPercent(avgWin)} Avg Win`
      : `${formatSignedPercent(avgLoss)} Avg Loss`;
  }
  return segment === "win"
    ? `${formatMoney(avgWin ?? 0, avgWin == null)} Avg Win`
    : `${formatMoney(avgLoss ?? 0, avgLoss == null)} Avg Loss`;
}

function resolveExpectedValueDisplay(
  stats: JournalStats,
  dashboardMetrics: JournalDashboardMetrics,
  unit: JournalMetricUnit,
): {
  expectancy: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  missing: boolean;
} {
  const { startingEquity, rStats } = dashboardMetrics;
  if (unit === "r") {
    const missing = rStats.tradeCountWithR === 0;
    return {
      expectancy: rStats.expectancyR,
      avgWin: rStats.avgWinR,
      avgLoss: rStats.avgLossR,
      missing,
    };
  }
  if (unit === "pct") {
    const missing = startingEquity == null;
    return {
      expectancy: scaleJournalMetricByStartingEquity(stats.expectancy, startingEquity),
      avgWin: scaleJournalMetricByStartingEquity(stats.avgWin, startingEquity),
      avgLoss: scaleJournalMetricByStartingEquity(stats.avgLoss, startingEquity),
      missing,
    };
  }
  return {
    expectancy: stats.expectancy,
    avgWin: stats.avgWin,
    avgLoss: stats.avgLoss,
    missing: stats.expectancy == null,
  };
}

function formatExpectedValue(
  value: number | null,
  unit: JournalMetricUnit,
  missing: boolean,
): string {
  if (missing || value == null) return "—";
  if (unit === "r") return formatR(value);
  if (unit === "pct") return formatSignedPercent(value);
  return formatMoney(value);
}

function formatAvgWinLossLabel(
  value: number | null,
  unit: JournalMetricUnit,
): string {
  if (value == null) return "—";
  if (unit === "r") return formatR(value);
  if (unit === "pct") return formatSignedPercent(value);
  return formatCompactMoney(value);
}

function tradeCountLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

function formatPaceRate(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function outcomePillLabel(segment: OutcomeSegment, count: number): string {
  switch (segment) {
    case "win":
      return tradeCountLabel(count, "Winning Trade", "Winning Trades");
    case "breakeven":
      return count === 1 ? "1 Break even trade" : `${count} Break even trades`;
    case "loss":
      return tradeCountLabel(count, "Losing Trade", "Losing Trades");
  }
}

type GaugeArcSegment = {
  id: OutcomeSegment;
  count: number;
  startAngle: number;
  endAngle: number;
  shortLabel: string;
  color: string;
};

function buildGaugeArcSegments(
  wins: number,
  breakeven: number,
  losses: number,
): GaugeArcSegment[] {
  const total = wins + breakeven + losses;
  if (total === 0) return [];

  const startAngle = Math.PI;
  const arcSpan = Math.PI;
  let cursor = startAngle;

  const defs: { id: OutcomeSegment; count: number; shortLabel: string; color: string }[] = [
    { id: "win", count: wins, shortLabel: "Winner", color: "var(--edge-positive)" },
    {
      id: "breakeven",
      count: breakeven,
      shortLabel: "Break even",
      color: "var(--edge-accent-blue)",
    },
    { id: "loss", count: losses, shortLabel: "Loser", color: "var(--edge-negative)" },
  ];

  const segments: GaugeArcSegment[] = [];
  for (const def of defs) {
    if (def.count <= 0) continue;
    const sweep = (def.count / total) * arcSpan;
    const endAngle = cursor + sweep;
    segments.push({
      id: def.id,
      count: def.count,
      startAngle: cursor,
      endAngle,
      shortLabel: def.shortLabel,
      color: def.color,
    });
    cursor = endAngle;
  }
  return segments;
}

type Props = {
  stats: JournalStats;
  accountEquity: number | null;
  dashboardMetrics: JournalDashboardMetrics;
  frequency?: JournalTradeFrequency;
};

export default function JournalSummaryCards({
  stats,
  accountEquity,
  dashboardMetrics,
  frequency = EMPTY_JOURNAL_TRADE_FREQUENCY,
}: Props) {
  const { mode } = useTileDensity();
  const heroSpan = journalHeroCardSpanClass(mode);

  return (
    <section data-testid="journal-summary-cards">
      <div className={journalSummaryGridClass(mode)}>
        <AccountEquityMetricCard
          accountEquity={accountEquity}
          netPnL={stats.netPnL}
          closedCount={stats.closedCount}
          equityChangePct={dashboardMetrics.equityChangePct}
          netR={dashboardMetrics.rStats.netR}
          tradeCountWithR={dashboardMetrics.rStats.tradeCountWithR}
          frequency={frequency}
          heroSpan={heroSpan}
        />
        <WinRateMetricCard
          winRate={stats.winRate}
          winCount={stats.winCount}
          lossCount={stats.lossCount}
          closedCount={stats.closedCount}
          heroSpan={heroSpan}
        />
        <ExpectedValueMetricCard
          stats={stats}
          dashboardMetrics={dashboardMetrics}
          heroSpan={heroSpan}
        />
        <DrawdownMetricCard dashboardMetrics={dashboardMetrics} heroSpan={heroSpan} />
      </div>
    </section>
  );
}

function MetricHelpIcon({ content, ariaLabel }: { content: string; ariaLabel: string }) {
  return (
    <Tooltip content={content} theme="dark" side="top" portaled>
      <span
        className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-[var(--edge-border)] text-[9px] leading-none text-[var(--edge-text-secondary)]"
        aria-label={ariaLabel}
        tabIndex={0}
      >
        i
      </span>
    </Tooltip>
  );
}

function HeroMetricCardShell({
  testId,
  hoverPill,
  heroSpan = "md:col-span-2",
  children,
}: {
  testId: string;
  hoverPill?: ReactNode;
  heroSpan?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-testid={testId}
      className={`group relative rounded-xl border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-4 ${heroSpan}`.trim()}
    >
      {hoverPill}
      {children}
    </div>
  );
}

function HeroHoverPill({
  testId,
  visible,
  children,
}: {
  testId: string;
  visible: boolean;
  children: ReactNode;
}) {
  return (
    <span
      data-testid={testId}
      className={`pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-0.5 text-[10px] text-[var(--edge-text-secondary)] transition-opacity motion-reduce:transition-none ${
        visible ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}
    >
      {children}
    </span>
  );
}

function HeroMetricCardLayout({
  label,
  helpContent,
  helpAriaLabel,
  headerTrailing,
  value,
  secondary,
  visual,
}: {
  label: string;
  helpContent: string;
  helpAriaLabel: string;
  headerTrailing?: ReactNode;
  value: ReactNode;
  secondary?: ReactNode;
  visual?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-center gap-1 text-sm leading-none text-[var(--edge-text-secondary)]">
        <span className="truncate">{label}</span>
        <MetricHelpIcon content={helpContent} ariaLabel={helpAriaLabel} />
        {headerTrailing ? <div className="ml-auto shrink-0">{headerTrailing}</div> : null}
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="min-w-0">{value}</div>
          {secondary ? <div className="mt-1 min-w-0">{secondary}</div> : null}
        </div>
        {visual ? <div className="shrink-0 self-center">{visual}</div> : null}
      </div>
    </div>
  );
}

function AccountEquityMetricCard({
  accountEquity,
  netPnL,
  closedCount,
  equityChangePct,
  netR,
  tradeCountWithR,
  frequency,
  heroSpan,
}: {
  accountEquity: number | null;
  netPnL: number;
  closedCount: number;
  equityChangePct: number | null;
  netR: number | null;
  tradeCountWithR: number;
  frequency: JournalTradeFrequency;
  heroSpan: string;
}) {
  const prevEquityRef = useRef<number | null>(null);
  const equityInitializedRef = useRef(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flashTone, setFlashTone] = useState<EdgeTone | null>(null);

  useEffect(() => {
    if (accountEquity == null) {
      prevEquityRef.current = null;
      equityInitializedRef.current = false;
      setFlashTone(null);
      return;
    }

    const previous = prevEquityRef.current;
    if (!equityInitializedRef.current) {
      equityInitializedRef.current = true;
      prevEquityRef.current = accountEquity;
      return;
    }

    if (previous != null && Math.abs(accountEquity - previous) >= 0.01) {
      setFlashTone(accountEquity > previous ? "positive" : "negative");
      if (flashTimerRef.current != null) {
        clearTimeout(flashTimerRef.current);
      }
      flashTimerRef.current = setTimeout(() => {
        setFlashTone(null);
        flashTimerRef.current = null;
      }, EQUITY_FLASH_MS);
    }

    prevEquityRef.current = accountEquity;
  }, [accountEquity]);

  useEffect(
    () => () => {
      if (flashTimerRef.current != null) {
        clearTimeout(flashTimerRef.current);
      }
    },
    [],
  );

  const equityToneClass =
    flashTone != null ? toneTextClass(flashTone) : "text-[var(--edge-text-strong)]";
  const equityFlash =
    flashTone === "positive" ? "up" : flashTone === "negative" ? "down" : undefined;

  return (
    <HeroMetricCardShell
      testId="journal-account-equity-card"
      heroSpan={heroSpan}
      hoverPill={
        <HeroHoverPill testId="journal-account-equity-hover-pill" visible={false}>
          Total Trades
        </HeroHoverPill>
      }
    >
      <HeroMetricCardLayout
        label="Account equity"
        helpContent={ACCOUNT_EQUITY_HELP}
        helpAriaLabel="Account equity help"
        headerTrailing={
          <span className="inline-flex min-w-0 flex-col items-end gap-0.5 text-right">
            <span
              data-testid="journal-net-pnl-closed-count"
              className="text-xs tabular-nums text-[var(--edge-text-muted)]"
            >
              {tradeCountLabel(closedCount, "trade", "trades")}
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                data-testid="journal-trade-pace"
                className="text-[10px] tabular-nums text-[var(--edge-text-muted)]"
              >
                {frequency.tradesPerWeek == null && frequency.tradesPerMonth == null
                  ? "— /wk · — /mo"
                  : `${formatPaceRate(frequency.tradesPerWeek)}/wk · ${formatPaceRate(frequency.tradesPerMonth)}/mo`}
              </span>
              <MetricHelpIcon content={TRADE_PACE_HELP} ariaLabel="Trade pace help" />
            </span>
          </span>
        }
        value={
          <span
            data-testid="journal-account-equity-value"
            data-flash={equityFlash}
            className={`text-2xl font-semibold tabular-nums transition-colors duration-[2000ms] motion-reduce:transition-none ${equityToneClass}`}
          >
            {formatMoney(accountEquity ?? 0, accountEquity == null)}
          </span>
        }
        secondary={
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex min-w-0 items-center gap-1">
              <span
                data-testid="journal-net-pnl-suffix"
                className={`text-sm font-medium tabular-nums ${toneTextClass(pnlTone(netPnL))}`}
              >
                {formatCompactMoney(netPnL)}
              </span>
              <MetricHelpIcon content={NET_PNL_HELP} ariaLabel="Net P&L help" />
            </span>
            <span
              data-testid="journal-equity-change-pct"
              className={`text-sm font-medium tabular-nums ${
                equityChangePct == null
                  ? "text-[var(--edge-text-muted)]"
                  : toneTextClass(pnlTone(equityChangePct))
              }`}
            >
              {formatSignedPercent(equityChangePct)}
            </span>
            <span
              data-testid="journal-equity-net-r"
              className={`text-sm font-medium tabular-nums ${tradeCountWithR > 0 && netR != null ? toneTextClass(pnlTone(netR)) : "text-[var(--edge-text-muted)]"}`}
            >
              {tradeCountWithR > 0 ? formatR(netR) : "—"}
            </span>
          </span>
        }
      />
    </HeroMetricCardShell>
  );
}

function WinRateGauge({
  wins,
  breakeven,
  losses,
  onSegmentHover,
}: {
  wins: number;
  breakeven: number;
  losses: number;
  onSegmentHover: (segment: OutcomeSegment | null) => void;
}) {
  const total = wins + breakeven + losses;
  const segments = buildGaugeArcSegments(wins, breakeven, losses);
  const backgroundArc = describeArc(GAUGE_CX, GAUGE_CY, GAUGE_R, Math.PI, Math.PI * 2);

  return (
    <div
      data-testid="journal-win-rate-gauge"
      className="relative"
      style={{ width: GAUGE_SIZE, height: GAUGE_SIZE / 2 + 8 }}
    >
      <svg
        width={GAUGE_SIZE}
        height={GAUGE_SIZE / 2 + 8}
        viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE / 2 + 8}`}
        className="pointer-events-none"
        aria-hidden
      >
        <path
          d={backgroundArc}
          fill="none"
          stroke="var(--edge-border)"
          strokeWidth={GAUGE_STROKE}
          strokeLinecap="butt"
        />
        {total > 0 &&
          segments.map((segment) => (
            <path
              key={segment.id}
              data-testid={`journal-win-rate-segment-${segment.id}`}
              data-segment={segment.id}
              d={describeArc(
                GAUGE_CX,
                GAUGE_CY,
                GAUGE_R,
                segment.startAngle,
                segment.endAngle,
              )}
              fill="none"
              stroke={segment.color}
              strokeWidth={GAUGE_STROKE}
              strokeLinecap="butt"
            />
          ))}
      </svg>
      {total > 0 && (
        <div className="absolute inset-0 flex h-[70%] items-start">
          {segments.map((segment) => (
            <Tooltip
              key={segment.id}
              content={segment.shortLabel}
              theme="dark"
              side="top"
              portaled
            >
              <button
                type="button"
                data-testid={`journal-win-rate-hit-${segment.id}`}
                className="h-full cursor-help border-0 bg-transparent p-0"
                style={{ width: `${(segment.count / total) * 100}%` }}
                aria-label={segment.shortLabel}
                onMouseEnter={() => onSegmentHover(segment.id)}
                onMouseLeave={() => onSegmentHover(null)}
                onFocus={() => onSegmentHover(segment.id)}
                onBlur={() => onSegmentHover(null)}
              />
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}

function OutcomeCountBadge({
  segment,
  count,
  onHover,
}: {
  segment: OutcomeSegment;
  count: number;
  onHover: (segment: OutcomeSegment | null) => void;
}) {
  const styles: Record<OutcomeSegment, string> = {
    win: "bg-[color-mix(in_srgb,var(--edge-positive)_18%,transparent)] text-[var(--edge-positive)]",
    breakeven:
      "bg-[color-mix(in_srgb,var(--edge-accent-blue)_18%,transparent)] text-[var(--edge-accent-blue)]",
    loss: "bg-[color-mix(in_srgb,var(--edge-negative)_18%,transparent)] text-[var(--edge-negative)]",
  };

  return (
    <span
      data-testid={`journal-win-rate-badge-${segment}`}
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-medium tabular-nums ${styles[segment]}`}
      onMouseEnter={() => onHover(segment)}
      onMouseLeave={() => onHover(null)}
    >
      {count}
    </span>
  );
}

function WinRateMetricCard({
  winRate,
  winCount,
  lossCount,
  closedCount,
  heroSpan,
}: {
  winRate: number | null;
  winCount: number;
  lossCount: number;
  closedCount: number;
  heroSpan: string;
}) {
  const breakevenCount = Math.max(0, closedCount - winCount - lossCount);
  const [hoveredSegment, setHoveredSegment] = useState<OutcomeSegment | null>(null);

  const hoverPillText =
    hoveredSegment != null
      ? outcomePillLabel(hoveredSegment, {
          win: winCount,
          breakeven: breakevenCount,
          loss: lossCount,
        }[hoveredSegment])
      : null;

  return (
    <HeroMetricCardShell
      testId="journal-win-rate-card"
      heroSpan={heroSpan}
      hoverPill={
        <HeroHoverPill
          testId="journal-win-rate-hover-pill"
          visible={hoverPillText != null}
        >
          {hoverPillText ?? ""}
        </HeroHoverPill>
      }
    >
      <HeroMetricCardLayout
        label="Trade win %"
        helpContent={WIN_RATE_HELP}
        helpAriaLabel="Trade win % help"
        value={
          <div
            data-testid="journal-win-rate-value"
            className="text-2xl font-semibold tabular-nums text-[var(--edge-text-strong)]"
          >
            {formatPercent(winRate)}
          </div>
        }
        visual={
          <div className="flex shrink-0 flex-col items-center">
            <WinRateGauge
              wins={winCount}
              breakeven={breakevenCount}
              losses={lossCount}
              onSegmentHover={setHoveredSegment}
            />
            <div className="mt-0.5 flex items-center gap-1.5">
              <OutcomeCountBadge
                segment="win"
                count={winCount}
                onHover={setHoveredSegment}
              />
              <OutcomeCountBadge
                segment="breakeven"
                count={breakevenCount}
                onHover={setHoveredSegment}
              />
              <OutcomeCountBadge
                segment="loss"
                count={lossCount}
                onHover={setHoveredSegment}
              />
            </div>
          </div>
        }
      />
    </HeroMetricCardShell>
  );
}

function AvgWinLossBar({
  avgWin,
  avgLoss,
  unit,
  onSegmentHover,
}: {
  avgWin: number | null;
  avgLoss: number | null;
  unit: JournalMetricUnit;
  onSegmentHover: (segment: AvgWinLossSegment | null) => void;
}) {
  const { winPct, lossPct, hasData } = buildAvgWinLossBarWidths(avgWin, avgLoss);

  return (
    <div data-testid="journal-avg-win-loss-bar" className="w-full min-w-0">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--edge-border)]">
        {hasData && winPct > 0 && (
          <div
            data-testid="journal-avg-win-loss-segment-win"
            className="h-full cursor-help bg-[var(--edge-positive)]"
            style={{ width: `${winPct}%` }}
            onMouseEnter={() => onSegmentHover("win")}
            onMouseLeave={() => onSegmentHover(null)}
          />
        )}
        {hasData && lossPct > 0 && (
          <div
            data-testid="journal-avg-win-loss-segment-loss"
            className="h-full cursor-help bg-[var(--edge-negative)]"
            style={{ width: `${lossPct}%` }}
            onMouseEnter={() => onSegmentHover("loss")}
            onMouseLeave={() => onSegmentHover(null)}
          />
        )}
      </div>
      <div className="mt-1 flex w-full items-center justify-between gap-2 text-[10px] tabular-nums">
        <span
          data-testid="journal-avg-win-loss-label-win"
          className="text-[var(--edge-positive)]"
        >
          {formatAvgWinLossLabel(avgWin, unit)}
        </span>
        <span
          data-testid="journal-avg-win-loss-label-loss"
          className="text-right text-[var(--edge-negative)]"
        >
          {formatAvgWinLossLabel(avgLoss, unit)}
        </span>
      </div>
    </div>
  );
}

function ExpectedValueMetricCard({
  stats,
  dashboardMetrics,
  heroSpan,
}: {
  stats: JournalStats;
  dashboardMetrics: JournalDashboardMetrics;
  heroSpan: string;
}) {
  const [unit, setUnit] = useState<JournalMetricUnit>("usd");
  const [hoveredSegment, setHoveredSegment] = useState<AvgWinLossSegment | null>(null);
  const display = resolveExpectedValueDisplay(stats, dashboardMetrics, unit);

  const hoverPillText =
    hoveredSegment != null
      ? avgWinLossHoverPillLabel(
          hoveredSegment,
          display.avgWin,
          display.avgLoss,
          unit,
        )
      : null;

  const expectancyTone =
    display.expectancy != null && !display.missing
      ? pnlTone(display.expectancy)
      : ("neutral" as EdgeTone);

  return (
    <HeroMetricCardShell
      testId="journal-expected-value-card"
      heroSpan={heroSpan}
      hoverPill={
        <HeroHoverPill
          testId="journal-expected-value-hover-pill"
          visible={hoverPillText != null}
        >
          {hoverPillText ?? ""}
        </HeroHoverPill>
      }
    >
      <HeroMetricCardLayout
        label="Expected value"
        helpContent={EXPECTED_VALUE_HELP}
        helpAriaLabel="Expected value help"
        headerTrailing={
          <EdgeSegmentedTabs
            segments={[...METRIC_UNIT_SEGMENTS]}
            value={unit}
            onChange={(next) => setUnit(next as JournalMetricUnit)}
            className="w-[7.5rem]"
          />
        }
        value={
          <div
            data-testid="journal-expected-value"
            className={`text-2xl font-semibold tabular-nums ${toneTextClass(expectancyTone)}`}
          >
            {formatExpectedValue(display.expectancy, unit, display.missing)}
          </div>
        }
        secondary={
          <AvgWinLossBar
            avgWin={display.avgWin}
            avgLoss={display.avgLoss}
            unit={unit}
            onSegmentHover={setHoveredSegment}
          />
        }
      />
    </HeroMetricCardShell>
  );
}

function DrawdownBar({
  currentDdUsd,
  maxDdUsd,
}: {
  currentDdUsd: number;
  maxDdUsd: number;
}) {
  const ratio = maxDdUsd > 0 ? Math.min(1, currentDdUsd / maxDdUsd) : 0;

  return (
    <div data-testid="journal-drawdown-bar" className="w-full min-w-[5.5rem]">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--edge-border)]">
        {maxDdUsd > 0 && (
          <div
            data-testid="journal-drawdown-bar-fill"
            className="h-full bg-[var(--edge-negative)]"
            style={{ width: `${ratio * 100}%` }}
          />
        )}
      </div>
      <div className="mt-1 text-[10px] tabular-nums text-[var(--edge-text-muted)]">
        Current {formatCompactMoney(-currentDdUsd)}
      </div>
    </div>
  );
}

function DrawdownMetricCard({
  dashboardMetrics,
  heroSpan,
}: {
  dashboardMetrics: JournalDashboardMetrics;
  heroSpan: string;
}) {
  const { drawdown, rStats } = dashboardMetrics;
  const hasDrawdown = drawdown.maxDdUsd > 0;
  const tone = hasDrawdown ? "negative" : "neutral";

  return (
    <HeroMetricCardShell testId="journal-drawdown-card" heroSpan={heroSpan}>
      <HeroMetricCardLayout
        label="Max drawdown"
        helpContent={DRAWDOWN_HELP}
        helpAriaLabel="Max drawdown help"
        value={
          <div
            data-testid="journal-drawdown-value"
            className={`text-2xl font-semibold tabular-nums ${toneTextClass(tone)}`}
          >
            {hasDrawdown ? formatCompactMoney(-drawdown.maxDdUsd) : "—"}
          </div>
        }
        secondary={
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm tabular-nums">
            <span
              data-testid="journal-drawdown-pct"
              className={`font-medium ${drawdown.maxDdPct != null ? toneTextClass("negative") : "text-[var(--edge-text-muted)]"}`}
            >
              {drawdown.maxDdPct != null ? formatPercent(drawdown.maxDdPct) : "—"}
            </span>
            <span
              data-testid="journal-drawdown-r"
              className={`font-medium ${rStats.maxDdR != null && rStats.tradeCountWithR > 0 ? toneTextClass("negative") : "text-[var(--edge-text-muted)]"}`}
            >
              {rStats.tradeCountWithR > 0 && rStats.maxDdR != null
                ? formatR(-rStats.maxDdR)
                : "—"}
            </span>
          </span>
        }
        visual={
          <DrawdownBar
            currentDdUsd={drawdown.currentDdUsd}
            maxDdUsd={drawdown.maxDdUsd}
          />
        }
      />
    </HeroMetricCardShell>
  );
}

