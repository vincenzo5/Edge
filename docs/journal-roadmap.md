# Trading Journal Roadmap

Single roadmap for Edge trading journal **reporting and review** — TradeZella-inspired, scoped to IBKR ingestion and Edge chart integration. Excludes trade replay, AI insights, community, prop-firm sync, backtesting, strategies/playbooks, session notebooks, and multi-broker / multi-account consolidation.

**Last updated:** 2026-07-07

## Product Goal

Give solo IBKR traders a durable fill → round-trip trade journal with enough **reporting depth** to spot patterns (time of day, tags, equity curve, risk) without manual spreadsheet work. Edge already owns the chart engine — journal review should deep-link into chart context with execution markers where possible.

## Shipped Baseline (v1 — Passing)

| Area | Status | Notes |
|------|--------|-------|
| Fill ingestion | Shipped | IBKR live sync via `tws-sidecar`; IB Flex CSV import; optional Flex Web Service pull (server env) |
| Trade grouping | Shipped | STK FIFO; single-leg OPT; multi-leg spreads by `orderId` / `orderRef` cluster — **ahead of TradeZella on multi-leg options** |
| Persistence | Shipped | Postgres (`journal_fills`, `journal_trades`) + `edge.journal.v1` localStorage fallback |
| Core stats | Shipped | Win rate, net/gross P&L, avg win/loss, profit factor, expectancy (`journalStats.ts`) |
| Daily P&L aggregation | Backend only | `computeDailyPnL()` exists; no UI yet |
| `/journal` UI | Shipped | Module sub-nav (Dashboard / Trades / Settings); Dashboard = KPIs + calendar + reports + compact table; Trades = full list with status pills + detail panel; Settings placeholder |
| Home hub | Shipped | Recent-trades panel (5 rows) |
| Per-trade metadata | Shipped | Fixed setup enum, freeform tags, `reviewNote` |

Evidence and verification commands: [Journal Architecture](../src/lib/journal/ARCHITECTURE.md), [Project Status](./PROJECT-STATUS.md) (Trading journal v1 row).

## Reference: TradeZella Scope We Are Mimicking

From a TradeZella competitive review (journal + reporting only):

- Automated stats and KPI dashboard
- Calendar / equity visualizations
- Dimensional reports (time, instrument, tags, risk)
- Per-trade review fields (notes, tags, quality, media)
- Chart overlay of executions (not tick replay)

**Explicitly out of scope for Edge** (product decision):

| Excluded | Reason |
|----------|--------|
| Trade replay | User direction — use Edge chart + execution overlay instead |
| Zella AI / auto-tagging / session review agents | User direction |
| Spaces / mentor mode / community | User direction |
| Prop firm sync dashboards | User direction |
| Backtesting integration | User direction |
| Strategies / playbooks | User direction — use tags + setup enum instead |
| Session notebook (trading plan, daily recaps) | User direction — per-trade `reviewNote` only |
| Multi-broker / multi-account consolidation | User direction — IBKR single-account path |

## Roadmap Phases

Execute **one tier at a time** (WIP=1). Each phase gets focused tests, build when touching shared wiring, and an Active Work row in `PROJECT-STATUS.md` before implementation.

### Tier 1 — Reporting foundation (build on v1 data)

**Status:** Shipped in code — calendar P&L, tag/setup breakdown, equity curve, richer filters, expanded summary KPIs on `/journal`.

**Outcome:** `/journal` feels like a real performance dashboard, not just a trade list.

| # | Feature | Description | Primary touch points |
|---|---------|-------------|----------------------|
| 1.1 | **Calendar P&L view** | Month grid with daily net P&L and trade count; click day → filter trade table | Wire `computeDailyPnL()`; new `JournalCalendar.tsx`; `JournalPageShell.tsx` |
| 1.2 | **Tag & setup reports** | Group closed trades by tag or setup → win rate, profit factor, net P&L, trade count per bucket | `journalStats.ts` (group-by helpers); `JournalTagReport.tsx` or tab in page shell |
| 1.3 | **Equity curve** | Cumulative net P&L over time (closed trades by `closedAt`) | `journalStats.ts`; `JournalEquityChart.tsx` (Canvas or lightweight SVG) |
| 1.4 | **Richer filters** | Date range, setup, tag(s), win/loss in addition to status + symbol | Filter state in `JournalPageShell.tsx`; optional query params; client-side or API filter extension |
| 1.5 | **Expanded summary cards** | Surface expectancy, avg win, avg loss on dashboard (already computed) | `JournalSummaryCards.tsx` |

**Verification (Tier 1):**

```bash
npm test -- --run src/lib/journal src/app/components/journal src/app/journal
npm run build
```

App-level: import Flex fixture → calendar shows daily P&L → tag report ranks setups → equity curve monotonic with closed trades → filters narrow table → reload persists.

### Tier 2 — Dimensional analysis & chart review

**Status:** Shipped in code — time-of-day/week reports (ET), R-multiple ($/%), chart execution overlay with entry/exit markers.

**Outcome:** Answer “when” and “how well did I execute” questions; connect journal to Edge chart.

| # | Feature | Description | Primary touch points |
|---|---------|-------------|----------------------|
| 2.1 | **Time-of-day report** | Win rate, net P&L, trade count by hour-of-day (session timezone) | `journalStats.ts`; `JournalTimeReport.tsx` |
| 2.2 | **Day-of-week report** | Same metrics by weekday | `journalStats.ts`; shared time-report component |
| 2.3 | **Chart execution overlay** | From journal trade, open chart with entry/exit markers (and spread legs where applicable) | Extend `chartDeepLink.ts`; chart overlay channel or drawing pins from fill times/prices |
| 2.4 | **R-multiple per trade** | User enters planned risk ($ or %); compute R on close; show in detail + aggregate R stats | Schema/API fields on `journal_trades`; `JournalTradeDetail.tsx`; optional R column in reports |

**Verification (Tier 2):**

Focused tests for time bucketing, R-multiple math, deep-link params; build; app-level walkthrough — time report shows expected buckets; chart opens with visible entry/exit markers; R saves and appears in summary.

### Tier 3 — Review depth & advanced execution metrics

**Outcome:** Richer per-trade review and comparative analytics without new ingestion sources.

| # | Feature | Description | Primary touch points |
|---|---------|-------------|----------------------|
| 3.1 | **Trade rating scale** | e.g. 1–5 or A–F quality grade per trade; filterable | Field on `JournalTrade`; detail UI; tag-report-style breakdown by rating |
| 3.2 | **Screenshots** | Attach one or more images to a trade review | Storage: URL/blob refs in trade metadata or separate table; upload UI in detail panel |
| 3.3 | **Compare reports** | Side-by-side stats for two slices (e.g. wins vs losses, tag A vs tag B, last 30d vs prior 30d) | `journalStats.ts` compare helper; `JournalCompareReport.tsx` |
| 3.4 | **MFE / MFA** | Max favorable / adverse excursion during trade window | Requires intraday price path for `[openedAt, closedAt]` via `/api/candles` or cached bars; store computed MFE/MFA on trade |

**Verification (Tier 3):**

Unit tests for compare slices and MFE/MFA oracle on fixture candles; build when schema/API changes; app-level — attach screenshot persists; compare report matches filtered subsets.

## Still Deferred (not on roadmap)

Items from v1 architecture notes that remain **unscheduled**:

- Assignment / exercise-specific journal events
- Sidebar journal panel (home hub panel exists; full sidebar rail panel does not)
- AI journal tools (registry tools for summarize/review — separate from Zella-style agents)

## Architecture Decisions

- **Single broker path:** IBKR only — live sidecar + Flex CSV/API. No broker abstraction layer for journal v2.
- **Tags over playbooks:** Freeform tags + fixed setup enum remain the strategy taxonomy; no user-defined playbook documents or template library.
- **Notes per trade only:** No session-level notebook; `reviewNote` on `JournalTrade` is the qualitative layer.
- **Stats client-first:** Tier 1–2 can compute from loaded trades client-side; add API aggregation only if trade volume requires it.
- **Chart integration:** Prefer execution overlay pins / reference lines on Edge chart over rebuilding TradeZella-style replay.

## Touch Points (by layer)

| Layer | Files / modules |
|-------|-----------------|
| Domain / stats | `src/lib/journal/journalStats.ts`, `types.ts`, `chartDeepLink.ts` |
| Persistence | `src/lib/persistence/schemas/journal.ts`, `repositories/journalRepository.ts`, `client/journalClient.ts` |
| API | `src/app/api/me/journal/trades/**`, `fills/**`, `import/**` |
| UI | `src/app/components/journal/*`, `src/app/journal/page.tsx`, `HomeJournalPanel.tsx` |
| Chart | `src/app/chart/`, chart overlay / drawing metadata as needed for Tier 2.3 |
| Design system | `Edge*` primitives per `src/lib/design-system/ARCHITECTURE.md` |

## Harness Update (when a tier starts)

Before coding a tier:

1. Set **one** Active Work row in `docs/PROJECT-STATUS.md` (WIP=1).
2. Add a **Task Contract** if the tier crosses stats + UI + schema (Tier 2.4, Tier 3.2+).
3. Mark **Passing** only with quoted test/build output and app-level evidence per `AGENTS.md`.

## Source Docs

- [Roadmap](./ROADMAP.md) — overall Edge phases; journal lives under broker-backed workflows.
- [Project Status](./PROJECT-STATUS.md) — verified v1 state and active work.
- [Journal Architecture](../src/lib/journal/ARCHITECTURE.md) — v1 data flow, grouping rules, verification.
- [Persistence Architecture](../src/lib/persistence/ARCHITECTURE.md) — schema and `/api/me/*` patterns.
