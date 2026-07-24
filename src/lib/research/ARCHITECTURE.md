# Research UX Architecture

Contracts for the AI-first research desk: Talk / Board / Desk densities, Research Session store, and entry policy. Phase 0 freezes shapes; Phase 1 wires density chrome and research entry; Phase 2 adds Talk artifact pin + evidence rail; Phase 3 adds spatial Board v1 with local session persistence; Phase 4 adds live card hosts and Board↔Desk promote/demote; Phase 5 adds AI board conductor tools via `ResearchBoardPort`.

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
| `entryPolicy.ts` | Route role map + Phase 8 smart `/` redirect rules |
| `defaultDensityPreference.ts` | Local default density pref (`tv-ai:research-default-density:v1`) |
| `rootRedirect.ts` | Default density → root redirect target |

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
| `boardSessionStore.ts` | Active Research Session in `tv-ai:research-sessions:v1` (multi-session + cloud sync, Phase 6) |
| `useResearchBoardSession.ts` | React subscribe hook for board cards/links |
| `ResearchBoard.tsx` | Board shell at `/research` |
| `BoardCanvas.tsx` | Pan/zoom surface, card drag, Shift+click linking |
| `BoardCardNode.tsx` | Card hosts (chart/screener/note/aiCallout/journalDraft/deskLink) |
| `BoardLinksLayer.tsx` | SVG directed edges between cards |
| `BoardEmptyState.tsx` | Empty board CTAs (Talk, import evidence, Desk) |

Evidence → Board: `CopilotEvidenceRail` **Send to board** copies pinned cards into the session store (evidence rail unchanged). Session store is separate from evidence scratch (`tv-ai:research-evidence:v1`). Cloud multi-session sync ships in Phase 6.

**Card types (v1):** `chart`, `screener`, `note`, `journalDraft`, `aiCallout`, `deskLink`. `news` deferred.

**Storage keys:** Phase 2 scratch `tv-ai:research-evidence:v1`; Phase 3+ session `tv-ai:research-sessions:v1` (multi-session local + optional cloud).

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

## Phase 5 modules

| File | Purpose |
|------|---------|
| `boardFocusStore.ts` | Ephemeral focused card id for live chart mount + AI `focus_research_card` |
| `researchBoardPort.ts` | `ResearchBoardPort` facade over session store + focus store (ToolContext boundary) |
| `src/lib/ai/tools/research.ts` | Registry tools: get/add/link/focus/arrange/remove board cards |

**Confirm policy:** `arrange_research_cards` and `remove_research_card` require user confirmation. Adds/links/focus apply immediately with `source: ai`.

**ToolContext:** `context.research` is wired in `AiToolsProvider` when `app` session is present; null on HTTP server context.

## Phase 6 modules

| File | Purpose |
|------|---------|
| `boardSessionStore.ts` | Multi-session local doc in `tv-ai:research-sessions:v1` (max 50); list/create/rename/delete/switch |
| `researchSessionsClient.ts` | Local-first dual-write to `/api/me/research-sessions` with OCC |
| `researchSessionsRepository.ts` | Postgres `user_research_sessions` CRUD |
| `ResearchBoardSessionRail.tsx` | Board chrome session list + Open Talk linkage |
| `useResearchBoardSession.ts` | Hydrate + debounced cloud save hook |
| `CopilotThreadUrlFocus.tsx` | `/copilot?threadId=` deep link → switch Copilot thread |

**Thread linkage:** Session stores `threadIds[]` only (not message bodies). Board **Open Talk** navigates to `/copilot?threadId=` for `threadIds[0]`.

**Desk boundary:** Session persistence never writes workspace tile layout.

## Phase 7 modules

| File / component | Purpose |
|------------------|---------|
| `reelBeats.ts` | Pure reel helpers — append/dedupe, reorder, prune orphans, default labels |
| `reelJournalDraft.ts` | Compose ordered reel beats into a `journalDraft` summary string |
| `boardSessionStore.ts` | Reel mutators (`appendReelBeat`, `removeReelBeat`, `reorderReelBeats`); auto-append on card add/import; prune beats on card delete |
| `BoardReelFilmstrip.tsx` | Horizontal session reel UI — scrub beats, checkpoint focused, draft journal |
| `useResearchBoardSession.ts` | Exposes `reel` + reel mutation callbacks to Board shell |

**Reel model:** `reel[]` beats reference board cards by `cardId` (`{ id, cardId, label?, order }`). Auto-append on card add skips duplicate `cardId`; manual **Checkpoint focused** allows duplicate beats for the same card. Removing a card prunes orphan beats and renumbers `order` densely. Journal export composes summary text and adds a `journalDraft` card — no parallel journal store.

## Phase 8 modules

| File / component | Purpose |
|------------------|---------|
| `defaultDensityPreference.ts` | Local opt-in default density (Talk/Board/Desk; default Desk) |
| `rootRedirect.ts` | Maps default density to `/copilot`, `/research`, or `/workspace` |
| `lastModule.ts` (extended) | Smart `/`: recent lastModule wins; cold/expired uses default density |
| `RootEntryRedirect.tsx` | Reads lastModule + default density on `/` |
| `AppSettingsShell.tsx` | Default density control in Application settings |
| `HomeHubCards.tsx` | Research Session primary card; Desk prominent; onboarding copy |

**Redirect priority:** recent `lastModule` (24h TTL) → default density pref → never forces Board without opt-in. Desk permanence unchanged.

## Integration boundaries

- **AI tools:** Board mutations go through the registry + confirm gates — no ad-hoc React mutation.
- **Persistence:** Session cloud sync is a separate resource from app-workspace and chart-workspace — see [persistence ARCHITECTURE](../persistence/ARCHITECTURE.md).
- **Design system:** Board chrome (Phase 3+) uses Edge tokens — see [design-system ARCHITECTURE](../design-system/ARCHITECTURE.md).

## Related docs

- [AI ARCHITECTURE](../ai/ARCHITECTURE.md) — Copilot threads and agent ownership
- [App Workspace ARCHITECTURE](../appWorkspace/ARCHITECTURE.md) — Desk tiling
- [Workspace State Persistence Roadmap](../../../docs/roadmaps/workspace-state-persistence-roadmap.md) — Desk sync (complete)
