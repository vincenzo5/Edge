"use client";

import { useState, type ReactNode } from "react";
import Tooltip from "@/app/components/Tooltip";
import { toneTextClass, type EdgeTone } from "@/lib/design-system/edge";
import type { JournalStats } from "@/lib/journal/journalStats";

const ACCOUNT_EQUITY_HELP =
  "Total portfolio value (net liquidation) from your connected IB account.";

const NET_PNL_HELP =
  "The total realized net profit and loss for all closed trades.";

const WIN_RATE_HELP =
  "Reflects the percentage of your winning trades out of total trades taken.";

const PROFIT_FACTOR_HELP =
  "Total profits divided by total losses. A profit factor above 1.0 indicates a profitable trading system.";

const AVG_WIN_LOSS_HELP =
  "The average profit on all winning and losing trades.";

const GAUGE_SIZE = 88;
const GAUGE_CX = GAUGE_SIZE / 2;
const GAUGE_CY = GAUGE_SIZE / 2 + 6;
const GAUGE_R = 32;
const GAUGE_STROKE = 7;

const DONUT_SIZE = 56;
const DONUT_CX = DONUT_SIZE / 2;
const DONUT_CY = DONUT_SIZE / 2;
const DONUT_R = 22;
const DONUT_STROKE = 6;
const DONUT_START = -Math.PI / 2;

type OutcomeSegment = "win" | "breakeven" | "loss";
type ProfitFactorSegment = "profit" | "loss";
type AvgWinLossSegment = "win" | "loss";

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

function describeCircleSegment(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  sweep: number,
): string {
  if (sweep >= Math.PI * 2 - 1e-6) {
    const mid = startAngle + Math.PI;
    return `${describeArc(cx, cy, r, startAngle, mid)} ${describeArc(cx, cy, r, mid, startAngle + Math.PI * 2)}`;
  }
  return describeArc(cx, cy, r, startAngle, startAngle + sweep);
}

function buildProfitFactorDonutSweeps(totalProfit: number, totalLoss: number): {
  profitSweep: number;
  lossSweep: number;
  hasData: boolean;
} {
  const absLoss = Math.abs(totalLoss);
  const gross = totalProfit + absLoss;
  if (gross === 0) {
    return { profitSweep: 0, lossSweep: 0, hasData: false };
  }
  const fullCircle = Math.PI * 2;
  const profitSweep = (totalProfit / gross) * fullCircle;
  const lossSweep = (absLoss / gross) * fullCircle;
  return { profitSweep, lossSweep, hasData: true };
}

function profitFactorHoverPillLabel(
  segment: ProfitFactorSegment,
  totalProfit: number,
  totalLoss: number,
): string {
  return segment === "profit"
    ? `${formatMoney(totalProfit)} Total Profit`
    : `${formatMoney(totalLoss)} Total Loss`;
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
): string {
  return segment === "win"
    ? `${formatMoney(avgWin ?? 0, avgWin == null)} Avg Win`
    : `${formatMoney(avgLoss ?? 0, avgLoss == null)} Avg Loss`;
}

function tradeCountLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
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
};

export default function JournalSummaryCards({ stats, accountEquity }: Props) {
  return (
    <section data-testid="journal-summary-cards">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
        <AccountEquityMetricCard
          accountEquity={accountEquity}
          netPnL={stats.netPnL}
          closedCount={stats.closedCount}
        />
        <WinRateMetricCard
          winRate={stats.winRate}
          winCount={stats.winCount}
          lossCount={stats.lossCount}
          closedCount={stats.closedCount}
        />
        <ProfitFactorMetricCard
          profitFactor={stats.profitFactor}
          totalProfit={stats.totalProfit}
          totalLoss={stats.totalLoss}
        />
        <AvgWinLossMetricCard
          expectancy={stats.expectancy}
          avgWin={stats.avgWin}
          avgLoss={stats.avgLoss}
        />
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
  children,
}: {
  testId: string;
  hoverPill?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      data-testid={testId}
      className="group relative rounded-xl border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-4 md:col-span-2"
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
  visual,
}: {
  label: string;
  helpContent: string;
  helpAriaLabel: string;
  headerTrailing?: ReactNode;
  value: ReactNode;
  visual?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex h-4 items-center gap-1 text-sm leading-none text-[var(--edge-text-secondary)]">
          <span>{label}</span>
          <MetricHelpIcon content={helpContent} ariaLabel={helpAriaLabel} />
          {headerTrailing}
        </div>
        <div className="mt-1">{value}</div>
      </div>
      {visual ? <div className="shrink-0 self-start">{visual}</div> : null}
    </div>
  );
}

function AccountEquityMetricCard({
  accountEquity,
  netPnL,
  closedCount,
}: {
  accountEquity: number | null;
  netPnL: number;
  closedCount: number;
}) {
  return (
    <HeroMetricCardShell
      testId="journal-account-equity-card"
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
          <span
            data-testid="journal-net-pnl-closed-count"
            className="ml-auto text-xs tabular-nums text-[var(--edge-text-muted)]"
          >
            {tradeCountLabel(closedCount, "trade", "trades")}
          </span>
        }
        value={
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <span
              data-testid="journal-account-equity-value"
              className="text-2xl font-semibold tabular-nums text-[var(--edge-text-strong)]"
            >
              {formatMoney(accountEquity ?? 0, accountEquity == null)}
            </span>
            <span className="flex items-center gap-1">
              <span
                data-testid="journal-net-pnl-suffix"
                className={`text-base font-medium tabular-nums ${toneTextClass(pnlTone(netPnL))}`}
              >
                {formatMoney(netPnL)}
              </span>
              <MetricHelpIcon content={NET_PNL_HELP} ariaLabel="Net P&L help" />
            </span>
          </div>
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
}: {
  winRate: number | null;
  winCount: number;
  lossCount: number;
  closedCount: number;
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

function ProfitFactorDonut({
  totalProfit,
  totalLoss,
  onSegmentHover,
}: {
  totalProfit: number;
  totalLoss: number;
  onSegmentHover: (segment: ProfitFactorSegment | null) => void;
}) {
  const { profitSweep, lossSweep, hasData } = buildProfitFactorDonutSweeps(
    totalProfit,
    totalLoss,
  );
  const backgroundCircle = describeCircleSegment(
    DONUT_CX,
    DONUT_CY,
    DONUT_R,
    DONUT_START,
    Math.PI * 2,
  );
  const profitEnd = DONUT_START + profitSweep;

  return (
    <div
      data-testid="journal-profit-factor-donut"
      className="relative shrink-0"
      style={{ width: DONUT_SIZE, height: DONUT_SIZE }}
    >
      <svg
        width={DONUT_SIZE}
        height={DONUT_SIZE}
        viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
        aria-hidden
      >
        <path
          d={backgroundCircle}
          fill="none"
          stroke="var(--edge-border)"
          strokeWidth={DONUT_STROKE}
          strokeLinecap="butt"
        />
        {hasData && profitSweep > 0 && (
          <path
            data-testid="journal-profit-factor-segment-profit"
            d={describeCircleSegment(DONUT_CX, DONUT_CY, DONUT_R, DONUT_START, profitSweep)}
            fill="none"
            stroke="var(--edge-positive)"
            strokeWidth={DONUT_STROKE}
            strokeLinecap="butt"
            className="cursor-help"
            onMouseEnter={() => onSegmentHover("profit")}
            onMouseLeave={() => onSegmentHover(null)}
          />
        )}
        {hasData && lossSweep > 0 && (
          <path
            data-testid="journal-profit-factor-segment-loss"
            d={describeCircleSegment(DONUT_CX, DONUT_CY, DONUT_R, profitEnd, lossSweep)}
            fill="none"
            stroke="var(--edge-negative)"
            strokeWidth={DONUT_STROKE}
            strokeLinecap="butt"
            className="cursor-help"
            onMouseEnter={() => onSegmentHover("loss")}
            onMouseLeave={() => onSegmentHover(null)}
          />
        )}
      </svg>
    </div>
  );
}

function ProfitFactorMetricCard({
  profitFactor,
  totalProfit,
  totalLoss,
}: {
  profitFactor: number | null;
  totalProfit: number;
  totalLoss: number;
}) {
  const [hoveredSegment, setHoveredSegment] = useState<ProfitFactorSegment | null>(null);

  const hoverPillText =
    hoveredSegment != null
      ? profitFactorHoverPillLabel(hoveredSegment, totalProfit, totalLoss)
      : null;

  return (
    <HeroMetricCardShell
      testId="journal-profit-factor-card"
      hoverPill={
        <HeroHoverPill
          testId="journal-profit-factor-hover-pill"
          visible={hoverPillText != null}
        >
          {hoverPillText ?? ""}
        </HeroHoverPill>
      }
    >
      <HeroMetricCardLayout
        label="Profit factor"
        helpContent={PROFIT_FACTOR_HELP}
        helpAriaLabel="Profit factor help"
        value={
          <div
            data-testid="journal-profit-factor-value"
            className="text-2xl font-semibold tabular-nums text-[var(--edge-text-strong)]"
            onMouseEnter={() => setHoveredSegment("profit")}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            {profitFactor?.toFixed(2) ?? "—"}
          </div>
        }
        visual={
          <ProfitFactorDonut
            totalProfit={totalProfit}
            totalLoss={totalLoss}
            onSegmentHover={setHoveredSegment}
          />
        }
      />
    </HeroMetricCardShell>
  );
}

function AvgWinLossBar({
  avgWin,
  avgLoss,
  onSegmentHover,
}: {
  avgWin: number | null;
  avgLoss: number | null;
  onSegmentHover: (segment: AvgWinLossSegment | null) => void;
}) {
  const { winPct, lossPct, hasData } = buildAvgWinLossBarWidths(avgWin, avgLoss);

  return (
    <div data-testid="journal-avg-win-loss-bar" className="w-full min-w-[7rem] max-w-[9rem]">
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
      <div className="relative mt-1 min-h-[1rem] w-full text-[10px] tabular-nums">
        <span
          data-testid="journal-avg-win-loss-label-win"
          className="absolute left-0 text-[var(--edge-positive)]"
        >
          {formatCompactMoney(avgWin)}
        </span>
        <span
          data-testid="journal-avg-win-loss-label-loss"
          className="absolute right-0 text-right text-[var(--edge-negative)]"
        >
          {formatCompactMoney(avgLoss)}
        </span>
      </div>
    </div>
  );
}

function AvgWinLossMetricCard({
  expectancy,
  avgWin,
  avgLoss,
}: {
  expectancy: number | null;
  avgWin: number | null;
  avgLoss: number | null;
}) {
  const [hoveredSegment, setHoveredSegment] = useState<AvgWinLossSegment | null>(null);

  const hoverPillText =
    hoveredSegment != null
      ? avgWinLossHoverPillLabel(hoveredSegment, avgWin, avgLoss)
      : null;

  const expectancyTone =
    expectancy != null ? pnlTone(expectancy) : ("neutral" as EdgeTone);

  return (
    <HeroMetricCardShell
      testId="journal-avg-win-loss-card"
      hoverPill={
        <HeroHoverPill
          testId="journal-avg-win-loss-hover-pill"
          visible={hoverPillText != null}
        >
          {hoverPillText ?? ""}
        </HeroHoverPill>
      }
    >
      <HeroMetricCardLayout
        label="Avg win/loss trade"
        helpContent={AVG_WIN_LOSS_HELP}
        helpAriaLabel="Avg win/loss trade help"
        value={
          <div
            data-testid="journal-avg-win-loss-expectancy"
            className={`text-2xl font-semibold tabular-nums ${toneTextClass(expectancyTone)}`}
          >
            {formatMoney(expectancy ?? 0, expectancy == null)}
          </div>
        }
        visual={
          <AvgWinLossBar
            avgWin={avgWin}
            avgLoss={avgLoss}
            onSegmentHover={setHoveredSegment}
          />
        }
      />
    </HeroMetricCardShell>
  );
}

