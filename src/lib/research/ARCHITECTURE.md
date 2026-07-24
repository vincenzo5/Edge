# Research UX Architecture

Contracts for the AI-first research desk: Talk / Board / Desk densities, Research Session store, and entry policy. Phase 0 freezes shapes; Phase 1 wires density chrome and research entry; Phase 2 adds Talk artifact pin + evidence rail; Phase 3 adds spatial Board v1 with local session persistence; Phase 4 adds live card hosts and Board↔Desk promote/demote.

**Track:** [research-ux-roadmap.md](../../../docs/roadmaps/research-ux-roadmap.md)

## Responsibility

Define versioned Zod sketches for Research Session, cards, and links; document density model and three-store ownership (Desk vs Session vs Copilot threads). Phase 1 adds density navigation + shell entry; spatial board and session persistence land in later phases.

## Density model

| Density | Role | Route |
|---------|------|-------|
| **Talk** | Conversation OS; pin artifacts to evidence rail | `/copilot` |
| **Board** | Spatial research home (Phase 3 v1) | `/research` |
| **Desk** | Tiled power layout — **permanent** | `/workspace` |
| **Stage** | Confirm / spotlight overlay | overlay pattern |

**Invariant:** Desk must remain a supported density forever — see `DESK_DENSITY_PERMANENCE` in `density.ts`.

Phase 1 chrome: `DensitySwitcher` in `AppTopHeader` (after logo) on Talk/Board/Desk routes only; Desk `centerSlot` workspace controls unchanged.

## Three stores

```
Talk (Copilot threads)  ──threadIds[]──▶  Research Session  ──cards/links──▶  Board (later)
                                              │
                                              └── deskLink ──▶  Desk (/workspace tiles)
```

| Store | Owns | Module |
|-------|------|--------|
| Desk | Tile layout, chart bindings, app-workspace sync | `src/lib/appWorkspace/` |
| Research Session | Cards, links, reel, session metadata, threadIds | `src/lib/research/` |
| Copilot | Thread messages, stream events, tool confirms | `src/lib/ai/agent/` |

See `ownership.ts` for the full ownership arrays. **Not** the same as Postgres `market_research_notes` — those are chart-linked notes; board `note` cards are session-local evidence nodes (may link later).

## Phase 0 modules

| File | Purpose |
|------|---------|
| `density.ts` | Talk / Board / Desk / Stage constants; Desk permanence |
| `sessionSketch.ts` | Zod schemas for session, cards (6 types), links, reel |
| `ownership.ts` | Desk / Session / Copilot ownership split |
| `entryPolicy.ts` | Route role map — no `lastModule` changes until Phase 8 |

## Phase 1 modules

| File / component | Purpose |
|------------------|---------|
| `densityNav.ts` | Density ↔ route map; pathname → active density; lastModule mapping |
| `DensitySwitcher.tsx` | `EdgeSegmentedTabs` chrome control (Talk / Board / Desk) |
| `ResearchBoardStub.tsx` | Board density empty shell at `/research` (Phase 1; replaced by `ResearchBoard.tsx` in Phase 3) |
| `HomeHubCards.tsx` | Talk + Board lead home hub cards |

## Phase 2 modules

| File / component | Purpose |
|------------------|---------|
| `artifactHint.ts` | Compact pin hints from tool results (`toArtifactHint`) |
| `evidenceStore.ts` | Session-local pinned cards (`tv-ai:research-evidence:v1`) |
| `cardFromHint.ts` | Hint → `ResearchCardSketch` + display labels |
| `openResearchCard.ts` | Deep links to `/chart` and `/workspace` surfaces |
| `useResearchEvidence.ts` | React subscribe hook for pin/unpin/reorder |
| `CopilotArtifactCard.tsx` | Chat artifact card + Pin |
| `CopilotEvidenceRail.tsx` | Talk page right rail (Evidence list) |

Stream contract: optional `artifactHint` on NDJSON `tool-result` events — in-memory on Copilot tool steps only (not persisted on thread rows). Confirm gates unchanged.

## Phase 3 modules

| File / component | Purpose |
|------------------|---------|
| `boardSessionStore.ts` | Active Research Session in `tv-ai:research-sessions:v1` (single session, Phase 3) |
| `useResearchBoardSession.ts` | React subscribe hook for board cards/links |
| `ResearchBoard.tsx` | Board shell at `/research` |
| `BoardCanvas.tsx` | Pan/zoom surface, card drag, Shift+click linking |
| `BoardCardNode.tsx` | Card hosts (chart/screener/note/aiCallout/journalDraft/deskLink) |
| `BoardLinksLayer.tsx` | SVG directed edges between cards |
| `BoardEmptyState.tsx` | Empty board CTAs (Talk, import evidence, Desk) |

Evidence → Board: `CopilotEvidenceRail` **Send to board** copies pinned cards into the session store (evidence rail unchanged). Session store is separate from evidence scratch (`tv-ai:research-evidence:v1`). Cloud multi-session sync is Phase 6.

**Card types (v1):** `chart`, `screener`, `note`, `journalDraft`, `aiCallout`, `deskLink`. `news` deferred.

**Storage keys:** Phase 2 scratch `tv-ai:research-evidence:v1`; Phase 3+ session `tv-ai:research-sessions:v1` (local single session until Phase 6 list/cloud).

## Phase 4 modules

| File / component | Purpose |
|------------------|---------|
| `boardChartMountPolicy.ts` | `MAX_LIVE_BOARD_CHART_CARDS = 1`; focused + viewport mount gate |
| `buildBoardChartCellConfig.ts` | Minimal `CellConfig` for board chart hosts |
| `promote.ts` | Board → Desk promote + Desk chart tile demote (`Send to board`) |
| `BoardChartCardHost.tsx` | Live `ChartCell` / `InactiveChartSurface` host on chart cards |
| `BoardScreenerCardHost.tsx` | Refreshable screener pin summary |
| `BoardJournalDraftCardHost.tsx` | Journal draft Open / Save actions |
| `ChartTileBoardActions.tsx` | Desk chart tile **Send to board** demote control |

**Performance budget:** At most one live chart engine on the Board (`shouldMountBoardChart`: focused card + in viewport). Reuses Memory Phase 11 inactive unmount via `ChartCell` + `InactiveChartSurface`.

**Promote / demote:** Promote mutates Desk via `applySurfaceFocusOrOpen` + persists `deskTileId` / `appWorkspaceId` on session cards. Demote reads tile workspace tabs and adds a chart card to the session store. Open remains navigate-only deep links.

## Integration boundaries

- **AI tools:** Board mutations (Phase 5+) go through the registry + confirm gates — no ad-hoc React mutation.
- **Persistence:** Session cloud sync is a separate resource from app-workspace and chart-workspace — see [persistence ARCHITECTURE](../persistence/ARCHITECTURE.md).
- **Design system:** Board chrome (Phase 3+) uses Edge tokens — see [design-system ARCHITECTURE](../design-system/ARCHITECTURE.md).

## Related docs

- [AI ARCHITECTURE](../ai/ARCHITECTURE.md) — Copilot threads and agent ownership
- [App Workspace ARCHITECTURE](../appWorkspace/ARCHITECTURE.md) — Desk tiling
- [Workspace State Persistence Roadmap](../../../docs/roadmaps/workspace-state-persistence-roadmap.md) — Desk sync (complete)
