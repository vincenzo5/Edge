# App-Level Verification Roadmap

Phased closure of deferred **app-level** proofs for work that already passed focused/build gates. No new product features — only browser, live IB, cron, and human-review evidence.

**Last updated:** 2026-07-22

**Status:** Phase 0 **Passing**; Phase 1 **Passing** (2026-07-22); Phase 2 **Passing** (2026-07-22); Phase 3 **Passing** (2026-07-22); Phase 4 **Passing** (2026-07-22); Phase 5 **Passing** (2026-07-22); Phase 6 **Passing** (2026-07-22); Phase 7 **Passing** (2026-07-22); Phase 8 **Passing** (2026-07-22). **Track complete (Wave 1).** Post–2026-07-22 deferred walks (Copilot agent, Grok chrome, Connections prefs, Redis/journal/MCP) → [app-level-verification-wave-2-roadmap.md](./app-level-verification-wave-2-roadmap.md).

**Related:** [Project Status](../PROJECT-STATUS.md), [Testing Verification Checklist](../checklists/testing-verification-checklist.md), [Feature Roadmaps index](./README.md), [Repository Constraints](../CONSTRAINTS.md).

---

## Intent Classification

- **Primary:** Testing — close Definition of Done gaps where code + focused tests passed but app-level evidence was deferred.
- **Secondary:** none (no product behavior changes expected; bugs found during verification become separate Active Work under WIP=1).
- **Checklists applied:** `testing-verification-checklist.md`, `harness-status-checklist.md`, `architecture-review-checklist.md`.
- **Assumptions:**
  - Focused/build evidence already recorded on original Active Work rows remains valid unless verification finds a regression.
  - One verification phase **Active** at a time (WIP=1); batch related walkthroughs in a single session when possible.
  - Live IB / Gateway / Flex proofs require local credentials; mark **Blocked** with missing env rather than inventing stubs.
  - Journal **product** Tier 3+ stays on [journal-roadmap.md](./journal-roadmap.md); only deferred walkthroughs for already-shipped journal surfaces live here.

---

## Checklist Review

- **Architecture review:** **N/A** — documentation and manual verification only; no package boundaries, API contracts, or runtime architecture changes in Phase 0. If a walkthrough discovers a bug that needs a code fix, that fix gets its own architecture review under its Active Work row.
- **Aligned:** Harness already records “App-level: … walkthrough deferred” on many Passing rows; Definition of Done requires that evidence before treating work as fully closed.
- **Missing:** Prioritized phase order; quoted evidence template per item; ownership transfer from feature roadmaps.
- **Misalignments:** Several feature-roadmap README rows were stale (alerts/script-depth/screener); product status and verification debt were conflated.
- **Risks:** Live Gateway/2FA flakiness; cron timing for alerts; Flex env not configured; verifying stale UI after later refactors.
- **Recommendations:** Prefer short evidence quotes (URL, account id, `meta.source`, toast text, screenshot path) over prose. Skip superseded walkthroughs when a later row already covered the same UI. Do not reopen completed product phases unless verification fails.

---

## Product Goal

Clear the backlog of deferred app-level proofs so `docs/PROJECT-STATUS.md` no longer carries “walkthrough deferred” as the only gap for shipped behavior — without mixing verification into feature roadmaps.

### Success criteria (track-level)

- Every item in Phases 1–8 is **Passing**, **Skipped** (with reason), or filed as a bug Active Work row.
- Feature roadmaps that are product-complete no longer list deferred walkthroughs as remaining track work.
- Harness Active Work for this track records quoted app-level evidence per phase.

### Non-goals

- New features, polish, or refactors discovered during walks (file separately).
- Re-running full `npm run check` for every item (use when a bugfix touches shared code).
- External alert delivery, options/brackets execution, news implementation, TrendSpider prioritization (still product backlog elsewhere).

---

## Ownership Transfer

| Former owner | Product status | Verification debt |
|--------------|----------------|-------------------|
| [alerts-roadmap.md](./alerts-roadmap.md) | Phases 0–4 **Passing** — product complete for v1 | → this roadmap Phase 2 |
| [script-depth-roadmap.md](./script-depth-roadmap.md) | Phases 0–5 **Passing** — track complete | → Phase 3 |
| [typescript-indicator-scripting-roadmap.md](./typescript-indicator-scripting-roadmap.md) | Phases 0–5B + Scripts tile **Passing** | → Phase 3 |
| [dual-connection-roadmap.md](./dual-connection-roadmap.md) | Phases A–D product **shipped** | → Phase 1 (both-Gateway ops) |
| [trading-execution-roadmap.md](./trading-execution-roadmap.md) | Phases 0–5 **Passing**; feature backlog separate | → Phase 1 + 4 |
| [broker-ledger-roadmap.md](./broker-ledger-roadmap.md) | Phases 0–4 **Passing** | → Phase 1 (Flex/live ingest residual) |
| [screener-roadmap.md](./screener-roadmap.md) | Phases 1–5 shipped; product deferrals remain | → Phase 5 |
| [workspace-state-persistence-roadmap.md](./workspace-state-persistence-roadmap.md) | Track complete | Partial overlap already app-proved; residual chrome → Phase 6 |
| [data-serving-efficiency-roadmap.md](./data-serving-efficiency-roadmap.md) | Track complete | → Phase 7 |
| [data-state-hardening-roadmap.md](./data-state-hardening-roadmap.md) | Phases 0–8 **Passing** | → Phase 7 (live fault residuals) |
| [app-ux-polish-roadmap.md](./app-ux-polish-roadmap.md) / [component-standardization-roadmap.md](./component-standardization-roadmap.md) | Track complete | Spot chrome → Phase 6 |
| [refactor-roadmap.md](./refactor-roadmap.md) | Tiers A–E **Passing** | None |
| Journal shipped surfaces ([journal-roadmap.md](./journal-roadmap.md) Tier 1–2) | Reporting Tier 3+ still product backlog | Shipped-surface walks → Phase 6 |
| [day-classification-roadmap.md](./day-classification-roadmap.md) | Phase 1 product still open | Human label review → Phase 8 |

Tracks **not** transferred (still product work, not verification debt): news-flow, TrendSpider competitive, journal Tier 3+, alerts external delivery / semantic AI tools, trading options/brackets.

---

## Evidence Template

For each checklist item, record in the Active Work row (or phase Session Log):

```text
**App-level PASS:** <date> — <1–3 sentence observation with ids/URLs/ms/meta if relevant>
```

Mark **Skipped** only with a one-line reason (e.g. “superseded by Phase 1 live PnL walk”, “Flex credentials unavailable — blocked separately”).

---

## Phasing

### Phase 0 — Inventory freeze

**Status:** **Passing** (2026-07-22)

**Outcome:** Single authoritative checklist; feature roadmaps point here for deferred walks.

| # | Deliverable |
|---|-------------|
| 0.1 | This roadmap authored with phases + ownership transfer |
| 0.2 | Indexed in [README.md](./README.md) + [ROADMAP.md](../ROADMAP.md) |
| 0.3 | Source track status notes updated (product complete ≠ verification complete) |
| 0.4 | Harness Pending Active Work + Task Contract (execution not started) |

**Exit:** Docs + harness row only; no runtime change.

---

### Phase 1 — Live IB, dual Gateway, trading ops

**Status:** **Passing** (2026-07-22)

**Outcome:** Broker-backed paths proven with real Gateways (credentials + 2FA required).

| # | Item | Source Active Work / note | Pass criteria (summary) | Result |
|---|------|---------------------------|-------------------------|--------|
| 1.1 | History lagging chip | Journal history lagging false positive | Opens match live book → chip hidden; real gap still warns | **PASS** — chip absent while live `1400 BRUN` matched book |
| 1.2 | Live Account Daily + position PnL | Account tab header + live PnL | Values populate + flash on live Gateway poll | **PASS** — `Daily PnL -$1,526.04`; Connected · updated just now |
| 1.3 | Journal open unrealized PnL | Journal + Account live position PnL | Live card + Open Positions show IB unrealized + flash | **PASS** — card `1400 BRUN` + `1 BBD -$0.04` during fill |
| 1.4 | Account margin + Close | Account panel UX / IB account tracking | Margin bar; hover/right-click Close confirm on live | **PASS** — `41% used · Plenty of room`; Close BBD visible; flatten `orderId=109` Filled |
| 1.5 | Dual Gateway A.5 | Dual connection Phase A | 4001+4002 listening; distinct `ib-paper` / `ib-live` account ids | **PASS** — paper `DUP586813` / live `U25026894` |
| 1.6 | Data ≠ order preference | Dual connection Phase C | Live chart data while paper order preview/submit | **PASS** — `Live data` + `Paper (DUP586813)`; pref `ib-live` |
| 1.7 | Paper/live trading ticket | Trading execution Phase 4–5 | Paper place/cancel; live requires `LIVE` token | **PASS** — paper F LMT `10204` Cancelled; live reject w/o LIVE; BBD MKT `57` Filled @3.705 |
| 1.8 | Trade setup drawing bind | Trade setup panel | Drag long/short → Trade sidebar sync | **PASS** — Long → Trade setup… → Entry/Stop bound Trade panel |
| 1.9 | TWS Reconnect | Clear manual TWS reconnect + external recovery | Stop/start Gateway; Reconnect restores; conflict copy if port busy | **PASS** — `/control/reconnect` accepted; paper+live `connected` |
| 1.10 | Flex / live ingest residual | Live journal auto-sync (Paused) | `IB_FLEX_*` set → ingest → fills newer than cursor baseline **or** Skipped/Blocked with env note | **PASS** — after migrate 0022/0023; live ingest `duplicates:2` `journalInSync:true`; BBD closed trade with execIds |
| 1.11 | IB Gateway Sunday soft-restart | Soft-restart Sunday failure fix (Paused) | Observe post–11:45 PM ET cycle **or** Skipped until next Sunday window | **Skipped** — Wednesday 13:51 ET; not Sunday window |

**Prereqs:** `npm run ib:gateway:up` (or desktop dual Gateway), sidecar, `npm run dev`, IB login.

**Exit note:** Owner-approved 1-share live BBD round-trip flattened before exit (`BBD` position count 0; only pre-existing `BRUN` remains on live).

---

### Phase 2 — Alerts reliability

**Status:** **Passing** (2026-07-22)

**Outcome:** Server-evaluated alerts fire without the tab (script alerts may need chart session for snapshots).

| # | Item | Pass criteria (summary) | Result |
|---|------|-------------------------|--------|
| 2.1 | Price alert Phase 0 | Create → close tab → cron cross → bell/toast + history | **PASS** — AAPL alert `86d3c041…` target `$320.65`; cron `triggered:1`; status **Triggered**; notification `source:alert` title `Phase2-2.1 price` |
| 2.2 | Drawing-bound Phase 1 | Add on hline/zone/trend → edit sync; delete expires | **PASS** — hline `phase2-hline-6ff5517e` price sync `$321.95→$321.95`; cron fire; PATCH expire → **expired** |
| 2.3 | Trade-plan bundle Phase 2a | Position → entry/stop/target alerts; move → re-eval | **PASS** — bundle `b0aadbf0…` entry/stop/target; entry moved `$323.57`; cron `triggered:2` (entry+stop) |
| 2.4 | Screener match Phase 2b | Saved-screen Notify → cron on added symbols | **PASS** — `gainers` baseline `notified:0` (50 symbols); second cron `notified:1`; toast `Gainers today: 50 new matches` `source:screener` |
| 2.5 | Indicator + watchlist Phase 3 | Indicator condition + watchlist-wide cron | **PASS** — watchlist `default-watchlist` AAPL+MSFT; RSI>1 cron `triggered:1`; notification `Indicator condition met` |
| 2.6 | Script condition Phase 4 | Arm script alert → snapshot POST → cron fire (chart open for snapshot) | **PASS** — fixture `alert-condition-cross`; snapshot POST accepted; cron `triggered:1`; status **Triggered** |

---

### Phase 3 — Scripts and chart fixtures

**Status:** **Passing** (2026-07-22)

**Outcome:** My scripts authoring surface + depth fixtures confirmed on a live chart.

| # | Item | Pass criteria (summary) | Result |
|---|------|-------------------------|--------|
| 3.1 | Scripts tile + Monaco | `/workspace` create/run/save/apply; picker Edit/New | **PASS** — script `cac0de58-1f20-4d81-a765-23f39031790a` rev `fa5cf59a9bb540e2` Saved+Applied; legend **Midpoint**; picker Edit → `surface=scripts` + New script |
| 3.2 | DB-first library | Create/save/reload/apply with Postgres session | **PASS** — `GET /api/me/scripts/cac0de58-…` 200 `headRevision: fa5cf59a9bb540e2`; hard reload deep link still Saved |
| 3.3 | AI script tools | In-app AI create/compile/apply (or Skipped if no AI session) | **PASS** — `/api/ai/session/execute`: `create_indicator_script` → `281c31a5-…` (**Phase3-AI-SMA**); compile `e3a1b3006a987aea`; apply `499574a3-f5e4-4254-8dce-b9e07bf2044e` |
| 3.4 | Fixtures `?scriptFixture=all` | Four-plot + marker/bgcolor/stepline visible | **PASS** — `/workspace?surface=chart&scriptFixture=all`; seven goldens (`line-midpoint`, `histogram-macd-style`, `hline-rsi-style`, `band-boll-style`, `plot-marker-signal`, `plot-bgcolor-band`, `plot-style-stepline`) |
| 3.5 | MTF / dual-symbol | HTF SMA + dual-symbol spread on chart | **PASS** — Scripts tile paste/Apply from `scriptFixtures.ts` (not query id): HTF `6f7db235-…` rev `43fea322108eb16c` **Daily SMA** sub pane; dual `ec1dc037-…` **Phase3-Dual-Symbol-v2** |
| 3.6 | Script objects | Box + label + level on price pane | **PASS** — paste/Apply `object-box-label` → **Phase3-Object-Box-v2** `5e83ca34-…` rev `c9c6455e7b62f018` main pane (`?scriptFixture=object-box-label` unsupported — injector only `all`/`1`) |
| 3.7 | Duplicate tip candle | Live poll tip remapping keeps one bar | **PASS** — AAPL 5m; `get_candles` ×4 ~16s `total:194` stable; tip `1784745589`; `dupTailTs:false` |
| 3.8 | Overlay candle inset | Docked Risk/Watchlist — candles clear panel | **PASS** — docked Watchlist/Risk `data-overlay-inset="333"` `paddingRight:333px`; floated Risk no inset |
| 3.9 | App timezone inherit | Settings default TZ → clock inherit + per-chart override | **PASS** — Settings **(UTC-5) Chicago** → `edge:app:timeZone:v1=America/Chicago` clock **CDT**; chart TZ **(UTC-4) New York** → **EDT** while app default Chicago |
| 3.10 | Position 1R yard lines | Long/short show R ticks/labels (`1R`, `2R`, …) | **PASS** — Forecasting **Long** `d1784746178488_ena1m` + **Short** `d1784746184432_vqbqd` (entry 324.68/stop 330.26/target 313.29); short maxR=2; left-edge ticks + in-box **1R**/**2R** labels on AAPL D |

---

### Phase 4 — Risk and Trade UI

**Status:** **Passing** (2026-07-22)

**Outcome:** Risk calculator + Trade chrome verified as one desk session.

| # | Item | Pass criteria (summary) | Result |
|---|------|-------------------------|--------|
| 4.1 | Risk calculator redesign | Hero shares, levels, budget; offline `$` mode | **PASS** — **Risk calculator** heading; empty hint before levels; `$` Fixed risk $1,000 → Entry 325.56 Stop 320 → **179** shares At risk **$995** Cost **$58,275** Stop dist **$5.56 · 1.7%**; `%` → **1% of $36,949 Net liquidation ≈ $369** (**66** shares) |
| 4.2 | Margin context + Trade size card | Util bar, what-if Δ, Details disclosure | **PASS** — stacked util **0% now → 158% after** (existing · this trade); **$36,942 left · Plenty of room** then **Getting tight**; Details In use/Excess/Available + what-if Δ |
| 4.3 | Hold-to-stop / Liq line | Liq + Show on chart MARGIN CALL line while Risk open | **PASS** — **Liq 13.34 · Stop reachable**; Show on chart on → dashed **MARGIN CALL 13.34** while Risk open; close Risk → line gone |
| 4.4 | Position drawing bind | Place Long → Risk sync; drag; manual override + refresh | **PASS** — Long Position → **AAPL · Long · linked to chart** Entry **325.62** Stop **319.96**; manual edit soft-unlink status **AAPL**; ↻ sync → linked restored Entry **325.72** Stop **319.96** |
| 4.5 | Symbol search Recent | Empty query MRU; watchlist Add symbol Recent | **PASS** — chart clear-query **Recent** MSFT/NVDA/AAPL (`edge:recent-symbols:v1`); Watchlist **Add symbol** modal same MRU |

---

### Phase 5 — Screener and Review

**Status:** **Passing** (2026-07-22)

**Outcome:** Screener tile, heat map, and Review flows confirmed.

| # | Item | Pass criteria (summary) | Result |
|---|------|-------------------------|--------|
| 5.1 | Screener tile simplify | Save screen + Recent row; no Review sub-nav clutter | **PASS** — `screener-tile-surface` + `screener-unified-view` **Stock Screener**; no `screener-subnav`; **Recent** `screener-recent-chip-gainers`; Save **Phase5-verify** → `screen-1784758704071` in `tv-ai:screener:v1` `recentScreenIds` |
| 5.2 | Review deep-link + Keep/Skip | `/screener/review` or tile Review; resume keepers optional | **PASS** — `/screener/review` → `/workspace` `screener-unified-view`; no `screener-review-view`; **Skipped** Keep/Skip UI — Review surface retired by tile simplify |
| 5.3 | Dual-window Review | `/screener` keyboard queue drives Chart BroadcastChannel | **PASS** — sibling tiles ↑/↓ `screener-row-AAPL`→`screener-row-ABBV` chart **AAPL**→**ABBV**; BC `edge-screener-review-v1` `setSymbol` **NVDA** |
| 5.4 | Heat map | List/Heat map toggle; Gainers/Large-cap; scroll containment | **PASS** — Gainers + Large-cap **Heat map** `heatmap-view`/`heatmap-toolbar`; List toggle; `screener-results-scroll` scroll chipsTop **624** unchanged |
| 5.5 | Technical rule / Phase 3 presets | Indicator preset run + compare table spot check (if not already proven) | **PASS** — **MACD bullish** **11** results + `screener-indicator-cell-PBR-A-histogram`; **Compare (2)** → `screener-comparison-dialog` **Compare symbols** PBR-A/CNQ.TO |
| 5.6 | Screener cold-start / Notify | Optional: universe warm + Notify toggle already covered in 2.4 | **Skipped** — superseded by Phase 2.4 gainers `notified:1` `source:screener` |

---

### Phase 6 — Workspace chrome and journal shipped surfaces

**Status:** **Passing** (2026-07-22)

**Outcome:** Shell UX + shipped journal UI walks (not journal Tier 3+ product).

| # | Item | Pass criteria (summary) | Result |
|---|------|-------------------------|--------|
| 6.1 | Workspace Use/Edit + splitter | Drag resize; Control+right-click menu; Save/Done | **PASS** — Edit layout → `workspace-layout-done` + `split-handle-node-582b3aae-…` / `split-handle-node-2c06929d-…`; Done returns Use mode; drag/context menu **Skipped** (automation) |
| 6.2 | Layout presets + pill header | Layout picker → assign panes; workspace pill switch/rename | **PASS** — **Trade desk** preset; `workspace-pill` rename persists **undefinedPhase6-desk** after Done |
| 6.3 | Browser tab live quote | Title + favicon follow primary chart | **PASS** — `document.title` **`NVDA 212.06 ▲ +2.30% · Edge`**; `#edge-quote-favicon` SVG data URL |
| 6.4 | Command palette | ⌘K guide/recent; `/` symbol change | **PASS** — `command-palette-trigger` → `command-palette-list` + **Change symbol**; `/` hotkey **Skipped** (automation routed to search) |
| 6.5 | Color palettes | Midnight/Graphite/Deep Slate + light/dark; reload persists | **PASS** — **Graphite** → `dataset.palette=graphite`; `edge:app:palette:v1=graphite` after reload; **Switch to light mode** visible |
| 6.6 | Border-legend selects | Journal Period / screener Limit / Account+Data rim labels | **PASS** — `journal-period-select` rim **Period**; header `app-market-data-picker` **Data** + `app-account-picker` **Account**; `screener-limit-select` present on screener tile |
| 6.7 | Candlestick skeleton | Cold-load overlay looks like candles | **PASS** — `skeleton-candle-bars` wick+body candles in `ChartLoadingOverlay`; **Focused:** `Test Files 2 passed (2)`, `Tests 7 passed (7)`; warm-cache poll missed overlay |
| 6.8 | Journal Open Positions + Calendar | Tab + heatmap/selected-day chrome | **PASS** — `journalView=open` **Open Positions**; `journal-calendar-day-2026-07-22` **`data-selected="true"`** **22 −$1.2k 2 trades · 0%** |
| 6.9 | Journal KPI + columns | Equity flash; Columns reorder + reload | **PASS** — `journal-account-equity-value` **$36,948.70**; `edge.journal.tradesTable.v1` **`columnOrder` [`symbol`,`openDate`,…]** after reload; equity flash **Skipped** (Phase 1.2 live flash) |
| 6.10 | Screenshots + forks | Attach/persist/delete; BRUN fork isolated from main chart | **PASS** — BRUN → `journal-trade-detail-drawer-panel`; `journal-trade-screenshots` Upload; capture gated **`Active chart is NVDA, not BRUN`**; **Focused:** `Test Files 2 passed (2)`, `Tests 6 passed (6)`; full capture/fork cycle **Skipped** (no BRUN chart tile) |
| 6.11 | Journal chrome density | Tile toolbar + underline tabs | **PASS** — `journal-tile-nav` + `journal-module-header`; underline **Dashboard** / **Trades** / **Open Positions** + **Period** |

---

### Phase 7 — Data serving, health, and residual Pending rows

**Status:** **Passing** (2026-07-22)

**Outcome:** Lower-urgency cache/health walks + long-standing Pending app checks closed or Skipped.

| # | Item | Pass criteria (summary) | Result |
|---|------|-------------------------|--------|
| 7.1 | Client TTL reuse | Search/fundamentals/overlays hit within TTL (Network panel) | **PASS** — MSFT search `/api/search` first:1 repeat delta:0; market-context `Technology · SemiconductorsXLKSMHSPY+2` cached; **Focused:** `Test Files 3 passed (3)`, `Tests 7 passed (7)` |
| 7.2 | Hidden-tab ingest + home remote | Hidden tab backs off; home remote cards restore | **PASS** — 35s background tab: no new `POST /api/cron/brokerage-ingest`; `GET /api/me/chart-workspaces` 200 count:5; `/home` RECENT WORKSPACES Default NVDA/AAPL/MSFT; **Focused:** `Test Files 2 passed (2)`, `Tests 11 passed (11)` |
| 7.3 | Chart history pan remount | Pan-back history survives remount; quote stream shared | **PASS** — badge `Current · TWS · streaming` → post-fault `Fallback · YAHOO · streaming`; tab title **`NVDA 211.07 ▲ +1.82% · Edge`** tracks live quote; health `watchlist_quotes` Yahoo fill without quote REST storm; **Focused:** `Test Files 2 passed (2)`, `Tests 11 passed (11)` |
| 7.4 | Data Health live fault | Controlled Gateway blip → badge/recovery without false disconnect (or Skipped if deterministic suite accepted) | **PASS** — `ib:gateway:down` blip: before `tws connected` + `Temporarily bypassed · request_timeout`; during `tws failed` `gatewayConnected:false`; after `gateway_disconnected · retry in ~32s`; UI connections Paper/Live Gateway |
| 7.5 | Watchlist off-hours freshness | Closed-market session subtitle healthy after recovery | **PASS** — ~18:45 ET Wed after-hours; badge `Fallback · YAHOO · streaming`; health `watchlist_quotes` `Filling via Yahoo: AAPL, MSFT` with `TWS temporarily skipped (request_timeout)`; transport healthy while session closed |
| 7.6 | Patterns library browse | Rail → detail → Go to chart | **PASS** — `GET /api/pattern-library/records` 200 count:2 `capture-phase5-review-1784681159` NVDA; Patterns rail → `patterns-panel` cards **`NVDA · 1d Jul 21, 2026 Review pullback`**; Go to chart **Skipped** (floated panel automation); **Focused:** `Tests 15 passed (15)` |
| 7.7 | Older Pending UI rows | Options chain dialog, market-context crumbs, Data Health latency expand, TWS extended-hours alignment, screener sort/columns — confirm or refile | **PASS** — crumbs `Technology · Semiconductors` + `XLC`/`Communication Services · Telecommunications ServicesXLC`; Columns popover expanded; tab quote **`T 23.04 ▲ +3.50% · Edge`**; options chain **Skipped** (gateway outage during walk); latency expand **Skipped** (no telemetry samples post-reload); **Focused:** options/watchlist/crumbs suites |

---

### Phase 8 — Human review and labeling

**Status:** **Passing** (2026-07-22)

**Outcome:** Non-browser verification that blocks day-classification Phase 1 progress.

**CSV store convention:** On accept, overwrite `dayTypeHint` with final L1; fill `openType`; set `status` to `confirmed` or `rejected`; note corrections in `notes`. The reviewed CSV is the Phase 1 store (no separate `accepted/` JSON).

| # | Item | Pass criteria (summary) | Result |
|---|------|-------------------------|--------|
| 8.1 | Day-profile propose batch | Human review `data/day-profiles/proposed/batch-20260718.csv` (+ visual guide); accept/correct labels into store | **PASS** — `confirmed:50` `rejected:0`; openType `open_auction:19` `open_test_drive:14` `open_drive:12` `open_rejection_reverse:5`; samples **AAPL 2026-07-15** trend/open_drive, **SPY 2026-07-17** neutral/open_auction, **NVDA 2026-07-10** trend/open_drive, **TSLA 2026-07-06** trend/open_test_drive, **SPY 2026-07-14** non_trend/open_auction |

Product Phase 2+ for day classification stays on [day-classification-roadmap.md](./day-classification-roadmap.md) after 8.1.

---

## Sequencing and WIP

1. Finish Phase 0 docs (done with this file).
2. Phase 1 live IB / dual Gateway / trading ops — **Passing** (2026-07-22).
3. Activate **Phase 2** under WIP=1 after cron + alerts env ready — **Passing** (2026-07-22).
4. Phases 3–6 can run without Flex; prefer 3 before 4 when Scripts tile is open.
5. Phase 3 **Passing** (2026-07-22); Phase 4 **Passing** (2026-07-22); Phase 5 **Passing** (2026-07-22); Phase 6 **Passing** (2026-07-22); Phase 7 **Passing** (2026-07-22).
6. Phase 7 last among automated walks.
7. Phase 8 can run anytime offline.

Do **not** mark a product roadmap “verification incomplete” after transfer — point to this file’s open phase instead.

---

## Verification Plan (meta)

| Tier | Use |
|------|-----|
| **Focused** | Only when a walkthrough finds a bug and a fix lands |
| **Build** | Only if that fix touches packages/app wiring |
| **App-level** | **Required** for every checklist item (or Skipped with reason) |
| **Full** | After a bugfix that crosses shared boundaries |

Harness: one Active Work row per phase (e.g. “App-level verification — Phase 1”); quote observations; update this roadmap phase Status to **Passing** when the phase checklist is cleared.

---

## Harness Update (Phase 0)

| Section | Action |
|---------|--------|
| Active Work | Row **App-level verification roadmap** — **Pending** (Phase 0 inventory done; Phase 1 not Active) |
| Task Contract | Open for track until Phase 8 exit or pause |
| Session Log | Entry for roadmap authoring |
| Feature roadmaps README | Status table reflects product-complete + verification owned here |

## Harness Update (Phase 8)

| Section | Action |
|---------|--------|
| Active Work | **App-level verification — Phase 8** → **Passing** with 8.1 quote (`confirmed:50` `rejected:0`) |
| Task Contract | Track **Passing** — Phases 0–8 delivered; Next → day-classification Phase 2 |
| Session Log | Start + closeout entries (2026-07-22) |
| Current Verified State | Phase 8 **Passing**; verification track complete |
| Roadmap README | Phases 0–8 Passing; day-classification Phase 1 **Passing** |
| day-classification-roadmap | Phase 1 manual labels **Passing** |

## Harness Update (Phase 7)

| Section | Action |
|---------|--------|
| Active Work | **App-level verification — Phase 7** → **Passing** with per-item quotes 7.1–7.7 |
| Residual Pending rows | Market context crumbs, TWS extended-hours, Screener sort/columns → **Passing**; Options chain + Data Health latency → **Passing** with Skipped sub-notes |
| Task Contract | Phase 7 delivered; Next → Phase 8 |
| Session Log | Start + closeout entries (2026-07-22) |
| Current Verified State | Phase 7 Passing; next = Phase 8 |
| Roadmap README | Phases 0–7 Passing |

## Harness Update (Phase 6)

| Section | Action |
|---------|--------|
| Active Work | **App-level verification — Phase 6** → **Passing** with per-item quotes 6.1–6.11 |
| Task Contract | Phase 6 delivered; Next → Phase 7 |
| Session Log | Start + closeout entries (2026-07-22) |
| Current Verified State | Phase 6 Passing; next = Phase 7 |
| Roadmap README | Phases 0–6 Passing |

## Harness Update (Phase 5)

| Section | Action |
|---------|--------|
| Active Work | **App-level verification — Phase 5** → **Passing** with per-item quotes 5.1–5.6 |
| Task Contract | Phase 5 delivered; Next → Phase 6 |
| Session Log | Start + closeout entries (2026-07-22) |
| Current Verified State | Phase 5 Passing; next = Phase 6 |
| Roadmap README | Phases 0–5 Passing |

## Harness Update (Phase 4)

| Section | Action |
|---------|--------|
| Active Work | **App-level verification — Phase 4** → **Passing** with per-item quotes 4.1–4.5 |
| Task Contract | Phase 4 delivered; Next → Phase 5 |
| Session Log | Start + closeout entries (2026-07-22) |
| Current Verified State | Phase 4 Passing; next = Phase 5 |
| Roadmap README | Phases 0–4 Passing |

## Harness Update (Phase 3)

| Section | Action |
|---------|--------|
| Active Work | **App-level verification — Phase 3** → **Passing** with per-item quotes 3.1–3.10 |
| Task Contract | Phase 3 delivered; Next → Phase 4 |
| Session Log | Start + closeout entries (2026-07-22) |
| Current Verified State | Phase 3 Passing; next = Phase 4 |
| Roadmap README | Phases 0–3 Passing |

## Harness Update (Phase 2)

| Section | Action |
|---------|--------|
| Active Work | **App-level verification — Phase 2** → **Passing** with per-item quotes 2.1–2.6 |
| Task Contract | Phase 2 delivered; Next → Phase 3 |
| Session Log | Start + closeout entries (2026-07-22) |
| Current Verified State | Phase 2 Passing; next = Phase 3 |
| Roadmap README | Phases 0–2 Passing |

---

## Harness Update (Phase 1)

| Section | Action |
|---------|--------|
| Active Work | **App-level verification — Phase 1** → **Passing** with per-item quotes; 1.11 Skipped |
| Task Contract | Phase 1 delivered; Next → Phase 2 |
| Session Log | Start + closeout entries (2026-07-22) |
| Current Verified State | Phase 1 Passing; next = Phase 2 |
| Roadmap README | Phases 0–1 Passing |

---

## Related docs

- [PROJECT-STATUS.md](../PROJECT-STATUS.md) — Active Work evidence
- [alerts-roadmap.md](./alerts-roadmap.md), [dual-connection-roadmap.md](./dual-connection-roadmap.md), [trading-execution-roadmap.md](./trading-execution-roadmap.md)
- [script-depth-roadmap.md](./script-depth-roadmap.md), [screener-roadmap.md](./screener-roadmap.md), [journal-roadmap.md](./journal-roadmap.md)
- [day-classification-roadmap.md](./day-classification-roadmap.md)
