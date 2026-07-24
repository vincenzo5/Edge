# Project Status

Single source for **current** progress. Historical harness dumps: [status-archive/](./status-archive/). For row-by-row feature detail, see [chart/features.md](./chart/features.md).

**Last updated:** 2026-07-24

## Current Verified State

- **Current task:** Trade management playbook — Phase 6.
- **State:** **Passing** — Trade management playbook — Phase 6 closeout via harness:closeout
- **Latest verification:** Trade management playbook — Phase 6 verification (2026-07-24); Focused: npm test -- --run src/lib/trading/playbook src/lib/trading/tradingService.test.ts src/lib/trading/playbookInstanceStore.test.ts src/app/api/trading/playbooks src/lib/alerts/tradePlanAlerts.test.ts; Result: Test Files 21 passed (21), Tests 104 passed (104); Build: npm run build — ✓ Compiled successfully; Architecture review: self-review Passed; App-level: attach Manage + notify → notification at level (no order from alert cron) deferred; Delivered:; - manageNotifyAlerts.ts + buildManageNotifyAlertInputs; - PlaybookInstance.alertBundleId + migration 0036; - expireAlertsForBundleId (repo + alertClient); - TradingService attach/detach notify bundle wiring; - ManagePlaybookPicker notify toggle + TradeOrderForm/ProtectiveOcoForm payloads
- **Evidence:** see Active Work row
- **Current blocker:** none
- **Next best step:** Activate Trade management playbook Phase 7 under WIP=1 — AI playbook tools

## Previous Verified State (Research UX — Phase 7)

- **Current task:** Research UX — Phase 7.
- **State:** **Passing** — Session reel — auto/manual beats, filmstrip UI, draft journal from reel
- **Latest verification:** Research UX Phase 7 — Session reel (2026-07-24); Focused:; npm test -- --run src/lib/research src/app/components/research; Test Files  13 passed (13); Tests  62 passed (62); Build:; npm run build; ✓ Compiled successfully; Architecture review: self-review Passed; Delivered:; - reelBeats.ts — append/dedupe/reorder/prune pure helpers; - boardSessionStore reel mutators + auto-append on card add/import + prune on card delete; - BoardReelFilmstrip.tsx — horizontal filmstrip, checkpoint focused, draft journal; - reelJournalDraft.ts — compose journalDraft summary from ordered reel; - useResearchBoardSession + ResearchBoard wiring; App-level: reel scrub + draft journal walkthrough deferred
- **Evidence:** `reelBeats.ts`, `reelJournalDraft.ts`, `boardSessionStore.ts`, `BoardReelFilmstrip.tsx`, `useResearchBoardSession.ts`, `ResearchBoard.tsx`, `researchUxPhase7.test.ts`, `research/ARCHITECTURE.md`, `research-ux-roadmap.md`
- **Current blocker:** none
- **Next best step:** Activate Research UX Phase 8 under WIP=1 — research-default entry (opt-in)
## Previous Verified State (App-level verification wave 2 — Phase 4)

- **Current task:** App-level verification wave 2 — Phase 4.
- **State:** **Active** — Ops residuals walks 4.1–4.5 (Redis, journal import, MCP alerts, calm header)
- **Latest verification:** pending
- **Evidence:** `docs/roadmaps/app-level-verification-wave-2-roadmap.md`, `docs/evidence/app-level-verification-wave-2-phase-4.txt`
- **Current blocker:** none
- **Next best step:** Run walks 4.1–4.5 on `http://localhost:3003` with quoted app-level evidence
## Previous Verified State (Trade management playbook — Phase 5)

- **Current task:** Trade management playbook — Phase 5.
- **State:** **Passing** — Trade management playbook — Phase 5 closeout via harness:closeout
- **Latest verification:** Trade management playbook — Phase 5 verification (2026-07-24); Focused: npm test -- --run src/lib/trading/playbook src/lib/trading/playbookTemplateStore.test.ts src/lib/trading/tradingService.test.ts src/app/api/trading/playbooks src/lib/journal/rebuildTrades.test.ts src/app/components/journal/JournalTradeDetail.test.tsx; Result: Test Files 21 passed (21), Tests 103 passed (103); Build: npm run build — ✓ Compiled successfully; Architecture review: self-review Passed; App-level: save template → attach → fire → journal Manage section deferred; Delivered:; - templateSnapshot on PlaybookInstance + resolvePlaybookTemplateFromInstance; - playbookTemplateStore + migration 0033 + templates CRUD API; - ManagePlaybookPicker user template library (duplicate/rename/delete); - journal_trades.manage_playbook + syncManagePlaybookToJournal + rebuild preserve; - JournalTradeDetail Manage section with adherence + rule timeline
- **Evidence:** see Active Work row
- **Current blocker:** none
- **Next best step:** Trade management track complete — activate next WIP=1 priority

## Previous Verified State (App-level verification wave 2 — Phase 3)

- **Current task:** App-level verification wave 2 — Phase 3.
- **State:** **Passing** — Connections & provider preference walks 3.1–3.3 — Settings console, prefs → meta.source, displayName reload
- **Latest verification:** App-level verification Wave 2 — Phase 3 (2026-07-24); URL: http://localhost:3003/workspace; App-level: 3.1 Settings Connections + Market data — app-settings-connections-section + app-settings-market-data-section; ib-live/ib-paper rows; provider table 7 rows; secretHits=0; App-level: 3.2 preference→meta.source — yahoo-first order [yahoo,tws,ibkr,massive]; cold POST OKTA meta.source=yahoo warnings=0; feed chip Fallback · YAHOO · streaming; App-level: 3.3 displayName — PATCH ib-paper→Wave2 Paper Gateway; reload settings input=Wave2 Paper Gateway; app-market-data-option-ib-paper=Wave2 Paper Gateway; chip=Wave2 Paper Gateway after select; 3.1 Settings Connections + Market data console; - app-settings-connections-section + app-settings-market-data-section visible from Application settings gear; - Connection rows: app-settings-connection-row-ib-live (Live trading · Disconnected); app-settings-connection-row-ib-paper (Paper trading · Disconnected); - Provider table 7 rows (tws Degraded sidecar_unreachable; massive Healthy; yahoo Degraded; fmp/fred/sec configured); - Copy: API keys stay in server environment; Trading still requires broker-backed quotes; - secretHits: [] (env var names only e.g. MASSIVE_API_KEY — no secret values); 3.2 Preference → meta.source; - Default localStorage edge:marketData:providerPreference:v1 orderedProviders [tws, ibkr, massive, yahoo]; - Moved Yahoo Finance up ×3 → [yahoo, tws, ibkr, massive] via app-settings-provider-preference-list; - Cold POST /api/candles symbol=OKTA providerPreference yahoo-first → meta.source=yahoo warnings=[] cacheTier=cold; - Chart feed chip: Fallback · YAHOO · streaming; 3.3 Connection displayName; - PATCH /api/me/connections/ib-paper displayName=Wave2 Paper Gateway (authenticated dev session); - Full reload → app-settings-connection-name-ib-paper value=Wave2 Paper Gateway; - Header app-market-data-option-ib-paper=Wave2 Paper Gateway; selecting paper → app-market-data-picker chip=Wave2 Paper Gateway
- **Evidence:** `docs/roadmaps/app-level-verification-wave-2-roadmap.md`, `ConnectionsSettingsSection.tsx`, `MarketDataSettingsSection.tsx`, `MarketDataConnectionMenu.tsx`, `docs/evidence/app-level-verification-wave-2-phase-3.txt`
- **Current blocker:** none
- **Next best step:** Activate App-level verification wave 2 Phase 4 under WIP=1 — Redis/journal/MCP/calm header walks 4.1–4.5
## Previous Verified State (Research UX — Phase 5)

- **Current task:** Research UX — Phase 5.
- **State:** **Passing** — AI board conductor (registry tools + confirms)
- **Latest verification:** Research UX Phase 5 verification (2026-07-24); Focused: npm test -- --run src/lib/ai/tools/research src/lib/research src/app/components/research; Test Files  10 passed (10); Tests  54 passed (54); Build: research.ts types pass; full build blocked by pre-existing ManagePlaybookPicker.tsx EdgeButton density prop; Architecture review: self-review Passed
- **Evidence:** `boardFocusStore.ts`, `researchBoardPort.ts`, `research.ts`, `research.test.ts`, `researchUxPhase5.test.ts`, `AiToolsProvider.tsx`, `BoardCanvas.tsx`, `research-ux-roadmap.md`, `research/ARCHITECTURE.md`, `ai-tools-architecture.md`
- **Current blocker:** none
- **Next best step:** Activate Research UX Phase 6 under WIP=1 — Research Session persistence (cloud API)
## Previous Verified State (Execute-from-plan git commit closeout)

- **Current task:** Execute-from-plan git commit closeout.
- **State:** **Active** — Commit after Passing on execute closeout (instruction + lint assert)
- **Latest verification:** Pending — `npm run lint:instructions`
- **Evidence:** `.cursor/rules/execute-from-plan.mdc`, `docs/checklists/execute-from-plan-checklist.md`, `docs/checklists/session-exit-checklist.md`, `plan-harness-awareness.mdc`, `planning-router.md`, `AGENTS.md`, `scripts/validate-agent-instructions.mts`
- **Current blocker:** none
- **Next best step:** Pass `npm run lint:instructions`; commit task changes; mark Passing
## Previous Verified State (App-level verification wave 2 — Phase 2)

- **Current task:** App-level verification wave 2 — Phase 2.
- **State:** **Passing** — Grok Copilot UX parity walks 2.1–2.4 — empty state, pill geometry, in-bar model menu, active thread chrome
- **Latest verification:** App-level verification Wave 2 Phase 2 closeout 2026-07-24 on http://localhost:3003/copilot.; App-level: 2.1 empty state — copilot-empty-brand Edge logo hero + centered copilot-query-bar + 4 workflow chips; no copilot-panel-header; placeholder "What do you want to know?".; App-level: 2.2 pill geometry — query-bar 800×60px @1440 and @1024, minHeight 60px, bg rgb(20,20,20), circular submit 36×36; Submit→Stop during stream.; App-level: 2.3 in-bar model menu — 5 options, Grok 4.5 aria-checked=true; switch to openai/gpt-5.6-sol → chip GPT-5.6; 0 copilot-model-select header.; App-level: 2.4 active thread chrome — history rail 280px data-collapsed=true; copilot-thoughts open with 6 tool steps; Copy+Regenerate on message 3d96d50d-628c-4d0a-a4fe-77bd3510fb79.; Focused: Test Files 1 passed (1), Tests 8 passed (8) (validateOrder.test.ts after playbookAutoManageStore import fix).
- **Evidence:** `docs/roadmaps/app-level-verification-wave-2-roadmap.md`, `docs/assets/grok-parity/`, `src/app/components/copilot/`, `src/lib/trading/playbookAutoManageStore.ts`
- **Current blocker:** none
- **Next best step:** Activate App-level verification wave 2 Phase 3 under WIP=1 — Connections & provider preference walks 3.1–3.3

## Previous Verified State (Trade management playbook — Phase 3)

- **Current task:** Trade management playbook — Phase 3.
- **State:** **Passing** — Trail attachTrail + auto-manage prefs/live gates + next-rule distance/Flatten + manual-stop pause
- **Latest verification:** Trade management playbook — Phase 3 verification (2026-07-24); Focused: npm test -- --run src/lib/trading/playbook src/lib/trading/playbookAutoManageStore.test.ts src/lib/trading/tradingService.test.ts src/app/api/cron/playbook-evaluate src/app/api/trading/playbooks; Result: Test Files 14 passed (14), Tests 74 passed (74); Build: npm run build — compile OK; Architecture review: self-review Passed; App-level: paper trail after half-scale + live far-from-market manage deferred; Delivered:; - attachTrail cancel+TRAIL in executeThen.ts; - playbookAutoManageStore + migration 0031 + /api/trading/playbooks/auto-manage; - Live evaluator gates in runPlaybookEvaluation + TradingService.evaluatePlaybooks; - formatNextManageDistance + Flatten now in OpenRiskPositionsMenu + AccountPanel; - buildManualStopPausePatch wired in TradingService.modifyOrder
- **Evidence:** `executeThen.ts`, `playbookAutoManageStore.ts`, `migration 0031`, `/api/trading/playbooks/auto-manage`, `runPlaybookEvaluation.ts`, `OpenRiskPositionsMenu.tsx`, `AccountPanel.tsx`, `PlaybookAutoManageSettings.tsx`
- **Current blocker:** none
- **Next best step:** Activate Trade management playbook Phase 4 under WIP=1 — chart/OCO parity
## Previous Verified State (Research UX — Phase 3)

- **Current task:** Research UX — Phase 3.
- **State:** **Passing** — Spatial Board at /research — pan/zoom canvas, card nodes, directed links, evidence Send to board, local session store; Desk bridge via openResearchCard
- **Latest verification:** Research UX Phase 3 — Board v1 (manual); Focused:; Test Files  5 passed (5); Tests  13 passed (13); Build:; ✓ Compiled successfully; App-level (manual):; /copilot pin artifact → Send to board → /research shows card node; Shift+click two cards → directed link rendered; Reload /research → cards + links restored from tv-ai:research-sessions:v1; Density switcher Desk → /workspace intact; Architecture review: self-review Passed (session vs evidence vs Desk boundaries; no AI board tools)
- **Evidence:** `boardSessionStore.ts`, `ResearchBoard.tsx`, `BoardCanvas.tsx`, `BoardCardNode.tsx`, `BoardLinksLayer.tsx`, `BoardEmptyState.tsx`, `useResearchBoardSession.ts`, `CopilotEvidenceRail.tsx`, `CopilotArtifactCard.tsx`, `researchUxPhase3.test.ts`, `research-ux-roadmap.md`, `research/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Activate Research UX Phase 4 under WIP=1 — live chart cards + Desk promote
## Previous Verified State (App-level verification wave 2 — Phase 2)

- **Current task:** App-level verification wave 2 — Phase 2.
- **State:** **Active** — Grok Copilot UX parity walks 2.1–2.4 (empty state, pill geometry, in-bar model menu, active thread chrome)
- **Latest verification:** pending
- **Evidence:** `docs/roadmaps/app-level-verification-wave-2-roadmap.md`, `docs/assets/grok-parity/`, `src/app/components/copilot/`
- **Current blocker:** none
- **Next best step:** Run walks 2.1–2.4 on `http://localhost:3003/copilot` with quoted app-level evidence
## Previous Verified State (Trade management playbook — Phase 2)

- **Current task:** Trade management playbook — Phase 2.
- **State:** **Passing** — Paper manager cron evaluates armed instances; BE (`modifyStop`) + scale-out (`reduceQty`) via TradingService; instance patch (ruleRuntimes/stopOrderId/filledQty); Pause/Resume/Skip + Detach on open-risk/Account
- **Latest verification:** Focused: Test Files 11 passed (11), Tests 49 passed (49) + service pause/resume/skip 1 passed (1); Build: ✓ Compiled successfully in 9.1s; Architecture review: self-review Passed; App-level: paper BE/scale proof deferred
- **Evidence:** `src/lib/trading/playbook/{evaluateWhen,executeThen,runPlaybookEvaluation,resolveStopOrder}.ts`, migration `0030`, `/api/cron/playbook-evaluate`, `/api/trading/playbooks/[id]/{pause,resume,skip}`, `OpenRiskPositionsMenu.tsx`, `AccountPanel.tsx`, `trading/ARCHITECTURE.md`, `trade-management-playbook-roadmap.md`
- **Current blocker:** none
- **Next best step:** Activate Trade management playbook Phase 3 under WIP=1 — trail remainder + live gates
## Previous Verified State (Trade management playbook — Phase 1)

- **Current task:** Trade management playbook — Phase 1.
- **State:** **Passing** — Trade ticket Manage with… attach + PlaybookInstance persist on bracket submit; open-risk/Account read-only status + Detach (Protect untouched); no server manager
- **Latest verification:** Focused: Test Files 8 passed (8), Tests 39 passed (39) + tradingService playbook tests 2 passed (2); Build: compile OK; Architecture review: self-review Passed; App-level: deferred
- **Evidence:** `playbookInstanceStore.ts`, `TradeOrderForm.tsx`, `OpenRiskPositionsMenu.tsx`, `AccountPanel.tsx`, `/api/trading/playbooks`, `trading/ARCHITECTURE.md`, `trade-management-playbook-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Phase 2 closeout above.

## Previous Verified State (Research UX — Phase 1)

- **Current task:** Research UX — Phase 1.
- **State:** **Passing** — Density switch Talk/Board/Desk in app chrome; Board stub at /research; Talk/Board lead home hub; Desk /workspace unchanged; root lastModule unchanged
- **Latest verification:** Focused: Test Files 6 passed (6), Tests 33 passed (33); Architecture review: self-review Passed; App-level: /copilot Talk tab selected + density switcher visible; Desk click → /workspace with Workspace pill + Edit layout intact; /research Board tab selected + Open Talk/Open Desk stub CTAs
- **Evidence:** `src/lib/research/densityNav.ts`, `DensitySwitcher.tsx`, `ResearchBoardStub.tsx`, `AppTopHeader.tsx`, `HomeHubCards.tsx`, `research-ux-roadmap.md`
- **Current blocker:** none
- **Next best step:** Activate Research UX Phase 3 under WIP=1 — Research Board v1 (manual)

## Previous Verified State (Research UX — Phase 2)

- **Current task:** Research UX — Phase 2.
- **State:** **Passing** — Copilot artifactHint on tool-result stream; pinable artifact cards in chat; Talk evidence rail (page variant); session-local evidence store; chart/screener/journal deep links; confirms unchanged
- **Latest verification:** Focused: Test Files 17 passed (17), Tests 101 passed (101); Architecture review: self-review Passed; App-level: pin artifact → rail list → Open deep link → unpin on /copilot
- **Evidence:** `artifactHint.ts`, `evidenceStore.ts`, `CopilotArtifactCard.tsx`, `CopilotEvidenceRail.tsx`, `CopilotMessageList.tsx`, `CopilotPanel.tsx`, `research-ux-roadmap.md`
- **Current blocker:** none
- **Next best step:** Activate Research UX Phase 3 under WIP=1 — Research Board v1 (manual)

## Previous Verified State (App-level verification wave 2 — Phase 1)

- **Current task:** App-level verification wave 2 — Phase 1.
- **State:** **Active** — Copilot agent functional walks 1.1–1.8 (stream → bridge → confirm → linkage → persist → model → workflows)
- **Latest verification:** pending
- **Evidence:** `docs/roadmaps/app-level-verification-wave-2-roadmap.md`, `src/app/api/ai/chat/route.ts`, `src/app/components/copilot/`
- **Current blocker:** none
- **Next best step:** Run walks 1.1–1.8 on `http://localhost:3003` with quoted app-level evidence
## Previous Verified State (Shared cache topology — Phase 4)

- **Current task:** Shared cache topology — Phase 4.
- **State:** **Active** — Redis ops profile (compose maxmemory + noeviction + ephemeral); deploy contract docs; manual parity — no CI workflow
- **Latest verification:** pending
- **Evidence:** `docker-compose.yml`, `marketData/ARCHITECTURE.md`, `.env.example`, `shared-cache-topology-roadmap.md`
- **Current blocker:** none
- **Next best step:** Manual Redis parity + harness closeout
## Previous Verified State (Trade management playbook — Phase 0)

- **Current task:** Trade management playbook — Phase 0.
- **State:** **Active** — Frozen Zod contracts + 5 presets + pure planners + conflict policy; no UI/API/manager
- **Latest verification:** pending
- **Evidence:** `src/lib/trading/playbook/`, `trading/ARCHITECTURE.md`, `trade-management-playbook-roadmap.md`
- **Current blocker:** none
- **Next best step:** Focused playbook tests + harness closeout
## Previous Verified State (Shared cache topology — Phase 3 (key namespace))

- **Current task:** Shared cache topology — Phase 3.
- **State:** **Passing** — Key namespace and environment isolation — `edge:{env}:{schemaVersion}:md:…` prefixes; `EDGE_CACHE_ENV` override; schema bump docs
- **Latest verification:** Focused: Test Files 3 passed (3), Tests 16 passed (16); Architecture review: self-review Passed; App-level: N/A (key-root unit tests prove env isolation)
- **Evidence:** `redisKeys.ts`, `redisHotStore.ts`, `redisDataCache.ts`, `redisKeys.test.ts`, `ARCHITECTURE.md`, `.env.example`, `shared-cache-topology-roadmap.md`
- **Current blocker:** none
- **Next best step:** Activate Shared cache topology Phase 4 under WIP=1 — Redis ops profile and launch flip

## Previous Verified State (Shared cache topology — Phase 2 (backend observability))

- **Current task:** Shared cache topology — Phase 2.
- **State:** **Passing** — Health backend observability — /api/market-data/health cache kind/degraded/lastPing; redaction; fail-open ping
- **Latest verification:** Focused: Test Files 2 passed (2), Tests 11 passed (11); Architecture review: self-review Passed; App-level: N/A (health fields only; manual redis:up flip deferred)
- **Evidence:** `serverCacheHealth.ts`, `health.ts`, `route.ts`, `cache/health tests`, `ARCHITECTURE.md`, `shared-cache-topology-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Shared cache topology Phase 3 closeout above.

## Previous Verified State (Plan → execute token efficiency — Phase 6)

- **Current task:** Plan → execute token efficiency — Phase 6.
- **State:** **Passing** — Harness closeout helper — deterministic CLI; evidence-gated Active Work → Passing; focused tests + execute doc pointers
- **Latest verification:** **Focused:** Test Files 1 passed (1), Tests 13 passed (13); **Instructions:** `npm run lint:instructions` → `Instruction architecture validation passed.`; **Architecture review:** self-review **Passed**
- **Evidence:** `scripts/harness-closeout.mts`, `scripts/harness-closeout.test.ts`, `package.json`, `docs/checklists/execute-from-plan-checklist.md`, `.cursor/rules/execute-from-plan.mdc`, `AGENTS.md`, `docs/roadmaps/plan-execute-token-efficiency-roadmap.md`
- **Current blocker:** none
- **Next best step:** Track complete — process A/B on next product phases

## Previous Verified State (Plan → execute token efficiency — Phase 5)

- **Current task:** Plan → execute token efficiency — Phase 5 (fresh-chat execute process).
- **State:** **Passing** — Fresh-chat execute section in execute checklist + rule; AGENTS Work Boundaries one-liner; validator asserts for `/handoff` + `.plan.md`; product-phase trial deferred.
- **Latest verification:** **Instructions:** `npm run lint:instructions` → `Instruction architecture validation passed.`
- **Evidence:** `docs/checklists/execute-from-plan-checklist.md`, `.cursor/rules/execute-from-plan.mdc`, `AGENTS.md`, `scripts/validate-agent-instructions.mts`, `docs/roadmaps/plan-execute-token-efficiency-roadmap.md`
- **Current blocker:** none
- **Next best step:** Token efficiency Phase 6 (harness closeout helper) when prioritized under WIP=1.
## Previous Verified State (Plan → execute token efficiency — Phase 4)

- **Current task:** Plan → execute token efficiency — Phase 4 (scope plan-rule injection).
- **State:** **Passing** — `plan-execute-routing.mdc` always-apply stub routes Plan vs Execute; `plan-harness-awareness.mdc` demoted to agent-requestable; validator allowlist + asserts updated; status split deferred.
- **Latest verification:** **Instructions:** `npm run lint:instructions` → `Instruction architecture validation passed.`
- **Evidence:** `.cursor/rules/plan-execute-routing.mdc`, `.cursor/rules/plan-harness-awareness.mdc`, `.cursor/rules/execute-from-plan.mdc`, `scripts/validate-agent-instructions.mts`, `AGENTS.md`, `docs/roadmaps/plan-execute-token-efficiency-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by token efficiency Phase 5 closeout above.

## Previous Verified State (Plan → execute token efficiency — Phase 3)

- **Current task:** Plan → execute token efficiency — Phase 3 (hot harness read windows).
- **State:** **Passing** — Plan/Execute hot windows in harness checklist; pointers in plan-harness, planning-router, execute rule/checklist, AGENTS; lint asserts for hot-window language + ≤2 status-read cap.
- **Latest verification:** **Instructions:** `npm run lint:instructions` → `Instruction architecture validation passed.`
- **Evidence:** `docs/checklists/harness-status-checklist.md`, `.cursor/rules/plan-harness-awareness.mdc`, `.cursor/rules/execute-from-plan.mdc`, `docs/checklists/execute-from-plan-checklist.md`, `docs/checklists/planning-router.md`, `AGENTS.md`, `validate-agent-instructions.mts`, `plan-execute-token-efficiency-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by token efficiency Phase 4 closeout above.

## Previous Verified State (Memory efficiency — Phase 14)

- **Current task:** Memory efficiency — Phase 14 (app-level verification closeout).
- **State:** **Passing** — upgraded `perf:memory` with Phase 14 walk table; deferred memory walks closed (Phases 1–11 + 13); journal provider walk **Skipped** (`skippedNoAuth`); trades scroll **Skipped** (`skippedLargeFixture`).
- **Latest verification:** **App-level:** `npm run perf:memory` → node `candlesLength:4419` `withinSoftMax:true`; server `withinDataCacheCap:true` `withinHotStoreCap:true` `rssDeltaMb:57.48`; browser B1 `maxCandlesLength:3960` `pass:true`; B2 `inactiveChartSurfaces:7` `mountedEngines:1` `eventSourceCount:4` `activeCellSwitch.pass:true`; B3 `heapDeltaMb:0` `durationSec:60`; walks `phase7-copilot selectedCount:40`; `phase8-9-chart-only lazyChunkCount:0`; `phase10 skippedLargeFixture:true`; `phase7-journal skippedNoAuth:true`; **Architecture review:** self-review **Passed**.
- **Evidence:** `scripts/run-memory-baseline.mts`, `docs/perf/memory-baseline-latest.json`, `memory-efficiency-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by token efficiency Phase 2 closeout above.

## Previous Verified State (Calm connection status UX)

- **Current task:** Calm connection status UX.
- **State:** **Passing** — one health projection drives header incident + user `Reconnect`; chart overlay is feed chip + Data Health dot only; Data Health / Settings keep ops recover labels; API/env errors no longer render in header.
- **Latest verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 40 passed (40)`; **Architecture review:** self-review **Passed**.
- **Evidence:** `healthProjection.ts`, `ChartOverlayDataHealthRow.tsx`, `AppTopHeader.tsx`, `AppHeaderConnectionIncident.tsx`, `AppProviders.tsx`, `AccountPanel.tsx`, tests, `marketData/ARCHITECTURE.md`, `app-ux-polish-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Memory efficiency Phase 14 activation above.

## Previous Verified State (Security hardening — Phase 6)

- **Current task:** Security hardening — Phase 6 (session lifetime + prompt boundaries).
- **State:** **Passing** — signed cookie payload includes `iat` + `jti` with 14-day server/browser TTL; legacy cookies rejected; workspace snapshot fenced as untrusted user context; client `system` chat roles stripped; orchestrator 48k content budget before OpenRouter.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 31 passed (31)`; **Architecture review:** self-review **Passed**.
- **Evidence:** `signedCookieCore.ts`, `devSessionCookie.ts`, `devSession.ts`, `getCurrentUser.ts`, `promptBoundaries.ts`, `orchestrate.ts`, `contracts.ts`, tests, `.env.example`, `docs/CONSTRAINTS.md`, `persistence/ARCHITECTURE.md`, `ai/ARCHITECTURE.md`, `security-hardening-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Calm connection status UX closeout above.

## Previous Verified State (Security hardening — Phase 5)

- **Current task:** Security hardening — Phase 5 (transport defaults + HTTP headers).
- **State:** **Passing** — enforced CSP + production HSTS in Next headers; IBKR TLS verify defaults on; non-loopback `TWS_SIDECAR_URL` requires `TWS_SIDECAR_SECRET`; brokerage stream sends sidecar auth header.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 13 passed (13)`; **Build:** `✓ Compiled successfully in 8.5s`; TS exit blocked by pre-existing `connections/[id]/reconnect/route.ts` PersistenceErrorCode; **App-level:** CSP header present on `/` (`Content-Security-Policy` with `wasm-unsafe-eval`, no HSTS in dev); **Architecture review:** self-review **Passed**.
- **Evidence:** `httpHeaders.mjs`, `next.config.mjs`, `sidecarAuth.ts`, `ibkr/client.ts`, `brokerage/stream/route.ts`, `brokerageClient.ts`, `ibTws.ts`, `tws/client.ts`, tests, `.env.example`, `docs/CONSTRAINTS.md`, `marketData/ARCHITECTURE.md`, `security-hardening-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Security hardening Phase 6 closeout above.

## Previous Verified State (Memory efficiency — Phase 11)

- **Current task:** Memory efficiency — Phase 11 (inactive cell unmount).
- **State:** **Passing** — inactive multi-cell peers unmount `EdgeChart` (`mountChartEngine = isActive || liveProp === true`); `InactiveChartSurface` placeholder; viewport/drawings flushed to `CellConfig` before teardown; remount from layout + `chartClientCache`; journal fork `live` override unchanged.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 11 passed (11)`; **Architecture review:** self-review **Passed**; **App-level:** 8-cell heap/subscription walkthrough deferred (Phase 14).
- **Evidence:** `ChartCell.tsx`, `InactiveChartSurface.tsx`, `useViewportPersistSync.ts`, `useDrawingLayoutSync.ts`, tests, `chart/ARCHITECTURE.md`, `chartDataFeed/ARCHITECTURE.md`, `memory-efficiency-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Security hardening Phase 5 closeout above.

## Previous Verified State (Memory efficiency — Phase 10)

- **Current task:** Memory efficiency — Phase 10 (journal list virtualization).
- **State:** **Passing** — `@tanstack/react-virtual` on trades table; full filtered list scroll; pagination removed; filter/sort/column prefs unchanged; Phase 7 provider window unchanged.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 35 passed (35)`; **Architecture review:** self-review **Passed**; **App-level:** large-fixture Trades-tab scroll walkthrough deferred (Phase 14).
- **Evidence:** `JournalTradesTable.tsx`, `JournalTradesView.tsx`, `JournalTradesTableControls.tsx`, `journalTradesTableControls.ts`, tests, `journal/ARCHITECTURE.md`, `memory-efficiency-roadmap.md`, `package.json`
- **Current blocker:** none
- **Next best step:** Superseded by Memory efficiency Phase 11 closeout above.

## Previous Verified State (Grok Copilot UX parity — Phase 4)

- **Current task:** Grok Copilot UX parity — Phase 4 (active thread chrome).
- **State:** **Passing** — collapsible ~280px history rail on `/copilot` + wide tile; sidebar keeps header thread select; Thoughts disclosure for non-confirm tool steps; confirm Accept/Reject stays outside; Copy + Regenerate last assistant turn; streaming cursor placeholder.
- **Latest verification:** **Focused:** `Test Files 13 passed (13)`, `Tests 73 passed (73)`; **Architecture review:** self-review **Passed**; **App-level:** `/copilot` rail/Thoughts/regenerate walkthrough deferred.
- **Evidence:** `CopilotShell.tsx`, `CopilotHistoryRail.tsx`, `CopilotMessageList.tsx`, `CopilotPanel.tsx`, `useCopilotThread.ts`, tests, `globals.css`, `grok-copilot-parity-roadmap.md`, architecture docs
- **Current blocker:** none
- **Next best step:** Superseded by Grok Copilot UX parity Phase 5 closeout above.

## Previous Verified State (Security hardening — Phase 4)

- **Current task:** Security hardening — Phase 4 (tenant integrity + href safety).
- **State:** **Passing** — M1 same-user ownership on research-note workspace, journal snapshot screenshot, alert→notification links; M2 `safeHref` allowlist at schema/emit/render.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 14 passed (14)`; **Architecture review:** self-review **Passed**.
- **Evidence:** `safeHref.ts`, `PersistenceOwnershipError`, `marketResearchNotesRepository.ts`, `journalChartSnapshotRepository.ts`, `alertRepository.ts`, `notificationRepository.ts`, notification schema/UI, `SymbolDetailsPanel.tsx`, tests, `docs/CONSTRAINTS.md`, `persistence/ARCHITECTURE.md`, `security-hardening-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Grok Copilot UX parity Phase 4 closeout above.

## Previous Verified State (Connections & providers — Phase 4)

- **Current task:** Connections & providers — Phase 4 (product Connection model).
- **State:** **Passing** — user-scoped `connections` table + `/api/me/connections` list/get/patch/reconnect/disconnect; `AuthKind` on `Connection`; Settings + header Data picker bind to shared list (`SEED_CONNECTIONS` fallback on 503); ensure-seed from `ib-paper`/`ib-live` topology.
- **Latest verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 31 passed (31)`; **Architecture review:** self-review **Passed**; **App-level:** displayName persist + reload walkthrough deferred.
- **Evidence:** `src/lib/connections/`, `0027_connections.sql`, `connectionsRepository.ts`, `/api/me/connections/*`, `ConnectionsSettingsSection.tsx`, `MarketDataConnectionMenu.tsx`, `connections/ARCHITECTURE.md`, `connections-providers-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Security hardening Phase 3 closeout above.

## Previous Verified State (Security hardening — Phase 2)

- **Current task:** Security hardening — Phase 2 (Next.js advisory closeout).
- **State:** **Passing** — `next@16.2.11` (CVE-2026-64642 middleware-bypass range cleared); middleware + API auth regression tests green; production build passes; residual High audit items triaged (postcss/sharp via Next transitive, undici via `@cursor/sdk` — accept/defer).
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 11 passed (11)`; **Build:** `npm run build` exit 0; `✓ Compiled successfully in 7.9s`; `npm ls next` → `next@16.2.11`; **Audit:** `npm audit --omit=dev` → 11 vulns (4 high), no Next middleware advisory; **Architecture review:** self-review **Passed**.
- **Evidence:** `package.json`, `package-lock.json`, `middleware.test.ts`, `apiAuth.test.ts`, TS build fixes, `security-hardening-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Connections & providers Phase 4 closeout above.

## Previous Verified State (Connections & providers — Phase 3)

- **Current task:** Connections & providers — Phase 3 (ConfigSource abstraction).
- **State:** **Passing** — `ConfigSource` + `EnvConfigSource` in `src/lib/marketData/config/`; Massive/FMP/FRED/SEC/TWS/IBKR gate reads routed through `getConfigSource()`; key catalog documented; Settings/health unchanged (configured booleans only).
- **Latest verification:** **Focused:** `Test Files 34 passed (34)`, `Tests 139 passed (139)`; **Architecture review:** self-review **Passed**; **`lint:data-state-contracts`:** 24 pre-existing API route registration issues (unchanged by Phase 3).
- **Evidence:** `src/lib/marketData/config/`, provider client/adapter migrations, `marketData/ARCHITECTURE.md`, `connections/ARCHITECTURE.md`, `connections-providers-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Connections & providers Phase 4 closeout above.

## Previous Verified State (Grok Copilot UX parity — Phase 2)

- **Current task:** Grok Copilot UX parity — Phase 2 (composer query-bar).
- **State:** **Passing** — `CopilotComposer` pill query-bar (+ attach stub, model chip stub, circular ↑/stop); `--copilot-query-bar-*` tokens consumed; wide-host docked centering; header `EdgeSelect` retained until Phase 3.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 27 passed (27)`; **Architecture review:** self-review **Passed**; **App-level:** pill geometry walkthrough vs grok.com captures deferred.
- **Evidence:** `CopilotComposer.tsx`, `CopilotShell.tsx`, `CopilotPanel.tsx`, `CopilotComposer.test.tsx`, `globals.css`, `grok-copilot-parity-roadmap.md`, `design-system/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by Grok Copilot UX parity Phase 3 closeout above.

## Previous Verified State (Memory efficiency — Phase 7)

- **Current task:** Memory efficiency — Phase 7 (journal window + Copilot context window).
- **State:** **Passing** — Journal provider loads open+closed trade window (limit 500) + compact fill-account index; Copilot send windows request to last 40 messages / 4k content; full thread persist unchanged.
- **Latest verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 29 passed (29)`; **Architecture review:** self-review **Passed**; **App-level:** journal large-fixture + long-thread walkthrough deferred.
- **Evidence:** `JournalTradesProvider.tsx`, `journalProviderLoad.ts`, `journalClient.ts`, `fills/account-index/route.ts`, `filterTradesByAccount.ts`, `selectChatRequestMessages.ts`, `useCopilotThread.ts`, `contracts.ts`, tests, `journal/ARCHITECTURE.md`, `ai/ARCHITECTURE.md`, `memory-efficiency-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Grok Copilot UX parity Phase 2 activation above.

## Previous Verified State (Connections & providers — Phase 2)

- **Current task:** Connections & providers — Phase 2 (market-data preference store).
- **State:** **Passing** — persist display provider order/disable; `MarketDataService` waterfalls honor prefs; Settings reorder/disable; trading paths ignore broker disable; HotStore/chart cache invalidation on pref change.
- **Latest verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 103 passed (103)`; **Architecture review:** self-review **Passed**; **App-level:** Settings preference → chart `meta.source` walkthrough deferred.
- **Evidence:** `dataProviderPreference.ts`, `providerWaterfall.ts`, `marketDataService.ts`, `MarketDataSettingsSection.tsx`, `userPreferences` schema/sync, `connections-providers-roadmap.md`, `marketData/ARCHITECTURE.md`, `connections/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by Memory efficiency Phase 7 closeout above.

## Previous Verified State (Grok Copilot UX parity — Phase 1)

- **Current task:** Grok Copilot UX parity — Phase 1 (shared shell + empty state).
- **State:** **Passing** — `CopilotShell` with host variants; Grok empty hero (brand + centered composer + workflow chips); no dense `EdgePanelHeader` on empty; `.copilot-shell` CSS aliases; sidebar/page/tile wired.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 21 passed (21)`; **Architecture review:** self-review **Passed**; **App-level:** empty-state layout walkthrough deferred (structure matches frozen contract).
- **Evidence:** `CopilotShell.tsx`, `CopilotEmptyBrand.tsx`, `CopilotPromptLibrary.tsx`, `CopilotPanel.tsx`, `CopilotComposer.tsx`, `CopilotMessageList.tsx`, `CopilotModuleShell.tsx`, `globals.css`, tests, `design-system/ARCHITECTURE.md`, `grok-copilot-parity-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Connections & providers Phase 2 closeout above.

## Previous Verified State (Memory efficiency — Phase 6)

- **Current task:** Memory efficiency — Phase 6 (series layer retain + geometry recycle).
- **State:** **Passing** — crosshair-only series OffscreenCanvas blit; viewport pans rebuild with recycled Float32 geometry; background blits on pan; caches + scheduler dispose on unmount.
- **Latest verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 33 passed (33)`; **Build:** `npm run build:packages` exit 0; **Architecture review:** self-review **Passed**.
- **Evidence:** `layerCache.ts`, `renderScheduler.ts`, `paneRenderer.ts`, `layers.ts`, `useCanvasRenderer.ts`, `geometryBufferPool.ts`, `candleGeometry.ts`, `seriesGeometry.ts`, `candleWebGL.ts`, `indicatorWebGL.ts`, tests, `chart/ARCHITECTURE.md`, `marketData/ARCHITECTURE.md`, `memory-efficiency-roadmap.md`
- **Current blocker:** none
- **Next best step:** Activate Memory efficiency Phase 7 under WIP=1 — journal window + Copilot context window.

## Previous Verified State (Security hardening — Phase 1)

- **Current task:** Security hardening — Phase 1 (Operator secrets & diagnostics).
- **State:** **Passing** — `EDGE_ALLOW_OPEN_DEV_SESSION` gate for dev bootstrap; production **404** on local-errors; cron requires secret or session (no anonymous shared user).
- **Latest verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 37 passed (37)`; **Architecture review:** self-review **Passed**.
- **Evidence:** `devSession.ts`, `routeHelpers.ts`, `localErrorsAccess.ts`, `cronAuth.ts`, `local-errors/route.ts`, `api/cron/*/route.ts`, `.env.example`, `docs/CONSTRAINTS.md`, `security-hardening-roadmap.md`
- **Current blocker:** none
- **Next best step:** Activate Security Phase 2 under WIP=1 when prioritized (Next.js advisory closeout).

## Previous Verified State (Grok Copilot UX parity — Phase 0)

- **Current task:** Grok Copilot UX parity — Phase 0 (signed-in capture + visual contract).
- **State:** **Passing** — live logged-out CSS measured; signed-in UX inventory + frozen visual contract; Copilot token aliases documented; 3 new reference captures.
- **Latest verification:** **App-level:** visual inventory — 6 assets in `docs/assets/grok-parity/` (3 new 1440 captures); contract § G–J + Visual contract frozen in roadmap; **Architecture review:** self-review **Passed**.
- **Evidence:** `docs/roadmaps/grok-copilot-parity-roadmap.md`, `docs/assets/grok-parity/grok-com-{empty,mode-menu-open,history-logged-out}-dark-1440.png`, `src/lib/design-system/ARCHITECTURE.md`
- **Current blocker:** none (authenticated grok.com pixel captures deferred — no sign-in in capture session)
- **Next best step:** Superseded by Memory efficiency Phase 6 closeout above.

## Previous Verified State (Memory efficiency — Phase 5)

- **Current task:** Memory efficiency — Phase 5 (tip-stable indicator & script caches).
- **State:** **Passing** — tip-stable builtin/script cache slots overwrite on live tip ticks; soft byte budgets (16 MiB); `dispose` clears coordinator maps; `sync` prunes removed instances from `lastValidByInstance`.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 30 passed (30)`; **Build:** `npm run build:packages` exit 0; **Architecture review:** self-review **Passed**.
- **Evidence:** `indicatorCompute.ts`, `indicatorResultProvider.ts`, `scriptResultCoordinator.ts`, tests, `marketData/ARCHITECTURE.md`, `chart/ARCHITECTURE.md`, `memory-efficiency-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Memory efficiency Phase 6 closeout above.

## Previous Verified State (Security hardening — Phase 0)

- **Current task:** Security hardening — Phase 0 (Critical perimeter).
- **State:** **Passing** — fail-closed API auth; proxy-safe client IP; HMAC `confirmationToken` for gated AI tools; pattern ID root jail + Postgres-on public routes **401**.
- **Latest verification:** **Focused:** `Test Files 14 passed (14)`, `Tests 64 passed (64)`; **Build:** `npm run build:packages` exit 0; `✓ Compiled successfully in 8.4s`; **Architecture review:** self-review **Passed**.
- **Evidence:** `apiAuth.ts`, `clientIp.ts`, `confirmationToken.ts`, `parseExecuteBody.ts`, AI execute/session routes, `patternLibrary/`, `.env.example`, `docs/CONSTRAINTS.md`, `security-hardening-roadmap.md`
- **Current blocker:** none
- **Next best step:** Activate Security Phase 1 under WIP=1 when prioritized (operator secrets & diagnostics).

## Previous Verified State (Connections & providers — Phase 0)

- **Current task:** Connections & providers — Phase 0 (contracts + IA freeze).
- **State:** **Passing** — `Connection` / `ConnectionKind` / `DataProviderPreference` Zod types; `SEED_CONNECTIONS` maps `ib-paper` / `ib-live` as `ib_gateway_sidecar`; Settings IA + Phase 1–3 non-goals documented; no product behavior change.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 9 passed (9)` (`src/lib/connections/`); **Architecture review:** self-review **Passed**.
- **Evidence:** `src/lib/connections/types.ts`, `seedConnections.ts`, `ARCHITECTURE.md`, `docs/roadmaps/connections-providers-roadmap.md`, `marketData/ARCHITECTURE.md`, `trading/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Activate Connections & providers Phase 1 under WIP=1 — Settings Connections console (IB-only, no secrets).

## Previous Verified State (Memory efficiency — Phase 2)

- **Current task:** Open-positions header chip UX (flat status A).
- **State:** **Passing** — flat status chip (no “Risk” border-legend); tone dot + persistent green/red from unrealized P&L; popover unchanged.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 23 passed (23)` (`OpenRiskPositionsMenu.test.tsx`, `openRiskSummary.test.ts`, `AppTopHeader.test.tsx`); **Architecture review:** self-review **Passed**.
- **Evidence:** `OpenRiskPositionsMenu.tsx`, `OpenRiskPositionsMenu.test.tsx`, `src/lib/trading/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by Memory efficiency Phase 2 closeout above.

## Previous Verified State (Memory efficiency — Phase 0)

- **Current task:** Memory efficiency — Phase 0 (baseline + retention contract).
- **State:** **Passing** — measured heap/subscription/RSS baselines; frozen knob table; retention/clone/dispose contract in architecture docs; no product behavior change.
- **Latest verification:** **App-level:** `npm run perf:memory` → node sim `candlesLength: 4343` `sessionStorageBytes: 388670`; server warm `rssDeltaMb: 60.14`; browser 1-cell `maxCandlesLength: 7938` `eventSourceCount: 6`; browser 8-cell `eventSourceCount: 6`; **Architecture review:** self-review **Passed**.
- **Evidence:** `docs/perf/memory-baseline-latest.json`, `scripts/run-memory-baseline.mts`, `src/lib/marketData/ARCHITECTURE.md`, `src/lib/chartDataFeed/ARCHITECTURE.md`, `src/lib/chart/ARCHITECTURE.md`, `docs/roadmaps/memory-efficiency-roadmap.md`
- **Current blocker:** none
- **Next best step:** Activate Memory efficiency Phase 1 under WIP=1 — resident bar budget + logout `clearChartClientCache`.

## Previous Verified State (Journal chrome single-row merge)

- **Current task:** Journal chrome single-row merge (layout A).
- **State:** **Passing** — Journal tile header is one row: title → tabs → filters → sync/import/settings; settings cog toggles; title returns to dashboard.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 16 passed (16)`; **Architecture review:** self-review **Passed**.
- **Evidence:** `JournalModuleHeader.tsx`, `JournalTileChrome.tsx`, `Journal{Dashboard,Trades,Settings}View.tsx`, `JournalTileSurface.tsx`, tests, `journal/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by Memory efficiency Phase 0 closeout above.

## Previous Verified State (Copilot model settings UX polish)
- **Evidence:** `OpenRiskPositionsMenu.tsx`, `OpenRiskWorkspaceBridge.tsx`, `AppChromeActionsProvider.tsx`, `AppTopHeader.tsx`, `SidebarRail.tsx`, `openRiskSummary.ts`, `pendingWorkspaceActions.ts`, `OpenRiskShortcutRegistration.tsx`, tests, `trading/ARCHITECTURE.md`, `trading-execution-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Copilot model settings UX polish above.

## Previous Verified State (Copilot model settings)

- **Current task:** Copilot model settings.
- **State:** **Passing** — Settings cog opens modal with OpenRouter popular/recent tool-capable models; seed defaults pre-checked; enable/disable updates picker immediately via `edge:ai:enabledModels:v1` (no restart).
- **Latest verification:** **Focused:** `Test Files 8 passed (8)`, `Tests 61 passed (61)`; **Architecture review:** self-review **Passed**.
- **Evidence:** `allowlist.ts`, `enabledModelsStore.ts`, `openrouterModels.ts`, `/api/ai/models/route.ts`, `CopilotModelSettingsModal.tsx`, `CopilotPanel.tsx`, `useCopilotThread.ts`, `src/lib/ai/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by Copilot model settings UX polish above.

## Previous Verified State (Copilot model allowlist refresh)

- **Current task:** Copilot model allowlist refresh.
- **State:** **Passing** — Picker curated to GPT-5.6 Sol, Opus 4.8, Fable 5, Grok 4.5 (default), GLM 5.2 via OpenRouter ids.
- **Latest verification:** **Focused:** `Test Files 8 passed (8)`, `Tests 42 passed (42)` (allowlist + copilot panel/thread/store/contracts).
- **Evidence:** `src/lib/ai/model/allowlist.ts`, `allowlist.test.ts`, copilot tests, `.env.example`, `src/lib/ai/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by Copilot model settings above.

## Previous Verified State (Journal import modal UX polish)

- **Current task:** Journal import modal UX polish.
- **State:** **Passing** — Action-first import dialog aligned with Edge modal chrome (`px-5 py-4`, secondary buttons, panel drop zone, padded help disclosure + Cancel footer).
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 4 passed (4)` (`JournalImportDialog.test.tsx`); **Architecture review:** self-review **Passed**.
- **Evidence:** `JournalImportDialog.tsx`, `JournalImportDialog.test.tsx`, `journal/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** App-level: open import → expand help → drop CSV → Done.

## Previous Verified State (Journal sync/import icon buttons)

- **Current task:** Journal sync/import icon buttons.
- **State:** **Passing** — Tile nav + empty state use Sync/Import `EdgeIconButton`s; sync shows spinner while `syncing`; import opens modal with IB Flex steps + drag/drop CSV.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 10 passed (10)` (`JournalImportDialog.test.tsx`, `JournalGlobalEmptyState.test.tsx`, `JournalTileSurface.test.tsx`); **Architecture review:** self-review **Passed**.
- **Evidence:** `JournalTileNav.tsx`, `JournalImportDialog.tsx`, `JournalGlobalEmptyState.tsx`, `ChartHeaderIcons.tsx` (`SyncIcon`/`UploadIcon`), `journal/ARCHITECTURE.md`, tests
- **Current blocker:** none
- **Next best step:** App-level: click import icon → drop Flex CSV; click sync → spinner then idle.

## Previous Verified State (Standalone Copilot app)

- **Current task:** Standalone Copilot app.
- **State:** **Passing** — `/copilot` module page + workspace tile surface `copilot` in Change panel menu; both mount existing `CopilotPanel`; chart sidebar Copilot unchanged.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 17 passed (17)`; **Build:** `✓ Compiled successfully in 8.7s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** `GET /copilot` → `200` + `data-testid="copilot-page"`.
- **Evidence:** `src/app/copilot/page.tsx`, `CopilotModuleShell.tsx`, `CopilotTileSurface.tsx`, `CopilotRuntimeProviders.tsx`, `stubAppActions.ts`, `HomeHubCards.tsx`, `AppContextMenuProvider.tsx`, `lastModule.ts`, tests, `src/lib/ai/ARCHITECTURE.md`, `docs/roadmaps/ai-agent-roadmap.md`
- **Current blocker:** none
- **Next best step:** none — sidebar panel remains default in-workspace entry; standalone for dedicated chat sessions.

## Previous Verified State (Risk calculator IBKR Reg T margin estimates)

- **Current task:** Risk calculator IBKR Reg T margin estimates.
- **State:** **Passing** — When IB what-if omits margin deltas, estimates use IBKR Reg T / house stock rules (long 50%/25%; short >$16.67 50%/30%; lower short price tiers); short hold-to-stop uses `(1+m)` adverse math. Fixes false ~300-share CSCO “over” on a ~$37k flat account (was treating notional as 100% cash).
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 59 passed (59)` (`marginContext.test.ts`, `useRiskMarginContext.test.ts`, `RiskMarginCard.test.tsx`, `RiskSettingsPanel.test.tsx`); **Architecture review:** self-review **Passed**.
- **Evidence:** `src/lib/risk/marginContext.ts`, `src/app/components/risk/useRiskMarginContext.ts`, `RiskSettingsPanel.tsx`, `RiskMarginCard.tsx`, `src/lib/marketData/ARCHITECTURE.md`, tests
- **Current blocker:** none
- **Next best step:** App-level: CSCO short 111.5 / stop 115.5 on connected IB — confirm util ~45% at 300 shares and overnight max near ~663 shares before Over. Superseded by Standalone Copilot app above.

## Previous Verified State (AI agent / in-app copilot — Phase 8)

- **Current task:** AI agent / in-app copilot — Phase 8 (Workflow polish).
- **State:** **Passing** — `COPILOT_WORKFLOW_PROMPTS` empty-state chips; `prepare_chart_for_analysis` confirm gate; slim `dataProvenance` on `get_chart_state` / `summarize_chart`; system prompt cites source/freshness; playbooks (Phase D) deferred.
- **Latest verification:** **Focused:** `Test Files 14 passed (14)`, `Tests 65 passed (65)`; **Build:** `✓ Compiled successfully in 10.6s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** workflow chip walkthrough deferred.
- **Evidence:** `promptLibrary.ts`, `dataProvenance.ts`, `CopilotMessageList.tsx`, `CopilotPanel.tsx`, `workflow.ts`, `chart.ts`, `orchestrate.ts`, `summarizeToolResult.ts`, `src/lib/ai/ARCHITECTURE.md`, `docs/roadmaps/ai-agent-roadmap.md`
- **Current blocker:** none
- **Next best step:** AI agent track complete (Phases 0–8). Superseded by Risk calculator margin fix above.

## Previous Verified State (AI agent / in-app copilot — Phase 7)

- **Current task:** AI agent / in-app copilot — Phase 7 (Model picker).
- **State:** **Passing** — `listAgentModels()` + Copilot model `EdgeSelect`; per-thread `modelId` on local + `/api/me/copilot-threads`; `streamChat` sends resolved allowlisted id; switch mid-thread applies to subsequent sends.
- **Latest verification:** **Focused:** `Test Files 9 passed (9)`, `Tests 41 passed (41)` (`allowlist.test.ts` + `copilot/` + `lib/copilot/`); **Build:** `✓ Compiled successfully in 9.7s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** model switch mid-thread walkthrough deferred.
- **Evidence:** `allowlist.ts`, `copilotThreads.ts`, `copilotThreadsRepository.ts`, `copilotThreadsClient.ts`, `localCopilotThreadsStore.ts`, `useCopilotThread.ts`, `CopilotPanel.tsx`, `0026_copilot_thread_model_id.sql`, `src/lib/ai/ARCHITECTURE.md`, `src/lib/persistence/ARCHITECTURE.md`, `docs/roadmaps/ai-agent-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Phase 8 closeout above.

## Previous Verified State (AI agent / in-app copilot — Phase 6)

- **Current task:** AI agent / in-app copilot — Phase 6 (Thread persistence).
- **State:** **Passing** — `tv-ai:copilot-threads:v1` local fallback + `/api/me/copilot-threads`; thread list/rename/delete/New chat; debounced save; annotation click switches threads; redacted tool-step persist.
- **Latest verification:** **Focused:** `Test Files 10 passed (10)`, `Tests 30 passed (30)` (`src/lib/copilot/` + `copilot/` + `/api/me/copilot-threads/`); **Build:** `✓ Compiled successfully in 10.0s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** refresh restore / linkage switch walkthrough deferred.
- **Evidence:** `copilotThreads.ts`, `copilotThreadsRepository.ts`, `copilotThreadsClient.ts`, `localCopilotThreadsStore.ts`, `copilotThreadRedact.ts`, `useCopilotThread.ts`, `CopilotContext.tsx`, `CopilotPanel.tsx`, `0025_copilot_threads.sql`, `src/lib/persistence/ARCHITECTURE.md`, `src/lib/ai/ARCHITECTURE.md`, `docs/roadmaps/ai-agent-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Phase 7 closeout above.

## Previous Verified State (AI agent / in-app copilot — Phase 5)

- **Current task:** AI agent / in-app copilot — Phase 5 (Chart ↔ chat linkage).
- **State:** **Passing** — `threadId`/`messageId` stamped on agent `add_drawing`; Copilot focus + fallback rationale; toolbar “Open in chat” + “AI suggested”; accept→`accepted`/dismiss→`invalidated`; `summarize_chart` narrative + link IDs.
- **Latest verification:** **Focused:** `Test Files 10 passed (10)`, `Tests 58 passed (58)` (`src/lib/ai/agent/` + copilot + annotationMetadata + DrawingSelectionToolbar); **Build:** `✓ Compiled successfully in 9.4s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** linkage walkthrough deferred.
- **Evidence:** `confirmGate.ts`, `orchestrate.ts`, `CopilotContext.tsx`, `copilot/`, `annotationMetadata.ts`, `DrawingSelectionToolbar.tsx`, `ChartCell.tsx`, `workflow.ts`, `src/lib/ai/ARCHITECTURE.md`, `docs/roadmaps/ai-agent-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Phase 6 closeout above.

## Previous Verified State (AI agent / in-app copilot — Phase 4)

- **Current task:** AI agent / in-app copilot — Phase 4 (Confirmed writes).
- **State:** **Passing** — Copilot uses `permissionMode: write`; orchestrator confirm gate for destructive/`requiresConfirmation` tools; Accept/Reject cards re-exec via registry; agent-path `add_drawing` defaults `source: ai` + `status: proposed`.
- **Latest verification:** **Focused:** `Test Files 9 passed (9)`, `Tests 47 passed (47)` (`src/lib/ai/agent/` + copilot); **Build:** `✓ Compiled successfully in 8.9s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** Copilot confirm/drawing walkthrough deferred.
- **Evidence:** `src/lib/ai/agent/confirmGate.ts`, `orchestrate.ts`, `readTools.ts`, `src/app/api/ai/chat/route.ts`, `src/app/components/copilot/`, tests, `src/lib/ai/ARCHITECTURE.md`, `docs/roadmaps/ai-agent-roadmap.md`
- **Current blocker:** none
- **Next best step:** Activate AI agent Phase 5 (chart↔chat linkage) under WIP=1 when prioritized.

## Previous Verified State (Day classification — Phase 3)

- **Current task:** Day classification — Phase 3 (Rules assist).
- **State:** **Passing** — shared OHLCV classifiers in `src/lib/dayProfiles/rules*.ts`; propose script emits L2 openType hints from RTH 5m while rows stay `status=proposed`.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 25 passed (25)` (`src/lib/dayProfiles/`); **App-level:** `npx tsx scripts/day-profiles-propose.mts --days=3` → `rows:15` `openFilled:15` `openUnknown:0` `status=proposed`; sample NVDA 2026-07-22 `openType=open_test_drive`; confirmed store `batch-20260718.csv` unchanged; **Architecture review:** self-review **Passed**.
- **Evidence:** `src/lib/dayProfiles/rules.ts`, `rulesOpen.ts`, `rules.test.ts`, `scripts/day-profiles-propose.mts`, `scripts/day-profiles-confirm-review.mts`, `docs/roadmaps/day-classification-roadmap.md`, `src/lib/dayProfiles/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Resume AI agent Phase 4 or TWS account reconnect under WIP=1 when prioritized.

## Previous Verified State (Yahoo 5m candle range clamp)

- **Current task:** Yahoo 5m candle range clamp (chart blank / FAILED TO LOAD SYMBOL).
- **State:** **Passing** — intraday Yahoo windows clamp to retention limits; 5m `1y` requests no longer hard-fail.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 17 passed (17)` (`yahooFinance.test.ts` + `rangeInterval.test.ts`); **App-level:** `POST /api/candles` APLD `5m`/`1y` → `count 7563` `meta.source: yahoo` (no 60-day error); workspace reload shows APLD 5m OHLC chart.
- **Evidence:** `src/lib/yahooFinance.ts`, `packages/chart-react/src/engine/rangeInterval.ts`, `src/lib/yahooFinance.test.ts`, `src/lib/chart/rangeInterval.test.ts`, `docs/chart/features.md`, `src/lib/marketData/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by Day classification Phase 3 closeout above.

## Previous Verified State (AI agent / in-app copilot — Phase 3)

- **Current task:** AI agent / in-app copilot — Phase 3 (Session bridge productization).
- **State:** **Passing** — orchestrator awaits session bridge for client-state read tools; single-consumer poll dispatch; read grant default; MCP + in-app share the same bridge store.
- **Latest verification:** **Focused:** `Test Files 25 passed (25)`, `Tests 132 passed (132)` (`src/lib/ai/` + copilot/chat); **Build:** `✓ Compiled successfully in 9.7s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** Copilot `get_chart_state` / `summarize_chart` via bridge deferred.
- **Evidence:** `src/lib/ai/sessionBridgeExecute.ts`, `sessionBridgeStore.ts`, `agent/orchestrate.ts`, `AiSessionBridge.tsx`, `/api/ai/session/execute`, tests, `src/lib/ai/ARCHITECTURE.md`, `docs/roadmaps/ai-agent-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Yahoo 5m candle range clamp closeout above.

## Previous Verified State (Day classification — Phase 2)

- **Current task:** Day classification — Phase 2 (Cohort browse).
- **State:** **Passing** — Days sidebar filters confirmed CSV profiles and opens sessions on the active chart.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 12 passed (12)`; **App-level:** Days panel `50 sessions`; filter API `dayType=trend&openType=open_drive` → `3` (AAPL 2026-07-15, NVDA 2026-07-10, NVDA 2026-07-08); click **AAPL · 2026-07-15** → title **`AAPL · Edge`**, interval **`5m`**; **Architecture review:** self-review **Passed**.
- **Evidence:** `src/lib/dayProfiles/`, `/api/day-profiles`, `src/app/components/day-profiles/`, `sidebar/registry.tsx`, `docs/roadmaps/day-classification-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Day classification Phase 3 closeout above.

## Previous Verified State (AI agent / in-app copilot — Phase 2)

- **Current task:** AI agent / in-app copilot — Phase 2 (Copilot chat shell).
- **State:** **Passing** — sidebar Copilot panel streams read-only chat via `/api/ai/chat` with tool chips, cancel, and workspace snapshot injection.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 24 passed (24)`; **Build:** `✓ Compiled successfully in 10.1s`; TS exit blocked by pre-existing `JournalTradesView.tsx` error; **Architecture review:** self-review **Passed**; **App-level:** open Copilot → stream with `OPENROUTER_API_KEY` deferred.
- **Evidence:** `src/app/components/copilot/`, `src/app/components/sidebar/registry.tsx`, `src/lib/chartConfig.ts`, `src/lib/shortcuts/`, tests, `src/lib/ai/ARCHITECTURE.md`, `docs/roadmaps/ai-agent-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by day-classification Phase 2 closeout above.

## Previous Verified State (AI agent — Phase 1)

- **Current task:** AI agent / in-app copilot — Phase 1 (Model gateway + read-only agent route).
- **State:** **Passing** — OpenRouter provider, read-only orchestrator, `POST /api/ai/chat` NDJSON stream.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 35 passed (35)`; **Build:** compile OK; TS exit blocked by pre-existing `JournalTradesView.tsx` error; **Architecture review:** self-review **Passed**; **App-level:** curl smoke with `OPENROUTER_API_KEY` deferred.
- **Evidence:** `src/lib/ai/model/openrouter.ts`, `src/lib/ai/agent/orchestrate.ts`, `src/app/api/ai/chat/route.ts`, tests, `src/lib/ai/ARCHITECTURE.md`, `docs/roadmaps/ai-agent-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Phase 2 closeout above.

## Previous Verified State (App-level verification — Phase 8)

- **Current task:** App-level verification — Phase 8 (Human review and labeling).
- **State:** **Passing** — checklist 8.1 closed with confirmed CSV store (2026-07-22).
- **Latest verification:** **App-level:** 8.1 `confirmed:50` `rejected:0`; openType `open_auction:19` `open_test_drive:14` `open_drive:12` `open_rejection_reverse:5`; calibration samples AAPL 2026-07-15 trend/open_drive, SPY 2026-07-17 neutral/open_auction, NVDA 2026-07-10 trend/open_drive, TSLA 2026-07-06 trend/open_test_drive.
- **Evidence:** `data/day-profiles/proposed/batch-20260718.csv`, `docs/trading/day-classification-visual-guide.md`, `scripts/day-profiles-confirm-review.mts`, `docs/roadmaps/app-level-verification-roadmap.md`, `docs/roadmaps/day-classification-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by AI agent Phase 1 closeout above.

## Previous Verified State (App-level verification — Phase 5 start)

- **Current task:** App-level verification — Phase 5 (Screener and Review).
- **State:** **Active** — browser walk session starting on `localhost:3003`; checklist 5.1–5.6.
- **Latest verification:** Harness activated under WIP=1; Phase 4 **Passing**; screener tile Save/Recent, deep-link, chart drive, heat map, technical/compare pending.
- **Evidence:** `docs/roadmaps/app-level-verification-roadmap.md`, `ScreenerTileSurface.tsx`, `ScreenerScreensBody.tsx`, `ResultsTable.tsx`, `useScreenerReviewDrive.ts`, `reviewChannel.ts`
- **Current blocker:** none
- **Next best step:** Superseded by Phase 5 **Passing** closeout above.

## Previous Verified State (Sticky `?surface=alerts` reopened closed Alerts tile)

- **Current task:** Sticky `?surface=alerts` reopened closed Alerts tile.
- **State:** **Passing** — workspace ingress is one-shot (URL stripped + same-tab lock); close/Done also clear ingress query so refresh cannot resurrect Alerts.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 25 passed (25)`; **App-level:** close Alerts → Done → reload `/workspace` → no Alerts heading; sticky `?surface=alerts` with lock strips URL without reopening; **Architecture review:** self-review **Passed**.
- **Evidence:** `src/app/workspace/page.tsx`, `src/lib/appWorkspace/deepLinks.ts`, `AppWorkspaceContext.tsx`, tests, `ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by App-level verification Phase 5 closeout.

## Previous Verified State (App-level verification — Phase 4)

- **Current task:** App-level verification — Phase 4 (Risk and Trade UI).
- **State:** **Passing** — checklist 4.1–4.5 closed with quoted browser/session evidence.
- **Latest verification:** **App-level:** 4.1 `$` **179** shares At risk **$995** Stop dist **$5.56 · 1.7%** + `%` **66** @ **1% of $36,949**; 4.2 util **0% now → 158% after** Details **Getting tight**; 4.3 **Liq 13.34 · Stop reachable** + **MARGIN CALL 13.34** (Risk open, gone when closed); 4.4 Long → **linked to chart** Entry **325.62**/Stop **319.96** manual unlink + ↻ sync; 4.5 Recent MSFT/NVDA/AAPL chart + Watchlist **Add symbol**.
- **Evidence:** `docs/roadmaps/app-level-verification-roadmap.md`, `RiskSettingsPanel.tsx`, `RiskMarginCard.tsx`, `marginContext.ts`, `useRiskDrawingBinding.ts`, `recentSymbols.ts`, `SymbolSearchDialog.tsx`
- **Current blocker:** none
- **Next best step:** Activate App-level verification Phase 5 under WIP=1.

## Previous Verified State (Workspace layout Done stomped by deferred remote)

- **Current task:** Workspace layout Done stomped by deferred remote.
- **State:** **Passing** — closing a tile (e.g. Alerts) then **Done** keeps the removal; deferred cloud snapshots during edit are discarded on commit so refresh cannot resurrect closed panels.
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 12 passed (12)` (`AppWorkspaceContext.test.tsx`); **Architecture review:** self-review **Passed**.
- **Evidence:** `AppWorkspaceContext.tsx`, `AppWorkspaceContext.test.tsx`, `src/lib/appWorkspace/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by App-level verification Phase 4 closeout.

## Previous Verified State (App-level verification — Phase 4 start)

- **Current task:** App-level verification — Phase 4 (Risk and Trade UI).
- **State:** **Pending** — paused for WIP=1 (layout Done/remote stomp fix).
- **Latest verification:** Harness activated under WIP=1; Phase 3 **Passing**; browser walk session starting on `localhost:3003`.
- **Evidence:** `docs/roadmaps/app-level-verification-roadmap.md`, `RiskSettingsPanel.tsx`, `RiskMarginCard.tsx`, `marginContext.ts`, `useRiskDrawingBinding.ts`, `recentSymbols.ts`, `SymbolSearchDialog.tsx`
- **Current blocker:** none
- **Next best step:** Superseded by Phase 4 **Passing** closeout above.

## Previous Verified State (App-level verification — Phase 3)

- **Current task:** Alert AI / MCP tools (Phases 1–3).
- **State:** **Passing** — 16 registry tools: lifecycle CRUD + trigger history, high-level create helpers, chart workflow (open/preview/suggest); `AlertsPort` + `GET /api/me/alerts/events`.
- **Latest verification:** **Focused:** `Test Files 17 passed (17)`, `Tests 83 passed (83)` (`src/lib/ai/`); **Architecture review:** self-review **Passed**; **App-level:** MCP session-bridge alert tool walkthrough deferred.
- **Evidence:** `src/lib/ai/tools/alerts.ts`, `alertsPort.ts`, `alertClient.ts`, `/api/me/alerts/events`, `docs/ai-tools-architecture.md`, `docs/roadmaps/alerts-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by App-level verification Phase 3 closeout.

## Previous Verified State (MCP call logging)

- **Current task:** MCP call logging (single-user).
- **State:** **Passing** — each MCP `tools/call` writes one structured JSON line to stderr (`event: "mcp.tool"`) with tool, ok, code, durationMs, and bridge flag; no args/results/secrets.
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 6 passed (6)`; **Architecture review:** self-review **Passed**; **App-level:** optional local Cursor MCP stderr check deferred.
- **Evidence:** `src/lib/ai/adapters/mcp.ts`, `scripts/edge-mcp-server.mts`, `src/lib/ai/adapters/mcp.test.ts`, `src/lib/ai/ARCHITECTURE.md`, `docs/ai-tools-architecture.md`
- **Current blocker:** none
- **Next best step:** Superseded by App-level verification Phase 3 row.

## Previous Verified State (Local error log)

- **Current task:** Local error log (solo observability).
- **State:** **Passing** — redacted chart/API/script/window failures persist in gitignored `.edge/error-log.jsonl`; read via `npm run report:local-errors`.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 17 passed (17)`; **Packages:** `npm run build:packages` passed; **Build:** `✓ Compiled successfully in 9.4s` (full `npm run build` TS gate blocked by pre-existing `JournalTradesView.tsx` column-id error); **App-level:** `npm run report:local-errors -- --limit 1` → `[app-level] local error log smoke`; **Architecture review:** self-review **Passed**.
- **Evidence:** `src/lib/observability/`, `src/app/api/dev/local-errors/route.ts`, `src/lib/api/safeErrorResponse.ts`, `ChartErrorBoundary.tsx`, `LocalErrorReporter.tsx`, `packages/chart-react/src/localErrorEvent.ts`, `src/lib/marketData/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by MCP call logging row.

## Previous Verified State (App-level verification — Phase 2)

- **Current task:** App-level verification — Phase 2 (Alerts reliability).
- **State:** **Passing** — checklist 2.1–2.6 closed with manual cron + notification evidence (price, drawing, trade-plan, screener, indicator/watchlist, script snapshot).
- **Latest verification:** **App-level:** `POST /api/cron/alert-evaluate` + `POST /api/cron/screener-alert-evaluate` via dev session; 2.1 AAPL `triggered:1` `source:alert`; 2.4 gainers `notified:1` `source:screener`; 2.5 watchlist RSI `triggered:1`; 2.6 script snapshot `triggered:1`.
- **Evidence:** `docs/roadmaps/app-level-verification-roadmap.md`, `/api/cron/alert-evaluate`, `/api/me/notifications`, `AlertsConfigPane.tsx`, `notifications/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by Local error log row.

## Previous Verified State (Journal AI tools — Phase 2)

- **Current task:** Journal AI tools — Phase 2 (analytics + chart).
- **State:** **Passing** — six tools: breakdown, time report, equity curve, daily PnL, compare slices, open trade on chart; reuse `journalStats` + `chartDeepLink` (no new REST APIs).
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 13 passed (13)` (`journal.test.ts`); **Focused:** `Test Files 15 passed (15)`, `Tests 67 passed (67)` (`src/lib/ai/`); **Architecture review:** self-review **Passed**; **App-level:** MCP session-bridge + chart open walkthrough deferred.
- **Evidence:** `src/lib/ai/tools/journal.ts`, `journal.test.ts`, `journalStats.ts`, `chartDeepLink.ts`, AI/journal ARCHITECTURE + roadmap
- **Current blocker:** none
- **Next best step:** Superseded by App-level verification Phase 2 row.

## Previous Verified State (App-level verification — Phase 2 start)

- **Current task:** App-level verification — Phase 2 (Alerts reliability).
- **State:** **Pending** — paused for WIP=1 (Journal AI Phase 2); checklist 2.1–2.6 incomplete.
- **Latest verification:** Harness synced; Phase 1 **Passing**; Phase 2 checklist paused.
- **Evidence:** `docs/roadmaps/app-level-verification-roadmap.md`, `/api/cron/alert-evaluate`, `/api/cron/screener-alert-evaluate`, `AlertsConfigPane.tsx`, `notifications/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by Phase 2 **Passing** closeout above.

## Previous Verified State (Journal history lagging false positive)

- **Current task:** Journal history lagging false positive.
- **State:** **Passing** — History sync chip hidden when journal opens match live IB book (no-leg STK conId resolve, signed short qty, multi-leg spreads); still warns on real ghost/missing opens.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 15 passed (15)`; **Architecture review:** self-review **Passed**; **App-level:** chip hidden when opens match live walkthrough deferred.
- **Evidence:** `reconcileJournalOpens.ts`, `reconcileJournalOpens.test.ts`, `journal/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by Journal Tier 3 row.

## Previous Verified State (Journal + Account live position PnL)

- **Current task:** Journal + Account live position PnL.
- **State:** **Passing** — Account tab Daily/position PnL on snapshot cadence; journal live card + Open Positions tab show IB unrealized with flash; live `ib-live` sidecar keeps persistent account/PnL subscriptions and backfills cold position MKT/PnL via `reqMktData`.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 47 passed (47)`; **Sidecar:** `Ran 44 tests OK` (1 pre-existing httpx2 routing error); **Architecture review:** self-review **Passed**; **App-level:** live Gateway PnL poll walkthrough deferred.
- **Evidence:** `reconcileJournalOpens.ts`, `JournalLivePositionsCard.tsx`, `JournalTradesView.tsx`, `JournalTradesTable.tsx`, `brokerageService.ts`, `services/tws-sidecar/main.py`, tests, `journal/ARCHITECTURE.md`, `trading/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by Journal history lagging false positive row.

## Previous Verified State (Account tab header + live PnL)

- **Current task:** Account tab header + live PnL.
- **State:** **Passing** — Account panel shows Live/Paper (or alias) above account id; status line condensed to `Connected · updated …`; Daily + position PnL flash green/red on change; live `ib-live` sidecar returns `dailyPnL` and position `unrealizedPNL` on poll.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 33 passed (33)`; **Sidecar:** `Ran 48 tests OK`; **Architecture review:** self-review **Passed**; **App-level:** live Gateway Daily/position PnL poll + flash walkthrough deferred.
- **Evidence:** `accountPanelHeader.ts`, `AccountPanel.tsx`, `useValueFlash.ts`, `services/tws-sidecar/main.py`, `test_main.py`, tests, `trading/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by Journal + Account live position PnL row.

## Previous Verified State (App color palettes)

- **Current task:** App color palettes (mode + palette).
- **State:** **Passing** — three palettes (Midnight, Graphite, Deep Slate) each with light + dark tokens; header sun/moon toggles mode; Application settings **Appearance** picks palette; persisted locally + user-preferences pack; chart canvas + DOM chrome stay in sync.
- **Latest verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 28 passed (28)`; **Build:** `npm run build:packages` passed; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** palette picker + reload persistence walkthrough deferred.
- **Evidence:** `src/lib/design-system/{edge.ts,palettes.ts}`, `src/app/globals.css`, `packages/chart-core/src/themeTokens.ts`, `src/lib/app/{appThemePreference.ts,appPalettePreference.ts}`, `AppThemeProvider.tsx`, `AppSettingsShell.tsx`, `userPreferences` schema/assemble/apply, tests
- **Current blocker:** none
- **Next best step:** Superseded by Account tab header + live PnL row.

## Previous Verified State (Journal Calendar P&L polish)

- **Current task:** Journal Calendar P&L polish.
- **State:** **Passing** — Mon–Fri calendar with week column, month rollup header, heatmap intensity, compact day cells (trade count + win rate), today/selected chrome; weekend-closed trades still roll into month summary; day click opens day summary modal unchanged.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 72 passed (72)`; **Architecture review:** self-review **Passed**; **App-level:** calendar heatmap + selected-day chrome walkthrough deferred.
- **Evidence:** `journalStats.ts`, `JournalCalendar.tsx`, `JournalDashboardView.tsx`, `JournalCalendar.test.tsx`, `journalStats.test.ts`, `journal/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by App color palettes row.

## Previous Verified State (Journal Open Positions tab)

- **Current task:** Journal Open Positions tab.
- **State:** **Passing** — underline tab **Open Positions** next to Trades; list view of journal open trades with summary KPI cards; dashboard live IB positions card unchanged; deep link `/journal/open` → `journalView=open`.
- **Latest verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 33 passed (33)`; **Architecture review:** self-review **Passed**; **App-level:** Open Positions tab + open-trade row walkthrough deferred.
- **Evidence:** `JournalViewTabs.tsx`, `JournalTradesView.tsx`, `JournalTileSurface.tsx`, `deepLinks.ts`, `journal/open/page.tsx`, `journal/ARCHITECTURE.md`, tests
- **Current blocker:** none
- **Next best step:** Superseded by Journal Calendar P&L polish.

## Previous Verified State (App UX polish Phase 5 — closeout)

- **Current task:** App UX polish Phase 5 — closeout.
- **State:** **Passing** — surface convergence already shipped via component-standardization Phase 5 (2026-07-18); closeout re-verified acceptance with `ux:baseline`; App UX polish track marked complete; no route restyle or product behavior change.
- **Latest verification:** **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, horizontal overflow **0/12**, raw hex files (components) **8**, Tailwind palette files (components) **0**; **Architecture review:** self-review **Passed**.
- **Evidence:** `docs/roadmaps/app-ux-polish-roadmap.md`, `docs/roadmaps/component-standardization-roadmap.md`, `docs/ux-baseline/ux-baseline-latest.json`, `scripts/run-ux-baseline.mts`
- **Current blocker:** none
- **Next best step:** Superseded by Journal Calendar P&L polish.

## Previous Verified State (Journal KPI cards + sync status UX)

- **Current task:** Journal KPI cards + sync status UX.
- **State:** **Passing** — hero KPI cards use density-safe 3-row stack (equity + net P&L stacked; avg win/loss bar in secondary row); account equity flashes green/red on live updates; long out-of-sync banner removed; compact `History lagging` / `Catching up` chip in tile nav + standalone dashboard header.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 61 passed (61)`; **Architecture review:** self-review **Passed**; **App-level:** narrow/wide tile card overflow + equity flash walkthrough deferred.
- **Evidence:** `JournalSummaryCards.tsx`, `JournalHistorySyncChip.tsx`, `useJournalHistoryOutOfSync.ts`, `JournalDashboardView.tsx`, `JournalTileNav.tsx`, `journal/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by App UX polish Phase 5 closeout.

## Previous Verified State (Screener tile simplify)

- **Current task:** Notifications + Alerts — Phase 4 (script condition alerts / Script Depth Phase 4 handoff).
- **State:** **Passing** — `ScriptManifest.alerts` + `script_condition` leg; client snapshot ingest; shared cron fire with 5m freshness guard; no server guest.
- **Latest verification:** **Focused:** `Test Files 8 passed (8)`, `Tests 61 passed (61)`; **Packages:** `lint:package-boundaries` + `typecheck:packages` + `build:packages` passed; **Build:** `✓ Compiled successfully in 9.8s`; **Architecture review:** self-review **Passed**; **App-level:** arm script alert → snapshot → cron fire walkthrough deferred.
- **Evidence:** `scriptContracts.ts`, `scriptFixtures.ts` (`alert-condition-cross`), `scriptAlertEval.ts`, `scriptAlertSnapshot.ts`, `useScriptAlertSnapshotBridge.ts`, `/api/me/alerts/[id]/snapshot`, `AlertsConfigPane.tsx`, `IndicatorSettingsModal.tsx`, `alerts-roadmap.md`, `script-depth-roadmap.md`, `notifications/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** External delivery (email/push/webhook) or semantic/AI alert tools under WIP=1; optional app-level script alert walkthrough.

## Previous Verified State (Screener Review UI workspace tile)

- **Current task:** Screener Review UI in workspace tile (Phase 5 gap fix).
- **State:** **Passing** — `ScreenerTileSurface` mounts Review/Keepers via `screenerView` + in-tile `ScreenerSubNav`; deep-link `/screener/review` → `screenerView=review`; subnav syncs URL; preserve `reviewResume`.
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 4 passed (4)`; **Architecture review:** self-review **Passed**; **App-level:** Review deep-link mounts view; Keep/Skip resume optional.
- **Evidence:** `ScreenerTileSurface.tsx`, `ModuleToWorkspaceRedirect.tsx`, `workspace/page.tsx`, screener pages, `deepLinks.ts`
- **Current blocker:** none
- **Next best step:** Superseded by Alerts Phase 4 row.

## Previous Verified State (Notifications + Alerts — Phase 3)

- **Current task:** Notifications + Alerts — Phase 3 (conditions).
- **State:** **Passing** — Phase 3a multi-condition + Phase 3b indicator conditions + Phase 3c watchlist-wide; external delivery (email/push/webhook) deferred.
- **Latest verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 38 passed (38)`; **Build:** `✓ Compiled successfully in 9.3s`; **Architecture review:** self-review **Passed**; **App-level:** indicator + watchlist cron walkthroughs deferred.
- **Evidence:** `0021_alert_conditions.sql`, `src/lib/alerts/{alertConditions,indicatorAlertEval,resolveAlertSymbols,evaluateAlerts,runAlertEvaluation}.ts`, `AlertsConfigPane.tsx`, `AlertsLibraryRail.tsx`, `alertRepository.ts`, `docs/roadmaps/alerts-roadmap.md`, `src/lib/notifications/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by Screener Review UI workspace tile gap fix.

## Previous Verified State (Data serving efficiency — track closeout)

- **Current task:** Data serving efficiency — track closeout (Phase 7 Skipped).
- **State:** **Passing** — Phases 0–6 **Passing**; Phase 7 multi-instance Redis **Skipped** (single-user / single Node; process-local HotStore/DataCache sufficient). Track complete.
- **Latest verification:** Decision gate closed by product owner (single user); no Redis code; Phase 6 evidence stands: **Focused:** `Test Files 7 passed (7)`, `Tests 45 passed (45)`; **Build:** `✓ Compiled successfully in 11.2s`; **Architecture review:** self-review **Passed**.
- **Evidence:** `docs/roadmaps/data-serving-efficiency-roadmap.md`, `docs/roadmaps/README.md`, `docs/ROADMAP.md`, `src/lib/marketData/ARCHITECTURE.md`, `docs/PROJECT-STATUS.md`
- **Current blocker:** none
- **Next best step:** Superseded by Alerts Phase 3 row.

## Previous Verified State (Data serving efficiency — Phase 6)

- **Current task:** Data serving efficiency — Phase 6 (layout truth + `/api/me` client cache).
- **State:** **Passing** — legacy layout write lock (`saveLayout` test-only); `layoutContentFingerprint` for dirty/merge compare; journal/pattern GET TTL memo via `ClientTtlCache` with explicit invalidation; TanStack Query declined.
- **Latest verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 45 passed (45)`; **Build:** `✓ Compiled successfully in 11.2s`; **Architecture review:** self-review **Passed**; **App-level:** journal remount cache + layout remote save walkthrough deferred.
- **Evidence:** `layoutStorage.ts`, `layoutStorage.layoutLegacyWriteLock.test.ts`, `layoutContentFingerprint.ts`, `useWorkspaceTabsRemoteSync.ts`, `workspaceTabs.ts`, `clientCachePolicy.ts`, `persistenceClientCache.ts`, `journalClient.ts`, `patternLibraryRecordsClient.ts`, ARCHITECTURE docs, `data-serving-efficiency-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by track closeout (Phase 7 Skipped).

## Previous Verified State (Notifications + Alerts — Phase 1)

- **Current task:** Workspace state persistence — Phase 5 (workflow continuity).
- **State:** **Passing** — Screener review resume on screener library snapshot (`reviewResume` + query fingerprint); user-scoped pattern library via `/api/me/pattern-library/*` with FS seed/dev fallback; options draft explicitly deferred; journal table prefs already in Phase 3 pack. Review UI gap closed 2026-07-21 (workspace tile mounts `ScreenerReviewView`).
- **Latest verification:** **Focused (gap fix):** `Test Files 4 passed (4)`, `Tests 16 passed (16)`; prior Phase 5: `Test Files 6 passed (6)`, `Tests 47 passed (47)`; **Build:** `✓ Compiled successfully`; **Architecture review:** self-review **Passed**; **App-level:** `reviewResume` local survive **PASS** (`reviewIndex=2`, keepers=`[AAPL,MSFT]` after reload); pattern capture **PASS** — POST `capture-phase5-review-1784681159` listed on GET `/api/me/pattern-library/records`.
- **Evidence:** `reviewResume.ts`, `ScreenerProvider.tsx`, `ScreenerTileSurface.tsx`, `useScreenerSessionModel.ts`, `screenerLibrary.ts`, `0018_pattern_library.sql`, `patternLibraryRepository.ts`, `patternLibraryStore.ts`, `/api/me/pattern-library/*`, `patternLibrary.ts` (AI tools), docs
- **Current blocker:** none
- **Next best step:** Superseded by Screener Review UI workspace tile gap fix (Current Verified State).

## Previous Verified State (Data serving efficiency — Phase 4)

- **Current task:** Data serving efficiency — Phase 3 (chart feed completeness + quote path sharing).
- **State:** **Passing** — `loadMore` prepends merge into `chartClientCache` under the same key; background refresh preserves left history unless `reloadKey`; chart/tab last price reads shared `quotesBySymbol` via `resolveChartLiveQuotePrice`.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 28 passed (28)`; **Build:** `✓ Compiled successfully in 7.7s`; **Architecture review:** self-review **Passed**; **App-level:** pan-back remount + quote stream walkthrough deferred.
- **Evidence:** `chartClientCache.ts`, `useChartDataFeed.ts`, `resolveChartLiveQuotePrice.ts`, `ChartCell.tsx`, `chartDataFeed/ARCHITECTURE.md`, `marketData/ARCHITECTURE.md`, `data-serving-efficiency-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Phase 4 row.

## Previous Verified State (Workspace state persistence — Phase 3)

- **Current task:** Workspace state persistence — Phase 3 (user preference pack).
- **State:** **Passing** — Desk-defining prefs sync via `/api/me/user-preferences` when Postgres + session configured; existing `edge:*` keys remain local cache; assemble/apply pack module + bootstrap race + debounced remote sync; `risk_settings` catalog deferred row closed.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 22 passed (22)`; **Build:** `✓ Compiled successfully in 7.8s`; **Architecture review:** self-review **Passed**; **App-level:** **PASS** — theme dark→light (`syncRevision` 33→34); cleared `edge:app:theme:v1` + prefs keys; reload restored `theme=light` / `htmlClass=light` from `/api/me/user-preferences`.
- **Evidence:** `0016_user_preferences.sql`, `userPreferences.ts`, `userPreferencesRepository.ts`, `userPreferencesClient.ts`, `/api/me/user-preferences`, `assembleUserPreferencesSnapshot.ts`, `applyUserPreferencesSnapshot.ts`, `useUserPreferencesRemoteSync.ts`, `resolveUserPreferencesBootstrap.ts`, `UserPreferencesSyncProvider.tsx`, `catalog.ts`, `workspace-state-persistence-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Phase 4/5 app-level closeout.

## Previous Verified State (Data serving efficiency — Phase 2)

- **Current task:** Data serving efficiency — Phase 2 (journal poll hygiene + home remote truth).
- **State:** **Passing** — Journal ingest poll skips hidden tabs, backs off on failure, and bumps trades reload only on ledger change; home merges remote chart-workspaces local-first; live account snapshot poll skips when hidden.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 13 passed (13)`; **Build:** `✓ Compiled successfully in 9.0s`; **Architecture review:** self-review **Passed**; **App-level:** hidden-tab ingest + home remote card walkthrough deferred.
- **Evidence:** `ingestPollSchedule.ts`, `JournalSyncProvider.tsx`, `AccountProvider.tsx`, `resolveHomeWorkspaceTabs.ts`, `useHomeWorkspaceSummaries.ts`, `journal/ARCHITECTURE.md`, `appWorkspace/ARCHITECTURE.md`, `data-serving-efficiency-roadmap.md`
- **Current blocker:** none
- **Next best step:** Activate **Data serving efficiency — Phase 3** (chart feed completeness + quote path sharing) under WIP=1.

## Previous Verified State (Workspace state persistence — Phase 2)

- **Current task:** Workspace state persistence — Phase 2 (app-workspace cloud sync).
- **State:** **Passing** — Shell documents sync via `/api/me/app-workspaces` when Postgres + session configured; localStorage remains offline path; committed-state remote sync skips edit drafts; 500ms bootstrap race + late merge.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 18 passed (18)`; **Build:** `✓ Compiled successfully in 7.6s`; **Architecture review:** self-review **Passed**; **App-level:** **PASS** — cleared `tv-ai:app-workspaces:v1` (remote `syncRevision` 28 had `chart,chart,screener`); reload restored 3 tiles + AAPL/MSFT chart symbols.
- **Evidence:** `0015_user_app_workspaces.sql`, `appWorkspacesRepository.ts`, `appWorkspacesClient.ts`, `/api/me/app-workspaces`, `useAppWorkspacesRemoteSync.ts`, `resolveAppWorkspacesBootstrap.ts`, `AppWorkspaceContext.tsx`, inventory/docs updates
- **Current blocker:** none
- **Next best step:** Superseded by Phase 3–5 app-level closeout.

## Previous Verified State (Workspace state persistence — Phase 1)

- **Current task:** Workspace state persistence — Phase 1 (per-tile chart layouts).
- **State:** **Passing** — Each Chart tile scopes workspace-tabs storage by tile id; optional `chartWorkspaceId` on shell tiles; bootstrap orphan-adopt disabled for non-primary tiles; tile close dismisses/archives remote + clears scoped key.
- **Latest verification:** **Focused:** `Test Files 9 passed (9)`, `Tests 73 passed (73)`; **Build:** `✓ Compiled successfully in 7.8s`; **Architecture review:** self-review **Passed**; **App-level:** **PASS** — two Chart tiles after refresh: primary `tv-ai:workspace-tabs:v1`=AAPL, secondary scoped key=MSFT; DOM `bodySyms` `[AAPL,MSFT]`.
- **Evidence:** `workspaceTabsStorage.ts`, `useStockAppBootstrap.ts`, `resolveAppBootstrap.ts`, `ChartTileHost.tsx`, `AppWorkspaceContext.tsx`, `reconcileChartWorkspaces.ts`, `commands.ts`, Phase 1 tests
- **Current blocker:** none
- **Next best step:** Superseded by Phase 2–5 app-level closeout.

## Previous Verified State (Data serving efficiency — Phase 1)

- **Current task:** Data serving efficiency — Phase 1 (client reuse for high-churn reads).
- **State:** **Passing** — Search, fundamentals, chart overlays, and market context reuse `ClientTtlCache` within TTL; coalesce-on-miss; session clear on dev auth unlock.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 25 passed (25)`; **Build:** `✓ Compiled successfully in 7.9s`; **Architecture review:** self-review **Passed**; **App-level:** cache walkthrough deferred.
- **Evidence:** `getOrFetchClientTtl.ts`, `searchClient.ts`, `marketContextClient.ts`, `fundamentalsClient.ts`, `apiChartDataFeed.ts`, `DevPersistenceLoginBanner.tsx`, `marketData/ARCHITECTURE.md`, `chartDataFeed/ARCHITECTURE.md`, `docs/roadmaps/data-serving-efficiency-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Phase 2 row.

## Previous Verified State (Data serving efficiency — Phase 0)

- **Current task:** Data serving efficiency — Phase 0 (client cache contract freeze).
- **State:** **Passing** — Shared `ClientTtlCache` + `CLIENT_CACHE_TTL_MS` policy matrix; coalesce-vs-TTL table documented; no consumer wiring; candles remain on `chartClientCache`.
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 10 passed (10)`; **Architecture review:** self-review **Passed**; **App-level:** N/A (no user-visible change).
- **Evidence:** `src/lib/marketData/cache/{clientTtlCache,clientCachePolicy,clientTtlCache.test}.ts`, `src/lib/marketData/ARCHITECTURE.md`, `src/lib/chartDataFeed/ARCHITECTURE.md`, `docs/roadmaps/data-serving-efficiency-roadmap.md`
- **Current blocker:** none
- **Next best step:** Superseded by Phase 1 row.

## Previous Verified State (Workspace state persistence — Phase 0)

- **Current task:** Workspace state persistence — Phase 0.
- **State:** **Passing** — Persist/ephemeral matrix, keys ownership map, and Zod schema sketches frozen; inventory lock tests pass; no user-visible behavior change.
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 10 passed (10)`; **Architecture review:** self-review **Passed**; **App-level:** N/A (docs/contracts only).
- **Evidence:** `src/lib/persistence/ARCHITECTURE.md`, `src/lib/appWorkspace/ARCHITECTURE.md`, `chartTileBindingSketch.ts`, `userPreferencesSketch.ts`, `viewportPersistSketch.ts`, `workspaceStateStorageInventory.ts`, `workspaceStatePersistencePhase0.test.ts`
- **Current blocker:** none
- **Next best step:** Activate **Phase 1** (per-tile chart layouts) under WIP=1.

## Previous Verified State (Chart candlestick loading skeleton)

## Previous Verified State (Notifications + Alerts Phase 0)

- **Current task:** Notifications + Alerts (Phase 0).
- **State:** **Passing** — Header bell + toast inbox; notification_events persistence + localStorage fallback; Alerts workspace tile (Scripts-shaped list + config form); server cron price-alert evaluator with stale/cooldown guards; chart Alert action opens prefilled Alerts tile.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 12 passed (12)`; **Build:** `✓ Compiled successfully in 10.9s`; **Typecheck:** blocked by pre-existing `packages/chart-core/src/scriptContracts.ts` PlotKind error (unrelated); **Architecture review:** self-review **Passed**; **App-level:** create alert → cron evaluate → bell/toast walkthrough deferred.
- **Evidence:** `0014_notifications_alerts.sql`, `src/lib/notifications/*`, `src/lib/alerts/*`, `/api/me/notifications`, `/api/me/alerts`, `/api/cron/alert-evaluate`, `NotificationProvider.tsx`, `NotificationBellMenu.tsx`, `AlertsTileSurface.tsx`, `docs/roadmaps/alerts-roadmap.md`, `src/lib/notifications/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** App-level price alert → close tab → cron cross → bell/history proof; drawing-bound alerts (Phase 1).

## Previous Verified State (Journal screenshot persist + lightbox overlay)

- **Current task:** Journal screenshot persist + lightbox overlay.
- **State:** **Passing** — Trade rebuild preserves screenshot/chart-fork rows (remap by fillExecIds + open-trade fill growth); lightbox portals to `document.body` full-viewport above the slide-over.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 11 passed (11)` (`preserveTradeAttachments`, `rebuildTrades`, `JournalTradeScreenshots`); **Architecture review:** self-review **Passed**.
- **Evidence:** `preserveTradeAttachments.ts`, `rebuildTrades.ts`, `journalRepository.ts`, `JournalTradeScreenshots.tsx`, `journal/ARCHITECTURE.md`, tests
- **Current blocker:** none
- **Next best step:** Superseded by Notifications + Alerts row.

## Previous Verified State (Journal trade screenshot capture display fix)

- **Current task:** Journal trade screenshot capture display fix.
- **State:** **Passing** — Capture chart no longer shows a broken/empty hero: overlay inset is cleared + chart `resize()` before capture; upload blobs are cached for preview; blob URLs are revoked only after new src paints; hero uses `object-contain`.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 23 passed (23)` (`chartSnapshot`, `JournalTradeScreenshots`, `journalClient`); **App-level:** `/workspace` F trade **Capture chart** → hero img loads blob preview at **385×937** (was ~49px crushed / broken alt); **Architecture review:** self-review **Passed**.
- **Evidence:** `chartSnapshot.ts`, `EdgeChart.tsx`, `JournalTradeScreenshots.tsx`, `journalClient.ts`, tests
- **Current blocker:** none
- **Next best step:** Superseded by persist + lightbox fix.

## Previous Verified State (Script depth — Phase 2)

- **Current task:** Script depth — Phase 2 (richer declarative plot visuals).
- **State:** **Passing** — marker/bgcolor/barcolor plot kinds + stepline/circles/crosses/area/columns styles; `SCRIPT_SDK_VERSION` → `edge-indicator-sdk-3`; Canvas draw + legend/scale/WebGL gates; three Phase 2 golden fixtures.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 52 passed (52)`; **Packages:** `lint:package-boundaries` + `typecheck:packages` + `build:packages` passed; **Architecture review:** self-review **Passed**.
- **Evidence:** `packages/chart-core/src/{scriptContracts,scriptFixtures,legend/types,indicators/draw}.ts`, `packages/chart-react/src/engine/{scriptBarcolor,indicatorScale,webgl/indicatorGeometry}.ts`, `packages/indicator-runtime/src/compileScript.ts`, docs
- **Current blocker:** none
- **Next best step:** Activate **Script depth — Phase 3** (multi-timeframe / multi-symbol requests) when selected.

## Previous Verified State (Script depth — Phase 1)

- **Current task:** Script depth — Phase 1 (TA helper expansion).
- **State:** **Passing** — expanded `ta.*` helpers (`wma`, `vwma`, `macd`, `stoch`, `bollinger`, `cci`, `obv`, `dmi`, crossover/crossunder/change/percentChange); `SCRIPT_SDK_VERSION` → `edge-indicator-sdk-2`; five Phase 1 golden fixtures promoted; host/guest lockstep enforced.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 59 passed (59)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Startup:** `Test Files 3 passed (3)`, `Tests 26 passed (26)`; **Build:** `npm run build` blocked by pre-existing `adoptServerJournalTrades.ts` type error (unrelated); **Architecture review:** self-review **Passed**.
- **Evidence:** `packages/indicator-runtime/src/{taSdk,guestTaBootstrap,compileScript}.ts`, `packages/chart-core/src/{scriptContracts,scriptFixtures}.ts`, `docs/chart/script-examples.md`, `docs/roadmaps/script-depth-roadmap.md`, `packages/indicator-runtime/ARCHITECTURE.md`
- **Current blocker:** none (app build failure pre-existing, not Phase 1)
- **Next best step:** Activate **Script depth — Phase 3** (multi-timeframe / multi-symbol requests) when selected.

## Previous Verified State (Journal trade ID source of truth)

- **Current task:** Journal trade ID source of truth.
- **State:** **Passing** — When Postgres is available, journal list uses server `journal_trades` UUIDs (not client-rebuilt local ids); capture/screenshots/forks POST to real trade rows; local rebuild + IndexedDB fallback only on 503.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 9 passed (9)`; **App-level:** `/workspace` F trade **Capture active chart** → screenshot POST **201** on server id `55e35f51-9f78-4622-9cb0-8696a5a77220` (was 404 before fix); **Architecture review:** self-review **Passed**.
- **Evidence:** `journalClient.ts`, `adoptServerJournalTrades.ts`, `tradeExecIdsKey.ts`, `localScreenshotStore.ts`, `localChartSnapshotStore.ts`, tests, `journal/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** App-level BRUN open-trade capture walkthrough when chart symbol matches.

## Previous Verified State (Account panel UX)

- **Current task:** Account panel UX.
- **State:** **Passing** — Account sidebar shows margin utilization bar + plain status + collapsible Details; header uses alias or Live/Paper label with account id subtitle + inline rename; position rows expose hover Close and right-click Close position via one-click Confirm close (no LIVE typing UX; server token still attached).
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 29 passed (29)`; **Architecture review:** self-review **Passed**; **App-level:** margin bar + close position on live IB walkthrough deferred.
- **Evidence:** `AccountPanel.tsx`, `AccountMarginSummary.tsx`, `ClosePositionConfirmModal.tsx`, `accountPanelHeader.ts`, `closePositionDraft.ts`, tests
- **Current blocker:** none
- **Next best step:** App-level confirm margin bar + hover/right-click close on connected live account.

## Previous Verified State (Journal trades column configurator)

- **Current task:** Journal trades column configurator.
- **State:** **Passing** — Trades list Columns popover toggles visibility and drag-reorders columns; table headers support click-to-sort and click-hold-drag to reorder; order + visibility + page size persist in localStorage; Compact/Comfortable density picker removed (always compact).
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 56 passed (56)`; **Architecture review:** self-review **Passed**; **App-level:** header drag reorder + Columns popover walkthrough deferred.
- **Evidence:** `journalTradesTableControls.ts`, `journalTradesColumnHeaderDrag.ts`, `JournalTradesTableControls.tsx`, `JournalTradesView.tsx`, `JournalTradesTable.tsx`, `ColumnPickerPopover.tsx`, tests, `journal/ARCHITECTURE.md`, `design-system/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** App-level confirm Columns popover reorder + reload on `/workspace` Journal → Trades.

## Previous Verified State (Trade chart forks)

- **Current task:** Trade chart forks.
- **State:** **Passing** — Attach editable live chart fork to journal trade (after-the-fact IBKR workflow): chart snapshot menu **Attach to journal trade…**, trade detail **Capture active chart**, modal fork viewer with live data + entry/exit markers + debounced save + reset-to-capture; isolated from main workspace.
- **Latest verification:** **Focused:** `Test Files 47 passed (47)`, `Tests 240 passed (240)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 8.1s`); **Architecture review:** self-review **Passed**; **App-level:** BRUN attach → open fork → edit → main chart unchanged walkthrough deferred.
- **Evidence:** `0013_journal_trade_chart_snapshots.sql`, `chartSnapshotValidation.ts`, `journalChartSnapshotRepository.ts`, `localChartSnapshotStore.ts`, `captureTradeChartFork.ts`, `AttachJournalTradeModal.tsx`, `JournalTradeChartSnapshots.tsx`, `TradeChartForkModal.tsx`, `ChartSnapshotMenu.tsx`, `api/me/journal/trades/[id]/chart-snapshots/*`, `journal/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** App-level attach BRUN chart to open journal trade → open fork → confirm live candles + markers + fork isolation.

## Previous Verified State (Journal trade detail UX redesign)

- **Current task:** Journal trade detail UX redesign.
- **State:** **Passing** — Trade detail drawer shows screenshot hero, entry/exit/P&L outcome strip, human-readable fills table; header symbol opens chart; Save notes only footer CTA.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 13 passed (13)`; **Architecture review:** self-review **Passed**; **App-level:** drawer walkthrough deferred.
- **Evidence:** `JournalTradeDetail.tsx`, `JournalTradeDetailDrawer.tsx`, `JournalTradeScreenshots.tsx`, `JournalTradeDetailHeaderTitle.tsx`, `journalTradeDetailTitle.ts`, `EdgeSlideOver.tsx`, `journal/ARCHITECTURE.md`
- **Current blocker:** none
- **Next best step:** Superseded by Trade chart forks row.

## Previous Verified State (Scripts Monaco editor)

- **Current task:** Scripts Monaco editor.
- **State:** **Passing** — Scripts tile source uses Monaco TypeScript highlighting (client-only dynamic import); Run/Save/diagnostics unchanged; ⌘/Ctrl+Enter and ⌘/Ctrl+S wired in editor.
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 3 passed (3)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 8.2s`); **Startup:** `Test Files 3 passed (3)`, `Tests 26 passed (26)`; **Architecture review:** self-review **Passed**; **App-level:** `/workspace` Scripts tile edit/Run/Save walkthrough deferred.
- **Evidence:** `MonacoScriptEditor.tsx`, `ScriptEditorPane.tsx`, `ScriptsTileSurface.test.tsx`, `package.json`, `docs/chart/features.md`, `docs/roadmaps/typescript-indicator-scripting-roadmap.md`
- **Current blocker:** none
- **Next best step:** App-level Scripts tile walkthrough.

## Previous Verified State (Duplicate live tip candle fix)

- **Current task:** Duplicate live tip candle fix.
- **State:** **Passing** — Provider tip remapping emits `replace-latest` (not `append`); tip replace keeps one bar; full-interval-ahead replace applied as append so load/poll desync does not drop a closed bar.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 42 passed (42)` (`streamDiff`, `useChartDataFeed`, `pollStreamAdapter`, `series`).
- **Evidence:** `streamDiff.ts`, `packages/chart-core/src/series.ts`, `useChartDataFeed.ts`, `chartDataFeed/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level confirm on a live chart after a poll tip remapping.

## Previous Verified State (Journal trade screenshots)

- **Current task:** Journal trade screenshots.
- **State:** **Passing** — Multi-screenshot attachments per trade: Postgres metadata + filesystem blobs, authenticated CRUD, gallery in trade detail panel (upload/paste/chart capture), IndexedDB fallback when DB unavailable.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 8 passed (8)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** attach/persist/delete walkthrough deferred.
- **Evidence:** `0012_journal_trade_screenshots.sql`, `screenshotValidation.ts`, `screenshotStorage.ts`, `journalScreenshotRepository.ts`, `localScreenshotStore.ts`, `JournalTradeScreenshots.tsx`, `api/me/journal/trades/[id]/screenshots/*`, `journal/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level attach screenshot → refresh → delete on live journal trade.

## Previous Verified State (API client efficiency ROI track)

- **Current task:** API client efficiency (ROI track).
- **State:** **Passing** — Five phases shipped: short-range candle poll + streamDiff hardening; single overlay `loadEvents`; AI session heartbeat decoupled from long-poll; batched `POST /api/fundamentals`; in-flight coalesce + `AbortSignal` on chart loads.
- **Latest verification:** **Focused:** `Test Files 16 passed (16)`, `Tests 70 passed (70)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** live poll traffic + watchlist fundamentals batch + MCP session bridge walkthrough deferred.
- **Evidence:** `src/lib/chartDataFeed/*`, `AiSessionBridge.tsx`, `api/fundamentals/route.ts`, `marketDataService.ts`, `fundamentalsClient.ts`, `useWatchlistFundamentalsCache.ts`, `packages/chart-core/src/dataSource.ts`, `chartDataFeed/ARCHITECTURE.md`, `marketData/ARCHITECTURE.md`, `ai/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by Journal trade screenshots row.

## Previous Verified State (Chart overlay panel candle inset)

- **Current task:** Chart overlay panel candle inset.
- **State:** **Passing** — Docked right overlay panel keeps full-width chart row, but `ChartGrid` applies `paddingRight = overlayInsetPx` (includes resize preview) so candles/price axis stay clear of the panel; floating panels apply no inset.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 13 passed (13)` (`chartOverlayInset`, `ChartGrid.responsive`, `SidebarPanelShell`); **Architecture review:** self-review **Passed**; **App-level:** open Risk/Watchlist overlay on `/chart` walkthrough deferred.
- **Evidence:** `src/lib/responsive/chartOverlayInset.ts`, `ChartGrid.tsx`, `SidebarPanelWidthContext.tsx`, `useStockAppSidebarController.ts`, `SidebarPanelShell.tsx`, `design-system/ARCHITECTURE.md`, `docs/chart/features.md`.
- **Current blocker:** none.
- **Next best step:** App-level confirm candles clear docked overlay.

## Previous Verified State (Live journal auto-sync)

- **Current task:** Live journal auto-sync.
- **State:** **Paused** — 3-layer sync shipped in code: per-connection live account id (`TWS_LIVE_ACCOUNT_ID`), Flex gap keyed off `lastExecTime`/cold-start/reconcile (not poll `lastIngestAt`), dashboard open positions from live IB book + out-of-sync banner.
- **Latest verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 29 passed (29)`; **Sidecar:** `Ran 2 tests OK`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** live ingest + Flex backfill proof deferred (requires `IB_FLEX_*` in `.env.local` + sidecar restart).
- **Evidence:** `services/tws-sidecar/main.py`, `src/lib/brokerage/ingest/{runBrokerageIngest,resolveIngestAccountId,ingestExecutions}.ts`, `src/lib/journal/reconcileJournalOpens.ts`, `JournalLivePositionsCard.tsx`, `JournalDashboardView.tsx`, `docs/roadmaps/broker-ledger-roadmap.md`.
- **Current blocker:** Flex env not configured — automatic history catch-up for portal trades since Jul 6 requires `IB_FLEX_TOKEN` + `IB_FLEX_QUERY_ID`.
- **Next best step:** Set Flex env → restart sidecar → POST `/api/cron/brokerage-ingest` → confirm `ib-live` cursor `account_id=U25026894` and journal fills newer than 2026-07-06.

## Previous Verified State (IB Gateway soft-restart Sunday failure fix)

- **Current task:** IB Gateway soft-restart Sunday failure fix.
- **State:** **Paused** — Root cause fixed (Sunday cold restart + jts.ini TZ); paper + live Gateway connected; scheduled 11:45 PM cycle proof deferred.
- **Latest verification:** **Runtime:** both containers `Login has completed`; `TimeZone=America/New_York`, `ColdRestartTime=08:00`, VNC `5901`/`5902`.
- **Evidence:** `services/ib-gateway/{docker-compose.yml,.env.example}`, `tws_settings_{live,paper}/jts.ini`.
- **Current blocker:** none (scheduled-cycle proof deferred).
- **Next best step:** Observe post-11:45 PM ET soft restart; resume if regression.

## Previous Verified State (Scripts workspace surface)

- **Current task:** Scripts workspace surface.
- **State:** **Passing** — workspace **Scripts** tile lists/creates/edits private My scripts with Run/Save/diagnostics; Apply adds saved revision to active chart; picker Edit/New focuses Scripts tile; modal editor retired.
- **Latest verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 86 passed (86)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** `/workspace` Scripts tile create/run/save/apply + picker Edit walkthrough deferred.
- **Evidence:** `src/lib/appWorkspace/{types,schema,deepLinks}.ts`, `src/app/components/scripts/`, `ScriptsTileSurface.tsx`, `WorkspaceDriveContext.tsx`, `WorkspaceScriptApplyBridge.tsx`, `ChartCell.tsx`, `docs/chart/features.md`, `docs/roadmaps/typescript-indicator-scripting-roadmap.md`.
- **Current blocker:** none.
- **Next best step:** App-level Scripts tile walkthrough; then activate next pending roadmap item under WIP=1.

## Previous Verified State (Risk Trade Size card)

- **Current task:** Risk Trade Size card.
- **State:** **Passing** — Risk calculator merges Shares + Margin into one Trade size card: stacked utilization bar (existing then this trade), plain `$left · status` summary, IB technicals in Details; sizing math unchanged.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 35 passed (35)`; **Architecture review:** self-review **Passed**; **App-level:** merged card + Details walkthrough deferred.
- **Evidence:** `src/lib/risk/marginContext.ts`, `src/app/components/risk/RiskMarginCard.tsx`, `src/app/components/sidebar/panels/RiskSettingsPanel.tsx`, `src/lib/marketData/ARCHITECTURE.md`, `docs/chart/features.md`.
- **Current blocker:** none.
- **Next best step:** App-level Risk calculator walkthrough (stacked margin bar + Details); then activate next pending roadmap item under WIP=1.

## Previous Verified State (Compact symbol search chrome)

## Previous Verified State (Risk calculator margin context)

- **Current task:** Risk calculator margin context.
- **State:** **Passing** — Risk calculator shows display-only margin card under hero shares: current IB utilization (Init/Excess/Available) plus debounced what-if Init/Maint Δ, projected util, and headroom when shares are sized; share sizing math unchanged.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 28 passed (28)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**.
- **Evidence:** `src/lib/risk/marginContext.ts`, `src/lib/brokerage/whatIfClient.ts`, `src/app/components/risk/{useRiskMarginContext,RiskMarginCard}.tsx`, `src/app/components/sidebar/panels/RiskSettingsPanel.tsx`, `src/lib/marketData/ARCHITECTURE.md`, `docs/chart/features.md`.
- **Current blocker:** none.
- **Next best step:** App-level Risk margin walkthrough (connected account + sized shares vs Trade preview); then activate next pending roadmap item under WIP=1.

## Previous Verified State (Journal chrome density + underline tabs)

- **Current task:** Symbol search recent charts.
- **State:** **Passing** — empty symbol search query lists up to 12 MRU chart symbols from `localStorage` (`edge:recent-symbols:v1`); typed query still uses Yahoo `/api/search`; chart visits recorded on symbol apply/back/forward with hydrate seed from current cells.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 17 passed (17)`; **Architecture review:** self-review **Passed**.
- **Evidence:** `src/lib/app/recentSymbols.ts`, `src/app/components/design-system/symbol-search/useSymbolSearch.ts`, `SymbolSearchDialog.tsx`, `useStockAppLayoutController.ts`, `design-system/ARCHITECTURE.md`, `docs/chart/features.md`.
- **Current blocker:** none.
- **Next best step:** App-level walkthrough (watchlist Add symbol empty → Recent; chart search clear → recents); then activate next pending roadmap item under WIP=1.

## Previous Verified State (Risk calculator redesign)

- **Current task:** Risk calculator redesign.
- **State:** **Passing** — Risk sidebar is a result-first **Risk calculator** (Option A): hero shares, 2-col trade levels, risk budget below; `$ absolute` default; no fallback/manual capital; calculator rail icon; legacy localStorage migrated on load.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 38 passed (38)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**.
- **Evidence:** `src/lib/risk/riskSettings.ts`, `src/app/components/sidebar/panels/RiskSettingsPanel.tsx`, `src/app/components/chart-chrome/ChartHeaderIcons.tsx`, `src/app/components/sidebar/registry.tsx`, `src/lib/marketData/ARCHITECTURE.md`, `docs/chart/features.md`.
- **Current blocker:** none.
- **Next best step:** App-level Risk calculator walkthrough (hero shares, formatted stop, offline `$` mode, percent stale badge); then activate next pending roadmap item under WIP=1.

## Previous Verified State (Chart modal workspace containment)

- **Current task:** Risk panel position drawing bind.
- **State:** **Passing** — newest long/short on the active chart auto-binds Risk Position size entry/stop; live sync while linked; manual Entry/Stop or Use last unlinks; drawing delete keeps last values; next placement rebinds.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.9s`); **Architecture review:** self-review **Passed**; **App-level:** place Long → Risk sync + drag + manual override walkthrough deferred.
- **Evidence:** `src/lib/risk/riskPositionBinding.ts`, `src/app/components/risk/RiskPositionBindingContext.tsx`, `src/app/components/chart-cell/useRiskDrawingBinding.ts`, `src/app/components/sidebar/panels/RiskSettingsPanel.tsx`, `src/app/components/ChartCell.tsx`, `src/lib/marketData/ARCHITECTURE.md`, `docs/chart/features.md`.
- **Current blocker:** none.
- **Next best step:** Activate next pending roadmap item under WIP=1 when selected.

## Previous Verified State (Border-legend select labels)

- **Current task:** Border-legend select labels.
- **State:** **Passing** — labeled dropdowns show category on the top outline (border-legend) via shared `EdgeBorderLabeledControl`; journal Period/Rows/filters, screener Limit/query fields, and app header Account/Data pickers wired; selection semantics unchanged.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 43 passed (43)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.8s`); **Architecture review:** self-review **Passed**; **App-level:** Journal Period / screener Limit / header Account+Data rim-label spot walkthrough deferred.
- **Evidence:** `EdgeBorderLabeledControl.tsx`, `EdgeSelect.tsx`, `styles.ts`, `JournalFilterDrawer.tsx`, `ScreenerScreensBody.tsx`, `QueryBuilder.tsx`, `AccountPickerMenu.tsx`, `MarketDataConnectionMenu.tsx`, `design-system/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Activate next pending roadmap item under WIP=1 when selected.

## Previous Verified State (DB-first normalized My scripts)

- **Current task:** EdgeSelect migration (component-standardization Phase 6).
- **State:** **Passing** — shared `EdgeSelect` chip/field primitive on `EdgeAnchoredPopover`; all native `<select>` retired from app chrome; segmented tabs where presets are short; static ban test guards regressions.
- **Latest verification:** **Focused:** `Test Files 10 passed (10)`, `Tests 109 passed (109)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.5s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`; **Full:** `Test Files 535 passed (535)`, `Tests 3227 passed (3227)`, `npm run check` exit **0**; **Architecture review:** self-review **Passed**.
- **Evidence:** `src/app/components/design-system/EdgeSelect.tsx`, `src/lib/design-system/{edge.test.ts,ARCHITECTURE.md}`, journal/screener/heatmap/settings/builder consumers, `docs/roadmaps/component-standardization-roadmap.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by chart clock timezone bake-in fix above.

## Previous Verified State (App default timezone)

- **Current task:** App default timezone.
- **State:** **Passing** — Application settings sets default timezone; chart clock inherits app default unless per-chart override; legacy factory UTC stripped on layout load.
- **Latest verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 75 passed (75)`; **Packages:** `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 6.3s`); **Architecture review:** self-review **Passed**; **App-level:** settings → clock inherit + per-chart override walkthrough deferred.
- **Evidence:** `src/lib/app/appTimeZonePreference.ts`, `src/app/components/{AppTimeZoneProvider,home/AppSettingsShell,ChartCell,ChartRangeBar}.tsx`, `packages/chart-react/src/engine/chartSettings.ts`, `packages/chart-core/src/timeZone.ts`, `src/lib/layoutStorage.ts`, `src/lib/design-system/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by bake-in fix above.

## Previous Verified State (Equity position size calculator)

- **Current task:** Equity position size calculator.
- **State:** **Passing** — Risk panel computes whole-share size from entry, stop, and `dollarRisk`; Trade ticket **Size for risk** fills quantity when linked to a position drawing.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 17 passed (17)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.6s`); **Architecture review:** self-review **Passed**; **App-level:** Risk panel + linked Trade ticket walkthrough deferred.
- **Evidence:** `src/lib/risk/equityPositionSize.ts`, `src/app/components/sidebar/panels/RiskSettingsPanel.tsx`, `src/app/components/trading/TradeOrderForm.tsx`, `src/lib/marketData/ARCHITECTURE.md`, `docs/chart/features.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by app default timezone row above.

## Previous Verified State (TypeScript indicator scripting Phase 5B)

- **Current task:** TypeScript indicator scripting — Phase 5A (AI authoring).
- **State:** **Passing** — seven governed AI tools for My scripts CRUD/compile/apply; authoring context on get/compile; delete confirmation; generic chart tools return script refs only.
- **Latest verification:** **Focused:** `Test Files 13 passed (13)`, `Tests 50 passed (50)` (`src/lib/ai/`); **Build:** `npm run build` passed (`✓ Compiled successfully in 5.7s`); **Full:** `Test Files 528 passed (528)`, `Tests 3182 passed (3182)`, `npm run check` exit **0**; **Architecture review:** self-review **Passed**; **App-level:** in-app AI create/compile/apply walkthrough deferred.
- **Evidence:** `src/lib/ai/{context,scriptAuthoringContext}.ts`, `src/lib/ai/tools/{indicatorScripts,indicatorSanitizer}.ts`, `src/lib/scriptLibrary/ScriptLibraryContext.tsx`, `src/app/components/AiToolsProvider.tsx`, `docs/{ai-tools-architecture.md,chart/features.md}`, `docs/roadmaps/typescript-indicator-scripting-roadmap.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by Phase 5B row above.

## Previous Verified State (TypeScript indicator scripting Phase 4)

- **Current task:** TypeScript indicator scripting — Phase 4 (V1 completeness and hardening).
- **State:** **Passing** — all input kinds + conditional `colorRules`; typed `ScriptExecutionErrorCode` + `formatScriptError`; TA starter SDK; 150ms debounce + worker crash recovery; editor/legend/picker a11y; V1 docs.
- **Latest verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 42 passed (42)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.5s`); **Startup:** `npm run check:startup` exit **0**; **Full:** `Test Files 527 passed (527)`, `Tests 3173 passed (3173)`, `npm run check` exit **0**; **Architecture review:** self-review **Passed**; **App-level:** create/run/save/add/reload + `?scriptFixture=all` walkthrough deferred.
- **Evidence:** `packages/chart-core/src/scriptContracts.ts`, `packages/indicator-runtime/src/{taSdk,sourceNormalize}.ts`, `packages/chart-react/src/engine/{scriptResultCoordinator,scriptRuntimeWorkerClient,legend}.ts`, `src/lib/scriptLibrary/`, `src/app/components/{ScriptEditorModal,IndicatorPicker}.tsx`, `docs/chart/{script-examples,features}.md`, `docs/roadmaps/typescript-indicator-scripting-roadmap.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by Phase 5A row above.

## Previous Verified State (Workspace splitter hit targets)

- **Current task:** Workspace splitter hit targets.
- **State:** **Passing** — `SplitPane` keeps a 1px hairline with an 8px overlay hit target; row → horizontal drag, column → vertical drag; hover accent; works in Use and Edit layout modes.
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 5 passed (5)` (`SplitPane.test.tsx`); **Architecture review:** self-review **Passed** (N/A for package boundaries — UI hit-target only).
- **Evidence:** `src/app/components/app-workspace/{SplitPane,useSplitResize,SplitPane.test}.tsx`, `src/lib/appWorkspace/ARCHITECTURE.md`, `src/lib/design-system/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by Phase 4 row above.

## Previous Verified State (TypeScript indicator scripting Phase 3)

- **Current task:** TypeScript indicator scripting — Phase 3 (basic editor and local My scripts MVP).
- **State:** **Passing** — browser-local script library (IndexedDB + localStorage); My scripts picker enabled; basic editor (Run/Save/diagnostics); chart add/preview via `createScriptIndicatorInstance`; settings from script manifest; injected `ScriptSourceResolver` with fixture fallback.
- **Latest verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 18 passed (18)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.4s`); **Architecture review:** self-review **Passed**; **App-level:** create/run/save/add/reload walkthrough on `dev:lite` deferred.
- **Evidence:** `src/lib/scriptLibrary/`, `src/app/components/{ScriptEditorModal,IndicatorPicker,IndicatorSettingsModal,ChartCell}.tsx`, `packages/chart-core/src/scriptSourceResolver.ts`, `packages/chart-react/src/{engine/scriptResultCoordinator,useScriptResultCoordinator}.ts`, `docs/roadmaps/typescript-indicator-scripting-roadmap.md`.
- **Current blocker:** none.
- **Next best step:** Activate Phase 4 (V1 completeness and hardening) under WIP=1 when selected.

## Previous Verified State (TypeScript indicator scripting Phase 2)

- **Current task:** TypeScript indicator scripting — Phase 2 (chart runtime vertical slice).
- **State:** **Passing** — per-chart `ScriptResultCoordinator` + unified async `IndicatorResultProvider`; additive script instance identity + workspace Zod; four golden dev fixtures; worker client with main-thread fallback; built-ins unchanged.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 24 passed (24)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.8s`); **Architecture review:** self-review **Passed**; **App-level:** dev fixture injector (`?scriptFixture=all`) — manual four-plot walkthrough deferred.
- **Evidence:** `packages/chart-react/src/engine/{scriptResultCoordinator,scriptRuntimeWorkerClient,indicatorResultProvider}.ts`, `packages/chart-core/src/scriptFixtureCatalog.ts`, `src/lib/chart/scriptFixtureDev.ts`, `src/lib/chartConfig.ts`, `src/lib/persistence/schemas/chartWorkspace.ts`, `docs/roadmaps/typescript-indicator-scripting-roadmap.md`, `packages/indicator-runtime/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Activate Phase 3 (basic editor and local My scripts MVP) under WIP=1 when selected.

## Previous Verified State (App context menu + layout Save)

- **Current task:** App context menu + layout Save.
- **State:** **Passing** — Control+right-click app menu (Edit layout, Order account, Market data, Settings, tile Change panel); edit-mode draft with explicit Save (stays in edit) and Save-changes confirm on Done/Escape.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 42 passed (42)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.5s`); **Architecture review:** self-review **Passed**; **App-level:** manual `/workspace` gesture walkthrough deferred.
- **Evidence:** `src/app/components/home/{AppContextMenuProvider,AppChromeActionsProvider,AppModuleShell}.tsx`, `src/app/components/app-workspace/{AppWorkspaceContext,WorkspaceHeaderControls,LayoutEditConfirmModal,TileFrame}.tsx`, `src/app/components/ContextMenu.tsx`, `src/lib/appWorkspace/{storage,ARCHITECTURE}.md`, `src/lib/design-system/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by Phase 2 row above.

## Previous Verified State (TypeScript indicator scripting Phase 1)

- **Current task:** TypeScript indicator scripting — Phase 1 (headless compiler and runtime kernel).
- **State:** **Passing** — deterministic compile with versioned hash and type diagnostics; guest lockdown + TA bootstrap; cancel/stale/candle/output budgets; headless `ScriptSession` last-valid semantics; worker requestId cancel + recovery; adversarial test corpus; no chart UI.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 41 passed (41)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **App-level spike:** compile **33.8ms**, execute **95.2ms**, `Status: ready`; **Architecture review:** self-review **Passed**.
- **Evidence:** `packages/chart-core/src/{scriptContracts,scriptFixtures}.ts`, `packages/indicator-runtime/src/{sourceNormalize,compilerService,runtimeHost,guestGlobals,guestLockdown,guestTaBootstrap,scriptSession}.ts`, `docs/roadmaps/typescript-indicator-scripting-roadmap.md`, `packages/indicator-runtime/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by app context menu row above.

## Previous Verified State (Data inventory and state hardening Phase 4)

- **Current task:** Data inventory and state hardening — Phase 4 (freshness, quality, and trust policy).
- **State:** **Passing** — catalog-driven policy evaluation for freshness, completeness, provenance, and usage readiness; trading gates use provider/account timestamps; derived metrics carry upstream lineage; provider order and Data Health UX unchanged.
- **Latest verification:** **Focused:** `Test Files 20 passed (20)`, `Tests 203 passed (203)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review **Passed**; **App-level:** deterministic policy-matrix fixtures (open/closed session, stale delivery, partial batch, derived upstream); live provider walkthrough deferred; **Startup / Full:** exit **0**, **75** pre-existing status-doc validation issues (unchanged baseline).
- **Evidence:** `src/lib/marketData/trust/{policyEvaluator,dataTrust,enrichResponseMeta}.ts`, `src/lib/marketData/state/{policies,adapters}.ts`, `src/lib/marketData/marketCalendar.ts`, `src/lib/marketData/health.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/trading/tradingService.ts`, `src/lib/tradingSafety/tradingReadiness.ts`, `docs/roadmaps/data-state-hardening-roadmap.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by Phase 5 row above.

## Previous Verified State (Data inventory and state hardening Phase 3)

- **Current task:** Data inventory and state hardening — Phase 3 (instrument providers, routing, cache, transport).
- **State:** **Passing** — server-side delivery registry records bounded route/cache/transport observations from service waterfalls and stream polls without changing provider order or Data Health UX.
- **Latest verification:** **Focused:** `Test Files 12 passed (12)`, `Tests 100 passed (100)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.4s`); **Architecture review:** self-review **Passed**; **Startup / Full:** not re-run — **71** pre-existing status-doc validation issues (unchanged baseline).
- **Evidence:** `src/lib/marketData/state/{deliveryRegistry,routeCollector,serviceInstrumentation}.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/marketData/stream/createStreamSession.ts`, `packages/chart-core/src/dataSource.ts`, `src/app/components/MarketDataProvider.tsx`, `docs/roadmaps/data-state-hardening-roadmap.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by Phase 4 row above.

## Previous Verified State (App header and app-level theme)

- **Current task:** App header and app-level theme — global theme in header; market data vs order account clarified; settings shell; chart rail Risk-only footer.
- **State:** **Passing** — app-level theme provider with legacy migration; header hierarchy redesigned; rail theme removed.
- **Latest verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 35 passed (35)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.4s`); **Architecture review:** self-review **Passed**; **Startup / Full:** **71** pre-existing status-doc validation issues.
- **Evidence:** `src/lib/app/appThemePreference.ts`, `src/app/components/{AppThemeProvider,StockApp}.tsx`, `src/app/components/home/{AppTopHeader,MarketDataConnectionMenu,AppSettingsShell}.tsx`, `src/app/components/sidebar/{SidebarRail,registry}.tsx`, `src/app/layout.tsx`.
- **Current blocker:** none.
- **Next best step:** Superseded by Phase 1 catalog audit.

## Previous Verified State (Data inventory and state hardening Phase 0)

- **Current task:** Data inventory and state hardening — Phase 0 (stabilize misleading connection/freshness states).
- **State:** **Passing** — TWS circuit bypass separated from observed Gateway disconnect; last-known observation age; chart `refresh` heartbeat; unified display-freshness policy; Data Health copy/recovery alignment; deterministic transition regressions.
- **Latest verification:** **Focused:** `Test Files 19 passed (19)`, `Tests 197 passed (197)`; **Packages:** `npm run typecheck:packages` passed, `npm run lint:package-boundaries` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.4s`); **Live probe:** `npm run tws:probe` → paper/live `gatewayConnected: true`, `connectionState: "connected"`; **Architecture review:** self-review **Passed**; **Startup / Full:** `npm run check:startup` and `npm run check` report **71** pre-existing status-doc validation issues (unchanged baseline).
- **Evidence:** `src/lib/marketData/{health,service/marketDataService,providers/tws/client,trust/dataTrust}.ts`, `src/lib/chartDataFeed/{useChartDataFeed,pollStreamAdapter}.ts`, `packages/chart-core/src/{dataSource,series}.ts`, `src/app/components/{data-health,chart-cell,EdgeChart}.tsx`, `docs/roadmaps/data-state-hardening-roadmap.md`.
- **Current blocker:** none.
- **Next best step:** Activate data-state-hardening Phase 1 (catalog and vocabulary audit) under WIP=1 when ready.

## Previous Verified State (App component standardization Phase 5)
- **Current task:** App UX polish Phase 4 — interaction states and accessibility.
- **State:** **Passing** — shared focus/loading/destructive recipes, modal focus trap, menu keyboard nav, segmented-tab keyboard + 32px targets, overlay recover CTA target fix shipped.
- **Latest verification:** **Focused:** `Test Files 9 passed (9)`, `Tests 29 passed (29)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**, `chart-overlay-recover-tws` cleared from `smallTargets`, journal tile tabs **0/12** `smallTargets`; **Architecture review:** self-review Passed; **Startup:** `npm run check:startup` blocked by **71** pre-existing status-doc validation issues; **Full:** `npm run check` not re-run (same validator baseline).
- **Evidence:** `src/app/components/design-system/{styles,EdgeButton,EdgeIconButton,EdgeModalShell,EdgeSlideOver,EdgeSegmentedTabs,EdgeToggle,useFocusTrap,useMenuKeyboardNav}.tsx`, `src/app/components/chart-chrome/ChartAnchoredPopover.tsx`, `src/app/components/data-health/TwsRecoverButton.tsx`, `src/app/components/chart-cell/ChartErrorBoundary.tsx`, `src/app/globals.css`, `src/lib/design-system/ARCHITECTURE.md`, `docs/ux-baseline/ux-baseline-latest.json`.
- **Current blocker:** none.
- **Next best step:** Superseded by component-standardization Phase 0 row above.

## Previous Verified State (IB Gateway native daily soft restart)
- **Current task:** IB Gateway native daily soft restart.
- **State:** **Blocked** — config/runtime proof complete; first scheduled 11:45 PM ET soft-restart cycle not yet observed.
- **Latest verification:** **Focused:** `Ran 4 tests in 0.007s` / `OK`; **Config:** both services resolve `TZ=America/New_York`, `AUTO_RESTART_TIME=11:45 PM`, `AUTO_LOGOFF_TIME=""`, `TWS_COLD_RESTART=""`; **Runtime:** both recreated containers `status=running`, `restartCount=0`, logs show `AutoRestartTime=11:45 PM` and `Login has completed`; **App-level:** sidecar reconnect returned paper/live `gatewayConnected: true`, `warnings: []`.
- **Evidence:** `services/ib-gateway/docker-compose.yml`, `services/ib-gateway/.env.example`, `services/tws-sidecar/main.py`, `services/tws-sidecar/test_main.py`, `src/lib/marketData/ARCHITECTURE.md`.
- **Current blocker:** Scheduled-cycle proof pending after 11:45 PM ET.
- **Next best step:** After native autorestart, confirm restart counts and sidecar paper/live sockets; mark **Passing**.

## Previous Verified State (App UX polish Phase 1)
- **Current task:** App UX polish Phase 1 — foundation rhythm (typography, spacing, shape, controls, motion, elevation).
- **State:** **Passing** — shared foundation tokens + recipes shipped; audited header/workspace/home/screener defects migrated; Phase 0 P0 targets cleared in baseline re-run.
- **Latest verification:** **Focused:** `Test Files 8 passed (8)`, `Tests 37 passed (37)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.6s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, horizontal overflow **0/12**, shared header controls no longer in `smallTargets`, home contrast/title issues cleared @1440; **Architecture review:** self-review Passed; **Full:** `npm run check` blocked by 71 pre-existing status-doc validation issues.
- **Evidence:** `src/app/globals.css`, `src/lib/design-system/edge.ts`, `src/app/components/design-system/`, `src/app/components/home/`, `src/app/components/app-workspace/`, `src/lib/design-system/ARCHITECTURE.md`, `docs/ux-baseline/ux-baseline-latest.json`.
- **Current blocker:** none.
- **Next best step:** Superseded by Phase 2 row above.

## Previous Verified State (Structural refactor Tier D)
- **Current task:** Structural refactor Tier C (app shell decomposition).
- **State:** **Passing** — C1 StockApp bootstrap/layout/sidebar hooks + `AppProviders`; C2 Object Tree vs Data Window file split; C3 seven chart chrome surfaces migrated to Edge tokens/shells; no behavior change (C3 visual token swap only).
- **Latest verification:** **Focused:** `Test Files 10 passed (10)`, `Tests 53 passed (53)` (StockApp/bootstrap, ObjectTreePanel/objectTreeModel, BarReplay/TemplatePicker/ChartGoTo/DrawingSelectionToolbar); **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review — Passed.
- **Evidence:** `src/app/components/stock-app/*`, `StockApp.tsx`, `src/app/components/object-tree/*`, `ObjectTree.tsx`, `BarReplay.tsx`, `ChartTimeZoneMenu.tsx`, `TemplatePickerModal.tsx`, `ChartGoToModal.tsx`, `DrawingSettingsModal.tsx`, `IndicatorSettingsModal.tsx`, `DrawingSelectionToolbar.tsx`, `docs/roadmaps/refactor-roadmap.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by Tier D row above.

## Previous Verified State (Screener keyboard chart viewport drift)
- **Current task:** Screener keyboard chart viewport drift.
- **State:** **Passing** — cache→fresh candle growth no longer keeps stale live-edge indices; workspace screener drive no longer double-loads via BroadcastChannel.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 27 passed (27)`; **Architecture review:** self-review — Passed.
- **Evidence:** `packages/chart-react/src/engine/canvas.tsx`, `canvas.test.tsx`, `useScreenerReviewDrive.ts`, `src/lib/chart/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level — `/workspace` Chart + Screener → run screen → ↑/↓ through results and confirm chart stays fitted at live edge.

## Previous Verified State (Structural refactor Tier B)
- **Current task:** Structural refactor Tier B (duplication consolidation).
- **State:** **Passing** — B1 generic `useRevisionedRemoteSync` + thin library wrappers; B2 series/interval math canonical in `@edge/chart-core` with app re-exports; no user-visible change.
- **Latest verification:** **Focused:** `Test Files 13 passed (13)`, `Tests 99 passed (99)`; **Build:** `npm run build:packages` passed; **Boundaries:** `npm run lint:package-boundaries` passed; **Architecture review:** self-review — Passed.
- **Evidence:** `useRevisionedRemoteSync.ts`, `use*LibraryRemoteSync.ts`, `packages/chart-core/src/{series,interval}.ts`, `src/lib/chart/{series,intervalAdapter}.ts`, `useChartDataFeed.ts`, `priceAxisAnnotations.ts`.
- **Current blocker:** none.
- **Next best step:** Tier C1 — StockApp providers + controllers ([refactor-roadmap.md](./roadmaps/refactor-roadmap.md)).

## Previous Verified State (Screener header Option B)

## Previous Verified State (Screener results scroll + compact view)
- **Current task:** Screener results scroll + compact view control.
- **State:** **Passing** — results pane scrolls independently (`min-h-0` height chain through tile → results); List/Heat map is a compact select; denser toolbar.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 29 passed (29)` (`ResultsTable`, `ScreenerDialog`, `ScreenerResultsBody`, `ScreenerScreensBody`); dialog scroll assertion passed (`overflow-auto` + `min-h-0` + `flex-1`).
- **Evidence:** `ScreenerTileSurface.tsx`, `ScreenerResultsBody.tsx`, `ScreenerScreensBody.tsx`, `ResultsTable.tsx`.
- **Current blocker:** none.
- **Next best step:** App-level — small Screener tile → run Top 200 → scroll results without scrolling Screens/filters.

## Previous Verified State (Dead code removal Tier A)
- **Current task:** Dead code removal (Tier A).
- **State:** **Passing** — orphan chart duplicates (`indicators/draw`, `drawings/measure`) are package re-exports; unused app Toolbar/legend components removed; unused `createYahooMarketDataPort` removed; no user-visible change.
- **Latest verification:** **Focused:** `Test Files 8 passed (8)`, `Tests 45 passed (45)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.9s`); **Architecture review:** self-review — Passed.
- **Evidence:** `src/lib/chart/indicators/draw.ts`, `src/lib/chart/drawings/measure.ts`, deleted `Toolbar.tsx`/`ChartLegendBar.tsx`/`PaneLegendBar.tsx`, `src/lib/ai/{marketDataPort,index}.ts`, `docs/ai-tools-architecture.md`.
- **Current blocker:** none.
- **Next best step:** Tier C1 — StockApp providers ([refactor-roadmap.md](./roadmaps/refactor-roadmap.md)).

## Previous Verified State (Screener results toolbar UX)
- **Current task:** Screener results toolbar UX.
- **State:** **Passing** — post-run chrome is one toolbar: List/Heat map + result count (+ phase tooltip) + Live badge; Watchlist/Export secondary menus; no step/live paragraphs; bulk menus hidden at 0 results.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 27 passed (27)` (`ResultsTable.test.tsx`, `ScreenerDialog.test.tsx`, `styles.test.ts`); **Architecture review:** self-review — Passed (`EdgeButton` secondary + forwardRef).
- **Evidence:** `ResultsTable.tsx`, `EdgeButton.tsx`, `styles.ts`, `EdgeMenuItem.tsx`, `design-system/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by results scroll + compact view row above.

## Previous Verified State (Screener result-limit compact select)
- **Current task:** Screener result-limit compact select.
- **State:** **Passing** — freeform LIMIT input replaced with compact “Top N” select (50/100/200/500) immediately before Run screen; legacy non-preset limits still shown until changed.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 16 passed (16)` (`ScreenerDialog.test.tsx`, `ScreenerScreensBody.test.tsx`); **Architecture review:** self-review — Passed (UI-only control swap).
- **Evidence:** `ScreenerScreensBody.tsx`, `ScreenerDialog.test.tsx`.
- **Current blocker:** none.
- **Next best step:** App-level — open screener custom query → confirm Top 200 ▾ sits left of Run → change to Top 50 and run.

## Previous Verified State (Screener Option A split-pane UX)
- **Current task:** Screener Option A split-pane UX.
- **State:** **Passing** — unified screener surface: Screens list (starters as saved screens) + active query + results; row click / ↑↓ selects symbol and drives sibling chart via WorkspaceDrive/BroadcastChannel; Review/Screens/Results/Keepers sub-nav removed.
- **Latest verification:** **Focused:** `Test Files 15 passed (15)`, `Tests 69 passed (69)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review — Passed.
- **Evidence:** `ScreenerScreensBody.tsx`, `ScreenerTileSurface.tsx`, `ScreenerResultsBody.tsx`, `ResultsTable.tsx`, `useScreenerResultSelection.ts`, `useScreenerSessionModel.ts`, `screenStorage.ts`, `types.ts`, `screenerLibrary.ts`, `deepLinks.ts`, `docs/roadmaps/screener-roadmap.md`.
- **Current blocker:** none.
- **Next best step:** App-level — `/workspace` with Chart + Screener tiles: run a screen → click row → confirm chart symbol updates; ↑/↓ flips selection; Save creates user screen in left list.

## Previous Verified State (Patterns library browse UI)
- **Current task:** Pattern Capture start/end sections + numbered presets.
- **State:** **Passing** — independent start/end section pairs (1-bar allowed); numbered preset labels via keys 1–N; pattern OHLCV bounds from section min/max.
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 13 passed (13)` (`patternCapture.test.ts`); **Architecture review:** self-review — Passed.
- **Evidence:** `src/lib/patternCapture/{fsm,presets,buildRecord}.ts`, `PatternCapturePanel.tsx`, `PatternCaptureOverlay.tsx`, `ChartCell.tsx`, `docs/chart/features.md`, `patternLibrary/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by Patterns library browse row above.

## Previous Verified State (Workspace pill header UX)
- **Current task:** Workspace pill header UX.
- **State:** **Passing** — Use mode: single workspace pill (switch / rename / new / duplicate); Edit mode: Editing label + Layout preset picker + Done; removed always-on name input, native select, and Save copy.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 30 passed (30)`; **Architecture review:** self-review — Passed.
- **Evidence:** `WorkspacePill.tsx`, `WorkspaceHeaderControls.tsx`, `commands.ts` (`createWorkspaceDocument`), `AppWorkspaceContext.tsx`, `appWorkspace/ARCHITECTURE.md`, `design-system/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level — `/workspace` → open pill → switch/rename/new/duplicate → Edit layout → Layout preset → Done; confirm Use mode is calm again.

## Previous Verified State (Workspace layout presets + empty-pane assign)
- **Current task:** Workspace layout presets + empty-pane assign.
- **State:** **Passing** — Edit mode **Layout** picker (8 presets) replaces geometry with placeholder panes; per-pane Chart/Screener/Journal chooser; filled-tile reassign in edit header; freeform drag-dock retained.
- **Latest verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 52 passed (52)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review — Passed.
- **Evidence:** `layoutPresets.ts`, `commands.ts` (`applyLayoutPreset`, `assignTileSurface`), `WorkspaceLayoutPresetPicker.tsx`, `WorkspaceLayoutPresetIcon.tsx`, `PlaceholderTile.tsx`, `TileFrame.tsx`, `SurfaceHost.tsx`, `LayoutTreeInner.tsx`, `AppWorkspaceContext.tsx`, `WorkspaceHeaderControls.tsx`, `appWorkspace/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by workspace pill header UX row above.

## Previous Verified State (Broker ledger functional proof)
- **Current task:** Broker ledger functional proof (Phases 0–4 app-level).
- **State:** **Blocked** — Tier A API oracles + most Tier B pass; primary oracle **B2** (new fill without Journal mounted) not proven — paper MKT submitted `orderId=50` `PreSubmitted` / no new `journal_fills`; sidecar intermittently times out under load.
- **Latest verification:** **App-level:** see Session Log 2026-07-16 functional plan; **Focused:** `Test Files 4 passed (4)`, `Tests 13 passed (13)` (incl. A4 `database_unavailable` unit).
- **Evidence:** `docs/roadmaps/broker-ledger-functional-test-plan.md`; A1–A3/B1/B3/B4/B5 quoted below; B2 blocked; A4 unit + isolated `next dev` blocked by Next single-server lock; C1 skipped (no Flex env).
- **Current blocker:** B2 — after-hours (~22:00 ET): paper F MKT `78` cancelled (`PreSubmitted`); LMT@$25 `184` `Submitted` then cancelled; sidecar `executions:0`, `new_fills 0`. US equity extended session closed (ends ~20:00 ET). Sidecar+Gateway connected post-2FA.
- **Next best step:** Resume B2 in premarket/RTH (or portal fill while session open) → wait ≤30s without Journal → confirm new `execId` on GET `/api/me/journal/fills` → mark **Passing**.

## Previous Verified State (Personal pattern library)
- **State:** **Passing** — in-chart `WorkspaceTabBar` removed; one layout per chart tile (`pruneToSingleActiveTab` on hydrate); primary chart tile (DFS left-first) publishes symbol + price + day % to `document.title` with green/red/muted favicon; layout menu no longer create/copy/switch layouts.
- **Latest verification:** **Focused:** `Test Files 9 passed (9)`, `Tests 53 passed (53)` (`browserTabQuote`, `primaryChartTile`, `workspaceTabs`, `StockApp`, `app-workspace/`); **Architecture review:** self-review — Passed.
- **Evidence:** `browserTabQuote.ts`, `primaryChartTile.ts`, `PrimaryChartBrowserTabQuote.tsx`, `WorkspaceBrowserTabQuote.tsx`, `StockApp.tsx`, `ChartTileHost.tsx`, `SurfaceHost.tsx`, `LayoutTreeInner.tsx`, `ChartLayoutMenu.tsx`, `workspaceTabs.ts`, `appWorkspace/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level — open `/workspace` with a chart; confirm browser tab shows `SYMBOL price ▲/▼ % · Edge` and favicon color; add second chart tile and confirm title still follows left/first chart; confirm no tab strip under chart header.

## Previous Verified State (App Workspace Use/Edit + shell-as-app)

- **Current task:** App Workspace Use/Edit + shell-as-app.
- **State:** **Passing** — `/workspace` is the primary app shell; **Use** vs **Edit layout** modes (session-only); module routes (`/chart`, `/screener/*`, `/journal/*`) redirect into workspace deep links; rail focuses/adds surfaces; root `lastModule` for chart/journal/screener/workspace → `/workspace`.
- **Latest verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 31 passed (31)` (`src/lib/appWorkspace/`, `src/app/components/app-workspace/`); **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Architecture review:** self-review — Passed.
- **Evidence:** `AppWorkspaceContext.tsx`, `commands.ts` (`applySurfaceFocusOrOpen`), `workspace/page.tsx`, `ScreenerTileSurface.tsx`, `TileFrame.tsx`, `LayoutTreeInner.tsx`, `WorkspaceHeaderControls.tsx`, `AppWorkspaceNav.tsx`, `HomeAppNav.tsx`, `ModuleToWorkspaceRedirect.tsx`, `deepLinks.ts`, `lastModule.ts`, module redirect pages, `appWorkspace/ARCHITECTURE.md`, `design-system/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by browser tab live quote row above.

## Previous Verified State (App Workspace Shell — Tiling Dock)

- **Current task:** App Workspace Shell (Tiling Dock).
- **State:** **Passing** — `/workspace` binary split-tree tiles (Chart, Screener, Journal, placeholder); resizable splitters; drag-to-dock; named save/duplicate/switch; in-process Review→Chart via `WorkspaceDriveContext`; deep links `/workspace?surface=screener`; module routes retained.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 29 passed (29)` (`src/lib/appWorkspace/`, `src/app/components/app-workspace/`, `lastModule`, `HomeAppNav`); **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Packages:** `npm run check:packages` passed; **Architecture review:** self-review — Passed.
- **Evidence:** `src/lib/appWorkspace/*`, `src/app/components/app-workspace/*`, `src/app/workspace/page.tsx`, `ChartTileHost.tsx`, `WorkspaceDriveContext.tsx`, `WorkspaceChartDriveBridge.tsx`, `useScreenerReviewDrive.ts`, `HomeAppNav.tsx`, `lastModule.ts`, `design-system/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by Use/Edit shell-as-app row above.

## Previous Verified State (App Workspace — Phase 0 layout engine)

## Previous Verified State (Position stick entry to last price)

- **Current task:** Position stick entry to last price.
- **State:** **Passing** — Long/short entry follows live last price by default; stop/TP stay fixed; Settings → “Stick entry to last price”; manual entry drag turns stick off.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 59 passed (59)` (`positionGeometry`, `drawingSettingsCapabilities`, `drawingStyles`, `position_tool`, `package-api-snapshot`); `@edge/chart-core` + `@edge/chart-react` rebuild passed; **Architecture review:** self-review — Passed.
- **Evidence:** `positionGeometry.ts`, `drawingStyles.ts`, `drawingSettingsCapabilities.ts`, `DrawingSettingsModal.tsx`, `useDrawingController.ts`, `EdgeChart.tsx`, `features.md`, `ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level — place Long on a live symbol, confirm entry tracks last price while stop/TP stay put; toggle Settings off and confirm entry pins.

## Previous Verified State (Account display aliases)

- **Current task:** Account display aliases.
- **State:** **Passing** — Custom account picker dropdown includes a right-side settings rail; gear opens display-name editor inside the menu (no separate header icon). Aliases persist and replace raw IB ids across picker, Account panel, Trade form, and Data Health.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 43 passed (43)` (`AccountPickerMenu`, `AppTopHeader`, `accountAliases`, `accountPickerOptions`, `AccountPanel`); **Architecture review:** self-review — Passed.
- **Evidence:** `AccountPickerMenu.tsx`, `AccountAliasEditor.tsx`, `AppTopHeader.tsx`, `accountAliases.ts`, `AccountAliasesProvider.tsx`, `AccountPanel.tsx`, `TradeOrderForm.tsx`, `trading/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level — click account picker → gear on right → set display name → confirm picker label updates and survives reload.

## Previous Verified State (Position tool instant place at last bar)

- **Current task:** Event rail transparent background.
- **State:** **Passing** — Event badge strip no longer paints its own fill/border; plot canvas background shows through (including user overrides).
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)` (`eventBadges`, `renderer`); `@edge/chart-react` rebuild passed.
- **Evidence:** `packages/chart-react/src/engine/renderer.ts`, `docs/chart/features.md`, `src/lib/chart/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level — open `/chart` with events on and confirm the rail matches the plot background.

## Previous Verified State (Time axis date-label vertical margins)

- **Current task:** Time axis date-label vertical margins.
- **State:** **Passing** — Bottom date strip is 24px; labels and crosshair time badge are vertically centered (equal top/bottom margin, TV-style).
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 56 passed (56)` (renderer, layout, canvas, webgl mocks); `@edge/chart-core` + `@edge/chart-react` rebuild passed.
- **Evidence:** `packages/chart-core/src/layout.ts`, `packages/chart-react/src/engine/renderer.ts`, `docs/chart/features.md`.
- **Current blocker:** none.
- **Next best step:** App-level — open `/chart` and confirm date labels have equal padding above/below in the bottom strip.

## Previous Verified State (Price axis quarter tick dashes)

- **Current task:** Price axis quarter tick dashes.
- **State:** **Passing** — Three short dashes between each labeled price on the Y-axis, partitioning each interval into quarters.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 26 passed (26)` (`priceScaleTransform.test.ts`, `renderer.test.ts`); `@edge/chart-core` + `@edge/chart-react` rebuild passed.
- **Evidence:** `packages/chart-core/src/priceScaleTransform.ts`, `packages/chart-react/src/engine/renderer.ts`, related tests, `docs/chart/features.md`.
- **Current blocker:** none.
- **Next best step:** App-level — open `/chart` and confirm three dashes between consecutive price labels on the right axis.

## Previous Verified State (Long position empty-margin stretch fix)

- **Current task:** Long position empty-margin stretch fix.
- **State:** **Passing** — Near-miss past last candle snaps to last bar; far empty-margin uses extrapolated timestamps (never `timestamp: 0`); legacy `t:0`+virtual-index anchors clamp on render. Runtime: stretch width ~118px → ~8.8px (`zero-ts-clamped`).
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 44 passed (44)` (`drawingCoords`, `positionGeometry`, `position_tool`); `@edge/chart-core` rebuild passed; app-level post-fix logs confirmed clamp.
- **Evidence:** `packages/chart-core/src/drawingCoords.ts`, `packages/chart-core/src/drawings/positionGeometry.ts`, related tests.
- **Current blocker:** none.
- **Next best step:** Delete any old stretched long (persisted `t:0` points) if still on chart; draw new longs near live edge to confirm.

## Previous Verified State (Drawing hover grab cursor without selection)

- **Current task:** Drawing hover grab cursor without selection.
- **State:** **Passing** — Hovering any drawing body (or control point) shows `grab` without selecting first; locked CP → `not-allowed`; active drawing tool keeps crosshair.
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 21 passed (21)` (`layout.test.ts`); `@edge/chart-core` + `@edge/chart-react` rebuild passed.
- **Evidence:** `packages/chart-core/src/layout.ts`, `packages/chart-react/src/engine/canvas.tsx`, `src/lib/chart/layout.test.ts`, `docs/chart/prereqs/gesture-bible.md`.
- **Current blocker:** none.
- **Next best step:** App-level — hover unselected long position and confirm grab cursor before click.

## Previous Verified State (Drawing selection toolbar clearance)

- **Current task:** Drawing selection toolbar clearance.
- **State:** **Passing** — Floating drawing toolbar sits 28px clear of the drawing; flips below when the viewport lacks room above; clamped inside the chart.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 10 passed (10)` (`drawingSelectionToolbarPosition`, `DrawingSelectionToolbar`).
- **Evidence:** `drawingSelectionToolbarPosition.ts`, `DrawingSelectionToolbar.tsx`, related tests.
- **Current blocker:** none.
- **Next best step:** App-level — select a long position near the top of the chart and confirm toolbar flips below with clearance.

## Previous Verified State (Workspace tab live quote strip)

- **Current task:** Workspace tab live quote strip.
- **State:** **Passing** — Tabs show last price + day % (green/red/muted); SSE `price`/`changePercent` mapped into QuoteSnapshot; all workspace tab symbols included in quote universe.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 16 passed (16)` (`mappers`, `WorkspaceTabBar`, `MarketDataProvider`).
- **Evidence:** `mapRawQuoteToSnapshot`, `MarketDataProvider.tsx`, `WorkspaceTabBar.tsx`, `StockApp.tsx`, related tests.
- **Current blocker:** none.
- **Next best step:** App-level — open `/chart` on F and confirm tab shows last + day %.

## Previous Verified State (Clear manual TWS reconnect)

- **Current task:** Clear manual TWS reconnect.
- **State:** **Passing** — When TWS/Gateway is down, Reconnect appears in chart top-right and app header alert; Data Health panel keeps the same action; sidecar `/control/reconnect` resets paper and live sockets.
- **Latest verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 19 passed (19)` (UI recover tests); Sidecar `Ran 2 tests OK` (`ReconnectResetTests`); **Architecture review:** self-review — Passed.
- **Evidence:** `TwsRecoverButton.tsx`, `ChartOverlayDataHealthRow.tsx`, `ChartOverlayStatusStack.tsx`, `AppTopHeader.tsx`, `DataHealthMenu.tsx`, `services/tws-sidecar/main.py`, `test_main.py`, `src/lib/marketData/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level — stop one Gateway socket, confirm chart top-right Reconnect + Data Health panel both recover paper+live; external-mode Reconnect spawn shipped in follow-up row.

## Previous Verified State (Workspace tabs TV-style chrome)

- **Current task:** Workspace tabs TV-style chrome.
- **State:** **Passing** — Tab bar is ~75% of chart header height (`27px` / `h-9`); tabs stretch full track; content matches TV strip (monogram, symbol, direction, price, %, layout title).
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 4 passed (4)` (`WorkspaceTabBar.test.tsx`).
- **Evidence:** `WorkspaceTabBar.tsx`, `WorkspaceTabBar.test.tsx`, `src/lib/design-system/ARCHITECTURE.md`, `docs/chart/features.md`.
- **Current blocker:** none.
- **Next best step:** App-level — open `/chart` and confirm tab height vs header + quote strip layout.

## Previous Verified State (Position drawing TV-style 4 handles)

- **Current task:** Position drawing TV-style 4 handles.
- **State:** **Passing** — Long/short position drawings expose four TradingView-style handles: TP/stop vertical-only, entry-left 2-axis, right width-only.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 29 passed (29)` (`positionGeometry.test.ts`, `position_tool.test.ts`); `@edge/chart-core` rebuild passed.
- **Evidence:** `packages/chart-core/src/drawings/positionGeometry.ts`, `positionGeometry.test.ts`, `src/lib/chart/drawings/position_tool.test.ts`, `docs/chart/features.md`, `src/lib/chart/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level — select long/short position and confirm only four handles with TV drag semantics.

## Previous Verified State (Full-range chart horizontal pan)

- **Current task:** Full-range chart horizontal pan.
- **State:** **Passing** — Pan slack is visible−1 so the first bar can reach the right edge and the last bar can reach the left edge (no fixed ±40 buffer).
- **Latest verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 50 passed (50)` (`packages/chart-react/src/engine/viewport.test.ts`); `@edge/chart-react` rebuild passed.
- **Evidence:** `packages/chart-react/src/engine/viewport.ts`, `viewport.test.ts`, `docs/chart/features.md`.
- **Current blocker:** none.
- **Next best step:** App-level — pan chart left/right until first bar is at right edge and latest bar is at left edge.

## Previous Verified State (Trade setup panel drawing-bound)

- **Current task:** Trade setup panel (drawing-bound).
- **State:** **Passing** — Right-click long/short position → Trade setup… opens docked Trade sidebar; panel live-syncs entry/stop/TP from bound drawing only; header Trade opens unbound panel; entry-only MKT/LMT preview→submit.
- **Latest verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 20 passed (20)` (`positionTradeSetup`, `overlayContextMenu`, `TradeSidebarPanel`, `registry`, `TradeTicketModal`); **Build:** `npm run build` passed (`✓ Compiled successfully in 2.4s`); **Architecture review:** self-review — Passed.
- **Evidence:** `positionTradeSetup.ts`, `TradeSetupBindingContext.tsx`, `TradeOrderForm.tsx`, `TradeSidebarPanel.tsx`, `overlayContextMenu.ts`, `ChartCell.tsx`, `StockApp.tsx`, `registry.tsx`, `trading/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level walkthrough — draw long → Trade setup… → drag stop → panel updates → Preview paper order; then RTH live fill proof.

## Previous Verified State (Full-width Edge logo header)

- **Current task:** Full-width Edge logo header.
- **State:** **Passing** — Full-width top header with clickable `logo-full-light` → `/home`; left module rail below header without Home icon.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 9 passed (9)` (`AppTopHeader`, `HomeAppNav`, `AppModuleShell`); **App-level:** `/chart` shows Edge home link + Charts/Journal/Research rail only; logo navigates to `/home`; account picker loads; **Architecture review:** self-review — Passed.
- **Evidence:** `AppModuleShell.tsx`, `AppTopHeader.tsx`, `HomeAppNav.tsx`, related tests, `src/lib/design-system/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by trade setup panel.

## Previous Verified State (Account panel open orders vs order history)

- **Current task:** Account panel open orders vs order history.
- **State:** **Passing** — Open orders excludes Cancelled/Filled; Order history shows all session orders; cancel of paper F `orderId=32` verified at broker.
- **Latest verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 22 passed (22)` (`orderStatus`, `filterOrders`, `AccountPanel`); **App-level:** `GET /account/orders` paper F `orderId=32` `status: Cancelled`; **Architecture review:** self-review — Passed.
- **Evidence:** `orderStatus.ts`, `filterOrders.ts`, `AccountPanel.tsx`, `AccountPanel.test.tsx`, `src/lib/trading/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by full-width Edge logo header.

## Previous Verified State (Account panel cancel for null-status orders)
- **State:** **Passing** — Cancel shows when order status is null/blank; sidecar maps status from `trade.orderStatus`.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)` (`orderStatus`, `AccountPanel`); **Sidecar:** `TradingModifyTests` 7 OK; **App-level:** paper F LMT `orderId=32` cancelled (`status: Cancelled` on `GET /account/orders`).
- **Evidence:** `orderStatus.ts`, `AccountPanel.tsx`, `AccountPanel.test.tsx`, `services/tws-sidecar/main.py`, `test_main.py`.
- **Current blocker:** none.
- **Next best step:** Superseded by open-orders vs history split.

## Previous Verified State (Trade execution reliability track)

- **Current task:** Trade execution reliability track.
- **State:** **Passing** — paper + live API bake; Postgres intent store; after-hours readiness fixes; recovery partial (dev port-ownership).
- **Latest verification:** **App-level:** paper LMT `orderId=24` `permId=438990727` cancel `Cancelled`; STP `12`/`16` cancel `Cancelled`; idempotency `24==24`; kill switch blocked preview; Postgres restart idempotency `orderId=31` after dev restart; live preview+submit `U25026894` LMT `orderId=9` `permId=703230888`; live GTC `orderId=15` cancelled 2026-07-13; **Focused:** `Test Files 14 passed (14)`, `Tests 81 passed (81)`; **Build:** `npm run build` passed; **Architecture review:** self-review — Passed.
- **Evidence:** `dataTrust.ts`, `tradingService.ts`, `intentStore.ts`, `postgresIntentStore.ts`, `intentRepository.ts`, `0005_order_intents.sql`, `.env.local` (`TWS_MANAGED=external`).
- **Current blocker:** Live 1-share fill proof still pending RTH; in-app Reconnect TWS blocked when port 8765 owned by another dev instance.
- **Next best step:** Finish UI walkthrough cancel after Account panel Cancel fix; then RTH live 1-share MKT fill + journal proof.

## Previous Verified State (Heat map data hardening)

- **Current task:** Heat map data hardening.
- **State:** **Passing** — Movers enriched via universe descriptors; screener `changePercent` mapping fixed; heat-map quote cap 200; partial size-metric banner.
- **Latest verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 31 passed (31)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Architecture review:** self-review — Passed; app-level Gainers/Large-cap heat map walkthrough deferred.
- **Evidence:** `enrichMoversWithDescriptors.ts`, `marketDataService.ts`, `mappers.ts`, `apiScreenerFeed.ts`, `screenerHeatMapAdapter.ts`, `ResultsTable.tsx`, `useScreenerSessionModel.ts`.
- **Current blocker:** none.
- **Next best step:** Superseded by trade execution reliability track.

## Previous Verified State (Dual connection Phase D)

- **Current task:** Screener layout + right-panel UX.
- **State:** **Passing** — screener-only wide dock (panel-aware max + Expand/Collapse); never-run vs no-match empty states; edit/scan filter modes with chip summary; narrow horizontal preset chips; Limit beside Run.
- **Latest verification:** **Focused:** `Test Files 20 passed (20)`, `Tests 105 passed (105)` (`sidebarWidth`, sidebar shell, screener); **Build:** `npm run build` passed; **Architecture review:** self-review — Passed.
- **Evidence:** `src/lib/responsive/{sidebarWidth,layoutConstants}.ts`, `src/app/components/sidebar/{SidebarPanelWidthContext,PanelChromeActions,RightSidebar}.tsx`, `src/app/components/StockApp.tsx`, `src/app/components/screener/{ScreenerPanelContent,ResultsTable,FilterChipSummary}.tsx`, `src/lib/screener/{screenerSession,useScreenerSessionModel,compileQuery}.ts`, `docs/screener-roadmap.md`.
- **Current blocker:** none.
- **Next best step:** Superseded by right panel overlay layout row.

## Previous Verified State (Dual connection Phase C)

- **Current task:** Dual connection — Phase C data preference split.
- **State:** **Passing** — chart/quote IB connection decoupled from order account via `edge:marketData:connectionId`; header data chip; pre-trade quotes follow order env.
- **Latest verification:** **Focused:** Sidecar `Ran 35 tests OK`; App `Test Files 4 passed (4)`, `Tests 71 passed (71)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 4.2s`); **Architecture review:** self-review — Passed.
- **Evidence:** `services/tws-sidecar/main.py`, `dataConnectionPreference.ts`, `useDataConnectionPreference.ts`, `MarketDataProvider.tsx`, `AppTopHeader.tsx`, `tradingService.ts`, `marketDataService.ts`, `src/lib/marketData/ARCHITECTURE.md`, `src/lib/trading/ARCHITECTURE.md`, `docs/dual-connection-roadmap.md`.
- **Current blocker:** App-level Phase C proof needs both Gateways up (`services/ib-gateway/.env` + 2FA).
- **Next best step:** Phase D abstraction hardening — or app-level walkthrough: live data chip while paper order account selected.

## Previous Verified State (Position 1R yard lines)

- **Current task:** Position 1R yard lines.
- **State:** **Passing** — long/short position drawings show always-on left-edge 1R ticks with in-box `NR` labels in the profit zone.
- **Latest verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 29 passed (29)`; **Build:** `npm run build:packages` passed; **Architecture review:** self-review — Passed.
- **Evidence:** `packages/chart-core/src/drawings/{positionGeometry,position_tool}.ts`, `positionGeometry.test.ts`, `docs/chart/features.md`, `src/lib/chart/ARCHITECTURE.md`.
- **Current blocker:** none.
- **Next best step:** App-level walkthrough on `/chart` — draw long + short with ≥2R target; confirm left ticks + in-box `1R`/`2R` update on resize.

## Startup Readiness

Fresh agent or developer sessions should initialize before feature work. See [AGENTS.md](../AGENTS.md) for constraints and topic docs.

| Step | Command |
|------|---------|
| Install dependencies | `npm run setup` |
| Start dev server | `npm run dev` → http://localhost:3003 |
| Fast startup verification | `npm run check:startup` |
| Full verification | `npm run check` |
| One-shot init script | `scripts/init.sh` (add `--full` for full check) |

Optional persistence: copy `.env.example` → `.env.local`, then `npm run db:up` and `npm run db:migrate`.

### Fresh-Session Acceptance Checklist

- [ ] `npm run setup` succeeds from a clean clone
- [ ] `npm run check:startup` passes (harness + active-area smoke tests)
- [ ] Active work and next priorities are visible below without verbal context
- [ ] Area-specific tests pass for the task being picked up

## Shipped Foundations

| Area | Status | Notes |
|------|--------|-------|
| Chart engine (V1) | **Done** | Custom Canvas 2D; pan/zoom/pinch, 5 chart types, crosshair sync |
| Indicators | **Done** | 15 implemented (MA, EMA, BOLL, MACD, RSI, VOL, VWAP, ATR, KDJ, CCI, OBV, DMI, WR, ROC, Supertrend); 15 catalog entries disabled |
| Drawings | **Done** | 14 tools (incl. ruler + measure utilities), typed styles, undo/redo, multi-pane routing |
| Context menus | **Done** | Blank + drawing + price-axis menus; ⌥R reset, crosshair lock toggle, bulk remove — see [context-menu-reference.md](./context-menu-reference.md) |
| Layout persistence | **Done** | localStorage + optional Postgres workspace sync |
| AI tool registry | **Done** | Shared registry; HTTP + MCP + in-app adapters |
| Watchlists / templates | **Done** | localStorage + optional remote sync |
| Rich annotation metadata | **Done** | Phase A — thesis/invalidation/target kinds on drawings |
| Market data foundation | **Done** | Provider-neutral layer in `src/lib/marketData/`; Yahoo + SEC/FRED/FMP/Massive/TWS/IBKR adapters; registry-driven event system with chart pins |

## Harness Retention

`PROJECT-STATUS.md` is the **hot operational dashboard**, not the full ledger. Full history lives in [status-archive/](./status-archive/).

| Content | Hot retention | Archive when |
|---------|---------------|--------------|
| Current Verified State | 1 block only | Replace in place on task change; do **not** stack `## Previous Verified State` |
| Active Work | Active/Pending/Blocked + last ≤10 Passing | Older Passing rows → `status-archive/` |
| Task Contract | Incomplete / in-flight only | Complete → archive |
| Session Log | Last ~15 entries | Older entries → monthly archive file |

Prune when this file exceeds ~300 lines, on session exit after marking Passing, or weekly.

## Active Work

Use states: **Pending**, **Active**, **Blocked**, **Passing**, **Skipped**. Keep only one item **Active** at a time.
Use verification levels: **Focused** (targeted Vitest), **Build** (`npm run build`), **App-level** (dev server or browser/manual flow), **Full** (`npm run check`).

| Feature | Behavior | State | Completion evidence / latest result | Files |
|---------|----------|-------|-------------------------------------|-------|
| Execute-from-plan git commit closeout | After Passing with quoted evidence, one git commit for task changes; plan `Commit: yes\ | **Passing** | Instructions: npm run lint:instructions → Instruction architecture validation passed.; Delivered: execute-from-plan Commit once after Passing; checklist Git commit after Passing; plan Commit: yes|skip; session-exit + AGENTS; lint asserts. | .cursor/rules/execute-from-plan.mdc, docs/checklists/execute-from-plan-checklist.md, docs/checklists/session-exit-checklist.md, plan-harness-awareness.mdc, planning-router.md, AGENTS.md, scripts/validate-agent-instructions.mts |
| Trade management playbook — Phase 0 | Frozen Zod contracts + 5 presets + pure planners + conflict policy; Plan/Protect/Manage boundaries; no UI attach or server manager | **Passing** | Focused: Test Files 4 passed (4), Tests 27 passed (27); Architecture review: self-review Passed; App-level: N/A (contracts only) | src/lib/trading/playbook/, trading/ARCHITECTURE.md, trade-management-playbook-roadmap.md |
| Trade management playbook — Phase 1 | Trade ticket Manage with… + PlaybookInstance persist on bracket submit; open-risk/Account status + Detach; no auto-mutate manager | **Passing** | Focused: Test Files 8 passed (8), Tests 39 passed (39) + service playbook 2 passed (2); Build: compile OK; Architecture review: self-review Passed; App-level: deferred | playbookInstanceStore.ts, TradeOrderForm.tsx, OpenRiskPositionsMenu.tsx, AccountPanel.tsx, /api/trading/playbooks |
| Trade management playbook — Phase 2 | Paper manager cron BE + scale-out via TradingService; instance patch; Pause/Resume/Skip + Detach chrome | **Passing** | Focused: Test Files 11 passed (11), Tests 49 passed (49) + service pause/resume/skip 1 passed (1); Build: ✓ Compiled successfully in 9.1s; Architecture review: self-review Passed; App-level: paper BE/scale deferred | playbook/runPlaybookEvaluation.ts, migration 0030, /api/cron/playbook-evaluate, playbooks pause/resume/skip routes, OpenRiskPositionsMenu.tsx, AccountPanel.tsx |
| Trade management playbook — Phase 3 | Trail attachTrail + auto-manage prefs/live gates + next-rule distance/Flatten + manual-stop pause | **Passing** | Trade management playbook — Phase 3 verification (2026-07-24); Focused: npm test -- --run src/lib/trading/playbook src/lib/trading/playbookAutoManageStore.test.ts src/lib/trading/tradingService.test.ts src/app/api/cron/playbook-evaluate src/app/api/trading/playbooks; Result: Test Files 14 passed (14), Tests 74 passed (74); Build: npm run build — compile OK; Architecture review: self-review Passed; App-level: paper trail after half-scale + live far-from-market manage deferred; Delivered:; - attachTrail cancel+TRAIL in executeThen.ts; - playbookAutoManageStore + migration 0031 + /api/trading/playbooks/auto-manage; - Live evaluator gates in runPlaybookEvaluation + TradingService.evaluatePlaybooks; - formatNextManageDistance + Flatten now in OpenRiskPositionsMenu + AccountPanel; - buildManualStopPausePatch wired in TradingService.modifyOrder | executeThen.ts, playbookAutoManageStore.ts, migration 0031, /api/trading/playbooks/auto-manage, runPlaybookEvaluation.ts, OpenRiskPositionsMenu.tsx, AccountPanel.tsx, PlaybookAutoManageSettings.tsx |
| Trade management playbook — Phase 4 | OCO Manage attach + chart BE/scale price-axis markers + position stop-drag broker modify + pause | **Passing** | Trade management playbook — Phase 4 verification (2026-07-24); Focused: Test Files 16 passed (16), Tests 80 passed (80); Build: ✓ Compiled successfully in 8.7s (pre-existing BoardScreenerCardHost TS); Architecture review: self-review Passed; App-level: OCO+Manage + chart markers + stop-drag deferred | types.ts, tradingService.ts, ManagePlaybookPicker.tsx, ProtectiveOcoForm.tsx, manageLevels.ts, playbookStopSync.ts, ChartCell.tsx, chart-react price-axis extras |
| Trade management playbook — Phase 5 | User template library + journal Manage recipe/timeline + templateSnapshot on attach | **Passing** | Trade management playbook — Phase 5 verification (2026-07-24); Focused: npm test -- --run src/lib/trading/playbook src/lib/trading/playbookTemplateStore.test.ts src/lib/trading/tradingService.test.ts src/app/api/trading/playbooks src/lib/journal/rebuildTrades.test.ts src/app/components/journal/JournalTradeDetail.test.tsx; Result: Test Files 21 passed (21), Tests 103 passed (103); Build: npm run build — ✓ Compiled successfully; Architecture review: self-review Passed; App-level: save template → attach → fire → journal Manage section deferred; Delivered:; - templateSnapshot on PlaybookInstance + resolvePlaybookTemplateFromInstance; - playbookTemplateStore + migration 0033 + templates CRUD API; - ManagePlaybookPicker user template library (duplicate/rename/delete); - journal_trades.manage_playbook + syncManagePlaybookToJournal + rebuild preserve; - JournalTradeDetail Manage section with adherence + rule timeline | playbookTemplateStore.ts, resolveTemplate.ts, journalRecipe.ts, templates API, ManagePlaybookPicker.tsx, journalRepository.ts, JournalTradeDetail.tsx, migrations 0032–0034 |
| Trade management playbook — Phase 6 | Optional notify-only alert bundles at manage levels on attach; alertBundleId linkage + detach cleanup | **Passing** | Trade management playbook — Phase 6 verification (2026-07-24); Focused: npm test -- --run src/lib/trading/playbook src/lib/trading/tradingService.test.ts src/lib/trading/playbookInstanceStore.test.ts src/app/api/trading/playbooks src/lib/alerts/tradePlanAlerts.test.ts; Result: Test Files 21 passed (21), Tests 104 passed (104); Build: npm run build — ✓ Compiled successfully; Architecture review: self-review Passed; App-level: attach Manage + notify → notification at level (no order from alert cron) deferred; Delivered:; - manageNotifyAlerts.ts + buildManageNotifyAlertInputs; - PlaybookInstance.alertBundleId + migration 0036; - expireAlertsForBundleId (repo + alertClient); - TradingService attach/detach notify bundle wiring; - ManagePlaybookPicker notify toggle + TradeOrderForm/ProtectiveOcoForm payloads | manageNotifyAlerts.ts, migration 0036, tradingService.ts, ManagePlaybookPicker.tsx, TradeOrderForm.tsx, ProtectiveOcoForm.tsx, alertRepository.ts, alertClient.ts |
| Trade management playbook track | Post-fill Manage rules on Protect (BE / scale / trail runtime) | **Passing** | Track complete — Trade management playbook — Phase 5 **Passing**; Trade management playbook — Phase 5 verification (2026-07-24); Focused: npm test -- --run src/lib/trading/playbook src/lib/trading/playbookTemplateStore.test.ts src/lib/trading/tradingService.test.ts src/app/api/trading/playbooks src/lib/journal/rebuildTrades.test.ts src/app/components/journal/JournalTradeDetail.test.tsx; Result: Test Files 21 passed (21), Tests 103 passed (103); Build: npm run build — ✓ Compiled successfully; Architecture review: self-review Passed; App-level: save template → attach → fire → journal Manage section deferred; Delivered:; - templateSnapshot on PlaybookInstance + resolvePlaybookTemplateFromInstance; - playbookTemplateStore + migration 0033 + templates CRUD API; - ManagePlaybookPicker user template library (duplicate/rename/delete); - journal_trades.manage_playbook + syncManagePlaybookToJournal + rebuild preserve; - JournalTradeDetail Manage section with adherence + rule timeline | `docs/roadmaps/trade-management-playbook-roadmap.md` |
| App-level verification wave 2 — Phase 4 | Ops residuals walks 4.1–4.5 — Redis health flip, journal import/sync, MCP alerts, calm header | **Pending** | paused for Trade management Phase 6 WIP=1 | `docs/roadmaps/app-level-verification-wave-2-roadmap.md`, `docs/evidence/app-level-verification-wave-2-phase-4.txt` |
| App-level verification wave 2 — Phase 3 | Connections & provider preference walks 3.1–3.3 — Settings console, prefs → meta.source, displayName reload | **Passing** | App-level verification Wave 2 — Phase 3 (2026-07-24); URL: http://localhost:3003/workspace; App-level: 3.1 Settings Connections + Market data — app-settings-connections-section + app-settings-market-data-section; ib-live/ib-paper rows; provider table 7 rows; secretHits=0; App-level: 3.2 preference→meta.source — yahoo-first order [yahoo,tws,ibkr,massive]; cold POST OKTA meta.source=yahoo warnings=0; feed chip Fallback · YAHOO · streaming; App-level: 3.3 displayName — PATCH ib-paper→Wave2 Paper Gateway; reload settings input=Wave2 Paper Gateway; app-market-data-option-ib-paper=Wave2 Paper Gateway; chip=Wave2 Paper Gateway after select; 3.1 Settings Connections + Market data console; - app-settings-connections-section + app-settings-market-data-section visible from Application settings gear; - Connection rows: app-settings-connection-row-ib-live (Live trading · Disconnected); app-settings-connection-row-ib-paper (Paper trading · Disconnected); - Provider table 7 rows (tws Degraded sidecar_unreachable; massive Healthy; yahoo Degraded; fmp/fred/sec configured); - Copy: API keys stay in server environment; Trading still requires broker-backed quotes; - secretHits: [] (env var names only e.g. MASSIVE_API_KEY — no secret values); 3.2 Preference → meta.source; - Default localStorage edge:marketData:providerPreference:v1 orderedProviders [tws, ibkr, massive, yahoo]; - Moved Yahoo Finance up ×3 → [yahoo, tws, ibkr, massive] via app-settings-provider-preference-list; - Cold POST /api/candles symbol=OKTA providerPreference yahoo-first → meta.source=yahoo warnings=[] cacheTier=cold; - Chart feed chip: Fallback · YAHOO · streaming; 3.3 Connection displayName; - PATCH /api/me/connections/ib-paper displayName=Wave2 Paper Gateway (authenticated dev session); - Full reload → app-settings-connection-name-ib-paper value=Wave2 Paper Gateway; - Header app-market-data-option-ib-paper=Wave2 Paper Gateway; selecting paper → app-market-data-picker chip=Wave2 Paper Gateway | docs/roadmaps/app-level-verification-wave-2-roadmap.md, ConnectionsSettingsSection.tsx, MarketDataSettingsSection.tsx, MarketDataConnectionMenu.tsx, docs/evidence/app-level-verification-wave-2-phase-3.txt |
| App-level verification wave 2 — Phase 2 | Grok Copilot UX parity walks 2.1–2.4 — empty state, pill geometry, in-bar model menu, active thread chrome | **Passing** | App-level verification Wave 2 Phase 2 closeout 2026-07-24 on http://localhost:3003/copilot.; App-level: 2.1 empty state — copilot-empty-brand Edge logo hero + centered copilot-query-bar + 4 workflow chips; no copilot-panel-header; placeholder "What do you want to know?".; App-level: 2.2 pill geometry — query-bar 800×60px @1440 and @1024, minHeight 60px, bg rgb(20,20,20), circular submit 36×36; Submit→Stop during stream.; App-level: 2.3 in-bar model menu — 5 options, Grok 4.5 aria-checked=true; switch to openai/gpt-5.6-sol → chip GPT-5.6; 0 copilot-model-select header.; App-level: 2.4 active thread chrome — history rail 280px data-collapsed=true; copilot-thoughts open with 6 tool steps; Copy+Regenerate on message 3d96d50d-628c-4d0a-a4fe-77bd3510fb79.; Focused: Test Files 1 passed (1), Tests 8 passed (8) (validateOrder.test.ts after playbookAutoManageStore import fix). | docs/roadmaps/app-level-verification-wave-2-roadmap.md, docs/assets/grok-parity/, src/app/components/copilot/, src/lib/trading/playbookAutoManageStore.ts |
| App-level verification wave 2 — Phase 1 | Copilot agent functional walks 1.1–1.8 — stream, bridge, confirm, linkage (1.5 Skipped), persist, model, workflows | **Passing** | App-level verification Wave 2 Phase 1 closeout 2026-07-24 on http://localhost:3003/workspace.; 1.1 App-level: POST /api/ai/chat on :3003 streams NDJSON text-delta + done stop (OPENROUTER_API_KEY set).; 1.2 App-level: sidebar Copilot stream on /workspace — 1-word hello reply; thread 691e626f-d40d-467c-aa3b-bf2119905f32.; 1.3 App-level: get_chart_state tool chip ok → CSCO · 1d interval (call-1672b788-fcfd-4105-b836-0c2cacfa6975-0).; 1.4 App-level: prepare_chart_for_analysis Rejected; add_drawing ok Invalidation @ 245.51; 0 place_order toolSteps.; 1.5 Skipped: browser eval CSP blocks drawing toolbar Open in chat / Accept / Dismiss automation; metadata threadId d5e9ac81-52ca-4c44-8d7a-73008eead05d messageId 818b2cf2-cb37-4743-bdee-1aaa39cb20c2 on add_drawing.; 1.6 App-level: refresh restores thread d5e9ac81-52ca-4c44-8d7a-73008eead05d with 4 messages modelId openai/gpt-5.6-sol.; 1.7 App-level: model switch openai/gpt-5.6-sol; exact reply model-check-ok on message 3d96d50d-628c-4d0a-a4fe-77bd3510fb79.; 1.8 App-level: Mark invalidation chip — get_candles 252 bars APLD, get_quotes 27.19, add_drawing Invalidation @ 25.82 proposed. | docs/roadmaps/app-level-verification-wave-2-roadmap.md, src/app/api/ai/chat/route.ts, src/app/components/copilot/ |
| App-level verification wave 2 | Close post–Wave 1 deferred app-level walks (Copilot agent, Grok chrome, Connections prefs, Redis/journal/MCP/calm header) — no product features | **Pending** | Phase 0–3 **Passing** (2026-07-24); Phase 4 **Pending** | `docs/roadmaps/app-level-verification-wave-2-roadmap.md`, `docs/roadmaps/README.md`, `docs/ROADMAP.md` |
| Research UX — Phase 0 | Contracts & IA — density model, session/card/link Zod sketches, ownership map, entry policy stub; Desk permanence; no Board UI | **Passing** | **Focused:** Test Files 1 passed (1), Tests 9 passed (9); **Architecture review:** self-review **Passed**; **App-level:** N/A (contracts only) | `src/lib/research/`, `docs/roadmaps/research-ux-roadmap.md`, `persistence/ARCHITECTURE.md`, `ai/ARCHITECTURE.md`, `design-system/ARCHITECTURE.md` |
| Research UX — Phase 1 | Density switch Talk/Board/Desk in app chrome; Board stub at /research; Talk/Board lead home hub; Desk /workspace unchanged; root lastModule unchanged | **Passing** | Focused: Test Files 6 passed (6), Tests 33 passed (33); Architecture review: self-review Passed; App-level: /copilot Talk tab selected + density switcher visible; Desk click → /workspace with Workspace pill + Edit layout intact; /research Board tab selected + Open Talk/Open Desk stub CTAs | src/lib/research/densityNav.ts, DensitySwitcher.tsx, ResearchBoardStub.tsx, AppTopHeader.tsx, HomeHubCards.tsx, research-ux-roadmap.md |
| Research UX — Phase 2 | Copilot artifactHint + pinable artifact cards; Talk evidence rail (page); session-local evidence store; chart/screener/journal Open deep links; confirms unchanged | **Passing** | **Focused:** Test Files 17 passed (17), Tests 101 passed (101); **Architecture review:** self-review **Passed**; **App-level:** /copilot pin → rail → Open → unpin | `artifactHint.ts`, `evidenceStore.ts`, `CopilotArtifactCard.tsx`, `CopilotEvidenceRail.tsx`, `CopilotMessageList.tsx`, `CopilotPanel.tsx`, `research-ux-roadmap.md` |
| Research UX — Phase 4 | Live chart cards (focused + viewport mount); screener/journal hosts; Board↔Desk promote/demote; MAX_LIVE_BOARD_CHART_CARDS=1 | **Passing** | Research UX Phase 4 verification (2026-07-24); Focused: npm test -- --run src/lib/research src/app/components/research; Test Files  8 passed (8); Tests  42 passed (42); Build: npm run build — ✓ Compiled successfully; App-level (manual): 3+ chart cards focus one → peers inactive placeholder; Promote → /workspace symbol ingress + deskTileId on card; Send to board demote → /research; Density switcher Desk intact; Architecture review: self-review Passed | boardChartMountPolicy.ts, promote.ts, BoardChartCardHost.tsx, BoardScreenerCardHost.tsx, BoardJournalDraftCardHost.tsx, ChartTileBoardActions.tsx, researchUxPhase4.test.ts, research-ux-roadmap.md, research/ARCHITECTURE.md, chart/ARCHITECTURE.md |
| Research UX — Phase 6 | Research Session persistence — multi-session local doc + `/api/me/research-sessions` OCC; session list (new/rename/delete/switch); debounced cloud save; Open Talk via `threadIds[0]` | **Passing** | Research UX Phase 6 verification (2026-07-24); Focused: npm test -- --run src/lib/research src/lib/persistence/client/researchSessionsClient src/app/api/me/research-sessions src/app/components/research; Test Files 14 passed (14); Tests 57 passed (57); Build: npm run build — ✓ Compiled successfully; Architecture review: self-review Passed; App-level: board reload + cloud hydrate + Desk unchanged deferred | boardSessionStore.ts, researchSessionsClient.ts, researchSessionsRepository.ts, ResearchBoardSessionRail.tsx, useResearchBoardSession.ts, CopilotThreadUrlFocus.tsx, researchUxPhase6.test.ts, 0035_research_sessions.sql, research/ARCHITECTURE.md, persistence/ARCHITECTURE.md, research-ux-roadmap.md |
| Research UX — Phase 7 | Session reel — auto/manual beats, filmstrip UI, draft journal from reel | **Passing** | Research UX Phase 7 — Session reel (2026-07-24); Focused:; npm test -- --run src/lib/research src/app/components/research; Test Files  13 passed (13); Tests  62 passed (62); Build:; npm run build; ✓ Compiled successfully; Architecture review: self-review Passed; Delivered:; - reelBeats.ts — append/dedupe/reorder/prune pure helpers; - boardSessionStore reel mutators + auto-append on card add/import + prune on card delete; - BoardReelFilmstrip.tsx — horizontal filmstrip, checkpoint focused, draft journal; - reelJournalDraft.ts — compose journalDraft summary from ordered reel; - useResearchBoardSession + ResearchBoard wiring; App-level: reel scrub + draft journal walkthrough deferred | reelBeats.ts, reelJournalDraft.ts, boardSessionStore.ts, BoardReelFilmstrip.tsx, useResearchBoardSession.ts, ResearchBoard.tsx, researchUxPhase7.test.ts, research/ARCHITECTURE.md, research-ux-roadmap.md |
| Research UX — Phase 5 | AI board conductor — registry tools (get/add/link/focus/arrange/remove); ResearchBoardPort; boardFocusStore; confirm on arrange/remove; source ai provenance | **Passing** | Research UX Phase 5 verification (2026-07-24); Focused: npm test -- --run src/lib/ai/tools/research src/lib/research src/app/components/research; Test Files  10 passed (10); Tests  54 passed (54); Build: research.ts types pass; full build blocked by pre-existing ManagePlaybookPicker.tsx EdgeButton density prop; Architecture review: self-review Passed | boardFocusStore.ts, researchBoardPort.ts, research.ts, research.test.ts, researchUxPhase5.test.ts, AiToolsProvider.tsx, BoardCanvas.tsx, context.ts, research-ux-roadmap.md, research/ARCHITECTURE.md, ai-tools-architecture.md |
| Research UX — Phase 3 | Spatial Board at /research — pan/zoom canvas, card nodes, directed links, evidence Send to board, local session store; Desk bridge via openResearchCard | **Passing** | Research UX Phase 3 — Board v1 (manual); Focused:; Test Files  5 passed (5); Tests  13 passed (13); Build:; ✓ Compiled successfully; App-level (manual):; /copilot pin artifact → Send to board → /research shows card node; Shift+click two cards → directed link rendered; Reload /research → cards + links restored from tv-ai:research-sessions:v1; Density switcher Desk → /workspace intact; Architecture review: self-review Passed (session vs evidence vs Desk boundaries; no AI board tools) | boardSessionStore.ts, ResearchBoard.tsx, BoardCanvas.tsx, BoardCardNode.tsx, BoardLinksLayer.tsx, BoardEmptyState.tsx, useResearchBoardSession.ts, CopilotEvidenceRail.tsx, CopilotArtifactCard.tsx, researchUxPhase3.test.ts, research-ux-roadmap.md, research/ARCHITECTURE.md |
| Research UX (AI-first desk) track | Talk / Board / Desk densities; Research Session + Board; pinable Copilot artifacts; tiled Desk kept forever | **Passing** | Track complete — Research UX — Phase 7 **Passing**; Research UX Phase 7 — Session reel (2026-07-24); Focused:; npm test -- --run src/lib/research src/app/components/research; Test Files  13 passed (13); Tests  62 passed (62); Build:; npm run build; ✓ Compiled successfully; Architecture review: self-review Passed; Delivered:; - reelBeats.ts — append/dedupe/reorder/prune pure helpers; - boardSessionStore reel mutators + auto-append on card add/import + prune on card delete; - BoardReelFilmstrip.tsx — horizontal filmstrip, checkpoint focused, draft journal; - reelJournalDraft.ts — compose journalDraft summary from ordered reel; - useResearchBoardSession + ResearchBoard wiring; App-level: reel scrub + draft journal walkthrough deferred | `docs/roadmaps/research-ux-roadmap.md`, `docs/ROADMAP.md`, `docs/roadmaps/README.md` |
| Shared cache topology — Phase 4 | Redis ops profile — compose maxmemory + noeviction + ephemeral; AUTH/rediss deploy docs; manual parity (no CI); operator staging soak / prod flip gate | **Passing** | Shared cache topology — Phase 4 verification (2026-07-24); Redis ops profile (docker compose):; maxmemory: 268435456; maxmemory-policy: noeviction; appendonly: no; save: (empty — persistence disabled); Focused:; REDIS_URL=redis://localhost:6379 EDGE_TEST_REDIS=1 npm test -- --run src/lib/marketData/cache/cacheParity.test.ts src/lib/marketData/cache/redisKeys.test.ts; Test Files  2 passed (2); Tests  18 passed (18); App-level:; Parity suite redis is reachable: true (live Redis ping against compose instance); HTTP health flip deferred — running dev server on :3003 lacks redis backend env; operator staging soak → prod flip is next gate; Architecture review: self-review Passed | docker-compose.yml, marketData/ARCHITECTURE.md, .env.example, shared-cache-topology-roadmap.md |
| Shared cache topology — Phase 3 | Key namespace + env isolation — `edge:{env}:{schemaVersion}:md:…`; `EDGE_CACHE_ENV`; schema bump docs | **Passing** | Focused: Test Files 3 passed (3), Tests 16 passed (16); Architecture review: self-review Passed; App-level: N/A (key-root unit tests prove env isolation) | redisKeys.ts, redisHotStore.ts, redisDataCache.ts, redisKeys.test.ts, ARCHITECTURE.md, .env.example, shared-cache-topology-roadmap.md |
| Shared cache topology — Phase 2 | Health backend observability — /api/market-data/health cache kind/degraded/lastPing; redaction; fail-open ping | **Passing** | Focused: Test Files 2 passed (2), Tests 11 passed (11); Architecture review: self-review Passed; App-level: N/A (health fields only; manual redis:up flip deferred) | serverCacheHealth.ts, health.ts, route.ts, cache/health tests, ARCHITECTURE.md, shared-cache-topology-roadmap.md |
| Shared cache topology — Phase 1 | Fail-loud + boot-order fix — require-on throws; ephemeral sync fallback; offline queue off; post-boot degraded fail-open | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 8 passed (8)`; **Build:** exit 0; **Architecture review:** self-review **Passed**; **App-level:** N/A | `serverCacheBackends.ts`, `serverCacheDegraded.ts`, `cacheBackendTypes.ts`, `redisClient.ts`, `redisHotStore.ts`, `redisDataCache.ts`, cache tests, `ARCHITECTURE.md`, `.env.example` |
| Shared cache topology — Phase 0 | Topology gate + env contract — prod N=1; env matrix + `EDGE_REQUIRE_REDIS` semantics; Phase 5 Skipped at N=1; docs only | **Passing** | **Instructions:** `npm run lint:instructions` → `Instruction architecture validation passed.`; **Architecture review:** self-review **Passed**; **App-level:** N/A | `.env.example`, `marketData/ARCHITECTURE.md`, `AGENTS.md`, `shared-cache-topology-roadmap.md`, `data-serving-efficiency-roadmap.md`, `ROADMAP.md`, `roadmaps/README.md` |
| Shared cache topology track | Redis-required staging/prod fail-loud; boot-order fix; key isolation; ops flip; conditional multi-instance coordination | **Passing** | Track complete — Shared cache topology — Phase 4 **Passing**; Shared cache topology — Phase 4 verification (2026-07-24); Redis ops profile (docker compose):; maxmemory: 268435456; maxmemory-policy: noeviction; appendonly: no; save: (empty — persistence disabled); Focused:; REDIS_URL=redis://localhost:6379 EDGE_TEST_REDIS=1 npm test -- --run src/lib/marketData/cache/cacheParity.test.ts src/lib/marketData/cache/redisKeys.test.ts; Test Files  2 passed (2); Tests  18 passed (18); App-level:; Parity suite redis is reachable: true (live Redis ping against compose instance); HTTP health flip deferred — running dev server on :3003 lacks redis backend env; operator staging soak → prod flip is next gate; Architecture review: self-review Passed | `docs/roadmaps/shared-cache-topology-roadmap.md` |
| Plan → execute token efficiency — Phase 6 | Harness closeout helper — deterministic npm run harness:closeout CLI; evidence-gated Active Work → Passing; focused tests + execute doc pointers | **Passing** | **Focused:** Test Files 1 passed (1), Tests 13 passed (13); **Instructions:** `npm run lint:instructions` → `Instruction architecture validation passed.`; **Architecture review:** self-review **Passed** | `scripts/harness-closeout.mts`, `scripts/harness-closeout.test.ts`, `package.json`, `docs/checklists/execute-from-plan-checklist.md`, `.cursor/rules/execute-from-plan.mdc`, `AGENTS.md`, `docs/roadmaps/plan-execute-token-efficiency-roadmap.md` |
| Plan → execute token efficiency — Phase 5 | Fresh-chat execute process — `/handoff` + `.plan.md` when plan research heavy; checklist + rule + AGENTS one-liner; lint asserts | **Passing** | **Instructions:** `npm run lint:instructions` → `Instruction architecture validation passed.` | `docs/checklists/execute-from-plan-checklist.md`, `execute-from-plan.mdc`, `AGENTS.md`, `validate-agent-instructions.mts`, `plan-execute-token-efficiency-roadmap.md` |
| Plan → execute token efficiency — Phase 4 | Scope plan-rule injection — always-apply routing stub; plan-harness demoted; status split deferred | **Passing** | **Instructions:** `npm run lint:instructions` → `Instruction architecture validation passed.`; **Architecture review:** self-review **Passed** | `.cursor/rules/plan-execute-routing.mdc`, `plan-harness-awareness.mdc`, `execute-from-plan.mdc`, `validate-agent-instructions.mts`, `AGENTS.md`, `plan-execute-token-efficiency-roadmap.md` |
| Plan → execute token efficiency — Phase 3 | Hot harness read windows — slice-read PROJECT-STATUS (Plan vs Execute); ≤2 status reads on implement; lint asserts | **Passing** | **Instructions:** `npm run lint:instructions` → `Instruction architecture validation passed.` | `docs/checklists/harness-status-checklist.md`, `plan-harness-awareness.mdc`, `execute-from-plan.mdc`, `execute-from-plan-checklist.md`, `planning-router.md`, `AGENTS.md`, `validate-agent-instructions.mts`, `plan-execute-token-efficiency-roadmap.md` |
| Plan → execute token efficiency — Phase 2 | Explore subagents opt-in — default off when roadmap/plan lists files; allow when blocked/discover; cap 1 explore | **Passing** | **Instructions:** `npm run lint:instructions` → `Instruction architecture validation passed.` | `.cursor/rules/execute-from-plan.mdc`, `docs/checklists/execute-from-plan-checklist.md`, `plan-harness-awareness.mdc`, `validate-agent-instructions.mts`, `plan-execute-token-efficiency-roadmap.md` |
| Memory efficiency — Phase 14 | App-level verification closeout — deferred walks Phases 1–11 + 13; upgraded `perf:memory` + Phase 14 walk scenarios | **Passing** | **App-level:** `npm run perf:memory` → node `candlesLength:4419` `withinSoftMax:true`; server `withinDataCacheCap:true` `withinHotStoreCap:true` `rssDeltaMb:57.48`; B1 `maxCandlesLength:3960` `pass:true`; B2 `inactiveChartSurfaces:7` `mountedEngines:1` `activeCellSwitch.pass:true`; B3 `heapDeltaMb:0`; walks `allPass:true` (journal `skippedNoAuth`, trades `skippedLargeFixture`); **Architecture review:** self-review **Passed** | `scripts/run-memory-baseline.mts`, `docs/perf/memory-baseline-latest.json`, `memory-efficiency-roadmap.md` |
| Calm connection status UX | Header: calm broker incident + user Reconnect; chart: feed chip + Data Health dot only; panel/settings: ops recover labels; no API/env text in header | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 40 passed (40)`; **Architecture review:** self-review **Passed**; **App-level:** live sidecar fault walkthrough deferred | `healthProjection.ts`, `ChartOverlayDataHealthRow.tsx`, `AppTopHeader.tsx`, `AppHeaderConnectionIncident.tsx`, `AppProviders.tsx`, `AccountPanel.tsx`, tests, `marketData/ARCHITECTURE.md`, `app-ux-polish-roadmap.md` |
| Plan → execute token efficiency track | Cut plan/implement agent tokens without weakening DoD, WIP=1, Arch, or quoted evidence | **Passing** | Phase 0–6 **Passing** (compact plan + execute-from-plan + explore opt-in + hot harness read windows + plan-rule injection + fresh-chat execute + harness closeout helper); **Focused:** Test Files 1 passed (1), Tests 13 passed (13); **Instructions:** `npm run lint:instructions` → `Instruction architecture validation passed.` | `docs/roadmaps/plan-execute-token-efficiency-roadmap.md`, `scripts/harness-closeout.mts` |
| Execute-from-plan protocol | Implement approved plans skip planning ceremony; execute rule + checklist + lint wiring | **Passing** | **Instructions:** npm run lint:instructions passed; dry-run: post-approve implement forbids planning-router / intent checklist reads | `.cursor/rules/execute-from-plan.mdc`, `docs/checklists/execute-from-plan-checklist.md`, `plan-harness-awareness.mdc`, `planning-router.md`, `AGENTS.md`, `validate-agent-instructions.mts` |
| Compact plan template | Plan mode emits compact sections (deltas-only Checklist Review; no Aligned essays); checklist walk + DoD unchanged | **Passing** | **Instructions:** npm run lint:instructions passed | `.cursor/rules/plan-harness-awareness.mdc`, `docs/checklists/planning-router.md`, `docs/checklists/architecture-review-checklist.md` |
| Security hardening — Phase 6 | Cookie iat/jti + 14d TTL (M5); prompt isolation + orchestrator budget (M6) | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 31 passed (31)`; **Architecture review:** self-review **Passed** | `signedCookieCore.ts`, `promptBoundaries.ts`, `orchestrate.ts`, auth tests, `contracts.test.ts`, CONSTRAINTS, architecture docs, `security-hardening-roadmap.md` |
| Security hardening — Phase 5 | Enforced CSP + prod HSTS (M3); IBKR TLS default on + non-loopback sidecar secret (M4) | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 13 passed (13)`; **Build:** compile OK; TS blocked by pre-existing reconnect route; **App-level:** CSP on `/`; **Architecture review:** self-review **Passed** | `httpHeaders.mjs`, `next.config.mjs`, `sidecarAuth.ts`, `ibkr/client.ts`, `brokerage/stream/route.ts`, tests, `.env.example`, CONSTRAINTS, `marketData/ARCHITECTURE.md`, `security-hardening-roadmap.md` |
| Security hardening — Phase 4 | Tenant FK ownership (M1); notification href allowlist (M2) | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 14 passed (14)`; **Architecture review:** self-review **Passed** | `safeHref.ts`, research/journal/alert repos, notification schema, `NotificationBellMenu.tsx`, `EdgeToastViewport.tsx`, `SymbolDetailsPanel.tsx`, tests, CONSTRAINTS, `persistence/ARCHITECTURE.md`, `security-hardening-roadmap.md` |
| Security hardening — Phase 3 | Bridge secret ownership (H2); trading mutate session/service gate (H6) | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 43 passed (43)`; **Architecture review:** self-review **Passed** | `sessionBridgeStore.ts`, `bridgeAuth.ts`, session routes, `AiSessionBridge.tsx`, `tradingMutateAuth.ts`, mutate trading routes, tests, CONSTRAINTS, architecture docs, `security-hardening-roadmap.md` |
| Connections & providers — Phase 4 | Durable user-scoped Connection records; `/api/me/connections`; AuthKind; Settings + header bind to same list; ensure-seed ib-paper/live | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 31 passed (31)`; **Architecture review:** self-review **Passed**; **App-level:** displayName reload walkthrough deferred | `connections/`, `0027_connections.sql`, `connectionsRepository.ts`, `/api/me/connections/*`, `ConnectionsSettingsSection.tsx`, `MarketDataConnectionMenu.tsx`, architecture docs, `connections-providers-roadmap.md` |
| Memory efficiency — Phase 13 | Script worker transferable `f64x6` candle bus — `packCandlesToTransferBuffer` + `postMessage` transfer list; `resolveWorkerCandles` unpack; `Candle[]` structured-clone fallback; no SAB/COOP/COEP | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 17 passed (17)`; **Build:** chart-core + indicator-runtime + chart-react exit 0; **Architecture review:** self-review **Passed**; **App-level:** 5 min live heap delta deferred (Phase 14) | `candleTransferBuffer.ts`, `scriptRuntimeWorkerClient.ts`, `runtimeWorker.ts`, tests, `indicator-runtime/ARCHITECTURE.md`, `chart/ARCHITECTURE.md`, `marketData/ARCHITECTURE.md`, `memory-efficiency-roadmap.md` |
| Memory efficiency — Phase 11 | Inactive cell engine unmount — `mountChartEngine = isActive \|\| liveProp === true`; `InactiveChartSurface`; flush viewport/drawings before teardown; remount from layout + cache; fork `live` override | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 11 passed (11)`; **Architecture review:** self-review **Passed**; **App-level:** 8-cell heap/subscription walkthrough deferred (Phase 14) | `ChartCell.tsx`, `InactiveChartSurface.tsx`, `useViewportPersistSync.ts`, `useDrawingLayoutSync.ts`, tests, `chart/ARCHITECTURE.md`, `chartDataFeed/ARCHITECTURE.md`, `memory-efficiency-roadmap.md` |
| Memory efficiency — Phase 10 | Journal trades list virtualization — `@tanstack/react-virtual`; full sorted list; page pagination removed; table scroll region | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 35 passed (35)`; **Architecture review:** self-review **Passed**; **App-level:** large-fixture Trades-tab scroll walkthrough deferred (Phase 14) | `JournalTradesTable.tsx`, `JournalTradesView.tsx`, `JournalTradesTableControls.tsx`, `journalTradesTableControls.ts`, tests, `journal/ARCHITECTURE.md`, `memory-efficiency-roadmap.md`, `package.json` |
| Memory efficiency — Phase 9 | Chart hot-path slimming — lazy journal overlay on `journalTrade` URL; `ScriptLibraryMountGate` defers library until scripts tile / script indicators / picker entry | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 24 passed (24)`; **Build:** `npm run build:packages` exit 0; **Architecture review:** self-review **Passed**; **App-level:** chart-only lazy-chunk walkthrough deferred (Phase 14) | `ChartTileHost.tsx`, `journalChartOverlayContext.ts`, `useChartDeepLinkBootstrap.ts`, `JournalChartOverlayProvider.tsx`, `ScriptLibraryMountGate.tsx`, `layoutHasScriptIndicators.ts`, `AppWorkspaceShell.tsx`, `StockApp.tsx`, `ChartCell.tsx`, `IndicatorPicker.tsx`, tests, architecture docs, `memory-efficiency-roadmap.md` |
| Memory efficiency — Phase 8 | Lazy SurfaceHost tiles + sidebar panels; HA fingerprint LRU cache; notification toast/seenIds caps; ephemeral clear includes HA; track complete | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 32 passed (32)`; **Build:** `npm run build:packages` exit 0; **Architecture review:** self-review **Passed**; **App-level:** chart-only lazy-chunk walkthrough deferred | `SurfaceHost.tsx`, `TileLoadingShell.tsx`, `sidebar/registry.tsx`, `FloatingPanelHost.tsx`, `heikinAshiCache.ts`, `notificationCaps.ts`, `clearEphemeralMarketDataCaches.ts`, architecture docs, `memory-efficiency-roadmap.md` |
| Memory efficiency — Phase 7 | Journal provider trade window (500) + fill-account index; Copilot send last 40 msgs / 4k content; full thread persist unchanged | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 29 passed (29)`; **Architecture review:** self-review **Passed**; **App-level:** journal large-fixture + long-thread walkthrough deferred | `JournalTradesProvider.tsx`, `journalProviderLoad.ts`, `selectChatRequestMessages.ts`, `useCopilotThread.ts`, tests, `journal/ARCHITECTURE.md`, `ai/ARCHITECTURE.md`, `memory-efficiency-roadmap.md` |
| Grok Copilot UX parity — Phase 4 | History rail (page/tile); Thoughts disclosure; message typography/actions; Copy + Regenerate last turn | **Passing** | **Focused:** `Test Files 13 passed (13)`, `Tests 73 passed (73)`; **Architecture review:** self-review **Passed**; **App-level:** rail/Thoughts/regenerate walkthrough deferred | `CopilotShell.tsx`, `CopilotHistoryRail.tsx`, `CopilotMessageList.tsx`, `CopilotPanel.tsx`, `useCopilotThread.ts`, tests, `globals.css`, `grok-copilot-parity-roadmap.md`, architecture docs |
| Grok Copilot UX parity — Phase 3 | In-bar model chip + dropdown (`EdgeAnchoredPopover`); enabled models + checkmark; `setModelId` wired; header `EdgeSelect` removed; settings modal unchanged | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 26 passed (26)`; **Architecture review:** self-review **Passed**; **App-level:** menu geometry walkthrough deferred | `CopilotComposer.tsx`, `CopilotPanel.tsx`, `modelMenuSubtitle.ts`, tests, `globals.css`, `grok-copilot-parity-roadmap.md`, architecture docs |
| Grok Copilot UX parity — Phase 2 | Pill `query-bar` composer (+ attach stub, model chip stub, circular ↑/stop); Enter/Shift+Enter; wide-host docked centering; header model select retained until Phase 3 | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 27 passed (27)`; **Architecture review:** self-review **Passed**; **App-level:** pill geometry walkthrough deferred | `CopilotComposer.tsx`, `CopilotShell.tsx`, `CopilotPanel.tsx`, `CopilotComposer.test.tsx`, `globals.css`, `grok-copilot-parity-roadmap.md` |
| Connections & providers — Phase 2 | Persist display provider order/disable; MarketDataService waterfalls honor prefs; Settings reorder/disable; trading trust ignores broker disable | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 103 passed (103)`; **Architecture review:** self-review **Passed**; **App-level:** settings preference walkthrough deferred | `dataProviderPreference.ts`, `providerWaterfall.ts`, `marketDataService.ts`, `MarketDataSettingsSection.tsx`, schemas, `apiChartDataFeed.ts`, architecture docs, `connections-providers-roadmap.md` |
| Connections & providers — Phase 1 | Settings Connections console (IB paper/live status, data pref, aliases, reconnect) + read-only Market data provider table; no secrets | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 19 passed (19)`; **Architecture review:** self-review **Passed**; **App-level:** settings walkthrough deferred | `AppSettingsShell.tsx`, `ConnectionsSettingsSection.tsx`, `MarketDataSettingsSection.tsx`, `useSettingsMarketDataHealth.ts`, `connections/ARCHITECTURE.md`, `connections-providers-roadmap.md` |
| Security hardening — Phase 2 | Upgrade Next ≥16.2.11; clear middleware-bypass advisory (H5); triage residual prod audit Highs | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 11 passed (11)`; **Build:** `npm run build` exit 0; `✓ Compiled successfully in 7.9s`; `npm ls next` → `next@16.2.11`; **Audit:** 11 prod vulns (4 high), Next H5 cleared; **Architecture review:** self-review **Passed** | `package.json`, `package-lock.json`, middleware/apiAuth tests, TS build fixes, `security-hardening-roadmap.md` |
| Security hardening — Phase 1 | Open-dev bootstrap gate; local-errors production 404 + localhost/API-key gate; cron secret or session only (audit H1, H3, H4) | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 37 passed (37)`; **Architecture review:** self-review **Passed** | `devSession.ts`, `routeHelpers.ts`, `localErrorsAccess.ts`, `cronAuth.ts`, `local-errors/route.ts`, `api/cron/*/route.ts`, `.env.example`, `docs/CONSTRAINTS.md`, `security-hardening-roadmap.md` |
| Security hardening — Phase 0 | Fail-closed API auth, proxy-safe localhost, server confirmation tokens, pattern ID root jail (audit C1–C4) | **Passing** | **Focused:** `Test Files 14 passed (14)`, `Tests 64 passed (64)`; **Build:** `npm run build:packages` exit 0; `✓ Compiled successfully in 8.4s`; **Architecture review:** self-review **Passed** | `apiAuth.ts`, `clientIp.ts`, `confirmationToken.ts`, AI execute routes, `patternLibrary/`, `.env.example`, `docs/CONSTRAINTS.md`, `security-hardening-roadmap.md` |
| Security hardening track | Close High/Medium audit findings in Phases 1–6 after Critical perimeter | **Passing** | **Focused:** Tests 31 passed (31) (Phase 6 closeout); Phases 0–6 **Passing**; track complete | `docs/roadmaps/security-hardening-roadmap.md`, `docs/roadmaps/README.md`, `docs/ROADMAP.md` |
| Grok Copilot UX parity — Phase 1 | Shared `CopilotShell` + Grok empty hero (brand, centered composer, chips below); host variants sidebar/page/tile; no dense header on empty | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 21 passed (21)`; **Architecture review:** self-review **Passed**; **App-level:** empty-state visual walkthrough deferred | `CopilotShell.tsx`, `CopilotEmptyBrand.tsx`, `CopilotPromptLibrary.tsx`, `CopilotPanel.tsx`, `CopilotModuleShell.tsx`, `globals.css`, `grok-copilot-parity-roadmap.md` |
| Grok Copilot UX parity — Phase 0 | Signed-in grok.com captures + freeze Copilot visual/mode contract (docs/assets only); no product UI change | **Passing** | **App-level:** 6 assets in `docs/assets/grok-parity/` (+3 live 1440 captures); query-bar `800×60` `rgb(20,20,20)`; menu `278×282` `rgb(54,54,54)`; § G–J + Visual contract frozen; auth pixel captures deferred; **Architecture review:** self-review **Passed** | `docs/roadmaps/grok-copilot-parity-roadmap.md`, `docs/assets/grok-parity/`, `src/lib/design-system/ARCHITECTURE.md` |
| Grok Copilot UX parity track | Edge Copilot shell/composer match grok.com; in-bar model dropdown (no modes); keep registry agent + confirms | **Passing** | **Focused:** `Test Files 13 passed (13)`, `Tests 73 passed (73)` (Phase 4 closeout); Phase 0–5 **Passing**; light theme + authenticated grok.com attach pixels deferred | `docs/roadmaps/grok-copilot-parity-roadmap.md` |
| Connections & providers — Phase 0 | Freeze Connection / preference contracts + Settings IA; no behavior change; path to multi-user connect | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 9 passed (9)`; **Architecture review:** self-review **Passed** | `src/lib/connections/`, `docs/roadmaps/connections-providers-roadmap.md`, `marketData/ARCHITECTURE.md`, `trading/ARCHITECTURE.md` |
| Open-positions header chip UX (A) | Flat status chip (no Risk label); tone dot + green/red from unrealized; popover unchanged | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 23 passed (23)`; **Architecture review:** self-review **Passed** | `OpenRiskPositionsMenu.tsx`, `OpenRiskPositionsMenu.test.tsx`, `trading/ARCHITECTURE.md` |
| Memory efficiency — Phase 6 | Crosshair-only series OffscreenCanvas blit; viewport pans rebuild with recycled Float32 geometry; background blits on pan; caches + scheduler dispose on unmount | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 33 passed (33)`; **Build:** `npm run build:packages` exit 0; **Architecture review:** self-review **Passed** | `layerCache.ts`, `renderScheduler.ts`, `paneRenderer.ts`, `layers.ts`, `useCanvasRenderer.ts`, `geometryBufferPool.ts`, WebGL geometry/renderers, tests, `chart/ARCHITECTURE.md`, `marketData/ARCHITECTURE.md`, `memory-efficiency-roadmap.md` |
| Memory efficiency — Phase 5 | Tip-stable builtin/script cache slots; dispose clears maps; prune lastValid on instance remove; soft byte eviction (16 MiB) | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 30 passed (30)`; **Build:** `npm run build:packages` exit 0; **Architecture review:** self-review **Passed** | `indicatorCompute.ts`, `indicatorResultProvider.ts`, `scriptResultCoordinator.ts`, tests, `marketData/ARCHITECTURE.md`, `chart/ARCHITECTURE.md`, `memory-efficiency-roadmap.md` |
| Memory efficiency — Phase 4 | Server `DataCache` max 256/ns + soft bytes; `HotStore` max 128; shared-ref reads; universe prune + COW merge; IBKR contractCache max 512 | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 25 passed (25)`; **Node warm:** `npm run perf:memory` → `dataCacheCandlesNamespaceEntries: 50` `hotStoreEntries: 60` `withinDataCacheCap: true` `withinHotStoreCap: true` `rssDeltaMb: 53.48`; **Architecture review:** self-review **Passed** | `dataCache.ts`, `hotStore.ts`, `cacheBudgets.ts`, `immutableSnapshot.ts`, `cacheEviction.ts`, `universeDailyStore.ts`, `contractCache.ts`, tests, `marketData/ARCHITECTURE.md`, `memory-efficiency-roadmap.md` |
| Memory efficiency — Phase 3 | Shared immutable `Candle[]` in `chartClientCache`; no deep clone on R/W; sessionStorage skip when >2k bars or ≳2 MB | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 35 passed (35)`; **Architecture review:** self-review **Passed** | `chartClientCache.ts`, `chartClientCache.test.ts`, `clientTtlCache.ts`, `chartDataFeed/ARCHITECTURE.md`, `marketData/ARCHITECTURE.md`, `memory-efficiency-roadmap.md` |
| Memory efficiency — Phase 2 | Inactive / non-primary cells `live: false`; active primary cell streams; snapshot preserved; journal fork `live` override | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 25 passed (25)`; **Architecture review:** self-review **Passed**; **App-level:** 8-cell subscription walkthrough deferred | `EdgeChart.tsx`, `ChartCell.tsx`, `ChartGrid.tsx`, `StockApp.tsx`, `TradeChartForkModal.tsx`, live-policy tests, `memory-efficiency-roadmap.md` |
| Memory efficiency — Phase 1 | Resident bar budget (`RESIDENT_BAR_SOFT_MAX` 5_000) after merge/prefetch/go-to; cache writes bounded; logout clears `chartClientCache` | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 101 passed (101)`; **Build:** `npm run build:packages` exit 0; **Architecture review:** self-review **Passed** | `series.ts`, `viewport.ts`, `useCandleSession.ts`, `useChartDataFeed.ts`, `chartClientCache.ts`, `clearEphemeralMarketDataCaches.ts`, tests, `memory-efficiency-roadmap.md` |
| Memory efficiency — Phase 0 | Baseline heap/subscription/RSS + retention/clone/dispose contract; frozen knobs; no behavior change | **Passing** | **App-level:** `npm run perf:memory` → node `candlesLength: 4343` `sessionStorageBytes: 388670`; server `rssDeltaMb: 60.14`; browser 1-cell `maxCandlesLength: 7938` `eventSourceCount: 6`; 8-cell `eventSourceCount: 6`; **Architecture review:** self-review **Passed** | `docs/perf/memory-baseline-latest.json`, `scripts/run-memory-baseline.mts`, `marketData/ARCHITECTURE.md`, `chartDataFeed/ARCHITECTURE.md`, `chart/ARCHITECTURE.md`, `memory-efficiency-roadmap.md` |
| Journal chrome single-row (A) | One header: Journal title → Dashboard/Trades/Open tabs → period/symbol/filters → sync/import/settings; cog toggles settings; title → dashboard | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 16 passed (16)`; **Architecture review:** self-review **Passed** | `JournalModuleHeader.tsx`, `JournalTileChrome.tsx`, `Journal{Dashboard,Trades,Settings}View.tsx`, `JournalTileSurface.tsx`, tests, `journal/ARCHITECTURE.md` |
| TWS sidecar architecture refactor | Split monolithic `main.py` into `tws_sidecar/` package; thin facade + test re-exports; cache-first SSE; per-connection handlers; orphan job abandon | **Passing** | **Focused:** 55 tests passed (`Ran 55 tests in 0.111s` **`OK`**); **Organization:** `main.py` 90 lines; max module 378 lines; **Architecture review:** self-review **Passed** | `services/tws-sidecar/main.py`, `services/tws-sidecar/tws_sidecar/`, `docs/roadmaps/tws-sidecar-refactor-roadmap.md`, `marketData/ARCHITECTURE.md`, `trading/ARCHITECTURE.md` |
| Copilot model settings UX polish | Settings modal: active chips strip, Popular/Recent/Enabled tabs, search, richer provider rows, single scroll; picker updates without restart | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)`; **Architecture review:** self-review **Passed**; **App-level:** chips/tabs/search walkthrough deferred | `CopilotModelSettingsModal.tsx`, `CopilotModelSettingsModal.test.tsx`, `ARCHITECTURE.md` |
| Open-risk header chrome | Ambient live-IB positions chip + popover (Close + chart load) + Account/Journal deep links; rail badge; palette **Open positions**; chip UX superseded by flat status A row | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 29 passed (29)`; **Architecture review:** self-review **Passed**; **App-level:** chip/popover/Account/Journal walkthrough deferred | `OpenRiskPositionsMenu.tsx`, `OpenRiskWorkspaceBridge.tsx`, `AppChromeActionsProvider.tsx`, `AppTopHeader.tsx`, `SidebarRail.tsx`, `openRiskSummary.ts`, `pendingWorkspaceActions.ts`, `OpenRiskShortcutRegistration.tsx`, tests, `trading/ARCHITECTURE.md`, `trading-execution-roadmap.md` |
| Copilot model settings | Settings cog opens modal; OpenRouter popular/recent tool-capable models; seed defaults pre-checked; enable/disable updates picker immediately (no restart) | **Passing** | **Focused:** `Test Files 8 passed (8)`, `Tests 61 passed (61)`; **Architecture review:** self-review **Passed**; **App-level:** settings → enable model → picker update walkthrough deferred | `allowlist.ts`, `enabledModelsStore.ts`, `openrouterModels.ts`, `/api/ai/models/route.ts`, `CopilotModelSettingsModal.tsx`, `CopilotPanel.tsx`, `useCopilotThread.ts`, `ARCHITECTURE.md` |
| Journal import modal UX polish | Action-first import dialog matched to Edge chrome (`px-5 py-4`, secondary buttons, panel drop zone, padded help + Cancel) | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 4 passed (4)`; **Architecture review:** self-review **Passed** | `JournalImportDialog.tsx`, `JournalImportDialog.test.tsx`, `journal/ARCHITECTURE.md` |
| Journal sync/import icon buttons | Sync + Import are icon buttons; sync shows spinner while busy; import modal has IB Flex steps + CSV drag/drop | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 10 passed (10)`; **Architecture review:** self-review **Passed** | `JournalTileNav.tsx`, `JournalImportDialog.tsx`, `JournalGlobalEmptyState.tsx`, `ChartHeaderIcons.tsx`, tests, `journal/ARCHITECTURE.md` |
| App header right-click context menu | Plain right-click on app top header opens Application menu; Control+right-click still works shell-wide | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 17 passed (17)` (`AppContextMenuProvider.test.tsx`, `AppTopHeader.test.tsx`); **Architecture review:** self-review **Passed** | `AppContextMenuProvider.tsx`, `AppTopHeader.tsx`, `AppContextMenuProvider.test.tsx`, `design-system/ARCHITECTURE.md` |
| Standalone Copilot app | `/copilot` + workspace tile surface `copilot`; Change panel menu; sidebar panel unchanged | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 17 passed (17)`; **App-level:** Ctrl+right-click → Copilot in Change panel | `CopilotTileSurface.tsx`, `AppContextMenuProvider.tsx`, `SurfaceHost.tsx`, `types.ts`, `schema.ts`, tests |
| Risk calculator IBKR Reg T margin | What-if-omitted margin estimates use IBKR Reg T/house stock rules (not 100% cash); short Liq uses `(1+m)` | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 59 passed (59)`; CSCO short 300@111.5 util &lt;90% (was Over under cash estimate); **Architecture review:** self-review **Passed** | `marginContext.ts`, `useRiskMarginContext.ts`, `RiskSettingsPanel.tsx`, `RiskMarginCard.tsx`, `marketData/ARCHITECTURE.md`, tests |
| TWS worker wedge prevention | Sidecar historical timeout + warm primary `/account/status` + Recover port-kill for standalone sidecars — prevents wedged IB worker from blanking managed accounts | **Passing** | **Focused:** sidecar `Ran 2 tests OK`; **Focused:** `Test Files 1 passed (1)`, `Tests 19 passed (19)`; **App-level:** warm `/account/status` unit path + `HISTORICAL_DATA_TIMEOUT_SEC 12.0 < 15.0`; **Architecture review:** self-review **Passed** | `services/tws-sidecar/main.py`, `src/lib/marketData/providers/tws/recover.ts`, tests, `src/lib/marketData/ARCHITECTURE.md` |
| AI agent / in-app copilot — Phase 7 | Allowlist model picker + per-thread `modelId` persist; `listAgentModels()` filters tool-capable models; Copilot header `EdgeSelect`; `streamChat` sends resolved id; router/direct providers deferred | **Passing** | **Focused:** `Test Files 9 passed (9)`, `Tests 41 passed (41)`; **Build:** `✓ Compiled successfully in 9.7s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** model switch mid-thread walkthrough deferred | `allowlist.ts`, `copilotThreads.ts`, `copilotThreadsClient.ts`, `useCopilotThread.ts`, `CopilotPanel.tsx`, `0026_copilot_thread_model_id.sql`, `ARCHITECTURE.md`, `ai-agent-roadmap.md` |
| AI agent / in-app copilot — Phase 6 | Copilot thread persistence: `tv-ai:copilot-threads:v1` + `/api/me/copilot-threads`; list/rename/delete/New chat; debounced save; annotation click switches threads; redacted tool steps | **Passing** | **Focused:** `Test Files 10 passed (10)`, `Tests 30 passed (30)`; **Build:** `✓ Compiled successfully in 10.0s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** refresh restore / linkage switch walkthrough deferred | `copilotThreads.ts`, `copilotThreadsRepository.ts`, `copilotThreadsClient.ts`, `localCopilotThreadsStore.ts`, `useCopilotThread.ts`, `CopilotPanel.tsx`, `0025_copilot_threads.sql`, `ARCHITECTURE.md`, `ai-agent-roadmap.md` |
| AI agent / in-app copilot — Phase 5 | Chart↔chat anchors: `threadId`/`messageId` on AI drawings; click annotation → Copilot turn; accept→`accepted`/dismiss→`invalidated`; `summarize_chart` rationale narrative | **Passing** | **Focused:** `Test Files 10 passed (10)`, `Tests 58 passed (58)`; **Build:** `✓ Compiled successfully in 9.4s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** linkage walkthrough deferred | `confirmGate.ts`, `orchestrate.ts`, `CopilotContext.tsx`, `copilot/`, `annotationMetadata.ts`, `DrawingSelectionToolbar.tsx`, `ChartCell.tsx`, `workflow.ts`, `ARCHITECTURE.md`, `ai-agent-roadmap.md` |
| Journal ignore-from-stats | Mark trades ignored so fills stay in history but drop from KPIs/calendar/equity/reports; trades list shows Ignored badge; toggle in trade detail | **Passing** | **Focused:** `Test Files 29 passed (29)`, `Tests 188 passed (188)`; **App-level:** BBD `ignored:true`; stats `closedCount:11→10`, `netPnL:11299.70449145299→11299.85765545299`; **Architecture review:** self-review **Passed** | `0024_journal_trade_ignored.sql`, `journalStats.ts`, `JournalTradeDetail.tsx`, `JournalTradesTable.tsx`, `rebuildTrades.ts`, `journalRepository.ts`, `tools/journal.ts`, `journal/ARCHITECTURE.md` |
| AI agent / in-app copilot — Phase 4 | Copilot `write` mode; confirm gate for destructive/`requiresConfirmation`; Accept/Reject cards; agent-path AI drawing defaults (`source: ai`, `status: proposed`); `place_order` never silent | **Passing** | **Focused:** `Test Files 9 passed (9)`, `Tests 47 passed (47)`; **Build:** `✓ Compiled successfully in 8.9s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** confirm/drawing walkthrough deferred | `confirmGate.ts`, `orchestrate.ts`, `readTools.ts`, `chat/route.ts`, `copilot/`, tests, `src/lib/ai/ARCHITECTURE.md`, `docs/roadmaps/ai-agent-roadmap.md` |
| Day classification — Phase 3 | Shared OHLCV rules + propose openType hints from RTH 5m; rows stay `status=proposed` until human confirms L1/L2 | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 25 passed (25)`; **App-level:** propose `--days=3` → `rows:15` `openFilled:15` `openUnknown:0`; sample NVDA 2026-07-22 `openType=open_test_drive` `status=proposed`; **Architecture review:** self-review **Passed** | `src/lib/dayProfiles/rules.ts`, `rulesOpen.ts`, `rules.test.ts`, `scripts/day-profiles-propose.mts`, `scripts/day-profiles-confirm-review.mts`, `docs/roadmaps/day-classification-roadmap.md` |
| Yahoo 5m candle range clamp | 5m (and other short intraday) Yahoo candle fetches clamp to provider retention so oversized `1y` windows do not blank the chart | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 17 passed (17)`; **App-level:** `POST /api/candles` APLD `5m`/`1y` → `count 7563` `meta.source: yahoo`; workspace APLD 5m chart renders | `src/lib/yahooFinance.ts`, `packages/chart-react/src/engine/rangeInterval.ts`, tests, `docs/chart/features.md`, `src/lib/marketData/ARCHITECTURE.md` |
| Day classification — Phase 2 | Days sidebar: filter confirmed day profiles by L1–L3/L5 and open session on active chart at RTH open (5m) | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 12 passed (12)`; **App-level:** Days panel `50 sessions`; API `dayType=trend&openType=open_drive` → `3`; click AAPL 2026-07-15 → **`AAPL · Edge`** + **`5m`**; **Architecture review:** self-review **Passed** | `src/lib/dayProfiles/`, `/api/day-profiles`, `src/app/components/day-profiles/`, `sidebar/registry.tsx`, `docs/roadmaps/day-classification-roadmap.md` |
| AI agent / in-app copilot — Phase 3 | Orchestrator awaits session bridge for `requiresClientSession` read tools; single-consumer poll dispatch; read grant default; `session.bridge` logs; MCP HTTP execute unchanged | **Passing** | **Focused:** `Test Files 25 passed (25)`, `Tests 132 passed (132)`; **Build:** `✓ Compiled successfully in 9.7s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** Copilot bridge walkthrough deferred | `sessionBridgeExecute.ts`, `sessionBridgeStore.ts`, `agent/orchestrate.ts`, `AiSessionBridge.tsx`, `/api/ai/session/execute`, tests, `src/lib/ai/ARCHITECTURE.md`, `docs/roadmaps/ai-agent-roadmap.md` |
| App-level verification — Phase 8 | Human review day-profile propose batch (8.1): visual guide + RTH 5m open review; confirm/correct L1+L2 into CSV store | **Passing** | **App-level:** 8.1 `confirmed:50` `rejected:0` openType counts `open_auction:19` `open_test_drive:14` `open_drive:12` `open_rejection_reverse:5`; samples AAPL 2026-07-15 trend/open_drive, SPY 2026-07-17 neutral/open_auction, NVDA 2026-07-10 trend/open_drive, TSLA 2026-07-06 trend/open_test_drive | `data/day-profiles/proposed/batch-20260718.csv`, `docs/trading/day-classification-visual-guide.md`, `scripts/day-profiles-confirm-review.mts`, `docs/roadmaps/app-level-verification-roadmap.md`, `docs/roadmaps/day-classification-roadmap.md` |
| AI agent / in-app copilot — Phase 2 | Sidebar Copilot panel streams read-only chat via `/api/ai/chat`; NDJSON client + tool chips + cancel; compact `workspaceSnapshot`; `toggleCopilot` (⌥⇧C) | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 24 passed (24)`; **Build:** `✓ Compiled successfully in 10.1s`; TS exit blocked by pre-existing `JournalTradesView.tsx` error; **Architecture review:** self-review **Passed**; **App-level:** open Copilot → stream with key deferred | `src/app/components/copilot/`, `sidebar/registry.tsx`, `chartConfig.ts`, `shortcuts/`, `persistence/schemas/chartWorkspace.ts`, tests, `src/lib/ai/ARCHITECTURE.md`, `docs/roadmaps/ai-agent-roadmap.md` |
| AI agent / in-app copilot — Phase 1 | OpenRouter `ModelProvider` + read-only orchestrator + `POST /api/ai/chat` NDJSON stream; registry read tools; client-session deferral | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 35 passed (35)`; **Build:** compile OK; TS exit blocked by pre-existing `JournalTradesView.tsx` error; **Architecture review:** self-review **Passed**; **App-level:** curl smoke with key deferred | `src/lib/ai/model/openrouter.ts`, `src/lib/ai/agent/orchestrate.ts`, `src/app/api/ai/chat/route.ts`, tests, `src/lib/ai/ARCHITECTURE.md`, `docs/roadmaps/ai-agent-roadmap.md` |
| AI agent / in-app copilot — Phase 0 | Contracts freeze: ModelRef + allowlist + ModelProvider interface; chat request + stream/confirm Zod schemas; ownership map; env/docs; no live LLM or UI | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 21 passed (21)`; **Architecture review:** self-review **Passed**; **App-level:** N/A (contracts only) | `src/lib/ai/model/`, `src/lib/ai/agent/contracts.ts`, `.env.example`, `src/lib/ai/ARCHITECTURE.md`, `docs/ai-tools-architecture.md`, `docs/roadmaps/ai-agent-roadmap.md` |
| AI agent / in-app copilot — Phase 8 | Prompt library (4 workflow chips) + slim `dataProvenance` on chart tools + prepare confirm gate + provenance citation prompt | **Passing** | **Focused:** `Test Files 14 passed (14)`, `Tests 65 passed (65)`; **Build:** `✓ Compiled successfully in 10.6s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** workflow chip walkthrough deferred | `promptLibrary.ts`, `dataProvenance.ts`, `CopilotMessageList.tsx`, `CopilotPanel.tsx`, `workflow.ts`, `chart.ts`, `orchestrate.ts`, `summarizeToolResult.ts`, `ai-agent-roadmap.md` |
| AI agent / in-app copilot track | Phased in-app chat + OpenRouter-first agent over existing tool registry (session bridge, confirmed writes, chart↔chat, thread persistence, model picker, workflow polish) | **Passing** | Phase 0–8 **Passing**; **Focused (Phase 8):** `Test Files 14 passed (14)`, `Tests 65 passed (65)` (2026-07-22) | `docs/roadmaps/ai-agent-roadmap.md`, `docs/roadmaps/README.md`, `docs/ROADMAP.md`, `docs/ai-tools-architecture.md`, `src/lib/ai/ARCHITECTURE.md` |
| App-level verification — Phase 7 | Data serving, health, and residual Pending rows (7.1–7.7): client TTL reuse, hidden-tab ingest + home remote, chart pan/quote share, Data Health live fault, off-hours freshness, Patterns browse, crumbs/columns/options/latency/extended-hours | **Passing** | **App-level:** 7.1 MSFT search delta:0 + `Technology · SemiconductorsXLKSMHSPY+2` **Focused:** `Tests 7 passed (7)`; 7.2 hidden-tab no ingest storm + `/api/me/chart-workspaces` count:5 + `/home` NVDA/AAPL/MSFT **Focused:** `Tests 11 passed (11)`; 7.3 badge streaming + title **`NVDA 211.07 ▲ +1.82%`**; 7.4 gateway blip bypass/disconnect labels; 7.5 after-hours Yahoo fill; 7.6 Patterns records count:2 (Go to chart Skipped); 7.7 crumbs **`XLC`** + Columns expanded (options/latency Skipped) | `docs/roadmaps/app-level-verification-roadmap.md`, `getOrFetchClientTtl.ts`, `ingestPollSchedule.ts`, `chartClientCache.ts`, `DataHealthMenu.tsx`, `PatternsPanel.tsx`, `MarketContextBreadcrumb.tsx`, `OptionsChainDialog.tsx`, `ResultsTable.tsx` |
| App-level verification — Phase 6 | Workspace chrome + journal shipped surfaces deferred walks (6.1–6.11): Use/Edit+splitter, presets+pill, tab quote, command palette, palettes, border-legend selects, skeleton, Open Positions+Calendar, KPI+columns, screenshots+forks, chrome density | **Passing** | **App-level:** 6.1 Edit→Done + `split-handle-node-*` (drag/menu Skipped); 6.2 **Trade desk** + pill **undefinedPhase6-desk**; 6.3 **`NVDA 212.06 ▲ +2.30% · Edge`** + favicon; 6.4 `command-palette-list` **Change symbol**; 6.5 **Graphite** reload persist; 6.6 **Period**/ **Data**/ **Account** rims; 6.7 skeleton **Focused:** `Tests 7 passed (7)`; 6.8 Open Positions + calendar **`data-selected="true"`**; 6.9 **$36,948.70** + columnOrder reload (flash Skipped Phase 1.2); 6.10 BRUN drawer + capture gate (fork cycle Skipped); 6.11 `journal-tile-nav` | `docs/roadmaps/app-level-verification-roadmap.md`, `WorkspaceHeaderControls.tsx`, `WorkspacePill.tsx`, `CommandPalette.tsx`, `AppSettingsShell.tsx`, `JournalViewTabs.tsx`, `JournalCalendar.tsx`, `JournalTradeScreenshots.tsx`, `TradeChartForkModal.tsx` |
| App-level verification — Phase 5 | Screener and Review deferred walks (5.1–5.6): tile Save/Recent, deep-link redirect, chart drive sync, heat map, technical/compare; Skip Notify (2.4) | **Passing** | **App-level:** 5.1 Save **Phase5-verify** `screen-1784758704071` + Recent `gainers`; 5.2 `/screener/review`→unified (Keep/Skip **Skipped**); 5.3 ↑/↓ **AAPL**→**ABBV** + BC **NVDA**; 5.4 Gainers/Large-cap `heatmap-view`; 5.5 MACD **11** + Compare PBR-A/CNQ.TO; 5.6 **Skipped** (2.4) | `docs/roadmaps/app-level-verification-roadmap.md`, `ScreenerTileSurface.tsx`, `ScreenerScreensBody.tsx`, `ResultsTable.tsx`, `useScreenerReviewDrive.ts`, `reviewChannel.ts` |
| Sticky `?surface=alerts` reopens closed tile | Deep-link ingress is one-shot (strip query + session lock); close/Done clear ingress; refresh must not reopen Alerts | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 25 passed (25)`; **App-level:** close→Done→reload no Alerts; sticky lock strips without reopen | `workspace/page.tsx`, `deepLinks.ts`, `AppWorkspaceContext.tsx`, tests, `ARCHITECTURE.md` |
| Workspace layout Done stomped by deferred remote | Close/reassign tiles in edit → **Done** must persist; deferred `/api/me/app-workspaces` snapshots during edit are discarded on commit (not reapplied) | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 12 passed (12)`; **Architecture review:** self-review **Passed** | `AppWorkspaceContext.tsx`, `AppWorkspaceContext.test.tsx`, `src/lib/appWorkspace/ARCHITECTURE.md` |
| App-level verification — Phase 4 | Risk and Trade UI deferred walks (4.1–4.5): Risk calculator `$` sizing, margin/Details, Liq+MARGIN CALL, Long Position→Risk bind, symbol Recent MRU | **Passing** | **App-level:** 4.1 `$` **179** shares At risk **$995** + `%` **66**; 4.2 util **0%→158%** Details **Getting tight**; 4.3 **Liq 13.34** + **MARGIN CALL 13.34** toggle; 4.4 Long linked Entry **325.62**/Stop **319.96** sync ↻; 4.5 Recent MSFT/NVDA/AAPL chart + Watchlist Add symbol | `docs/roadmaps/app-level-verification-roadmap.md`, `RiskSettingsPanel.tsx`, `RiskMarginCard.tsx`, `marginContext.ts`, `useRiskDrawingBinding.ts`, `recentSymbols.ts`, `SymbolSearchDialog.tsx` |
| Stock execution depth — Phases 6–9 | Outside RTH toggle; Trade setup bracket (entry+stop+TP OCA); trail stop leg; Account **Protect with OCO** on open position | **Passing** | **Focused:** `Test Files 22 passed (22)`, `Tests 116 passed (116)`; **Sidecar:** `Ran 50 tests OK`; **Architecture review:** self-review **Passed**; **App-level:** paper bracket + OCO walkthrough deferred | `TradeOrderForm.tsx`, `ProtectiveOcoForm.tsx`, `bracketPlan.ts`, `orderGroups.ts`, `tradingService.ts`, `ibTws.ts`, `main.py`, `/api/trading/brackets`, `/api/trading/oco`, `trading/ARCHITECTURE.md`, `trading-execution-roadmap.md` |
| Alert AI / MCP tools (Phases 1–3) | 16 client-session tools via `AlertsPort`: lifecycle CRUD + `list_alert_events`; high-level create (drawing/trade plan/indicator/script/watchlist/screener notify); chart workflow (`open_alert_on_chart`, `preview_alert`, `suggest_alerts_for_chart`); `GET /api/me/alerts/events` | **Passing** | **Focused:** `Test Files 17 passed (17)`, `Tests 83 passed (83)` (`src/lib/ai/`); **Architecture review:** self-review **Passed**; **App-level:** MCP alert tool walkthrough deferred | `src/lib/ai/tools/alerts.ts`, `alertsPort.ts`, `alertClient.ts`, `/api/me/alerts/events`, `AiToolsProvider.tsx`, `docs/ai-tools-architecture.md`, `docs/roadmaps/alerts-roadmap.md` |
| App-level verification — Phase 3 | Scripts tile + chart fixtures deferred walks (3.1–3.10): Monaco create/run/save/apply, DB library, AI tools, golden fixtures, MTF/objects, tip remap, overlay inset, TZ inherit, 1R yard lines | **Passing** | **App-level:** 3.1 `cac0de58-…` rev `fa5cf59a9bb540e2` Saved+Applied Midpoint + picker Edit/New; 3.2 `GET /api/me/scripts/cac0de58-…` 200 reload; 3.3 AI create/compile/apply `281c31a5-…` → `499574a3-…`; 3.4 `/workspace?surface=chart&scriptFixture=all` seven goldens; 3.5 HTF `6f7db235-…` Daily SMA + dual `ec1dc037-…` paste/Apply; 3.6 `5e83ca34-…` object-box-label; 3.7 AAPL 5m tip stable `dupTailTs:false`; 3.8 docked `data-overlay-inset=333`; 3.9 `America/Chicago`/CDT + chart EDT override; 3.10 long `d1784746178488_ena1m` + short `d1784746184432_vqbqd` maxR=2 `1R`/`2R` ticks | `docs/roadmaps/app-level-verification-roadmap.md`, `ScriptsTileSurface.tsx`, `scriptFixtureDev.ts`, `scriptFixtures.ts`, `/api/me/scripts*` |
| MCP call logging (single-user) | Each MCP `tools/call` logs one structured JSON line to stderr (`mcp.tool`: tool, ok, code, durationMs, bridge); unknown tools log `unknown_tool`; no args/results/secrets | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 6 passed (6)`; **Architecture review:** self-review **Passed**; **App-level:** optional Cursor MCP stderr check deferred | `src/lib/ai/adapters/mcp.ts`, `scripts/edge-mcp-server.mts`, `src/lib/ai/adapters/mcp.test.ts`, `src/lib/ai/ARCHITECTURE.md`, `docs/ai-tools-architecture.md` |
| Local error log (solo observability) | Redacted chart/API/script/window failures append to gitignored `.edge/error-log.jsonl` and survive reload; read with `npm run report:local-errors` | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 17 passed (17)`; **Packages:** `build:packages` passed; **Build:** `✓ Compiled successfully in 9.4s` (full build TS blocked by pre-existing `JournalTradesView.tsx`); **App-level:** `report:local-errors -- --limit 1` → `[app-level] local error log smoke`; **Architecture review:** self-review **Passed** | `src/lib/observability/`, `src/app/api/dev/local-errors/route.ts`, `safeErrorResponse.ts`, `ChartErrorBoundary.tsx`, `LocalErrorReporter.tsx`, `chart-react/localErrorEvent.ts`, `governance.ts`, `ARCHITECTURE.md` |
| Journal Tier 3 — MFE/MFA (3.4) | Closed STK trade detail computes/persists max favorable/adverse excursion ($ + R) from 1m/5m candles over trade window | **Passing** | **Focused:** `tradeExcursion.test.ts` + journal suite `Test Files 55 passed (55)`, `Tests 306 passed (306)`; **Architecture review:** self-review **Passed**; **App-level:** Compute excursion walkthrough deferred | `0023_journal_trade_excursion.sql`, `tradeExcursion.ts`, `JournalTradeDetail.tsx`, `journalRepository.ts`, `journal/ARCHITECTURE.md` |
| Journal Tier 3 — Compare reports (3.3) | Dashboard compare presets (wins vs losses, last/prior 30d, high vs low rating) with side-by-side KPIs; time report remounted | **Passing** | **Focused:** `computeCompareReport` + `JournalCompareReport.test.tsx`; journal suite `Tests 306 passed (306)`; **Architecture review:** self-review **Passed**; **App-level:** preset KPI walkthrough deferred | `journalStats.ts`, `JournalCompareReport.tsx`, `JournalTimeReport.tsx`, `JournalDashboardView.tsx` |
| Journal Tier 3 — Trade rating (3.1) | Per-trade 1–5 rating; filter + breakdown dimension; patch via trade detail | **Passing** | **Focused:** rating filter/breakdown tests; journal suite `Tests 306 passed (306)`; **Architecture review:** self-review **Passed**; **App-level:** rating persist walkthrough deferred | `0022_journal_trade_rating.sql`, `types.ts`, `journalStats.ts`, `JournalTradeDetail.tsx`, `JournalFilterDrawer.tsx`, `JournalBreakdownReport.tsx` |
| Journal AI tools — Phase 1 (MVP) | Agents list/get trades, summarize stats, patch review fields via shared registry/MCP (`requiresClientSession` + session bridge) | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 12 passed (12)`; **Focused:** `Test Files 15 passed (15)`, `Tests 59 passed (59)` (`src/lib/ai/`); **Build:** compile OK; TS exit blocked by pre-existing `JournalTradesView.tsx` error; **Architecture review:** self-review **Passed**; **App-level:** MCP session-bridge walkthrough deferred | `journalPort.ts`, `tools/journal.ts`, `clientTools.ts`, `AiToolsProvider.tsx`, `context.ts`, `journalClient.ts`, AI/journal ARCHITECTURE + roadmap |
| Journal AI tools — Phase 2 (analytics + chart) | Breakdown, time report, equity/daily PnL, compare slices, open trade on chart via `journalStats` + `chartDeepLink` | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 13 passed (13)` (`journal.test.ts`); **Focused:** `Test Files 15 passed (15)`, `Tests 67 passed (67)` (`src/lib/ai/`); **Architecture review:** self-review **Passed**; **App-level:** MCP session-bridge + chart open walkthrough deferred | `tools/journal.ts`, `journal.test.ts`, `journalStats.ts`, `chartDeepLink.ts`, AI/journal ARCHITECTURE + roadmap |
| App-level verification — Phase 2 | Alerts reliability deferred walks (2.1–2.6): price/drawing/trade-plan/screener/indicator-watchlist/script cron + bell | **Passing** | **App-level:** 2.1 AAPL cron `triggered:1` + `source:alert`; 2.2 hline sync+expire; 2.3 bundle entry/stop `triggered:2`; 2.4 gainers baseline `notified:0` then `notified:1` `source:screener`; 2.5 watchlist RSI cron `triggered:1`; 2.6 script snapshot+cron `triggered:1` | `docs/roadmaps/app-level-verification-roadmap.md`, `/api/cron/alert-evaluate`, `/api/cron/screener-alert-evaluate`, `AlertsConfigPane.tsx`, `notifications/ARCHITECTURE.md` |
| App-level verification — Phase 1 | Live IB / dual Gateway / trading ops deferred walks (1.1–1.11); owner-approved 1-share cheap live fill + flatten; no product features | **Passing** | **App-level:** 1.1–1.10 **PASS** (chip hidden `1400 BRUN`; Daily PnL `-$1,526.04`; paper `DUP586813`/live `U25026894`; BBD `57`/`109` Filled flat); 1.11 **Skipped** (not Sunday window); ingest `duplicates:2` `journalInSync:true` | `docs/roadmaps/app-level-verification-roadmap.md`, `docs/PROJECT-STATUS.md` |
| Journal history lagging false positive | History sync chip hidden when journal opens match live book (no-leg STK conId resolve, signed short qty, multi-leg spreads); still warns on real gaps | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 15 passed (15)`; **Architecture review:** self-review **Passed**; **App-level:** chip hidden when opens match live walkthrough deferred → verification Phase 1.1 | `reconcileJournalOpens.ts`, `reconcileJournalOpens.test.ts`, `journal/ARCHITECTURE.md` |
| Journal + Account live position PnL | Account Daily/position PnL on snapshot cadence; journal live card + Open Positions tab show IB unrealized via conId/symbol join with flash; live sidecar persistent account/PnL subs + MKT backfill | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 47 passed (47)`; **Sidecar:** `Ran 44 tests OK`; **Architecture review:** self-review **Passed**; **App-level:** live PnL poll walkthrough deferred | `reconcileJournalOpens.ts`, `JournalLivePositionsCard.tsx`, `JournalTradesView.tsx`, `JournalTradesTable.tsx`, `brokerageService.ts`, `services/tws-sidecar/main.py`, tests, `journal/ARCHITECTURE.md`, `trading/ARCHITECTURE.md` |
| Account tab header + live PnL | Label-first header (Live/Paper or alias + account id subtitle); condensed status line; Daily/position PnL flash; live sidecar returns daily + unrealized PnL on poll | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 33 passed (33)`; **Sidecar:** `Ran 48 tests OK`; **Architecture review:** self-review **Passed**; **App-level:** live Daily/position PnL poll + flash walkthrough deferred | `accountPanelHeader.ts`, `AccountPanel.tsx`, `useValueFlash.ts`, `services/tws-sidecar/main.py`, `test_main.py`, `trading/ARCHITECTURE.md`, tests |
| App color palettes (mode + palette) | Choose Midnight / Graphite / Deep Slate in Application settings; each has light + dark; header mode toggle unchanged; persisted + user-preferences synced | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 28 passed (28)`; **Build:** `npm run build:packages` passed; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** palette picker + reload walkthrough deferred | `edge.ts`, `palettes.ts`, `globals.css`, `themeTokens.ts`, `appPalettePreference.ts`, `AppThemeProvider.tsx`, `AppSettingsShell.tsx`, `userPreferences` schema/sync, tests |
| Journal Calendar P&L polish | Mon–Fri calendar + Week column; month rollup; heatmap intensity; compact cells; today/selected chrome | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 72 passed (72)`; **Architecture review:** self-review **Passed**; **App-level:** heatmap + selected-day walkthrough deferred | `journalStats.ts`, `JournalCalendar.tsx`, `JournalDashboardView.tsx`, tests, `journal/ARCHITECTURE.md` |
| Journal Open Positions tab | Underline tab next to Trades; open journal trades list + KPI cards; dashboard live IB card unchanged | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 33 passed (33)`; **Architecture review:** self-review **Passed**; **App-level:** Open Positions walkthrough deferred | `JournalViewTabs.tsx`, `JournalTradesView.tsx`, `JournalTileSurface.tsx`, `deepLinks.ts`, `journal/open/page.tsx`, `journal/ARCHITECTURE.md`, tests |
| App UX polish Phase 5 — closeout | Re-verify surface convergence via `ux:baseline`; mark App UX polish track complete (no route restyle; component-standardization Phase 5 already shipped) | **Passing** | **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, horizontal overflow **0/12**, raw hex files (components) **8**, Tailwind palette files (components) **0**; **Architecture review:** self-review **Passed** | `docs/roadmaps/app-ux-polish-roadmap.md`, `docs/roadmaps/component-standardization-roadmap.md`, `docs/ux-baseline/ux-baseline-latest.json`, `docs/roadmaps/README.md`, `docs/PROJECT-STATUS.md` |
| Journal KPI cards + sync status UX | Density-safe hero KPI cards; equity update flash; compact history sync chip in chrome (no content banner) | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 61 passed (61)`; **Architecture review:** self-review **Passed**; **App-level:** narrow/wide tile + equity flash walkthrough deferred | `JournalSummaryCards.tsx`, `JournalHistorySyncChip.tsx`, `useJournalHistoryOutOfSync.ts`, `JournalDashboardView.tsx`, `JournalTileNav.tsx`, `journal/ARCHITECTURE.md` |
| Screener tile simplify | Drop Review/Keepers sub-nav from workspace tile; full-width Screens chips + Recent row; always-visible name + Save; `recentScreenIds` persistence; legacy ingress coerced to `screens` | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 29 passed (29)`; **Architecture review:** self-review **Passed**; **App-level:** save/recent walkthrough deferred | `ScreenerTileSurface.tsx`, `ScreenerScreensBody.tsx`, `useScreenerSessionModel.ts`, `screenStorage.ts`, `deepLinks.ts`, `workspace/page.tsx`, screener pages, docs |
| Script depth — Phase 5 | Declarative script `box`/`label`/`level` objects on price pane via `calculate().objects`; host peel + budgets; `scriptObjects` layer below DrawingStore; SDK → `edge-indicator-sdk-6`; fixture `object-box-label` | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 65 passed (65)`; **Packages:** `lint:package-boundaries` + `typecheck:packages` + `build:packages` passed; **Build:** `✓ Compiled successfully in 9.7s`; **Architecture review:** self-review **Passed**; **App-level:** `object-box-label` fixture walkthrough deferred | `packages/chart-core/src/{scriptContracts,scriptObjectsDraw,scriptFixtures}.ts`, `packages/indicator-runtime/src/{executeArtifact,compileScript}.ts`, `packages/chart-react/src/engine/{indicatorResultProvider,scriptResultCoordinator,layers}.ts`, `docs/chart/{script-examples,features}.md`, `docs/roadmaps/script-depth-roadmap.md`, `packages/indicator-runtime/ARCHITECTURE.md` |
| Notifications + Alerts Phase 4 / Script depth Phase 4 | Script-declared `alerts` manifest conditions; `script_condition` leg; client snapshot POST → `symbol_state`; shared cron fire (5m freshness); settings **Create alert…**; chart bridge via `onScriptResultReady` | **Passing** | **Focused:** `Test Files 8 passed (8)`, `Tests 61 passed (61)`; **Packages:** `lint:package-boundaries` + `typecheck:packages` + `build:packages` passed; **Build:** `✓ Compiled successfully in 9.8s`; **Architecture review:** self-review **Passed**; **App-level:** script alert arm → snapshot → cron walkthrough deferred | `scriptContracts.ts`, `scriptAlertEval.ts`, `scriptAlertSnapshot.ts`, `/api/me/alerts/[id]/snapshot`, `AlertsConfigPane.tsx`, `IndicatorSettingsModal.tsx`, `EdgeChart.tsx`, `scriptResultCoordinator.ts`, `alerts-roadmap.md`, `script-depth-roadmap.md` |
| Screener Review UI workspace tile | Mount Review/Keepers in `ScreenerTileSurface` via `screenerView` + tile subnav; deep-link `/screener/review` → `screenerView=review`; subnav syncs URL; preserve `reviewResume` | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 4 passed (4)` (URL sync); prior `Test Files 4 passed (4)`, `Tests 16 passed (16)`; **Architecture review:** self-review **Passed**; **App-level:** Review deep-link mounts view; Keep/Skip resume optional | `ScreenerTileSurface.tsx`, `ModuleToWorkspaceRedirect.tsx`, `workspace/page.tsx`, screener pages, `deepLinks.ts`, ARCHITECTURE + screener-roadmap |
| Notifications + Alerts Phase 3 | Indicator conditions (RSI/MACD/MA/EMA level + cross); watchlist-wide scope; 2-leg AND/OR combinator; JSONB `conditions` + `symbol_state`; delivery channels deferred | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 38 passed (38)`; **Build:** `✓ Compiled successfully in 9.3s`; **Architecture review:** self-review **Passed**; **App-level:** indicator + watchlist cron walkthroughs deferred | `0021_alert_conditions.sql`, `alertConditions.ts`, `indicatorAlertEval.ts`, `resolveAlertSymbols.ts`, `runAlertEvaluation.ts`, `AlertsConfigPane.tsx`, `AlertsLibraryRail.tsx`, `alertRepository.ts`, `alerts-roadmap.md`, `notifications/ARCHITECTURE.md` |
| Data serving efficiency track | Client TTL reuse, poll hygiene, home remote truth, chart/screener/AI cache gaps; process-local server HotStore/DataCache | **Passing** | Phase 0–6 **Passing**; **Focused (Phase 6):** `Test Files 7 passed (7)`, `Tests 45 passed (45)`; Phase 7 **Skipped**; track complete (2026-07-21) | `docs/roadmaps/data-serving-efficiency-roadmap.md`, `docs/roadmaps/README.md`, `docs/ROADMAP.md`, `src/lib/marketData/ARCHITECTURE.md` |
| Data serving efficiency — Phase 7 | Multi-instance Redis / shared HotStore+DataCache | **Skipped** | Product decision: single user → one Node; process-local cache sufficient; no Redis adapter | `docs/roadmaps/data-serving-efficiency-roadmap.md`, `src/lib/marketData/ARCHITECTURE.md` |
| Notifications + Alerts Phase 2b | Screener match alerts: `screener_alerts` + cron evaluate; notify on added symbols; saved-screen Notify toggle (15m/60m); Alerts tile screener strip | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 16 passed (16)` (includes Phase 2a); **Build:** `✓ Compiled successfully in 12.5s`; **Architecture review:** self-review **Passed**; **App-level:** screener cron notify walkthrough deferred | `0020_screener_alerts.sql`, `runScreenerAlertEvaluation.ts`, `screenerAlertDiff.ts`, `/api/me/screener-alerts`, `/api/cron/screener-alert-evaluate`, `ScreenerAlertToggle.tsx`, `ScreenerAlertsStrip.tsx`, `screener-roadmap.md` |
| Notifications + Alerts Phase 2a | Trade plan bundles from long/short position: entry/stop/target alerts; `drawingRole` + `bundleId`; role-aware sync; overlay **Add trade plan alerts…** | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 16 passed (16)`; **Build:** `✓ Compiled successfully in 12.5s`; **Architecture review:** self-review **Passed**; **App-level:** position move + cron cross walkthrough deferred | `0019_alert_trade_plan_bundle.sql`, `tradePlanAlerts.ts`, `drawingAlertSync.ts`, `overlayContextMenu.ts`, `ChartCell.tsx`, `AlertsConfigPane.tsx`, `AlertsLibraryRail.tsx`, `alerts-roadmap.md` |
| Data serving efficiency — Phase 6 | Legacy layout write lock; layout fingerprint dirty/merge compare; journal/pattern GET TTL memo via `ClientTtlCache` (no TanStack) | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 45 passed (45)`; **Build:** `✓ Compiled successfully in 11.2s`; **Architecture review:** self-review **Passed**; **App-level:** journal remount cache walkthrough deferred | `layoutStorage.ts`, `layoutContentFingerprint.ts`, `useWorkspaceTabsRemoteSync.ts`, `workspaceTabs.ts`, `clientCachePolicy.ts`, `persistenceClientCache.ts`, `journalClient.ts`, `patternLibraryRecordsClient.ts`, ARCHITECTURE docs, `data-serving-efficiency-roadmap.md` |
| Data serving efficiency — Phase 5 | Private Cache-Control on safe GET fundamentals/context; AI fetch-port TTL memo (search/quotes/ai_candles); pattern taxonomy mtime memory cache; MCP service port unchanged | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 22 passed (22)`; **Build:** `✓ Compiled successfully in 8.0s`; **Architecture review:** self-review **Passed**; **App-level:** AI search memo + Cache-Control walkthrough deferred | `cacheControl.ts`, `fundamentals/route.ts`, `market-data/context/route.ts`, `marketDataPort.ts`, `clientCachePolicy.ts`, `getOrFetchClientTtl.ts`, `patternLibrary/storage.ts`, ARCHITECTURE docs, `data-serving-efficiency-roadmap.md` |
| Notifications + Alerts Phase 1 | Drawing-bound alerts (hline/trend/rectangle); overlay **Add alert on drawing…**; geometry sync on edit; expire on delete; zone + trendline cron eval | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 41 passed (41)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** drawing alert flows deferred | `0017_alert_drawing_bind.sql`, `src/lib/alerts/*`, `overlayContextMenu.ts`, `useDrawingLayoutSync.ts`, `ChartCell.tsx`, `AlertsConfigPane.tsx`, `alerts-roadmap.md` |
| Data serving efficiency — Phase 4 | Technical screens universe-first daily candles + coalesced provider fetches + miss budget (50) + hit rates in aggregate detail | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 23 passed (23)`; **Build:** `✓ Compiled successfully in 8.4s`; **Architecture review:** self-review **Passed**; **App-level:** screener cold-start walkthrough deferred | `resolveScreenerDailyCandles.ts`, `technicalFilter.ts`, `marketDataService.ts`, `marketData/ARCHITECTURE.md`, `data-serving-efficiency-roadmap.md` |
| Data serving efficiency — Phase 3 | History pan merges into `chartClientCache`; refresh preserves prepended bars unless `reloadKey`; chart/tab last price shares `MarketDataProvider` quote map | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 28 passed (28)`; **Build:** `✓ Compiled successfully in 7.7s`; **Architecture review:** self-review **Passed**; **App-level:** pan-back remount + quote stream walkthrough deferred | `chartClientCache.ts`, `useChartDataFeed.ts`, `resolveChartLiveQuotePrice.ts`, `ChartCell.tsx`, ARCHITECTURE docs, `data-serving-efficiency-roadmap.md` |
| Workspace state persistence — Phase 5 | Workflow continuity: screener `reviewResume` on library snapshot + fingerprint invalidation; user-scoped pattern library Postgres + `/api/me/pattern-library/*` with FS facade; options draft deferred; journal columns closed in Phase 3 | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 47 passed (47)`; gap fix `Test Files 4 passed (4)`, `Tests 16 passed (16)`; **Build:** `✓ Compiled successfully`; **Architecture review:** self-review **Passed**; **App-level:** `reviewResume` local **PASS** (index=2, keepers=AAPL/MSFT); Review UI gap **closed** (tile mounts Review); pattern POST `capture-phase5-review-1784681159` **PASS** | `reviewResume.ts`, `ScreenerProvider.tsx`, `ScreenerTileSurface.tsx`, `0018_pattern_library.sql`, `patternLibraryStore.ts`, `/api/me/pattern-library/*`, docs |
| Workspace state persistence — Phase 4 | Modified viewport restore: optional `CellConfig.viewport` in chart workspace snapshot; debounced write when `isViewportModified`; restore via `applyViewportSnapshot`; clear on symbol/interval/range-preset/reset; symbol transition-only runtime reset | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 19 passed (19)`; **Build:** `npm run build:packages` passed; **Architecture review:** self-review **Passed**; **App-level:** **PASS** — zoom wrote viewport `{startIndex:1633,endIndex:1873}`; refresh kept viewport; Reset chart view → reload `viewport=null`; range preset cleared viewport on interval/range change | `viewportPersistSketch.ts`, `chartWorkspace.ts`, `useViewportPersistSync.ts`, `ChartCell.tsx`, `createEdgeChartHandle.ts`, `useViewportLifecycle.ts`, docs |
| Workspace state persistence — Phase 3 | User preference pack: `user_preferences` + `/api/me/user-preferences`; assemble/apply from existing `edge:*` keys; bootstrap race + debounced remote sync; `UserPreferencesSyncProvider` in app shell; `risk_settings` catalog active | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 22 passed (22)`; **Build:** `✓ Compiled successfully in 7.8s`; **Architecture review:** self-review **Passed**; **App-level:** **PASS** — theme dark→light (`syncRevision` 33→34); clear prefs keys + reload restored `theme=light` | `0016_user_preferences.sql`, `userPreferences.ts`, `userPreferencesRepository.ts`, `userPreferencesClient.ts`, `/api/me/user-preferences`, `src/lib/userPreferences/*`, `useUserPreferencesRemoteSync.ts`, `resolveUserPreferencesBootstrap.ts`, `UserPreferencesSyncProvider.tsx`, `catalog.ts`, docs |
| Workspace state persistence — Phase 2 | App-workspace shell cloud sync: `user_app_workspaces` + `/api/me/app-workspaces`; committed-state remote sync; 500ms bootstrap race; edit-mode remote defer; localStorage offline fallback | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 18 passed (18)`; **Build:** `✓ Compiled successfully in 7.6s`; **Architecture review:** self-review **Passed**; **App-level:** **PASS** — clear `tv-ai:app-workspaces:v1` (remote rev 28) → reload restored `chart,chart,screener` + AAPL/MSFT | `0015_user_app_workspaces.sql`, `appWorkspacesRepository.ts`, `appWorkspacesClient.ts`, `/api/me/app-workspaces`, `useAppWorkspacesRemoteSync.ts`, `resolveAppWorkspacesBootstrap.ts`, `AppWorkspaceContext.tsx`, inventory/docs |
| Data serving efficiency — Phase 2 | Journal/account polls visibility-aware + ingest backoff; trades reload only on ledger change; home merges remote chart-workspaces local-first | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 13 passed (13)`; **Build:** `✓ Compiled successfully in 9.0s`; **Architecture review:** self-review **Passed**; **App-level:** hidden-tab ingest + home remote card walkthrough deferred | `ingestPollSchedule.ts`, `JournalSyncProvider.tsx`, `AccountProvider.tsx`, `resolveHomeWorkspaceTabs.ts`, `useHomeWorkspaceSummaries.ts`, ARCHITECTURE docs, `data-serving-efficiency-roadmap.md` |
| Data serving efficiency — Phase 1 | Search/fundamentals/overlays/market_context reuse `ClientTtlCache` within TTL; coalesce-on-miss; session clear on dev auth unlock | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 25 passed (25)`; **Build:** `✓ Compiled successfully in 7.9s`; **Architecture review:** self-review **Passed**; **App-level:** cache walkthrough deferred | `getOrFetchClientTtl.ts`, `searchClient.ts`, `marketContextClient.ts`, `fundamentalsClient.ts`, `apiChartDataFeed.ts`, `DevPersistenceLoginBanner.tsx`, ARCHITECTURE docs, `data-serving-efficiency-roadmap.md` |
| Data serving efficiency — Phase 0 | Shared `ClientTtlCache` primitive + client namespace/TTL/key matrix; no consumer wiring | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 10 passed (10)`; **Architecture review:** self-review **Passed**; **App-level:** N/A | `src/lib/marketData/cache/{clientTtlCache,clientCachePolicy,clientTtlCache.test}.ts`, `src/lib/marketData/ARCHITECTURE.md`, `src/lib/chartDataFeed/ARCHITECTURE.md`, `docs/roadmaps/data-serving-efficiency-roadmap.md` |
| Workspace state persistence — Phase 1 | Per-tile chart layouts: scoped workspace-tabs keys, tile binding on ChartTileHost/StockApp, chartWorkspaceId seed/write-back, non-primary orphan-adopt guard, tile-close remote hygiene | **Passing** | **Focused:** `Test Files 9 passed (9)`, `Tests 73 passed (73)`; **Build:** `✓ Compiled successfully in 7.8s`; **Architecture review:** self-review **Passed**; **App-level:** **PASS** — refresh kept independent symbols primary=AAPL / secondary=MSFT | `workspaceTabsStorage.ts`, `useStockAppBootstrap.ts`, `resolveAppBootstrap.ts`, `ChartTileHost.tsx`, `AppWorkspaceContext.tsx`, `reconcileChartWorkspaces.ts`, `commands.ts`, tests |
| Workspace state persistence — Phase 0 | Contracts freeze: persist/ephemeral matrix, keys map, chart-tile/prefs/viewport Zod sketches; inventory lock tests; no runtime behavior change | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 10 passed (10)`; **Architecture review:** self-review **Passed**; **App-level:** N/A (docs/contracts only) | `docs/roadmaps/workspace-state-persistence-roadmap.md`, `src/lib/persistence/ARCHITECTURE.md`, `src/lib/appWorkspace/ARCHITECTURE.md`, `chartTileBindingSketch.ts`, `userPreferencesSketch.ts`, `viewportPersistSketch.ts`, `workspaceStateStorageInventory.ts`, `workspaceStatePersistencePhase0.test.ts` |
| Workspace state persistence — Phase 5 | Workflow continuity: screener `reviewResume` on library snapshot + fingerprint invalidation; user-scoped pattern library Postgres + `/api/me/pattern-library/*` with FS facade; options draft deferred; journal columns closed in Phase 3 | **Passing** | Duplicate row — see Phase 5 row above; **Focused:** `Tests 47 passed (47)` | `reviewResume.ts`, `ScreenerProvider.tsx`, `0018_pattern_library.sql`, `patternLibraryStore.ts`, `/api/me/pattern-library/*`, docs |
| Workspace state persistence track | Close desk-state gaps: per-tile chart layouts, app-workspace cloud sync, user prefs pack, modified viewport restore, workflow resume; keep market data ephemeral | **Passing** | Phase 0–5 **Passing**; **Focused (Phase 5):** `Tests 47 passed (47)`; app-level walkthroughs closed 2026-07-22 | `docs/roadmaps/workspace-state-persistence-roadmap.md`, `docs/roadmaps/README.md`, `docs/ROADMAP.md` |
| Workspace layout persist — alerts schema | Zod load schema accepts `alerts` surface + alert tile state so three-col (and other) layouts with Alerts survive refresh instead of resetting to single | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 73 passed (73)`; **Architecture review:** self-review **Passed**; **App-level:** 3-col + Alerts save/refresh deferred | `src/lib/appWorkspace/schema.ts`, `src/lib/appWorkspace/commands.test.ts` |
| Command palette + quick guide | ⌘K/Ctrl+K opens searchable command palette with curated quick guide + persisted recent; `/` changes symbol; direct shortcuts for panels/indicators/theme; viewport modals render above all workspace chrome | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 23 passed (23)`; viewport modal portal + `z-[1300]`; **Architecture review:** self-review **Passed**; **App-level:** palette guide/recent + `/` symbol walkthrough deferred | `src/lib/shortcuts/*`, `src/app/components/shortcuts/*`, `EdgeModalShell.tsx`, `styles.ts`, `ChartHeaderBar.tsx`, `AppProviders.tsx`, `design-system/ARCHITECTURE.md`, `docs/chart/features.md` |
| Chart candlestick loading skeleton | Chart cold-load overlay + hydration shell show shared horizontal candlestick row (wick + body), not generic horizontal lines | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 7 passed (7)`; **Architecture review:** self-review **Passed**; **App-level:** hydration + cold load visual check deferred | `SkeletonCandleBars.tsx`, `ChartLoadingOverlay.tsx`, `AppHydrationShell.tsx`, tests, `design-system/ARCHITECTURE.md` |
| Notifications + Alerts Phase 0 | Header bell + toast inbox; notification_events + localStorage fallback; Alerts workspace tile; server cron price-alert evaluator; chart Alert → prefilled Alerts tile | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 12 passed (12)`; **Build:** `✓ Compiled successfully in 10.9s`; **Architecture review:** self-review **Passed**; **App-level:** alert fire with tab closed deferred | `0014_notifications_alerts.sql`, `src/lib/notifications/*`, `src/lib/alerts/*`, `NotificationBellMenu.tsx`, `AlertsTileSurface.tsx`, `/api/me/notifications`, `/api/me/alerts`, `/api/cron/alert-evaluate`, `alerts-roadmap.md` |
| Journal screenshot persist + lightbox | Rebuild restores screenshot/fork rows onto remapped trade ids; open-trade fill growth keeps trade id; lightbox portals full-viewport on `document.body` | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 11 passed (11)`; **Architecture review:** self-review **Passed**; **App-level:** persist-after-rebuild + lightbox walkthrough deferred | `preserveTradeAttachments.ts`, `rebuildTrades.ts`, `journalRepository.ts`, `JournalTradeScreenshots.tsx`, `journal/ARCHITECTURE.md`, tests |
| Journal trade screenshot capture display | Capture chart expands overlay inset + chart resize before html-to-image; upload blob cache for preview; revoke blob URLs after paint; hero `object-contain` | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 23 passed (23)`; **App-level:** F trade Capture chart → blob preview **385×937** (not broken/49px); **Architecture review:** self-review **Passed** | `chartSnapshot.ts`, `EdgeChart.tsx`, `JournalTradeScreenshots.tsx`, `journalClient.ts`, tests |
| Journal trade ID source of truth | Journal list uses server trade UUIDs when DB available; local rebuild only on 503; rematch local metadata + migrate IndexedDB attachments by fillExecIds | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 9 passed (9)`; **App-level:** capture screenshot POST **201** on server trade id (no 404); **Architecture review:** self-review **Passed** | `journalClient.ts`, `adoptServerJournalTrades.ts`, `tradeExecIdsKey.ts`, `localScreenshotStore.ts`, `localChartSnapshotStore.ts`, tests, `journal/ARCHITECTURE.md` |
| Account panel UX | Margin utilization bar + plain status + Details disclosure; friendly account header (alias or Live/Paper + id subtitle + rename); position hover Close + context Close via one-click Confirm close (no LIVE typing; token still sent server-side) | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 29 passed (29)` (`AccountPanel.test.tsx`, `closePositionDraft.test.ts`); **Architecture review:** self-review **Passed**; **App-level:** margin bar + close position walkthrough deferred | `AccountPanel.tsx`, `AccountMarginSummary.tsx`, `ClosePositionConfirmModal.tsx`, `accountPanelHeader.ts`, `closePositionDraft.ts`, tests |
| Script depth — Phase 3 | Host `request.series` MTF/MS under budgets; close-of-bar alignment; SDK → `edge-indicator-sdk-4`; fixtures `request-htf-sma`, `request-dual-symbol` | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 51 passed (51)`; **Packages:** `lint:package-boundaries` + `typecheck:packages` + `build:packages` passed; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** HTF SMA + dual-symbol spread walkthrough deferred | `packages/chart-core/src/{scriptContracts,scriptSeriesAlign,scriptSeriesRequest,scriptSeriesFingerprint,scriptFixtures}.ts`, `packages/indicator-runtime/src/{executeArtifact,compileScript,guestTaBootstrap}.ts`, `packages/chart-react/src/engine/{scriptSeriesPipeline,scriptResultCoordinator,scriptRuntimeWorkerClient}.ts`, `src/lib/chart/scriptSeriesResolver.ts`, `src/app/components/EdgeChart.tsx`, docs |
| Script depth — Phase 2 | Markers, bgcolor, barcolor, richer series styles via declarative plots; `SCRIPT_SDK_VERSION` → `edge-indicator-sdk-3`; Canvas draw + legend/scale/WebGL gates; three golden fixtures | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 52 passed (52)`; **Packages:** `lint:package-boundaries` + `typecheck:packages` + `build:packages` passed; **Build:** `npm run build` blocked by pre-existing `AlertsConfigPane.tsx` `EdgeButton` variant error (unrelated); **Architecture review:** self-review **Passed**; **App-level:** `?scriptFixture=all` marker/bgcolor/stepline walkthrough deferred | `packages/chart-core/src/{scriptContracts,scriptFixtures,legend/types,indicators/draw}.ts`, `packages/chart-react/src/engine/{scriptBarcolor,indicatorScale,webgl/indicatorGeometry}.ts`, `packages/indicator-runtime/src/compileScript.ts`, `docs/chart/{script-examples,features}.md`, `docs/roadmaps/script-depth-roadmap.md`, `packages/indicator-runtime/ARCHITECTURE.md` |
| Script depth — Phase 1 | Expanded `ta.*` helpers (movers, composites, oscillators, glue); `SCRIPT_SDK_VERSION` → `edge-indicator-sdk-2`; Phase 1 golden fixtures + docs | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 59 passed (59)`; **Packages:** `lint:package-boundaries` + `typecheck:packages` + `build:packages` passed; **Startup:** `Test Files 3 passed (3)`, `Tests 26 passed (26)`; **Build:** `npm run build` blocked by pre-existing `adoptServerJournalTrades.ts` type error; **Architecture review:** self-review **Passed**; **App-level:** Stoch/CCI script walkthrough deferred | `packages/indicator-runtime/src/{taSdk,guestTaBootstrap,compileScript}.ts`, `packages/chart-core/src/{scriptContracts,scriptFixtures}.ts`, `docs/chart/{script-examples,features}.md`, `docs/roadmaps/script-depth-roadmap.md`, `packages/indicator-runtime/ARCHITECTURE.md` |
| Script depth — Phase 0 | Pine→Edge capability inventory + additive SDK/plot extension rules + reserved depth fixture slots; host/guest TA parity test; no runtime behavior change | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)`; **Startup:** `Test Files 3 passed (3)`, `Tests 26 passed (26)`; **Architecture review:** self-review **Passed**; **App-level:** N/A (docs/contracts only) | `docs/roadmaps/script-depth-roadmap.md`, `packages/indicator-runtime/ARCHITECTURE.md`, `packages/chart-core/src/{scriptContracts,scriptFixtures}.ts`, `packages/indicator-runtime/src/taSdk.test.ts`, `docs/chart/{script-examples,features,tradingview-reference}.md` |
| Journal trades column configurator | Columns popover toggles visibility + drag-reorder; order/visibility/pageSize in localStorage; density picker removed (always compact) | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 59 passed (59)`; **Architecture review:** self-review **Passed**; **App-level:** Columns reorder + reload walkthrough deferred | `journalTradesTableControls.ts`, `JournalTradesTableControls.tsx`, `JournalTradesView.tsx`, `JournalTradesTable.tsx`, `ColumnPickerPopover.tsx`, tests, `journal/ARCHITECTURE.md`, `design-system/ARCHITECTURE.md` |
| Trade chart forks | Attach editable live chart fork to journal trade (markup + screenshot); chart menu attach + trade detail capture/open; modal fork with live feed, entry/exit markers, debounced save, reset-to-capture; isolated from workspace | **Passing** | **Focused:** `Test Files 47 passed (47)`, `Tests 240 passed (240)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 8.1s`); **Architecture review:** self-review **Passed**; **App-level:** attach/open fork walkthrough deferred | `0013_journal_trade_chart_snapshots.sql`, `chartSnapshotValidation.ts`, `journalChartSnapshotRepository.ts`, `localChartSnapshotStore.ts`, `captureTradeChartFork.ts`, `AttachJournalTradeModal.tsx`, `JournalTradeChartSnapshots.tsx`, `TradeChartForkModal.tsx`, `ChartSnapshotMenu.tsx`, `ChartCell.tsx`, `journalClient.ts`, `journal/ARCHITECTURE.md` |
| Journal trade detail UX redesign | Detail drawer shows screenshot hero + entry/exit/P&L outcome + readable fills; header symbol opens chart; Save notes only footer CTA | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 13 passed (13)`; **Architecture review:** self-review **Passed**; **App-level:** drawer walkthrough deferred | `JournalTradeDetail.tsx`, `JournalTradeDetailDrawer.tsx`, `JournalTradeScreenshots.tsx`, `JournalTradeDetailHeaderTitle.tsx`, `journalTradeDetailTitle.ts`, `EdgeSlideOver.tsx`, tests, `journal/ARCHITECTURE.md` |
| Scripts Monaco editor | Scripts tile source uses Monaco TypeScript highlighting; Run/Save/diagnostics unchanged | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 3 passed (3)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 8.2s`); **Startup:** `Test Files 3 passed (3)`, `Tests 26 passed (26)`; **Architecture review:** self-review **Passed**; **App-level:** `/workspace` Scripts tile edit/Run/Save walkthrough deferred | `MonacoScriptEditor.tsx`, `ScriptEditorPane.tsx`, `ScriptsTileSurface.test.tsx`, `package.json`, `features.md`, `typescript-indicator-scripting-roadmap.md` |
| Duplicate live tip candle fix | Provider tip remapping (old timestamp gone) emits `replace-latest` not `append`; tip replace keeps one bar; full-interval-ahead replace applied as append so load/poll tip desync does not drop a closed bar | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 42 passed (42)` (`streamDiff.test.ts`, `useChartDataFeed.test.ts`, `pollStreamAdapter.test.ts`, `series.test.ts`); **Architecture review:** self-review **Passed**; **App-level:** live remapping walkthrough deferred | `streamDiff.ts`, `packages/chart-core/src/series.ts`, `useChartDataFeed.ts`, `chartDataFeed/ARCHITECTURE.md` |
| Journal trade screenshots | Attach one or more images per trade (upload/paste/chart capture); Postgres + filesystem; gallery in trade detail panel; IndexedDB fallback | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 8 passed (8)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** attach/persist/delete walkthrough deferred | `0012_journal_trade_screenshots.sql`, `screenshotValidation.ts`, `screenshotStorage.ts`, `journalScreenshotRepository.ts`, `JournalTradeScreenshots.tsx`, `localScreenshotStore.ts`, `journal/ARCHITECTURE.md` |
| API client efficiency (ROI track) | Short poll ranges for live candles; single overlay events fetch; AI heartbeat every 45s decoupled from long-poll; batched watchlist fundamentals; coalesced candle/quote POSTs + abort on chart input change | **Passing** | **Focused:** `Test Files 16 passed (16)`, `Tests 70 passed (70)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** poll traffic + batch fundamentals + MCP session walkthrough deferred | `chartDataFeed/*`, `AiSessionBridge.tsx`, `api/fundamentals/route.ts`, `marketDataService.ts`, `fundamentalsClient.ts`, `useWatchlistFundamentalsCache.ts`, `packages/chart-core/src/dataSource.ts` |
| Chart overlay panel candle inset | Docked right overlay keeps chart row full-width; `ChartGrid` `paddingRight = overlayInsetPx` (resize preview included) so candles stay clear; floating panels no inset | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 13 passed (13)` (`chartOverlayInset`, `ChartGrid.responsive`, `SidebarPanelShell`); **Architecture review:** self-review **Passed**; **App-level:** `/chart` overlay walkthrough deferred | `chartOverlayInset.ts`, `ChartGrid.tsx`, `SidebarPanelWidthContext.tsx`, `useStockAppSidebarController.ts`, `SidebarPanelShell.tsx`, `design-system/ARCHITECTURE.md`, `docs/chart/features.md` |
| Live journal auto-sync | Portal + Edge live fills auto-ingest; Flex gap off lastExecTime/cold-start/reconcile; live open positions card; out-of-sync banner | **Paused** | **Focused:** `Test Files 7 passed (7)`, `Tests 29 passed (29)`; **Sidecar:** `Ran 2 tests OK`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** live ingest + Flex backfill deferred (`IB_FLEX_*` unset) | `tws-sidecar/main.py`, `brokerage/ingest/*`, `journal/reconcileJournalOpens.ts`, `JournalLivePositionsCard.tsx`, `JournalDashboardView.tsx`, `broker-ledger-roadmap.md` |
| IB Gateway soft-restart Sunday failure fix | Sunday soft restart failed auth; fix jts.ini TZ + Sunday cold restart + VNC ports | **Paused** | **Runtime:** both Gateways login complete; scheduled 11:45 PM cycle proof deferred | `ib-gateway/docker-compose.yml`, `.env.example`, `jts.ini` |
| Risk calculator NetLiquidation-only basis | Remove Account basis dropdown; percent risk always sizes against IB `NetLiquidation`; strip legacy `accountBasis` on load | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 40 passed (40)`; **Architecture review:** self-review **Passed** | `riskSettings.ts`, `RiskSettingsPanel.tsx`, `RiskSettingsProvider.tsx`, `riskSettings.test.ts`, `features.md`, `marketData/ARCHITECTURE.md` |
| Risk hold-to-stop margin | Inline **Liq** + Stop reachable / Margin call first under Margin (no Hold block); Show on chart toggle; dashed MARGIN CALL chart line while Risk tab open when toggle on; sizing unchanged | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 47 passed (47)`; **Architecture review:** self-review **Passed**; **App-level:** Liq + chart line walkthrough deferred | `RiskMarginCard.tsx`, `RiskSettingsPanel.tsx`, `marginContext.ts`, `marginCallOverlays.ts`, `RiskLiquidationOverlayContext.tsx`, `EdgeChart.tsx`, `features.md`, `marketData/ARCHITECTURE.md` |
| Scripts workspace surface | Workspace **Scripts** tile lists private My scripts with create/rename/duplicate/delete; in-tile TypeScript editor (Run/Save/diagnostics); Apply to chart; picker Edit/New opens Scripts tile | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 86 passed (86)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** `/workspace` Scripts tile walkthrough deferred | `appWorkspace/types.ts`, `scripts/*`, `ScriptsTileSurface.tsx`, `ScriptEditorPane.tsx`, `WorkspaceDriveContext.tsx`, `SurfaceHost.tsx`, `ChartCell.tsx`, `features.md`, `typescript-indicator-scripting-roadmap.md` |
| Risk calculator input sync UX | Replace Use last with refresh icons: Entry ↻ = last quote; levels ↻ re-links Entry+Stop from Long/Short; manual edit soft-unlinks (bind retained); budget hint caption-only | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 19 passed (19)`; **Architecture review:** self-review **Passed**; **App-level:** place Long → edit → levels refresh walkthrough deferred | `RiskPositionBindingContext.tsx`, `useRiskDrawingBinding.ts`, `RiskSettingsPanel.tsx`, tests, `docs/chart/features.md` |
| Risk Trade Size card | Merged Shares+Margin Trade size card: stacked util bar (existing then this trade), plain `$left · status`, IB technicals in Details; sizing unchanged | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 35 passed (35)`; **Architecture review:** self-review **Passed**; **App-level:** merged card + Details walkthrough deferred | `marginContext.ts`, `RiskMarginCard.tsx`, `RiskSettingsPanel.tsx`, `marketData/ARCHITECTURE.md`, `docs/chart/features.md` |
| Compact symbol search chrome | Chart symbol trigger shares compact bordered field + trailing search icon with journal Exact symbol; discovery-dialog vs exact-filter semantics unchanged | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 21 passed (21)`; **Architecture review:** self-review **Passed**; **App-level:** chart trigger + journal Exact symbol spot walkthrough deferred | `CompactSearchFieldShell.tsx`, `SymbolSearchTrigger.tsx`, `JournalScopeBar.tsx`, `design-system/ARCHITECTURE.md` |
| Risk calculator margin context | Display-only margin card under hero shares: current IB util + Init/Excess/Available; debounced MKT what-if Init/Maint Δ, projected util, headroom, soft Over/Tight/OK; sizing unchanged | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 28 passed (28)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** margin vs Trade preview walkthrough deferred | `marginContext.ts`, `whatIfClient.ts`, `useRiskMarginContext.ts`, `RiskMarginCard.tsx`, `RiskSettingsPanel.tsx`, `marketData/ARCHITECTURE.md`, `docs/chart/features.md` |
| Journal chrome density + underline tabs | Journal tile one toolbar row (underline Dashboard/Trades + period/symbol/filters); symbol field trailing search icon; standard density two summary cards per row | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 60 passed (60)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.8s`); **Architecture review:** self-review **Passed**; **App-level:** `/workspace` journal tile merged chrome walkthrough deferred | `EdgeUnderlineTabs.tsx`, `JournalViewTabs.tsx`, `JournalTileViewContext.tsx`, `JournalTileNav.tsx`, `JournalModuleHeader.tsx`, `JournalScopeBar.tsx`, `tileDensity.ts`, `design-system/ARCHITECTURE.md`, `journal/ARCHITECTURE.md`, `appWorkspace/ARCHITECTURE.md` |
| Symbol search recent charts | Empty search query lists up to 12 MRU chart symbols from localStorage; typed query still uses Yahoo search; chart visits recorded on apply/back/forward | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 17 passed (17)`; **Architecture review:** self-review **Passed**; **App-level:** watchlist Add symbol + chart clear-query recents walkthrough deferred | `recentSymbols.ts`, `useSymbolSearch.ts`, `SymbolSearchDialog.tsx`, `useStockAppLayoutController.ts`, `design-system/ARCHITECTURE.md`, `docs/chart/features.md` |
| Risk calculator redesign | Result-first Risk calculator panel (hero shares, trade levels, risk budget); no fallback/manual capital; `$ absolute` default; calculator rail icon; legacy settings migrated | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 38 passed (38)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** Risk calculator walkthrough deferred | `riskSettings.ts`, `RiskSettingsPanel.tsx`, `ChartHeaderIcons.tsx`, `registry.tsx`, `RiskSettingsProvider.tsx`, `marketData/ARCHITECTURE.md`, `docs/chart/features.md` |
| Chart modal workspace containment | Chart `EdgeModalShell` dialogs center within the chart tile (not full workspace) via `ModalContainmentProvider` on StockApp shell | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 6 passed (6)`; **App-level:** `/workspace` symbol search → `data-modal-containment="parent"`, centered in chart tile, `overflowsTile: false`; **Architecture review:** self-review **Passed** | `ModalContainmentContext.tsx`, `EdgeModalShell.tsx`, `AppProviders.tsx`, `styles.ts`, `design-system/ARCHITECTURE.md` |
| Risk panel position drawing bind | Newest long/short on active chart auto-binds Risk Position size entry/stop; live sync while linked; manual Entry/Stop soft-unlinks (bind retained; levels refresh re-links); drawing delete keeps last values; next placement rebinds | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.9s`); **Architecture review:** self-review **Passed**; **App-level:** place Long → Risk sync + drag + manual override walkthrough deferred | `riskPositionBinding.ts`, `RiskPositionBindingContext.tsx`, `useRiskDrawingBinding.ts`, `RiskSettingsPanel.tsx`, `ChartCell.tsx`, `AppProviders.tsx`, `marketData/ARCHITECTURE.md`, `docs/chart/features.md` |
| Border-legend select labels | Labeled dropdowns show category on top outline (border-legend) in journal, screener, and app header; shared `EdgeBorderLabeledControl`; selection semantics unchanged | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 43 passed (43)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.8s`); **Architecture review:** self-review **Passed**; **App-level:** Journal Period / screener Limit / header Account+Data rim-label spot walkthrough deferred | `EdgeBorderLabeledControl.tsx`, `EdgeSelect.tsx`, `styles.ts`, `JournalFilterDrawer.tsx`, `ScreenerScreensBody.tsx`, `QueryBuilder.tsx`, `AccountPickerMenu.tsx`, `MarketDataConnectionMenu.tsx`, `design-system/ARCHITECTURE.md` |
| DB-first normalized My scripts | Postgres owns My scripts/revisions; `/api/me/scripts*` resource API; server revision hash; async library port; legacy import; browser cache only | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 14 passed (14)`; **Build:** `npm run build` passed; **Full:** `Test Files 537 passed (537)`, `Tests 3232 passed (3232)`, `npm run check` exit **0**; **Architecture review:** self-review **Passed**; **App-level:** create/save/reload/apply walkthrough deferred | `0010_user_scripts_normalized.sql`, `scriptsRepository.ts`, `src/app/api/me/scripts/`, `scriptsClient.ts`, `ScriptLibraryContext.tsx`, `indicatorScripts.ts`, `persistence/ARCHITECTURE.md`, `docs/chart/features.md` |
| Chart clock app-default timezone bake-in fix | Chart clock inherits Application default timezone; settings/save paths omit inherited TZ; legacy factory UTC stripped on mount/load so it cannot override the app default | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 52 passed (52)`; **Packages:** `npm run build:packages` passed; **Build:** `✓ Compiled successfully in 6.2s` (typecheck failed on unrelated pre-existing `scriptsLegacyImport.ts`); **Architecture review:** self-review **Passed**; **App-level:** settings → clock inherit walkthrough deferred | `persistChartSettings`, `ChartCell.tsx`, `ChartSettingsModal.tsx`, `EdgeChart.tsx`, `stateMapping.ts`, `chartSettings.ts`, `presets/apply.ts`, `design-system/ARCHITECTURE.md` |
| EdgeSelect migration — Phases 0–5 | Shared chip/field `EdgeSelect` + segmented presets replace all native OS menus in app chrome; keyboard/focus via Edge popover; zero `<select>` under `src/app/components/` | **Passing** | **Focused:** `Test Files 10 passed (10)`, `Tests 109 passed (109)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.5s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`; **Full:** `Test Files 535 passed (535)`, `Tests 3227 passed (3227)`, `npm run check` exit **0**; **Architecture review:** self-review **Passed**; native-select ban test **0** violations | `EdgeSelect.tsx`, `design-system/index.ts`, `edge.test.ts`, journal/screener/heatmap/settings consumers, `ARCHITECTURE.md`, `component-standardization-roadmap.md` |
| App default timezone | Application settings sets default timezone; chart clock inherits app default unless per-chart override; legacy factory UTC stripped on layout load | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 75 passed (75)`; **Packages:** `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 6.3s`); **Architecture review:** self-review **Passed**; **App-level:** settings → clock inherit + per-chart override walkthrough deferred | `src/lib/app/appTimeZonePreference.ts`, `AppTimeZoneProvider.tsx`, `AppSettingsShell.tsx`, `ChartCell.tsx`, `ChartRangeBar.tsx`, `packages/chart-react/src/engine/chartSettings.ts`, `packages/chart-core/src/timeZone.ts`, `layoutStorage.ts`, `design-system/ARCHITECTURE.md` |
| Journal chrome Option A | Fixed **Journal** title row with Sync/Import + settings cog; Dashboard/Trades pills below; no Settings tab; no per-view Dashboard/Trades/Settings headers | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 8 passed (8)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** manual `/workspace` journal tile walkthrough deferred | `JournalTileNav.tsx`, `JournalModuleHeader.tsx`, `Journal{Dashboard,Trades,Settings}View.tsx`, `JournalSubNav.tsx`, `JournalTileSurface.test.tsx`, `design-system/ARCHITECTURE.md`, `journal/ARCHITECTURE.md`, `appWorkspace/ARCHITECTURE.md` |
| TypeScript indicator scripting — Phase 5B | Optional Postgres cloud sync for private My scripts; union merge preserves immutable revisions on conflict; IDB/localStorage fallback without Postgres; workspace stores script refs only | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 23 passed (23)`; **Build:** `npm run build` passed; **Startup:** `Test Files 3 passed (3)`, `Tests 26 passed (26)`; **Full:** `Test Files 531 passed (531)`, `Tests 3198 passed (3198)`, `npm run check` exit **0**; **Architecture review:** self-review **Passed**; **App-level:** multi-device conflict + `dev:lite` walkthrough deferred | `src/lib/persistence/{schemas/scriptLibrary.ts,repositories/scriptLibraryRepository.ts,client/scriptLibraryClient.ts,sync/useScriptLibraryRemoteSync.ts}`, `src/app/api/me/script-library/route.ts`, `src/db/migrations/0009_script_library.sql`, `src/lib/scriptLibrary/{merge.ts,ScriptLibraryContext.tsx}`, `src/lib/marketData/state/{catalog,governance,coverage}.ts`, `src/lib/persistence/ARCHITECTURE.md`, `docs/chart/features.md` |
| TypeScript indicator scripting — Phase 5A | AI drafts/compiles/repairs/saves/applies private My scripts via seven governed tools; authoring context + diagnostics; delete confirmation; generic chart tools return script refs only | **Passing** | **Focused:** `Test Files 13 passed (13)`, `Tests 50 passed (50)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.7s`); **Full:** `Test Files 528 passed (528)`, `Tests 3182 passed (3182)`, `npm run check` exit **0**; **Architecture review:** self-review **Passed**; **App-level:** in-app AI create/compile/apply walkthrough deferred | `src/lib/ai/{context,scriptAuthoringContext}.ts`, `src/lib/ai/tools/{indicatorScripts,indicatorSanitizer}.ts`, `ScriptLibraryContext.tsx`, `AiToolsProvider.tsx`, `docs/ai-tools-architecture.md`, `docs/chart/features.md` |
| TypeScript indicator scripting — Phase 4 | V1 completeness: all input kinds + conditional colors; typed error UX; TA starter SDK; debounce/worker recovery; a11y; V1 docs | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 42 passed (42)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.5s`); **Startup:** `npm run check:startup` exit **0**; **Full:** `Test Files 527 passed (527)`, `Tests 3173 passed (3173)`, `npm run check` exit **0**; **Architecture review:** self-review **Passed**; **App-level:** create/run/save/add/reload + `?scriptFixture=all` walkthrough deferred | `packages/chart-core/src/scriptContracts.ts`, `packages/indicator-runtime/src/{taSdk,sourceNormalize}.ts`, `packages/chart-react/src/engine/{scriptResultCoordinator,scriptRuntimeWorkerClient,legend}.ts`, `src/lib/scriptLibrary/`, `ScriptEditorModal.tsx`, `IndicatorPicker.tsx`, `docs/chart/script-examples.md` |
| Workspace splitter hit targets | Drag borders between workspace tiles to resize: side borders horizontal, top/bottom vertical; 8px hit target over 1px hairline with hover accent; Use + Edit modes | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 5 passed (5)`; **Architecture review:** self-review **Passed**; **App-level:** manual `/workspace` drag walkthrough deferred | `SplitPane.tsx`, `useSplitResize.ts`, `SplitPane.test.tsx`, `appWorkspace/ARCHITECTURE.md`, `design-system/ARCHITECTURE.md` |
| TypeScript indicator scripting — Phase 3 | Browser-local My scripts library + basic editor; picker add/edit/delete; chart preview/save/add/reload without Postgres; script settings from manifest | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 18 passed (18)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.4s`); **Architecture review:** self-review **Passed**; **App-level:** create/run/save/add/reload walkthrough deferred | `src/lib/scriptLibrary/`, `ScriptEditorModal.tsx`, `IndicatorPicker.tsx`, `IndicatorSettingsModal.tsx`, `ChartCell.tsx`, `packages/chart-core/src/scriptSourceResolver.ts`, `packages/chart-react/src/engine/{scriptResultCoordinator,useScriptResultCoordinator}.ts` |
| TypeScript indicator scripting — Phase 2 | One user script renders/updates on live chart via async coordinator + unified result provider; four golden plot fixtures; lifecycle states; built-ins unchanged | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 24 passed (24)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.8s`); **Architecture review:** self-review **Passed**; **App-level:** dev fixture injector (`?scriptFixture=all`) — manual four-plot walkthrough deferred | `packages/chart-react/src/engine/{scriptResultCoordinator,scriptRuntimeWorkerClient,indicatorResultProvider}.ts`, `packages/chart-core/src/scriptFixtureCatalog.ts`, `src/lib/chart/scriptFixtureDev.ts`, `src/lib/chartConfig.ts`, `src/lib/persistence/schemas/chartWorkspace.ts` |
| App context menu + layout Save | Control+right-click app menu (Edit layout, Order account, Market data, Settings, tile Change panel); edit-mode draft with Save (stays in edit) and Save-changes confirm on Done/Escape | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 42 passed (42)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.5s`); **Architecture review:** self-review **Passed**; **App-level:** manual `/workspace` gesture walkthrough deferred | `AppContextMenuProvider.tsx`, `AppChromeActionsProvider.tsx`, `AppWorkspaceContext.tsx`, `WorkspaceHeaderControls.tsx`, `LayoutEditConfirmModal.tsx`, `ContextMenu.tsx`, `TileFrame.tsx`, `appWorkspace/ARCHITECTURE.md` |
| TypeScript indicator scripting — Phase 1 | Headless compiler/runtime kernel compiles and executes private TS indicators with budgets, cancellation, last-valid stale/error, and adversarial denial — no UI | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 41 passed (41)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **App-level spike:** compile **33.8ms**, execute **95.2ms**, `Status: ready`; **Architecture review:** self-review **Passed** | `packages/chart-core/src/{scriptContracts,scriptFixtures}.ts`, `packages/indicator-runtime/src/{sourceNormalize,compilerService,runtimeHost,guestGlobals,guestLockdown,guestTaBootstrap,scriptSession}.ts`, `docs/roadmaps/typescript-indicator-scripting-roadmap.md`, `packages/indicator-runtime/ARCHITECTURE.md` |
| TypeScript indicator scripting — Phase 0 | Script contracts frozen; TypeScript compiles with diagnostics; QuickJS-WASM guest executes golden fixtures with budgets; one async result provider feeds draw/scale/legend/annotations/WebGL; built-ins stay sync behind adapter | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 27 passed (27)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Build:** `npm run build` passed; **App-level spike:** compile **18.1ms**, execute **97.0ms**, `Status: ready`; **Architecture review:** self-review **Passed** | `packages/chart-core/src/{scriptContracts,scriptFixtures}.ts`, `packages/indicator-runtime/`, `packages/chart-react/src/engine/indicatorResultProvider.ts`, `examples/indicator-runtime-spike/`, `docs/roadmaps/typescript-indicator-scripting-roadmap.md` |
| TypeScript indicator scripting roadmap | Private AI-generated TypeScript indicators compile inside a guest WASM VM and render declarative chart plots without an application rebuild or access to Canvas, DOM, network, filesystem, or app state | **Pending** | superseded by Phase 0 Active row; Phases 1+ remain pending | `docs/roadmaps/typescript-indicator-scripting-roadmap.md`, `docs/roadmaps/README.md`, `docs/ROADMAP.md`, `docs/chart/{features,indicator-foundation-plan}.md` |
| Data hardening — post-review fixes | Health diagnostics are sanitized; delivery and metrics state stay bounded; display degradation, provider health, readiness, timestamp anchors, and recovery outcomes remain honest; instrumentation cannot break delivery | **Passing** | **Focused:** `Test Files 8 passed (8)`, `Tests 79 passed (79)`; **Governance:** `datasets=43 providers=7 routes=61 exclusions=12 issues=0`; **Broader:** market data `Test Files 80 passed (80)`, `Tests 445 passed (445)`; Data Health `Test Files 5 passed (5)`, `Tests 15 passed (15)`; **Build:** `✓ Compiled successfully in 6.0s`, TypeScript `6.8s`; **Smoke dry-run:** `passed=0 failed=0 skipped=4`; **Architecture review:** self-review **Passed** | `src/lib/api/`, `src/lib/marketData/`, `src/app/api/market-data/health/`, `src/app/components/data-health/`, `scripts/run-data-provider-smoke.mts`, `src/lib/marketData/ARCHITECTURE.md` |
| Data inventory and state hardening — Phase 8 | Operators can measure delivery success, freshness, fallback duration, partial coverage, and recovery time through a bounded sanitized report; incomplete provider/dataset integrations fail deterministic checks | **Passing** | **Focused:** `Test Files 85 passed (85)`, `Tests 457 passed (457)`; **Governance:** `datasets=43 providers=7 routes=61 exclusions=12 issues=0`; **Fixture:** delivery/freshness `75.0% / 4`, partial `25.0% / 4`, fallback `3000ms / 1`, recovery `850ms / 1`; **Build:** `✓ Compiled successfully in 3.2s`; **Startup:** `Tests 26 passed (26)`; **App-level:** Yahoo candles `19`, TWS quotes `2`, retained `70/512`, fallback p95 `14094ms`, recovery p95 `1029ms`; **Full:** `Test Files 511 passed (511)`, `Tests 3044 passed (3044)`, `✓ Compiled successfully in 3.6s`; **Architecture review:** self-review **Passed** | `src/lib/marketData/state/`, `src/lib/marketData/providers/tws/recoverySession.ts`, `src/app/api/market-data/health/route.ts`, `src/lib/api/`, `scripts/`, `package.json`, `src/lib/marketData/ARCHITECTURE.md`, `docs/roadmaps/data-state-hardening-roadmap.md` |
| Data inventory and state hardening — Phase 7 | Every active catalog dataset is observed, demand-gated idle, inherited, or explicitly excluded; expanded families project sanitized readiness without changing Phase 6 badge semantics or trading gates | **Passing** | **Focused:** `Test Files 142 passed (142)`, `Tests 673 passed (673)`; **Coverage:** `unclassified: 0` (`active: 41`, `demandGated: 27`); **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **Architecture review:** self-review **Passed**; **App-level:** deferred; **Startup / Full:** exit **0**, **73** pre-existing status-doc validation issues | `src/lib/marketData/state/coverage.ts`, `src/lib/marketData/healthDatasets.ts`, `src/lib/marketData/health.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/brokerage/brokerageDelivery.ts`, `src/app/components/data-health/DataHealthProvider.tsx`, `src/lib/persistence/sync/persistenceSyncHealth.ts`, `src/lib/ai/marketDataPort.ts`, `docs/roadmaps/data-state-hardening-roadmap.md` |
| Data inventory and state hardening — Phase 6 | One canonical projection keeps active-data status, broker connections, incident, accessibility, and recovery consistent while diagnostics retain bounded detail | **Passing** | **Focused:** `Test Files 9 passed (9)`, `Tests 74 passed (74)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.3s`); **Architecture review:** self-review **Passed**; **App-level:** deterministic projection/UI regressions; live fault walkthrough deferred; **Startup / Full:** exit **0**, **73** pre-existing status-doc validation issues | `src/lib/marketData/healthProjection.ts`, `src/lib/marketData/health.ts`, `src/app/api/market-data/health/route.ts`, `src/app/components/data-health/`, `src/app/components/chart-cell/ChartOverlayStatusStack.tsx`, `docs/roadmaps/data-state-hardening-roadmap.md` |
| Data inventory and state hardening — Phase 5 | Connection truth, circuit protection, fallback, and recovery transition monotonically without UI oscillation while trading remains fail-safe on raw observations | **Passing** | **Focused:** `Test Files 10 passed (10)`, `Tests 82 passed (82)`; **Sidecar:** `Ran 1 test OK` (per-socket `connectionState`/`observedAt`); **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **Architecture review:** self-review **Passed**; **App-level:** deterministic fault-matrix regressions; live sidecar fault walkthrough deferred; **Startup / Full:** exit **0**, **74** pre-existing status-doc validation issues | `src/lib/marketData/state/connectionSupervisor.ts`, `src/lib/marketData/twsRecoveryContext.ts`, `src/lib/marketData/{health,twsRecoveryClient}.ts`, `src/lib/marketData/providers/tws/{recoverySession,recover,client}.ts`, `src/app/components/{data-health/DataHealthProvider,MarketDataProvider}.tsx`, `services/tws-sidecar/main.py`, `docs/roadmaps/data-state-hardening-roadmap.md` |
| Data inventory and state hardening — Phase 4 | Every observed dataset is evaluated by cadence/session-aware freshness, quality, completeness, provenance, and usage policy while trading remains fail-safe | **Passing** | **Focused:** `Test Files 20 passed (20)`, `Tests 203 passed (203)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review **Passed**; **App-level:** deterministic policy-matrix fixtures; live provider walkthrough deferred; **Startup / Full:** exit **0**, **75** pre-existing status-doc validation issues | `src/lib/marketData/trust/{policyEvaluator,dataTrust,enrichResponseMeta}.ts`, `src/lib/marketData/state/{policies,adapters}.ts`, `src/lib/marketData/marketCalendar.ts`, `src/lib/marketData/health.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/trading/tradingService.ts`, `src/lib/tradingSafety/tradingReadiness.ts`, `docs/roadmaps/data-state-hardening-roadmap.md` |
| Data inventory and state hardening — Phase 3 | Every selected market-data result emits bounded route, cache, transport, timestamp, coverage, and fallback evidence without changing provider order or Data Health UX | **Passing** | **Focused:** `Test Files 12 passed (12)`, `Tests 100 passed (100)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.4s`); **Architecture review:** self-review **Passed**; **Startup / Full:** not re-run — **71** pre-existing status-doc validation issues | `src/lib/marketData/state/{deliveryRegistry,routeCollector,serviceInstrumentation}.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/marketData/stream/createStreamSession.ts`, `packages/chart-core/src/dataSource.ts`, `src/app/components/MarketDataProvider.tsx`, `docs/roadmaps/data-state-hardening-roadmap.md` |
| App header, app-level theme, and settings icon | Header separates workspace, market data, order account, global theme, and app settings; one closed gear serves app/account/chart/screener/drawing settings; Risk remains a shield | **Passing** | **Focused:** settings-icon scope `Test Files 6 passed (6)`, `Tests 35 passed (35)`; prior header/build evidence: `Test Files 7 passed (7)`, `Tests 35 passed (35)`, `✓ Compiled successfully in 3.4s`; **App-level:** shared 16px/14px gear verified distinct from theme sun; **Architecture review:** self-review **Passed** | `src/app/components/chart-chrome/ChartHeaderIcons.tsx`, `src/app/components/{home,chart-chrome,screener}/`, `DrawingSelectionToolbar.tsx`, `src/lib/design-system/ARCHITECTURE.md` |
| Data inventory and state hardening — Phase 0 | Circuit bypass, connection observation, chart freshness, fallback, and recovery reported without false disconnect/stale labels | **Passing** | **Focused:** `Test Files 19 passed (19)`, `Tests 197 passed (197)`; **Packages:** `npm run typecheck:packages` passed, `npm run lint:package-boundaries` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.4s`); **Live probe:** `npm run tws:probe` → paper/live `gatewayConnected: true`; **Architecture review:** self-review **Passed**; **App-level:** controlled fault walkthrough deferred (deterministic regressions cover bypass/disconnect/refresh); **Startup / Full:** **71** pre-existing status-doc validation issues | `src/lib/marketData/{health,service/marketDataService,providers/tws/client,trust/dataTrust}.ts`, `src/lib/chartDataFeed/`, `packages/chart-core/src/dataSource.ts`, `src/app/components/{data-health,chart-cell,EdgeChart}.tsx`, `docs/roadmaps/data-state-hardening-roadmap.md` |
| Data inventory and state hardening — Phase 2 | Canonical typed contracts and bounded monotonic state represent catalog definitions, deliveries, capabilities, incidents, and projections without changing provider order or UX | **Passing** | **Focused:** `Test Files 10 passed (10)`, `Tests 86 passed (86)`; **Compatibility:** `Test Files 13 passed (13)`, `Tests 72 passed (72)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review **Passed**; **Startup / Full:** not re-run — **71** pre-existing status-doc validation issues | `src/lib/marketData/state/`, `src/lib/marketData/{health,healthRevision}.ts`, `src/lib/marketData/router/providerCapabilities.ts`, `src/app/api/market-data/health/route.ts`, `src/app/components/data-health/DataHealthProvider.tsx`, `src/lib/marketData/ARCHITECTURE.md`, `docs/roadmaps/data-state-hardening-roadmap.md` |
| Data inventory and state hardening — Phase 1 | Every production data path has one reviewed owner, policy, provider route, consumer set, and vocabulary mapping; unsupported claims classified | **Passing** | **App-level:** inventory audit adapters **8**, routes traced **73**, cataloged **38**, exclusions **35**, uncataloged active **0**; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` exit **1** — **71** pre-existing status-doc validation issues (unchanged baseline) | `docs/roadmaps/data-state-hardening-roadmap.md`, `src/lib/marketData/ARCHITECTURE.md` |
| App component standardization Phase 5 | High-traffic routes use shared Edge presentation and accessibility contracts; remaining compact/color exceptions are intentional; domain behavior unchanged | **Passing** | **Focused:** `Test Files 56 passed (56)`, `Tests 234 passed (234)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.5s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**, `smallTargets` **0/12**, Tailwind palette **0**; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` reports **71** pre-existing status-doc validation issues; **Full:** `npm run check` exit 0 with same **71** pre-existing status-doc validation issues | `src/lib/design-system/edge.test.ts`, `DrawingRenameModal.tsx`, `ChartSettingsModal.tsx`, `journal/JournalImportDialog.tsx`, `screener/QueryBuilder.tsx`, `home/{HomeJournalPanel,HomeResearchPanel}.tsx`, `watchlist/WatchlistControls.tsx`, `src/lib/design-system/ARCHITECTURE.md`, `docs/roadmaps/component-standardization-roadmap.md` |
| App component standardization Phase 4 | Loading, empty/error, filter-chip, and simple metric states share accessible Edge contracts without changing domain behavior | **Passing** | **Focused:** `Test Files 15 passed (15)`, `Tests 94 passed (94)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.7s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` reports **71** pre-existing status-doc validation issues | `src/app/components/design-system/{EdgeStatusRegion,EdgeFilterChip,EdgeMetricTile,EdgeEmptyState,EdgeButton}.tsx`, `screener/{ResultsTable,FilterChipSummary,ScreenerScreensBody}.tsx`, `options/OptionsChainTable.tsx`, `journal/{JournalScopeBar,JournalMetricGrid}.tsx`, `sidebar/panels/AccountPanel.tsx`, `chart-cell/{ChartErrorBoundary,ChartLoadingOverlay}.tsx`, `src/lib/design-system/ARCHITECTURE.md`, `docs/roadmaps/component-standardization-roadmap.md` |
| Watchlist off-hours quote freshness | Closed-market quotes stay healthy after successful SSE→REST recovery; failed delivery still degrades; session label separate from transport health | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 80 passed (80)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **Live probe:** `npm run tws:probe` → paper/live `gatewayConnected: true`; **App-level:** after-hours badge `Fallback · YAHOO · streaming` + health `watchlist_quotes` Yahoo fill (verification Phase 7.5); **Architecture review:** self-review **Passed** | `MarketDataProvider.tsx`, `DataHealthProvider.tsx`, `DataHealthMenu.tsx`, `src/lib/marketData/{health,trust/dataTrust,contracts/result,watchlistDeliveryFreshness}.ts`, `src/lib/marketData/ARCHITECTURE.md` |
| App component standardization Phase 3 | Menus, popovers, tabs, toggles, and table controls share one interaction contract; chart wrappers remain thin adapters | **Passing** | **Focused:** `Test Files 18 passed (18)`, `Tests 65 passed (65)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.3s`); **App-level:** journal Trades Columns popover opens; keyboard/dismiss contracts verified in focused interaction tests; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` reports **71** pre-existing status-doc validation issues | `src/app/components/design-system/{EdgeMenuItem,EdgeToggle,EdgeAnchoredPopover,ColumnPickerPopover}.tsx`, `chart-chrome/`, `screener/ColumnPicker.tsx`, `journal/JournalTradesTableControls.tsx`, `ChartSettingsModal.tsx`, `src/lib/design-system/ARCHITECTURE.md`, `docs/roadmaps/component-standardization-roadmap.md` |
| App component standardization Phase 2 | Chart and watchlist share one symbol-discovery hook/dialog; chart trigger is semantically correct; journal symbol field uses exact-filter presentation without discovery semantics | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 39 passed (39)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.3s`); **App-level:** chart symbol keyboard select + focus return, watchlist shared add dialog, journal exact-symbol uppercase/local filter verified on `/workspace`; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` blocked by **71** pre-existing status-doc validation issues | `src/app/components/design-system/symbol-search/`, `SearchBar.tsx`, `watchlist/WatchlistSearch.tsx`, `journal/JournalScopeBar.tsx`, `EdgeModalShell.tsx`, `src/lib/design-system/ARCHITECTURE.md`, `docs/roadmaps/component-standardization-roadmap.md` |
| App component standardization Phase 1 | App fields, selects, and touched icon/search controls use valid Edge tokens and consistent accessible states without changing product semantics | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 27 passed (27)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.3s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**, `smallTargets` **5/12**; production token ban test **0** violations; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` blocked by **71** pre-existing status-doc validation issues | `src/app/components/design-system/{styles,EdgeSearchInput}.tsx`, `src/lib/design-system/{edge.test.ts,ARCHITECTURE.md}`, `journal/JournalScopeBar.tsx`, `sidebar/panels/RiskSettingsPanel.tsx`, `app-workspace/TileFrame.tsx`, options/pattern/dev token consumers, `docs/roadmaps/component-standardization-roadmap.md` |
| IB Gateway native daily soft restart | Both Gateway containers perform an 11:45 PM ET native restart without a competing hard exit; sidecar reconnects both sockets on its worker event loop | **Blocked** | **Focused:** `Ran 4 tests in 0.007s` / `OK`; **Config:** live/paper resolve `AUTO_RESTART_TIME=11:45 PM`, `TZ=America/New_York`, cold/logoff blank; **Runtime:** both containers running with `restartCount=0`, both logins completed; **App-level:** paper/live sidecar connections `gatewayConnected: true`, `warnings: []`; **Blocker:** scheduled-cycle proof pending after 11:45 PM ET | `services/ib-gateway/docker-compose.yml`, `services/ib-gateway/.env.example`, `services/tws-sidecar/main.py`, `services/tws-sidecar/test_main.py`, `src/lib/marketData/ARCHITECTURE.md` |
| App component standardization Phase 0 | Post–Phase 4 audit reconciled; Phase 4 a11y contracts removed from backlog; frozen Phase 1–5 residual scope explicit in Task Contract | **Passing** | **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**, `smallTargets` **5/12**, raw hex **8**, Tailwind palette **5**; **Inventory:** undefined `--edge-*` **12 files** / **28 refs**; symbol search **2** flows; chart menus **8** files; custom modals **3** files; `EdgeToggle` **0** consumers; pulse skeletons **2** files; column pickers **2** impls; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` blocked by **72** pre-existing status-doc validation issues | `docs/roadmaps/component-standardization-roadmap.md`, `docs/roadmaps/app-ux-polish-roadmap.md`, `docs/roadmaps/README.md`, `docs/ux-baseline/ux-baseline-latest.json`, `docs/PROJECT-STATUS.md` |
| App UX polish Phase 4 | Consistent mouse/keyboard states, modal/menu focus management, canonical targets, accessible feedback, reduced-motion behavior | **Passing** | **Focused:** `Test Files 9 passed (9)`, `Tests 29 passed (29)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**, `chart-overlay-recover-tws` cleared from `smallTargets`, journal tile tabs **0/12** `smallTargets`; **Architecture review:** self-review Passed; **Startup:** `npm run check:startup` blocked by 71 pre-existing status-doc validation issues | `src/app/components/design-system/`, `src/app/components/chart-chrome/ChartAnchoredPopover.tsx`, `src/app/components/data-health/TwsRecoverButton.tsx`, `src/app/components/chart-cell/ChartErrorBoundary.tsx`, `src/app/globals.css`, `src/lib/design-system/ARCHITECTURE.md`, `docs/roadmaps/app-ux-polish-roadmap.md`, `docs/ux-baseline/ux-baseline-latest.json` |
| App UX polish Phase 3 | Workspace tile density (compact/standard/wide from tile width); screener/journal reflow in narrow tiles; journal tile segmented nav; panel spacing + compact control floors | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 44 passed (44)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.5s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**; **Architecture review:** self-review Passed; **Full:** `npm run check` not re-run (71 pre-existing status-doc validation issues) | `src/lib/responsive/tileDensity.ts`, `src/app/components/app-workspace/TileDensityContext.tsx`, `TileFrame.tsx`, `JournalTileSurface.tsx`, `JournalTileNav.tsx`, `screener/ScreenerScreensBody.tsx`, `journal/{JournalDashboardView,JournalSummaryCards,JournalMetricGrid,JournalScopeBar,JournalGlobalEmptyState}.tsx`, `design-system/EdgeSegmentedTabs.tsx`, `src/lib/design-system/ARCHITECTURE.md`, `src/lib/appWorkspace/ARCHITECTURE.md`, `docs/roadmaps/app-ux-polish-roadmap.md` |
| App UX polish Phase 2 | App shell + chart chrome hierarchy: grouped chart header clusters, range bar compact controls, rail active accent, OHLC/data-badge legibility, app header primary/secondary emphasis | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 41 passed (41)`; **Build:** `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**, P1 chart-chrome `smallTargets`/OHLC contrast cleared; **Architecture review:** self-review Passed; **Full:** `npm run check` blocked by 71 pre-existing status-doc validation issues | `src/app/components/chart-chrome/`, `ChartRangeBar.tsx`, `SearchBar.tsx`, `chart-icons/toolbarButtonStyles.ts`, `sidebar/`, `data-health/DataHealthButton.tsx`, `packages/chart-react/src/components/PriceLegendLayout.tsx`, `src/app/components/home/AppTopHeader.tsx`, `src/lib/design-system/ARCHITECTURE.md`, `docs/roadmaps/app-ux-polish-roadmap.md` |
| App UX polish Phase 1 | Shared visual foundation: typography roles (title ≥14px, body ≥12px), 4px spacing rhythm, shape radii, 32px compact / 36px standard controls, motion/elevation tokens, accessible primary CTA contrast; migrate audited header/workspace/home/screener defects | **Passing** | **Focused:** `Test Files 8 passed (8)`, `Tests 37 passed (37)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.6s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**, P0 header controls cleared from `smallTargets`, home contrast/titles cleared @1440; **Architecture review:** self-review Passed; **Full:** `npm run check` blocked by 71 pre-existing status-doc validation issues | `src/app/globals.css`, `src/lib/design-system/edge.ts`, `src/app/components/design-system/`, `src/app/components/home/`, `src/app/components/app-workspace/`, `src/lib/design-system/ARCHITECTURE.md`, `docs/roadmaps/app-ux-polish-roadmap.md` |
| App UX polish Phase 0 | Reproducible UX baseline: route/width audits, curated WebP screenshots, overflow/target-size/typography/contrast findings; no production behavior change | **Passing** | **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, `Raw hex files (components): 8`, `Tailwind palette files (components): 5`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); horizontal overflow **0/12**; findings in roadmap Phase 0 results | `scripts/run-ux-baseline.mts`, `docs/ux-baseline/ux-baseline-latest.json`, `docs/assets/ux-polish/phase-0/`, `docs/roadmaps/app-ux-polish-roadmap.md` |
| Midnight Chrome app palette | Pure-black chart stage; layered midnight app chrome; periwinkle interaction accent; turquoise/coral market semantics; legacy invalid color variables migrated | **Passing** | **Focused:** `Test Files 9 passed (9)`, `Tests 48 passed (48)`; **Build:** `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **App-level:** `/workspace` visual criteria `5/5` passed, CDP `positive #2dd4a8`, `negative #ff5d73`, `text #dce4f0`; **Architecture review:** self-review Passed; startup gate baseline blocked by 72 pre-existing status-doc validation issues | `src/app/globals.css`, `src/lib/design-system/edge.ts`, `packages/chart-core/src/themeTokens.ts`, `packages/chart-react/src/{engine,components}`, `src/app/components/{app-workspace,chart-chrome,pattern-library,trading}`, `DrawingToolGroup.tsx`, `DevPersistenceLoginBanner.tsx`, `src/lib/design-system/ARCHITECTURE.md` |
| Structural refactor Tier E2 (AI chart-tool split) | Two-products docs; shared chart-type/starter-indicator enums from chart-core; app `get_chart_state`/`set_chart_type` characterization tests; package execute path unchanged | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Build:** `npm run build:packages` passed; **Architecture review:** self-review Passed | `packages/chart-core/src/toolConstants.ts`, `packages/ai-tools-chart/ARCHITECTURE.md`, `packages/ai-tools-chart/src/tools.ts`, `src/lib/ai/schemas.ts`, `src/lib/ai/tools/chart.test.ts`, `docs/ai-tools-architecture.md`, `src/lib/ai/ARCHITECTURE.md`, `src/test/package-api-snapshot.test.ts` |
| Structural refactor Tier E1 (revisioned CRUD helpers) | Shared `revisionedLibraryRepository`/`revisionedLibraryClient`; watchlist/screener/chart-template thin adapters; sync/conflict behavior unchanged | **Passing** | **Focused:** `Test Files 15 passed (15)`, `Tests 52 passed (52)`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed | `revisionedLibraryRepository.ts`, `revisionedLibraryClient.ts`, `*LibraryRepository.ts`, `*LibraryClient.ts`, `persistence/ARCHITECTURE.md` |
| Structural refactor Tier D (chart runtime) | D1 ChartCell thin wiring + `chart-cell/*` hooks; D2 canvas render/gesture split; D3 EdgeChart coordinators; D4 drawing controller FSM/facade split; no UX change; package public API unchanged | **Passing** | **Focused:** `Test Files 11 passed (11)`, `Tests 76 passed (76)`; **Build:** `npm run build:packages` passed; **Boundaries:** `npm run lint:package-boundaries` passed; **Build:** `npm run build` passed; **Architecture review:** self-review Passed; app-level pan/zoom/draw smoke deferred | `src/app/components/chart-cell/*`, `ChartCell.tsx`, `ChartCell.patternCapture.test.tsx`, `packages/chart-react/src/engine/*`, `packages/chart-react/src/EdgeChart.tsx`, `packages/chart-react/src/use*.ts`, `packages/chart-react/src/drawing/*`, `docs/roadmaps/refactor-roadmap.md`, `src/lib/chart/ARCHITECTURE.md` |
| Structural refactor Tier C3 (design-system leftovers) | Seven chart chrome surfaces use EdgeModalShell/EdgeButton/`--edge-*` tokens; drawing paint hex preserved; no behavior change | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 11 passed (11)` (`BarReplay`, `TemplatePickerModal`, `ChartGoToModal`, `DrawingSelectionToolbar`); **Architecture review:** self-review Passed; app-level modal spot-check deferred | `BarReplay.tsx`, `ChartTimeZoneMenu.tsx`, `TemplatePickerModal.tsx`, `ChartGoToModal.tsx`, `DrawingSettingsModal.tsx`, `IndicatorSettingsModal.tsx`, `DrawingSelectionToolbar.tsx` |
| Structural refactor Tier C2 (Object Tree split) | `DataWindowTab` + tree row/section modules extracted; `ObjectTree` tab shell; active-chart `DataWindowProps`/actions unchanged | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 19 passed (19)` (`ObjectTreePanel.test.tsx`, `objectTreeModel.test.ts`); **Architecture review:** self-review Passed | `src/app/components/object-tree/*`, `ObjectTree.tsx`, `ActiveChartContext.tsx` |
| Structural refactor Tier C1 (StockApp providers) | `useStockAppBootstrap`, layout/sidebar controllers, `AppProviders`; provider order + hydrate gate preserved; StockApp thin composition root | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 23 passed (23)` (`StockApp.test.tsx`, `StockApp.bootstrap.test.tsx`, `src/lib/app/bootstrap/`); **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review Passed; app-level `/workspace` smoke deferred | `src/app/components/stock-app/*`, `StockApp.tsx` |
| Screener keyboard chart viewport drift | ↑/↓ through screener results keeps chart at fitted live-edge view; cache→fresh length growth rebuilds session viewport when indices were not shifted; workspace drive skips BroadcastChannel double-load | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 27 passed (27)`; **Architecture review:** self-review Passed | `packages/chart-react/src/engine/canvas.tsx`, `canvas.test.tsx`, `useScreenerReviewDrive.ts`, `src/lib/chart/ARCHITECTURE.md` |
| Series/interval consolidation (Tier B2) | Pure HA/merge/coverage/2h resample in `@edge/chart-core`; app + chart-react import from package; orphan `heikinAshi.ts` removed; no UX change | **Passing** | **Focused:** `Test Files 13 passed (13)`, `Tests 99 passed (99)` (incl. B1 sync); **Build:** `npm run build:packages` passed; **Boundaries:** `npm run lint:package-boundaries` passed; **Architecture review:** self-review Passed | `packages/chart-core/src/{series,interval}.ts`, `src/lib/chart/{series,intervalAdapter}.ts`, `useChartDataFeed.ts`, `priceAxisAnnotations.ts`, deleted `packages/chart-react/.../intervalAdapter.ts`, `src/lib/heikinAshi.ts` |
| Revision-sync consolidation (Tier B1) | One `useRevisionedRemoteSync` core; watchlist/screener/chart-template hooks are thin adapters; hydrate/debounce/conflict behavior unchanged | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 21 passed (21)` (`src/lib/persistence/sync/`); **Architecture review:** self-review Passed | `useRevisionedRemoteSync.ts`, `useWatchlistLibraryRemoteSync.ts`, `useScreenerLibraryRemoteSync.ts`, `useChartTemplateLibraryRemoteSync.ts`, `persistence/ARCHITECTURE.md` |
| Screener header Option B | Stock Screener title + Run in chrome; active screen subtitle; rail selection highlight; + Save current in Screens rail | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 19 passed (19)` | `ScreenerScreensBody.tsx`, `ScreenerPanelContent.tsx`, `summarizeScreen.ts` |
| Screener results scroll + compact view | Results region scrolls in-pane; compact List/Heat map select; denser toolbar; tile height chain fixed | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 29 passed (29)`; dialog scroll assertion passed | `ScreenerTileSurface.tsx`, `ScreenerResultsBody.tsx`, `ScreenerScreensBody.tsx`, `ResultsTable.tsx` |
| Dead code removal (Tier A) | Orphan chart duplicates become package re-exports; unused app Toolbar/legend components and unused Yahoo market-data port removed; no user-visible change | **Passing** | **Focused:** `Test Files 8 passed (8)`, `Tests 45 passed (45)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.9s`); **Architecture review:** self-review Passed | `src/lib/chart/indicators/draw.ts`, `src/lib/chart/drawings/measure.ts`, deleted `Toolbar.tsx`/`ChartLegendBar.tsx`/`PaneLegendBar.tsx`, `src/lib/ai/{marketDataPort,index}.ts`, `docs/ai-tools-architecture.md` |
| Screener results toolbar UX | One post-run toolbar: view toggle + count/Live + Watchlist/Export menus (secondary buttons); hide bulk actions at 0 results; phase detail on count tooltip | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 27 passed (27)` | `ResultsTable.tsx`, `EdgeButton.tsx`, `styles.ts`, `EdgeMenuItem.tsx` |
| Screener result-limit compact select | Custom query header: “Top N” select (50/100/200/500) before Run; no freeform LIMIT | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 16 passed (16)` | `ScreenerScreensBody.tsx`, `ScreenerDialog.test.tsx` |
| Screener Option A split-pane UX | Unified screener: Screens list (starters seeded) + active query + results; click/↑↓ drives sibling chart; no Review/Keepers sub-nav | **Passing** | **Focused:** `Test Files 15 passed (15)`, `Tests 69 passed (69)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review Passed; app-level walkthrough deferred | `ScreenerScreensBody.tsx`, `ScreenerTileSurface.tsx`, `ScreenerResultsBody.tsx`, `ResultsTable.tsx`, `useScreenerResultSelection.ts`, `screenStorage.ts`, `types.ts`, `screenerLibrary.ts`, `deepLinks.ts`, `docs/roadmaps/screener-roadmap.md` |
| Patterns library browse | Rail Patterns opens interactive captures; detail shows SVG + sections; Go to chart navigates symbol/interval/time; metadata PATCH for family/quality/notes; post-save View in Patterns | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Architecture review:** self-review Passed; **App-level:** `GET /api/pattern-library/records` count:2 `capture-phase5-review-1784681159` NVDA; Patterns rail → **`NVDA · 1d Jul 21, 2026 Review pullback`** (Go to chart Skipped floated panel) | `src/app/api/pattern-library/records/`, `src/app/components/pattern-library/*`, `sidebar/registry.tsx`, `PatternLibraryContext.tsx`, `ChartCell.tsx`, `patternLibrary/ARCHITECTURE.md`, `docs/chart/features.md` |
| Pattern Capture start/end + presets | Per-section start/end clicks (1-bar allowed); label via numbered presets (1–N keys) or custom text; pattern bounds from section min/max; save to pattern library | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 13 passed (13)`; **Architecture review:** self-review Passed | `src/lib/patternCapture/{fsm,presets,buildRecord}.ts`, `PatternCapturePanel.tsx`, `PatternCaptureOverlay.tsx`, `ChartCell.tsx` |
| Pattern Capture Mode | Historical multi-section bar-snapped capture → labeled sections → persist OHLCV + frozen SVG + metadata into personal pattern library; retrieval-ready | **Passing** | **Focused:** `Test Files 12 passed (12)`, `Tests 33 passed (33)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Architecture review:** self-review Passed; superseded by start/end + presets row | `src/lib/patternCapture/*`, `src/lib/patternLibrary/*`, `src/app/api/pattern-library/captures/`, `PatternCapturePanel.tsx`, `PatternCaptureOverlay.tsx`, `ChartCell.tsx`, `patternLibrary.ts`, shortcuts |
| Workspace pill header UX | Use mode: single workspace pill for switch/rename/new/duplicate; Edit mode: Editing label + Layout + Done; remove always-on name input/select/Save copy | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 30 passed (30)`; **Architecture review:** self-review Passed; app-level walkthrough deferred | `WorkspacePill.tsx`, `WorkspaceHeaderControls.tsx`, `commands.ts`, `AppWorkspaceContext.tsx`, `appWorkspace/ARCHITECTURE.md`, `design-system/ARCHITECTURE.md` |
| Workspace layout presets + empty-pane assign | Edit mode **Layout** picker (8 presets) → placeholder panes → per-pane Chart/Screener/Journal chooser; filled-tile reassign in edit header; freeform drag-dock retained | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 52 passed (52)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review Passed; app-level walkthrough deferred | `layoutPresets.ts`, `commands.ts`, `WorkspaceLayoutPresetPicker.tsx`, `PlaceholderTile.tsx`, `TileFrame.tsx`, `AppWorkspaceContext.tsx`, `WorkspaceHeaderControls.tsx`, `appWorkspace/ARCHITECTURE.md` |
| Broker ledger + sync | Server-side IB execution ingest into journal while Next+sidecar up; cursor + Flex gap backfill; account/position snapshots; client sync triggers server ingest; Data Health ledger age | **Passing** | **Functional plan complete.** **B2 PASS (RTH 2026-07-17):** paper F MKT `orderId=10190` `status:Filled` `permId=1041862008`; GET fills `before 46 after 47 new 1` `execId=00025b44.6a5abe6c.01.01` qty1 @14.32 (no Journal UI); cron later `duplicates:2`; status `lastSeenExecIds` includes that execId; `ledger sync 0m ago`. Prior: A1–A3/B1/B3–B5 pass; A4 unit 503; C1 skipped. **Focused:** `Test Files 4 passed (4)`, `Tests 13 passed (13)` | `broker-ledger-functional-test-plan.md`, ingest/*, cron route, JournalSyncProvider, DataHealthProvider |
| Personal pattern library (chart eye MVP) | Hybrid setup library: taxonomy, OHLCV features, retrieval, rules, three-arm bake-off, stress tests; AI tools for similarity + capture draft | **Passing** | **Focused:** `Test Files 9 passed (9)`, `Tests 23 passed (23)`; **CLI:** seed 100 records, bake-off recommends retrieval over VLM stub; **Architecture review:** self-review Passed | `src/lib/patternLibrary/*`, `patternLibrary.ts`, `data/pattern-library/`, `scripts/pattern-library-*.mts` |
| Browser tab live quote (remove chart tabs) | No in-chart tab strip; one layout per chart tile; primary chart (DFS left-first) publishes symbol + price + day % to browser tab title + direction favicon | **Passing** | **Focused:** `Test Files 9 passed (9)`, `Tests 53 passed (53)` (`browserTabQuote`, `primaryChartTile`, `workspaceTabs`, `StockApp`, `app-workspace/`); **Architecture review:** self-review Passed; app-level browser-tab walkthrough deferred | `browserTabQuote.ts`, `primaryChartTile.ts`, `PrimaryChartBrowserTabQuote.tsx`, `WorkspaceBrowserTabQuote.tsx`, `StockApp.tsx`, `ChartTileHost.tsx`, `ChartLayoutMenu.tsx`, `workspaceTabs.ts`, `appWorkspace/ARCHITECTURE.md` |
| App Workspace Use/Edit + shell-as-app | `/workspace` primary shell; Use vs Edit layout modes; module routes redirect to workspace deep links; rail focus/add; screener in-tile nav (Screens/Results/Review) without route escape; deep-link ingress idempotent | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 31 passed (31)`; fixed `Maximum update depth` on screener Screens/deep-link ingress (`applySurfaceFocusOrOpen`, stable `handleSurfaceIngress`); **Architecture review:** self-review Passed; app-level walkthrough deferred | `AppWorkspaceContext.tsx`, `commands.ts`, `workspace/page.tsx`, `ScreenerTileSurface.tsx`, `ScreenerReviewView.tsx`, `ScreenerKeepersBody.tsx`, `TileFrame.tsx`, `WorkspaceHeaderControls.tsx`, `AppWorkspaceNav.tsx`, `deepLinks.ts`, `lastModule.ts`, `ModuleToWorkspaceRedirect.tsx` |
| App Workspace Shell (Tiling Dock) | `/workspace` split-tree tiles; Chart/Screener/Journal surfaces; drag/save; in-process Review drive | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 29 passed (29)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); superseded by Use/Edit shell-as-app | `src/lib/appWorkspace/*`, `src/app/components/app-workspace/*`, `src/app/workspace/page.tsx` |
| Screener Review app | `/screener` Review home + keyboard queue drives Chart via BroadcastChannel; sidebar screener retained | **Passing** | **Focused:** `Test Files 14 passed (14)`, `Tests 95 passed (95)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.6s`); **Architecture review:** self-review Passed; app-level dual-window walkthrough deferred | `src/app/screener/*`, `src/lib/screener/review*`, `ScreenerDriveListener`, `ScreenerReviewView`, `HomeAppNav`, `screener-roadmap.md` |
| Liquid tradeable screener preset | Preset + QueryBuilder filter: price ≥ $5 and dollar volume (price × volume) ≥ $2M/day; local post-filter (FMP over-fetch) | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 37 passed (37)` (`presets`, `compileQuery`, `universeDailyStore`, `screenerParams`, `deriveDefaultSort`, `QueryBuilder`); **Architecture review:** self-review Passed | `presets.ts`, `request.ts`, `universeDailyStore.ts`, `compileQuery.ts`, `marketDataService.ts`, `ScreenerPanelContent.tsx`, `ARCHITECTURE.md` |
| Position stick entry to last price | Long/short entry follows live last price by default; stop/TP fixed; Settings toggle; entry drag disables stick | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 59 passed (59)`; packages rebuild passed; **Architecture review:** self-review Passed | `positionGeometry.ts`, `drawingStyles.ts`, `drawingSettingsCapabilities.ts`, `DrawingSettingsModal.tsx`, `useDrawingController.ts`, `EdgeChart.tsx` |
| Account display aliases | Custom account picker dropdown with right-side settings rail; display names in picker, Account panel, Trade form, Data Health; IB accountId stays execution identity | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 43 passed (43)`; **Architecture review:** self-review Passed; app-level alias reload walkthrough deferred | `AccountPickerMenu.tsx`, `AccountAliasEditor.tsx`, `accountAliases.ts`, `AccountAliasesProvider.tsx`, `AppTopHeader.tsx`, `AccountPanel.tsx`, `TradeOrderForm.tsx`, `trading/ARCHITECTURE.md` |
| Position tool instant place at last bar | Toolbar Long/Short places immediately at last-bar close; left edge on last bar; selected + cursor restored | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 40 passed (40)` (`positionGeometry`, `position_tool`, `drawingFsm`); packages rebuild passed | `positionGeometry.ts`, `position_tool.ts`, `drawingController.ts`, `useDrawingController.ts`, tests, `features.md`, `ARCHITECTURE.md` |
| Event rail transparent background | Event badge strip has no fill/border; inherits plot canvas background | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)`; `@edge/chart-react` rebuild passed | `renderer.ts`, `features.md`, `ARCHITECTURE.md` |
| Time axis date-label vertical margins | 24px bottom strip; date labels + crosshair time badge vertically centered (equal top/bottom margin) | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 56 passed (56)`; packages rebuild passed | `layout.ts`, `renderer.ts`, tests, `features.md` |
| Price axis quarter tick dashes | Three short axis-border dashes between labeled prices (quarter partitions); skip when majors <16px apart | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 26 passed (26)` (`priceScaleTransform`, `renderer`); packages rebuild passed | `priceScaleTransform.ts`, `renderer.ts`, tests, `features.md` |
| Long position empty-margin stretch fix | Near live-edge miss snaps to last bar; empty-margin extrapolates ts (no `t:0`); legacy `t:0`+virtual di clamps on render | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 44 passed (44)` (`drawingCoords`, `positionGeometry`, `position_tool`); runtime width ~118→~8.8px | `drawingCoords.ts`, `positionGeometry.ts`, related tests |
| Drawing hover grab cursor without selection | Hover drawing body or CP → `grab` without selecting first; locked CP → `not-allowed`; armed tool keeps crosshair | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 21 passed (21)` (`layout.test.ts`); packages rebuild passed | `packages/chart-core/src/layout.ts`, `packages/chart-react/src/engine/canvas.tsx`, `src/lib/chart/layout.test.ts`, `docs/chart/prereqs/gesture-bible.md` |
| Drawing selection toolbar clearance | Floating toolbar 28px clear of drawing; flips below when viewport lacks room above; edge-clamped | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 10 passed (10)` (`drawingSelectionToolbarPosition`, `DrawingSelectionToolbar`) | `drawingSelectionToolbarPosition.ts`, `DrawingSelectionToolbar.tsx`, related tests |
| Workspace tab live quote strip | Tab shows last price + day % (▲/▼; green/red/muted flat); SSE MarketQuote `price`/`changePercent` mapped; all tab symbols quoted via `extraSymbols` | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 16 passed (16)` (`mappers`, `WorkspaceTabBar`, `MarketDataProvider`) | `mappers.ts`, `MarketDataProvider.tsx`, `WorkspaceTabBar.tsx`, `StockApp.tsx`, related tests |
| Clear manual TWS reconnect | Reconnect when TWS down: chart top-right inline button + app header accounts alert; Data Health panel unchanged; sidecar reconnect resets ib-paper + ib-live | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 19 passed (19)`; Sidecar `ReconnectResetTests` 2 OK; **Architecture review:** self-review Passed; app-level Gateway stop/start walkthrough deferred | `TwsRecoverButton.tsx`, `ChartOverlayDataHealthRow.tsx`, `ChartOverlayStatusStack.tsx`, `AppTopHeader.tsx`, `DataHealthMenu.tsx`, `services/tws-sidecar/main.py`, `test_main.py`, `src/lib/marketData/ARCHITECTURE.md` |
| TWS external recovery spawn + auto-reconnect | User Reconnect spawns sidecar in `TWS_MANAGED=external` when port 8765 free (`TWS_MANAGED_BY=standalone`); explicit port-conflict copy; sidecar bounded auto-reconnect (2s→30s backoff, max 5) on IB 1100/502/504 + disconnect; `/status` exposes `autoReconnectAttempt` | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 21 passed (21)` (`recover.test.ts`, `managedMode.test.ts`); Sidecar `Ran 43 tests OK`; **Architecture review:** self-review Passed; app-level external-mode Reconnect walkthrough deferred | `recover.ts`, `managedMode.ts`, `recover.test.ts`, `managedMode.test.ts`, `services/tws-sidecar/main.py`, `test_main.py`, `src/lib/marketData/ARCHITECTURE.md` |
| Drawing control-point grab cursor | Hover selected drawing CP → `grab` (`not-allowed` if locked); drag → `grabbing` | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 36 passed (36)` (`layout`, `positionGeometry`); packages rebuild passed | `packages/chart-core/src/layout.ts`, `packages/chart-react/src/engine/canvas.tsx`, `src/lib/chart/layout.test.ts`, `docs/chart/prereqs/gesture-bible.md` |
| Workspace tabs TV-style chrome | Tab bar ~75% of chart header `h-9` (27px); tabs stretch full track height; monogram + symbol + ▲/▼ + price + % change + `/` layout title | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 4 passed (4)` (`WorkspaceTabBar.test.tsx`) | `WorkspaceTabBar.tsx`, `WorkspaceTabBar.test.tsx`, `design-system/ARCHITECTURE.md`, `docs/chart/features.md` |
| Position drawing TV-style 4 handles | Long/short position: 4 handles — TP left vertical-only, stop left vertical-only, entry-left moves entry + left edge, right edge width-only (no entry change) | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 29 passed (29)` (`positionGeometry`, `position_tool`); `@edge/chart-core` rebuild passed | `packages/chart-core/src/drawings/positionGeometry.ts`, `positionGeometry.test.ts`, `src/lib/chart/drawings/position_tool.test.ts`, `docs/chart/features.md`, `src/lib/chart/ARCHITECTURE.md` |
| Full-range chart horizontal pan | Pan slack = visible−1: first bar can reach right edge; last bar can reach left edge (replaces fixed ±40 buffer) | **Passing** | **Focused:** `Test Files 1 passed (1)`, `Tests 50 passed (50)` (`viewport.test.ts`); `@edge/chart-react` rebuild passed | `packages/chart-react/src/engine/viewport.ts`, `viewport.test.ts`, `docs/chart/features.md` |
| Trade setup panel (drawing-bound) | Right-click long/short position → Trade setup… opens Trade sidebar bound to `{cellId,drawingId}`; live entry/stop/TP sync from drawing points; other drawings ignored; header Trade opens unbound panel; entry-only MKT/LMT preview→submit | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 20 passed (20)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.4s`); **Architecture review:** self-review Passed; app-level drag→panel sync walkthrough deferred | `positionTradeSetup.ts`, `TradeSetupBindingContext.tsx`, `TradeOrderForm.tsx`, `TradeSidebarPanel.tsx`, `overlayContextMenu.ts`, `ChartCell.tsx`, `StockApp.tsx`, `registry.tsx`, `trading/ARCHITECTURE.md`, `design-system/ARCHITECTURE.md` |
| Full-width Edge logo header | Full-width top header with clickable `logo-full-light` → `/home`; left module rail below header without Home icon | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 9 passed (9)`; **App-level:** `/chart` Edge home link + Charts/Journal/Research rail; logo → `/home`; **Architecture review:** self-review Passed | `AppModuleShell.tsx`, `AppTopHeader.tsx`, `HomeAppNav.tsx`, related tests, `design-system/ARCHITECTURE.md` |
| Account panel open orders vs order history | Open orders = working only; Order history tab = all session orders (incl. Cancelled/Filled); Today's fills unchanged | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 22 passed (22)`; **App-level:** paper F `orderId=32` `status: Cancelled` on sidecar; **Architecture review:** self-review Passed | `orderStatus.ts`, `filterOrders.ts`, `AccountPanel.tsx`, `AccountPanel.test.tsx`, `ARCHITECTURE.md` |
| Account panel cancel for null-status orders | Show Cancel on Open orders when IB/sidecar omits status; map status from `trade.orderStatus` | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)`; **Sidecar:** `TradingModifyTests` 7 OK; **App-level:** paper F `orderId=32` `status: Cancelled`; **Architecture review:** self-review Passed | `orderStatus.ts`, `AccountPanel.tsx`, `AccountPanel.test.tsx`, `services/tws-sidecar/main.py`, `test_main.py` |
| Trade execution reliability track | Paper/live API bake; after-hours pre-trade readiness; Postgres `order_intents`; kill-switch proof; restart idempotency | **Passing** | **App-level:** paper LMT `orderId=24` cancel `Cancelled`; idempotency `24==24`; Postgres restart `orderId=31`; live `U25026894` LMT `orderId=9` `permId=703230888`; live GTC SPY qty1 `orderId=15` cancelled 2026-07-13 (open orders empty); **Focused:** `Test Files 14 passed (14)`, `Tests 81 passed (81)`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed; UI walkthrough + RTH fill still open | `dataTrust.ts`, `tradingService.ts`, `intentStore.ts`, `postgresIntentStore.ts`, `intentRepository.ts`, `0005_order_intents.sql`, `docs/trading-execution-roadmap.md` |
| Heat map data hardening | Movers join universe descriptors for marketCap/sector/volume/beta; screener changePercent alias+derive; heat-map quote cap 200; partial size-metric banner | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 31 passed (31)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Architecture review:** self-review Passed; app-level Gainers/Large-cap walkthrough deferred | `enrichMoversWithDescriptors.ts`, `marketDataService.ts`, `mappers.ts`, `apiScreenerFeed.ts`, `screenerHeatMapAdapter.ts`, `ResultsTable.tsx`, `useScreenerSessionModel.ts`, `ARCHITECTURE.md` |
| Heat map live config updates | Size / Color / Group toolbar changes re-layout and recolor immediately (adapter remaps metrics; view re-squarifies) | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 21 passed (21)` (`HeatMapView`, `ResultsTable`, `screenerHeatMapAdapter`); **App-level:** large-cap heat map sizeChanged/groupChanged/colorChanged true in browser | `HeatMapView.test.tsx`, `ResultsTable.test.tsx`, `screenerHeatMapAdapter.test.ts`, `src/lib/heatmap/ARCHITECTURE.md` |
| Screener scroll containment + heat map size contrast | Presets rail stays fixed while list/heat map scrolls; default size scale linear; Scale Linear/Log in heat map toolbar | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 41 passed (41)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **Architecture review:** self-review Passed; app-level scroll/size walkthrough deferred | `src/app/components/sidebar/SidebarPanelShell.tsx`, `src/app/components/screener/{ScreenerPanelContent,ResultsTable}.tsx`, `src/lib/heatmap/{defaults,squarify}.ts`, `src/app/components/heatmap/HeatMapToolbar.tsx`, `docs/screener-roadmap.md` |
| Screener heat map (reusable treemap foundation) | After a screen run, toggle List / Heat map; configure size, color, group; click cell loads chart; full result set treemap with live quotes on top 64 by size | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 27 passed (27)`; **ScreenerDialog:** `Test Files 1 passed (1)`, `Tests 14 passed (14)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.9s`); **Architecture review:** self-review Passed; app-level heat map walkthrough deferred | `src/lib/heatmap/`, `src/app/components/heatmap/`, `src/lib/screener/{screenerSession,screenerHeatMapAdapter,useScreenerSessionModel}.ts`, `src/app/components/screener/{ResultsTable,ScreenerPanelContent}.tsx`, `docs/screener-roadmap.md` |
| Dual connection — Phase D abstraction + Data Health split | TWS-only preference docs/tests; chart loadQuotes connectionId; sidecar `/status` connections map; Data Health Connections section (paper, live, preference); trust blocks display-only submit | **Passing** | **Focused:** Sidecar `Ran 36 tests OK`; App `Test Files 12 passed (12)`, `Tests 141 passed (141)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.7s`); **App-level:** Data Health Connections paper+live connected; data chip Live while account paper; quotes `ib-live` → `tws`; **Architecture review:** self-review Passed | `services/tws-sidecar/main.py`, `src/lib/marketData/health.ts`, `src/app/components/data-health/`, `docs/dual-connection-roadmap.md` |
| Right panel overlay layout | Docked right panel overlays chart from the right without changing chart width; resizable via left-edge handle; no dimmed backdrop; Escape + rail close; screener Expand/Pop out on overlay | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Architecture review:** self-review Passed; app-level overlay resize walkthrough deferred | `src/lib/responsive/responsiveLayout.ts`, `src/app/components/StockApp.tsx`, `src/app/components/sidebar/SidebarPanelShell.tsx`, `src/lib/design-system/ARCHITECTURE.md` |
| Screener layout + right-panel UX | Screener docked panel uses panel-aware max width + Expand/Collapse; never-run vs no-match results; edit/scan filter modes with chip summary; narrow horizontal preset chips; Limit beside Run | **Passing** | **Focused:** `Test Files 20 passed (20)`, `Tests 105 passed (105)`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed; app-level docked expand/scan walkthrough deferred | `src/lib/responsive/sidebarWidth.ts`, `src/app/components/sidebar/SidebarPanelWidthContext.tsx`, `src/app/components/StockApp.tsx`, `src/app/components/screener/{ScreenerPanelContent,ResultsTable,FilterChipSummary}.tsx`, `src/lib/screener/screenerSession.ts`, `docs/screener-roadmap.md` |
| TWS recovery supervisor | Recover IB Gateway/sidecar without stuck UI; quote SSE + warmup fail fast when sidecar stale/unhealthy; watchlist REST fallback; stale sidecar/version + port guidance | **Passing** | **Focused:** 55 tests passed; **App-level:** `docker stop edge-ib-gateway-paper` → recover `gatewayConnected:false` `recoveryPhase:sidecar_unresponsive`; gateway restart + sidecar reconnect → paper+live `gatewayConnected:true`; Reconnect TWS blocked when port 8765 owned by another dev instance; **Build:** `npm run build` passed | `src/lib/marketData/service/marketDataService.ts`, `src/lib/marketData/stream/`, `src/app/components/MarketDataProvider.tsx`, `services/tws-sidecar/main.py`, `scripts/tws-sidecar.sh`, `src/lib/marketData/providers/tws/`, `src/app/api/market-data/tws/recover/`, `src/lib/marketData/health.ts`, `src/lib/marketData/ARCHITECTURE.md` |
| TWS sidecar in-app recovery | Sidecar control plane stays non-blocking; worker/reconnect diagnostics; bounded reconnect; late-success finalization; Data Health phase progress during recovery | **Passing** | Superseded by clear manual TWS reconnect row; successor regression evidence: **19 tests passed**, sidecar `ReconnectResetTests` **2 OK** | `services/tws-sidecar/main.py`, `src/app/components/data-health/`, `ChartOverlayDataHealthRow.tsx`, `AppTopHeader.tsx` |
| TWS extended-hours price alignment | Chart current-price marker aligns with watchlist live quote; TWS candles opt into extended hours via `sessionMode`; chart labels pre/regular/post-market state | **Passing** | **Focused:** 36 tests passed; telemetry fix: 9 tests passed (`collector`, `MarketDataTelemetryPanel`); **Build:** `npm run build:packages` passed; **Fast:** `npm run check:startup` passed (26 tests); **App-level:** tab title **`NVDA 211.07 ▲ +1.82% · Edge`** tracks streaming badge quote (verification Phase 7.7) | `packages/chart-core/src/marketSession.ts`, `packages/chart-react/src/engine/`, `services/tws-sidecar/main.py`, `src/lib/marketData/`, `src/lib/chartDataFeed/`, `src/app/components/ChartCell.tsx`, `src/app/components/ChartSettingsModal.tsx`, `src/app/components/MarketDataProvider.tsx`, `src/app/components/dev/MarketDataTelemetryPanel.tsx`, `src/lib/marketData/telemetry/collector.ts`, `src/lib/marketData/ARCHITECTURE.md` |
| Data Health latency diagnostics | Data Health dropdown includes collapsible dev-only market-data latency diagnostics and replaces the fixed bottom-right telemetry overlay | **Passing** | **Focused:** 17 tests passed (data-health UI, telemetry panel, telemetry collector); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** latency expand **Skipped** (no telemetry samples post-gateway-reload); no fixed bottom-right overlay | `src/app/components/data-health/DataHealthLatencySection.tsx`, `src/app/components/data-health/MarketDataLatencyDiagnosticsView.tsx`, `src/app/components/data-health/DataHealthMenu.tsx`, `src/app/components/dev/MarketDataTelemetryPanel.tsx`, `src/app/components/StockApp.tsx`, `src/lib/marketData/telemetry/` |
| Options chain floating dialog | User opens options chain from chart header or sidebar launcher in a draggable overlay; sidebar no longer shows chain table; expiration tabs reload chain for selected date with pin and risk-ruler presets in popup | **Passing** | **Focused:** `Test Files 3 passed (3)`, `Tests 14 passed (14)` (`OptionsChainDialog`, `OptionsPanel`); **Startup:** `npm run check:startup` passed (26 tests); **App-level:** expiration switch **Skipped** (gateway outage during walk) | `src/app/components/options/`, `src/app/components/sidebar/panels/OptionsPanel.tsx`, `src/app/components/StockApp.tsx`, `src/app/components/chart-chrome/ChartHeaderBar.tsx`, `docs/PROJECT-STATUS.md` |
| Market context breadcrumb inline ETF crumbs + header symbol navigation | Sector/industry labels render as clickable related-ETF crumbs with controlled, viewport-aware tooltips; industry crumbs fall back to the sector ETF when no distinct industry ETF exists; Related dropdown popover removed; breadcrumb positioned closer below OHLCV ticker without overlap; symbol back/forward buttons sit immediately after ticker search in the header | **Passing** | **Focused:** 26 tests passed (`Tooltip`, `MarketContextBreadcrumb`, `ChartHeaderBar`, `ChartCell.legendSlot`); **Build:** `npm run build:packages` passed; **App-level:** `Technology · SemiconductorsXLKSMHSPY+2` + T chart `Communication Services · Telecommunications ServicesXLC` (verification Phase 7.7) | `src/app/components/Tooltip.tsx`, `src/app/components/Tooltip.test.tsx`, `src/app/components/chart-chrome/MarketContextBreadcrumb.tsx`, `src/app/components/chart-chrome/MarketContextBreadcrumb.test.tsx`, `src/app/components/chart-chrome/ChartHeaderBar.tsx`, `src/app/components/chart-chrome/SymbolNavArrows.tsx`, `src/app/components/ChartCell.tsx`, `src/app/components/StockApp.tsx`, `packages/chart-react/src/components/ChartLegendBar.tsx`, `src/lib/marketData/ARCHITECTURE.md`, `docs/PROJECT-STATUS.md` |
| Screener observability + baseline | Perf phases on screener route/service/technical filter; dev Screener tab in latency panel; `screener.fetch` client telemetry; before-optimization baseline in `docs/perf/screener-baseline-latest.json` | **Pending** | **Focused:** 48 tests passed; **Build:** `npm run build` passed; **Baseline:** `npm run perf:market-data` captured cold technical presets (~29–51s, candle p50 ~930–1617ms); app-level screener latency panel check not yet recorded; **Architecture review:** self-review Passed | `src/app/api/screener/run/route.ts`, `src/lib/marketData/service/marketDataService.ts`, `src/lib/screener/technicalFilter.ts`, `src/lib/marketData/telemetry/screenerPerf.ts`, `src/lib/chartDataFeed/apiScreenerFeed.ts`, `src/app/components/data-health/MarketDataLatencyDiagnosticsView.tsx`, `scripts/run-market-data-perf.mts`, `docs/perf/screener-baseline-latest.json` |
| Screener sort by leading rule + column picker | Results auto-sort by primary leading rule field on each run; cog dropdown adds/removes columns; sort override persists per saved screen; indicator columns surface for technical screens | **Passing** | **Focused:** 96 screener-related tests passed; **Build:** `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); **App-level:** Columns popover expanded + Phase 5.5 MACD **11** baseline (verification Phase 7.7); **Architecture review:** self-review Passed | `src/lib/screener/{types,screenStorage,deriveDefaultSort,indicatorColumns,exportResults}.ts`, `src/lib/persistence/schemas/screenerLibrary.ts`, `src/app/components/screener/{ScreenerProvider,ScreenerDialog,ResultsTable,ColumnPicker}.tsx`, `docs/screener-roadmap.md` |
| IB account tracking | Live IB account in Account sidebar panel: margin utilization bar, friendly header labels, position close actions, color-coded PnL, tabbed orders/fills, chart position overlays | **Passing** | **Focused:** `Test Files 4 passed (4)`, `Tests 29 passed (29)` (`AccountPanel`, `AccountMarginSummary`, `closePositionDraft`, `accountPanelHeader`); **Architecture review:** self-review **Passed**; **App-level:** live IB margin + close walkthrough deferred | `AccountPanel.tsx`, `AccountMarginSummary.tsx`, `ClosePositionConfirmModal.tsx`, `accountPanelHeader.ts`, `closePositionDraft.ts`, `positionOverlays.ts`, `AccountProvider.tsx`, `src/lib/brokerage/` |
| Screener dialog layout overhaul | Superseded by **Screener layout + right-panel UX** row — prior Run/⌘↵/collapse-all work retained in QueryBuilder | **Passing** | **Focused:** `Test Files 20 passed (20)`, `Tests 105 passed (105)` (screener layout row); **Build:** `npm run build` passed | `src/app/components/screener/QueryBuilder.tsx` |
| Screener technical rule builder (v1) | User constructs/edits custom technical screener rules in QueryBuilder using any implemented `@edge/chart-core` indicator; registry-aware `validateIndicatorRule` rejects invalid rules client- and server-side; presets and saved screens round-trip `query.technical`; named kinds read-only in UI | **Pending** | **Focused:** 71 tests passed (`compileQuery`, `validateIndicatorRule`, `QueryBuilder`, `ScreenerDialog`, `api/screener/run`); **Build:** `npm run build:packages` + `npm run build` passed; **Startup:** `npm run check:startup` passed (26 tests); app-level technical rule walkthrough not yet recorded; **Architecture review:** self-review Passed | `src/lib/screener/{compileQuery.ts,validateIndicatorRule.ts}`, `src/app/components/screener/{QueryBuilder.tsx,ScreenerDialog.tsx}`, `src/app/api/screener/run/route.ts`, `src/lib/marketData/ARCHITECTURE.md`, `docs/screener-roadmap.md` |
| Stock screener Phase 3 (custom indicators + comparison + summarize_screen) | Indicator-plugin screener rules via presets (MACD hist, BOLL %B, RSI); candle-fingerprint technical cache; `meta.indicatorValues` sidecar; multi-select comparison table; read-only `summarize_screen` AI tool | **Pending** | **Focused:** 49 screener/AI tests passed; **Build:** `npm run build:packages` + `npm run build` passed; app-level indicator preset + compare walkthrough not yet recorded; **Architecture review:** self-review Passed | `packages/chart-core/src/indicatorCompute.ts`, `src/lib/screener/{technicalMath,technicalFilter,presets,summarizeScreen}.ts`, `src/lib/marketData/schemas/request.ts`, `src/app/components/screener/{ComparisonView,ComparisonDialog}.tsx`, `src/lib/ai/tools/screener.ts`, `docs/screener-roadmap.md` |
| Dual connection — Phase C data preference split | Persisted `edge:marketData:connectionId`; sidecar MD routes accept `connectionId`; header data chip; pre-trade quotes follow order env; live account panel poll hint | **Passing** | **Focused:** Sidecar `Ran 35 tests OK`; App `Test Files 4 passed (4)`, `Tests 71 passed (71)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 4.2s`); **Architecture review:** self-review Passed; app-level live-data-while-paper-order walkthrough deferred | `services/tws-sidecar/main.py`, `dataConnectionPreference.ts`, `MarketDataProvider.tsx`, `AppTopHeader.tsx`, `tradingService.ts`, `marketDataService.ts`, `ARCHITECTURE.md`, `dual-connection-roadmap.md` |
| Position 1R yard lines | Long/short position drawings show always-on left-edge 1R ticks with in-box `NR` labels in profit zone | **Passing** | **Focused:** `Test Files 2 passed (2)`, `Tests 29 passed (29)`; **Build:** `npm run build:packages` passed; **Architecture review:** self-review Passed; app-level chart walkthrough deferred | `positionGeometry.ts`, `position_tool.ts`, `positionGeometry.test.ts`, `features.md`, `ARCHITECTURE.md` |
| Dual connection — Phase B account discovery honesty | Sidecar `connectionId` on all account routes; `listAccounts` paper+live with offline live seed; no `(journal)` picker rows; journal scopes by account id | **Passing** | **Focused:** Sidecar `Ran 32 tests OK`; App `Test Files 5 passed (5)`, `Tests 29 passed (29)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.8s`); **Architecture review:** self-review Passed; app-level dual-port picker walkthrough deferred | `services/tws-sidecar/main.py`, `test_main.py`, `src/lib/trading/{types,tradingService,accountPickerOptions}.ts`, `AppTopHeader.tsx`, `TradeTicketModal.tsx`, `.env.example`, `ARCHITECTURE.md` |
| Dual connection — Phase A dual Gateway infra | Docker `TRADING_MODE=both` compose (4001/4002); `npm run ib:gateway:up|down`; sidecar honest `connectionId` routing | **Passing** | **Focused:** `Ran 26 tests OK`; **App-level (partial):** `ib-paper` → `DUP586813` HTTP 200; `ib-live` → HTTP 503; compose validates; A.5 dual-port app proof deferred on credentials | `services/ib-gateway/*`, `package.json`, `.env.example`, `docs/dual-connection-roadmap.md`, `src/lib/trading/ARCHITECTURE.md` |
| Account context wiring | Journal providers under `AccountProvider`; composite picker keys; journal-only accounts from fills; journal filter reacts to picker; trade ticket Gateway-only | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 23 passed (23)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`); **Architecture review:** self-review Passed; app-level journal/chart walkthrough deferred | `JournalModuleShell.tsx`, `JournalTradesProvider.nesting.test.tsx`, `AppTopHeader.tsx`, `accountPickerOptions.ts`, `AccountProvider.tsx`, `TradeTicketModal.tsx`, `filterTradesByAccount.ts`, `src/lib/journal/ARCHITECTURE.md`, `src/lib/trading/ARCHITECTURE.md` |
| Global account header + single account context | Persistent content-column header with `edge` + app-wide account picker; selecting account sets `environment`; trade modal/AccountPanel display-only; journal filtered by active account | **Passing** | **Focused:** `Test Files 6 passed (6)`, `Tests 26 passed (26)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.9s`); **Architecture review:** self-review Passed; nesting bug fixed in account context wiring row | `AppModuleShell.tsx`, `AppTopHeader.tsx`, `AccountProvider.tsx`, `TradeTicketModal.tsx`, `AccountPanel.tsx`, `JournalTradesProvider.tsx`, `filterTradesByAccount.ts`, `src/lib/trading/ARCHITECTURE.md`, `src/lib/design-system/ARCHITECTURE.md` |
| Trading execution — Phase 5 connection registry + paper/live | Connection registry (`ib-paper`/`ib-live`); dual sidecar Gateway sockets; global header account picker (replaces in-modal/panel Paper/Live toggle); `liveConfirmation: LIVE` on live mutations; stub second adapter | **Passing** | **Focused:** `Test Files 15 passed (15)`, `Tests 76 passed (76)`; **Sidecar:** `Ran 26 tests OK`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed; app-level paper/live walkthrough deferred | `src/lib/trading/connectionRegistry.ts`, `src/lib/trading/adapters/{ibTws,stub}.ts`, `src/lib/trading/tradingEnvironment.ts`, `services/tws-sidecar/main.py`, `TradeTicketModal.tsx`, `AccountPanel.tsx`, `AccountProvider.tsx`, `docs/trading-execution-roadmap.md`, `src/lib/trading/ARCHITECTURE.md` |
| Trading execution — Phase 4 UI + journal | Chart trade ticket + what-if confirm; AccountPanel cancel on `ordersForActiveAccount`; journal `orderRef` correlation; AI `preview_order`/`place_order` with mandatory confirmation | **Passing** | **Focused:** `Test Files 7 passed (7)`, `Tests 36 passed (36)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`); **Architecture review:** self-review Passed; app-level paper walkthrough deferred | `src/lib/trading/tradingClient.ts`, `src/app/components/trading/TradeTicketModal.tsx`, `src/app/components/chart-chrome/ChartHeaderBar.tsx`, `src/app/components/sidebar/panels/AccountPanel.tsx`, `src/lib/journal/correlateOrderRef.ts`, `src/lib/ai/tools/trading.ts`, `src/lib/ai/tradingPort.ts`, `docs/trading-execution-roadmap.md` |
| Trading execution — Phase 3 stops + safety | STP/STP LMT preview+submit; previewIntentId 30s expiry; short-sale hard block; PDT soft warning; `EDGE_TRADING_KILL_SWITCH`; audit log | **Passing** | **Focused:** `Test Files 10 passed (10)`, `Tests 52 passed (52)`; **Sidecar:** `Ran 25 tests OK`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`); **Architecture review:** self-review Passed | `src/lib/trading/{types,validateOrder,safetyGuards,auditLog,tradingService}.ts`, `src/lib/trading/adapters/ibTws.ts`, `services/tws-sidecar/main.py`, `services/tws-sidecar/test_main.py`, `src/app/api/trading/**`, `.env.example`, `src/lib/trading/ARCHITECTURE.md`, `docs/trading-execution-roadmap.md` |
| Trading execution — Phase 2 manage + account | Modify MKT/LMT; active account persistence; account-scoped orders; lost-response reconciler | **Passing** | **Focused:** `Test Files 8 passed (8)`, `Tests 32 passed (32)`; **Sidecar:** `Ran 19 tests OK`; **Build:** `npm run build` passed; **App-level:** `defaultAccountId: DUP586813`; LMT `orderId: 38` `permId: 1306430116`; PATCH `lmtPrice: 8.95`; scoped orders include `orderRef`; cancel `status: "Cancelled"`; **Architecture review:** self-review Passed | `services/tws-sidecar/main.py`, `services/tws-sidecar/test_main.py`, `src/lib/trading/**`, `src/lib/brokerage/filterOrders.ts`, `src/app/api/trading/**`, `src/app/components/AccountProvider.tsx`, `docs/trading-execution-roadmap.md` |
| Trading execution — Phase 1 domain + adapter | Broker-neutral `TradingService`, `IbTwsTradingAdapter`, intent store, `/api/trading/*` on paper only (MKT/LMT); no UI | **Passing** | **Focused:** `Test Files 5 passed (5)`, `Tests 14 passed (14)`; **Build:** `npm run build` passed; **App-level:** preview MKT HTTP 200; MKT `orderId: 17` `permId: 1306430090`; LMT `orderId: 19` `permId: 1306430091`; cancel `status: "Cancelled"`; idempotent retry same intent; **Architecture review:** self-review Passed | `src/lib/trading/**`, `src/app/api/trading/**`, `src/lib/api/apiAuth.ts`, `src/lib/trading/ARCHITECTURE.md` |

Older Passing rows: [status-archive/](./status-archive/).

## Task Contract — App-level verification wave 2 — Phase 2

- **Status:** Closed **Passing** (2026-07-24) — Grok Copilot UX parity walks 2.1–2.4
- **Goal:** App-level proof of empty state, pill geometry, in-bar model menu, active thread chrome on `/copilot`
- **Track contract:** [Task Contract — Grok Copilot UX parity](#task-contract--grok-copilot-ux-parity)

## Task Contract — Grok Copilot UX parity

- **Status:** Phase 0–3 **Passing** (2026-07-24); Phases 4–5 **Pending**
- **Goal:** Match grok.com Copilot chat shell/composer across sidebar, `/copilot`, and tile; in-bar model picker (models only); keep agent/registry/confirms.
- **Delivered (Phase 0):** Live 1440 captures (empty, mode menu open, history logged-out gate); measured query-bar/menu CSS; signed-in UX inventory (§ G); keyboard matrix (§ H); token map (§ I); model chip rules (§ J); frozen Visual contract + resolved product questions; design-system Copilot alias pointer.
- **Delivered (Phase 1):** `CopilotShell` + `CopilotEmptyBrand` + `CopilotPromptLibrary`; host variants (`sidebar` / `page` / `tile`); empty hero (brand + centered composer + chips); minimal top chrome on empty; active thread keeps dense header; `.copilot-shell` CSS aliases in `globals.css`; `/copilot` module header removed.
- **Delivered (Phase 2):** Pill `query-bar` `CopilotComposer` (+ attach stub, model chip stub, circular ↑/stop); `--copilot-query-bar-*` token consumption; wide-host docked centering; `CopilotComposer.test.tsx`; header `EdgeSelect` retained until Phase 3.
- **Delivered (Phase 3):** In-bar model chip + `EdgeAnchoredPopover` menu (`--copilot-menu-*`); enabled models with checkmark + subtitle; `modelMenuSubtitle` helper; header `EdgeSelect` removed; `CopilotPanel` wires `setModelId`.
- **Verification (Phase 3):** **Focused:** `Test Files 3 passed (3)`, `Tests 26 passed (26)`; **Architecture review:** self-review **Passed**.
- **Blockers:** Authenticated grok.com screenshots deferred (no sign-in in capture session).
- **Next:** Phase 4 under WIP=1 — active thread chrome (history rail, Thoughts disclosure).

## Task Contract — Connections & providers

- **Status:** Active — Phase 0–4 **Passing** (2026-07-24); Phase 5 **Pending** (Path A chosen); Phases 6–7 **Pending**
- **Goal:** Productize broker/data management as **Connections + platform market data** (Settings console → preference store → ConfigSource → durable connections → connect path → optional BYO vault → multi-broker ledger).
- **Delivered (Phase 0–4):** Contracts, Settings console, provider prefs, ConfigSource, durable `connections` table + `/api/me/connections` — see roadmap + session log 2026-07-24.
- **Phase 5 decision (2026-07-24):** **Path A — hosted IB OAuth.** Connect in Settings; tokens server-side; `local_gateway` sidecar retained for self-host. Not Path B (second broker) or Path C (wizard only).
- **Blockers:** none
- **Next:** Activate Phase 5 under WIP=1 — IB OAuth adapter, Connect/Disconnect UI, account/trade path, trust gates (5.2–5.6).

## Task Contract — Security hardening

- **Status:** **Passing** (2026-07-24) — Phases 0–6 complete; track closed
- **Goal:** Fail-closed perimeter for trading/AI/pattern storage, then close High/Medium audit findings (operator secrets, Next advisories, session bridge, trading identity, tenant FKs, CSP/TLS, cookie lifetime, prompt boundaries).
- **Delivered (Phase 0):** C1 fail-closed API auth + `EDGE_API_AUTH_MODE=dev-open`; C2 proxy-safe IP; C3 HMAC `confirmationToken`; C4 pattern ID jail + Postgres-on **401**; CONSTRAINTS + architecture docs.
- **Delivered (Phase 1):** Open-dev bootstrap gate; local-errors production 404; cron secret or session only (H1, H3, H4).
- **Delivered (Phase 2):** `next@16.2.11` upgrade (H5 / CVE-2026-64642); `npm audit fix` safe patches; middleware + apiAuth regression green; build TS fixes for pre-existing strict-check failures.
- **Verification (Phase 2):** **Focused:** `Test Files 2 passed (2)`, `Tests 11 passed (11)`; **Build:** `npm run build` exit 0; `npm ls next` → `next@16.2.11`; **Audit:** residual High — postcss/sharp (Next transitive), undici (`@cursor/sdk`, no fix) — documented accept/defer; **Architecture review:** self-review **Passed**.
- **Delivered (Phase 3):** AI session bridge `bridgeSecret` + hijack **409**; trading mutate session/service gate (H2, H6).
- **Verification (Phase 3):** **Focused:** `Test Files 6 passed (6)`, `Tests 43 passed (43)`; **Architecture review:** self-review **Passed**.
- **Delivered (Phase 4):** M1 same-user FK ownership; M2 `safeHref` allowlist at schema/emit/render.
- **Verification (Phase 4):** **Focused:** `Test Files 5 passed (5)`, `Tests 14 passed (14)`; **Architecture review:** self-review **Passed**.
- **Delivered (Phase 5):** Enforced CSP + production HSTS (M3); IBKR TLS verify default on; non-loopback sidecar secret gate + stream auth header (M4).
- **Verification (Phase 5):** **Focused:** `Test Files 3 passed (3)`, `Tests 13 passed (13)`; **Build:** compile OK (`✓ Compiled successfully in 8.5s`); **App-level:** CSP header on `/`; **Architecture review:** self-review **Passed**.
- **Delivered (Phase 6):** M5 signed cookie `iat`/`jti` + 14-day server/browser TTL; legacy cookie reject; M6 `promptBoundaries` — snapshot as fenced untrusted user message, strip client system roles, 48k orchestrator content budget.
- **Verification (Phase 6):** **Focused:** `Test Files 5 passed (5)`, `Tests 31 passed (31)`; **Architecture review:** self-review **Passed**.
- **Blockers:** none
- **Next:** Track complete — activate next product WIP=1 when prioritized (identity/OAuth deferred).

## Task Contract — Trade management playbook

- **Status:** Phase 0 **Passing** (2026-07-24); Phase 1 **Passing** (2026-07-24); Phase 2 **Passing** (2026-07-24); Phase 3 **Passing** (2026-07-24); Phase 4 **Passing** (2026-07-24); Phase 5 **Passing** (2026-07-24); Phase 6 **Active**
- **Goal:** Post-fill Manage playbooks on Protect — Phase 1: attach + persist + chrome status; Phase 2+: server manager mutations; Phase 6: notify twin at manage levels.
- **Delivered (Phase 0):** `src/lib/trading/playbook/` — PositionPlan R lock, PlaybookTemplate/Rule/Instance schemas, 5 presets, `planPlaybookSteps`, conflict policy draft, Plan/Protect/Manage section in trading architecture.
- **Delivered (Phase 1):** `playbookInstanceStore` + migration `0029`; `SubmitBracketRequest` playbook fields; `TradingService.attachPlaybookAfterBracket`; `/api/trading/playbooks` list + detach; Trade ticket **Manage with…** picker; open-risk/Account status + Detach.
- **Delivered (Phase 2):** `runPlaybookEvaluation` + `/api/cron/playbook-evaluate`; BE/scale executors; migration `0030` + store `patch`; Pause/Resume/Skip API + open-risk/Account chrome.
- **Delivered (Phase 3):** `attachTrail` cancel+TRAIL; `playbookAutoManageStore` + migration `0031` + `/api/trading/playbooks/auto-manage`; live evaluator gates; `formatNextManageDistance` + Flatten now; `buildManualStopPausePatch` on manual stop modify.
- **Delivered (Phase 4):** OCO `SubmitProtectiveOcoRequest` playbook attach (armed); shared `ManagePlaybookPicker`; `manageLevels` price-axis markers; `playbookStopSync` stop-drag → `modifyOrder` + pause.
- **Delivered (Phase 5):** `playbookTemplateStore` + templates CRUD API; `templateSnapshot` on attach; `resolvePlaybookTemplateFromInstance`; `journal_trades.manage_playbook` + `syncManagePlaybookToJournal`; ManagePlaybookPicker library actions; JournalTradeDetail Manage timeline + adherence.
- **Verification (Phase 5):** pending closeout
- **Blockers:** none
- **Next:** Phase 5 harness closeout

## Task Contract — Research UX

- **Status:** Phase 0–6 **Passing** (2026-07-24)
- **Goal:** Evolve Edge toward research-first UX — Talk / Board / Desk densities; Research Session + Board; pinable Copilot artifacts; tiled Desk kept forever.
- **Delivered (Phase 0):** `src/lib/research/` — density model, session/card/link Zod sketches, ownership map, entry policy stub; `ARCHITECTURE.md`; pointers in persistence/ai/design-system architecture docs.
- **Delivered (Phase 1):** `densityNav.ts`, `DensitySwitcher`, `ResearchBoardStub`, home hub Talk/Board elevation; header density chrome on Talk/Board/Desk routes.
- **Delivered (Phase 2):** `artifactHint.ts`, `evidenceStore.ts`, chat artifact cards + Pin, `CopilotEvidenceRail` on Talk page, deep links via `openResearchCard.ts`.
- **Delivered (Phase 3):** `boardSessionStore.ts`, spatial Board at `/research`, pan/zoom canvas, card nodes, directed links, evidence Send to board.
- **Delivered (Phase 4):** live chart cards with focus/viewport mount policy; screener refresh + journal draft hosts; Board↔Desk promote/demote with `deskTileId` binding; `ChartTileBoardActions` Send to board.
- **Delivered (Phase 5):** `boardFocusStore.ts`, `researchBoardPort.ts`, six registry tools in `research.ts`; `ResearchBoardPort` on `ToolContext`; `BoardCanvas` syncs focus via `useSyncExternalStore`; confirm on `arrange_research_cards` + `remove_research_card`.
- **Verification (Phase 5):** **Focused:** `Test Files 10 passed (10)`, `Tests 54 passed (54)`; **Architecture review:** self-review **Passed**; **App-level:** Copilot board conductor walkthrough deferred (manual checklist in evidence file)
- **Blockers:** none
- **Next:** Phase 6 — Research Session persistence (cloud API + session list)

## Task Contract — Shared cache topology

- **Status:** Track **complete** (2026-07-24) — Phases 0–4 **Passing**; Phase 5 **Skipped** at N=1
- **Goal:** Make Redis the mandated production server cache for HotStore/DataCache — fail-loud in staging/prod, keep memory adapter for local/CI, close boot-order/key/ops/coordination gaps from Memory Phase 12.
- **Delivered (Phase 0):** Prod Node instance count **N=1** recorded; env/backend matrix + `EDGE_REQUIRE_REDIS` semantics in `.env.example`, `marketData/ARCHITECTURE.md`, `AGENTS.md`, `shared-cache-topology-roadmap.md`; Phase 5 trigger **Skipped** at N=1; supersede pointers on data-serving Phase 7 + Memory Phase 12 follow-up.
- **Delivered (Phase 1):** `isRedisRequired()` fail-loud; ephemeral sync fallback (no sticky memory on pre-init proxy touch); `enableOfflineQueue: false` when required; post-boot Redis fail-open + `markServerCacheDegraded()`; boot-order + require tests.
- **Delivered (Phase 2):** `getServerCacheHealthSnapshot()`; required `ServerHealthPayload.cache` on `/api/market-data/health`; fail-open redis ping; no `REDIS_URL` leak.
- **Delivered (Phase 3):** `redisKeys.ts` env/schema root (`edge:{env}:{schemaVersion}:md:…`); `EDGE_CACHE_ENV` override; HotStore/DataCache consumers off hard-coded prefixes; schema bump docs.
- **Delivered (Phase 4):** Compose Redis ops profile (`maxmemory` + `noeviction`, no persistence volume); deploy contract docs (AUTH/`rediss://`, dedicated co-located instance, operator flip checklist); CI parity job **Skipped** (no workflow per product decision).
- **Verification (Phase 4):** **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)`; compose `maxmemory-policy=noeviction`; **Architecture review:** self-review **Passed**; **App-level:** parity `redis is reachable: true`; HTTP health flip deferred to operator staging soak
- **Blockers:** none
- **Next:** Operator staging soak on Redis for one release cycle → prod flip with require-on

## Task Contract — Memory efficiency

- **Status:** Track **complete** (2026-07-24) — Phases 0–14 **Passing** including Phase 12 Redis (flagged; default memory)
- **Goal:** Bound resident market-data memory on client and Node; cut clone/GC pressure; stop multiplying full candle series across inactive charts — without changing chart correctness, trust labels, or offline-first persistence.
- **Delivered (Phase 0):** `npm run perf:memory` baseline script + `docs/perf/memory-baseline-latest.json`; retention/clone/dispose contract in marketData + chartDataFeed + chart architecture docs; frozen knob table in roadmap.
- **Delivered (Phase 1):** `RESIDENT_BAR_SOFT_MAX` + `trimResidentBars` in chart-core; trim on feed merge/loadMore/cache write + candle session prefetch/go-to; `adjustViewportForTrim`; background prefetch gated at soft max; `clearEphemeralMarketDataCaches` clears `chartClientCache`.
- **Delivered (Phase 2):** `live` prop wired ChartGrid → ChartCell → EdgeChart → `useChartDataFeed`; active cell on primary tile only streams; non-primary tiles and inactive cells keep snapshot; journal trade fork explicit `live` override.
- **Delivered (Phase 3):** `freezeCandleSeries` + shared-ref read/write in `chartClientCache`; sessionStorage gate (`CHART_CLIENT_SESSION_STORAGE_MAX_BARS` 2_000 / `MAX_BYTES` 2 MB); `writeMergedChartClientCache` returns stored frozen entry; `ClientTtlCache` large-array policy documented.
- **Delivered (Phase 4):** `DataCache` per-namespace max 256 + soft byte budgets + shared-ref reads; `HotStore` max 128 + soft bytes; `prepareServerSnapshot` / `evictMapUntilWithinBudget`; universe daily COW merge + lookback prune; IBKR `contractCache` max 512 with preferential strike/optInfo eviction; budgets exported from `ttlPolicy.ts`.
- **Delivered (Phase 5):** `computeTipStableCacheKey` + body/tip fingerprints; builtin compute cache overwrites one slot per identity under tip ticks; script coordinator tip-stable keys + tipRevision dirty re-run; `dispose` clears `cache` + `lastValidByInstance`; `sync` prunes removed instances; soft byte budget **16 MiB** on builtin/script caches; `legendFromOutputs` accepts precomputed series for script legend path.
- **Delivered (Phase 6):** `SeriesLayerCache` composite blit wired in `drawPaneLayers`; `canReuseSeriesCache` crosshair-only (viewport excluded); background pan blit (`viewport` removed from `BACKGROUND_INVALIDATING`); grow-only `GeometryBufferPool` on WebGL candle/indicator renderers; `BackgroundLayerCache`/`SeriesLayerCache`/`RenderScheduler` dispose on unmount.
- **Delivered (Phase 7):** `JournalTradesProvider` bounded trade window (`JOURNAL_PROVIDER_TRADE_LIMIT` 500 open+closed merge); compact fill-account index via `fetchJournalFillAccountIndex` + `/api/me/journal/fills/account-index`; `selectChatRequestMessages` (40 msgs / 4k content) on Copilot send; `chatRequestSchema` hard caps (64 msgs / 8k content).
- **Delivered (Phase 8):** `SurfaceHost` dynamic imports for Journal/Screener/Scripts/Copilot/Alerts; lazy Screener/Copilot sidebar + floating screener content; `heikinAshiCache` LRU (8); notification toast/seenIds caps; ephemeral clear includes HA cache; architecture closeout.
- **Delivered (Phase 9):** Split thin `useChartDeepLinkBootstrap` + `journalChartOverlayContext` from heavy overlay fetch; `ChartTileHost` dynamic `JournalChartOverlayProvider` only when URL has `journalTrade`; `ScriptLibraryMountGate` sticky-mounts library for scripts tile, restored script indicators, or picker/scripts entry; `StockApp` auto-mount hook + picker/chart entry requests.
- **Delivered (Phase 10):** `@tanstack/react-virtual` on `JournalTradesTable`; full `sortedTrades` virtual scroll (no page pagination); toolbar result count only; table owns vertical scroll region; filter/sort/column prefs unchanged; Phase 7 provider window unchanged.
- **Delivered (Phase 11):** `mountChartEngine = isActive || liveProp === true` in `ChartCell`; conditional `EdgeChart` mount; `InactiveChartSurface` placeholder; `flushViewportPersist` / `flushDrawingsPersist` with handle snapshot before teardown; `chartEngineGeneration` for remount restore; journal fork explicit `live` override preserved.
- **Verification (Phase 10):** **Focused:** `Test Files 4 passed (4)`, `Tests 35 passed (35)`; **Architecture review:** self-review **Passed**; **App-level:** large-fixture Trades-tab scroll walkthrough deferred (Phase 14).
- **Verification (Phase 11):** **Focused:** `Test Files 3 passed (3)`, `Tests 11 passed (11)`; **Architecture review:** self-review **Passed**; **App-level:** 8-cell heap/subscription walkthrough deferred (Phase 14).
- **Planned (Phases 12–14):** Redis shared cache; worker zero-copy bus; app-level verification closeout — see `memory-efficiency-roadmap.md`.
- **Blockers:** none
- **Next:** Activate Phase 13 under WIP=1 — worker zero-copy candle bus (or Phase 14 verification closeout).

## Task Contract — Journal ignore-from-stats

- **Status:** Passing (2026-07-23)
- **Goal:** User can mark a journal trade ignored so IB fills remain but KPIs/calendar/equity/reports exclude it.
- **Delivered:** Migration `0024`; `ignored` on types/schemas/repo/local/rebuild/adopt; `matchesJournalFilters` exclude-by-default; trade detail toggle; trades table badge; AI review patch; BBD live test trade marked ignored.
- **Verification:** Focused journal suite `Tests 188 passed (188)`; app-level BBD stats delta quoted in Active Work.
- **Blockers:** none

## Task Contract — Open-risk header chrome

- **Status:** **Passing** (2026-07-23)
- **Goal:** Ambient live-IB open positions in app header — chip when capital at risk, one-gesture popover to act, deep links to Account and Journal without duplicating the positions book.
- **Delivered:** `OpenRiskPositionsMenu` chip + popover (Close + chart load); `OpenRiskWorkspaceBridge` + `pendingWorkspaceActions` for off-workspace navigation; Account rail count badge; command palette **Open positions**; `openRiskSummary` helpers; docs in trading architecture + execution roadmap.
- **Verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 29 passed (29)`; **Architecture review:** self-review **Passed**; **App-level:** chip/popover/Account/Journal walkthrough deferred.
- **Blockers:** none
- **Next:** App-level verification when connected with open positions.

## Task Contract — Copilot model settings UX polish

- **Status:** **Passing** (2026-07-23)
- **Goal:** Polish Copilot model settings modal — pinned active chips, Popular/Recent/Enabled tabs, search filter, richer provider rows, single scroll region; preserve immediate picker updates without restart.
- **Delivered:** Redesigned `CopilotModelSettingsModal` using `EdgeSearchInput` + `EdgeSegmentedTabs`; provider badge/name metadata; chip remove with min-1 guard; widened modal (`maxWidth="md"`); focused tests.
- **Verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)`; **Architecture review:** self-review **Passed**; **App-level:** chips/tabs/search walkthrough deferred.
- **Blockers:** none
- **Next:** none — pick next WIP=1 from product roadmaps when prioritized.

## Task Contract — Copilot model settings

- **Status:** **Passing** (2026-07-23)
- **Goal:** Manage Copilot agent models at runtime — settings cog opens a modal listing popular and recent OpenRouter tool-capable models with seed defaults pre-checked; check/uncheck updates the picker without restart.
- **Delivered:** Seed vs runtime split in `allowlist.ts`; client `enabledModelsStore` (`edge:ai:enabledModels:v1`); `GET /api/ai/models` OpenRouter catalog proxy; `CopilotModelSettingsModal` + header cog; picker wired to enabled store with thread model fallback.
- **Verification:** **Focused:** `Test Files 8 passed (8)`, `Tests 61 passed (61)`; **Architecture review:** self-review **Passed**; **App-level:** settings modal walkthrough deferred.
- **Blockers:** none
- **Next:** none — pick next WIP=1 from product roadmaps when prioritized.

## Task Contract — AI agent / in-app copilot

- **Status:** Complete — Phase 0–8 **Passing** (2026-07-22)
- **Goal:** In-app copilot chat with OpenRouter-first model access; agent orchestrates through the existing tool registry only (session bridge, confirmed writes, chart↔chat, thread persistence in later phases).
- **Delivered (Phase 0):** `ModelRef` + allowlist + `ModelProvider` interface in `src/lib/ai/model/`; chat request + stream/confirm Zod contracts in `src/lib/ai/agent/contracts.ts`; ownership map; `.env.example` OpenRouter vars; AI architecture + roadmap updates; focused lock tests.
- **Delivered (Phase 1):** `OpenRouterModelProvider` (`model/openrouter.ts`); read-only orchestrator (`agent/orchestrate.ts`, `readTools.ts`, `summarizeToolResult.ts`); `POST /api/ai/chat` NDJSON route; optional `workspaceSnapshot`; focused provider/orchestrator/route tests.
- **Delivered (Phase 2):** Sidebar `copilot` panel (`src/app/components/copilot/`); NDJSON stream client + in-memory thread hook; message list + tool chips + composer send/cancel; compact snapshot on send; `toggleCopilot` command (⌥⇧C); persistence schema includes `copilot` panel id.
- **Delivered (Phase 3):** `executeClientSessionTool` + `session.bridge` logs; orchestrator awaits bridge for client-state read tools; single-consumer poll dispatch; default read grant; `AiSessionBridge` failure-result posting; focused bridge/orchestrator/client tests.
- **Delivered (Phase 4):** Write-mode orchestrator + confirm gate; Copilot Accept/Reject cards; agent-path `add_drawing` defaults (`source: ai`, `status: proposed`); `place_order` never silent.
- **Delivered (Phase 5):** `messageId` on drawing metadata + `assistantMessageId` on chat request; orchestrator/confirm re-exec stamp `threadId`/`messageId`; `CopilotProvider` focus + fallback rationale; toolbar “Open in chat” + accept→`accepted`; `summarize_chart` narrative.
- **Delivered (Phase 6):** `/api/me/copilot-threads` + `tv-ai:copilot-threads:v1`; multi-thread hook hydrate/save/switch; thread list/rename/delete/New chat UI; debounced persist with redacted tool steps; annotation click switches threads.
- **Delivered (Phase 7):** `listAgentModels()` + Copilot model picker; optional per-thread `modelId` (local + cloud + migration `0026`); `streamChat` sends resolved allowlisted id; mid-thread switch applies to subsequent sends only.
- **Delivered (Phase 8):** `COPILOT_WORKFLOW_PROMPTS` + empty-state chips; `prepare_chart_for_analysis` confirm gate; slim `dataProvenance` on `get_chart_state` / `summarize_chart`; system prompt + `formatToolResultForModel` provenance wiring; playbooks handoff documented (Phase D deferred).
- **Verification:** **Focused:** `Test Files 14 passed (14)`, `Tests 65 passed (65)`; **Build:** `✓ Compiled successfully in 10.6s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** workflow chip walkthrough deferred.
- **Blockers:** none
- **Next:** Track complete. Pick next WIP=1 from product roadmaps when prioritized.

## Task Contract — Journal AI tools (Phase 2 analytics + chart)

- **Status:** **Passing** (2026-07-22)
- **Goal:** Expose journal analytics (breakdown/time/equity/daily/compare) and open-trade-on-chart via shared AI registry, reusing `journalStats` + `chartDeepLink` with no new REST APIs.
- **Delivered:** Six tools in `tools/journal.ts` (`get_journal_breakdown`, `get_journal_time_report`, `get_journal_equity_curve`, `get_journal_daily_pnl`, `compare_journal_slices`, `open_journal_trade_on_chart`); shared `loadFilteredTrades` / `loadScopedClosedTrades`; focused tests; AI/journal architecture + roadmap updates.
- **Verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 13 passed (13)` (`journal.test.ts`); **Focused:** `Test Files 15 passed (15)`, `Tests 67 passed (67)` (`src/lib/ai/`); **Architecture review:** self-review **Passed**; **App-level:** MCP session-bridge + chart open walkthrough deferred.
- **Blockers:** none
- **Next:** Resume App-level verification Phase 2 under WIP=1, or next journal/AI track.

## Task Contract — Journal AI tools (Phase 1 MVP)

- **Status:** **Passing** (2026-07-22)
- **Goal:** Expose journal list/get/stats/review-patch via shared AI tool registry and MCP through `JournalPort` + browser session bridge.
- **Delivered:** `JournalPort` + `createFetchJournalPort`; four tools in `tools/journal.ts`; `AiToolsProvider` wiring; `fetchJournalTradeById`; focused tests; AI/journal architecture docs.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 12 passed (12)`; **Focused:** `Test Files 15 passed (15)`, `Tests 59 passed (59)` (`src/lib/ai/`); **Build:** compile OK; TS exit blocked by pre-existing `JournalTradesView.tsx` error; **Architecture review:** self-review **Passed**; **App-level:** MCP session-bridge walkthrough deferred.
- **Blockers:** none
- **Next:** Superseded by Phase 2 contract (Passing).

## Task Contract — Alert AI / MCP tools

- **Status:** **Passing** (2026-07-22)
- **Goal:** Expose alert lifecycle, high-level create helpers, and chart workflow tools via shared registry/MCP (`AlertsPort` + session bridge).
- **Delivered:** `AlertsPort` + `createFetchAlertsPort`; 16 tools in `tools/alerts.ts`; `GET /api/me/alerts/events`; `AiToolsProvider` wiring; focused tests; AI/alerts architecture + roadmap updates.
- **Verification:** **Focused:** `Test Files 17 passed (17)`, `Tests 83 passed (83)` (`src/lib/ai/`); **Architecture review:** self-review **Passed**; **App-level:** MCP alert tool walkthrough deferred.
- **Blockers:** none
- **Next:** Resume App-level verification Phase 3 under WIP=1.

## Task Contract — App-level verification wave 2 — Phase 4

- **Status:** **Active** (2026-07-24) — Ops residuals walks 4.1–4.5
- **Goal:** App-level proof of Redis health flip, journal import/sync chrome, MCP alert tools, calm header on fault
- **Track contract:** [Task Contract — App-level verification wave 2](#task-contract--app-level-verification-wave-2)

## Task Contract — App-level verification wave 2 — Phase 3

- **Status:** Closed **Passing** (2026-07-24) — Connections & provider preference walks 3.1–3.3
- **Goal:** App-level proof of Settings Connections console, Market data prefs → chart `meta.source`, Connection displayName reload
- **Track contract:** [Task Contract — App-level verification wave 2](#task-contract--app-level-verification-wave-2)

## Task Contract — App-level verification wave 2

- **Status:** **Active** (2026-07-24) — Phase 4 in progress
- **Goal:** Close post–Wave 1 deferred app-level proofs (Copilot agent, Grok chrome, Connections prefs, Redis/journal/MCP/calm header) without mixing verification into product roadmaps.
- **Delivered:** Phase 0 inventory; Phase 1 Copilot agent walks 1.1–1.8 **Passing** (2026-07-24); Phase 2 Grok chrome walks 2.1–2.4 **Passing** (2026-07-24); Phase 3 Connections walks 3.1–3.3 **Passing** (2026-07-24).
- **Verification:** Phase 4 walks 4.1–4.5 require quoted app-level evidence per checklist.
- **Blockers:** none
- **Next:** Close Phase 4 with quoted 4.1–4.5 evidence; mark Wave 2 track **Passing**.

## Task Contract — App-level verification roadmap

- **Status:** **Passing** (2026-07-22) — Wave 1 track complete (Phases 0–8)
- **Goal:** Close deferred app-level proofs for shipped work without mixing verification into product roadmaps.
- **Delivered:** Phase 0 inventory; Phase 1 live IB/dual Gateway/trading ops (2026-07-22); Phase 2 alerts reliability cron walks 2.1–2.6 (2026-07-22); Phase 3 scripts + chart fixtures walks 3.1–3.10 (2026-07-22); Phase 4 Risk and Trade UI walks 4.1–4.5 (2026-07-22); Phase 5 Screener and Review walks 5.1–5.6 (2026-07-22); Phase 6 workspace chrome + journal shipped surfaces walks 6.1–6.11 (2026-07-22); Phase 7 data serving, health, and residual Pending rows walks 7.1–7.7 (2026-07-22); Phase 8 human day-profile batch review 8.1 (2026-07-22).
- **Verification:** Phase 8 quoted human-review observations per checklist item 8.1 (`confirmed:50` `rejected:0` in `batch-20260718.csv`; calibration samples vs visual guide); all prior phase evidence on file.
- **Blockers:** none
- **Next:** Wave 1 closed — residual post–2026-07-22 walks on [app-level-verification-wave-2-roadmap.md](./roadmaps/app-level-verification-wave-2-roadmap.md).

## Task Contract — Data serving & caching efficiency

- **Status:** **Passing** (2026-07-21) — track complete
- **Goal:** Close client reuse and idle-serving gaps (search/fundamentals/overlays/context TTL cache, journal poll hygiene, home remote workspace truth, chart loadMore cache, screener/AI serving cost) while keeping server HotStore/DataCache as the authoritative market-data acceleration layer.
- **Delivered:** Roadmap + gap inventory + phasing; `ClientTtlCache` + policy matrix; Phase 1 consumer wiring; Phase 2 poll hygiene; Phase 3 `writeMergedChartClientCache` + loadMore/refresh cache merge; `resolveChartLiveQuotePrice`; Phase 4 screener daily candle fetcher + coalesce + miss budget + hit rates; Phase 5 `privateCacheControl` + AI fetch-port memo + taxonomy mtime cache; Phase 6 layout write lock + `layoutContentFingerprint` + journal/pattern GET TTL memo (TanStack declined); Phase 7 Redis **Skipped** (single-user / single Node).
- **Verification:** Phases 0–6 focused/build evidence on file; Phase 7 skip decision recorded (no Redis code); **Architecture review:** self-review **Passed**.
- **Blockers:** none
- **Next:** Track closed — select next roadmap under WIP=1.

## Task Contract — Workspace state persistence

- **Status:** **Passing** (2026-07-21) — track complete
- **Goal:** Make `/workspace` desks durable across refresh and (when Postgres is configured) devices: per-tile chart layouts, app-workspace cloud sync, user preference pack, modified viewport restore, and lightweight workflow resume — without persisting live market data or ephemeral chrome.
- **Delivered:** Roadmap + gap inventory; persist/ephemeral matrix + keys map; Phase 1 per-tile chart scoping; Phase 2 app-workspace shell Postgres sync; Phase 3 user preference pack; Phase 4 modified viewport restore; Phase 5 screener review resume + user-scoped pattern library Postgres; Phase 0 Zod sketches + inventory lock tests.
- **Verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 47 passed (47)`; **Build:** `✓ Compiled successfully`; **Architecture review:** self-review **Passed**.
- **Blockers:** none.
- **Next:** Track closed — select next roadmap under WIP=1.

## Task Contract — Notifications + Alerts

- **Status:** **Passing** (2026-07-22) — Phase 0 + Phase 1 + Phase 2 (2a trade plan + 2b screener) + Phase 3 (conditions) + Phase 4 (script condition alerts)
- **Goal:** In-app notification delivery and server-evaluated alerts with workspace Alerts tile UX.
- **Delivered (Phase 0):** `notification_events` + `alert_definitions` + `alert_trigger_events`; cron evaluator; bell/toast; Alerts tile; chart Alert prefill.
- **Delivered (Phase 1):** `0017_alert_drawing_bind.sql`; drawing bind fields; `drawingAlertGeometry` + `drawingAlertSync`; overlay **Add alert on drawing…**; `enter_zone`/`exit_zone`; trendline interpolation; geometry sync + expire-on-delete.
- **Delivered (Phase 2a):** `0019_alert_trade_plan_bundle.sql`; `tradePlanAlerts`; role-aware position sync; overlay **Add trade plan alerts…**; Alerts UI bundle labels.
- **Delivered (Phase 2b):** `0020_screener_alerts.sql`; screener alert cron + symbol diff; `/api/me/screener-alerts`; saved-screen Notify toggle; Alerts tile screener strip.
- **Delivered (Phase 3):** `0021_alert_conditions.sql`; JSONB `conditions` + `combinator` + `watchlist_id` + `symbol_state`; indicator level/cross eval via `IndicatorPlugin`; watchlist symbol expansion; 2-leg AND/OR UI; external delivery deferred.
- **Delivered (Phase 4):** `ScriptManifest.alerts` (`edge-indicator-sdk-5`); `script_condition` alert leg; `POST /api/me/alerts/[id]/snapshot`; client chart bridge + `scriptAlertEval` stale guard on shared cron; Indicator settings **Create alert…**; no server guest execution.
- **Verification:** **Focused:** `Test Files 8 passed (8)`, `Tests 61 passed (61)`; **Build:** `✓ Compiled successfully in 9.8s`; **Architecture review:** self-review **Passed**.
- **Next:** External delivery (email/push/webhook) or semantic/AI alert tools under WIP=1.

## Task Contract — App color palettes (mode + palette)

- **Status:** **Passing** (2026-07-22)
- **Goal:** Named color palettes orthogonal to light/dark mode; picker in Application settings; DOM + canvas sync; local + user-preferences persistence.
- **Delivered:** `PaletteId` + token tables in `edge.ts` / `globals.css` / `themeTokens.ts` (Midnight, Graphite, Deep Slate); `appPalettePreference.ts`; `AppThemeProvider` exposes `palette` + `setPalette`; `AppSettingsShell` Appearance section; pre-hydration `data-palette`; user-preferences pack field.
- **Verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 28 passed (28)`; **Build:** `npm run build:packages` passed; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**.
- **Next:** App-level palette switch + reload walkthrough when convenient.

## Task Contract — Journal Calendar P&L polish

- **Status:** **Passing** (2026-07-22)
- **Goal:** Polish dashboard Calendar P&L card — Mon–Fri grid with week totals, month rollup, heatmap intensity, denser day cells, today/selected chrome.
- **Delivered:** `buildCalendarMonth` weekday layout + `computeCalendarMonthSummary` / `computeCalendarWeekTotals` / `calendarHeatIntensity`; `JournalCalendar` 6-col grid; `selectedDate` from dashboard; weekend P&L in month header only.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 72 passed (72)`; **Architecture review:** self-review **Passed**.
- **Next:** App-level calendar heatmap + selected-day walkthrough when convenient.

## Task Contract — Journal KPI cards + sync status UX

- **Status:** **Passing** (2026-07-22)
- **Goal:** Fix journal dashboard KPI card overflow/misalignment across tile densities; flash account equity on live updates; replace long out-of-sync banner with compact chrome status chip.
- **Delivered:** `HeroMetricCardLayout` 3-row stack; equity net-P&L secondary row + 2s direction flash; `JournalHistorySyncChip` + `useJournalHistoryOutOfSync`; chip in `JournalTileNav` + standalone `JournalModuleHeader`; banner removed from dashboard content.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 61 passed (61)`; **Architecture review:** self-review **Passed**.
- **Next:** App-level narrow/wide tile card layout + equity flash walkthrough when convenient.

## Task Contract — Journal trade ID source of truth

- **Status:** **Passing** (2026-07-20)
- **Goal:** Journal UI trade ids must match Postgres so trade-scoped APIs (screenshots, chart forks, PATCH notes) resolve; chart capture must not 404 on valid trades.
- **Delivered:** `fetchJournalTrades` returns `GET /api/me/journal/trades` after fill sync when online; `adoptServerJournalTrades` mirrors server ids locally, rematches review metadata, migrates IndexedDB screenshot/fork rows; 503 keeps local rebuild.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 9 passed (9)`; **App-level:** capture screenshot POST **201** on server trade id; **Architecture review:** self-review **Passed**.
- **Next:** App-level BRUN open-trade capture when chart symbol matches.

## Task Contract — Trade chart forks

- **Status:** **Passing** (2026-07-20)
- **Goal:** Attach editable live chart fork to existing journal trade (IBKR portal workflow); review with capture-time markup, screenshot, entry/exit markers; fork isolated from main workspace.
- **Delivered:** `journal_trade_chart_snapshots` + CRUD API + IndexedDB fallback; `captureTradeChartFork`; chart menu attach picker; trade detail capture/list/open; `TradeChartForkModal` with debounced save + reset-to-capture.
- **Verification:** **Focused:** `Test Files 47 passed (47)`, `Tests 240 passed (240)`; **Build:** `npm run build` → `✓ Compiled successfully in 8.1s`; **Architecture review:** self-review **Passed**.
- **Next:** App-level attach → open fork → edit → main chart unchanged walkthrough.

## Task Contract — Journal trade screenshots

- **Status:** **Passing** (2026-07-20)
- **Goal:** Attach one or more screenshots to a journal trade review; persist when Postgres configured; IndexedDB fallback offline.
- **Delivered:** `journal_trade_screenshots` + filesystem store; CRUD API; `JournalTradeScreenshots` gallery in trade detail drawer.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 8 passed (8)`; **Build:** `npm run build` passed.
- **Next:** App-level attach + refresh + delete walkthrough.

## Task Contract — API client efficiency (ROI track)

- **Status:** **Passing** (2026-07-20).
- **Goal:** Reduce client→API traffic on the highest-ROI paths without changing user-visible chart freshness semantics.
- **Delivered:** (1) `pollRangeForInterval` short-range candle polls + streamDiff no-wipe guard; (2) single `loadEvents` in `useChartOverlays` + parallel options fetch; (3) AI session heartbeat on 45s interval decoupled from `/api/ai/session/poll`; (4) `POST /api/fundamentals` batch + watchlist client in-flight map; (5) `coalesceInFlight` for candle/quote POSTs + `AbortSignal` on `useChartDataFeed` loads.
- **Verification:** **Focused:** `Test Files 16 passed (16)`, `Tests 70 passed (70)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**.
- **Blockers:** none.
- **Next action:** App-level poll/batch/session walkthrough when convenient; resume Live journal auto-sync under WIP=1.

## Task Contract — Risk hold-to-stop margin

- **Status:** **Passing** (2026-07-19).
- **Goal:** Show whether a sized trade can hold to stop without margin call first; optional dashed MARGIN CALL line on chart while Risk tab open.
- **Delivered:** `projectHoldToStop`; inline **Liq** + verdict under Margin in `RiskMarginCard` (Hold block removed); `RiskLiquidationOverlayContext`; `buildMarginCallReferenceLines` in app `EdgeChart`; `showLiquidationLine` setting.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 47 passed (47)`; **Architecture review:** self-review **Passed**.
- **Out of scope:** Gap stress, options/futures, IB price-sweep, persisted drawings, sizing math changes.
- **Blockers:** none.
- **Next action:** App-level Liq + chart line walkthrough when convenient.

## Task Contract — Scripts workspace surface

- **Status:** **Passing** (2026-07-19).
- **Goal:** First-class workspace **Scripts** tile for My scripts library + basic editor; picker Edit/New routes to tile; Apply adds saved script to active chart.
- **Delivered:** `scripts` surface id + tile surface state; `ScriptsTileSurface` + library rail + `ScriptEditorPane`; workspace `ScriptLibraryProvider`; script apply bridge; picker routing; modal retired.
- **Verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 86 passed (86)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**.
- **Blockers:** none.
- **Next action:** Track complete — activate next pending roadmap item under WIP=1 when selected.

## Task Contract — Journal Tier 3

- **Status:** Phase 3.1 **Passing** (2026-07-22); Phase 3.3 **Passing** (2026-07-22); Phase 3.4 **Passing** (2026-07-22). **Track complete.**
- **Goal:** Ship remaining journal reporting depth: trade rating, compare reports, and MFE/MFA excursion metrics without new ingestion sources.
- **Delivered (3.1):** `rating` column + patch/filter; breakdown Rating tab; trade detail rating select.
- **Delivered (3.3):** `computeCompareReport` + preset slices; `JournalCompareReport` on dashboard; remounted `JournalTimeReport`.
- **Delivered (3.4):** `tradeExcursion.ts` oracle compute; `mfe_usd`/`mfa_usd` persistence; trade detail Compute excursion (STK closed trades).
- **Verification:** **Focused:** `Test Files 55 passed (55)`, `Tests 306 passed (306)`; **Architecture review:** self-review **Passed**.
- **Blockers:** none.
- **Next action:** Track complete — app-level walks optional under app-level verification Phase 6.

## Task Contract — Script depth

- **Status:** Phase 0 **Passing** (2026-07-20); Phase 1 **Passing** (2026-07-20); Phase 2 **Passing** (2026-07-20); Phase 3 **Passing** (2026-07-21); Phase 4 **Passing** (2026-07-22); Phase 5 **Passing** (2026-07-22). **Track complete.**
- **Goal:** Deepen private Edge TypeScript indicator scripts toward Pine-like *capability* (TA, visuals, MTF, alerts, bounded drawings) without Pine syntax or a public marketplace.
- **Compatibility invariants:** Authoring language remains Edge TypeScript (`edgeScript()`); scripts stay private and chart-scoped; declarative visuals only (no guest Canvas/DOM/WebGL); built-in indicators and V1 scripts keep working across SDK bumps; only one phase Active under WIP=1.
- **Delivered (Phase 0):** Pine→Edge Adopt/Adapt/Defer/Skip inventory in script-depth roadmap; additive extension rules in `indicator-runtime/ARCHITECTURE.md` + `scriptContracts.ts` version comments; `RESERVED_SCRIPT_DEPTH_FIXTURE_SLOTS` in chart-core; doc cross-links; host/guest TA key-parity test in `taSdk.test.ts`.
- **Delivered (Phase 1):** 12 new TA helpers in `taSdk.ts` + mirrored `guestTaBootstrap.ts`; `SCRIPT_SDK_VERSION` → `edge-indicator-sdk-2`; compile-time `EdgeScriptTa` types; fixtures `ta-wma`, `ta-macd-compose`, `ta-stoch`, `ta-cci`, `ta-cross-glue`; docs + architecture note.
- **Delivered (Phase 2):** plot kinds `marker`, `bgcolor`, `barcolor`; series styles `stepline`, `circles`, `crosses`, `area`, `columns`; marker/bgcolor budgets; Canvas draw path + main-pane barcolor hook; legend signal mode + scale/price-axis/WebGL fail-closed filters; `SCRIPT_SDK_VERSION` → `edge-indicator-sdk-3`; fixtures `plot-marker-signal`, `plot-bgcolor-band`, `plot-style-stepline`.
- **Delivered (Phase 3):** optional 4th `calculate` arg `request.series({ symbol?, interval? })`; host two-pass collect → fetch → align → execute; `createChartScriptSeriesResolver` wired from app `EdgeChart`; budgets max 2 secondary series / 10k bars / 5s timeout; alignment close-of-bar no lookahead; `SCRIPT_SDK_VERSION` → `edge-indicator-sdk-4`; fixtures `request-htf-sma`, `request-dual-symbol`.
- **Delivered (Phase 4):** `ScriptManifest.alerts` + validate at execute; alerts track handoff (`script_condition`, client snapshot, shared cron); `SCRIPT_SDK_VERSION` → `edge-indicator-sdk-5`; fixture `alert-condition-cross`.
- **Delivered (Phase 5):** optional `calculate().objects` map (`box`, `label`, `level`); host peel + `validateScriptObjects`; `scriptObjects` Canvas layer (z=35) below user drawings; `IndicatorResultProvider` snapshots; max 64 objects / main pane only; `SCRIPT_SDK_VERSION` → `edge-indicator-sdk-6`; fixture `object-box-label`.
- **Verification (Phase 5):** **Focused:** `Test Files 7 passed (7)`, `Tests 65 passed (65)`; **Packages:** `lint:package-boundaries` + `typecheck:packages` + `build:packages` passed; **Build:** `✓ Compiled successfully in 9.7s`; **Architecture review:** self-review **Passed**.
- **Blockers:** none.
- **Next action:** Track complete — deferrals remain (Pine syntax, strategies, marketplace, screener scripts).

## Task Contract — Script depth — Phase 3

- **Status:** **Passing** (2026-07-21).
- **Goal:** Host-resolved `request.series({ symbol?, interval? })` for MTF/MS scripts under strict budgets with close-of-bar alignment (no lookahead).
- **Delivered:** SDK v4 (`edge-indicator-sdk-4`); collect/execute guest bootstrap; `alignSeriesToPrimary`; app `createChartScriptSeriesResolver`; coordinator two-pass pipeline; fixtures `request-htf-sma`, `request-dual-symbol`.
- **Verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 51 passed (51)`; **Packages/build:** passed; **Architecture review:** self-review **Passed**.
- **Blockers:** none.
- **Next action:** Superseded by track-level Script depth contract — activate Phase 4 when alerts MVP allows.

## Task Contract — TypeScript indicator scripting

- **Status:** Phase 0 **Passing** (2026-07-19); Phase 1 **Passing** (2026-07-19); Phase 2 **Passing** (2026-07-19); Phase 3 **Passing** (2026-07-19); Phase 4 **Passing** (2026-07-19); Phase 5A **Passing** (2026-07-19); Phase 5B **Passing** (2026-07-19). **Track complete.**
- **Goal:** Let the user or AI author private TypeScript chart indicators that compile and run inside Edge, render only declarative line/histogram/band/horizontal-level plots, and require no application rebuild.
- **Compatibility invariants:** Built-in indicators retain their synchronous path behind an adapter; legacy layouts load unchanged; user scripts stay outside the static built-in registry and workspace source payload; guest code never receives Canvas, DOM, network, filesystem, storage, secrets, time/randomness, or application state; browser-local mode works without Postgres; only one implementation phase may be Active.
- **Delivered (Phase 0):** Script contracts + golden fixtures; `@edge/indicator-runtime` with TypeScript compile + QuickJS guest VM; worker entry points; capability probe; async `IndicatorResultProvider` wired to all chart consumers; budget baseline; spike example.
- **Delivered (Phase 1):** Deterministic source normalize + versioned hash; `compileScriptService`; ambient SDK typecheck; expanded compile gates; `runtimeHost` + guest lockdown; single TA bootstrap; cancel/stale/candle/output budgets; headless `ScriptSession` last-valid semantics; worker `requestId` cancel protocol; adversarial fixture corpus (41 tests).
- **Verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 41 passed (41)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **App-level spike:** compile **33.8ms**, execute **95.2ms**, `Status: ready`; **Architecture review:** self-review **Passed**.
- **Blockers:** none.
- **Delivered (Phase 2):** `scriptFixtureCatalog`; `createScriptIndicatorInstance` + workspace Zod script fields; `ScriptResultCoordinator` + `useScriptResultCoordinator`; worker client + `indicatorScriptRuntime.worker.ts`; per-chart provider threading; dev fixture injector; legend lifecycle labels.
- **Verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 24 passed (24)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.8s`); **Architecture review:** self-review **Passed**.
- **Delivered (Phase 3):** `src/lib/scriptLibrary` (IndexedDB + localStorage, CRUD, immutable revisions); `ScriptLibraryProvider`; `resolveScriptSource` + coordinator resolver injection; `ScriptEditorModal`; My scripts picker section; script instance settings from manifest; chart add/preview/save wiring.
- **Verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 18 passed (18)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.4s`); **Architecture review:** self-review **Passed**.
- **Delivered (Phase 4):** widened error codes + `formatScriptError`; `ScriptColorRule` validation + draw evaluation; full `ParamDef` manifest validation; TA helpers; browser-safe `sourceNormalize` hash; coordinator debounce + typed missing-revision; worker crash recovery; draft manifest on Run; editor keyboard/a11y; legend typed errors; `docs/chart/script-examples.md`.
- **Verification (Phase 4):** **Focused:** `Test Files 6 passed (6)`, `Tests 42 passed (42)`; **Packages/build/startup/full:** passed (`npm run check` exit **0**, `Tests 3173 passed (3173)`); **Architecture review:** self-review **Passed**.
- **Delivered (Phase 5A):** `ScriptLibraryPort` on `ToolContext`; seven `*_indicator_script` AI tools; `getScriptAuthoringContext()`; `sanitizeIndicatorForAi` on generic chart tools; client-side compile only; delete confirmation.
- **Verification (Phase 5A):** **Focused:** `Test Files 13 passed (13)`, `Tests 50 passed (50)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.7s`); **Full:** `Test Files 528 passed (528)`, `Tests 3182 passed (3182)`, `npm run check` exit **0**; **Architecture review:** self-review **Passed**.
- **Delivered (Phase 5B):** `user_script_library` migration + Drizzle table; Zod snapshot schema; `scriptLibraryRepository`; `/api/me/script-library`; `scriptLibraryClient` + `useScriptLibraryRemoteSync`; `mergeScriptLibraryStates` union conflict UX; data-state governance registration.
- **Verification (Phase 5B):** **Focused:** `Test Files 4 passed (4)`, `Tests 23 passed (23)`; **Build:** `npm run build` passed; **Startup:** `Test Files 3 passed (3)`, `Tests 26 passed (26)`; **Full:** `Test Files 531 passed (531)`, `Tests 3198 passed (3198)`, `npm run check` exit **0**; **Architecture review:** self-review **Passed**.
- **Next action:** Track complete — activate next pending roadmap item under WIP=1 when selected.

## Task Contract — Border-legend select labels

- **Status:** **Passing** (2026-07-19).
- **Goal:** Move labeled dropdown categories onto the top outline (border-legend) instead of left-aligned labels; journal, screener, and app header pickers; shared primitive.
- **Delivered:** `EdgeBorderLabeledControl` + style helpers; `EdgeSelect` labeled layout; journal filter drawer labels; screener Limit + categorical query-builder labels; app header Account/Data pickers; design-system docs.
- **Verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 43 passed (43)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.8s`); **Architecture review:** self-review **Passed**.
- **Blockers:** none.
- **Next action:** Track complete — activate next pending roadmap item under WIP=1 when selected.

## Task Contract — EdgeSelect migration

- **Status:** Phase 0 **Passing** (2026-07-19); Phase 1 **Passing** (2026-07-19); Phase 2 **Passing** (2026-07-19); Phase 3 **Passing** (2026-07-19); Phase 4 **Passing** (2026-07-19); Phase 5 **Passing** (2026-07-19). **Track complete.**
- **Goal:** Retire native `<select>` across app chrome with shared `EdgeSelect` (chip + field) on Edge popover/menu primitives; use `EdgeSegmentedTabs` for short exclusive presets; ban regressions.
- **Delivered (Phase 0):** `EdgeSelect` primitive + tests; design-system export; ARCHITECTURE + roadmap Phase 6 docs.
- **Delivered (Phases 1–4):** Journal scope/filters/table; screener List/Heat map segmented + Top N chip; heatmap toolbars; options/bar replay/tile reassign; settings modals + risk/pattern/trade detail; QueryBuilder + options calculator + drawing toolbar compact fields.
- **Delivered (Phase 5):** Static native-select ban in `edge.test.ts`; `selectClass` deprecated in ARCHITECTURE; consumer tests updated for popover interaction.
- **Verification:** **Focused:** `Test Files 10 passed (10)`, `Tests 109 passed (109)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.5s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`; **Full:** `Test Files 535 passed (535)`, `Tests 3227 passed (3227)`, `npm run check` exit **0**; **Architecture review:** self-review **Passed**.
- **Blockers:** none.
- **Next action:** Track complete — activate next pending roadmap item under WIP=1 when selected.

## Task Contract — App header and app-level theme

- **Status:** **Passing** (2026-07-18).
- **Goal:** Move theme to app-level persisted preference with header toggle; redesign app header hierarchy (workspace center, market data + account + theme + settings right); add empty application-settings shell; remove theme from chart sidebar rail; relabel rail Risk Settings.
- **Delivered:** `edge:app:theme:v1` + `AppThemeProvider` with legacy migration and layout pre-hydration; header market-data selector, theme toggle, settings gear/shell; chart consumers rewired off `ChartLayout.theme`; sidebar rail theme removed, Risk relabeled.
- **Verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 35 passed (35)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.4s`); **Architecture review:** self-review **Passed**; **Startup / Full:** **71** pre-existing status-doc validation issues.
- **Blockers:** none.
- **Next action:** Activate next pending roadmap item under WIP=1 when ready.

## Task Contract — Data inventory and state hardening Phase 0

- **Status:** **Passing** (2026-07-18).
- **Goal:** Stop timeout/circuit bypass from masquerading as Gateway disconnect; align chart overlay and Data Health display freshness; clear stale state after successful unchanged refreshes; add deterministic transition regressions.
- **Delivered:** `TwsStatusProbe` observation confidence/age; `MarketDataService` last-known probe cache; health projections (`Temporarily bypassed`, `requiresManualRecovery`, streaming/retrying copy); chart `refresh` stream event + delivery-age policy; `DataHealthProvider` monotonic merge; focused regressions for bypass vs disconnect and refresh heartbeat.
- **Verification:** **Focused:** `Test Files 19 passed (19)`, `Tests 197 passed (197)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.4s`); **Live probe:** `npm run tws:probe` → `gatewayConnected: true`; **Architecture review:** self-review **Passed**.
- **Blockers:** none.
- **Next action:** Superseded — Phase 1 catalog audit **Passing** (2026-07-18).

## Task Contract — Data inventory and state hardening Phase 1

- **Status:** **Passing** (2026-07-18).
- **Goal:** Freeze one reviewed inventory of datasets, providers, capabilities, owners, policies, vocabulary, and consumers; classify active/legacy/deferred/excluded paths; produce gap register for Phase 2+ without changing runtime contracts.
- **Delivered:** Phase 1 audit schema; canonical vocabulary + timestamp glossary; reconciled provider matrix; **38**-row dataset catalog; **73**-route trace (**0** uncataloged active); **13**-item gap register; architecture catalog pointer.
- **Verification:** **Catalog review:** adapters **8**, routes **73**, cataloged **38**, exclusions **35**, uncataloged **0**; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` exit **1** — **71** pre-existing status-doc validation issues.
- **Blockers:** none.
- **Next action:** Superseded by Phase 2 contract implementation.

## Task Contract — Data inventory and state hardening Phase 3

- **Status:** **Passing** (2026-07-18).
- **Goal:** Instrument existing market-data service, routing waterfalls, hot store/cache, and stream boundaries to emit bounded `DeliveryObservation` + route attempts at runtime without changing provider order, trading policy, or Data Health UX.
- **Delivered:** `DeliveryRegistry`, `RouteCollector`, `serviceInstrumentation`; candles/quotes waterfall route attempts; hot-cache/SWR observations; quote stream `refresh` heartbeats; sanitized internal snapshot accessor.
- **Verification:** **Focused:** `Test Files 12 passed (12)`, `Tests 100 passed (100)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.4s`); **Architecture review:** self-review **Passed**.
- **Blockers:** none.
- **Next action:** Superseded by Phase 4 contract (Passing).

## Task Contract — Data inventory and state hardening — Phase 8

- **Status:** **Passing** (2026-07-19).
- **Goal:** Turn the canonical delivery state into bounded, privacy-safe reliability measures and repo-local reporting; enforce provider/dataset onboarding contracts; consolidate deterministic fault and smoke verification.
- **Compatibility invariants:** Provider routing order and Phase 6 primary badge semantics unchanged; trading/brokerage gates continue to read raw observations; health API changes additive; instrumentation no-throw and count/time bounded; no symbols, account ids, payloads, trace ids, credentials, or raw errors in operational output.
- **Delivered:** `operationalMetrics.ts` bounded measures + delivery/recovery instrumentation; additive health API report + CLI; executable dataset/route/provider governance + CI gate; deterministic fault matrix; optional provider smoke orchestration; centralized diagnostic redaction; Tradier/Alpha Vantage/Alpaca dead-path retirement; architecture/onboarding/incident workflow updates.
- **Verification:** **Focused:** `Test Files 85 passed (85)`, `Tests 457 passed (457)`; **Governance:** `datasets=43 providers=7 routes=61 exclusions=12 issues=0`; **Fixture report:** delivery/freshness **75.0% / 4**, partial **25.0% / 4**, fallback **3000ms / 1**, recovery **850ms / 1**; **Packages:** boundaries + four package typechecks passed; **Build:** `✓ Compiled successfully in 3.2s`; **Startup:** `Test Files 3 passed (3)`, `Tests 26 passed (26)`; **App-level:** Yahoo candles **19**, TWS quotes **2**, retained **70/512**, fallback p95 **14094ms**, recovery p95 **1029ms**; **Full:** `Test Files 511 passed (511)`, `Tests 3044 passed (3044)`, `✓ Compiled successfully in 3.6s`; **Architecture review:** self-review **Passed**.
- **Blockers:** none.
- **Next action:** Select the next roadmap track under WIP=1.

## Task Contract — Data inventory and state hardening Phase 7

- **Status:** **Passing** (2026-07-19).
- **Goal:** Expand catalog/state coverage to every dataset family with bounded observations, demand-aware user projections, sanitized brokerage/trading/persistence/AI readiness, and executable coverage disposition — without changing provider order, Phase 6 primary badge semantics, or raw trading gates.
- **Compatibility invariants:** Provider routing order unchanged; chart/watchlist drive primary badge; trading/brokerage gates read raw observations; localStorage-only persistence remains valid; health revision monotonic; bounded retention; no secrets/account payloads in primary UX.
- **Delivered:** `coverage.ts` executable dispositions + `buildCatalogCoverageReport()`; `healthDatasets.ts` demand/brokerage/pre-trade/cloud-sync row builders; catalog-backed `mergeHealthSnapshot()` with demand registration in `DataHealthProvider`; delivery-backed provider rows (Massive/IBKR/FMP/FRED/SEC); `brokerageDelivery.ts` sub-dataset inputs; `persistenceSyncHealth.ts` + `usePersistenceSyncHealth`; `MarketDataPort` `PortDelivery<T>` with bounded trust meta; Tradier dead paths removed from `marketDataService`.
- **Verification:** **Focused:** `Test Files 142 passed (142)`, `Tests 673 passed (673)`; **Coverage:** `unclassified: 0`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **Architecture review:** self-review **Passed**; **App-level:** deferred; **Startup / Full:** exit **0**, **73** pre-existing status-doc validation issues.
- **Blockers:** none.
- **Next action:** Plan Phase 8 operational hardening under WIP=1.

## Task Contract — Data inventory and state hardening Phase 6

- **Status:** **Passing** (2026-07-19).
- **Goal:** Project one coherent Data Health UX from canonical supervisor state — smallest accurate primary status, three menu sections, collapsed diagnostics, unified badge/tooltip/a11y/recovery — without changing provider routing or trading gates.
- **Delivered:** `healthProjection.ts` + `buildDataHealthProjection()`; `DataHealthMenu` three-section layout + `DataHealthDiagnosticsSection`; unified chart overlay (retired stacked feed badge when Data Health enabled); additive bounded `deliveryDiagnostics` on `/api/market-data/health`.
- **Compatibility invariants:** Trading/brokerage gates read raw observations; additive health API fields only; preference controls stay distinct from health severity.
- **Verification:** **Focused:** `Test Files 9 passed (9)`, `Tests 74 passed (74)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.3s`); **Architecture review:** self-review **Passed**; **App-level:** deterministic projection/UI regressions; live fault walkthrough deferred; **Startup / Full:** exit **0**, **73** pre-existing status-doc validation issues.
- **Blockers:** none.
- **Next action:** Activate Phase 7 dataset-family coverage expansion under WIP=1.

## Task Contract — Data inventory and state hardening Phase 5

- **Status:** **Passing** (2026-07-19).
- **Goal:** One monotonic supervision flow for TWS/IB Gateway connection truth, circuit protection, fallback, and recovery — display stabilization only; trading/brokerage gates stay on raw observations.
- **Compatibility invariants:** Provider routing order unchanged; additive health/recovery API fields (`sessionId`, `revision`); existing Data Health chrome unchanged; dual-socket isolation preserved; header/chart/Data Health share warmup context without duplicate refresh storms.
- **Fault matrix (deterministic):** transient disconnect hold; immediate degrade for gateway/worker wedge/client-id-stuck; paper-only socket loss; IBKR auth circuit without TWS disconnect fabrication; stale supervisor/revision rejection; shared recovery context merge; recovery session phase monotonicity.
- **Delivered:** `connectionSupervisor.ts` reducer + display hysteresis; per-socket sidecar observations; revisioned `recoverySession.ts`; `twsRecoveryContext.ts` + client session guards; `buildConnectionSupervision` wired through `DataHealthProvider`; recover routes return `sessionId`/`revision`.
- **Verification:** **Focused:** `Test Files 10 passed (10)`, `Tests 82 passed (82)`; **Sidecar:** `Ran 1 test OK`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **Architecture review:** self-review **Passed**; **App-level:** deterministic fault-matrix regressions; live fault injection deferred; **Startup / Full:** exit **0**, **74** pre-existing status-doc validation issues.
- **Blockers:** none.
- **Next action:** Activate Phase 6 coherent Data Health UX projection under WIP=1.

## Task Contract — Data inventory and state hardening Phase 4

- **Status:** **Passing** (2026-07-18).
- **Goal:** Catalog-driven freshness, quality, completeness, provenance, and usage-readiness evaluation for every dataset; session/cadence-aware timestamps; strict trading gates on provider/account content age; derived upstream lineage — without changing provider order or Data Health UX.
- **Compatibility invariants:** Additive `DataResult`/API metadata only; `dataTrust.ts` remains compatibility façade; provider routing order unchanged; Data Health projection unchanged.
- **Delivered:** `policyEvaluator.ts` (session multipliers, cadence anchors, completeness, anomalies); expanded `state/policies.ts` + catalog TTL fix (`market_context`); NYSE holiday-aware `marketCalendar.ts`; policy-driven `state/adapters.ts`; unified display freshness in `dataTrust.ts`/`health.ts`; strict pre-trade timestamps in `tradingService.ts`; derived `upstream` refs in `getDerivedMetric()`; focused tests including `enrichResponseMeta.test.ts`.
- **Verification:** **Focused:** `Test Files 20 passed (20)`, `Tests 203 passed (203)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review **Passed** — additive metadata, app-owned evaluator, bounded evaluation, unchanged routing and Data Health UX.
- **Blockers:** none.
- **Next action:** Activate Phase 5 connection/circuit/recovery reconciliation under WIP=1.

## Task Contract — Data inventory and state hardening Phase 2

- **Status:** **Passing** (2026-07-18).
- **Goal:** Establish app-owned canonical contracts for dataset catalog, provider capabilities, delivery observations, incidents, and snapshot revision; add bounded monotonic reducers and compatibility adapters without changing provider routing order, trading policy, or Data Health UX.
- **Delivered:** `src/lib/marketData/state/` (catalog **43** rows, capabilities registry, observations, incidents, adapters, reducer); regenerated `providerCapabilities.ts`; revision-aware `/api/market-data/health` + `mergeMonotonicServerHealth`; architecture ownership table.
- **Verification:** **Focused:** `Test Files 10 passed (10)`, `Tests 86 passed (86)`; **Compatibility:** `Test Files 13 passed (13)`, `Tests 72 passed (72)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review **Passed**.
- **Blockers:** none.
- **Next action:** Superseded by Phase 3 contract (Passing).

## Task Contract — App UX Polish

- **Status:** **Track complete** (2026-07-22) — Phases 0–5 **Passing**; Phase 5 surface convergence delivered via component-standardization Phase 5 (2026-07-18); closeout re-verify **Passing** (2026-07-22).
- **Delivered (component-standardization Phase 5):** Route-cluster migrations (Workspace+Chart, Journal, Home+Screener+Watchlist, Options+Account+Trade, Settings); `EdgeModalShell` for rename/import/chart-settings; shared field/link/chip recipes; QueryBuilder + Home Open target fixes; Tailwind palette ban in `edge.test.ts`; dense-table/paint exceptions documented in architecture doc.
- **Delivered (component-standardization Phase 4):** `EdgeStatusRegion` loading/status wrapper; `EdgeFilterChip` dismissible + static variants; `EdgeMetricTile` plain/bordered with help + tone; extended `EdgeEmptyState` alert/title/tone; `EdgeButton` destructive/link variants; migrated Screener/Options loading, chart/options error surfaces, Journal filter chips + Clear all, Account + Journal metric grids; removed dead screener table skeleton branch.
- **Delivered (component-standardization Phase 3):** Extended `EdgeMenuItem`; promoted `EdgeAnchoredPopover`; `EdgeToggleSwitch` compact + `EdgeToggle` standard; shared `ColumnPickerPopover` for Screener/Journal; thin chart adapters preserved.
- **Delivered (component-standardization Phase 2):** Shared `symbol-search` module (`useSymbolSearch`, `SymbolSearchDialog`, `SymbolSearchTrigger`); migrated `SearchBar` + `WatchlistSearch`; journal exact-symbol presentation only; removed inert asset chips + unused non-compact chart search path; `EdgeModalShell` focus-return ref support.
- **Delivered (component-standardization Phase 1):** Remapped **15 files** / **35** undefined-token refs; `fieldClass`/`selectClass`/`labeledFieldClass`/`clearButtonClass`; extended `EdgeSearchInput`; migrated journal/risk/workspace fields; accessible names on chart/journal search controls; production token ban test.
- **Verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 27 passed (27)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.3s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**, `smallTargets` **5/12**; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` blocked by **71** pre-existing status-doc validation issues.
- **Goal:** Raise Edge chrome hierarchy and legibility through phased shell/chart/workspace polish without changing trading behavior or the black chart stage.
- **Delivered (Phase 4):** `useFocusTrap` + modal/slide-over focus containment; `useMenuKeyboardNav` + chart anchored popover keyboard nav; loading/destructive/link action recipes; `EdgeButton`/`EdgeIconButton` busy + pressed semantics; segmented tabs keyboard + 32px targets; overlay recover CTA compact floor; chart error `role="alert"`; popover enter motion + reduced-motion fallbacks.
- **Delivered (component-standardization Phase 0):** Post–Phase 4 inventory reconciled in `component-standardization-roadmap.md`; Phase 4 a11y contracts marked resolved; frozen residual Phase 1–5 backlog recorded below.
- **Verification:** **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**, `smallTargets` **5/12**, raw hex **8**, Tailwind palette **5**; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` blocked by **72** pre-existing status-doc validation issues.
- **Blockers:** none.
- **Frozen residual scope (Phase 1–5):**
  - **Phase 1:** ~~Repair undefined `--edge-*` tokens~~ **Passing** (2026-07-18) — remapped **15 files** / **35** refs; field/select recipes + search accessible naming shipped.
  - **Phase 2:** ~~`useSymbolSearch` + `SymbolSearchDialog`; migrate `SearchBar.tsx` + `WatchlistSearch.tsx`; journal symbol field presentation only (exact filter semantics unchanged).~~ **Passing** (2026-07-18).
  - **Phase 3:** ~~Converge chart menus on `EdgeMenuItem` / `EdgeMenuSectionHeader`; adopt `EdgeToggle`; shared column picker; generalized anchored popover behavior.~~ **Passing** (2026-07-18).
  - **Phase 4:** ~~Replace local pulse skeletons (**2** files); status/loading wrapper; aligned filter-chip + `EdgeMetricTile` after two-consumer validation.~~ **Passing** (2026-07-18).
  - **Phase 5:** ~~Route clusters (Workspace+Chart → Journal → Screener+Watchlist → Options+Account+Trade → Settings); home Open links + screener QueryBuilder target cleanup; raw hex/palette migration (**8 + 5** files); optional static enforcement.~~ **Passing** (2026-07-18 via component-standardization Phase 5); closeout re-verify **Passing** (2026-07-22).
- **Next phase:** Track complete — select next product roadmap under WIP=1.

## Task Contract — Structural refactor Tier E

- **Status:** Complete — **Passing** 2026-07-17.
- **Goal:** E1 shared revisioned library repo/client helpers; E2 document portable vs app AI chart tools and share matching enums only.
- **Delivered:** `revisionedLibraryRepository.ts` + `revisionedLibraryClient.ts` + thin watchlist/screener/chart-template adapters; `packages/chart-core/src/toolConstants.ts`; `packages/ai-tools-chart/ARCHITECTURE.md`; Two products sections in AI docs; `src/lib/ai/tools/chart.test.ts`.
- **Verification:** **E1 Focused:** `Test Files 15 passed (15)`, `Tests 52 passed (52)`; **E2 Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Build:** `npm run build:packages` passed; **Build:** `npm run build` passed; **Architecture review:** self-review Passed.
- **Blockers:** none.

## Task Contract — Structural refactor Tier D

- **Status:** Complete — **Passing** 2026-07-17.
- **Goal:** Decompose chart runtime god-files (ChartCell, canvas, EdgeChart, drawing controller) into responsibility-focused hooks/modules without user-visible behavior change.
- **Delivered:** D1 `chart-cell/*` hooks + `ChartSyncBridge` + pattern-capture characterization tests; D2 `useViewportLifecycle`/`useCanvasRenderer`/`useCanvasGestures`/`useCanvasCursor`; D3 `useCandleSession`/`useCrosshairCoordinator`/`useChartWheelPinch`/`usePaneLayoutController`/`useEventDetailController`; D4 `createDrawingHandleSlice`/`applyDrawingPointerTransition`/`useDrawingStoreSync`/`useLivePriceStickEntry`.
- **Verification:** **Focused:** `Test Files 11 passed (11)`, `Tests 76 passed (76)`; **Build:** `npm run build:packages` passed; **Boundaries:** `npm run lint:package-boundaries` passed; **Build:** `npm run build` passed; **Architecture review:** self-review Passed.
- **Blockers:** none.

## Task Contract — Workspace pill header UX

- **Status:** **Passing** 2026-07-16 — UI + domain + tests complete.
- **Goal:** Concept A header — Use mode workspace pill (switch/rename/new/duplicate); Edit mode focused chrome (Editing label + Layout + Done); remove always-on rename input, native select, Save copy.
- **Delivered:** `createWorkspaceDocument` in `commands.ts`; `WorkspacePill.tsx` popover menu; `WorkspaceHeaderControls.tsx` Use/Edit mode branches; context wiring; architecture docs updated.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 30 passed (30)`; **Architecture review:** self-review Passed. **Deferred:** app-level pill→edit→Done walkthrough.
- **Blockers:** none.

## Task Contract — Workspace layout presets + empty-pane assign

- **Status:** **Passing** 2026-07-16 — domain + UI + tests complete.
- **Goal:** Template-first edit flow — pick structured layout preset → empty placeholder panes → assign Chart/Screener/Journal per pane; retain freeform drag-dock as secondary.
- **Delivered:** `layoutPresets.ts` (8 presets); `applyLayoutPreset` + `assignTileSurface` in `commands.ts`; `WorkspaceLayoutPresetPicker` + icon; `PlaceholderTile` chooser; `TileFrame` reassign select; context wiring; architecture docs updated.
- **Verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 52 passed (52)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review Passed. **Deferred:** app-level edit→preset→assign→Done walkthrough.
- **Blockers:** none.

## Task Contract — Pattern Capture start/end + numbered presets

- **Status:** **Passing** 2026-07-16 — independent section pairs + keyboard preset labels shipped.
- **Goal:** Each section defined by explicit start/end clicks (1-bar allowed); label via 1–N preset keys or custom text; pattern OHLCV span from section min/max.
- **Delivered:** Reworked `fsm.ts` (`pendingStart`/`pendingEnd`, `PICK_PRESET`); `presets.ts`; section-bounds `buildRecord.ts`; numbered preset UI in `PatternCapturePanel`; overlay + ChartCell wiring.
- **Verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 13 passed (13)`; **Architecture review:** self-review Passed. **Deferred:** app-level 1-bar + multi-section walkthrough.
- **Blockers:** none.

## Task Contract — Pattern Capture Mode

- **Status:** **Passing** 2026-07-16 — full interactive multi-section capture shipped.
- **Goal:** Bar-snapped historical pattern path with section labels → OHLCV slice (no look-ahead) + frozen SVG with section bands → persist to `data/pattern-library/records/`; AI tools for save/get/similarity.
- **Delivered:** `src/lib/patternCapture/*` FSM + slice + buildRecord; extended `PatternRecord.capture`; section-aware `renderChart.ts`; `POST/GET /api/pattern-library/captures`; ChartCell overlay + panel + shortcuts; `save_pattern_capture` / `get_pattern_capture` AI tools; enriched `find_similar_setups` neighbor sections.
- **Verification:** **Focused:** `Test Files 12 passed (12)`, `Tests 33 passed (33)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); app-level walkthrough deferred.
- **Blockers:** none.

## Task Contract — Broker ledger track

- **Status:** **Passing** 2026-07-17 — Phases 0–4 + app-level functional proof (incl. B2 RTH fill).
- **Goal:** Durable broker ledger in Postgres — server fill ingest (portal + Edge), gap Flex backfill, account/position snapshots, client demoted to refresh-only; app-level proof per functional test plan.
- **Delivered:** `docs/roadmaps/broker-ledger-roadmap.md` + `broker-ledger-functional-test-plan.md`; migrations `0006`–`0008`; `runBrokerageIngest` + `scheduleBrokerageIngest`; `/api/cron/brokerage-ingest`; snapshot-route trigger; `/api/me/brokerage-ingest/status` + `/api/me/account-snapshots`; `JournalSyncProvider` server trigger; Data Health ledger sync age; A4 unit for `database_unavailable`.
- **Verification:** A1–A3, B1–B5 app-level pass (B2: F MKT `10190` Filled → new `execId=00025b44.6a5abe6c.01.01`); **Focused:** `Tests 13 passed (13)`; A4 unit for 503; C1 skipped (no Flex env).
- **Blockers:** none.

## Task Contract — App Workspace Use/Edit + shell-as-app

- **Status:** **Passing** 2026-07-16 — Waves A–E complete via orchestrated implementation.
- **Goal:** App shell = active workspace; session-scoped Use vs Edit layout modes; module deep links into one workspace; no Workspace peer nav destination.
- **Delivered:** `layoutEditMode` in `AppWorkspaceContext`; gated `TileFrame`/`LayoutTreeInner`; `WorkspaceHeaderControls` Edit/Done + Esc; mode-aware `AppWorkspaceNav`/`HomeAppNav`; `deepLinks.ts` + `ModuleToWorkspaceRedirect`; `lastModule` root → `/workspace`; `handleSurfaceIngress` for deep links; architecture docs updated.
- **Verification:** **Focused:** `Test Files 11 passed (11)`, `Tests 48 passed (48)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Architecture review:** self-review Passed. **Deferred:** app-level Use/Edit + redirect walkthrough.
- **Blockers:** none.
- **Next:** App-level — Use mode trading; Edit layout rearrange; `/chart` redirect; Review→Chart in-process.

## Task Contract — App Workspace Shell (Tiling Dock)

- **Status:** **Passing** 2026-07-16 — Phases 0–3 complete.
- **Goal:** Single-window ultrawide workspace with binary split-tree tiles (Chart, Screener, Journal); local persistence; in-process Review→Chart drive; drag/save.
- **Delivered:** `src/lib/appWorkspace/` domain; `/workspace` shell + surfaces; `WorkspaceDriveContext`; nav + deep links; drag-to-dock; named workspaces.
- **Verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 29 passed (29)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Packages:** `check:packages` passed; **Architecture review:** self-review Passed. **Deferred:** app-level ultrawide walkthrough; `npm run check` blocked by pre-existing harness lint:instructions rows.
- **Blockers:** none.
- **Next:** App-level — `/workspace` with Chart + Review + Journal; confirm in-process symbol drive.

## Task Contract — Screener Review app (dual-window controller)

- **Status:** **Passing** 2026-07-16 — implemented via sub-agents (scaffold, review-core, bridge, review-ui, screens-results, verify).
- **Goal:** Dedicated `/screener` app with serial Review as home; keyboard flip/keep/skip; BroadcastChannel sync so Screener window drives Chart window; chart sidebar screener unchanged.
- **Delivered:** `/screener` routes + `ScreenerModuleShell`; `reviewSession`/`reviewChannel`/`reviewKeepers`; `ScreenerDriveListener` in StockApp; `ScreenerReviewView` + keyboard; Screens/Results/Keepers pages; roadmap Phase 5.
- **Verification:** **Focused:** `Test Files 14 passed (14)`, `Tests 95 passed (95)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.6s`); **Architecture review:** self-review Passed. **Deferred:** app-level dual-window walkthrough.
- **Blockers:** none.
- **Next:** App-level — `/chart` + `/screener` side by side; run screen → Review; confirm Chart tracks symbol on keyboard flip.

## Task Contract — Trade execution reliability track

- **Status:** **Passing** 2026-07-13 — engineering + API bake complete; operational items open (resting GTC, RTH fill, UI walkthrough).
- **Goal:** Make stock trade execution trustworthy: ops dual-Gateway readiness, paper E2E bake, TWS recovery proof, Postgres-backed intents, live 1-share order (GTC if RTH closed).
- **Delivered:** After-hours pre-trade readiness (`dataTrust.ts`, `tradingService.ts`); Postgres `order_intents` + `resolveServerIntentStore()`; paper LMT/STP/idempotency/kill-switch bake; restart idempotency `orderId=31`; live preview+LMT `orderId=9` + GTC SPY `orderId=15`; `TWS_MANAGED=external` dev pattern.
- **Verification:** **App-level:** paper `orderId=24` cancel `Cancelled`; idempotency `24==24`; Postgres restart `orderId=31`; live `orderId=9`/`15` with `orderRef`; **Focused:** `Test Files 14 passed (14)`, `Tests 81 passed (81)`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed.
- **Blockers:** Live GTC `orderId=15` resting @ 650 (fill deferred); Reconnect TWS UI blocked in dev port-ownership scenario.
- **Handoff doc:** [docs/trading-execution-roadmap.md — LLM handoff](./trading-execution-roadmap.md#trade-execution-reliability-track--llm-handoff)
- **Next:** (1) cancel or monitor `orderId=15`; (2) RTH live MKT 1-share + journal `orderRef`; (3) UI walkthrough; then brackets/options backlog.

## Task Contract — Heat map data hardening

- **Status:** Complete (Passing) 2026-07-12.
- **Goal:** Heat-map Size/Color/Group defaults work on mover presets and FMP company-screener rows.
- **Delivered:** `enrichMoversWithDescriptors` + `getFmpMarketMovers` descriptor join; `moverToScreenerRow` pass-through; `mapFmpScreenerRow` `changePercentage` alias + derive; `HEAT_MAP_QUOTE_STREAM_CAP` 200; `heatMapSizeMetricCoverageWarning` banner.
- **Verification:** `Test Files 6 passed (6)`, `Tests 31 passed (31)`; `npm run build` `✓ Compiled successfully in 3.0s`; **Architecture review:** self-review Passed. **Deferred:** app-level Gainers/Large-cap walkthrough.
- **Blockers:** none.

## Task Contract — Screener heat map

- **Status:** Complete (Passing)
- **Goal:** Reusable treemap heat-map foundation + screener List / Heat map toggle with size, color, and group controls.
- **Delivered:** `src/lib/heatmap/` (types, colorScale, squarify, defaults, tests); `HeatMapView` + `HeatMapToolbar`; `screenerHeatMapAdapter`; session `resultsViewMode` + `heatMapConfig`; `ResultsTable` toggle + heat map pane; `ARCHITECTURE.md` + roadmap update.
- **Verification:** `Test Files 5 passed (5)`, `Tests 27 passed (27)`; `ScreenerDialog` `Tests 14 passed (14)`; `npm run build` `✓ Compiled successfully in 2.9s`.
- **Blockers:** none.

## Task Contract — Right panel overlay layout

- **Status:** **Passing** 2026-07-12.
- **Goal:** Docked right panel overlays chart without reflowing chart width; resize drags panel over chart; chart stays interactive under uncovered area.
- **Delivered:** `resolveSidebarMode` always `overlay`; `StockApp` overlay mount inside chart row; `absolute right-0` positioning (fixes `relative`+`fixed` conflict); auto-dock floating panels only below tablet breakpoint; screener Expand + Pop out enabled on overlay; backdrop removed; design-system doc updated.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Architecture review:** self-review Passed. **Deferred:** app-level overlay resize walkthrough.
- **Next:** App-level confirmation on `/chart`; then resume Dual connection Phase D.

## Task Contract — Screener layout + right-panel UX

- **Status:** **Passing** 2026-07-12.
- **Goal:** Widen docked screener horizontally; fix never-run empty state; add edit/scan filter modes; responsive preset chips.
- **Delivered:** Panel-aware sidebar max + Expand/Collapse; `filterViewMode` session field; `FilterChipSummary`; never-run starters; narrow chip scroller; modal `full` ≈ `min(96vw,1400px)`.
- **Verification:** **Focused:** `Test Files 20 passed (20)`, `Tests 105 passed (105)`; **Build:** `npm run build` passed; **Architecture review:** self-review Passed. **Deferred:** app-level docked expand/scan walkthrough.
- **Next:** App-level confirmation on `/chart`; then resume Dual connection Phase D.

## Task Contract — Dual connection (live data + paper/live orders)

- **Status:** Phase D **Passing** 2026-07-12; dual-connection track complete (app-level verified).
- **Goal:** Run paper+live IB Gateways simultaneously (Docker preferred); keep live market data stable while switching order account paper↔live; fold journal fills into real Gateway accounts (no `(journal)` picker rows); preserve pluggable market-data providers; harden TWS-only preference boundaries; split Data Health connection diagnostics.
- **Delivered:** Phases A–D — dual Gateway infra; honest account discovery; `edge:marketData:connectionId` decoupled from order account; sidecar MD `connectionId`; header data chip; order-scoped pre-trade quotes; live account poll hint; TWS-only preference docs/tests; chart `loadQuotes` preference parity; sidecar `/status` `connections` map; Data Health Connections section.
- **Verification:** **Focused:** Sidecar `Ran 36 tests OK`; App `Test Files 12 passed (12)`, `Tests 141 passed (141)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.7s`); **App-level:** `localhost:3003/chart` — Connections panel paper+live connected; data chip toggled to Live data while account remained `DUP586813 (paper)`; `/api/quotes` `connectionId=ib-live` → `meta.source: tws`; **Architecture review:** self-review Passed.
- **Out of scope:** Postgres intents, options/brackets, Client Portal dual-session substitute, fill account remapping, new market-data plugin framework, dual-socket TWS recovery.
- **Blockers:** none.
- **Next:** Pick next backlog item (WIP=1).

## Task Contract — TWS recovery supervisor

- **Status:** **Passing** 2026-07-13 — fallback hardening + partial recovery walkthrough; full Reconnect TWS UI deferred in dev (port `8765` ownership).
- **Goal:** Harden IB Gateway/TWS sidecar recovery and data-foundation routing so stale/unhealthy sidecar cannot hang quote SSE, warmup, or recovery finalization; auto-recover or surface precise manual action.
- **Delivered (prior):** Sidecar connection supervisor; extended `/status` fields; async reconnect bypass when worker wedged; managed sidecar restart escalation; recovery session context; Data Health phase messages.
- **Delivered (2026-07-02):** Quote SSE uses same TWS health gate as REST with poll fallback; TWS stream connect/first-frame timeouts; watchlist SSE → REST fallback on stall/error; bounded `primeMarketData` + warmup route budget; sidecar `/health` freshness/capabilities; `scripts/tws-sidecar.sh` logs effective `TWS_PORT`; recovery finalization warmup budget.
- **Verification:** **Focused:** 55 tests passed; **Startup:** `npm run check:startup` passed (26 tests); **Build:** `npm run build` passed; **App-level:** candles/quotes/warmup/stream fallback probes passed on stale sidecar; **Architecture review:** self-review Passed; **Recovery walkthrough:** pending.
- **Blockers:** Restart sidecar from current source before live recovery evidence; IB Gateway paper login on port `4002`.

## Task Contract — Account panel UX

- **Status:** **Passing** (2026-07-22)
- **Goal:** Make Account sidebar margin glanceable; show friendly account label instead of raw id; add hover/right-click close position with one-click Confirm close (no LIVE typing).
- **Delivered:** `AccountMarginSummary` utilization bar + status + Details; `resolveAccountPanelHeader` + inline rename; `buildClosePositionDraft` + `ClosePositionConfirmModal`; position row hover Close + context menu; close modal Confirm click only (server `liveConfirmation` still attached automatically).
- **Verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 29 passed (29)`; **Architecture review:** self-review **Passed**.
- **Blockers:** App-level live IB margin + close walkthrough deferred.
- **Next:** App-level confirm on connected live account.

## Task Contract — IB account tracking

- **Status:** **Passing** (2026-07-20) — superseded by Account panel UX row for margin/close/header polish; sidecar + provider foundation unchanged.
- **Goal:** Live IB account data (positions, PnL, summary, orders, executions) in Account sidebar panel + chart position overlays; TWS sidecar via reqAccountUpdates/reqPnL/openOrder events.
- **Delivered:** Sidecar `/account/*` + `/stream/account`; account tracking through local sidecar; `AccountProvider` + Account panel; chart avg-cost reference line when showPositions enabled; Data Health account feed row; architecture + env docs.
- **Delivered (2026-07-01):** Account panel UI overhaul — color-coded PnL; tabbed orders/fills; day-trades in net-liq card.
- **Delivered (2026-07-20):** Margin utilization bar; friendly header labels + rename; position close via preview/submit confirm.
- **Verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 29 passed (29)`; **Architecture review:** self-review **Passed**.
- **Blockers:** App-level live IB walkthrough deferred.

## Task Contract — TWS extended-hours price alignment

- **Status:** Pending — paused for sidebar resize fix; app-level verification not yet recorded.
- **Goal:** Align watchlist `LAST` with chart current-price marker using the same live quote; support TWS extended-hours intraday candles; make pre/regular/post-market state explicit in chart UI.
- **Delivered:** `marketSession` helpers; `livePrice`/`liveMarketSession` chart props; `sessionMode` on candle requests + TWS sidecar `useRTH`; Settings → Extended hours toggle; session status badge on legend; pre/post background bands when extended mode enabled; telemetry panel uses external-store subscription with cached snapshot; SSE quote first-paint telemetry moved out of React state updater.
- **Verification:** focused marketSession/renderer/chart-feed/market-data tests + telemetry tests + `npm run build:packages` + app-level TWS alignment check + app-level console clean on reload.

## Task Contract — Watchlist off-hours quote freshness

- **Status:** **Passing** (2026-07-18)
- **Goal:** Stop false orange watchlist health off-hours while preserving real transport failures, fallback incidents, and partial coverage warnings.
- **Delivered:** Delivery-time metadata (`receivedAt`, `lastUpdateAt`); watchlist display freshness anchored on delivery not oldest quote timestamp; REST poll loop (15s open / 30s closed) after SSE fallback; closed-market session subtitle in Data Health; architecture doc update.
- **Verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 80 passed (80)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **Live probe:** `npm run tws:probe` → paper/live `gatewayConnected: true`.
- **Blockers:** none.
- **Deferred risks:** exchange holiday calendar; provider trade-time `marketAsOf` when vendors expose reliable tick timestamps.
- **Next:** Activate component-standardization Phase 5.

## Task Contract — Local error log (solo observability)

- **Status:** **Passing** (2026-07-22)
- **Goal:** Persist redacted local failures (chart boundary, API 5xx, script runtime, uncaught browser errors) across reload for solo local debugging.
- **Delivered:** `.edge/error-log.jsonl` store (200-line retention); `POST/GET /api/dev/local-errors`; `reportLocalError` client + `LocalErrorReporter`; hooks in `ChartErrorBoundary`, `safeErrorResponse`, `scriptResultCoordinator`; `npm run report:local-errors`; governance exclusion; ARCHITECTURE note.
- **Invariants:** no-throw instrumentation; redact-only payloads; gitignored `.edge/`; no vendor telemetry.
- **Verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 17 passed (17)`; **Packages:** `build:packages` passed; **Build:** `✓ Compiled successfully in 9.4s`; **App-level:** `report:local-errors -- --limit 1` → `[app-level] local error log smoke`; **Architecture review:** self-review **Passed**.
- **Blockers:** none.
- **Next:** Activate App-level verification Phase 3 under WIP=1.

## Session Log

- **2026-07-24 — Research UX Phase 7 session reel shipped**

- **2026-07-24 — Wave 2 Phase 3 browser walks on :3003; dev session via EDGE_ALLOW_OPEN_DEV_SESSION=1 for connection PATCH**

- **2026-07-24 — Execute-from-plan git commit closeout — Commit after Passing on execute; lint:instructions passed.**

- **2026-07-24 — Wave 2 Phase 2 Grok chrome walks 2.1–2.4 Passing; next Phase 3 Connections prefs**

- **2026-07-24 — Wave 2 Phase 1 Copilot agent walks closed — 7/8 App-level items quoted; 1.5 Skipped (browser hydration); next Phase 2 Grok chrome walks.**

- **2026-07-24 — Research UX Phase 2 Passing:** artifactHint on tool-result stream; pinable artifact cards + Talk evidence rail; session-local `tv-ai:research-evidence:v1`; focused Tests 101 passed (101); Arch self-review Passed. Next: Phase 3 Board v1.

- **2026-07-24 — Research UX Phase 1 Passing:** densityNav + DensitySwitcher + Board stub + home hub elevation; focused Tests 33 passed (33); app-level Talk↔Desk switch + Board stub verified; Arch self-review Passed. Next: Phase 2 evidence rail.

- **2026-07-24 — Research UX Phase 0 Passing:** `src/lib/research/` — density, sessionSketch, ownership, entryPolicy; focused `Tests 9 passed (9)`; Arch self-review **Passed**; pointers in persistence/ai/design-system ARCHITECTURE; roadmap Phase 0 **Passing**. Next: Phase 1 density switch + research entry under WIP=1.

- **2026-07-24 — Research UX roadmap created:** Phased Talk / Board / Desk track in `docs/roadmaps/research-ux-roadmap.md`; tiled `/workspace` Desk kept forever; linked from `ROADMAP.md` + roadmaps index. Phase 0 **Pending** (not activated — WIP=1). Next: activate Phase 0 (contracts) when prioritized.

- **2026-07-24 — Plan → execute token efficiency Phase 6 Passing: harness-closeout CLI + tests + execute doc pointers. **Focused:** Test Files 1 passed (1), Tests 13 passed (13); **Instructions:** npm run lint:instructions passed. Next: track complete — process A/B on next product phases.**

- **2026-07-24 — Memory efficiency Phase 14 Passing:** Upgraded `scripts/run-memory-baseline.mts` (trimResidentBars on API loadMore, 8-cell inactive/unmount metrics, active-cell switch, `MEMORY_LIVE_TIP_SEC`, Phase 14 walk scenarios). **App-level:** `npm run perf:memory` → `phase14Walks.allPass:true`; verification debt closed except Phase 12 Redis. Next: Phase 12 when multi-instance topology ships.
- **2026-07-24 — Plan → execute token efficiency Phase 5 Passing:** Fresh-chat execute section in execute checklist + rule; AGENTS Work Boundaries one-liner; validator asserts for `/handoff` + `.plan.md`. **Instructions:** `npm run lint:instructions` → `Instruction architecture validation passed.` Next: Phase 6 (harness closeout helper).
- **2026-07-24 — Plan → execute token efficiency Phase 4 Passing:** Added `plan-execute-routing.mdc` always-apply stub; demoted `plan-harness-awareness.mdc` to agent-requestable; tuned execute rule description; validator allowlist + asserts; status split deferred. **Instructions:** `npm run lint:instructions` → `Instruction architecture validation passed.` Next: Phase 5 (fresh-chat execute process).

Append one entry before handing off long-running or interrupted work. Older entries: [status-archive/](./status-archive/).

### 2026-07-24 — Plan → execute token efficiency Phase 3 (hot harness read windows)

- **Goal:** Slice-read `PROJECT-STATUS` during plan/execute; cap implement status reads at ≤2.
- **Completed:** Hot windows in `harness-status-checklist.md`; pointers in plan-harness, planning-router, execute rule/checklist, AGENTS; lint asserts in `validate-agent-instructions.mts`.
- **Verification run:** **Instructions:** `npm run lint:instructions` → `Instruction architecture validation passed.`
- **Spot-check:** Next product phase implement — expect ≤2 `PROJECT-STATUS` reads; 0 planning-router/intent checklist reads after approval.
- **Next best step:** Activate Phase 4 (scope plan-rule injection + optional status split) under WIP=1 when prioritized.

### 2026-07-24 — Plan → execute token efficiency Phase 2 (explore opt-in)

- **Goal:** Default-off explore/`Task` for roadmap/plan-backed implement; allow when blocked or discovering; cap at one explore.
- **Completed:** Explore policy in `execute-from-plan.mdc`; opt-in section in `execute-from-plan-checklist.md`; plan-rule note; lint asserts in `validate-agent-instructions.mts`.
- **Verification run:** **Instructions:** `npm run lint:instructions` → `Instruction architecture validation passed.`
- **Spot-check:** Next product phase implement — expect 0 explores unless blocked or plan says discover.
- **Next best step:** Activate Phase 3 (hot harness read windows) under WIP=1 when prioritized.

### 2026-07-24 — Plan → execute token efficiency Phase 1 (execute-from-plan)

- **Goal:** Ship execute-from-plan protocol so implement sessions skip planning ceremony without weakening DoD.
- **Completed:** `execute-from-plan.mdc` + `execute-from-plan-checklist.md`; pointers in plan-harness-awareness, planning-router, AGENTS; validator wiring in `validate-agent-instructions.mts`.
- **Verification run:** **Instructions:** npm run lint:instructions passed
- **Dry-run:** Post-approve implement protocol forbids re-reading `planning-router.md` or intent checklists; product A/B on next phases validates read counts.
- **Next best step:** Activate Phase 2 (explore opt-in) under WIP=1 when prioritized.

### 2026-07-24 — Security hardening Phase 6 (cookie + prompts)

- **M5:** Signed cookie payload `userId|iat|jti` with 14-day server/browser TTL; legacy `userId.sig` rejected; secret rotation = global logout.
- **M6:** `promptBoundaries.ts` — workspace snapshot as fenced untrusted user message; strip client `system` roles; 48k orchestrator content budget; residual LLM risk documented.
- **Verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 31 passed (31)`; **Architecture review:** self-review **Passed**.
- **Next best step:** Security track complete — pick next WIP=1 from product roadmap.

### 2026-07-24 — Security hardening Phase 5 (transport + headers)

- **M3:** Enforced CSP + production-only HSTS via `src/lib/security/httpHeaders.mjs` + `next.config.mjs`; demo routes `/animations` and `/brand` use looser CSP.
- **M4:** `IBKR_SSL_VERIFY` defaults on; `assertSidecarAuthConfigured` for non-loopback sidecar URLs; brokerage stream sends `sidecarAuthHeaders`.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 13 passed (13)`; **Build:** `✓ Compiled successfully in 8.5s`; **App-level:** CSP header on `curl -sI http://localhost:3003/`; **Architecture review:** self-review **Passed**.

### 2026-07-24 — Grok Copilot UX parity Phase 4 (active thread chrome)

- **Goal:** History rail on wide hosts, Thoughts disclosure, message actions (Copy + Regenerate).
- **Completed:** `CopilotShell` history slot; `CopilotHistoryRail` (~280px collapsible); `CopilotMessageList` Thoughts + hover actions; `regenerateLast` in `useCopilotThread`; host-split panel wiring; focused tests + architecture docs; Phase 4 **Passing**.
- **Verification run:** **Focused:** `Test Files 13 passed (13)`, `Tests 73 passed (73)`; **Architecture review:** self-review **Passed**; **App-level:** `/copilot` rail/Thoughts/regenerate walkthrough deferred.
- **Next best step:** Activate Grok Copilot UX parity Phase 5 under WIP=1 — attachments & polish (optional).

### 2026-07-24 — Memory efficiency Phase 11 (inactive cell unmount)

- **Goal:** Release canvas/WebGL/feed state for inactive multi-cell peers (Phase 2 stopped streams only); remount without blank chart or lost viewport/drawings.
- **Completed:** `mountChartEngine` gate in `ChartCell`; `InactiveChartSurface`; flush viewport/drawings via handle snapshot before teardown; `chartEngineGeneration` remount restore; focused tests + architecture docs; Phase 11 **Passing**.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 11 passed (11)`; **Architecture review:** self-review **Passed**; **App-level:** 8-cell heap/subscription walkthrough deferred (Phase 14).
- **Next best step:** Activate Phase 13 under WIP=1 — worker zero-copy candle bus (or Phase 14 verification closeout).

### 2026-07-24 — Memory efficiency Phase 10 (journal list virtualization)

- **Goal:** Virtualize journal trades table so large filtered lists (Phase 7 ~500 window) scroll without mounting every DOM row; keep filter/sort/column prefs.
- **Completed:** `@tanstack/react-virtual` on `JournalTradesTable`; full `sortedTrades` feed; page pagination removed; table scroll region; focused tests + architecture docs; Phase 10 **Passing**.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 35 passed (35)`; **Architecture review:** self-review **Passed**; **App-level:** large-fixture Trades-tab scroll walkthrough deferred (Phase 14).
- **Next best step:** Superseded by Memory efficiency Phase 11 closeout above.

### 2026-07-24 — Memory efficiency Phase 9 (chart hot-path slimming)

- **Goal:** Defer journal overlay + script library off chart-only workspace hot path without regressing trade forks or apply-to-chart.
- **Completed:** Thin deep-link bootstrap split; `ChartTileHost` gates dynamic overlay on `journalTrade`; `ScriptLibraryMountGate` with sticky mount for scripts tile / script indicators / picker entry; focused tests + architecture docs; Phase 9 **Passing**.
- **Verification run:** **Focused:** `Test Files 6 passed (6)`, `Tests 24 passed (24)`; **Build:** `npm run build:packages` exit 0; **Architecture review:** self-review **Passed**; **App-level:** chart-only lazy-chunk walkthrough deferred (Phase 14).
- **Next best step:** Activate Phase 10 under WIP=1 — journal list virtualization.

### 2026-07-24 — Connections & providers Phase 5 path decision

- **Goal:** Lock Phase 5 MVP before implementation.
- **Decision:** **Path A — hosted IB OAuth** (not B second broker, not C local Gateway wizard only).
- **Recorded in:** `connections-providers-roadmap.md` § Phase 5 + decision log; Task Contract updated.
- **Next best step:** Activate Phase 5 under WIP=1 — OAuth adapter + Connect UI + trading path.

### 2026-07-24 — Memory efficiency Phase 8 (track closeout)

- **Goal:** Lazy workspace tiles, Heikin Ashi fingerprint cache, notification runtime caps, final architecture closeout — complete memory-efficiency track.
- **Completed:** `SurfaceHost` + sidebar dynamic imports; `heikinAshiCache` LRU; `notificationCaps`; ephemeral clear extended; architecture docs updated; Phase 8 **Passing**; track complete.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 32 passed (32)`; **Build:** `npm run build:packages` exit 0; **Architecture review:** self-review **Passed**.
- **Next best step:** Pick next WIP=1 from product roadmap (Connections Phase 5, Grok Copilot Phase 3, Security Phase 3, etc.).

### 2026-07-24 — Connections & providers Phase 4

- **Goal:** Durable user-scoped Connection records (Postgres + `/api/me/connections`); Settings + header bind to same list; AuthKind stubs; platform data policy.
- **Completed:** `connections` table + migration `0027`; `AuthKind`; repository ensure-seed; list/get/patch/reconnect/disconnect APIs; `useConnectionsList` with seed fallback; Settings displayName edit + header Data picker labels; architecture + roadmap closeout; Phase 4 **Passing**.
- **Verification run:** **Focused:** `Test Files 6 passed (6)`, `Tests 31 passed (31)`; **Architecture review:** self-review **Passed**; **App-level:** displayName reload walkthrough deferred.
- **Next best step:** Superseded by Phase 5 path decision above.

### 2026-07-24 — Security hardening Phase 2

- **Goal:** Close H5 — upgrade Next off middleware-bypass advisory (CVE-2026-64642); audit triage; regression tests + build.
- **Completed:** `next@16.2.11`; safe `npm audit fix`; middleware + apiAuth tests pass; `npm run build` exit 0; pre-existing TS strict-check failures fixed; Phase 2 **Passing**.
- **Verification run:** **Focused:** `Test Files 2 passed (2)`, `Tests 11 passed (11)`; **Build:** `npm run build` exit 0; `npm ls next` → `next@16.2.11`; **Audit:** `npm audit --omit=dev` → 11 vulns (4 high: postcss/sharp via Next, undici via `@cursor/sdk` — accept/defer); **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Security Phase 3 under WIP=1 — AI bridge + trading identity (H2, H6).

### 2026-07-24 — Grok Copilot UX parity Phase 3

- **Goal:** In-bar model chip + dropdown selects thread `modelId` from enabled models; remove header `EdgeSelect`.
- **Completed:** `CopilotComposer` menu via `EdgeAnchoredPopover` + `--copilot-menu-*`; `modelMenuSubtitle`; panel wiring; header picker removed; Phase 3 **Passing**.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 26 passed (26)`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 4 under WIP=1 — active thread chrome.

### 2026-07-24 — Grok Copilot UX parity Phase 2

- **Goal:** Restyle `CopilotComposer` as Grok pill `query-bar` (+ attach stub, model chip stub, circular ↑/stop).
- **Completed:** Pill composer with `--copilot-query-bar-*` tokens; attach/model chip stubs; streaming stop swap; wide-host docked centering; Phase 2 **Passing**.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 27 passed (27)`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 3 under WIP=1 — in-bar model picker dropdown.

### 2026-07-24 — Grok Copilot UX parity Phase 2 (start)

- **Goal:** Restyle `CopilotComposer` as Grok pill `query-bar` (+ attach stub, model chip stub, circular ↑/stop).
- **Completed:** Phase 2 **Active** — harness + Task Contract updated; composer/shell/panel implementation in flight.
- **Verification run:** Superseded by Phase 2 closeout entry above; **Focused:** `Tests 27 passed (27)`
- **Next best step:** Focused composer tests; mark Phase 2 **Passing**; activate Phase 3 (in-bar model picker).

### 2026-07-24 — Memory efficiency Phase 7

- **Goal:** Window Journal provider memory + Copilot sliding request context; keep full thread persist.
- **Completed:** `JournalTradesProvider` open+closed limit 500 + compact fill-account index; `selectChatRequestMessages` (40 msgs / 4k content); `chatRequestSchema` hard caps; architecture + roadmap updated; Phase 7 **Passing**.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 29 passed (29)`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 8 under WIP=1 — lazy tiles, HA cache, residual hygiene.

### 2026-07-24 — Grok Copilot UX parity Phase 1

- **Goal:** Shared `CopilotShell` + Grok empty-state composition across sidebar, `/copilot`, and tile.
- **Completed:** `CopilotShell`, `CopilotEmptyBrand`, `CopilotPromptLibrary`; host variants; empty hero without dense `EdgePanelHeader`; `.copilot-shell` CSS aliases; Phase 1 **Passing**.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 21 passed (21)`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 2 under WIP=1 — composer `query-bar` pill parity.

### 2026-07-23 — Memory efficiency Phase 6

- **Goal:** Series layer OffscreenCanvas retain + WebGL Float32 recycle + dispose hygiene.
- **Completed:** `SeriesLayerCache` wired in `drawPaneLayers`; `canReuseSeriesCache` crosshair-only; background pan blit; `GeometryBufferPool` on WebGL renderers; cache + scheduler dispose on unmount; architecture + roadmap updated; Phase 6 **Passing**.
- **Verification run:** **Focused:** `Test Files 6 passed (6)`, `Tests 33 passed (33)`; **Build:** `npm run build:packages` exit 0; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 7 under WIP=1 — journal window + Copilot context window.

### 2026-07-24 — Grok Copilot UX parity Phase 0 closeout

- **Goal:** Freeze Copilot visual contract from grok.com research (docs/assets only).
- **Completed:** Phase 0 **Passing** — see 2026-07-23 entry below for deliverables; harness Current Verified State updated.
- **Verification run:** **App-level:** 6 assets in `docs/assets/grok-parity/`; Visual contract + § G–J frozen; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 1 under WIP=1 — `CopilotShell` + empty state.

### 2026-07-23 — Security hardening Phase 0

- **Goal:** Close audit C1–C4 — fail-closed API auth, proxy-safe IP, server confirmation tokens, pattern ID root jail.
- **Completed:** `apiAuth.ts` + `clientIp.ts`; HMAC `confirmationToken.ts`; execute/session routes + Copilot Accept token path; pattern library slug/UUID + Postgres-on **401**; `.env.example` `EDGE_API_AUTH_MODE=dev-open`; CONSTRAINTS + architecture docs; roadmap Phase 0 **Passing**.
- **Verification run:** **Focused:** `Test Files 14 passed (14)`, `Tests 64 passed (64)`; **Build:** `npm run build:packages` exit 0; `✓ Compiled successfully in 8.4s`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 1 under WIP=1 — operator secrets & diagnostics (H1, H3, H4).

### 2026-07-24 — Connections & providers Phase 2

- **Goal:** Market-data preference store — persist display provider order/disable; wire waterfalls; Settings UI; trust + cache invalidation.
- **Completed:** `dataProviderPreference.ts`, `providerWaterfall.ts`, preference-aware `MarketDataService`; API/feed/stream threading; `MarketDataSettingsSection` reorder/disable; userPreferences sync; architecture + roadmap Phase 2 **Passing**.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 103 passed (103)`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 3 under WIP=1 — ConfigSource abstraction.

### 2026-07-23 — Connections & providers Phase 1

- **Goal:** Settings Connections console (IB-only, no secrets) + read-only Market data provider table.
- **Completed:** `ConnectionsSettingsSection`, `MarketDataSettingsSection`, `useSettingsMarketDataHealth`; extended `AppSettingsShell` + `AppTopHeader` wiring; updated `connections/ARCHITECTURE.md` + roadmap Phase 1 **Passing**.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 19 passed (19)`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 2 under WIP=1 — market-data preference store.

### 2026-07-23 — Memory efficiency Phase 4

- **Goal:** Bound process-local server caches with LRU + soft byte budgets; shared immutable reads; universe date retention; IBKR contractCache cap.
- **Completed:** `DataCache` / `HotStore` LRU + byte budgets; `cacheBudgets.ts`, `immutableSnapshot.ts`, `cacheEviction.ts`; universe COW merge + lookback prune; `contractCache` max 512; architecture + roadmap updated; `perf:memory` reports cache cap metrics.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 25 passed (25)`; **Node warm:** `npm run perf:memory` → `dataCacheCandlesNamespaceEntries: 50` `hotStoreEntries: 60` `withinDataCacheCap: true` `withinHotStoreCap: true` `rssDeltaMb: 53.48`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 5 under WIP=1 — tip-stable indicator & script caches.

### 2026-07-23 — Memory efficiency Phase 5

- **Goal:** Tip-stable builtin/script result caches; dispose clears coordinator maps; prune lastValid on instance remove.
- **Completed:** `computeTipStableCacheKey` + body/tip fingerprints in chart-core; script coordinator tip-stable slots + byte budget; provider paint fingerprint includes `tip:` revision; `legendFromOutputs` data override for scripts; architecture + roadmap updated.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 30 passed (30)`; **Build:** `npm run build:packages` exit 0; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 6 under WIP=1 — series layer retain + geometry recycle.

### 2026-07-23 — Connections & providers Phase 0

- **Goal:** Freeze Connection / preference contracts + Settings IA; no behavior change.
- **Completed:** `src/lib/connections/` types + `SEED_CONNECTIONS` + tests; `ARCHITECTURE.md`; roadmap Phase 0 **Passing**; cross-links in marketData/trading/dual-connection docs; roadmaps README updated.
- **Verification run:** **Focused:** `Test Files 2 passed (2)`, `Tests 9 passed (9)`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 1 under WIP=1 — Settings Connections console (IB-only, no secrets).

### 2026-07-23 — Grok Copilot UX parity Phase 0

- **Goal:** Signed-in grok.com captures + freeze Copilot visual/interaction contract (docs/assets only).
- **Completed:** Live 1440 captures (`grok-com-empty-dark-1440.png`, `grok-com-mode-menu-open-dark-1440.png`, `grok-com-history-logged-out-dark-1440.png`); measured query-bar `800×60` + menu `278×282`; § G–J inventory; frozen Visual contract; design-system alias pointer; Task Contract + Active Work **Passing**.
- **Verification run:** **App-level:** 6 assets in `docs/assets/grok-parity/`; contract frozen in roadmap; **Architecture review:** self-review **Passed**. Authenticated pixel captures deferred.
- **Next best step:** Activate Phase 1 under WIP=1 — `CopilotShell` + empty state.

### 2026-07-23 — Grok Copilot UX parity roadmap

- **Goal:** Inventory grok.com chat UX/UI/feature set and document a phased Edge Copilot parity track (docs only).
- **Completed:** Live capture of empty chat + mode menu + Imagine; measured query-bar CSS (`800×60`, pill `160px`, `rgb(5,5,5)` / `rgb(20,20,20)`); Adopt/Adapt/Defer/Skip matrix; Phases 0–5 plan; indexed in roadmaps README + ROADMAP; Active Work **Pending** rows; assets under `docs/assets/grok-parity/`.
- **Verification run:** Docs-only (no code). Superseded by Phase 0 closeout (2026-07-23 / 2026-07-24 entries).
- **Next best step:** Superseded — Phase 0 **Passing**.

### 2026-07-23 — Connections & providers roadmap

- **Goal:** Capture phased path from solo `.env`/IB-only to product Connections + platform data.
- **Completed:** Added `docs/roadmaps/connections-providers-roadmap.md` (Phases 0–7); indexed in `roadmaps/README.md` + `ROADMAP.md`; linked from marketData/trading architecture, trading-execution backlog, broker-ledger deferral; Active Work **Pending** + Task Contract.
- **Verification run:** Docs-only (no code).
- **Next best step:** Activate Phase 0 under WIP=1 when prioritized (Connection/preference contracts + Settings IA).

### 2026-07-23 — Security hardening roadmap

- **Goal:** Phase High/Medium (and Critical prerequisite) audit findings into a fail-closed hardening track.
- **Completed:** Added `docs/roadmaps/security-hardening-roadmap.md` (Phases 0–6); indexed in `roadmaps/README.md` + `ROADMAP.md`; Active Work **Pending** rows + Task Contract; audit canvas remains `edge-security-audit.canvas.tsx`.
- **Verification run:** Docs-only (no code).
- **Next best step:** Keep Memory efficiency WIP; activate Security Phase 0 under WIP=1 before any non-localhost exposure.

### 2026-07-23 — Memory efficiency Phase 2

- **Goal:** Only active cell on primary chart tile pays for live candle streams; inactive cells keep snapshot.
- **Completed:** `live` prop on app `EdgeChart` → `useChartDataFeed`; `ChartGrid` passes `live={isActive && isPrimaryChart}`; journal trade fork `live` override; focused live-policy tests.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 25 passed (25)`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 3 — client clone discipline.

### 2026-07-23 — Memory efficiency Phase 1

- **Goal:** Cap resident OHLCV per chart session at 5_000 bars; clear candle session cache on logout.
- **Completed:** `trimResidentBars` + `RESIDENT_BAR_SOFT_MAX` in chart-core; trim wired through feed, cache, and candle session; `adjustViewportForTrim`; logout clears `chartClientCache` via `clearEphemeralMarketDataCaches`.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 101 passed (101)`; **Build:** `npm run build:packages` exit 0.
- **Next best step:** Activate Phase 2 — inactive chart cell feed policy.

### 2026-07-23 — Open-positions header chip UX (flat status A)

- **Goal:** Replace labeled “Risk” dropdown with a flat open-positions status chip using green/red P&L tone.
- **Completed:** Removed `EdgeBorderLabeledControl`; tone dot + persistent `data-pnl-tone` / positive-negative classes; tests + trading architecture note.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 23 passed (23)`.
- **Next best step:** App-level walkthrough with open positions (up and down) to confirm chip color.

### 2026-07-23 — Memory efficiency Phase 0

- **Goal:** Measure memory baselines and freeze retention/clone/dispose contract before implementing caps.
- **Completed:** `scripts/run-memory-baseline.mts` + `npm run perf:memory`; `docs/perf/memory-baseline-latest.json`; architecture contract in marketData/chartDataFeed/chart docs; roadmap Phase 0 **Passing**; frozen knobs (`RESIDENT_BAR_SOFT_MAX` 5_000 confirmed).
- **Verification run:** **App-level:** `npm run perf:memory` → node `candlesLength: 4343` `sessionStorageBytes: 388670`; server `rssDeltaMb: 60.14`; browser 1-cell `maxCandlesLength: 7938` `eventSourceCount: 6`; 8-cell `eventSourceCount: 6`.
- **Next best step:** Activate Phase 1 — resident bar budget + logout `clearChartClientCache`.

### 2026-07-23 — Journal chrome single-row merge (layout A)

- **Goal:** Combine Journal title row with tabs/filters into one toolbar; keep settings dismiss via cog + title.
- **Completed:** Removed separate `JournalTileNav`; `JournalModuleHeader` + `JournalTileChrome` (title/actions); wired dashboard/trades/settings; focused tests + architecture docs.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 16 passed (16)`.
- **Next best step:** App-level single-row walkthrough on `/workspace` journal tile.

### 2026-07-23 — Open-risk header chrome

- **Goal:** Ambient live-IB open positions chip + management popover accessible from any module header.
- **Completed:** `OpenRiskPositionsMenu`, workspace bridge, rail badge, palette command, focused tests, harness + trading docs.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 29 passed (29)`.
- **Next best step:** App-level walkthrough with connected account and open positions.

### 2026-07-23 — Copilot model settings UX polish

- **Goal:** Search-first model settings modal with active chips, tabbed browse, and richer rows.
- **Completed:** Redesigned `CopilotModelSettingsModal`; extended focused tests; AI architecture doc update.
- **Verification run:** **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)`.
- **Architecture review:** self-review **Passed**.
- **Next best step:** App-level settings chips/tabs/search walkthrough when prioritized.

### 2026-07-23 — Copilot model settings

- **Completed:** Runtime Copilot model management — settings cog + modal, OpenRouter popular/recent catalog API, client enabled-model store, picker updates without restart; focused tests + architecture doc updates.
- **Verification run:** **Focused:** `Test Files 8 passed (8)`, `Tests 61 passed (61)`.
- **Architecture review:** self-review **Passed**.
- **Next:** App-level settings modal walkthrough when prioritized.

### 2026-07-23 — Journal import modal UX polish

- **Goal:** Reshape import popup — action-first drop zone, collapsed IB help, clear busy/success/error states.
- **Completed:** Reworked `JournalImportDialog`; footer only on success (Done / Import another); focused tests.
- **Verification run:** **Focused:** `Test Files 1 passed (1)`, `Tests 4 passed (4)`.
- **Next best step:** App-level open import → expand help → drop CSV → Done.

### 2026-07-23 — Journal sync/import icon buttons

- **Goal:** Replace journal Sync/Import text buttons with icon buttons; import modal with IB Flex instructions + drag/drop; sync icon shows busy spinner.
- **Completed:** `SyncIcon`/`UploadIcon`; `JournalTileNav` + empty-state icon actions; `JournalImportDialog` drop zone + steps; focused tests.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 10 passed (10)`.
- **Next best step:** App-level import/sync walkthrough in workspace journal tile.

### 2026-07-23 — Standalone Copilot app

- **Goal:** Port existing sidebar `CopilotPanel` to a dedicated `/copilot` module page without changing the sidebar panel.
- **Completed:** `CopilotModuleShell`, `CopilotRuntimeProviders`, `createStubAppActions`, `/copilot` route, home hub card, `AppModule` `"copilot"` in `lastModule`.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 17 passed (17)`; **Build:** `✓ Compiled successfully in 8.7s` (TS blocked by pre-existing chart-workspaces sidebar type error); **App-level:** `GET /copilot` → `200` + `data-testid="copilot-page"`.
- **Next best step:** none — chart-backed tools on standalone page degrade without live chart tile (by design).

### 2026-07-23 — Risk calculator IBKR Reg T margin estimates

- **Goal:** Align Risk calculator fallback margin estimates with IBKR published Stock Margins (screenshot: long Reg T 50%/maint 25%; short >$16.67 Reg T 50%/maint 30%).
- **Completed:** `resolveIbkrStockMarginRates`; estimate path no longer treats notional as 100% cash; short `projectHoldToStop` uses `(1+m)`; wired entry price into `useRiskMarginContext`.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 59 passed (59)`.
- **Next best step:** App-level CSCO overnight short walkthrough on connected IB account.

### 2026-07-22 — AI agent Phase 8 (workflow polish — closeout)

- **Goal:** Guided Copilot workflows via prompt library; model-visible source/freshness; gate `prepare_chart_for_analysis`; align playbooks handoff without implementing Phase D.
- **Completed:** `promptLibrary.ts` + empty-state chips; prepare confirm gate; `dataProvenance` on chart tools; orchestrator citation prompt; docs/harness updates.
- **Verification run:** **Focused:** `Test Files 14 passed (14)`, `Tests 65 passed (65)`; **Build:** `✓ Compiled successfully in 10.6s` (TS gate blocked by pre-existing chart-workspaces sidebar type).
- **Next best step:** AI agent track complete (Phases 0–8). Pick next WIP=1 when prioritized.

### 2026-07-22 — AI agent Phase 8 (workflow polish — start)

- **Goal:** Guided Copilot workflows via prompt library; model-visible source/freshness; gate `prepare_chart_for_analysis`; align playbooks handoff without implementing Phase D.
- **Completed:** Harness activated under WIP=1; implementation started.
- **Verification run:** Superseded
- **Next best step:** Finish prompt chips, provenance wiring, focused/build tests, closeout harness.

### 2026-07-23 — AI agent Phase 7 (model picker)

- **Goal:** Allowlist model picker with per-thread override; persist `modelId`; send resolved id on chat; defer intelligent router and direct providers.
- **Completed:** `listAgentModels()`; Copilot header model `EdgeSelect`; thread `modelId` across schemas/client/repo/DB migration; hook + `streamChat` wiring; focused tests + docs/harness updates.
- **Verification run:** **Focused:** `Test Files 9 passed (9)`, `Tests 41 passed (41)`; **Build:** `✓ Compiled successfully in 9.7s` (TS gate blocked by pre-existing chart-workspaces sidebar type).
- **Next best step:** Activate Phase 8 (workflow polish) under WIP=1 when prioritized.

### 2026-07-23 — AI agent Phase 6 (thread persistence)

- **Goal:** Copilot history survives refresh via localStorage + optional Postgres; thread list/rename/delete; annotation deep-link thread switch.
- **Completed:** `user_copilot_threads` migration + repository + `/api/me/copilot-threads`; local store + client sync; multi-thread hook + panel UX; docs/harness updates.
- **Verification run:** **Focused:** `Test Files 10 passed (10)`, `Tests 30 passed (30)`; **Build:** `✓ Compiled successfully in 10.0s` (TS gate blocked by pre-existing chart-workspaces sidebar type).
- **Next best step:** Activate Phase 7 (model picker) under WIP=1 when prioritized.

### 2026-07-23 — AI agent / in-app copilot Phase 5 (closeout)

- **Goal:** Bidirectional chart↔chat linkage (rich-annotations Phase C).
- **Completed:** `messageId` schema + `assistantMessageId` chat contract; orchestrator/confirm re-exec stamp `threadId`/`messageId`; `CopilotProvider` focus + fallback rationale; toolbar “Open in chat” + accept→`accepted`; `summarize_chart` narrative + link IDs; architecture + roadmap + harness updates.
- **Verification run:** **Focused:** `Test Files 10 passed (10)`, `Tests 58 passed (58)`; **Build:** `✓ Compiled successfully in 9.4s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** linkage walkthrough deferred.
- **Next:** Activate Phase 6 (thread persistence) under WIP=1 when prioritized.

### 2026-07-23 — AI agent / in-app copilot Phase 5 (start)

- **Goal:** Bidirectional chart↔chat linkage (rich-annotations Phase C): stamp conversation IDs on AI drawings; open Copilot on annotation click; accept/dismiss provenance; rationale-aware `summarize_chart`.
- **Completed:** Harness activated under WIP=1; implementation started.
- **Verification run:** Deferred.
- **Next:** Complete focused tests + app-level linkage walkthrough; mark Phase 5 **Passing**.

### 2026-07-23 — Journal ignore-from-stats (closeout)

- **Goal:** Exclude test/live verification trades from performance stats without deleting IBKR fills.
- **Completed:** `journal_trades.ignored` column + PATCH/rebuild preserve; stats filter choke point; trade detail toggle + Ignored badge; AI `update_journal_trade_review` supports `ignored`; live BBD round-trip marked ignored.
- **Verification run:** **Focused:** `Test Files 29 passed (29)`, `Tests 188 passed (188)`; **App-level:** BBD `ignored:true`; stats `closedCount:11→10`, `netPnL:11299.70449145299→11299.85765545299`; **Architecture review:** self-review **Passed**.
- **Next:** Resume AI agent Phase 5 under WIP=1 when prioritized.

### 2026-07-23 — AI agent / in-app copilot Phase 4 (closeout)

- **Goal:** Unlock Copilot write mutations with in-chat confirm cards for destructive/high-impact tools and AI drawing proposed defaults.
- **Completed:** `confirmGate.ts` + write-mode orchestrator; chat route honors `permissionMode`; Copilot Accept/Reject cards + confirmed re-exec; agent-path `add_drawing` defaults; architecture + roadmap + harness updates.
- **Verification run:** **Focused:** `Test Files 9 passed (9)`, `Tests 47 passed (47)`; **Build:** `✓ Compiled successfully in 8.9s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** Copilot confirm/drawing walkthrough deferred.
- **Next:** Activate Phase 5 (chart↔chat linkage) under WIP=1 when prioritized.

### 2026-07-22 — AI agent / in-app copilot Phase 3 (closeout)

- **Goal:** Productize session bridge so in-app (and MCP) agents execute client-state read tools against the live desk.
- **Completed:** `executeClientSessionTool` + `session.bridge` structured logs; orchestrator awaits `enqueueSessionExecution` for `requiresClientSession` tools; single-consumer poll dispatch; default read grant; `AiSessionBridge` posts failure results on execute throw; architecture + roadmap + harness updates.
- **Verification run:** **Focused:** `Test Files 25 passed (25)`, `Tests 132 passed (132)`; **Build:** `✓ Compiled successfully in 9.7s`; TS exit blocked by pre-existing `chart-workspaces/default/route.ts` sidebar type error; **Architecture review:** self-review **Passed**; **App-level:** Copilot `get_chart_state` / `summarize_chart` via bridge deferred.
- **Next:** Activate Phase 4 (confirmed writes) under WIP=1 when prioritized.

### 2026-07-22 — Yahoo 5m candle range clamp (closeout)

- **Goal:** Restore chart candles after `FAILED TO LOAD SYMBOL` / Yahoo “within the last 60 days” on 5m.
- **Completed:** `clampYahooChartPeriod` in `yahooFinance` (1m≤7d, 5m/15m/30m≤60d, 1h≤730d); `rangeForManualInterval` uses Yahoo-safe defaults for short intraday; docs + tests.
- **Verification run:** **Focused:** `Test Files 2 passed (2)`, `Tests 17 passed (17)`; **App-level:** candles API `count 7563` `meta.source: yahoo`; workspace APLD 5m chart visible.
- **Next:** TWS account reconnect is separate; resume AI agent Phase 4 or broker reconnect under WIP=1 when prioritized.

### 2026-07-22 — AI agent / in-app copilot Phase 1 (closeout)

- **Goal:** Server streams a read-only tool-using completion via OpenRouter against registry read tools.
- **Completed:** `OpenRouterModelProvider` (SSE parse + tool mapping); read-only orchestrator with 8-round cap; `POST /api/ai/chat` NDJSON stream; optional `workspaceSnapshot`; client-session tools return structured deferral until Phase 3; architecture + roadmap + harness updates.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 35 passed (35)`; **Build:** compile OK; TS exit blocked by pre-existing `JournalTradesView.tsx` error; **Architecture review:** self-review **Passed**; **App-level:** curl smoke with key deferred.
- **Next:** Activate Phase 2 (copilot chat shell) under WIP=1 when prioritized.

### 2026-07-22 — Day classification Phase 2 (closeout)

- **Goal:** Cohort browse — filter confirmed day profiles and open sessions on the active chart.
- **Completed:** `src/lib/dayProfiles` (CSV load/filter/RTH open); `GET /api/day-profiles`; Days sidebar panel with L1–L3/L5 filters; open via `patchActiveCell` + `requestChartGoto`.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 12 passed (12)`; **App-level:** Days panel `50 sessions`; API filter `trend+open_drive` → `3`; AAPL 2026-07-15 card → **`AAPL · Edge`** + **`5m`**.
- **Next:** Day classification Phase 3 rules-assist residual or next backlog under WIP=1.

### 2026-07-22 — App-level verification Phase 8 (closeout)

- **Goal:** Close deferred human day-profile label review (roadmap Phase 8 checklist 8.1).
- **Completed:** Reviewed all 50 rows in `batch-20260718.csv` against visual guide + RTH 5m open windows; filled `openType`, confirmed/corrected L1 in `dayTypeHint`, set `status=confirmed`.
- **Verification run:** **App-level:** 8.1 `confirmed:50` `rejected:0`; openType `open_auction:19` `open_test_drive:14` `open_drive:12` `open_rejection_reverse:5`; calibration samples AAPL 2026-07-15 trend/open_drive, SPY 2026-07-17 neutral/open_auction, NVDA 2026-07-10 trend/open_drive, TSLA 2026-07-06 trend/open_test_drive.
- **Next:** Day classification Phase 2 (cohort browse) or next backlog under WIP=1.

### 2026-07-22 — App-level verification Phase 8 (start)

- **Goal:** Close deferred human day-profile label review (roadmap Phase 8 checklist 8.1).
- **Completed:** Harness activated under WIP=1; CSV accept convention locked (`dayTypeHint` = final L1, fill `openType`, `status=confirmed|rejected`).
- **Verification run:** Deferred — 50-row review of `batch-20260718.csv` against visual guide + Edge 1D/5m.
- **Next:** Confirm all rows and close verification track + day-classification Phase 1.

### 2026-07-22 — App-level verification Phase 7 (closeout)

- **Goal:** Close deferred data serving, health, and residual Pending UI app-level proofs (roadmap Phase 7 checklist 7.1–7.7).
- **Completed:** One desk session on `localhost:3003`: client TTL cache, hidden-tab ingest + home remote cards, chart quote/streaming badge, controlled Gateway blip, after-hours watchlist recovery, Patterns browse, market-context crumbs + screener columns; residual Pending rows updated.
- **Verification run:** 7.1 MSFT search delta:0 + market-context crumbs; 7.2 hidden-tab no ingest storm + home workspaces count:5; 7.3 streaming badge + tab quote; 7.4 gateway blip bypass/disconnect; 7.5 after-hours Yahoo fill; 7.6 Patterns records count:2; 7.7 crumbs + Columns (options/latency Skipped).
- **Next:** Activate Phase 8 under WIP=1.

### 2026-07-22 — App-level verification Phase 7 (start)

- **Goal:** Close deferred data serving, health, and residual Pending UI app-level proofs (roadmap Phase 7 checklist 7.1–7.7).
- **Completed:** Harness activated under WIP=1; browser walk starting on `/workspace`.
- **Verification run:** Deferred — 7.1 client TTL, 7.2 hidden-tab+home remote, 7.3 pan remount, 7.4 Data Health fault, 7.5 off-hours freshness, 7.6 Patterns browse, 7.7 residual Pending UI rows.
- **Next:** Complete browser walks and quote evidence per item.

### 2026-07-22 — AI agent / in-app copilot Phase 0 (closeout)

- **Goal:** Freeze model gateway and chat wire contracts without live LLM, UI, or persistence.
- **Completed:** `src/lib/ai/model/` (ModelRef, allowlist, ModelProvider interface); `src/lib/ai/agent/contracts.ts` (chat request + stream events + confirm-required envelope); ownership map; `.env.example` OpenRouter vars; AI architecture + ai-tools-architecture + roadmap updates.
- **Verification run:** **Focused:** `Test Files 2 passed (2)`, `Tests 21 passed (21)`; **Architecture review:** self-review **Passed**; **App-level:** N/A (contracts only).
- **Next:** Activate Phase 1 (model gateway + read-only agent route) under WIP=1 when prioritized.

### 2026-07-22 — AI agent / in-app copilot Phase 0 (start)

- **Goal:** Freeze model gateway and chat wire contracts without live LLM, UI, or persistence.
- **Completed:** Harness activated under WIP=1; implementation started.
- **Verification run:** Deferred focused contract tests.
- **Next:** Land schemas, tests, docs; close Phase 0 **Passing**.

### 2026-07-22 — App-level verification Phase 6 (closeout)

- **Goal:** Close deferred workspace chrome and journal shipped-surface app-level proofs (roadmap Phase 6 checklist 6.1–6.11).
- **Completed:** One desk session on `localhost:3003/workspace`: Use/Edit+splitters, Trade desk preset + pill rename, tab quote, command palette, Graphite palette reload, border-legend rims, journal Open Positions + calendar selection, KPI + column reorder persist, BRUN trade drawer + capture guard, tile chrome density.
- **Verification run:** 6.1 Edit→Done + handles (drag/menu Skipped); 6.2 **Trade desk** + **undefinedPhase6-desk**; 6.3 **`NVDA 212.06 ▲ +2.30% · Edge`**; 6.4 palette **Change symbol**; 6.5 **Graphite** reload; 6.6 **Period**/ **Data**/ **Account**; 6.7 skeleton **Focused:** `Tests 7 passed (7)`; 6.8 calendar **`data-selected="true"`**; 6.9 columnOrder reload (flash Skipped); 6.10 BRUN drawer + NVDA capture gate **Focused:** `Tests 6 passed (6)`; 6.11 `journal-tile-nav`.
- **Next:** Activate Phase 7 under WIP=1.

### 2026-07-22 — App-level verification Phase 6 (start)

- **Goal:** Close deferred workspace chrome and journal shipped-surface app-level proofs (roadmap Phase 6 checklist 6.1–6.11).
- **Completed:** Harness activated under WIP=1; browser walk starting on `/workspace`.
- **Verification run:** Deferred — 6.1 Use/Edit+splitter, 6.2 presets+pill, 6.3 tab quote, 6.4 command palette, 6.5 palettes, 6.6 border-legend selects, 6.7 skeleton, 6.8 Open Positions+Calendar, 6.9 KPI+columns, 6.10 screenshots+forks, 6.11 chrome density.
- **Next:** Complete browser walks and quote evidence per item.

### 2026-07-22 — AI agent / in-app copilot roadmap

- **Goal:** Capture phased plan for in-app chat agent (OpenRouter-first, registry-only tools, session bridge, confirms, chart↔chat, persistence).
- **Completed:** Added `docs/roadmaps/ai-agent-roadmap.md` (Phases 0–8); indexed in `roadmaps/README.md` + `ROADMAP.md`; cross-linked AI architecture, rich-annotations Phase C, workspace-state deferral; Active Work **Pending** + Task Contract.
- **Verification run:** Docs-only (no runtime).
- **Next:** Continue app-level verification Phase 6 under WIP=1, or activate AI agent Phase 0 when prioritized.

### 2026-07-22 — App-level verification Phase 5 (closeout)

- **Goal:** Close deferred screener and Review app-level proofs (roadmap Phase 5 checklist 5.1–5.6).
- **Completed:** One desk session on `localhost:3003/workspace`: unified screener tile Save/Recent, `/screener/review` redirect, WorkspaceDrive ↑/↓ + BroadcastChannel, Gainers/Large-cap heat map, MACD compare; 5.6 Skipped (Phase 2.4).
- **Verification run:** 5.1 Save **Phase5-verify** `screen-1784758704071`; 5.2 unified tile (Keep/Skip Skipped); 5.3 **AAPL**→**ABBV** + BC **NVDA**; 5.4 `heatmap-view`; 5.5 MACD **11** + Compare PBR-A/CNQ.TO; 5.6 Skipped.
- **Next:** Activate Phase 6 under WIP=1.

### 2026-07-22 — App-level verification Phase 5 (start)

- **Goal:** Close deferred screener and Review app-level proofs (roadmap Phase 5 checklist 5.1–5.6).
- **Completed:** Harness activated under WIP=1; browser walk starting on unified screener tile (`/workspace?surface=screener`).
- **Verification run:** Deferred — 5.1 Save/Recent, 5.2 deep-link redirect, 5.3 chart drive, 5.4 heat map, 5.5 technical/compare, 5.6 Skip (2.4).
- **Next:** Superseded by Phase 5 closeout above.

### 2026-07-22 — Sticky `?surface=alerts` reopened closed Alerts tile

- **Goal:** Fix Alerts reappearing after remove + Done + refresh (prior deferred-remote fix was insufficient).
- **Completed:** Real root cause — sticky `/workspace?surface=alerts` re-ran `handleSurfaceIngress` on every load and reopened the tile (also forcing edit mode). Ingress is now one-shot (URL strip + session lock); close/Done clear ingress params.
- **Verification run:** `Test Files 3 passed (3)`, `Tests 25 passed (25)`; app-level close→Done→reload with no Alerts.
- **Next:** Activate App-level verification Phase 5 under WIP=1.

### 2026-07-22 — Workspace layout Done stomped by deferred remote

- **Goal:** Fix Alerts (and any closed tile) reappearing after **Done** + refresh.
- **Completed:** Root cause — deferred remote snapshot reapplied on exit from layout edit, overwriting the committed desk and re-saving to localStorage/cloud. **Done**/Escape now discards deferred remote; local commit wins and sync pushes.
- **Verification run:** `Test Files 1 passed (1)`, `Tests 12 passed (12)` (`AppWorkspaceContext.test.tsx`).
- **Next:** Superseded by sticky surface ingress fix (real user-facing cause).

### 2026-07-22 — App-level verification Phase 4 (closeout)

- **Goal:** Close deferred Risk and Trade UI app-level proofs (roadmap Phase 4 checklist 4.1–4.5).
- **Completed:** One desk session on `localhost:3003/workspace?surface=chart`: Risk calculator `$`/`%` sizing, margin Details, Liq+MARGIN CALL toggle, Long Position→Risk bind/sync, symbol Recent MRU (chart + Watchlist Add symbol).
- **Verification run:** 4.1 **179** shares / **$995** at risk; 4.2 **0% now → 158% after**; 4.3 **MARGIN CALL 13.34** while Risk open; 4.4 **linked to chart** Entry **325.62** Stop **319.96**; 4.5 Recent **MSFT/NVDA/AAPL**.
- **Next:** Activate Phase 5 (Screener and Review) under WIP=1.

### 2026-07-22 — App-level verification Phase 4 (start)

- **Goal:** Close deferred Risk and Trade UI app-level proofs (roadmap Phase 4 checklist 4.1–4.5).
- **Completed:** Harness activated under WIP=1 — Active Work Phase 4 **Active**; Task Contract + Current Verified State updated.
- **Verification run:** Browser walk session starting on `localhost:3003`.
- **Next:** Superseded by Phase 4 closeout above.

### 2026-07-22 — Alert AI / MCP tools (Phases 1–3)

- Shipped `AlertsPort`, 16 alert tools in registry, and `GET /api/me/alerts/events` for trigger audit history.
- **Verification:** `Test Files 17 passed (17)`, `Tests 83 passed (83)` (`src/lib/ai/`); architecture self-review **Passed**.
- **Next:** Superseded by App-level verification Phase 4 row.

### 2026-07-22 — App-level verification Phase 3 (closeout)

- **Goal:** Close deferred Scripts + chart fixtures app-level proofs (roadmap Phase 3 checklist 3.1–3.10).
- **Completed:** Batch A Scripts desk (3.1–3.3, 3.5–3.6 paste/Apply); Batch B `?scriptFixture=all` (3.4); Batch C chart chrome (3.7–3.10 Forecasting long+short yard lines on AAPL D).
- **Verification run:** 3.1 `cac0de58-…` Saved+Applied; 3.2 `GET /api/me/scripts/cac0de58-…` 200; 3.3 AI `281c31a5-…`; 3.4 seven goldens; 3.5 HTF `6f7db235-…` + dual `ec1dc037-…`; 3.6 `5e83ca34-…`; 3.7 `dupTailTs:false`; 3.8 inset `333px`; 3.9 Chicago/CDT + EDT override; 3.10 short `d1784746184432_vqbqd` maxR=2 `1R`/`2R`.
- **Next:** Activate Phase 4 (Risk and Trade UI) under WIP=1.

### 2026-07-22 — MCP call logging (single-user)

- **Goal:** Structured stderr JSON per MCP `tools/call` for local Cursor debugging (tool, ok, code, durationMs, bridge) without args/results/secrets.
- **Completed:** `logMcpToolCall` in `adapters/mcp.ts`; handler wrap with timing + bridge flag; unknown-tool log in `edge-mcp-server.mts`; focused tests; AI architecture docs updated.
- **Verification run:** **Focused:** `Test Files 1 passed (1)`, `Tests 6 passed (6)`; **Architecture review:** self-review **Passed**.
- **Next:** Activate App-level verification Phase 3 under WIP=1.

### 2026-07-22 — Local error log (solo observability)

- **Goal:** Persist redacted chart/API/script/window failures locally across reload; complete solo observability stack alongside Data Health, latency dumps, and reliability reports.
- **Completed:** `localErrorLogStore` + server wrapper; ingest route; client reporter; wiring in chart boundary, API errors, script coordinator, window handlers; CLI `report:local-errors`; `.edge/` gitignore; ARCHITECTURE + harness updates.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 17 passed (17)`; **Packages:** `build:packages` passed; **Build:** `✓ Compiled successfully in 9.4s`; **App-level:** `npm run report:local-errors -- --limit 1` → `[app-level] local error log smoke`.
- **Next:** Activate App-level verification Phase 3 under WIP=1.

### 2026-07-22 — Journal AI tools Phase 2 (complete)

- **Goal:** Add analytics + chart journal AI tools under WIP=1 (reuse `journalStats` / `chartDeepLink`; no new REST).
- **Completed:** Six tools in `tools/journal.ts`; shared load/filter helpers; focused tests (13 journal / 67 AI suite); docs + harness updated; App-level verification Phase 2 paused to Pending.
- **Verification run:** **Focused:** `Test Files 1 passed (1)`, `Tests 13 passed (13)`; **Focused:** `Test Files 15 passed (15)`, `Tests 67 passed (67)` (`src/lib/ai/`).
- **Next:** Resume App-level verification Phase 2 (alerts reliability) under WIP=1 when ready.

### 2026-07-22 — App-level verification Phase 2 (closeout)

- **Goal:** Close deferred alerts reliability app-level proofs (roadmap Phase 2 checklist 2.1–2.6).
- **Completed:** Price/drawing/trade-plan/screener/indicator-watchlist/script cron walks with quoted notification evidence; roadmap Phase 2 **Passing**; harness Active Work + Task Contract updated.
- **Verification run:** `POST /api/cron/alert-evaluate` + `POST /api/cron/screener-alert-evaluate` via dev session; 2.1 `triggered:1`; 2.4 `notified:1` `Gainers today: 50 new matches`; 2.5 watchlist RSI `triggered:1`; 2.6 script snapshot `triggered:1`.
- **Next:** Activate Phase 3 (scripts and chart fixtures) under WIP=1.

### 2026-07-22 — App-level verification Phase 2 (start)

- **Goal:** Close deferred alerts reliability app-level proofs (roadmap Phase 2 checklist 2.1–2.6).
- **Completed:** Harness synced — Phase 1 Active Work **Passing**; Phase 2 **Active** under WIP=1; Task Contract + Current Verified State updated.
- **Verification run:** Deferred cron walks + quoted evidence per item.
- **Next:** Superseded — paused for Journal AI Phase 2; resume under WIP=1.

### 2026-07-22 — App-level verification Phase 1 (closeout)

- **Goal:** Close deferred live-IB / dual Gateway / trading app-level proofs (roadmap Phase 1).
- **Completed:** Checklist 1.1–1.10 PASS; 1.11 Skipped; applied journal migrations 0022/0023 so ingest could run; live BBD 1-share buy/sell flattened; harness + roadmap Phase 1 **Passing**.
- **Verification run:** Quoted in Active Work — paper `10204` Cancelled; live BBD `57`/`109` Filled; accounts `DUP586813`/`U25026894`; ingest `duplicates:2` `journalInSync:true`; live test position flat.
- **Next:** Activate Phase 2 (alerts reliability) under WIP=1 when cron env ready.

### 2026-07-22 — App-level verification Phase 1 (start)

- **Goal:** Close deferred live-IB / dual Gateway / trading app-level proofs (roadmap Phase 1).
- **Completed:** Harness activated under WIP=1 (Active Work + Task Contract + Current Verified State).
- **Verification run:** Deferred Gateways/sidecar smoke + checklist 1.1–1.11.
- **Next:** Superseded by Phase 1 closeout.

### 2026-07-22 — Journal Tier 3 (rating, compare, MFE/MFA)

- **Goal:** Close journal roadmap Tier 3 under WIP=1 sequential phases.
- **Completed:** 3.1 trade rating (schema/patch/filter/breakdown); 3.3 compare presets + dashboard UI; 3.4 STK excursion compute + persistence; migrations `0022`/`0023`; harness + roadmap updates.
- **Verification:** **Focused:** `Test Files 55 passed (55)`, `Tests 306 passed (306)`.
- **Next:** App-level rating/compare/excursion walkthroughs (verification Phase 6).

### 2026-07-22 — App-level verification roadmap (Phase 0)

- **Goal:** Document a phased verification roadmap; move deferred walkthrough debt off product tracks; mark shipped tracks complete for verification ownership.
- **Completed:** Authored `docs/roadmaps/app-level-verification-roadmap.md` (Phases 0–8); updated `docs/roadmaps/README.md`, `docs/ROADMAP.md`, and source track status notes; harness Pending row + Task Contract.
- **Verification:** Docs-only Phase 0 — no runtime change.
- **Blockers:** none.
- **Next best step:** Activate verification Phase 1 under WIP=1 when ready for a live IB session.

### 2026-07-22 — Journal + Account live position PnL

- **Goal:** Surface IB unrealized PnL on journal open lists at AccountProvider cadence; fix live Gateway Daily/position PnL stuck at `—`.
- **Completed:** Journal UI join + flash; live sidecar persistent `reqAccountUpdates`/`reqPnL` on `ib-live`; ephemeral position MKT/PnL backfill; snapshot `pnl` fallback from summary.
- **Verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 47 passed (47)`; **Sidecar:** `Ran 44 tests OK`; **Architecture review:** self-review **Passed**; **App-level:** deferred.
- **Blockers:** none.
- **Next best step:** Restart sidecar + confirm live Account tab Daily/position PnL and journal open positions populate.

### 2026-07-22 — App color palettes (mode + palette)

- **Goal:** Named palettes (Midnight, Graphite, Deep Slate) with light + dark variants; Application settings picker; persisted + synced.
- **Completed:** Token tables + CSS `data-palette` blocks; `appPalettePreference` + `AppThemeProvider` palette API; `AppSettingsShell` Appearance section; user-preferences pack; chart palette threading; harness/docs updates.
- **Verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 28 passed (28)`; **Build:** `npm run build:packages` passed; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**; **App-level:** deferred.
- **Blockers:** none.
- **Next best step:** App-level confirm palette switch updates chrome + chart; reload restores palette.

### 2026-07-22 — Journal Calendar P&L polish

- **Goal:** Mon–Fri calendar with week column, month rollup, heatmap intensity, compact cells, today/selected chrome (ideas 1–6 from polish plan).
- **Completed:** Extended `journalStats` calendar helpers; rebuilt `JournalCalendar` 6-col grid; wired `selectedDate` from `JournalDashboardView`; updated tests + ARCHITECTURE.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 72 passed (72)`; **Architecture review:** self-review **Passed**; **App-level:** deferred.
- **Blockers:** none.
- **Next best step:** App-level confirm calendar heatmap + selected-day ring on `/journal` dashboard.

### 2026-07-22 — Journal Open Positions tab

- **Goal:** Add Open Positions list tab next to Trades while keeping dashboard live IB open-positions card.
- **Completed:** `journalView=open`; `JournalTradesView variant="open"` with KPI cards + `filterOpenJournalTrades`; deep link `/journal/open`; tabs/sub-nav/ARCHITECTURE updated.
- **Verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 33 passed (33)`; **Architecture review:** self-review **Passed**; **App-level:** deferred.
- **Blockers:** none.
- **Next best step:** App-level confirm Open Positions tab shows open journal rows + KPI cards.

### 2026-07-22 — App UX polish Phase 5 closeout

- **Goal:** Close App UX polish Phase 5 without restyling finished UI — reconcile **Pending** status against component-standardization Phase 5 **Passing**.
- **Completed:** Re-ran `npm run ux:baseline`; updated `app-ux-polish-roadmap.md`, `docs/roadmaps/README.md`, Task Contract, Active Work row, Current Verified State; no production code changes.
- **Verification:** **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, horizontal overflow **0/12**, raw hex files (components) **8**, Tailwind palette files (components) **0**; **Architecture review:** self-review **Passed**.
- **Blockers:** none.
- **Next best step:** Superseded by Journal Open Positions tab.

### 2026-07-22 — Journal KPI cards + sync status UX

- **Goal:** Fix journal hero KPI card layout across tile densities; flash account equity on live IB updates; replace long out-of-sync banner with compact chrome chip.
- **Completed:** Reflowed `JournalSummaryCards` to header/hero/secondary stack; equity flashes green/red for 2s on ≥$0.01 delta; added `JournalHistorySyncChip` (`History lagging` / `Catching up`) in tile nav + standalone dashboard header; removed content-area banner.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 61 passed (61)`; **Architecture review:** self-review **Passed**.
- **Next best step:** App-level narrow/wide tile + equity flash walkthrough; resume Alerts Phase 4 follow-ups under WIP=1.
- **Blockers:** none.

### 2026-07-22 — Screener tile simplify (drop Review rail, save/name, recent)

- **Goal:** Full-width workspace screener tile with top screen chips, Recent row, always-visible name + Save; remove Review/Keepers sub-nav from product surface.
- **Completed:** `ScreenerTileSurface` always mounts unified screens pane; legacy `screenerView` coerced to `screens`; module/deep-link ingress updated. App variant hides Screens aside, shows horizontal chips + Recent (`recentScreenIds` in `ScreenerState`); `ScreenerScreenNameSave` with validation errors; `handleSaveScreen` update-or-insert for non-starter active screens. Docs + harness updated.
- **Verification run:** **Focused:** `Test Files 6 passed (6)`, `Tests 29 passed (29)`.
- **Next best step:** App-level save/recent walkthrough on workspace tile; resume Alerts Phase 4 follow-ups under WIP=1.
- **Blockers:** none.

### 2026-07-21 — Screener Review UI workspace tile gap fix

- **Goal:** Make Review (and Keepers) reachable in the workspace screener tile so mid-review UX + `reviewResume` are usable after `/screener/*` redirects.
- **Completed:** `ScreenerTileSurface` switches on `screenerView` with in-tile `ScreenerSubNav`; mounts `ScreenerReviewView` / `ScreenerKeepersBody`; screens/results keep Option A unified pane. `ModuleToWorkspaceRedirect` + screener pages pass `screenerView`; `buildIngressSurfaceState` applies it; deep-link constants updated. Docs: `appWorkspace/ARCHITECTURE.md`, `screener-roadmap.md`, harness.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 16 passed (16)`; related screener review/results `Test Files 2 passed (2)`, `Tests 6 passed (6)`.
- **Next best step:** Optional app-level Keep/Skip + refresh on `/workspace?surface=screener&screenerView=review`; else next WIP=1.
- **Blockers:** none.

### 2026-07-22 — Workspace state persistence app-level walkthroughs

- **Goal:** Close deferred app-level verification for workspace state persistence Phases 1–5.
- **Completed:** Ran walkthroughs on `localhost:3003` (applied missing migrations `0016`–`0018` earlier). P1 two-tile AAPL/MSFT refresh **PASS**; P2 clear `tv-ai:app-workspaces:v1` → remote desk restore **PASS**; P3 theme prefs clear-local restore **PASS**; P4 zoom/refresh/reset/range-clear viewport **PASS**; P5a `reviewResume` local survive **PASS** but Review UI **BLOCKED** at the time (`/screener/review` → workspace tile without `ScreenerReviewView` — closed 2026-07-21); P5b pattern capture via POST **PASS** (`capture-phase5-review-1784681159`).
- **Verification run:** App-level evidence recorded in Active Work + Previous Verified State rows (quoted observations above).
- **Next best step:** Superseded by Screener Review UI workspace tile gap fix.
- **Blockers:** none (Review UI gap closed).

### 2026-07-21 — Data serving efficiency Phase 7 Skipped + track closeout

- **Goal:** Close multi-instance Redis scale gate and finish the data-serving efficiency track.
- **Completed:** Phase 7 marked **Skipped** — single-user product stays on one Node; process-local HotStore/DataCache sufficient; no Redis adapter. Roadmap/README/ROADMAP/ARCHITECTURE + Task Contract updated to track complete.
- **Verification run:** Decision gate closed by product owner; Phases 0–6 evidence unchanged (**Focused:** `Test Files 7 passed (7)`, `Tests 45 passed (45)`; **Build:** `✓ Compiled successfully in 11.2s`); **Architecture review:** self-review **Passed**.
- **Next best step:** Select next roadmap under WIP=1.
- **Blockers:** none.

### 2026-07-21 — Data serving efficiency Phase 6 (complete)

- **Goal:** One layout write path; cheaper layout dirty/merge compare; session reuse for journal/pattern `/api/me` GET remount thrash (no TanStack Query).
- **Completed:** `@deprecated` test-only `saveLayout`/`clearLayout` + production write lock test; `layoutContentFingerprint` wired into `workspaceActiveContentKey` and `mergeRemoteWorkspaces`; `journal_trades`/`journal_fills`/`pattern_library_records` `ClientTtlCache` namespaces with invalidation on ingest/mutations/capture edits.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 45 passed (45)`; **Build:** `✓ Compiled successfully in 11.2s`; **Architecture review:** self-review **Passed**.
- **Next best step:** Superseded by Phase 7 Skipped + track closeout.
- **Blockers:** none.

### 2026-07-21 — Data serving efficiency Phase 6 (start)

- **Goal:** One layout write path; cheaper layout dirty/merge compare; session reuse for journal/pattern `/api/me` GET remount thrash (no TanStack Query).
- **Completed:** (in progress)
- **Verification run:** Superseded
- **Next best step:** Land layout lock + fingerprint + persistence GET memo; run focused tests + build.
- **Blockers:** none.

### 2026-07-21 — Data serving efficiency Phase 5 (complete)

- **Goal:** Safe GET browser cache headers, in-app AI fetch-port session memo, pattern taxonomy disk I/O reduction.
- **Completed:** `privateCacheControl` on GET `/api/fundamentals` + `/api/market-data/context`; `createFetchMarketDataPort` memo for search/quotes/ai_candles via `ClientTtlCache`; taxonomy mtime memory cache in `patternLibrary/storage.ts`; MCP/service port documented as HotStore-only (no double-cache).
- **Verification run:** **Focused:** `Test Files 6 passed (6)`, `Tests 22 passed (22)`; **Build:** `✓ Compiled successfully in 8.0s`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate **Phase 6** (layout truth + optional `/api/me` client cache) under WIP=1.
- **Blockers:** none.

### 2026-07-21 — Notifications + Alerts Phase 3 (complete)

- **Goal:** Power-user alert conditions without external delivery — indicator level/cross, watchlist-wide scope, 2-leg AND/OR.
- **Completed (3a):** `0021_alert_conditions.sql`; JSONB `conditions` + `combinator`; multi-leg AND/OR combinator edge in cron eval; Alerts tile second-leg UI.
- **Completed (3b):** `indicatorAlertEval.ts`; server candle fetch + `IndicatorPlugin.compute` for RSI/MACD/MA/EMA; level + cross modes in Alerts config.
- **Completed (3c):** `watchlist_id` + `symbol_state`; `resolveAlertSymbols.ts`; per-symbol fire/cooldown; watchlist scope picker + library rail labels.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 38 passed (38)`; **Build:** `✓ Compiled successfully in 9.3s`; **Architecture review:** self-review **Passed**.
- **Next best step:** Select next roadmap under WIP=1; semantic/AI alert tools + Script Depth Phase 4 script conditions remain deferred.
- **Blockers:** none.

### 2026-07-21 — Notifications + Alerts Phase 2 (complete)

- **Goal:** Trade-plan alert bundles from position drawings + screener match notifications on saved screens.
- **Completed (2a):** `0019_alert_trade_plan_bundle.sql`; `drawingRole` + `bundleId`; `tradePlanAlerts`; role-aware `drawingAlertSync`; overlay **Add trade plan alerts…**; Alerts UI labels.
- **Completed (2b):** `0020_screener_alerts.sql`; `runScreenerAlertEvaluation`; symbol diff + cooldown; `/api/me/screener-alerts` + `/api/cron/screener-alert-evaluate`; `ScreenerAlertToggle` + `ScreenerAlertsStrip`.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 16 passed (16)`; **Build:** `✓ Compiled successfully in 12.5s`; **Architecture review:** self-review **Passed**.
- **Next best step:** **Alerts Phase 3** (delivery channels + indicator conditions) when selected; app-level trade-plan + screener cron walkthroughs deferred.
- **Blockers:** none.

### 2026-07-21 — Notifications + Alerts Phase 1 (complete)

- **Goal:** Drawing-bound alerts on horizontal line, trend line, and rectangle with server cron evaluation and in-app delivery.
- **Completed:** `0017_alert_drawing_bind.sql`; `drawingAlertGeometry` + `drawingAlertSync`; overlay **Add alert on drawing…**; Alerts tile bind UI; `enter_zone`/`exit_zone`; trendline interpolation; geometry sync on edit + expire on delete.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 41 passed (41)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**.
- **Next best step:** App-level drawing-bound flows; activate **Alerts Phase 2** when selected.

### 2026-07-21 — Workspace state persistence Phase 5 + track (complete)

- **Goal:** Resume in-progress screener review and user-scoped pattern captures without persisting stale market tables.
- **Completed:** `reviewResume` + query fingerprint on screener library snapshot; ScreenerProvider/session hydrate + debounced sync; `0018_pattern_library.sql` + repository + store adapter; `/api/me/pattern-library/*` + FS facade; AI tools routed through store; options draft deferred; journal columns confirmed in Phase 3 pack.
- **Verification run:** **Focused:** `Test Files 6 passed (6)`, `Tests 47 passed (47)`; **Build:** `✓ Compiled successfully`; **Architecture review:** self-review **Passed**.
- **Next best step:** Track closed — pick next roadmap under WIP=1.
- **Blockers:** none.

### 2026-07-21 — Workspace state persistence Phase 4 (complete)

- **Goal:** Persist modified chart viewport (zoom/pan/manual price scale) on `CellConfig`; restore after refresh within the same candle session; clear on reset and session-field changes.
- **Completed:** `CellConfig.viewport` + `cellConfigSchema`; `applyViewportSnapshot` on chart handle; `useViewportPersistSync` write/clear/restore; ChartCell symbol transition-only reset; reset chart view clears persisted snapshot; architecture/features/roadmap updates.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 19 passed (19)`; **Build:** `npm run build:packages` passed; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate **Phase 5** (workflow continuity) under WIP=1 when selected.
- **Blockers:** none.

### 2026-07-21 — Data serving efficiency Phase 4 (complete)

- **Goal:** Cut screener technical provider fan-out via universe-first daily candles, coalesced provider fetches, miss budget, and hit-rate metrics.
- **Completed:** `createScreenerDailyCandleFetcher` + `TECHNICAL_FILTER_PROVIDER_MISS_BUDGET` (50); wired Massive + FMP paths in `getScreenerResults`; `candleHitRate` / `indicatorHitRate` in aggregate detail; architecture + roadmap/harness updates.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 23 passed (23)`; **Build:** `✓ Compiled successfully in 8.4s`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate **Phase 5** (HTTP headers, AI port memo, pattern taxonomy) under WIP=1.
- **Blockers:** none.

### 2026-07-21 — Data serving efficiency Phase 3 (complete)

- **Goal:** Merge `loadMore` history into `chartClientCache`; preserve prepended bars on background refresh; document/lock shared quote map reuse for chart last price.
- **Completed:** `writeMergedChartClientCache` + `patchChartClientCacheHasMore`; `useChartDataFeed` loadMore/refresh cache writes; `resolveChartLiveQuotePrice` helper wired in `ChartCell`; architecture + roadmap updates.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 28 passed (28)`; **Build:** `✓ Compiled successfully in 7.7s`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate **Phase 4** (screener technical serving cost) under WIP=1.
- **Blockers:** none.

### 2026-07-21 — Workspace state persistence Phase 3 (complete)

- **Goal:** Revisioned user preference pack sync for theme, TZ, data connection, trading env/account/aliases, risk, and journal table prefs.
- **Completed:** `0016_user_preferences` migration; production Zod schema; repository/client/API; assemble/apply pack module; writer notify hooks; bootstrap + `useUserPreferencesRemoteSync`; `UserPreferencesSyncProvider` in `AppModuleShell`; inventory + catalog + architecture/roadmap/harness updates.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 22 passed (22)`; **Build:** `✓ Compiled successfully in 7.8s`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate **Phase 4** (modified viewport restore) under WIP=1.
- **Blockers:** none.

### 2026-07-21 — Workspace state persistence Phase 2 (complete)

- **Goal:** Cloud-sync app-workspace shell documents (`AppWorkspacesState`) via singleton revisioned Postgres library when session + Postgres configured.
- **Completed:** `0015_user_app_workspaces` migration; Drizzle `userAppWorkspaces`; repository/client/API; `useAppWorkspacesRemoteSync` + `resolveAppWorkspacesBootstrap`; `AppWorkspaceContext` committed-state sync with edit-mode defer; inventory + architecture/roadmap/harness updates.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 18 passed (18)`; **Build:** `✓ Compiled successfully in 7.6s`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate **Phase 3** (user preference pack) under WIP=1.
- **Blockers:** none.

### 2026-07-21 — Data serving efficiency Phase 2 (complete)

- **Goal:** Idle poll hygiene + home remote workspace truth without changing server cache layers.
- **Completed:** `ingestPollSchedule` helpers; `JournalSyncProvider` visibility skip/backoff + ledger-changed `lastSyncedAt`; `AccountProvider` hidden-tab snapshot poll skip; `resolveHomeWorkspaceTabs` + wired `useHomeWorkspaceSummaries` local-first remote merge; docs/harness updates.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 13 passed (13)`; **Build:** `✓ Compiled successfully in 9.0s`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate **Phase 3** (chart feed completeness + quote path sharing) under WIP=1.
- **Blockers:** none.

### 2026-07-21 — Data serving efficiency Phase 1 (complete)

- **Goal:** Wire `ClientTtlCache` into search, fundamentals, chart overlays, and market context so remount/reopen within TTL skips browser→API round-trips.
- **Completed:** `getOrFetchClientTtl` read-through helper; `searchClient`, `marketContextClient`, per-symbol `fundamentalsClient` cache, overlay TTL+coalesce in `apiChartDataFeed`; `clearEphemeralMarketDataCaches` on dev session unlock; focused tests + architecture/roadmap/harness updates.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 25 passed (25)`; **Build:** `✓ Compiled successfully in 7.9s`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate **Phase 2** (journal poll hygiene + home remote truth) under WIP=1.
- **Blockers:** none.

### 2026-07-21 — Workspace state persistence Phase 1 (complete)

- **Goal:** Independent chart layout per Chart tile across refresh; stop shared `tv-ai:workspace-tabs:v1` collisions.
- **Completed:** `chartWorkspaceId` on `TileInstance`; scoped load/save by tile; `ChartTileHost` → `StockApp` binding; bootstrap orphan-adopt guard for non-primary tiles; remote write-back + tile-close archive/dismiss; docs/inventory/harness updated.
- **Verification run:** **Focused:** `Test Files 9 passed (9)`, `Tests 73 passed (73)`; **Build:** `✓ Compiled successfully in 7.8s`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate **Phase 2** (app-workspace cloud sync) under WIP=1.
- **Blockers:** none.

### 2026-07-21 — Data serving efficiency Phase 0 (complete)

- **Goal:** Freeze shared client TTL cache primitive, namespace/key/TTL matrix, and coalesce-vs-TTL decision table without user-visible behavior change.
- **Completed:** `ClientTtlCache` + `clientCachePolicy` under `src/lib/marketData/cache/`; focused unit tests; architecture docs updated; roadmap Phase 0 **Passing**; Active Work **Passing**.
- **Verification run:** **Focused:** `Test Files 1 passed (1)`, `Tests 10 passed (10)`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate **Phase 1** (wire search/fundamentals/overlays/market context to `ClientTtlCache`) under WIP=1.
- **Blockers:** none.

### 2026-07-20 — Data serving & caching efficiency roadmap (planned)

- **Goal:** Document a phased plan for client cache reuse, poll hygiene, home remote truth, and remaining serving-cost gaps after the data-serving efficiency audit.
- **Completed:** Added `docs/roadmaps/data-serving-efficiency-roadmap.md` (Phases 0–7 + deferrals/verification/harness); indexed in `docs/roadmaps/README.md` and `docs/ROADMAP.md`; linked from `src/lib/marketData/ARCHITECTURE.md`; Active Work **Pending** + Task Contract.
- **Verification run:** Docs-only (roadmap authoring); architecture review self-review **Passed for roadmap**.
- **Next best step:** Activate **Phase 0** (client cache contract freeze) under WIP=1 when selected; then Phase 1 high-churn client reuse.
- **Blockers:** none.

### 2026-07-20 — Workspace state persistence Phase 0 (complete)

- **Goal:** Freeze persist/ephemeral contracts, keys ownership map, and Zod schema sketches without user-visible behavior change.
- **Completed:** Matrix + keys map in persistence + appWorkspace architecture docs; sketches for chart tile binding, user prefs pack, viewport; `workspaceStateStorageInventory.ts` + inventory lock tests; roadmap Phase 0 marked **Passing**; architecture review checklist ephemeral gate.
- **Verification run:** **Focused:** `Test Files 1 passed (1)`, `Tests 10 passed (10)`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate **Phase 1** (per-tile chart layouts) under WIP=1.
- **Blockers:** none.

### 2026-07-20 — Workspace state persistence Phase 0 (start)

- **Goal:** Freeze persist/ephemeral contracts, keys ownership map, and Zod schema sketches without user-visible behavior change.
- **Completed:** Phase 0 activated under WIP=1; architecture matrix + sketches in progress.
- **Verification run:** Superseded by Phase 0 complete entry above.
- **Next best step:** Superseded by Phase 0 complete entry above.
- **Blockers:** none.

### 2026-07-22 — Script depth Phase 5 (complete)

- **Goal:** Bounded declarative script-managed chart objects (`box`, `label`, `level`) on the price pane — separate from user DrawingStore.
- **Delivered:** `ScriptObjectDef` contracts + budgets; host peels `calculate().objects`; `scriptObjects` render layer below drawings; coordinator/provider threading; golden fixture `object-box-label`; SDK v6; docs + architecture updates. Script depth track **complete**.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 65 passed (65)`; **Packages:** `lint:package-boundaries` + `typecheck:packages` + `build:packages` passed; **Build:** `✓ Compiled successfully in 9.7s`; **Architecture review:** self-review **Passed**.
- **Next:** App-level `?scriptFixture=object-box-label` walkthrough deferred; activate next roadmap item under WIP=1.

### 2026-07-21 — Script depth Phase 3 (complete)

- **Goal:** Multi-timeframe / multi-symbol `request.series` for private scripts under strict host budgets.
- **Delivered:** `request.series({ symbol?, interval? })` SDK v4; collect/execute guest bootstrap; `alignSeriesToPrimary`; `ScriptSeriesResolver` injection from app chart feed; coordinator two-pass pipeline; golden fixtures promoted; docs + AI authoring context updated.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 51 passed (51)`; **Packages:** `lint:package-boundaries` + `typecheck:packages` + `build:packages` passed; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**.
- **Next:** Activate Script depth Phase 4 (script condition alerts) when alerts MVP sequencing allows; app-level HTF/MS walkthrough deferred.

### 2026-07-20 — Workspace state persistence roadmap (planned)

- **Goal:** Document a phased plan for desk-state gaps (per-tile charts, app-workspace cloud sync, user prefs, viewport restore, workflow resume).
- **Completed:** Added `docs/roadmaps/workspace-state-persistence-roadmap.md` with intent/checklist/phasing/verification/harness sections; indexed in `docs/roadmaps/README.md` and `docs/ROADMAP.md`; linked from persistence + appWorkspace architecture docs; Active Work **Pending** + Task Contract.
- **Verification run:** Docs-only (roadmap authoring); architecture review self-review **Passed for roadmap**.
- **Next best step:** Superseded by Phase 0 start entry above.
- **Blockers:** none.

### 2026-07-20 — Workspace layout persist alerts schema (complete)

- **Goal:** Fix workspace layout save/refresh resetting to single pane after Alerts Phase 0.
- **Delivered:** Added `alerts` to `surfaceIdSchema` plus `selectedAlertId` / `alertPrefill` on tile surface state; regression round-trip for three-col + Alerts.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 73 passed (73)`.
- **Next:** App-level `/workspace` Edit layout → 3 columns → assign Alerts → Save → refresh.

### 2026-07-20 — Journal trade screenshot capture display (complete)

- **Goal:** Fix broken/empty trade screenshot hero after **Capture chart** (docked panel crushed chart to ~49px; preview blob URLs revoked mid-load).
- **Delivered:** `prepareChartElementForCapture` clears overlay inset; `EdgeChart.captureSnapshot` calls `resize()` after expand; upload blob cache + safer revoke; hero `object-contain` + `max-h-80`.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 23 passed (23)`; **App-level:** Capture chart → blob preview **385×937**.
- **Next:** Optional capture quality pass for multi-surface narrow tiles.

### 2026-07-20 — Script depth Phase 2 (complete)

- **Goal:** Richer declarative plot visuals — markers, bgcolor tints, barcolor, stepline/circles/crosses/area/columns styles under `edge-indicator-sdk-3`.
- **Delivered:** Extended `ScriptPlotKind` + validation budgets; Canvas draw helpers; main-pane barcolor hook; legend/scale/WebGL gates; three golden fixtures promoted; docs + architecture updates.
- **Verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 52 passed (52)`; **Packages:** `lint:package-boundaries` + `typecheck:packages` + `build:packages` passed; **Architecture review:** self-review **Passed**.
- **Next:** Activate Script depth Phase 3 (MTF/MS requests) when selected.

### 2026-07-20 — Script depth Phase 1 (complete)

- **Goal:** Expand private My script TA SDK with movers, composites, oscillators, and glue helpers under `edge-indicator-sdk-2`.
- **Delivered:** 12 new `ta.*` helpers (host + guest lockstep); five Phase 1 fixtures promoted; docs/architecture updated.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 59 passed (59)`; **Packages:** boundaries + typecheck + build passed; **Startup:** `Test Files 3 passed (3)`, `Tests 26 passed (26)`; **Architecture review:** self-review **Passed**.
- **Next:** Activate Script depth Phase 2 (richer declarative plot visuals) when selected.

### 2026-07-20 — Journal trade ID source of truth (complete)

- **Goal:** Fix journal chart capture failing with "Journal trade not found" because UI used client-rebuilt local trade UUIDs instead of Postgres ids.
- **Delivered:** Server trades as list SoT in `journalClient.ts`; `adoptServerJournalTrades.ts` for metadata rematch + IndexedDB migration; docs in `journal/ARCHITECTURE.md`.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 9 passed (9)`; **App-level:** F trade capture → screenshot POST **201** on server id `55e35f51-9f78-4622-9cb0-8696a5a77220`.
- **Next:** App-level BRUN open-trade capture walkthrough.

### 2026-07-22 — Close position confirm UX (complete)

- **Goal:** Remove LIVE typing from close-position modal; Confirm close should flatten with one click.
- **Delivered:** `ClosePositionConfirmModal` drops type-LIVE input; Confirm click remains the gate; server `liveConfirmation: LIVE` still sent automatically on live.
- **Verification run:** **Focused:** `Test Files 2 passed (2)`, `Tests 29 passed (29)`.
- **Next:** Reload app and close a live position with Confirm close only.

### 2026-07-20 — Account panel UX (complete)

- **Goal:** Glanceable margin utilization, friendly account header label, position close via hover + context menu with confirm.
- **Delivered:** `AccountMarginSummary`, `resolveAccountPanelHeader`, inline rename, `buildClosePositionDraft`, `ClosePositionConfirmModal`, position row actions.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 29 passed (29)`.
- **Next:** App-level margin bar + close position on connected live IB account.

### 2026-07-20 — Script depth Phase 0 (complete)

- **Goal:** Lock extension seams before growing SDK or renderer — inventory, additive rules, reserved fixture slots; no runtime behavior change.
- **Delivered:** Pine→Edge inventory table; additive extension rules in `indicator-runtime/ARCHITECTURE.md` + `scriptContracts.ts`; `RESERVED_SCRIPT_DEPTH_FIXTURE_SLOTS`; doc cross-links; host/guest TA parity test.
- **Verification run:** **Focused:** `Test Files 2 passed (2)`, `Tests 18 passed (18)`; **Startup:** `Test Files 3 passed (3)`, `Tests 26 passed (26)`; **Architecture review:** self-review **Passed**.
- **Next:** Activate **Script depth — Phase 1** (TA helper expansion) under WIP=1 when selected.

### 2026-07-20 — Script depth Phase 0 (start)

- **Goal:** Lock extension seams before growing SDK or renderer — inventory, additive rules, reserved fixture slots; no runtime behavior change.
- **Delivered:** Harness Active row + Task Contract; implementation started under WIP=1.
- **Verification run:** Superseded by complete entry above.
- **Next:** Superseded by Script depth Phase 0 complete entry above.

### 2026-07-20 — Script depth roadmap (planned)

- **Goal:** Capture prioritized Pine-like script capability expansion as a phased track without activating WIP or adopting Pine syntax.
- **Delivered:** `docs/roadmaps/script-depth-roadmap.md` (Phases 0–5 + deferrals); index/cross-links in `roadmaps/README.md`, `ROADMAP.md`, TypeScript scripting deferrals, `features.md`, alerts roadmap Phase 4 handoff note; Active Work **Pending** row.
- **Verification run:** Docs-only — no code verification required for roadmap authoring.
- **Next:** Superseded by Script depth Phase 0 Active row.

### 2026-07-20 — Trade chart forks (complete)

- **Goal:** Attach editable live chart fork to existing journal trade (portal-first workflow); review with capture-time markup, screenshot, entry/exit markers; fork isolated from main workspace.
- **Delivered:** `journal_trade_chart_snapshots` migration + repo/API/client/IndexedDB; `captureTradeChartFork`; chart menu **Attach to journal trade…**; trade detail capture/list/open/delete; `TradeChartForkModal` with debounced save + reset-to-capture.
- **Verification run:** **Focused:** `Test Files 47 passed (47)`, `Tests 240 passed (240)`; **Build:** `npm run build` → `✓ Compiled successfully in 8.1s`.
- **Next:** App-level BRUN attach → open fork → edit drawing → confirm main chart unchanged.

### 2026-07-20 — Journal trade detail UX redesign (complete)

- **Goal:** Redesign trade detail drawer for quick trade review — screenshot hero, entry/exit/P&L outcome, human-readable fills, header symbol chart link.
- **Completed:** `JournalTradeDetail` layout reorder + outcome strip + fills table; `JournalTradeScreenshots` hero; `JournalTradeDetailHeaderTitle` + `EdgeSlideOver` ReactNode title; removed footer Open chart.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 13 passed (13)`.
- **Next:** App-level drawer walkthrough on live journal trade.

### 2026-07-20 — Scripts Monaco editor (complete)

- **Goal:** Replace Scripts tile textarea with a simple Monaco TypeScript editor.
- **Completed:** `@monaco-editor/react` + `monaco-editor`; `MonacoScriptEditor` wrapper; dynamic `ssr: false` import in `ScriptEditorPane`; editor keybindings for Run/Save; test mock via `next/dynamic`; features + roadmap doc updates.
- **Verification run:** **Focused:** `Test Files 1 passed (1)`, `Tests 3 passed (3)`. **Build:** `npm run build` → `✓ Compiled successfully in 8.2s`. **Startup:** `Test Files 3 passed (3)`, `Tests 26 passed (26)`.
- **Next best step:** App-level `/workspace` Scripts tile walkthrough.

### 2026-07-20 — Duplicate live tip candle fix (complete)

- **Goal:** Stop intermittent duplicate identical bar at the live tip.
- **Root cause:** Live poll treated a re-timestamped forming bar (old `t` gone, newer `t` present) as `append`, and `applyCandleReplaceLatest` also appended when `t` moved — chart kept both.
- **Delivered:** `streamDiff` remapped-tip → `replace-latest`; tip replace in `applyCandleReplaceLatest`; `useChartDataFeed` promotes full-interval-ahead replace to `append`.
- **Verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 42 passed (42)`.
- **Next:** App-level live chart confirm after a tip remap.

### 2026-07-20 — Journal trade screenshots (complete)

- **Goal:** Multi-screenshot attachments per trade in detail panel.
- **Delivered:** `journal_trade_screenshots` migration; filesystem store under `data/journal-screenshots/`; authenticated CRUD routes; `JournalTradeScreenshots` gallery (upload/paste/chart capture/lightbox); IndexedDB offline fallback.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 8 passed (8)`; **Build:** `npm run build` passed.
- **Next:** App-level attach/persist/delete walkthrough.

### 2026-07-20 — API client efficiency (ROI track) (complete)

- **Goal:** Cut redundant client→API traffic on candles, overlays, AI session, fundamentals, and duplicate POSTs.
- **Delivered:** Short poll ranges; overlay single events load; AI heartbeat/poll decoupling; fundamentals batch API + client; request coalesce + abort.
- **Verification:** **Focused:** `Test Files 16 passed (16)`, `Tests 70 passed (70)`; **Build:** `npm run build` passed.
- **Next:** App-level poll/batch/session confirm; resume Live journal auto-sync under WIP=1.

### 2026-07-20 — Chart overlay panel candle inset (complete)

- **Goal:** When a docked right overlay panel opens, shift candles left so they are not hidden behind the panel (without switching to inline chart reflow).
- **Delivered:** `chartOverlayRightInsetPx`; `SidebarPanelWidthContext.overlayInsetPx` + resize preview; `ChartGrid` `paddingRight` host inset; floating panels unchanged.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 13 passed (13)`.
- **Next:** App-level `/chart` overlay confirm; resume Live journal auto-sync under WIP=1.

### 2026-07-19 — IB Gateway soft-restart Sunday failure (in progress)

- **Goal:** Fix broken daily soft restart that left both Gateways logged out with no 2FA push.
- **Root cause:** (1) Soft restart on Sunday cannot replace IBKR-required cold restart — auth failed `DISCONNECT_AUTHORIZATION_FAILED` / `soft=0` instead of `soft=256`. (2) Persisted `jts.ini` `TimeZone=Africa/Abidjan` made `11:45 PM` fire at 7:45 PM ET. (3) VNC ports unpublished + malformed `.env` VNC line hid recovery UI.
- **Delivered:** `TWS_COLD_RESTART=08:00`, `TimeZone=America/New_York`, VNC `5901`/`5902`, compose/`TIME_ZONE` sync; Gateways recreated; sidecar restarted.
- **Verification:** paper `Login has completed` + sidecar paper connected; live awaiting Second Factor Authentication.
- **Next:** Approve live 2FA; confirm `ib-live gatewayConnected:true`.

### 2026-07-19 — Risk calculator NetLiquidation-only basis (complete)

- **Goal:** Remove Account basis dropdown; always size percent risk against IB NetLiquidation.
- **Delivered:** Dropped `accountBasis` from settings/UI; `resolveAccountBasisValue` hardwired to `NetLiquidation`; legacy `accountBasis`/`manualCapital` stripped on load; readout still shows “Net liquidation”.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 40 passed (40)`.
- **Next:** Activate next pending roadmap item under WIP=1.

### 2026-07-19 — Risk hold-to-stop margin UI condense

- **Goal:** Drop separate Hold block; blend liquidation into Margin.
- **Delivered:** `RiskMarginCard` shows `Liq · Stop reachable|Margin call first` under `$left · status` + Show on chart toggle; path diagram / Hold label removed.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 47 passed (47)`.
- **Next:** App-level Liq + chart line walkthrough when convenient.

### 2026-07-19 — Risk hold-to-stop margin (complete)

- **Goal:** Answer whether margin call happens before stop; show condensed Hold readout + optional chart liquidation line while Risk tab is open.
- **Delivered:** `projectHoldToStop` in `marginContext.ts`; Hold row + toggle in `RiskMarginCard`; `RiskLiquidationOverlayContext`; `buildMarginCallReferenceLines` merged in app `EdgeChart`; `showLiquidationLine` on `edge.riskSettings.v1`.
- **Verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 64 passed (64)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**.
- **Next:** App-level Hold verdict + chart line walkthrough when convenient.

### 2026-07-19 — Scripts workspace surface (complete)

- **Goal:** First-class workspace **Scripts** tile for My scripts library + in-tile editor; picker Edit/New routes to tile; Apply adds script to active chart.
- **Delivered:** `scripts` surface + `ScriptsTileSurface` / library rail / `ScriptEditorPane`; workspace `ScriptLibraryProvider`; script apply bridge; picker routing; `ScriptEditorModal` retired.
- **Verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 86 passed (86)`; **Build:** `npm run build` passed; **Architecture review:** self-review **Passed**.
- **Next:** App-level `/workspace` Scripts tile walkthrough when convenient.

### 2026-07-19 — Risk calculator input sync UX (complete)

- **Goal:** Replace the large Use last button with quiet refresh icons; allow re-sync from chart after manual edit via soft-unlink + relink.
- **Completed:** `markManualOverride` soft-unlinks (keeps bind); `relink()` restores live sync; `useRiskDrawingBinding` clears orphan bind when drawing deleted while paused; `RiskSettingsPanel` Entry/levels refresh icons + caption-only budget hint; tests + docs updated.
- **Verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 19 passed (19)`; **Architecture review:** self-review **Passed**.
- **Next:** App-level place Long → edit Entry → levels refresh walkthrough when convenient.

### 2026-07-19 — Risk Trade Size card (complete)

- **Goal:** Consolidate Risk calculator Shares + Margin into one Trade size card with a single stacked utilization bar, plain-language summary, and technical IB fields in Details.
- **Completed:** `computeMarginBarSegments` + plain status helpers in `marginContext`; merged `RiskMarginCard` (hero shares, at risk/cost, stacked bar, `$left · status`, Details disclosure); `RiskSettingsPanel` wired to single card; docs updated.
- **Verification:** **Focused:** `Test Files 2 passed (2)`, `Tests 35 passed (35)`; **Architecture review:** self-review **Passed**.
- **Next:** App-level merged card + Details walkthrough when convenient.

### 2026-07-19 — Risk calculator margin context (complete)

- **Goal:** Show current IB margin usage and incremental what-if hit on sized shares without changing risk sizing math.
- **Completed:** `marginContext` helpers; browser `whatIfClient`; `useRiskMarginContext` hook (400ms debounce + abort); `RiskMarginCard` under hero in `RiskSettingsPanel`; docs updated.
- **Verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 28 passed (28)`; **Build:** `npm run build` passed.
- **Next:** App-level margin vs Trade preview walkthrough when convenient.

### 2026-07-19 — Journal chrome density + underline tabs (complete)

- **Goal:** Collapse journal tile chrome into one toolbar row with underline Dashboard/Trades tabs; symbol search icon; fix summary cards stacking in standard density.
- **Completed:** `EdgeUnderlineTabs` primitive; `JournalViewTabs` + `JournalTileViewContext`; merged scope header; symbol field trailing search icon; `journalHeroCardSpanClass("standard")` → no col-span; docs updated.
- **Verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 60 passed (60)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.8s`).
- **Next:** App-level `/workspace` journal tile walkthrough when convenient.

### 2026-07-19 — Risk calculator redesign (complete)

- **Goal:** Redesign Risk sidebar as result-first Risk calculator (Option A); remove fallback/manual capital; calculator rail icon.
- **Completed:** Option A layout in `RiskSettingsPanel`; removed `manualCapital`/`Manual` basis with legacy parse migration; `$ absolute` default; `CalculatorIcon`; rail label **Risk calculator**; docs updated.
- **Verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 38 passed (38)`; **Build:** `npm run build` passed.
- **Next:** App-level Risk calculator walkthrough when convenient.

### 2026-07-19 — Chart modal workspace containment (complete)

- **Goal:** Center chart popups (symbol search, indicators, and other `EdgeModalShell` dialogs) within the chart tile instead of the full workspace viewport.
- **Completed:** `ModalContainmentProvider` + overlay host on `AppProviders`/`edge-app-shell` (symbol search lives in `ChartHeaderBar`, outside `ChartCell`); `EdgeModalShell` portals contained dialogs with `absolute` backdrop; design-system docs.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 6 passed (6)`; **App-level:** containment `parent`, dialog centered in chart tile, no overflow into journal/screener.
- **Next:** None for this item.

### 2026-07-19 — Risk panel position drawing bind (complete)

- **Goal:** Risk Position size entry/stop auto-bind to newest long/short on active chart with live sync and manual override.
- **Completed:** `RiskPositionBindingContext` + `useRiskDrawingBinding`; `RiskSettingsPanel` linked fields + hint; pure helpers for new-position detection; docs.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.9s`).
- **Next:** App-level place Long → Risk sync + drag + manual override walkthrough when convenient.

### 2026-07-19 — Border-legend select labels (complete)

- **Goal:** Labeled dropdowns show category on the top outline (border-legend) in journal, screener, and app header.
- **Completed:** `EdgeBorderLabeledControl` primitive; `EdgeSelect` labeled layout; journal filter drawer; screener Limit + query-builder categorical labels; app header Account/Data pickers; design-system docs.
- **Verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 43 passed (43)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 5.8s`).
- **Next:** App-level Journal Period / screener Limit / header Account+Data rim-label spot walkthrough when convenient.

### 2026-07-19 — DB-first normalized My scripts (complete)

- **Goal:** Postgres owns My scripts; browser is memory cache only; fix revision persist crash.
- **Completed:** Normalized `user_scripts` + `user_script_revisions`; `/api/me/scripts*` routes; async `ScriptLibraryPort`; removed snapshot sync/IDB authority; legacy import from old snapshot + IDB.
- **Verification:** **Focused:** `Test Files 3 passed (3)`, `Tests 14 passed (14)`; **Full:** `Test Files 537 passed (537)`, `Tests 3232 passed (3232)`, `npm run check` exit **0**.
- **Next:** App-level create/save/reload/apply walkthrough when convenient.

### 2026-07-19 — Chart clock app-default timezone bake-in fix (complete)

- **Goal:** Chart clock at bottom-right defaults to Application default timezone.
- **Completed:** `persistChartSettings` omits inherited TZ on save; ChartSettingsModal/EdgeChart merge with `defaultTimeZone`; one-time strip of baked factory UTC on ChartCell mount; stateMapping no longer bakes UTC into chart state.
- **Verification:** **Focused:** `Test Files 7 passed (7)`, `Tests 52 passed (52)`; **Packages:** `npm run build:packages` passed; **Build:** `✓ Compiled successfully in 6.2s` (unrelated typecheck failure in `scriptsLegacyImport.ts`).
- **Next:** App-level settings → clock inherit walkthrough when convenient.

### 2026-07-19 — EdgeSelect migration (complete)

- **Goal:** World-class dropdown chrome — shared `EdgeSelect` chip/field + segmented presets; migrate all native selects; ban regressions.
- **Completed:** `EdgeSelect` primitive; Phases 1–4 consumer migration (~40 controls); Phase 5 ban test + docs; migrated test suites for popover interaction; ChartCell tests wrapped with `AppTimeZoneProvider`; UX baseline journal-import capture scoped to tile nav.
- **Verification:** **Focused:** `Test Files 10 passed (10)`, `Tests 109 passed (109)`; **Build:** `✓ Compiled successfully in 5.5s`; **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`; **Full:** `Test Files 535 passed (535)`, `Tests 3227 passed (3227)`, `npm run check` exit **0**.
- **Next:** App-level Journal Period / screener segmented / settings select spot walkthrough when convenient.

### 2026-07-19 — App default timezone (complete)

- **Goal:** Application-wide default timezone in Application settings; chart clock inherits unless per-chart override.
- **Completed:** `appTimeZonePreference` + `AppTimeZoneProvider`; `AppSettingsShell` timezone select; `mergeChartSettings({ defaultTimeZone })`; legacy UTC stripped on layout load; `ChartCell` + `ChartRangeBar` wired.
- **Verification:** `Test Files 7 passed (7)`, `Tests 75 passed (75)`; `npm run build:packages` passed; `npm run build` passed (`✓ Compiled successfully in 6.3s`).
- **Next:** App-level settings → clock inherit + per-chart override walkthrough when convenient.

### 2026-07-19 — Journal chrome Option A (complete)

- **Goal:** Match screener-style module title; demote Settings to cog; remove duplicate per-view headers.
- **Completed:** `JournalTileNav` title row (Journal + Sync/Import + cog), Dashboard/Trades pills only; scope strip without view titles; Settings removed from `JournalSubNav`.
- **Verification:** `Test Files 4 passed (4)`, `Tests 8 passed (8)`; `npm run build` passed.
- **Next:** App-level `/workspace` journal tile walkthrough when polishing UX baseline captures.

### 2026-07-19 — Equity position size calculator (complete)

- **Goal:** Size equity trades from entry, stop, and configured risk budget.
- **Completed:** `computeEquityPositionSize` helper; Risk panel Position size section with Use last; Trade **Size for risk** button when plan levels linked.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 17 passed (17)`; **Build:** `✓ Compiled successfully in 5.6s`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate next pending roadmap item under WIP=1 when selected.

### 2026-07-19 — TypeScript indicator scripting Phase 5A (complete)

- **Goal:** AI authoring for private My scripts through governed tools.
- **Completed:** `ScriptLibraryPort`; seven AI tools; authoring context helper; source privacy on generic chart tools; delete confirmation + focused tests.
- **Verification run:** **Focused:** `Test Files 13 passed (13)`, `Tests 50 passed (50)`; **Build:** `✓ Compiled successfully in 5.7s`; **Full:** `Test Files 528 passed (528)`, `Tests 3182 passed (3182)`, `npm run check` exit **0**.
- **Next best step:** Activate Phase 5B when selected.

### 2026-07-19 — TypeScript indicator scripting Phase 4 (complete)

- **Goal:** V1 completeness and hardening.
- **Completed:** Contracts, TA SDK, chart delivery, error UX, a11y, docs, browser worker bundle fixes.
- **Verification run:** **Focused:** `Test Files 6 passed (6)`, `Tests 42 passed (42)`; **Full:** `Test Files 527 passed (527)`, `Tests 3173 passed (3173)`, `npm run check` exit **0**.
- **Next best step:** Activate Phase 5A when selected.

### 2026-07-19 — TypeScript indicator scripting Phase 4 (start)

- **Goal:** V1 completeness and hardening — inputs, conditional colors, typed errors, TA SDK, performance/reliability, a11y, docs.
- **Completed:** Phase 4 activated under WIP=1; harness + Task Contract updated.
- **Verification run:** Superseded by Phase 4 complete entry above.
- **Next best step:** Contracts → runtime → chart delivery → error UX → docs → V1 gate.

### 2026-07-19 — Workspace splitter hit targets (complete)

- **Goal:** Make workspace tile borders easy to click-drag resize (horizontal for side borders, vertical for top/bottom).
- **Delivered:** 8px overlay hit target on `SplitPane` over 1px hairline; hover/focus accent; safer pointer capture; focused drag/clamp tests.
- **Verification:** **Focused:** `Test Files 1 passed (1)`, `Tests 5 passed (5)`; **Architecture review:** self-review **Passed**.
- **Next best step:** App-level `/workspace` resize walkthrough in Edit layout; Save persists sizes.

### 2026-07-19 — TypeScript indicator scripting Phase 3 (complete)

- **Goal:** Basic editor + browser-local My scripts MVP without Postgres.
- **Delivered:** Script library storage/provider; My scripts picker; editor Run/Save/diagnostics; chart add/preview/resolver wiring; script settings from manifest.
- **Verification:** **Focused:** `Test Files 6 passed (6)`, `Tests 18 passed (18)`; **Packages:** boundaries + typecheck + build passed; **Build:** `✓ Compiled successfully in 5.4s`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 4 (V1 completeness and hardening) under WIP=1 when selected.

### 2026-07-19 — TypeScript indicator scripting Phase 2 (complete)

- **Goal:** Wire Phase 1 headless kernel into live chart via async result coordinator; four golden plot fixtures; built-ins unchanged.
- **Delivered:** `ScriptResultCoordinator`, worker client, per-chart provider wiring, fixture catalog/resolver, dev injector, Zod script identity.
- **Verification:** **Focused:** `Test Files 5 passed (5)`, `Tests 24 passed (24)`; **Packages:** boundaries + build passed; **Build:** `✓ Compiled successfully in 5.8s`; **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 3 (basic editor and local My scripts MVP) under WIP=1 when selected.

### 2026-07-19 — TypeScript indicator scripting Phase 2 (start)

- **Goal:** Wire Phase 1 headless kernel into live chart via async result coordinator; one user script renders/updates safely; four golden plot fixtures; built-ins unchanged.
- **Completed:** Harness activated under WIP=1; implementation in progress.
- **Verification run:** Superseded — see Phase 2 (complete) entry (`Test Files 5 passed (5)`, `Tests 24 passed (24)`).
- **Next best step:** Complete coordinator + chart wiring + dev fixture injector; record Phase 2 gate evidence.

### 2026-07-19 — TypeScript indicator scripting Phase 1 (complete)

- **Goal:** Harden headless compiler/runtime kernel with deterministic compile, guest lockdown, cancel/stale budgets, last-valid session, worker protocol, and adversarial test corpus — no chart UI.
- **Delivered:** `sourceNormalize`, `compilerService`, `runtimeHost`, `guestLockdown`, `guestTaBootstrap`, `scriptSession`; expanded contracts/budgets/validation; 12 fixtures + worker cancel tests.
- **Verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 41 passed (41)`; **Packages:** boundaries + typecheck + build passed; **Build:** `✓ Compiled successfully in 3.2s`; **Spike:** compile **33.8ms**, execute **95.2ms**; **Architecture review:** self-review **Passed**.
- **Next:** Activate Phase 2 (chart runtime vertical slice) under WIP=1 when selected.

### 2026-07-19 — TypeScript indicator scripting Phase 0 (complete)

- **Goal:** Prove script contracts, TypeScript compile diagnostics, QuickJS-WASM guest isolation with budgets, and one async result provider feeding all chart consumers.
- **Delivered:** `@edge/chart-core` script contracts/fixtures; `@edge/indicator-runtime` compile + QuickJS execute + worker entries; `IndicatorResultProvider` async bridge; spike example; architecture docs updated.
- **Verification:** **Focused:** `Test Files 4 passed (4)`, `Tests 27 passed (27)`; **Packages:** boundaries + typecheck + build passed; **Build:** `npm run build` passed; **Spike:** compile **18.1ms**, execute **97.0ms** @ 5k bars; **Architecture review:** self-review **Passed**.
- **Next:** Activate Phase 1 under WIP=1 when selected.

### 2026-07-19 — TypeScript indicator scripting Phase 0 (start)

- **Goal:** Prove script contracts, TypeScript compile diagnostics, QuickJS-WASM guest isolation with budgets, and one async result provider feeding all chart consumers.
- **Delivered:** Phase 0 implementation started under WIP=1.
- **Verification:** pending.
- **Next:** Complete Phase 0 gate tests and mark Active Work **Passing**.

### 2026-07-19 — TypeScript indicator scripting roadmap

- **Goal:** Plan a private, chart-only TypeScript scripting workflow for AI-generated indicators without application rebuilds or direct platform capabilities.
- **Delivered:** Approved V1 decisions; phased TypeScript SDK plan; guest WASM VM security boundary; one async result provider across draw/scale/legend/annotations/WebGL; dedicated runtime-package ownership; immutable script revisions; browser-local source library outside workspace payloads/static registry with bounded localStorage fallback; separate AI and optional-cloud phases; compatibility requirements and phase gates.
- **Verification:** `npm run check:startup` stopped at instruction validation with **1 pre-existing unrelated issue**: missing exact Task Contract heading for `Data hardening — post-review fixes`; roadmap files produced no reported issue. IDE documentation diagnostics: **0**.
- **Next:** Superseded by Phase 0 Active row above.

### 2026-07-19 — Data hardening post-review fixes

- **Goal:** Resolve review findings without changing the provider waterfall or weakening trading command gates.
- **Delivered:** JSON/nested diagnostic redaction and sanitized public TWS health DTO; disconnect-onset hysteresis; bounded fallback, heartbeat, failure, and inactive dataset state; no-throw conversion/finalization; age/failure-aware provider status; conservative pre-trade row; missing-anchor policy; failed recovery metrics; timeout/count-safe smoke runner; cleanup and architecture update.
- **Verification:** **Focused:** `Test Files 8 passed (8)`, `Tests 79 passed (79)`; **Governance:** `Data-state contracts valid: datasets=43 providers=7 routes=61 exclusions=12 issues=0`; **Broader market data:** `Test Files 80 passed (80)`, `Tests 445 passed (445)`; **Data Health UI:** `Test Files 5 passed (5)`, `Tests 15 passed (15)`; **Build:** `✓ Compiled successfully in 6.0s`, `Finished TypeScript in 6.8s`; **Smoke dry-run:** `passed=0 failed=0 skipped=4 dryRun=true`; **Architecture review:** self-review **Passed**.
- **Next:** No deferred review findings; external telemetry remains separately scoped.

### 2026-07-19 — Data inventory and state hardening Phase 8

- **Goal:** Make data reliability measurable and provider/dataset onboarding enforceable with bounded, process-local, privacy-safe state.
- **Delivered:** Reliability sample window/report/CLI; health API metrics; terminal failure and recovery instrumentation; route/provider/dataset governance gate; fault fixtures; optional smoke suite; centralized redaction; legacy provider cleanup; SLI/onboarding/incident architecture workflow. Startup baseline was repaired by accepting native Vitest count format; seven stale full-suite tests were aligned with current accessible roles/contracts before the passing full run.
- **Verification:** **Focused:** `Test Files 85 passed (85)`, `Tests 457 passed (457)`; **Governance:** `datasets=43 providers=7 routes=61 exclusions=12 issues=0`; **Fixture:** delivery/freshness **75.0% / 4**, partial **25.0% / 4**, fallback **3000ms / 1**, recovery **850ms / 1**; **Build:** `✓ Compiled successfully in 3.2s`; **Startup:** `Tests 26 passed (26)`; **App-level:** Yahoo candles **19**, TWS quotes **2**, retained **70/512**, fallback p95 **14094ms**, recovery p95 **1029ms**; **Full:** `Test Files 511 passed (511)`, `Tests 3044 passed (3044)`, `✓ Compiled successfully in 3.6s`; **Architecture review:** self-review **Passed**.
- **Next:** Keep operational reporting process-local; plan external telemetry, persistence, alerting, or enforced SLOs separately.

### 2026-07-19 — Data inventory and state hardening Phase 7

- **Goal:** Expand catalog/state coverage to every dataset family with bounded observations, demand-aware projections, and sanitized brokerage/persistence/AI readiness without changing Phase 6 badge semantics or trading gates.
- **Delivered:** `coverage.ts` dispositions; `healthDatasets.ts` row builders; demand registration in `DataHealthProvider`; delivery-backed provider rows; `brokerageDelivery.ts`; `persistenceSyncHealth.ts`; `MarketDataPort` `PortDelivery<T>`; Tradier removal from `marketDataService`.
- **Verification:** **Focused:** `Test Files 142 passed (142)`, `Tests 673 passed (673)`; **Coverage:** `unclassified: 0` (`active: 41`); **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **Architecture review:** self-review **Passed**; **Startup / Full:** exit **0**, **73** pre-existing status-doc validation issues.
- **Next:** Plan Phase 8 operational hardening under WIP=1.

### 2026-07-19 — Data inventory and state hardening Phase 6

- **Goal:** One canonical Data Health projection for badge, menu, accessibility, recovery, and collapsed diagnostics.
- **Delivered:** `healthProjection.ts`; three-section `DataHealthMenu` + `DataHealthDiagnosticsSection`; unified chart overlay; additive `deliveryDiagnostics` on health API.
- **Verification:** **Focused:** `Test Files 9 passed (9)`, `Tests 74 passed (74)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.3s`); **Architecture review:** self-review **Passed**; **Startup / Full:** exit **0**, **73** pre-existing status-doc validation issues.
- **Next:** Activate Phase 7 under WIP=1.

### 2026-07-19 — Data inventory and state hardening Phase 5

- **Goal:** Reconcile connection truth, circuit protection, fallback, and recovery through one monotonic supervision flow without UI oscillation; trading gates stay fail-safe on raw observations.
- **Completed:** `connectionSupervisor.ts` with display hysteresis; per-socket sidecar status fields; revisioned recovery sessions; shared `twsRecoveryContext`; `DataHealthProvider` supervisor merge; recover API `sessionId`/`revision`; focused fault-matrix tests.
- **Verification:** **Focused:** `Test Files 10 passed (10)`, `Tests 82 passed (82)`; **Sidecar:** `Ran 1 test OK`; **Packages:** boundaries + typecheck passed; **Build:** `✓ Compiled successfully in 3.2s`; **Architecture review:** self-review **Passed**; **Startup / Full:** exit **0**, **74** pre-existing status-doc validation issues.
- **Blockers:** none; live Gateway fault walkthrough deferred.
- **Next best step:** Activate Phase 6 coherent Data Health UX projection under WIP=1.

### 2026-07-18 — Data inventory and state hardening Phase 4

- **Goal:** Catalog-driven freshness, quality, completeness, provenance, and usage-readiness evaluation; session/cadence-aware timestamps; strict trading content-age gates; derived upstream lineage — without changing provider order or Data Health UX.
- **Completed:** `policyEvaluator.ts`; expanded `state/policies.ts` + catalog TTL fix; NYSE holiday `marketCalendar.ts`; policy-driven adapters; unified display freshness in trust/health; strict pre-trade timestamps; derived `upstream` refs; architecture/roadmap updates.
- **Verification run:** **Focused:** `Test Files 20 passed (20)`, `Tests 203 passed (203)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review **Passed**; **Startup / Full:** exit **0**, **75** pre-existing status-doc validation issues.
- **Next best step:** Activate Phase 5 under WIP=1.
- **Blockers:** none.

### 2026-07-18 — Data inventory and state hardening Phase 3

- **Goal:** Runtime delivery observations from service routing, cache/SWR, and stream transport without changing provider order or Data Health UX.
- **Completed:** `DeliveryRegistry` + `RouteCollector`; candles/quotes waterfall instrumentation; hot-cache and background revalidation observations; quote stream refresh heartbeats; chart-core quote refresh type; architecture/roadmap updates.
- **Verification run:** **Focused:** `Test Files 12 passed (12)`, `Tests 100 passed (100)`; **Packages:** `npm run lint:package-boundaries` passed, `npm run typecheck:packages` passed, `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.4s`); **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 4 under WIP=1.
- **Blockers:** none.

### 2026-07-18 — Data inventory and state hardening Phase 2

- **Goal:** Canonical typed contracts, executable catalog, bounded reducers, compatibility adapters, and revision-aware health merge without changing provider order or UX.
- **Completed:** `src/lib/marketData/state/` module; regenerated provider capabilities; health revision + monotonic client merge; architecture doc ownership table; roadmap Phase 2 results.
- **Verification run:** **Focused:** `Test Files 10 passed (10)`, `Tests 86 passed (86)`; **Compatibility:** `Test Files 13 passed (13)`, `Tests 72 passed (72)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review **Passed**.
- **Next best step:** Activate Phase 3 under WIP=1.
- **Blockers:** none.

### 2026-07-18 — Data inventory and state hardening Phase 1

- **Goal:** Freeze canonical dataset/provider catalog and vocabulary; trace all API routes; classify unsupported claims; no runtime contract changes.
- **Completed:** Expanded `data-state-hardening-roadmap.md` with audit schema, vocabulary, timestamps, provider matrix, **38** dataset rows, route trace, gap register; added catalog pointer to `marketData/ARCHITECTURE.md`.
- **Verification run:** **Catalog review:** adapters **8**, routes **73**, cataloged **38**, exclusions **35**, uncataloged **0**; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` exit **1** — **71** pre-existing status-doc validation issues.
- **Next best step:** Activate Phase 2 (canonical contracts and ownership) under WIP=1.
- **Blockers:** none.

### 2026-07-18 — App header and app-level theme

- **Goal:** Move theme to app-level persisted preference; redesign app header (workspace center, market data + account + theme + settings); add deferred settings shell; remove theme from chart rail; relabel Risk.
- **Completed:** `appThemePreference` + `AppThemeProvider` with legacy migration and layout pre-hydration; header `MarketDataConnectionMenu`, theme toggle, settings gear/shell; chart consumers rewired; sidebar rail cleanup; architecture docs updated.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 35 passed (35)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.4s`); **Architecture review:** self-review **Passed**; **Startup / Full:** **71** pre-existing status-doc validation issues.
- **Next best step:** Activate next pending roadmap item under WIP=1 when ready.
- **Blockers:** none.

### 2026-07-18 — Component standardization Phase 5

- **Goal:** Route-by-route migration onto shared Edge tokens/helpers/primitives with narrow static enforcement; preserve trading/journal/screener semantics and chart density exceptions.
- **Completed:** Migrated Workspace+Chart, Journal, Home+Screener+Watchlist, Options+Account+Trade, and Settings clusters; `DrawingRenameModal`, `JournalImportDialog`, `ChartSettingsModal` on `EdgeModalShell`; palette/shadow/target fixes; `edge.test.ts` Tailwind palette ban; architecture doc exceptions; roadmap Phase 5 results.
- **Verification run:** **Focused:** `Test Files 56 passed (56)`, `Tests 234 passed (234)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.5s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**, `smallTargets` **0/12**, Tailwind palette **0**; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` reports **71** pre-existing status-doc validation issues; **Full:** `npm run check` exit 0 with same **71** pre-existing status-doc validation issues.
- **Next best step:** Component-standardization track complete; activate next WIP=1 backlog item.
- **Blockers:** none.

### 2026-07-18 — Component standardization Phase 4

- **Goal:** Standardize loading, empty/error, filter-chip, and simple metric feedback across Screener, Options, Journal, Account, and chart surfaces without changing domain behavior.
- **Completed:** Added `EdgeStatusRegion`, `EdgeFilterChip`, `EdgeMetricTile`; extended `EdgeEmptyState` and `EdgeButton` destructive/link variants; migrated Screener loading/run controls, Options chain loading/error, chart loading/error, Journal filter chips + Clear all, Account metric tiles, Journal metric grid; removed dead screener table skeleton branch; updated architecture doc + roadmap Phase 4 results.
- **Verification run:** **Focused:** `Test Files 15 passed (15)`, `Tests 94 passed (94)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.7s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` reports **71** pre-existing status-doc validation issues.
- **Next best step:** Activate component-standardization Phase 5 — route-by-route migration and enforcement.
- **Blockers:** none.

### 2026-07-18 — Watchlist off-hours quote freshness

- **Goal:** Stop false orange watchlist health off-hours while preserving real transport failures.
- **Completed:** Delivery-time metadata on quote responses; watchlist health uses `lastUpdateAt`/`receivedAt`; REST poll loop after SSE fallback; closed-market **Market closed · quotes current** subtitle; focused regressions + architecture doc.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 80 passed (80)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **Live probe:** `npm run tws:probe` → paper/live `gatewayConnected: true`; **Architecture review:** self-review **Passed**.
- **Next best step:** Resume component-standardization Phase 4 — feedback and data-display composites.
- **Blockers:** none.

### 2026-07-18 — Component standardization Phase 3

- **Goal:** Converge menus, popovers, toggles, and column pickers on shared design-system interaction contracts with thin chart adapters.
- **Completed:** Extended `EdgeMenuItem`; promoted `EdgeAnchoredPopover` + layout module; added `EdgeToggleSwitch` (`compact`/`standard`) and migrated `ChartLayoutMenu` + `ChartSettingsModal`; shared `ColumnPickerPopover` for Screener/Journal; thin chart adapters for menu rows/section headers/popover; interaction contract tests; updated `ARCHITECTURE.md` + roadmap Phase 3 results.
- **Verification run:** **Focused:** `Test Files 18 passed (18)`, `Tests 65 passed (65)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.3s`); **App-level:** journal Trades Columns popover opens; keyboard/dismiss contracts in focused tests; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` reports **71** pre-existing status-doc validation issues.
- **Next best step:** Activate component-standardization Phase 4 — feedback and data-display composites.
- **Blockers:** none.

### 2026-07-18 — Component standardization Phase 2

- **Goal:** Converge chart and watchlist symbol discovery on one hook/dialog; semantic chart trigger; journal exact-filter presentation without changing equality semantics.
- **Completed:** Added `design-system/symbol-search/` (`useSymbolSearch`, `SymbolSearchDialog`, `SymbolSearchTrigger`); migrated `SearchBar` + `WatchlistSearch`; updated journal **Exact symbol** copy/label; removed inert asset chips and unused non-compact chart search path; extended `EdgeModalShell` with `returnFocusRef`; updated architecture doc + roadmap Phase 2 results.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 39 passed (39)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.3s`); **App-level:** chart keyboard symbol select + focus return, watchlist shared add dialog results, journal exact-symbol uppercase/local filter on `/workspace?surface=journal&journalView=trades`; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` blocked by **71** pre-existing status-doc validation issues.
- **Next best step:** Activate component-standardization Phase 3 — menus, popovers, tabs, toggles, and table controls.
- **Blockers:** none.

### 2026-07-18 — Component standardization Phase 1

- **Goal:** Token and primitive correctness — valid semantic tokens, field/select recipes, accessible search naming.
- **Completed:** Remapped **15 files** / **35** undefined-token refs; added field/select/clear helpers; extended `EdgeSearchInput`; migrated journal/risk/workspace consumers; added accessible names to SearchBar, IndicatorPicker, ChartQuickSearchModal, journal symbol filter; production token ban test; updated `ARCHITECTURE.md` + roadmap Phase 1 results.
- **Verification run:** **Focused:** `Test Files 6 passed (6)`, `Tests 27 passed (27)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.3s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**, `smallTargets` **5/12**; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` blocked by **71** pre-existing status-doc validation issues.
- **Next best step:** Activate component-standardization Phase 2 — `useSymbolSearch` + `SymbolSearchDialog`.
- **Blockers:** none.

### 2026-07-18 — Component standardization Phase 0

- **Goal:** Reconcile the component audit against Passing App UX polish Phase 4; remove completed a11y contracts from the actionable backlog; freeze explicit Phase 1–5 residual scope.
- **Completed:** Added Phase 0 results to `component-standardization-roadmap.md`; updated App UX polish roadmap + roadmap index; recorded inventory counts (undefined tokens **12** files / **28** refs, symbol search **2** flows, chart menus **8** files, custom modals **3** files, `EdgeToggle` **0** consumers, pulse skeletons **2** files, column pickers **2** impls); marked Phase 4 focus/menu/busy/segmented-tab/target fixes resolved; froze Phase 1–5 backlog in App UX Polish Task Contract; refreshed `ux-baseline-latest.json`.
- **Verification run:** **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**, `smallTargets` **5/12**, raw hex **8**, Tailwind palette **5**; **Architecture review:** self-review **Passed**; **Startup:** `npm run check:startup` blocked by **72** pre-existing status-doc validation issues.
- **Next best step:** Activate component-standardization Phase 1 — token and primitive correctness under WIP=1.

### 2026-07-18 — Component standardization roadmap

- **Goal:** Turn the cross-app component audit into a WIP=1 phased execution plan for App UX polish Phase 5.
- **Completed:** Added `component-standardization-roadmap.md`; defined primitive/behavior/composite boundaries, search convergence, token repair, five implementation phases, verification tiers, harness updates, and stop conditions; linked the roadmap from the roadmap index and App UX polish track.
- **Verification run:** `git diff --check -- docs/roadmaps/component-standardization-roadmap.md docs/roadmaps/README.md docs/roadmaps/app-ux-polish-roadmap.md docs/PROJECT-STATUS.md` exited **0**; `npm run check:startup` blocked by **72** existing status-document validation issues before tests ran.
- **Next best step:** Reconcile the audit against Passing Phase 4 changes, then activate only the first residual Phase 5 item in the existing App UX Polish Task Contract.

### 2026-07-18 — App UX polish Phase 4

- **Goal:** Interaction states and accessibility — shared focus/loading/destructive recipes, modal/menu keyboard behavior, canonical targets, accessible feedback, reduced-motion behavior.
- **Completed:** `useFocusTrap`, `useMenuKeyboardNav`, extended `styles.ts` recipes, `EdgeButton` loading, `EdgeIconButton` pressed, modal/slide-over a11y, segmented-tab keyboard + 32px targets, popover enter motion, `TwsRecoverButton` compact floor, chart error alert, journal sync loading button.
- **Verification run:** **Focused:** `Test Files 9 passed (9)`, `Tests 29 passed (29)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**; **Architecture review:** self-review Passed.
- **Next best step:** Phase 5 — surface convergence and final polish.

### 2026-07-18 — App UX polish Phase 3

- **Goal:** Workspace and right-panel responsiveness — tile density modes, screener/journal reflow in narrow tiles, nested nav collapse, panel spacing.
- **Completed:** `TileDensityContext` measured from `TileFrame`; `resolveTileDensityMode` (520/900px + hysteresis); screener app variant narrow collapse with horizontal screen chips; journal tile `JournalTileNav` replacing link sub-nav; density-driven journal summary/dashboard grids; journal scope bar + empty-state compact controls; architecture docs updated.
- **Verification run:** **Focused:** `Test Files 6 passed (6)`, `Tests 44 passed (44)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.5s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**; **Architecture review:** self-review Passed.
- **Next best step:** Phase 4 — interaction states and accessibility.

### 2026-07-18 — IB Gateway native daily soft restart

- **Goal:** Replace the persisted nightly hard exit/relogin cycle with IB Gateway's native soft restart and preserve automatic Edge reconnection.
- **Completed:** Added explicit 11:45 PM ET native restart settings to both containers; disabled cold restart/auto-logoff; recreated and authenticated both Gateways; fixed sidecar auto-reconnect to execute on the IB worker event loop; restarted the sidecar and reconnected paper/live sockets.
- **Verification run:** **Focused:** `Ran 4 tests in 0.007s` / `OK`; **Config:** both services resolve the intended restart variables; **Runtime:** both containers `running`, `restartCount=0`, both logins completed; **App-level:** paper/live `gatewayConnected: true`, `warnings: []`; full sidecar suite stopped on missing `httpx2` after all executed tests passed.
- **Next best step:** Observe the first 11:45 PM ET cycle; require unchanged container restart counts, no repeated 2FA login loop, and automatic sidecar reconnection before marking **Passing**.

### 2026-07-18 — App UX polish Phase 2

- **Goal:** App shell and chart chrome hierarchy — grouped header controls, range bar rhythm, rail active states, OHLC/data-badge legibility.
- **Completed:** Restructured `ChartHeaderBar` into instrument/studies/history/actions clusters; migrated `ChartRangeBar`, `SearchBar`, `DataHealthButton`, `PriceLegendLayout`, market context chips; rail active accent in `toolbarButtonStyles`; app header primary/secondary clusters; `FloatingPanelShell` token alignment; focused tests + architecture doc.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 41 passed (41)`; **Build:** `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**, P1 chart-chrome targets cleared; **Architecture review:** self-review Passed.
- **Next best step:** Phase 3 — workspace and right-panel responsiveness.

### 2026-07-18 — App UX polish Phase 1

- **Goal:** Shared visual foundation (typography, spacing, shape, 32/36px controls, motion, elevation, primary CTA contrast) + migrate Phase 0 audited shared defects.
- **Completed:** Extended `edge.ts`/`globals.css` with layout + on-accent tokens; refactored `styles.ts` recipes; updated `EdgeButton`/`EdgeIconButton`/`EdgePanelHeader`; migrated `AppTopHeader`, `AccountPickerMenu`, `WorkspacePill`, `WorkspaceHeaderControls`, home section titles; added focused tests; updated `ARCHITECTURE.md`.
- **Verification run:** **Focused:** `Test Files 8 passed (8)`, `Tests 37 passed (37)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.6s`); **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, overflow **0/12**; **Architecture review:** self-review Passed; **Full:** `npm run check` blocked by 71 pre-existing status-doc validation issues.
- **Next best step:** Phase 2 — app shell and chart chrome hierarchy.

### 2026-07-18 — App UX polish Phase 0

- **Goal:** Reproducible UX baseline — 12 route-width audits + 10 curated WebP screenshots at 1024/1440/1920 without changing production UI.
- **Completed:** `scripts/run-ux-baseline.mts` + `npm run ux:baseline`; journal API mocking for deterministic empty state; string-evaluated DOM audit (tsx `__name` fix); 10 WebPs committed; JSON audit artifact; prioritized findings (shared foundation vs route-specific) in `app-ux-polish-roadmap.md`.
- **Verification run:** **App-level:** `npm run ux:baseline` → `Audits: 12/12`, `Captures: 10/10`, `Raw hex files (components): 8`, `Tailwind palette files (components): 5`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); horizontal overflow **0/12** across audit matrix.
- **Next best step:** Phase 1 foundation rhythm — raise shared control heights (32px compact), typography roles (title ≥14px, body ≥12px), and home/screener Run contrast.

### 2026-07-18 — App UX polish roadmap

- **Goal:** Turn the post-palette visual critique into a phased, harness-aware implementation track.
- **Completed:** Added a six-phase roadmap covering baseline evidence, shared visual rhythm, shell hierarchy, workspace responsiveness, interaction/accessibility, and final surface convergence; linked it from the roadmap index.
- **Verification run:** Documentation review against feature, testing, harness, and architecture planning checklists; `npm run check:startup` stopped before tests on 72 pre-existing status-harness validation issues; implementation verification not started.
- **Next best step:** Execute Phase 0 reference-route screenshots and numerical overflow/contrast/target-size audit at 1024/1440/1920 widths.

### 2026-07-18 — Midnight Chrome app palette

- **Goal:** Keep the chart stage pure black while giving the surrounding app chrome stronger depth, hierarchy, and identity.
- **Completed:** Reworked synchronized dark Edge tokens; updated chart-core/rendering colors; migrated a hardcoded drawing flyout and invalid accent/elevated variable references to canonical tokens; documented the palette direction.
- **Verification run:** **Focused:** `Test Files 9 passed (9)`, `Tests 48 passed (48)`; **Build:** `npm run build:packages` passed; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.2s`); **App-level:** `/workspace` visual criteria `5/5` passed with CDP `positive #2dd4a8`, `negative #ff5d73`, `text #dce4f0`; no visual defects found.
- **Known baseline blocker:** `npm run check:startup` stops at 72 pre-existing `docs/PROJECT-STATUS.md` evidence-validation issues before tests.
- **Next best step:** User visual review; tune individual tokens only if the new hierarchy feels too saturated or bright in prolonged use.

### 2026-07-17 — Structural refactor Tier E

- **Goal:** E1 revisioned repository/client helpers; E2 clarify app vs `@edge/ai-tools-chart` products.
- **Completed:** Shared persistence save/fetch cores; thin library adapters; `toolConstants.ts`; package + app AI architecture docs; app chart-tool characterization tests; package-api-snapshot updated for new chart-core exports.
- **Verification run:** **E1 Focused:** `Test Files 15 passed (15)`, `Tests 52 passed (52)`; **E2 Focused:** `Test Files 3 passed (3)`, `Tests 15 passed (15)`; **Build:** `npm run build:packages` passed; **Build:** `npm run build` passed; **Architecture review:** self-review Passed.
- **Next best step:** Resume product work from ROADMAP.md — structural refactor Tier E complete.

### 2026-07-17 — Structural refactor Tier D

- **Goal:** D1 ChartCell decompose; D2 canvas render vs gestures; D3 EdgeChart coordinators; D4 drawing controller FSM/facade split.
- **Completed:** `chart-cell/*` hooks (pattern capture, pane actions, crosshair, menus, drawing toolbar, templates, trade bind); canvas/EdgeChart/drawing internal hooks; characterization tests for capture click/save, canvas cursor/badge/gesture, EdgeChart crosshair/prepend/wheel, drawing pointer/facade.
- **Verification run:** **Focused:** `Test Files 11 passed (11)`, `Tests 76 passed (76)`; **Build:** `npm run build:packages` passed; **Boundaries:** `npm run lint:package-boundaries` passed; **Build:** `npm run build` passed; **Architecture review:** self-review Passed.
- **Next best step:** Tier E1 — revisioned repository/client helpers.

### 2026-07-17 — Structural refactor Tier C

- **Goal:** C1 StockApp provider/controller extract; C2 Object Tree vs Data Window split; C3 design-system leftover migration for seven chart chrome files.
- **Completed:** `useStockAppBootstrap`, `useStockAppLayoutController`, `useStockAppSidebarController`, `AppProviders`; `object-tree/*` modules + thin `ObjectTree.tsx`; Edge shells/tokens on `BarReplay`, `ChartTimeZoneMenu`, `TemplatePickerModal`, `ChartGoToModal`, `DrawingSettingsModal`, `IndicatorSettingsModal`, `DrawingSelectionToolbar`.
- **Verification run:** **Focused:** `Test Files 10 passed (10)`, `Tests 53 passed (53)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`); **Architecture review:** self-review Passed.
- **Next best step:** Tier E1 — revisioned repository/client helpers.

### 2026-07-17 — Screener keyboard chart viewport drift

- **Goal:** Fix sporadic wrong chart position after ↑/↓ through screener results (brief correct view, then jump with empty lower scale).
- **Completed:** Canvas treats unshifted cache→fresh length growth as session rebuild (not history prepend); workspace screener drive no longer also publishes BroadcastChannel `setSymbol`.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 27 passed (27)`.
- **Next best step:** App-level ↑/↓ through screener beside chart; confirm no post-load viewport jump.

### 2026-07-17 — Structural refactor Tier B

- **Goal:** B1 generic revision-sync hook; B2 series/interval consolidation into `@edge/chart-core`.
- **Completed:** `useRevisionedRemoteSync` + contract tests; thin watchlist/screener/template wrappers; `packages/chart-core/src/interval.ts`; app series/interval re-exports; chart-react duplicate adapter removed; orphan `heikinAshi.ts` deleted.
- **Verification run:** **Focused:** `Test Files 13 passed (13)`, `Tests 99 passed (99)`; **Build:** `npm run build:packages` passed; **Boundaries:** `npm run lint:package-boundaries` passed; **Architecture review:** self-review Passed.
- **Next best step:** Tier C1 — StockApp providers + controllers.

### 2026-07-17 — Screener header Option B

- **Goal:** Stock Screener title; show active screen; move save into Screens rail.
- **Completed:** Title + Run chrome; active name subtitle; accent rail selection; expand-in-place “+ Save current”; modal headerActions = Run (not Save); Untitled screen fallback.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 19 passed (19)`.
- **Next best step:** App-level select + save walkthrough.

### 2026-07-17 — Screener results scroll + compact view

- **Goal:** Scroll only results in the right pane; shrink ugly List/Heat map toggle.
- **Completed:** `h-full`/`min-h-0` chain on tile + results; compact view `<select>`; denser toolbar.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 29 passed (29)`.
- **Next best step:** App-level scroll Top 200 in a small tile.

### 2026-07-17 — Screener results toolbar UX

- **Goal:** Collapse janky post-run status lines + text actions into one bordered-button toolbar.
- **Completed:** Removed phase/live paragraphs; result count + Live badge; Watchlist/Export menus; `EdgeButton` `secondary` + forwardRef; empty runs keep toolbar without bulk menus.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 27 passed (27)`.
- **Next best step:** App-level confirm toolbar after run / empty run.

### 2026-07-17 — Screener result-limit compact select

- **Goal:** Replace out-of-place freeform LIMIT input with compact dropdown before Run.
- **Completed:** `Top 50/100/200/500` select left of Run; legacy non-preset values kept visible until changed; dialog test updated.
- **Verification run:** **Focused:** `Test Files 2 passed (2)`, `Tests 16 passed (16)`.
- **Next best step:** App-level confirm select placement and run with Top 50.

### 2026-07-17 — Screener Option A split-pane UX

- **Goal:** Collapse Review/Screens/Results/Keepers into one split-pane screener; starters as saved screens; row click / ↑↓ drives sibling chart.
- **Completed:** `SavedScreen` movers kind + `ensureStarterScreens`; unified `ScreenerScreensBody` + `ScreenerTileSurface`; `useScreenerResultSelection` + `useScreenerReviewDrive`; removed primary Load/Open in Review; `/screener/*` → unified workspace surface; roadmap + harness updates.
- **Verification run:** **Focused:** `Test Files 15 passed (15)`, `Tests 69 passed (69)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`). **Architecture review:** self-review Passed.
- **Next best step:** App-level — workspace Chart + Screener tiles: run screen → click row → ↑/↓ → confirm chart symbol follows.

### 2026-07-16 — Pattern Capture start/end + numbered presets

- **Goal:** Rework capture UX — independent start/end section pairs (1-bar allowed); numbered preset labels via keyboard 1–N.
- **Completed:** Reworked `fsm.ts`; added `presets.ts`; section-bounds `buildRecord.ts`; `PatternCapturePanel` numbered chips; overlay + ChartCell digit shortcuts.
- **Verification run:** **Focused:** `Test Files 1 passed (1)`, `Tests 13 passed (13)`; API route `Tests 1 passed (1)`. **Architecture review:** self-review Passed.
- **Next best step:** App-level — Shift+P → 1-bar section → key `2` → second section → Save; confirm JSON + SVG.

### 2026-07-16 — Workspace pill header UX

- **Goal:** Concept A — streamline workspace header: pill menu in Use mode; focused Edit chrome.
- **Completed:** `createWorkspaceDocument` command; `WorkspacePill.tsx` (switch/rename/new/duplicate); `WorkspaceHeaderControls.tsx` Use/Edit branches; context wiring; architecture docs.
- **Verification run:** **Focused:** `Test Files 3 passed (3)`, `Tests 30 passed (30)`. **Architecture review:** self-review Passed.
- **Next best step:** App-level — open pill → switch/rename/new/duplicate → Edit layout → Layout preset → Done.

### 2026-07-16 — Workspace layout presets + empty-pane assign

- **Goal:** Template-first App Workspace edit flow — layout picker → placeholder panes → per-pane app assign.
- **Completed:** `layoutPresets.ts` catalog; `applyLayoutPreset` / `assignTileSurface`; `WorkspaceLayoutPresetPicker`, `PlaceholderTile` chooser, `TileFrame` reassign; context + header wiring; architecture docs.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 52 passed (52)`. **Build:** `npm run build` passed (`✓ Compiled successfully in 3.1s`). **Architecture review:** self-review Passed.
- **Next best step:** App-level — Edit layout → 2-col preset → assign Chart + Screener → Done; confirm Use mode and splitters.

### 2026-07-17 — Broker ledger B2 RTH fill proof

- **Goal:** Complete B2 — fill lands in ledger without Journal UI mounted.
- **Completed:** Paper F MKT `orderId=10190` `status:Filled` `permId=1041862008`; snapshot showed exec `00025b44.6a5abe6c.01.01`; GET `/api/me/journal/fills` `before 46 after 47 new 1` (symbol F BOT qty1 @14.32); cron re-run `duplicates:2`; cursor `lastSeenExecIds` includes both session execs; status age `ledger sync 0m ago`.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 13 passed (13)`. Track → **Passing**.
- **Next best step:** None for ledger track; optional C1 Flex when env configured.

### 2026-07-16 — Broker ledger B2 retry (post-2FA)

- **Goal:** Complete B2 fill→ingest proof after Gateway 2FA.
- **Completed:** Sidecar restarted; `gatewayConnected:true`; paper F MKT `orderId=78` `PreSubmitted`→Cancelled; LMT@$25 outsideRth `orderId=184` `Submitted`→Cancelled; cron ingest `added:0`; fills still 45; sidecar executions 0.
- **Blocker:** ~22:00 ET — US equity extended hours closed; no fill available tonight.
- **Next best step:** Superseded by RTH B2 proof 2026-07-17.

### 2026-07-16 — Broker ledger functional test plan + app-level run

- **Goal:** Write LLM-runnable functional plan; execute Tier A + Tier B against live Next+Postgres+sidecar; record harness evidence.
- **Completed:** `docs/roadmaps/broker-ledger-functional-test-plan.md`; linked from roadmap README; A4 unit test on cron route; executed scenarios with quoted output in Active Work row.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 13 passed (13)`. **App-level PASS:** A1–A3, B1, B3–B5 (quoted in Active Work). **Blocked:** B2 no fill. **Skipped:** A4 isolated next; C1 no Flex.
- **Next best step:** Superseded by B2 retry session above.

### 2026-07-16 — Broker ledger + sync (Phases 0–4)

- **Goal:** Server-side IB execution ingest into journal; cursor + Flex gap backfill; account/position snapshots; demote client fill upsert.
- **Completed:** Roadmap + architecture docs; `broker_ingest_cursors`, `account_snapshots`, `position_snapshots`; ingest modules + cron route; snapshot-path scheduler; journal sync triggers server ingest; Data Health ledger age.
- **Verification run:** `npm test -- --run src/lib/brokerage/ingest src/app/api/cron/brokerage-ingest src/app/components/journal/JournalSyncProvider.test.tsx` → `Test Files 4 passed (4)`, `Tests 12 passed (12)`.
- **Next best step:** Superseded by functional test plan session above.

### 2026-07-16 — Browser tab live quote loop fix

- **Fixed:** `Maximum update depth` on `/workspace?surface=…` — deep-link handler now keys off `searchParams.toString()` only; empty `{}` surface state no longer treated as a mutation; `applySurfaceFocusOrOpen` / `setActiveTile` idempotent when already focused.
- **Verification run:** `npm test -- --run src/lib/appWorkspace/commands.test.ts src/app/workspace/page.test.ts src/app/components/StockApp.test.tsx src/app/components/app-workspace/` → `Test Files 8 passed (8)`, `Tests 44 passed (44)`.

### 2026-07-16 — Browser tab live quote (remove chart tabs)

- **Completed:** Removed `WorkspaceTabBar`; `pruneToSingleActiveTab` on hydrate; `primaryChartTileId` DFS helper; `browserTabQuote` sets `document.title` + direction favicon from primary chart only; layout menu drops create/copy/switch layouts.
- **Verification run:** `npm test -- --run src/lib/app/browserTabQuote.test.ts src/lib/appWorkspace/primaryChartTile.test.ts src/lib/app/workspaceTabs.test.ts src/app/components/StockApp.test.tsx src/app/components/app-workspace/` → `Test Files 9 passed (9)`, `Tests 53 passed (53)`.
- **Architecture review:** self-review — Passed.

### 2026-07-16 — App Workspace screener ingress loop fix

- **Goal:** Fix runtime `Maximum update depth exceeded` when opening screener or clicking Screens in workspace.
- **Completed:** `applySurfaceFocusOrOpen` (idempotent focus/open); `handleSurfaceIngress` / `focusOrOpenSurface` use functional `setState` without `state` deps; deep-link handler dedupes via `lastIngressRef`; screener tile wires in-tile nav (Screens/Results/Review/Keepers) without `/screener/*` route escape.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 31 passed (31)`.
- **Next best step:** App-level — add screener tile → Screens → Results → Review; reload `/workspace?surface=screener&screenerView=screens`; confirm no error overlay.

### 2026-07-16 — App Workspace Use/Edit + shell-as-app

- **Goal:** Make `/workspace` the primary app experience with Use vs Edit layout modes; module routes redirect into one active workspace.
- **Completed:** `layoutEditMode` + chrome gating; header Edit layout/Done + Esc; rail without Workspace peer; `deepLinks.ts` + module redirects; `lastModule` root → `/workspace`; `handleSurfaceIngress`; architecture docs.
- **Verification run:** **Focused:** `Test Files 11 passed (11)`, `Tests 48 passed (48)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Architecture review:** self-review Passed.
- **Next best step:** App-level — Use/Edit toggle, Esc, `/chart` redirect, Review→Chart in one tab.

### 2026-07-16 — App Workspace Shell (Tiling Dock)

- **Goal:** Single-window tiling workspace — Chart, Screener, Journal as rearrangeable tiles with local persistence and in-process Review→Chart drive.
- **Completed:** `src/lib/appWorkspace/` layout engine; `/workspace` shell; ChartTileHost; surface tiles; drag-to-dock; named save/duplicate; `WorkspaceDriveContext`; nav + deep links.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 29 passed (29)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 3.0s`); **Packages:** `check:packages` passed.
- **Next best step:** App-level ultrawide walkthrough on `/workspace`.

### 2026-07-16 — Screener Review app (dual-window controller)

- **Goal:** `/screener` app with serial Review home; keyboard queue; BroadcastChannel drives Chart; sidebar screener retained.
- **Completed:** Phases A–F via sub-agents — module scaffold, review session, cross-window bridge, Review UI, Screens/Results/Keepers pages, roadmap Phase 5.
- **Verification run:** `npm test -- --run` (review + screener focused) → `Test Files 14 passed (14)`, `Tests 95 passed (95)`; `npm run build` → `✓ Compiled successfully in 3.6s`.
- **Next best step:** App-level dual-window walkthrough on `localhost:3003`.

### 2026-07-15 — Account display aliases

- **Goal:** User-configurable account display names in header settings; raw IB accountId remains execution identity.
- **Completed:** `edge:trading:accountAliases.v1` localStorage; `AccountAliasesProvider`; custom `AccountPickerMenu` with in-dropdown settings rail + `AccountAliasEditor`; labels wired in picker, Account panel, Trade form, Data Health.
- **Verification run:** `npm test -- --run src/app/components/home/AccountPickerMenu.test.tsx src/app/components/home/AppTopHeader.test.tsx src/lib/trading/accountAliases.test.ts src/lib/trading/accountPickerOptions.test.ts src/app/components/sidebar/panels/AccountPanel.test.tsx` → `Test Files 5 passed (5)`, `Tests 43 passed (43)`.
- **Next best step:** App-level — open account picker → gear on right → set alias → reload.

### 2026-07-15 — Position tool instant place at last bar

- **Goal:** Selecting Long/Short Position places the setup immediately (no second chart click) at last-bar close with left edge on the last bar.
- **Completed:** `placement: 'instant'`; `defaultPositionPoints`; `startDrawing` auto-commits + selects; docs updated.
- **Verification run:** `npm test -- --run packages/chart-core/src/drawings/positionGeometry.test.ts src/lib/chart/drawings/position_tool.test.ts src/lib/chart/drawingFsm.test.ts` → `Test Files 3 passed (3)`, `Tests 40 passed (40)`; `@edge/chart-core` + `@edge/chart-react` rebuild passed.
- **Next best step:** App-level confirm on `/chart`.

### 2026-07-15 — Time axis date-label vertical margins

- **Goal:** Match TradingView bottom date-axis spacing (equal top/bottom margin around labels).
- **Completed:** `TIME_AXIS_HEIGHT` 30→24; labels drawn with `textBaseline: middle` at strip center; crosshair time badge centered in strip.
- **Verification run:** `npm test -- --run` (5 files) → `Test Files 5 passed (5)`, `Tests 56 passed (56)`; `npm run build:packages` passed.
- **Next best step:** App-level confirm on `/chart`.

### 2026-07-15 — Price axis quarter tick dashes

- **Goal:** Visual quarter markers between labeled prices on the Y-axis.
- **Completed:** `scaleAxisMinorTicks` + renderer draws three 5px dashes on the price-axis border between consecutive labels.
- **Verification run:** `npm test -- --run src/lib/chart/priceScaleTransform.test.ts packages/chart-react/src/engine/renderer.test.ts` → `Test Files 2 passed (2)`, `Tests 26 passed (26)`.
- **Next best step:** App-level confirm on `/chart`.

### 2026-07-16 — Liquid tradeable screener preset

- **Goal:** Screener for $40k market-order liquidity: price ≥ $5 and ≥ $2M average daily dollar volume.
- **Completed:** `ScreenQuery.dollarVolume` local filter (`price × volume`); FMP over-fetch then trim; preset `liquid-tradeable` in starter chips; QueryBuilder “Dollar volume” field.
- **Verification run:** `npm test -- --run` presets + compileQuery + universeDailyStore + screenerParams + deriveDefaultSort + QueryBuilder → `Test Files 6 passed (6)`, `Tests 37 passed (37)`.
- **Next best step:** App-level — run “Liquid $5+ ($2M+/day)” in the screener panel and spot-check price×volume.

### 2026-07-15 — Long position empty-margin stretch fix

- **Goal:** Stop long/short position drawings from randomly stretching to the plot right edge.
- **Completed:** Root cause was empty-right-margin `plotToPoint` writing `timestamp: 0` + virtual `dataIndex`; `pointToPlot` then mapped to plot edge. Fixed snap-near-last, timestamp extrapolation, legacy clamp, expand ignore-`t:0`.
- **Verification run:** `npm test -- --run src/lib/chart/drawingCoords.test.ts packages/chart-core/src/drawings/positionGeometry.test.ts src/lib/chart/drawings/position_tool.test.ts` → `Test Files 3 passed (3)`, `Tests 44 passed (44)`; post-fix logs width ~118→~8.8 via `zero-ts-clamped`.
- **Next best step:** Optional — delete old corrupted longs from workspace; confirm new draws near live edge stay narrow.

### 2026-07-15 — TWS external recovery spawn + auto-reconnect

- **Goal:** Make Reconnect actually start the sidecar in `TWS_MANAGED=external`; bounded sidecar auto-reconnect on Gateway disconnect.
- **Completed:** `canSpawnSidecarForUserRecovery()` + standalone spawn from recover route; port-conflict UX copy; sidecar auto-reconnect supervisor (1100/502/504/disconnect); `/status` `autoReconnectAttempt`; tests + architecture doc.
- **Verification run:** `npm test -- --run src/lib/marketData/providers/tws/recover.test.ts src/lib/marketData/providers/tws/managedMode.test.ts` → `Test Files 2 passed (2)`, `Tests 21 passed (21)`; `python -m unittest test_main.py` → `Ran 43 tests OK`.
- **Next best step:** App-level — with `TWS_MANAGED=external` and no sidecar on 8765, click Reconnect and confirm sidecar starts without manual `npm run tws:sidecar`.

### 2026-07-15 — Clear manual TWS reconnect

- **Goal:** Obvious Reconnect when TWS/Gateway is down; symmetric paper+live sidecar reconnect.
- **Completed:** Shared `TwsRecoverButton`; chart top-right inline recover (`ChartOverlayDataHealthRow`); header recover on accounts error; sidecar `_reset_extra_ib_connections` + `_reconnect_extra_connections`; docs/harness updated.
- **Verification run:** `npm test -- --run` (TwsRecoverButton, ChartOverlayStatusStack, AppTopHeader, DataHealthRecover) → `Test Files 4 passed (4)`, `Tests 19 passed (19)`; `python3 -m unittest test_main.ReconnectResetTests` → 2 OK.
- **Next best step:** App-level Gateway stop/start walkthrough; then bounded auto-reconnect WIP.

### 2026-07-15 — Workspace tab live quote strip

- **Goal:** Show last traded price + day % change on workspace tabs (color-coded).
- **Completed:** Fixed SSE→QuoteSnapshot mapping (`price`/`changePercent`); tab symbols via `extraSymbols`; flat % muted; tests.
- **Verification run:** `npm test -- --run` mappers + WorkspaceTabBar + MarketDataProvider → `Test Files 3 passed (3)`, `Tests 16 passed (16)`.
- **Next best step:** App-level confirm on `/chart` for F.

### 2026-07-15 — Workspace tabs TV-style chrome

- **Goal:** Match TradingView tab height (~75% of chart header) and content strip.
- **Completed:** `WorkspaceTabBar` resized to 27px track with full-height stretch; content is monogram + symbol + direction + price + % + `/` title; docs updated.
- **Verification run:** `npm test -- --run src/app/components/chart-chrome/WorkspaceTabBar.test.tsx` → `Test Files 1 passed (1)`, `Tests 4 passed (4)`.
- **Next best step:** App-level visual check on `/chart`.

### 2026-07-15 — Position drawing TV-style 4 handles

- **Goal:** Match TradingView long/short position control points (4 handles, not 6).
- **Completed:** `positionControlPoints` / `updatePositionFromControl` reduced to TV semantics via `POSITION_CP`; docs + tests updated.
- **Verification run:** `npm test -- --run packages/chart-core/src/drawings/positionGeometry.test.ts src/lib/chart/drawings/position_tool.test.ts` → `Test Files 2 passed (2)`, `Tests 29 passed (29)`; `@edge/chart-core` `tsc` rebuild passed.
- **Next best step:** App-level — select position drawing and verify four handles + drag roles.

### 2026-07-15 — Trade setup panel (drawing-bound)

- **Goal:** Drawing-bound Trade sidebar — context menu → live-synced entry/stop/TP plan → entry-only MKT/LMT preview/submit.
- **Completed:** `positionTradeSetup.ts` (live points); `TradeSetupBindingContext` + `ChartCell` overlay sync; `Trade setup…` context menu item; `trade` sidebar panel + shared `TradeOrderForm`; header Trade opens unbound panel (modal retired from StockApp).
- **Verification run:** `npm test -- --run src/lib/trading/positionTradeSetup.test.ts src/app/components/chart-cell/overlayContextMenu.test.ts src/app/components/sidebar/panels/TradeSidebarPanel.test.tsx src/app/components/sidebar/registry.test.ts src/app/components/trading/TradeTicketModal.test.tsx` → `Test Files 5 passed (5)`, `Tests 20 passed (20)`; `npm run build` → `✓ Compiled successfully in 2.4s`.
- **Next best step:** App-level walkthrough — drag stop updates panel; Preview paper order from bound setup.

### 2026-07-13 — Trade execution reliability track

- **Goal:** Paper/live API bake, Postgres intent durability, recovery proof, live 1-share order.
- **Completed:** After-hours pre-trade readiness (`dataTrust` stale+age, `tradingService` fresh account/quote timestamps); Postgres `order_intents` migration + async `resolveServerIntentStore()`; paper LMT/STP/STP LMT/cancel/idempotency/kill-switch bake; restart idempotency `orderId=31`; live `U25026894` preview+LMT `orderId=9` + GTC SPY qty1 `orderId=15`; `TWS_MANAGED=external` in `.env.local`.
- **Verification run:** `npm test -- --run src/lib/trading/` → `Test Files 13 passed (13)`, `Tests 61 passed (61)`; `npm run build` passed; app-level order ids quoted in Current Verified State.
- **Next best step:** Handoff → [docs/trading-execution-roadmap.md — LLM handoff](./trading-execution-roadmap.md#trade-execution-reliability-track--llm-handoff).

### 2026-07-12 — Heat map data hardening

- **Goal:** Heat-map defaults (size market cap, color change %, group sector) work on movers and company-screener results.
- **Completed:** Server-side mover enrichment via `fetchUniverseDescriptors`; `changePercent` mapper fix; quote stream cap 200; partial size-metric banner; architecture + roadmap + harness updates.
- **Verification run:** `npm test -- --run src/lib/marketData/screenerUniverse/enrichMoversWithDescriptors.test.ts src/lib/marketData/service/marketDataService.fmp.test.ts src/lib/marketData/providers/fmp/mappers.screener.test.ts src/lib/chartDataFeed/apiScreenerFeed.test.ts src/lib/screener/screenerHeatMapAdapter.test.ts src/app/components/screener/ResultsTable.test.tsx` → `Test Files 6 passed (6)`, `Tests 31 passed (31)`; `npm run build` `✓ Compiled successfully in 3.0s`.
- **Next best step:** App-level — Gainers heat map with Size=market cap and Group=sector; Large-cap with Color=change % on full set.

### 2026-07-12 — Screener heat map

- **Goal:** Reusable treemap heat-map foundation plugged into stock screener with List / Heat map toggle.
- **Completed:** `src/lib/heatmap/` pure layout + color scale; `HeatMapView`/`HeatMapToolbar`; screener adapter + session state; `ResultsTable` toggle and config controls; architecture doc + roadmap update.
- **Verification run:** `npm test -- --run src/lib/heatmap/ src/lib/screener/screenerHeatMapAdapter.test.ts src/app/components/heatmap/ src/app/components/screener/ResultsTable.test.tsx` → `Test Files 5 passed (5)`, `Tests 27 passed (27)`; `ScreenerDialog` `Tests 14 passed (14)`; `npm run build` `✓ Compiled successfully in 2.9s`.
- **Next best step:** App-level walkthrough — run preset, toggle Heat map, change Size/Color/Group, click cell loads chart.

### 2026-07-12 — Dual connection Phase D

- **Goal:** Harden TWS-only preference threading; split Data Health into paper socket, live socket, and active chart data preference.
- **Completed:** Sidecar `/status` `connections` map; health probe/merge + Connections UI section; `loadQuotes` connectionId parity; docs + trust/boundary tests; architecture + roadmap updates.
- **Verification run:** Sidecar `Ran 36 tests OK`; `npm test -- --run` (12 files) `Test Files 12 passed (12)`, `Tests 141 passed (141)`; `npm run build` `✓ Compiled successfully in 2.7s`; **App-level:** restarted sidecar; both Gateways on 4001/4002; Data Health Connections paper+live connected; data chip Live + account paper; quotes `ib-live` → `tws`.
- **Next best step:** Dual-connection track complete — pick next backlog item.

### 2026-07-12 — Right panel overlay layout

- **Goal:** Docked right panel overlays chart without changing chart width; no dimmed backdrop.
- **Completed:** `resolveSidebarMode` always overlay; `StockApp` overlay inside chart row; `absolute right-0` fix for full-cover bug; narrow-viewport auto-dock; screener Expand/Pop out gates; backdrop removed; design-system + harness updates.
- **Verification run:** `npm test -- --run src/lib/responsive/responsiveLayout.test.ts src/app/components/sidebar/SidebarPanelShell.test.tsx src/app/components/sidebar/RightSidebar.test.tsx` → `Test Files 3 passed (3)`, `Tests 15 passed (15)`.
- **Next best step:** App-level walkthrough — open watchlist at desktop width, confirm chart width unchanged; drag resize; Escape closes.

### 2026-07-12 — Screener layout + right-panel UX

- **Goal:** Widen docked screener; fix never-run empty state; edit/scan modes; responsive preset presentation.
- **Completed:** Panel-aware `sidebarWidth` + Expand/Collapse; `filterViewMode` + chip summary; never-run starters; narrow preset chips; Limit beside Run; harness + roadmap updates.
- **Verification run:** `npm test -- --run src/lib/responsive/sidebarWidth.test.ts src/app/components/sidebar/ src/app/components/screener/` → `Test Files 20 passed (20)`, `Tests 105 passed (105)`; `npm run build` passed.
- **Next best step:** App-level walkthrough — Expand docked screener, run preset, confirm scan mode + Watchlist width clamp.

### 2026-07-13 — Project status harness prune

- **Goal:** Cut `PROJECT-STATUS.md` from an unbounded ledger (~2.4k lines) to a hot operational dashboard; archive full history.
- **Completed:** Created `docs/status-archive/` (`README.md`, `2026-06.md`, `2026-07.md`); moved Previous Verified stacks, completed Task Contracts, older Session Log entries, and older Passing Active Work rows; added § Harness Retention; updated harness checklists.
- **Verification run:** `npm run lint:instructions` passed; `npm run check:startup` passed (`Test Files 3 passed (3)`, `Tests 26 passed (26)`).
- **Next best step:** Follow retention table on future session exits; optional later `npm run status:prune` automation.

### 2026-07-12 — Position 1R yard lines

- **Goal:** Add always-on left-edge 1R ticks with in-box `NR` labels in the profit zone of long/short position drawings.
- **Completed:** `profitRLevels` helper in `positionGeometry.ts`; `drawProfitRYardLines` in `position_tool.ts`; unit tests; `features.md` + `ARCHITECTURE.md` + harness update.
- **Verification run:** `npm test -- --run packages/chart-core/src/drawings/positionGeometry.test.ts src/lib/chart/drawings/position_tool.test.ts` → `Test Files 2 passed (2)`, `Tests 29 passed (29)`; `npm run build:packages` passed.
- **Next best step:** App-level walkthrough on `/chart` — draw long + short with ≥2R target; confirm ticks/labels update on resize.

### 2026-07-12 — Dual connection Phase C

- **Goal:** Decouple chart/quote IB connection from header order account (`dataConnectionPreference`).
- **Completed:** Sidecar MD routes accept `connectionId`; `edge:marketData:connectionId` + header chip; threaded through TWS client, MarketDataService, API, streams; pre-trade quotes use order env; live account poll hint + architecture docs.
- **Verification run:** Sidecar `Ran 35 tests OK`; `npm test -- --run` (4 files) `Test Files 4 passed (4)`, `Tests 71 passed (71)`; `npm run build` `✓ Compiled successfully in 4.2s`.
- **Next best step:** Phase D — or app-level: live data chip while paper order account + paper order preview.

### 2026-07-12 — Dual connection Phase B

- **Goal:** Honest sidecar `connectionId` routing; Gateway-only picker; offline live seed; journal filter unchanged.
- **Completed:** B.1–B.5 — `/account/trades` + `/stream/account` accept `connectionId`; unknown id → 400; removed journal-only picker union; `availability` + `TWS_LIVE_ACCOUNT_ID` offline seed; legacy journal rematch; tests + ARCHITECTURE + harness.
- **Verification run:** Sidecar `Ran 32 tests OK`; `npm test -- --run` (5 files) `Test Files 5 passed (5)`, `Tests 29 passed (29)`; `npm run build` `✓ Compiled successfully in 2.8s`.
- **Next best step:** Phase C — `dataConnectionPreference` split.

### 2026-07-09 — Dual connection Phase A infra

- **Goal:** Ship Docker dual Gateway compose (`TRADING_MODE=both`), npm scripts, env templates, ops docs; restart sidecar; prove honest `connectionId` routing.
- **Shipped:** `services/ib-gateway/docker-compose.yml` (`ghcr.io/gnzsnz/ib-gateway:stable`, localhost 4001/4002/5900); `services/ib-gateway/.env.example`; `ib:gateway:up|down` with `--project-directory`; `.env.example` + `.gitignore` for gateway secrets; Phase A ops in `dual-connection-roadmap.md`; local dual Gateway note in `src/lib/trading/ARCHITECTURE.md`.
- **Verification run:** **Focused:** `Ran 26 tests OK`; **App-level (partial):** sidecar restarted — `ib-paper` `DUP586813` HTTP 200; `ib-live` HTTP 503 when 4001 down (no paper clone); `docker compose config` OK.
- **Known blockers:** No `services/ib-gateway/.env` yet; desktop IB Gateway on 4002; Docker image pull not completed in session.
- **Next:** Copy `.env.example` → `.env`, stop desktop Gateway, `npm run ib:gateway:up`, VNC 2FA, confirm both ports, curl distinct live managed id → mark Phase A Passing → Phase B.

### 2026-07-08 — Dual connection roadmap (plan only)

- **Goal:** Document roadmap for Docker dual Gateway + decouple live market data from paper/live order routing; remove journal-only account workaround.
- **Shipped:** `docs/dual-connection-roadmap.md` (Phases A–D); links from `ROADMAP.md`, `trading-execution-roadmap.md`, `src/lib/trading/ARCHITECTURE.md`; harness Pending row + Task Contract.
- **Verification run:** Plan-only — no code/tests.
- **Next:** Phase A — Docker `TRADING_MODE=both`, map 4001/4002, restart sidecar, prove distinct paper/live account status.

### 2026-07-08 — Account context wiring

- **Goal:** Fix journal ignoring header account picker; composite account identity; journal-discovered accounts in picker.
- **Shipped:** Journal providers nested under `AccountProvider`; `accountPickerOptions.ts` + composite picker keys; journal-only accounts from fills; `activeTradingAccount` context; trade ticket Gateway-only guard; nesting regression test.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 23 passed (23)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`).
- **Next:** App-level walkthrough — `/journal/dashboard` switch `DUP586813` vs `U25026894 (journal)`; paper vs live distinct; `/chart` trade ticket with Gateway account.

### 2026-07-08 — Global account header + single account context

- **Goal:** Persistent content-column header with `edge` + app-wide account picker; single account drives trading, account panel, and journal.
- **Shipped:** `AppTopHeader.tsx` in `AppModuleShell`; lifted `AccountProvider` with `setActiveTradingAccount`; trade modal/AccountPanel display-only account; journal `filterTradesByAccount`.
- **Verification run:** **Focused:** `Test Files 6 passed (6)`, `Tests 26 passed (26)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.9s`).
- **Next:** App-level header/account walkthrough on localhost:3003.

### 2026-07-08 — Trading execution Phase 5 connection registry + paper/live

- **Goal:** Connection registry, dual Gateway sockets, in-app Paper/Live toggle, live `LIVE` confirm gate.
- **Shipped:** `connectionRegistry.ts`, `StubTradingAdapter`, `tradingEnvironment.ts`; sidecar `ib-paper`/`ib-live`; Trade ticket + Account panel mode toggle; `liveConfirmation` on submit/cancel/modify.
- **Verification run:** **Focused:** `Test Files 15 passed (15)`, `Tests 76 passed (76)`; **Sidecar:** `Ran 26 tests OK`; **Build:** `npm run build` passed.
- **Next:** App-level paper/live walkthrough; Postgres intent store backlog.

### 2026-07-08 — Trading execution Phase 4 UI + journal

- **Goal:** Chart trade ticket, confirm modal, AccountPanel cancel, journal orderRef correlation, AI place_order.
- **Shipped:** `TradeTicketModal`, `tradingClient.ts`, AccountPanel cancel + scoped orders, `correlateOrderRef.ts`, `preview_order`/`place_order` tools.
- **Verification run:** **Focused:** `Test Files 7 passed (7)`, `Tests 36 passed (36)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`).
- **Next:** Superseded by Phase 5 row.

### 2026-07-08 — Trading execution Phase 3 stops + safety

- **Goal:** STP/STP LMT orders, preview expiry, short-sale/PDT guards, kill switch, audit log.
- **Shipped:** `STP`/`STP LMT` types + sidecar builders; `previewIntentId` 30s TTL; `safetyGuards.ts`; `auditLog.ts`; `EDGE_TRADING_KILL_SWITCH`; `outsideRth` default false.
- **Verification run:** **Focused:** `Test Files 10 passed (10)`, `Tests 52 passed (52)`; **Sidecar:** `Ran 25 tests OK`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.6s`).
- **Next:** Phase 4 — chart ticket UI + journal wiring.

### 2026-07-08 — Trading execution Phase 2 manage + account

- **Goal:** Modify open orders, active account selection, account-scoped orders, lost-response reconciler.
- **Shipped:** sidecar `PATCH /trading/orders/{id}`; `reconcile.ts`, `activeAccount.ts`, `filterOrders.ts`; `TradingService.modifyOrder`; `PATCH /api/trading/orders/[orderId]`; `AccountProvider.ordersForActiveAccount`.
- **Verification run:** **Focused:** `Test Files 8 passed (8)`, `Tests 32 passed (32)`; **Sidecar:** `Ran 19 tests OK`; **Build:** `npm run build` passed; **App-level:** `orderId: 38` `permId: 1306430116`; PATCH `lmtPrice: 8.95`; scoped `orderRef: edge-phase2-api`.
- **Next:** Phase 3 — STOP orders + safety hardening.

### 2026-07-08 — Trading execution Phase 1 domain + adapter

- **Goal:** Broker-neutral trading layer on top of Phase 0 sidecar — types, service, adapter, `/api/trading/*`.
- **Shipped:** `src/lib/trading/**`, `src/app/api/trading/**`, `/api/trading` in `apiAuth` sensitive prefixes.
- **Verification run:** **Focused:** `Test Files 5 passed (5)`, `Tests 14 passed (14)`; **Build:** `npm run build` passed; **App-level:** MKT `orderId: 17` `permId: 1306430090`; LMT `orderId: 19` `permId: 1306430091`; cancel `status: "Cancelled"`.
- **Next:** Phase 2 — modify orders + active account selection.

### 2026-07-08 — Trading execution Phase 0 paper spike

- **Goal:** Prove IB paper place + cancel via TWS sidecar before full trading layer.
- **Shipped:** `POST /trading/orders`, `DELETE /trading/orders/{order_id}`, trading guards/helpers, unit tests; `.env.local` paper pins (`TWS_PORT=4002`, `TWS_ACCOUNT_ID=DUP586813`, `TWS_READONLY=false`).
- **Verification run:** **Focused:** `Ran 15 tests OK`; **App-level:** MKT `orderId: 9` `permId: 1306430087`; LMT `orderId: 10` `permId: 1306430088`; cancel `status: "Cancelled"`.
- **Next:** Phase 1 — broker-neutral types, `TradingService`, `/api/trading/*`.

### 2026-07-08 — Journal loading + empty states

- **Goal:** Layered loading, global empty, scoped empty, and error states across journal Dashboard + Trades without duplicate fetches or flash-of-empty on initial load.
- **Shipped:** `journalDataPhase` + `journalEmptyCopy`; `JournalTradesProvider` error/retry; `JournalContentGate`, `JournalPageLoadingSkeleton`, `JournalGlobalEmptyState`; page gates on `JournalDashboardView` + `JournalTradesView`; scoped empty copy unified in equity/table/list/breakdown/time widgets.
- **Verification run:** **Focused:** `Test Files 24 passed (24)`, `Tests 136 passed (136)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.5s`); **Architecture review:** self-review Passed.
- **Next:** App-level walkthrough on localhost:3003 — skeleton on cold load, global empty with Import/Sync, scoped filtered empty when filters exclude rows.

### 2026-07-07 — Journal trades table controls

- **Goal:** Add P0/P1 table controls to `/journal/trades` — sortable headers, result count, filtered empty state, client pagination, column visibility, density prefs.
- **Shipped:** `journalTradesTableControls.ts`; `JournalTradesTableControls` toolbar; upgraded `JournalTradesTable` (sortable sticky headers, conditional columns, dual empty states); `JournalTradesView` sort → paginate pipeline with localStorage prefs.
- **Verification run:** **Focused:** `Test Files 4 passed (4)`, `Tests 48 passed (48)`; **Build:** `npm run build` passed (`✓ Compiled successfully in 2.7s`); **Architecture review:** self-review Passed.
- **Next:** App-level walkthrough on `/journal/trades` — sort, paginate, toggle columns/density, confirm prefs survive refresh.

### 2026-07-07 — Journal trades page hero summary cards

- **Goal:** Show the four dashboard hero KPI cards at the top of `/journal/trades` with the trades table below.
- **Shipped:** `JournalTradesView` renders `JournalSummaryCards` above `JournalTradesTable` using the same scoped closed-trade stats + account equity as dashboard.
- **Verification run:** **Focused:** `Test Files 2 passed (2)`, `Tests 44 passed (44)`; **Architecture review:** self-review Passed.

### Session Exit Checklist

- [ ] Active Work state and latest result updated
- [ ] Task Contract updated or cleared
- [ ] Known blockers recorded
- [ ] Temporary/debug artifacts removed
- [ ] Next concrete action recorded
- [ ] Appropriate verification tier run

## Next Priorities (Post-V1)

Canonical roadmap: [ROADMAP.md](./ROADMAP.md). Immediate priorities:

1. **Corporate events / news / fundamentals / macro panels** — next Phase 2 market-data workflow expansions; news provider economics in [News Flow Roadmap](./roadmaps/news-flow-roadmap.md)
2. **Bar Replay persistence** — persist position in `CellConfig`
3. ~~**Options sidebar panel**~~ — **shipped**

## Explicit Deferrals

- Pine Script syntax / public community indicators (private chart-only TypeScript scripting is **Pending**)
- Price/drawing alerts
- Non-time charts (Renko, P&F, Kagi)
- Volume footprint, TPO, session profile
- 16-chart layouts, cloud sync

## Verification for Active Areas

```bash
# Internal package boundaries
npm run lint:package-boundaries
npm run typecheck:packages
npm run build:packages
npm run check:examples

# Package API snapshots
npm test -- --run src/test/package-api-snapshot.test.ts
npm test -- --run src/test/package-boundaries.test.ts

# Context menu / copy menu
npm test -- --run src/app/components/chartContextMenu.test.ts
npm test -- --run src/app/components/chartCopyMenu.test.ts

# Chart engine (canonical package paths)
npm test -- --run packages/chart-react/src/engine/
npm test -- --run packages/chart-react/src/EdgeChart.test.tsx
npm test -- --run src/app/components/chart-cell/
npm test -- --run src/app/components/ChartCell.activeChart.test.tsx
npm test -- --run src/lib/chart/

# AI tools
npm test -- --run src/lib/ai/
```

## Related Docs

- [status-archive/](./status-archive/) — pruned harness history (Session Log, Task Contracts, old Active Work)
- [chart/features.md](./chart/features.md) — full feature inventory with status per row
- [ROADMAP.md](./ROADMAP.md) — consolidated product and engineering roadmap
- [journal-roadmap.md](./journal-roadmap.md) — post-v1 journal reporting tiers (Tier 1–3)
- [chart/context-menu-reference.md](./chart/context-menu-reference.md) — TV vs Edge menu parity
- [ai-tools-architecture.md](./ai-tools-architecture.md) — AI tool design and rollout phases
- [chart/drawing-platform-plan.md](./chart/drawing-platform-plan.md) — drawing platform (complete)
