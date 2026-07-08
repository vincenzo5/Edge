"use client";

import { useMemo, useState } from "react";
import { useAccountOptional } from "@/app/components/AccountProvider";
import JournalSummaryCards from "@/app/components/journal/JournalSummaryCards";
import JournalTradeDetailDrawer from "@/app/components/journal/JournalTradeDetailDrawer";
import JournalScopeBar from "@/app/components/journal/JournalScopeBar";
import JournalCalendar from "@/app/components/journal/JournalCalendar";
import JournalDaySummaryModal from "@/app/components/journal/JournalDaySummaryModal";
import JournalEquityChart from "@/app/components/journal/JournalEquityChart";
import JournalModuleHeader from "@/app/components/journal/JournalModuleHeader";
import JournalTradeListCard from "@/app/components/journal/JournalTradeListCard";
import JournalContentGate from "@/app/components/journal/JournalContentGate";
import { useJournalTrades } from "@/app/components/journal/JournalTradesProvider";
import {
  filterTradesClosedOnDate,
  computeDailyPnL,
  computeEquityCurve,
  computeJournalStats,
  EMPTY_JOURNAL_FILTERS,
  filterJournalTrades,
  filterOpenJournalTrades,
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

  const openTrades = useMemo(() => {
    const openScoped = filterOpenJournalTrades(reportTrades, filters);
    const openSet = new Set(openScoped);
    return allTrades
      .filter(
        (trade) => trade.status === "open" && openSet.has(trade as JournalReportTradeInput),
      )
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  }, [allTrades, reportTrades, filters]);

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

  return (
    <>
      <JournalModuleHeader title="Dashboard" showActions={false} sticky>
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
            <JournalSummaryCards stats={stats} accountEquity={accountEquity} />
          </div>
          <div className="mt-4 grid min-h-96 gap-4 lg:grid-cols-2 lg:items-stretch">
            <div className="h-full min-h-0">
              <JournalCalendar
                year={calendarMonth.year}
                month={calendarMonth.month}
                dailyRows={calendarDailyRows}
                onDayClick={setDaySummaryDate}
                onMonthChange={(year, month) => setCalendarMonth({ year, month })}
              />
            </div>
            <div className="h-full min-h-0">
              <JournalEquityChart points={equityPoints} />
            </div>
          </div>
          <div className="mt-4 grid min-h-80 gap-4 lg:grid-cols-2 lg:items-stretch">
            <JournalTradeListCard
              title="Recent trades"
              testId="journal-recent-trades-card"
              variant="recent"
              trades={recentClosedTrades}
              onSelectTrade={setSelectedTradeId}
            />
            <JournalTradeListCard
              title="Open positions"
              testId="journal-open-positions-card"
              variant="open"
              trades={openTrades}
              onSelectTrade={setSelectedTradeId}
            />
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
      <JournalTradeDetailDrawer
        trade={selectedTrade}
        onClose={() => setSelectedTradeId(null)}
        onUpdated={(trade) => {
          setAllTrades((prev) => prev.map((row) => (row.id === trade.id ? trade : row)));
        }}
      />
    </>
  );
}
