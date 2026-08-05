"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccountOptional } from "@/app/components/AccountProvider";
import JournalSummaryCards from "@/app/components/journal/JournalSummaryCards";
import JournalTradesTable from "@/app/components/journal/JournalTradesTable";
import JournalTradesTableControls from "@/app/components/journal/JournalTradesTableControls";
import JournalTradeDetailModal from "@/app/components/journal/JournalTradeDetailModal";
import JournalScopeBar from "@/app/components/journal/JournalScopeBar";
import JournalModuleHeader from "@/app/components/journal/JournalModuleHeader";
import JournalViewTabs from "@/app/components/journal/JournalViewTabs";
import JournalContentGate from "@/app/components/journal/JournalContentGate";
import {
  JournalTileActions,
  JournalTileTitle,
} from "@/app/components/app-workspace/JournalTileChrome";
import { useJournalTileViewOptional } from "@/app/components/app-workspace/JournalTileViewContext";
import { useJournalTrades } from "@/app/components/journal/JournalTradesProvider";
import {
  countActiveJournalFilters,
  defaultTradesScopeState,
} from "@/lib/journal/journalFilterHelpers";
import {
  computeJournalStats,
  computeJournalDashboardMetrics,
  EMPTY_JOURNAL_FILTERS,
  filterJournalTrades,
  filterOpenJournalTrades,
  scopeClosedTradesForReporting,
  scopeTradesForTradesView,
  type JournalFilters,
  type JournalReportTradeInput,
  type JournalStatsWindow,
} from "@/lib/journal/journalStats";
import {
  DEFAULT_JOURNAL_TRADES_TABLE_SORT,
  defaultJournalTradesTablePrefs,
  readJournalTradesTablePrefs,
  sortJournalTrades,
  writeJournalTradesTablePrefs,
  type JournalTradesTableColumnId,
  type JournalTradesTableSort,
} from "@/lib/journal/journalTradesTableControls";
import { parseSummaryTagNumber } from "@/lib/marketData/contracts/brokerage";
import { resolveLiveUnrealizedPnL } from "@/lib/journal/reconcileJournalOpens";

type Props = {
  variant?: "trades" | "open";
};

export default function JournalTradesView({ variant = "trades" }: Props) {
  const isOpenView = variant === "open";
  const scopeMode = isOpenView ? "open" : "trades";
  const account = useAccountOptional();
  const tileView = useJournalTileViewOptional();
  const { loading, allTrades, loadTrades, setAllTrades } = useJournalTrades();
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [filters, setFilters] = useState<JournalFilters>(EMPTY_JOURNAL_FILTERS);
  const [window, setWindow] = useState<JournalStatsWindow>("all");
  const [sort, setSort] = useState<JournalTradesTableSort>(DEFAULT_JOURNAL_TRADES_TABLE_SORT);
  const [visibleColumns, setVisibleColumns] = useState<JournalTradesTableColumnId[]>(
    defaultJournalTradesTablePrefs().visibleColumns,
  );
  const [columnOrder, setColumnOrder] = useState<JournalTradesTableColumnId[]>(
    defaultJournalTradesTablePrefs().columnOrder,
  );
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    const prefs = readJournalTradesTablePrefs();
    setVisibleColumns(prefs.visibleColumns);
    setColumnOrder(prefs.columnOrder);
    setPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    const prefs = readJournalTradesTablePrefs();
    writeJournalTradesTablePrefs({
      visibleColumns,
      columnOrder,
      pageSize: prefs.pageSize,
    });
  }, [prefsLoaded, visibleColumns, columnOrder]);

  const reportTrades = allTrades as JournalReportTradeInput[];

  const listFilters = useMemo(
    (): JournalFilters => ({ ...filters, includeIgnored: true }),
    [filters],
  );

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

  const scopedTrades = useMemo(() => {
    const scoped = isOpenView
      ? filterOpenJournalTrades(reportTrades, listFilters)
      : scopeTradesForTradesView(reportTrades, listFilters, window);
    const scopedSet = new Set(scoped);
    return allTrades.filter((trade) => scopedSet.has(trade as JournalReportTradeInput));
  }, [allTrades, reportTrades, listFilters, window, isOpenView]);

  const sortedTrades = useMemo(
    () => sortJournalTrades(scopedTrades, sort),
    [scopedTrades, sort],
  );

  const selectedTrade = sortedTrades.find((trade) => trade.id === selectedTradeId) ?? null;

  const emptyVariant = useMemo(() => {
    if (loading) return "none" as const;
    if (allTrades.length === 0) return "no-trades" as const;
    if (scopedTrades.length === 0) {
      if (
        isOpenView &&
        countActiveJournalFilters(filters, { mode: "open" }) === 0
      ) {
        return "no-open" as const;
      }
      return "filtered" as const;
    }
    return "none" as const;
  }, [loading, allTrades.length, scopedTrades.length, isOpenView, filters]);

  const accountEquity = parseSummaryTagNumber(
    account?.summary?.tags ?? {},
    "NetLiquidation",
  );

  const dashboardMetrics = useMemo(
    () => computeJournalDashboardMetrics(scopedClosedTrades, accountEquity),
    [scopedClosedTrades, accountEquity],
  );

  const liveUnrealizedByTradeId = useMemo(() => {
    if (!isOpenView) return {};
    const positions = account?.positions ?? [];
    const accountId = account?.activeTradingAccountId ?? null;
    const map: Record<string, number | null> = {};
    for (const trade of scopedTrades) {
      if (trade.status !== "open") continue;
      map[trade.id] = resolveLiveUnrealizedPnL(trade, positions, accountId);
    }
    return map;
  }, [isOpenView, scopedTrades, account?.positions, account?.activeTradingAccountId]);

  const tableVisibleColumns = useMemo((): JournalTradesTableColumnId[] => {
    if (!isOpenView || visibleColumns.includes("netPnL")) {
      return visibleColumns;
    }
    return [...visibleColumns, "netPnL"];
  }, [isOpenView, visibleColumns]);

  function handleClearFilters() {
    const defaults = defaultTradesScopeState();
    setFilters(defaults.filters);
    setWindow(defaults.window);
  }

  return (
    <>
      <JournalModuleHeader
        sticky
        title={tileView ? <JournalTileTitle /> : undefined}
        leading={<JournalViewTabs />}
        trailing={tileView ? <JournalTileActions /> : undefined}
      >
        <JournalScopeBar
          mode={scopeMode}
          filters={filters}
          onChange={setFilters}
          window={window}
          onWindowChange={setWindow}
        />
      </JournalModuleHeader>
      <main
        className="flex min-h-0 flex-1 flex-col overflow-hidden p-4"
        data-testid={isOpenView ? "journal-open-positions-view" : "journal-trades-view"}
      >
        <JournalContentGate variant="trades" onImported={() => void loadTrades()}>
          <JournalSummaryCards
            stats={stats}
            accountEquity={accountEquity}
            dashboardMetrics={dashboardMetrics}
          />
          <div className="mt-4 flex min-h-0 flex-1 flex-col">
            {emptyVariant === "none" ? (
              <JournalTradesTableControls
                meta={{ total: sortedTrades.length }}
                visibleColumns={tableVisibleColumns}
                columnOrder={columnOrder}
                onVisibleColumnsChange={setVisibleColumns}
                onColumnOrderChange={setColumnOrder}
              />
            ) : null}
            <JournalTradesTable
              trades={sortedTrades}
              selectedTradeId={selectedTradeId}
              onSelectTrade={setSelectedTradeId}
              sort={sort}
              onSortChange={setSort}
              visibleColumns={tableVisibleColumns}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
              emptyVariant={emptyVariant}
              onClearFilters={handleClearFilters}
              openPositionsMode={isOpenView}
              liveUnrealizedByTradeId={liveUnrealizedByTradeId}
            />
          </div>
        </JournalContentGate>
      </main>
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
