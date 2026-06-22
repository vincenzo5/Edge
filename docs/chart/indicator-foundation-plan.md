# Indicator Platform — Foundation Plan

Phased foundation upgrade for Edge Chart indicators (Tier 1 + Tier 2). Extends the V1 plugin model so built-ins can scale from **6 → 100+** without rework. Mirrors the “platform extension before scale” pattern used for drawings in [drawing-foundation.md](./drawing-foundation.md).

**Related:** [tradingview-reference.md §5](./tradingview-reference.md#58-tradingview-vs-edge--indicators-summary) (TV taxonomy + gap summary), [features.md §7](./features.md#7-indicators) (live status), [prereqs/plugin-api.md](./prereqs/plugin-api.md) (current contracts), [drawing-foundation.md §2](./drawing-foundation.md) (shared styles pipeline gap).

**Status:** Design only — no implementation until reviewed.

---

## Executive summary

**V1 indicator skeleton is solid and TV-aligned on workflow:** registry, UUID instances, pane stack, `compute → outputs → draw`, legend, object tree, settings modal. MACD in `src/lib/chart/indicators/macd.ts` is the reference plugin.

**Three architectural gaps block scaling** (see [tradingview-reference.md §5.8](./tradingview-reference.md#58-tradingview-vs-edge--indicators-summary)):

| Gap | Today | Blocks |
|-----|-------|--------|
| **Lifecycle** | `ChartCell.toggleIndicator` matches `name + pane` | Multiple instances (e.g. two MAs) |
| **Inputs** | `ParamDef` is numeric-only; each plugin hand-resolves | `source`, `enum`, `boolean` inputs |
| **Draw + styles** | Each plugin hand-writes canvas; colors hardcoded in `indicators/draw.ts` | 100 plugins × duplicate draw boilerplate; no per-instance colors |

Secondary: `computeCacheKey(name, params, candles)` in `indicatorCompute.ts` keys only on numeric params and does not dedupe identical configs across instances.

**Recommendation:** Ship **Tier 1** alone (instance lifecycle, typed inputs, instance styles, unified cache on resolved inputs). **Tier 2** adds declarative plot rendering and migrates existing plugins off custom `draw`.

---

## Architecture

### Before (current)

```
IndicatorPicker --toggle(name,pane)--> ChartCell
       |                                    |
       v                                    v
EdgeChart --onRemoveIndicator(name,pane)--> filter by name+pane
       |
ChartCanvas --plugin.draw(ctx, params)-->
       |-- getComputedSeries(name, params)   [ad hoc cache key]
```

### After (Tier 1 + Tier 2)

```
IndicatorPicker --add(name,pane)--> createIndicatorInstance()   [always new id]
ObjectTree / legend / PaneControlBar --remove(id)--> filter by id

Shell (ChartCell / EdgeChart)
    |
    v
resolveIndicatorInputs(plugin, instance) --> ResolvedInputs
    |                                          |
    +--> getComputedSeries(plugin, candles, inputs)   [unified cache key]
    |         |
    +--> legendFromOutputs / valueAt / valueRangeForViewport
    |
    v
drawIndicator(plugin, ctx, vp, theme, data, outputs, resolvedStyles)
    |-- plugin.draw?   (custom oddballs only)
    +-- default: drawFromOutputs(...)                [Tier 2]
```

**Data flow:** shell mutates `IndicatorConfig[]` by **id** → render path resolves inputs once → compute cache shared by config hash → draw uses resolved styles (Tier 1) and declarative plots (Tier 2).

---

## Design decisions (resolved)

### D1 — `params` → `inputs` migration

**Decision: parallel fields; canonical `inputs` on write.**

- Keep `params?: Record<string, number>` on `IndicatorConfig` for backward compatibility with saved layouts.
- Add `inputs?: Record<string, InputValue>` as the canonical persisted field.
- Single helper `resolveIndicatorInputs(plugin, instance): ResolvedInputs` (new `indicatorInputs.ts` or extend `indicatorCompute.ts`):
  - Merge order: schema defaults → `instance.inputs` → coerce legacy `instance.params` for numeric keys only.
- Plugin `compute` signature: **`(candles, inputs: ResolvedInputs)`** — flat resolved record; plugins extract typed fields locally (MACD pattern).
- `createIndicatorInstance` seeds `inputs` from schema defaults; new saves omit `params`.
- `migrateCellIndicators` unchanged for id/pane keys; optional non-destructive promotion `params → inputs` on load.

### D2 — Picker UX

**Decision: Option A — add-only list.**

- Clicking an implemented catalog entry **always adds** a new instance.
- Remove only via Object Tree ×, legend delete (when wired), or sub-pane `PaneControlBar` — all **id-based** (Object Tree already uses id).
- Optional passive affordance: muted dot or count badge when at least one instance of that name exists — **no checkmark toggle-off** (avoids ambiguity with multiple instances).
- Rename `onToggle` → `onAdd`; delete `toggleIndicator` name+pane logic.

### D3 — Style tab timing

**Decision: minimal Style section in Tier 1** (not deferred to 1.5).

- Same modal as Inputs: two sections — **Inputs** + **Style** (color + line width only).
- Visibility per series stays on Object Tree / future legend eye — not in settings modal.
- Aligns with TV “Inputs + style” contract; avoids hardcoded colors through Tier 2 migration.

### D4 — Optional `draw` on plugin interface

**Decision: keep `draw` required on interface; add render-path default wrapper** (non-breaking).

- `canvas.tsx` calls `drawIndicator(...)`, which runs custom `plugin.draw` or falls back to `drawFromOutputs` when plugin has `outputs` and uses declarative path.
- Tier 2: remove redundant custom `draw` from MACD/RSI/BOLL/MA/EMA/VOL as each matches declarative behavior.
- Custom `draw` retained for oddballs (BOLL band fill until `fillBetween` Phase 2, exotic visuals).

---

## Type contracts (sketches)

### Instance config (`contracts.ts`)

```ts
export type LineStyleOverride = {
  color?: string;
  lineWidth?: number;
  visible?: boolean;
};

export type IndicatorConfig = {
  id: string;
  name: string;
  pane: 'main' | 'sub';
  params?: Record<string, number>;              // legacy; read fallback
  inputs?: Record<string, InputValue>;
  styles?: Record<string, LineStyleOverride>;   // keys = output.id
  visible?: boolean;
};
```

`LineStyleOverride` is a subset compatible with future `DrawingStyles` line fields in [drawing-foundation.md](./drawing-foundation.md) — zero-cost shared naming when drawing styles land.

### Plugin API (`plugin-api.ts`)

```ts
export type PriceSource = 'close' | 'open' | 'high' | 'low' | 'hlc3' | 'ohlcv';
export type InputValue = number | string | boolean;
export type ResolvedInputs = Record<string, InputValue>;

export type ParamDef =
  | { kind: 'number'; label: string; default: number; min?: number; max?: number; step?: number }
  | { kind: 'enum'; label: string; default: string; options: { value: string; label: string }[] }
  | { kind: 'boolean'; label: string; default: boolean }
  | { kind: 'source'; label: string; default: PriceSource };

export interface IndicatorPlugin {
  name: string;
  category: IndicatorCategory;
  description: string;
  pane: 'main' | 'sub';
  inputSchema?: Record<string, ParamDef>;       // paramSchema alias, deprecated
  defaultInputs?: Record<string, InputValue>;
  defaultStyles?: Record<string, LineStyleOverride>;
  compute?: (candles: Candle[], inputs: ResolvedInputs) => Record<string, number[]>;
  outputs?: SeriesOutput[];
  draw: (
    ctx: CanvasRenderingContext2D,
    candles: Candle[],
    vp: VisibleRange,
    theme: Theme,
    inputs: ResolvedInputs,
    resolvedStyles?: Map<string, ResolvedSeriesStyle>,
  ) => void;
  // valueAt, legendAt, valueRangeForViewport — same inputs signature
}
```

### Declarative plots (`legend/types.ts`) — Tier 2

```ts
export type PlotKind = 'line' | 'histogram' | 'hline' | 'columns';

export type SeriesOutput = {
  id: string;
  label: string;
  key: string;
  plot?: PlotKind;           // default 'line'
  hlineAt?: number;          // for plot: 'hline' (RSI 30/70)
  lineWidth?: number;
  fillBetween?: string;      // output id — Phase 2 within Tier 2 (BOLL bands)
  color?: SeriesColor;
  tooltip?: string;
  decimals?: number;
};
```

### Style resolution

```ts
function resolveSeriesStyle(
  output: SeriesOutput,
  instance: IndicatorConfig,
  plugin: IndicatorPlugin,
  theme: Theme,
  value: number | null,
): ResolvedSeriesStyle {
  const override = instance.styles?.[output.id];
  const def = plugin.defaultStyles?.[output.id];
  return {
    color:
      override?.color ??
      def?.color ??
      resolveOutputColor(output.color, theme, value) ??
      '#888888',
    lineWidth: override?.lineWidth ?? def?.lineWidth ?? output.lineWidth ?? 1.5,
    visible: override?.visible ?? def?.visible ?? true,
  };
}
```

Resolution order: **`instance.styles[id] ?? plugin.defaultStyles[id] ?? output.color(theme)`**.

### Unified compute cache (`indicatorCompute.ts`)

```ts
function computeCacheKey(
  pluginName: string,
  inputs: ResolvedInputs,
  candles: Candle[],
): string {
  const firstT = candles[0]?.t ?? 0;
  const lastT = candles.at(-1)?.t ?? 0;
  return `${pluginName}|${stableStringify(inputs)}|${candles.length}|${firstT}|${lastT}`;
}
```

- Cache entry per **`(pluginName, inputsHash, candleSignature)`** — not per instance id.
- **Styles excluded** from cache key — they affect draw/legend only, not compute.

### Declarative draw (`indicators/draw.ts`) — Tier 2

```ts
function drawFromOutputs(
  ctx: CanvasRenderingContext2D,
  vp: VisibleRange,
  theme: Theme,
  data: Record<string, number[]>,
  outputs: SeriesOutput[],
  resolvedStyles: Map<string, ResolvedSeriesStyle>,
  candles?: Candle[],
): void;
```

When to override `draw`: band fills before `fillBetween` ships, candle-colored volume bars, non-standard geometry.

---

## Callback shape change (Tier 1)

```ts
// EdgeChart — before
onRemoveIndicator?: (name: string, pane: 'main' | 'sub') => void;

// EdgeChart — after
onRemoveIndicator?: (id: string) => void;
```

`ChartCell` implements `removeIndicator(id)`; sub-pane `PaneControlBar` passes `subInd.id`.

---

## Phased rollout

| Tier | Shippable alone | Scope |
|------|-----------------|-------|
| **Tier 1** | Yes | Id add/remove, typed inputs, instance styles, cache on resolved inputs, settings Inputs + Style |
| **Tier 2** | Requires Tier 1 | `plot` on `SeriesOutput`, `drawFromOutputs`, `drawIndicator` wrapper; migrate plugins |

**Tier 2 plugin migration order:** MACD → RSI → BOLL (keep custom draw for fill until `fillBetween` Phase 2) → MA → EMA → VOL.

**Backward compatibility:** Layouts with `{ id, name, pane, params }` load unchanged; `resolveIndicatorInputs` coerces numeric `params`.

---

## Files touched (implementation reference)

### Tier 1

| Area | Files |
|------|-------|
| Types | `src/lib/chart/plugin-api.ts`, `src/lib/chart/contracts.ts` |
| Resolution + cache | `src/lib/chart/indicatorInputs.ts` (or `indicatorCompute.ts`) |
| Instance factory | `src/lib/chartConfig.ts` |
| Persistence | `src/lib/layoutStorage.ts`, `layoutStorage.test.ts` |
| Shell UX | `ChartCell.tsx`, `IndicatorPicker.tsx`, `IndicatorSettingsModal.tsx`, `EdgeChart.tsx` |
| Render path | `canvas.tsx`, `legend.ts` |
| Docs | `prereqs/plugin-api.md`, `features.md` §7 |

### Tier 2

| Area | Files |
|------|-------|
| Plot types | `src/lib/chart/legend/types.ts` |
| Shared draw | `src/lib/chart/indicators/draw.ts`, `draw.test.ts` |
| Wrapper | `canvas.tsx` |
| Plugins | `macd.ts`, `rsi.ts`, `boll.ts`, `ma.ts`, `ema.ts`, `vol.ts` |
| Compute/legend | `indicatorCompute.ts`, `indicatorCompute.test.ts` |

---

## Non-goals

- Pine Script / user scripting
- `IndicatorContext`, MTF, interval visibility
- Templates, favorites, alerts
- Drawings on indicator panes ([drawing-foundation.md](./drawing-foundation.md) gap 4)
- Tier 3 platform features

---

## Acceptance criteria + test oracles

### Tier 1

| Oracle | Verification |
|--------|--------------|
| Two MA instances coexist | Add MA(20) + MA(50); both render; reload layout — both persist |
| Id-based remove | Remove one MA via Object Tree; other remains |
| Enum/source input | Stub plugin with `source` input; changing source alters compute (unit test) |
| Style override persists | Change MACD signal color; `layoutStorage` round-trip retains `styles` |
| Legacy layouts load | Fixture `{ id, name, pane, params }` only — no crash |
| Cache on inputs | Different inputs → miss; two instances same inputs → hit |

**Automated:** `npm test -- --testPathPattern="indicator|ChartCell|layoutStorage|IndicatorPicker"`

**Tests to update:** `ChartCell.paneActions.test.tsx` (remove by id); `layoutStorage.test.ts` (`inputs`/`styles`); new `indicatorInputs.test.ts`.

### Tier 2

| Oracle | Verification |
|--------|--------------|
| MACD visually identical | Declarative path matches pre-migration (draw primitive tests) |
| RSI hlines | `plot: 'hline'` at 30/70 without custom draw |
| BOLL | Band fill unchanged (custom draw or Phase 2 `fillBetween`) |
| Cache dedupe | Same plugin + resolved inputs → single `compute` call |
| Custom draw escape hatch | Plugin with override `draw` still renders |

**Manual:** Add two MAs, different periods/colors, reload; MACD/RSI unchanged after migration.

---

## Risks

- Picker UX change breaks `ChartCell.*.test.tsx` expecting name+pane toggle — update in Tier 1 PR.
- Style tab scope creep — enforce color + lineWidth only.
- BOLL `fillBetween` — Phase 2 within Tier 2; ship with retained custom `draw` for fill if needed.

---

## Source files (current)

| Area | Path |
|------|------|
| Plugin API | `src/lib/chart/plugin-api.ts` |
| Instance config | `src/lib/chart/contracts.ts` |
| Compute + cache | `src/lib/chart/indicatorCompute.ts` |
| Legend types | `src/lib/chart/legend/types.ts` |
| Draw primitives | `src/lib/chart/indicators/draw.ts` |
| Reference plugin | `src/lib/chart/indicators/macd.ts` |
| Picker / settings | `IndicatorPicker.tsx`, `IndicatorSettingsModal.tsx` |
| Lifecycle bug site | `ChartCell.tsx` (`toggleIndicator`) |
