# Rich Annotations — Product Vision

Edge is evolving from a TradingView-style charting app into a **trading co-pilot**: an agentic workspace where the chart is the primary document and AI is co-author. Rich annotations are the differentiator — not more drawing tools, but **drawings that carry meaning**.

**Related:** [ai-tools-architecture.md](../ai-tools-architecture.md) (tool registry and adapters), [drawing-foundation.md](./drawing-foundation.md) (drawing platform status), [drawing-engine-design.md](./drawing-engine-design.md) (V1 engine design), [features.md §8](./features.md) (shipped drawing tools).

---

## Product principle

> **Every mark on the chart should answer: what is this, why is it here, is it still true, and what happens if it breaks?**

TradingView answers *where*. Edge should answer **what, why, still true, and what's next** — with the chart as the document and the AI as co-author.

| Product | Primary artifact | Agent role |
|---------|------------------|------------|
| Cursor | Source code | Edit, explain, refactor inline |
| Edge | Chart + annotation layer | Analyze, annotate, maintain thesis, execute intent |

---

## Current state (baseline)

**Phase A shipped (June 2025).** Drawings now support optional semantic metadata:

- Types and helpers: [`src/lib/chart/annotationMetadata.ts`](../../src/lib/chart/annotationMetadata.ts)
- `SerializedDrawing.metadata` on all drawing types (persisted via layout storage)
- Kinds v1: `thesis`, `invalidation`, `target`, `note`
- Status v1: `proposed`, `accepted`, `active`, `invalidated` (`triggered` in schema, unused)
- Visual: kind-based default line colors + on-chart badge pills
- UI: kind/rationale in selection toolbar; accept/dismiss for AI `proposed` annotations; kind prefix in Object Tree
- AI: `add_drawing` / `update_drawing` accept `metadata`; `list_drawings` filters by kind/status/source; `summarize_chart` returns `annotations` block

**Still deferred:** live computed stats (Phase B), copilot `threadId` navigation (Phase C), playbooks (Phase D), alerts (Phase E). Schema fields `threadId`, `playbookId`, `linkGroupId`, `computed` are reserved.

Previously, drawings were **geometry + cosmetic styles only** (no `metadata` field). Phase A closes the semantic gap; Phase B+ will add live payloads and chart↔chat linkage.

---

## Three-layer annotation model

Every rich annotation (whether a line, zone, pin, or callout) should express three layers:

| Layer | What it is | Example |
|-------|------------|---------|
| **Geometry** | Where on the chart | horizontal at $182.50, rectangle zone, ray from swing low |
| **Semantics** | What it *means* | invalidation, target, entry, catalyst, confluence |
| **Payload** | Live or computed data | R:R 2.4:1, touched 3×, earnings +8% beat, 72% confidence |

TradingView implements geometry well and adds limited payload (measure tool, fib labels). Edge's bet is **semantics + payload**, with AI reading and writing all three.

---

## Vision categories

### 1. Typed annotations (structured, not free text)

Replace generic `"Note"` text with **kinds** that have expected fields and distinct visual language.

| Kind | Purpose | Key fields |
|------|---------|------------|
| `thesis` | Overall directional view | direction, timeframe, conviction (1–5), summary |
| `invalidation` | Level/condition that kills the thesis | level, condition ("close below on daily") |
| `target` | Profit objective | price, partial exit %, rationale |
| `catalyst` | External event driver | event type (earnings, FDA, Fed), date, expected impact |
| `confluence` | Overlapping signals at one zone | list of signals ("200 EMA + fib 0.618 + prior high") |
| `question` | Open uncertainty for user or AI | prompt text, resolved flag |
| `note` | Unstructured fallback | free text (current behavior) |

**Why it matters:** the chart becomes scannable at a glance. AI can filter: *"list all invalidation levels on NVDA."* Equivalent to Cursor's typed inline diagnostics.

**Visual encoding:** color, icon, border style, and badge per kind — consistent across all geometry types (a horizontal line can be an invalidation; a rectangle can be a target zone).

---

### 2. Live / computed annotations

Static labels go stale. Rich annotations **recompute** as bars print and as the viewport changes.

| Geometry | Computed payload examples |
|----------|---------------------------|
| Horizontal line / price line | touches count, last touch (bars ago), avg rejection wick |
| Trend line | slope angle, % change, duration, "acting as support/resistance" |
| Rectangle / zone | time inside zone, volume accumulated, breakout status (pending / confirmed / failed) |
| Fib retracement | active levels, confluence with nearby MAs or prior S/R |
| Risk box (entry + stop + target) | R:R ratio, position size at X% account risk, expected $ P&L |
| Measure | extend existing measure tool pattern to all placement flows |

**Implementation note:** computed values live in a `metadata.computed` cache refreshed on bar update or viewport change; render reads cache, does not block on async fetches during draw loop.

---

### 3. Event-anchored annotations

Pins and vertical lines bound to **world events**, not just arbitrary timestamps.

- **Earnings pin:** actual vs estimate, gap %, guidance snippet (from `get_fundamentals` / future events API)
- **News headline** at bar time (expandable or link out)
- **Corporate actions:** dividend ex-date, split, buyback
- **Macro calendar:** CPI, FOMC with outcome vs consensus

Turns the chart into a **timeline of narrative + price**, not just OHLC. AI workflow: *"mark the last two earnings reactions"* → placements include event payload automatically.

---

### 4. Scenario layers (AI-native overlays)

Multi-scenario analysis as first-class chart objects.

- **Bull / base / bear zones** — semi-transparent rectangles with probability weights
- **Path annotations** — "if hold $180 → target $195; if lose → $168" (branching logic as linked drawings)
- **Playbook groups** — toggle entire analysis sessions on/off (Figma-style layers)
- **Diff view** — what changed since yesterday's annotation set (Cursor-style git diff for thesis)

A trader's chart becomes a **living document** with version history, not a one-off screenshot.

---

### 5. Executable annotations (intent, not commentary)

Annotations that **do something** when conditions are met.

- Alert when price enters zone, breaks trendline, or hits fib level
- **Trade plan object:** entry zone + stop + targets → bundled alerts (future: order draft)
- **Invalidation trigger:** auto-mark thesis `invalidated` and notify
- **Backtest snapshot on placement:** "this level held 7/9 times in the last 2 years" (historical respect rate)

TradingView supports alerts on some drawing types. Edge extends this by binding alerts to **semantic kinds** and plain-language conditions maintained by AI.

---

### 6. Conversation anchors (chart ↔ chat linkage)

Every AI-placed or user-placed annotation can carry provenance and link back to reasoning.

| Field | Purpose |
|-------|---------|
| `source` | `user` \| `ai` \| `imported` |
| `rationale` | Why it was placed (hover / sidebar detail) |
| `threadId` | Jump to chat turn that created or last edited it |
| `status` | `proposed` → `accepted` → `active` → `triggered` → `invalidated` |

Click annotation → sidebar opens full reasoning, supporting data, follow-up actions (*"move stop to breakeven"*, *"add confluence check"*). Chart and chat are **bidirectionally linked**.

---

### 7. Multi-chart linked annotations

In linked grid layout, annotations can propagate or reference across cells.

- Same invalidation on daily and 4H — shared `linkGroupId`, edit one updates both
- Compare overlay: relative strength annotation when viewing symbol vs benchmark
- Symbol-agnostic pattern template applied across watchlist symbols

Supports existing workflow tools (`compare_symbols`, linked layout) with a shared semantic layer.

---

### 8. Rich visual encodings (information density)

Pack more information without clutter. Default **collapsed**; expand on hover/select (same UX principle as Cursor inline hints).

- **Callout leaders** with expandable body
- **Heat along a line** — strength of support (darker where bounces were clean)
- **Badge stack** on a level: volume confirm, news, AI, nearby invalidation
- **Mini sparkline** inside a rectangle showing price action while inside the zone
- **Table annotation** — embedded grid: levels, sizes, R multiples
- **Signpost / flag** — quick categorical tags (breakout, trap, chop, climax)

Prefer a **small set of semantically rich types** over cloning TradingView's 40+ annotation tools early.

---

### 9. Machine-readable schema (AI layer)

Extend the drawing model so agents operate on meaning, not just coordinates.

```ts
/** Implemented in src/lib/chart/annotationMetadata.ts */
type AnnotationKind = "thesis" | "invalidation" | "target" | "note";

type AnnotationStatus =
  | "proposed"
  | "accepted"
  | "active"
  | "triggered"
  | "invalidated";

type DrawingMetadata = {
  kind?: AnnotationKind;
  status?: AnnotationStatus;
  source?: "user" | "ai" | "imported";
  rationale?: string;
  threadId?: string;
  linkGroupId?: string;
  playbookId?: string;
  /** Kind-specific structured fields (thesis direction, catalyst date, etc.) */
  fields?: Record<string, unknown>;
  /** Live stats cache — refreshed on bar/viewport update */
  computed?: Record<string, string | number | boolean>;
  /** Cross-references to other drawings or symbols */
  links?: Array<{ drawingId?: string; symbol?: string }>;
};

// SerializedDrawing gains:
// metadata?: DrawingMetadata;
```

**AI tool implications:**

| Tool | Enhancement |
|------|-------------|
| `add_drawing` | Accept `metadata` with kind, fields, rationale, source |
| `update_drawing` | Patch metadata and status transitions |
| `list_drawings` | Filter by `kind`, `status`, `playbookId`, `source` |
| `summarize_chart` | Read semantics + computed payloads, not just geometry |
| `prepare_chart_for_analysis` | Clear stale `proposed` AI annotations; layer fresh playbook |

---

## What we are not optimizing for (yet)

- Parity with TradingView's full annotation menu (brush, stickers, X posts, etc.)
- Social publishing of ideas
- Pixel-perfect clone of TV callout/table widgets

Those can come later if needed. The co-pilot wedge is **semantic, live, linked annotations** — not decorative markup.

---

## Implementation roadmap

Phases are ordered by leverage for the co-pilot product, not by TV feature parity.

### Phase A — Semantic foundation (shipped)

**Goal:** drawings carry meaning; AI and UI can filter and display by kind.

| Work item | Status |
|-----------|--------|
| Extend `SerializedDrawing` with `metadata` | Done — `annotationMetadata.ts`, `schemas.ts`, layout persistence |
| Annotation kinds + visual differentiation | Done — badges + kind colors on existing geometry |
| AI tool schema updates | Done — metadata on add/update; filters on list |
| Object tree kind labels | Done — `[INV]` / `[AI?]` prefixes |
| Status lifecycle UI | Done — accept/dismiss for AI `proposed` in selection toolbar |

**Exit criteria:** met — AI can place invalidation with rationale; user accepts/dismisses; `summarize_chart` reads thesis structure.

---

### Phase B — Computed payloads

**Goal:** annotations stay truthful as market moves.

| Work item | Scope |
|-----------|--------|
| Computed stats service | Bar-triggered refresh for hline/trendline/rect/fib |
| Render footers | Collapsed one-liner + expanded detail on select |
| Extend `measure` pattern | Shared helper for all two-point tools |
| Risk box kind | Entry/stop/target linked drawings → auto R:R |

**Exit criteria:** horizontal invalidation shows live touch count; selected trendline shows slope and % change.

---

### Phase C — Conversation anchors

**Goal:** chart ↔ copilot bidirectional linkage.

| Work item | Scope |
|-----------|--------|
| `threadId` + `rationale` on AI placements | Copilot panel (when built) opens on annotation click |
| Provenance UI | "AI suggested" badge, accept/dismiss flow |
| `summarize_chart` upgrade | Uses rationale + status in narrative output |

**Exit criteria:** click AI annotation → see why it was placed; dismiss marks `invalidated` or removes.

---

### Phase D — Playbooks and layers

**Goal:** analysis as a versioned document.

| Work item | Scope |
|-----------|--------|
| `playbookId` grouping | Toggle visibility of entire analysis sets |
| Layer panel | Figma-style layer list with kind icons |
| Snapshot / diff | Store annotation set snapshots; diff two timestamps |

---

### Phase E — Event anchors and executability

**Goal:** annotations tied to world events and alerts.

| Work item | Scope |
|-----------|--------|
| Event pins | Earnings, dividends (fundamentals + calendar data) |
| Alert binding | Semantic alert rules on kind + geometry |
| Invalidation triggers | Status auto-update on condition hit |

---

## Recommended next step

**Start Phase A — semantic foundation.** It unblocks everything else and does not require new drawing tools or a copilot UI shell.

Concrete first sprint:

1. **Schema** — add optional `metadata` to `SerializedDrawing`; persist through `layoutStorage`; validate in AI `schemas.ts`.
2. **Kinds v1** — ship `thesis`, `invalidation`, `target`, `note` with distinct render treatment on existing tools (especially `horizontal_line`, `rectangle`, `annotation`).
3. **AI tools** — extend `add_drawing` / `update_drawing` / `list_drawings` with metadata; add `kind` filter to `list_drawings`.
4. **Minimal UI** — kind selector in drawing settings or selection toolbar; status badge when `source: "ai"` and `status: "proposed"`.
5. **Upgrade `summarize_chart`** — include metadata in chart summary for agent consumption.

Defer computed stats (Phase B) until kinds are in the data model — otherwise computed footers have nothing semantic to attach to.

---

## Open questions

| Question | Options | Recommendation |
|----------|---------|----------------|
| Metadata on all drawings vs annotation-only types? | Universal `metadata` vs separate `rich_annotation` tool | Universal `metadata` — any geometry can be an invalidation |
| Playbook storage | Per-cell in `CellConfig` vs separate store | Per-cell first; promote to layout-level playbooks later |
| Computed refresh cadence | Every bar vs on select only | Every bar for visible drawings; throttle heavy stats |
| AI `proposed` default | Auto-accept vs require user accept | Require accept for write tools; builds trust |

---

## File map (future implementation)

| Area | Paths |
|------|-------|
| Data model | `src/lib/chart/contracts.ts`, `src/lib/layoutStorage.ts` |
| AI schemas | `src/lib/ai/schemas.ts`, `src/lib/ai/tools/drawings.ts` |
| Render | `src/lib/chart/drawings/*`, `src/lib/chart/renderer.ts` |
| Computed stats | `src/lib/chart/annotationStats.ts` (new) |
| UI | `DrawingSelectionToolbar.tsx`, Object tree, future copilot panel |
| Workflow | `src/lib/ai/tools/workflow.ts` (`summarize_chart`) |

---

## Changelog

| Date | Change |
|------|--------|
| 2025-06-22 | Phase A shipped — metadata schema, AI tools, badges, toolbar, Object Tree |
| 2025-06-22 | Initial vision doc — rich annotations product direction and phased roadmap |
