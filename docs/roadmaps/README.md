# Feature Roadmaps

Living multi-phase tracks for Edge product areas. Product direction stays in [../ROADMAP.md](../ROADMAP.md); live Active Work stays in [../PROJECT-STATUS.md](../PROJECT-STATUS.md).

**App-level verification debt** for shipped work is owned by the verification tracks — not by the product tracks below.

## Status sync (closeout)

Track file `**Status:**` line is source of truth for phase state. On every phase **Passing** closeout:

1. Update the track file status line (or via `npm run harness:closeout -- … --roadmap …`).
2. Refresh **this table** (same phase wording as the track file).
3. Refresh [../ROADMAP.md](../ROADMAP.md) Near-Term Execution Order when the track’s headline status changes.
4. Do not mark a phase **Passing** in the track before Active Work has quoted evidence.

Optional check: `npm run roadmaps:status-check` compares track headers ↔ this table.

| Track | File | Status |
|-------|------|--------|
| **App-level verification (Wave 1)** | [app-level-verification-roadmap.md](./app-level-verification-roadmap.md) | Phases 0–8 **Passing** (2026-07-22) — track complete |
| **App-level verification (Wave 2)** | [app-level-verification-wave-2-roadmap.md](./app-level-verification-wave-2-roadmap.md) | Phases 0–4 **Passing** (2026-07-24) — track complete |
| **Live functional QA remediation** | [live-functional-qa-remediation-roadmap.md](./live-functional-qa-remediation-roadmap.md) | Phase 0–8 **Passing** (2026-07-29); track complete — 2026-07-28 QA findings |
| Stock screener | [screener-roadmap.md](./screener-roadmap.md) | Phases 1–5 **shipped**; product deferrals remain; app-level walks → Wave 1 Phase 5 |
| Trading journal | [journal-roadmap.md](./journal-roadmap.md) | v1 + Tiers 1–3 **Passing** (2026-07-22); app-level walks → Wave 1 Phase 6; import chrome → Wave 2 Phase 4 |
| Trading execution | [trading-execution-roadmap.md](./trading-execution-roadmap.md) | Phases 0–5 + **6–9 Passing** (2026-07-22); options backlog; ops walks → Wave 1 Phase 1 + 4 |
| Trade management playbook | [trade-management-playbook-roadmap.md](./trade-management-playbook-roadmap.md) | Phase 0–7 **Passing** (2026-07-24); Phase 8 **Pending** — rule editor |
| Risk management system | [risk-management-system-roadmap.md](./risk-management-system-roadmap.md) | Phase 0 **Passing** (2026-07-29); Phase 1 **Passing** (2026-07-30); Phase 2 **Passing** (2026-07-29); Phase 3 **Passing** (2026-07-29); Phase 4 **Passing** (2026-07-29); Phase 5 **Passing** (2026-07-30); UX moments Phases 6–10 |
| Dual connection | [dual-connection-roadmap.md](./dual-connection-roadmap.md) | Phases A–D **product complete**; both-Gateway ops proof → Wave 1 Phase 1 |
| Connections & providers | [connections-providers-roadmap.md](./connections-providers-roadmap.md) | Phase 0–4 **Passing**; Phase 5 **Pending** (local Gateway polish); Settings/prefs walks → Wave 2 Phase 3 |
| IBKR hosted OAuth | [ibkr-hosted-oauth-roadmap.md](./ibkr-hosted-oauth-roadmap.md) | Phase 0 **Pending** (feasibility + IB onboarding); extracted from Connections Path A |
| Broker ledger + sync | [broker-ledger-roadmap.md](./broker-ledger-roadmap.md) · [functional test plan](./broker-ledger-functional-test-plan.md) | Phases 0–4 **Passing**; Flex/live residual → Wave 1 Phase 1 |
| Alerts | [alerts-roadmap.md](./alerts-roadmap.md) | Phases 0–4 **Passing** (product complete for v1); external delivery deferred; walks → Wave 1 Phase 2; MCP tools → Wave 2 Phase 4 |
| AI agent / in-app copilot | [ai-agent-roadmap.md](./ai-agent-roadmap.md) | Phases 0–8 **Passing** — functional agent complete; deferred walks → Wave 2 Phase 1 |
| Grok Copilot UX parity | [grok-copilot-parity-roadmap.md](./grok-copilot-parity-roadmap.md) | Phases 0–5 **Passing** (track complete); chrome walks → Wave 2 Phase 2 |
| Copilot chat blocks | [copilot-chat-blocks-roadmap.md](./copilot-chat-blocks-roadmap.md) | Phase 0–3 **Passing** — Action shell + scroll + Media/Data + Reference; Phase 4 Follow-ups **Pending** |
| Quant research runtime | [quant-research-runtime-roadmap.md](./quant-research-runtime-roadmap.md) | Phase 0 **Pending** — contracts + architecture freeze |
| Research UX (AI-first desk) | [research-ux-roadmap.md](./research-ux-roadmap.md) | Phases 0–8 **Passing** (2026-07-24) — track complete; Talk / Board / Desk; session reel; research-default entry |
| TypeScript indicator scripting | [typescript-indicator-scripting-roadmap.md](./typescript-indicator-scripting-roadmap.md) | Phases 0–5B + Scripts tile **Passing**; walks → Wave 1 Phase 3 |
| Script depth (Pine-like capability) | [script-depth-roadmap.md](./script-depth-roadmap.md) | Phases 0–5 **Passing** — track complete; walks → Wave 1 Phase 3 |
| Market news flow | [news-flow-roadmap.md](./news-flow-roadmap.md) | Research captured; implementation not started |
| TrendSpider competitive | [trendspider-competitive-roadmap.md](./trendspider-competitive-roadmap.md) | Research inventory started; prioritize Adopt/Adapt/Defer/Skip before implementation |
| App UX polish | [app-ux-polish-roadmap.md](./app-ux-polish-roadmap.md) | Phases 0–5 **Passing** — track complete; residual chrome walks → Wave 1 Phase 6 |
| Component standardization | [component-standardization-roadmap.md](./component-standardization-roadmap.md) | Phases 0–6 **Passing** — track complete |
| Day classification | [day-classification-roadmap.md](./day-classification-roadmap.md) | Phases 1–3 **Passing** (2026-07-23); Phase 4 review UI **Pending** |
| Data inventory and state hardening | [data-state-hardening-roadmap.md](./data-state-hardening-roadmap.md) | Phases 0–8 **Passing**; telemetry/SLOs future; live-fault walks → Wave 1 Phase 7 |
| Data serving & caching efficiency | [data-serving-efficiency-roadmap.md](./data-serving-efficiency-roadmap.md) | Phases 0–6 **Passing**; Phase 7 **Skipped** — track complete; walks → Wave 1 Phase 7 |
| Memory efficiency | [memory-efficiency-roadmap.md](./memory-efficiency-roadmap.md) | Phases 0–14 **Passing** (2026-07-24) — track complete; Redis adapters in Phase 12; prod topology → [shared-cache-topology-roadmap.md](./shared-cache-topology-roadmap.md) |
| Comprehensive memory metrics | [memory-metrics-roadmap.md](./memory-metrics-roadmap.md) | Phase 0–6 **Passing** (2026-07-25); track complete — layered scorecard (heap, tab/process, GPU surfaces, desk composite, report + soft budgets, soak); measurement only |
| Runtime interaction performance | [runtime-performance-roadmap.md](./runtime-performance-roadmap.md) | Phase 0–8 **Passing** (2026-07-25); track complete — frame time / crosshair / tip tick / React wakeups / CI budgets |
| Shared cache topology | [shared-cache-topology-roadmap.md](./shared-cache-topology-roadmap.md) | Phase 0–4 **Passing** (2026-07-24); Phase 5 **Pending** (multi-instance); manual redis health flip → Wave 2 Phase 4 |
| Local development and production | [local-dev-production-roadmap.md](./local-dev-production-roadmap.md) | Phases 0–5 **Passing** (2026-07-26) — host-native production track complete |
| Local production containerization | [local-production-containerization-roadmap.md](./local-production-containerization-roadmap.md) | Phase 0–5 **Passing** (2026-07-26) — **track complete** |
| Workspace state persistence | [workspace-state-persistence-roadmap.md](./workspace-state-persistence-roadmap.md) | Phases 0–5 **Passing** — track complete; residual chrome → Wave 1 Phase 6 |
| Structural refactor | [refactor-roadmap.md](./refactor-roadmap.md) | Tiers A–E **Passing** — track complete |
| Code organization | [code-organization-roadmap.md](./code-organization-roadmap.md) | Phase 0–5 **Passing** (2026-07-24) — chart shims sunset complete |
| TWS sidecar architecture | [tws-sidecar-refactor-roadmap.md](./tws-sidecar-refactor-roadmap.md) | Phases 0–7 **Passing** (2026-07-23) |
| Security hardening | [security-hardening-roadmap.md](./security-hardening-roadmap.md) | Phases 0–6 **Passing** (2026-07-24) — track complete |
| Production observability (free stack) | [production-observability-roadmap.md](./production-observability-roadmap.md) | Phase 0–5 **Passing** (2026-07-25); track complete |
| Plan → execute token efficiency | [plan-execute-token-efficiency-roadmap.md](./plan-execute-token-efficiency-roadmap.md) | Phase 0–9 **Passing** (2026-07-25) — track complete |
| Sub-harness tree | [sub-harness-tree-roadmap.md](./sub-harness-tree-roadmap.md) | Phase 0–5 **Passing** (2026-07-27) — track complete |
| Discord knowledge mine | [discord-knowledge-mine-roadmap.md](./discord-knowledge-mine-roadmap.md) | Phase 0 **Passing** (2026-07-29); Phase 1 **Passing** (2026-07-29); Phase 2 **Pending** — first-server bootstrap; OPS side track (not Edge product) |
