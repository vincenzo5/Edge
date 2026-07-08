"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccountOptional } from "@/app/components/AccountProvider";
import JournalSummaryCards from "@/app/components/journal/JournalSummaryCards";
import JournalTradesTable from "@/app/components/journal/JournalTradesTable";
import JournalTradesTableControls from "@/app/components/journal/JournalTradesTableControls";
import JournalTradeDetailDrawer from "@/app/components/journal/JournalTradeDetailDrawer";
import JournalScopeBar from "@/app/components/journal/JournalScopeBar";
import JournalModuleHeader from "@/app/components/journal/JournalModuleHeader";
import JournalContentGate from "@/app/components/journal/JournalContentGate";
import { useJournalTrades } from "@/app/components/journal/JournalTradesProvider";
import { defaultTradesScopeState } from "@/lib/journal/journalFilterHelpers";
import {
  computeJournalStats,
  EMPTY_JOURNAL_FILTERS,
  filterJournalTrades,
  scopeClosedTradesForReporting,
  scopeTradesForTradesView,
  type JournalFilters,
  type JournalReportTradeInput,
  type JournalStatsWindow,
} from "@/lib/journal/journalStats";
import {
  buildVisibleColumnsSet,
  DEFAULT_JOURNAL_TRADES_PAGE_SIZE,
  DEFAULT_JOURNAL_TRADES_TABLE_SORT,
  defaultJournalTradesTablePrefs,
  paginateJournalTrades,
  readJournalTradesTablePrefs,
  sortJournalTrades,
  writeJournalTradesTablePrefs,
  type JournalTradesTableColumnId,
  type JournalTradesTableDensity,
  type JournalTradesTableSort,
} from "@/lib/journal/journalTradesTableControls";
import { parseSummaryTagNumber } from "@/lib/marketData/contracts/brokerage";

export default function JournalTradesView() {
  const account = useAccountOptional();
  const { loading, allTrades, loadTrades, setAllTrades } = useJournalTrades();
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [filters, setFilters] = useState<JournalFilters>(EMPTY_JOURNAL_FILTERS);
  const [window, setWindow] = useState<JournalStatsWindow>("all");
  const [sort, setSort] = useState<JournalTradesTableSort>(DEFAULT_JOURNAL_TRADES_TABLE_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_JOURNAL_TRADES_PAGE_SIZE);
  const [visibleColumns, setVisibleColumns] = useState<JournalTradesTableColumnId[]>(
    defaultJournalTradesTablePrefs().visibleColumns,
  );
  const [density, setDensity] = useState<JournalTradesTableDensity>("compact");
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    const prefs = readJournalTradesTablePrefs();
    setVisibleColumns(prefs.visibleColumns);
    setDensity(prefs.density);
    setPageSize(prefs.pageSize);
    setPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    writeJournalTradesTablePrefs({ visibleColumns, density, pageSize });
  }, [prefsLoaded, visibleColumns, density, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, window, sort, pageSize]);

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

  const scopedTrades = useMemo(() => {
    const scoped = scopeTradesForTradesView(reportTrades, filters, window);
    const scopedSet = new Set(scoped);
    return allTrades.filter((trade) => scopedSet.has(trade as JournalReportTradeInput));
  }, [allTrades, reportTrades, filters, window]);

  const sortedTrades = useMemo(
    () => sortJournalTrades(scopedTrades, sort),
    [scopedTrades, sort],
  );

  const pageResult = useMemo(
    () => paginateJournalTrades(sortedTrades, { page, pageSize }),
    [sortedTrades, page, pageSize],
  );

  const selectedTrade = sortedTrades.find((trade) => trade.id === selectedTradeId) ?? null;

  const emptyVariant = useMemo(() => {
    if (loading) return "none" as const;
    if (allTrades.length === 0) return "no-trades" as const;
    if (scopedTrades.length === 0) return "filtered" as const;
    return "none" as const;
  }, [loading, allTrades.length, scopedTrades.length]);

  const accountEquity = parseSummaryTagNumber(
    account?.summary?.tags ?? {},
    "NetLiquidation",
  );

  function handleClearFilters() {
    const defaults = defaultTradesScopeState();
    setFilters(defaults.filters);
    setWindow(defaults.window);
  }

  return (
    <>
      <JournalModuleHeader title="Trades" onImported={() => void loadTrades()} sticky>
        <JournalScopeBar
          mode="trades"
          filters={filters}
          onChange={setFilters}
          window={window}
          onWindowChange={setWindow}
        />
      </JournalModuleHeader>
      <main className="min-h-0 flex-1 overflow-y-auto p-4" data-testid="journal-trades-view">
        <JournalContentGate variant="trades" onImported={() => void loadTrades()}>
          <JournalSummaryCards stats={stats} accountEquity={accountEquity} />
          <div className="mt-4">
            {emptyVariant === "none" ? (
              <JournalTradesTableControls
                meta={pageResult.meta}
                visibleColumns={visibleColumns}
                density={density}
                onVisibleColumnsChange={setVisibleColumns}
                onDensityChange={setDensity}
                onPageSizeChange={setPageSize}
                onPageChange={setPage}
              />
            ) : null}
            <JournalTradesTable
              trades={pageResult.items}
              selectedTradeId={selectedTradeId}
              onSelectTrade={setSelectedTradeId}
              sort={sort}
              onSortChange={setSort}
              visibleColumns={buildVisibleColumnsSet(visibleColumns)}
              density={density}
              emptyVariant={emptyVariant}
              onClearFilters={handleClearFilters}
            />
          </div>
        </JournalContentGate>
      </main>
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
