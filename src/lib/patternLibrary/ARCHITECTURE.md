# Personal Pattern Library — Architecture

Hybrid system for teaching an LLM a discretionary trader's chart eye without relying on screenshot-only few-shot prompting.

## Design

```
Capture (in-app Pattern Capture Mode + API) → Library store → Retrieval / Rules / VLM stub
                                              ↓
                                    Bake-off + stress tests
                                              ↓
                              AI tools (find_similar_setups, save_pattern_capture)
```

**Principle:** Pixels carry style noise; OHLCV carries truth; section labels carry the trader's decision schema; outcomes prevent storytelling.

## Interactive capture (`src/lib/patternCapture/`)

| Path | Role |
|------|------|
| `fsm.ts` | Capture mode state machine (start/end section pairs → labeled sections → save) |
| `presets.ts` | Section label presets + 1-based keyboard index lookup |
| `slice.ts` | OHLCV slice, left-pad render bars, bar snap helpers |
| `buildRecord.ts` | Build `PatternRecord` + padded render series from labeled sections |

In-app flow: **Shift+P** or header **Capture** → start click → end click (same bar = 1-bar section) → label (**1–N** preset keys or custom) → repeat → Save → `POST /api/pattern-library/captures` → `data/pattern-library/records/{id}.json` + `.svg`. After save, **View in Patterns** opens the library panel.

Stored `ohlcv` is patternStart..patternEnd only (no look-ahead). SVG export uses left padding (default 5 bars) with section bands/labels via `renderChart.ts`.

## Browse UI (`src/app/components/pattern-library/`)

| Path | Role |
|------|------|
| `PatternLibraryContext.tsx` | Panel open + chart `goTo` navigation requests |
| `PatternsPanel.tsx` | Right-rail list of interactive captures (non-`seed-*`) |
| `PatternCaptureCard.tsx` | SVG thumbnail + section path chips |
| `PatternCaptureDetailDrawer.tsx` | Full SVG, sections, metadata PATCH, **Go to chart** |

Rail entry: sidebar **Patterns** icon (`SidebarPanelId: "patterns"`, app-scoped, pop-out supported).

HTTP browse API:

| Route | Method | Role |
|-------|--------|------|
| `/api/pattern-library/records` | GET | Summary list (interactive captures only) |
| `/api/pattern-library/records/[id]` | GET / PATCH | Full record load; metadata update (family, quality, notes, thesis) |
| `/api/pattern-library/records/[id]/svg` | GET | Frozen SVG render |
| `/api/pattern-library/taxonomy` | GET | Setup family picker options |
| `/api/pattern-library/captures` | GET / POST | Single record by id; save new capture (unchanged) |

**Go to chart** patches active cell symbol/interval/range and scrolls to `capture.patternEnd.timestamp`. Live section-band rehydrate on the chart is deferred (absolute bar indices are capture-time only).


## Modules

| Path | Role |
|------|------|
| `types.ts` | Zod schemas: taxonomy, records, `capture` sections, bake-off metrics |
| `taxonomy.ts` | Default setup families + success metrics |
| `features.ts` | OHLCV feature extraction + cosine similarity |
| `renderChart.ts` | Deterministic SVG candlestick renderer (frozen style) |
| `storage.ts` | File-backed library under `data/pattern-library/` |
| `retrieval.ts` | Top-k neighbor search + majority vote prediction |
| `rules.ts` | Hand-coded OHLCV rules (Arm C) |
| `vlmStub.ts` | Deterministic few-shot stub (Arm A); swap for real VLM adapter |
| `bakeoff.ts` | Three-arm holdout comparison + Wilson CI / bias gates |
| `stress.ts` | Look-ahead, style ablation, bias, relative-comparison tests |
| `seedData.ts` | Synthetic 100-record generator for MVP |

## Data layout

```
data/pattern-library/
  taxonomy.json       # Setup families, invalidation, success metrics
  records/*.json      # Point-in-time setup records
  records/*.svg       # Frozen-style chart renders
  bakeoff-results.json
  stress-results.json
```

## CLI

```bash
npm run pattern-library:seed      # 100 synthetic records + taxonomy
npm run pattern-library:bakeoff   # three-arm holdout bake-off
npm run pattern-library:stress    # stress test battery
```

## AI tools

Registered in `src/lib/ai/tools/patternLibrary.ts`:

- `list_pattern_taxonomy` — setup families + gates
- `find_similar_setups` — retrieval over library from active chart OHLCV (returns section summaries when present)
- `pattern_library_stats` — library counts
- `capture_pattern_setup` — draft record from active chart (no persist; prefer in-app capture mode)
- `save_pattern_capture` — persist capture record + SVG (confirmation required)
- `get_pattern_capture` — load record by id

VLM is explainer-only; retrieval and rules are primary signal paths per research verdict.

## Related

- [docs/chart/rich-annotations-vision.md](../../docs/chart/rich-annotations-vision.md) — semantic drawings (thesis/invalidation/target)
- [docs/ai-tools-architecture.md](../../docs/ai-tools-architecture.md) — tool registry
