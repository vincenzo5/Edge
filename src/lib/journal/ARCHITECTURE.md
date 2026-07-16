# Trading Journal

IBKR-backed trading journal: durable fills, grouped round-trip trades, Flex CSV import, stats, and chart review links.

## Data flow

```
IB Gateway → tws-sidecar executions
         ↘
AccountProvider / /api/brokerage/trades → fillSync → /api/me/journal/fills
Flex CSV upload → parseFlexCsv → import route
         ↓
journal_fills (Postgres) + edge.journal.v1 (localStorage fallback)
         ↓
tradeGrouping → journal_trades + journal_trade_fills
         ↓
/journal UI (stats, table, notes, chart deep-link)
```

## Modules

| Path | Role |
|------|------|
| `src/lib/journal/types.ts` | Domain types |
| `src/lib/journal/mapExecutionToFill.ts` | Broker execution → journal fill |
| `src/lib/journal/fillSync.ts` | Live sync helpers |
| `src/lib/journal/correlateOrderRef.ts` | `orderRef` → fill/trade lookup (`edge-intent-{intentId}`) |
| `src/lib/journal/tradeGrouping.ts` | STK FIFO, OPT conId, multi-leg spread grouping |
| `src/lib/journal/rebuildTrades.ts` | Idempotent regroup + note preservation |
| `src/lib/journal/flexImport/parseFlexCsv.ts` | IB Flex Trades CSV parser |
| `src/lib/journal/flexImport/flexWebService.ts` | Optional server Flex Web Service pull |
| `src/lib/journal/journalStats.ts` | Win rate, P&L, profit factor, filters, daily P&L, equity curve, intraday curve, day summary stats, breakdown reports, time breakdown, calendar builder |
| `src/lib/journal/rMultiple.ts` | Planned risk ($/%) and R-multiple math |
| `src/lib/journal/chartDeepLink.ts` | Chart deep-link with journalTrade + goto params |
| `src/lib/journal/journalExecutionMarkers.ts` | Entry/exit annotation markers from fills |
| `src/app/components/journal/JournalCalendar.tsx` | Month P&L grid; day click opens day summary modal |
| `src/app/components/journal/JournalDaySummaryModal.tsx` | TradeZella-style daily dashboard modal (intraday chart, stat grid, trades table) |
| `src/app/components/journal/JournalPnLAreaChart.tsx` | Reusable P&L area chart (equity curve + day modal) |
| `src/app/components/journal/JournalMetricGrid.tsx` | Reusable label/value metric grid |
| `src/app/components/journal/JournalDayTradesTable.tsx` | Day summary trades table |
| `src/app/components/journal/JournalEquityChart.tsx` | Daily cumulative P&L area chart (TradeZella-style axes, gradient fill, hover tooltip) |
| `src/app/components/journal/JournalSummaryCards.tsx` | Dashboard hero KPI cards — account equity (live IB NetLiquidation) with inline filter-scoped net P&L suffix, trade win %, profit factor, avg win/loss |
| `src/app/components/journal/JournalTradeListCard.tsx` | Dashboard list cards — Recent trades (Close Date/Symbol/Net P&L) and Open positions (Open Date/Symbol/Entry) |
| `src/app/components/journal/JournalBreakdownReport.tsx` | Setup/tag breakdown tables |
| `src/app/components/journal/JournalTimeReport.tsx` | Hour/weekday ET breakdown tables |
| `src/app/components/journal/JournalChartOverlayProvider.tsx` | Chart route journal overlay + deep-link bootstrap |
| `src/lib/journal/journalFilterHelpers.ts` | Scope bar helpers — period labels, active filter chips/count, default scope state |
| `src/app/components/journal/JournalScopeBar.tsx` | Compact header scope bar — period select, symbol search, filter drawer trigger, chips |
| `src/app/components/journal/JournalFilterDrawer.tsx` | Advanced filters slide-over (setup, tag, outcome, status on Trades, custom date range) |
| `src/lib/journal/localJournalStore.ts` | localStorage mirror when Postgres unavailable |
| `src/lib/persistence/repositories/journalRepository.ts` | Postgres CRUD |
| `src/app/api/me/journal/*` | REST routes |
| `src/app/components/journal/JournalModuleShell.tsx` | Journal layout: `AppModuleShell` (`AccountProvider`) → sync/trades providers → sub-nav |
| `src/app/components/journal/JournalSubNav.tsx` | Journal module sub-nav (Dashboard / Trades / Settings) |
| `src/app/components/journal/JournalTradesProvider.tsx` | Shared trade list state for journal views (`loading`, `error`, `retryLoadTrades`, stale-while-revalidate refresh) |
| `src/lib/journal/journalDataPhase.ts` | Page phase helper — `loading` \| `empty` \| `error` \| `ready` |
| `src/lib/journal/journalEmptyCopy.ts` | Shared empty-state copy (global, scoped, filtered, list cards) |
| `src/app/components/journal/JournalContentGate.tsx` | Page content gate — skeleton, global empty, error retry, or children |
| `src/app/components/journal/JournalPageLoadingSkeleton.tsx` | Dashboard/trades skeleton placeholders (`journal-page-loading`) |
| `src/app/components/journal/JournalGlobalEmptyState.tsx` | Global onboarding empty with Sync + Import CTAs (`journal-global-empty`) |
| `src/app/components/journal/JournalDashboardView.tsx` | Dashboard reporting view |
| `src/app/components/journal/JournalTradesView.tsx` | Full trade list view |
| `src/lib/journal/journalTradesTableControls.ts` | Trades table sort/paginate helpers, column metadata, result labels, localStorage prefs |
| `src/app/components/journal/JournalTradesTableControls.tsx` | Trades table toolbar — result count, columns popover, density, pagination |
| `src/app/components/journal/JournalTradesTable.tsx` | TradeZella-style trades table with sortable headers, column visibility, density |
| `src/app/components/journal/JournalTradeDetailDrawer.tsx` | Slide-over wrapper for trade review |
| `src/app/components/design-system/EdgeSlideOver.tsx` | Reusable right overlay detail panel |
| `src/lib/journal/journalTradeDisplay.ts` | Trade outcome status + day summary + dashboard list display helpers |
| `src/app/journal/{layout,dashboard,trades,settings}/` | Journal module routes |
| `src/app/components/journal/*` | UI + sync provider |
| `src/app/journal/page.tsx` | Redirect to `/journal/dashboard` |

## Provider tree

```
AppModuleShell (AccountProvider)
  └── JournalSyncProvider
        └── JournalTradesProvider
              └── journal views (filter by activeTradingAccountId via fills)
```

Journal providers must stay **inside** `AccountProvider` so `useAccountOptional()` receives the header account context.

1. **Stocks:** FIFO per `conId`; trade opens when net position leaves zero and closes when it returns to zero.
2. **Single-leg options:** Same as stocks, keyed by full option `conId`.
3. **Multi-leg spreads:** Fills sharing `orderId` within 2s (or shared `orderRef`) form one spread trade; close event matches a later cluster with the same key.
4. **P&L:** Prefer IB `realizedPNL` on fills; `netPnL = gross - commissions`.

## Flex CSV import

Required columns (aliases supported): Execution ID (`IBExecID`), Symbol, Buy/Sell, Quantity, TradePrice/Price, Trade Date/Time (`DateTime`).

Optional: Conid, Order ID (`IBOrderID`), Order Ref (`OrderReference`), IB Commission, Realized P/L (`FifoPnlRealized`), Put/Call, Strike, Expiry, Sec Type (`AssetClass`), Account (`ClientAccountID`). Signed quantities (negative for sells) are normalized to absolute size.

Fixtures: `src/lib/journal/flexImport/fixtures/`.

Optional server pull env (`.env.local`, not committed):

- `IB_FLEX_TOKEN`
- `IB_FLEX_QUERY_ID`

## Dashboard scope bar + filter drawer

Header controls (`JournalScopeBar`):

- **Period** preset (`today` / `7d` / `30d` / `all`) or **Custom range** via drawer (`closedFrom` / `closedTo` overrides preset)
- **Symbol search** — live filter in header
- **Filters drawer** — setup, tag, outcome; **Status** on Trades view only; Apply/Clear draft pattern

Scoping rules (`journalStats.ts`):

- **Closed analytics** (KPIs, calendar, equity, recent trades, day summary): `scopeClosedTradesForReporting`
- **Open positions** (dashboard card): `filterOpenJournalTrades` — ignores period
- **Trades table**: `scopeTradesForTradesView` — open rows ignore period; closed rows respect period/custom range

## Loading and empty states

Data phases (`journalDataPhase.ts`) derive from `JournalTradesProvider`:

| Phase | Condition | UX |
|-------|-----------|-----|
| `loading` | `loading && allTrades.length === 0` | `JournalPageLoadingSkeleton` — header/scope bar stay interactive |
| `empty` | `!loading && allTrades.length === 0` | `JournalGlobalEmptyState` — single Import/Sync CTA |
| `error` | `error && allTrades.length === 0` | `JournalContentGate` error panel + Retry |
| `ready` | otherwise | Widgets render; scoped empty when filters/period exclude data |

Page gates: `JournalDashboardView` and `JournalTradesView` wrap main content in `JournalContentGate`. Widgets (`JournalEquityChart`, list cards, breakdown/time reports) show **scoped** empty only when parent is `ready`. Copy lives in `journalEmptyCopy.ts`.

Key test ids: `journal-page-loading`, `journal-global-empty`, `journal-content-error`, `journal-equity-empty`, `journal-trades-filtered-empty`.

## Verification

```bash
npm test -- --run src/lib/journal src/lib/persistence/schemas/journal src/app/api/me/journal src/app/components/journal src/app/journal
python3 -m unittest services/tws-sidecar/test_main.py
npm run build
```

App-level: `npm run dev:with-db` → import Flex CSV → calendar/breakdown/time reports visible → set R on trade → open chart with entry/exit markers → filters still scope reports.

## Roadmap (post-v1)

Tiered journal + reporting work (calendar, tag reports, equity curve, time analysis, chart execution overlay, R-multiple, MFE/MFA, etc.) is documented in [docs/roadmaps/journal-roadmap.md](../../../docs/roadmaps/journal-roadmap.md).

Unscheduled deferrals (not on that roadmap):

- Assignment/exercise-specific events
- Sidebar journal panel (home hub panel shipped)
- AI journal tools
