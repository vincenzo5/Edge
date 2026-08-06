"use client";

import { useMemo, useState } from "react";
import { useAccountOptional } from "@/app/components/AccountProvider";
import JournalSummaryCards from "@/app/components/journal/JournalSummaryCards";
import JournalTradeDetailModal from "@/app/components/journal/JournalTradeDetailModal";
import JournalScopeBar from "@/app/components/journal/JournalScopeBar";
import JournalCalendar from "@/app/components/journal/JournalCalendar";
import JournalDaySummaryModal from "@/app/components/journal/JournalDaySummaryModal";
import JournalEquityChart from "@/app/components/journal/JournalEquityChart";
import JournalBreakdownReport from "@/app/components/journal/JournalBreakdownReport";
import JournalCompareReport from "@/app/components/journal/JournalCompareReport";
import JournalTimeReport from "@/app/components/journal/JournalTimeReport";
import JournalModuleHeader from "@/app/components/journal/JournalModuleHeader";
import JournalTradeListCard from "@/app/components/journal/JournalTradeListCard";
import JournalLivePositionsCard from "@/app/components/journal/JournalLivePositionsCard";
import JournalContentGate from "@/app/components/journal/JournalContentGate";
import JournalHistorySyncChip from "@/app/components/journal/JournalHistorySyncChip";
import JournalViewTabs from "@/app/components/journal/JournalViewTabs";
import {
  JournalTileActions,
  JournalTileTitle,
} from "@/app/components/app-workspace/JournalTileChrome";
import { useJournalTileViewOptional } from "@/app/components/app-workspace/JournalTileViewContext";
import { useTileDensity } from "@/app/components/app-workspace/TileDensityContext";
import { journalDashboardSectionGridClass } from "@/lib/responsive/tileDensity";
import { useJournalTrades } from "@/app/components/journal/JournalTradesProvider";
import {
  filterTradesClosedOnDate,
  computeDailyPnL,
  computeEquityCurve,
  computeJournalStats,
  computeBreakdownReport,
  computeTimeBreakdownReport,
  computeJournalDashboardMetrics,
  computeTradeFrequency,
  EMPTY_JOURNAL_FILTERS,
  filterJournalTrades,
  scopeClosedTradesForReporting,
  type JournalFilters,
  type JournalStatsWindow,
  type JournalReportTradeInput,
} from "@/lib/journal/journalStats";
import { defaultJournalScopeState } from "@/lib/journal/journalFilterHelpers";
import { parseSummaryTagNumber } from "@/lib/marketData/contracts/brokerage";

function currentCalendarMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export default function JournalDashboardView() {
  const account = useAccountOptional();
  const tileView = useJournalTileViewOptional();
  const { mode } = useTileDensity();
  const { allTrades, loadTrades, setAllTrades } = useJournalTrades();
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [window, setWindow] = useState<JournalStatsWindow>(defaultJournalScopeState().window);
  const [filters, setFilters] = useState<JournalFilters>(EMPTY_JOURNAL_FILTERS);
  const [calendarMonth, setCalendarMonth] = useState(currentCalendarMonth);
  const [daySummaryDate, setDaySummaryDate] = useState<string | null>(null);

  const reportTrades = allTrades as JournalReportTradeInput[];

  const filteredTrades = useMemo(
    () => filterJournalTrades(reportTrades, filters),
    [reportTrades, filters],
  );

  const scopedClosedTrades = useMemo(
    () => scopeClosedTradesForReporting(reportTrades, filters, window),
    [reportTrades, filters, window],
  );

  const stats = useMemo(() => {
    const kpi = computeJournalStats(scopedClosedTrades, "all");
    return {
      ...kpi,
      tradeCount: filteredTrades.length,
      closedCount: scopedClosedTrades.length,
    };
  }, [scopedClosedTrades, filteredTrades]);

  const calendarDailyRows = useMemo(() => {
    const { closedDate: _day, ...filtersForCalendar } = filters;
    const calendarScoped = scopeClosedTradesForReporting(
      reportTrades,
      filtersForCalendar,
      window,
    );
    return computeDailyPnL(calendarScoped);
  }, [reportTrades, filters, window]);

  const equityPoints = useMemo(() => computeEquityCurve(scopedClosedTrades), [scopedClosedTrades]);

  const setupBreakdownRows = useMemo(
    () => computeBreakdownReport(scopedClosedTrades, "setup"),
    [scopedClosedTrades],
  );
  const tagBreakdownRows = useMemo(
    () => computeBreakdownReport(scopedClosedTrades, "tag"),
    [scopedClosedTrades],
  );
  const ratingBreakdownRows = useMemo(
    () => computeBreakdownReport(scopedClosedTrades, "rating"),
    [scopedClosedTrades],
  );

  const hourBreakdownRows = useMemo(
    () => computeTimeBreakdownReport(scopedClosedTrades, "hour"),
    [scopedClosedTrades],
  );
  const weekdayBreakdownRows = useMemo(
    () => computeTimeBreakdownReport(scopedClosedTrades, "weekday"),
    [scopedClosedTrades],
  );

  const recentClosedTrades = useMemo(() => {
    const scopedSet = new Set(scopedClosedTrades);
    return allTrades
      .filter(
        (trade) =>
          trade.status === "closed" &&
          scopedSet.has(trade as JournalReportTradeInput),
      )
      .sort((a, b) => b.closedAt!.localeCompare(a.closedAt!));
  }, [allTrades, scopedClosedTrades]);

  const livePositionsForAccount = useMemo(() => {
    const accountId = account?.activeTradingAccountId?.trim();
    const positions = account?.positions ?? [];
    if (!accountId) return positions;
    return positions.filter((row) => (row.account?.trim() ?? "") === accountId);
  }, [account?.activeTradingAccountId, account?.positions]);

  const daySummaryTrades = useMemo(() => {
    if (!daySummaryDate) return [];
    const { closedDate: _day, ...filtersForDaySummary } = filters;
    const scoped = scopeClosedTradesForReporting(reportTrades, filtersForDaySummary, window);
    return filterTradesClosedOnDate(scoped, daySummaryDate) as typeof allTrades;
  }, [daySummaryDate, reportTrades, filters, window]);

  const selectedTrade = allTrades.find((trade) => trade.id === selectedTradeId) ?? null;

  const accountEquity = parseSummaryTagNumber(
    account?.summary?.tags ?? {},
    "NetLiquidation",
  );

  const dashboardMetrics = useMemo(
    () => computeJournalDashboardMetrics(scopedClosedTrades, accountEquity),
    [scopedClosedTrades, accountEquity],
  );

  const tradeFrequency = useMemo(
    () => computeTradeFrequency(scopedClosedTrades, window, filters),
    [scopedClosedTrades, window, filters],
  );

  return (
    <>
      <JournalModuleHeader
        sticky
        title={tileView ? <JournalTileTitle /> : undefined}
        leading={<JournalViewTabs />}
        trailing={tileView ? <JournalTileActions /> : undefined}
      >
        {tileView == null ? <JournalHistorySyncChip /> : null}
        <JournalScopeBar
          mode="dashboard"
          filters={filters}
          onChange={setFilters}
          window={window}
          onWindowChange={setWindow}
        />
      </JournalModuleHeader>
      <main className="min-h-0 flex-1 overflow-y-auto p-4" data-testid="journal-dashboard-view">
        <JournalContentGate variant="dashboard" onImported={() => void loadTrades()}>
          <div>
            <JournalSummaryCards
              stats={stats}
              accountEquity={accountEquity}
              dashboardMetrics={dashboardMetrics}
              frequency={tradeFrequency}
            />
          </div>
          <div className={journalDashboardSectionGridClass(mode, "min-h-96")}>
            <div className="h-full min-h-0">
              <JournalCalendar
                year={calendarMonth.year}
                month={calendarMonth.month}
                dailyRows={calendarDailyRows}
                selectedDate={daySummaryDate}
                onDayClick={setDaySummaryDate}
                onMonthChange={(year, month) => setCalendarMonth({ year, month })}
              />
            </div>
            <div className="h-full min-h-0">
              <JournalEquityChart points={equityPoints} />
            </div>
          </div>
          <JournalBreakdownReport
            setupRows={setupBreakdownRows}
            tagRows={tagBreakdownRows}
            ratingRows={ratingBreakdownRows}
          />
          <div className={journalDashboardSectionGridClass(mode, "min-h-72")}>
            <JournalCompareReport baseTrades={scopedClosedTrades} />
            <JournalTimeReport hourRows={hourBreakdownRows} weekdayRows={weekdayBreakdownRows} />
          </div>
          <div className={journalDashboardSectionGridClass(mode, "min-h-80")}>
            <JournalTradeListCard
              title="Recent trades"
              testId="journal-recent-trades-card"
              variant="recent"
              trades={recentClosedTrades}
              onSelectTrade={setSelectedTradeId}
            />
            <JournalLivePositionsCard positions={livePositionsForAccount} />
          </div>
        </JournalContentGate>
      </main>
      <JournalDaySummaryModal
        open={daySummaryDate != null}
        date={daySummaryDate}
        trades={daySummaryTrades}
        onClose={() => setDaySummaryDate(null)}
        onSelectTrade={setSelectedTradeId}
      />
      <JournalTradeDetailModal
        trade={selectedTrade}
        onClose={() => setSelectedTradeId(null)}
        onUpdated={(trade) => {
          setAllTrades((prev) => prev.map((row) => (row.id === trade.id ? trade : row)));
        }}
      />
    </>
  );
}
