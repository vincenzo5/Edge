# User Script Examples

Private TypeScript chart indicators use the shipped `edgeScript()` authoring shape (not Pine Script).

**Requirements:** no imports, no async, no browser globals. Scripts compile inside Edge and execute in a guest WASM VM with a restricted `ta` helper object.

**Depth track:** Phase 0 extension rules and reserved example slots are documented in [script-depth-roadmap.md](../roadmaps/script-depth-roadmap.md). Upcoming depth examples (TA expansion, markers, MTF) use reserved fixture IDs — not yet runnable until their phase ships.

## Minimal line (midpoint SMA)

```typescript
function edgeScript() {
  return {
    name: "High-Low Midpoint",
    pane: "main",
    inputs: {
      period: { kind: "number", label: "Period", default: 20, min: 1 },
    },
    calculate(candles, inputs, ta) {
      const mid = candles.map((c) => (c.h + c.l) / 2);
      return { midpoint: ta.sma(mid, inputs.period) };
    },
    plots: {
      midpoint: { kind: "line", title: "Midpoint", color: "#4ade80" },
    },
  };
}
edgeScript();
```

## Price source + enum + boolean inputs

```typescript
function edgeScript() {
  return {
    name: "Source SMA",
    pane: "main",
    inputs: {
      src: { kind: "source", label: "Source", default: "close" },
      period: { kind: "number", label: "Period", default: 14, min: 1 },
      smooth: { kind: "boolean", label: "Use EMA", default: false },
      mode: {
        kind: "enum",
        label: "Mode",
        default: "standard",
        options: [
          { value: "standard", label: "Standard" },
          { value: "fast", label: "Fast" },
        ],
      },
    },
    calculate(candles, inputs, ta) {
      const series = ta.source(candles, inputs.src);
      if (inputs.smooth) return { line: ta.ema(series, inputs.period) };
      return { line: ta.sma(series, inputs.period) };
    },
    plots: {
      line: { kind: "line", title: "Line", color: "#60a5fa" },
    },
  };
}
edgeScript();
```

## Conditional histogram colors

```typescript
function edgeScript() {
  return {
    name: "Signed Momentum",
    pane: "sub",
    inputs: {
      period: { kind: "number", label: "ROC Period", default: 12, min: 1 },
    },
    calculate(candles, inputs, ta) {
      const closes = candles.map((c) => c.c);
      return { roc: ta.roc(closes, inputs.period) };
    },
    plots: {
      roc: {
        kind: "histogram",
        title: "ROC",
        color: "#888888",
        colorRules: [
          { when: "positive", color: "#22c55e" },
          { when: "negative", color: "#ef4444" },
        ],
      },
    },
  };
}
edgeScript();
```

## TA helpers (SDK v2 — `edge-indicator-sdk-2`)

Available on the `ta` object passed to `calculate()`:

| Helper | Description |
|--------|-------------|
| `sma`, `ema`, `wma`, `vwma` | Moving averages (simple, exponential, weighted, volume-weighted) |
| `stddev`, `rsi`, `roc` | Volatility / momentum |
| `macd(closes, fast?, slow?, signal?)` | Returns `{ macd, signal, histogram }` |
| `stoch(candles, kPeriod?, dPeriod?)` | Returns `{ k, d }` |
| `bollinger(closes, period?, mult?)` | Returns `{ middle, upper, lower }` |
| `cci(candles, period?)`, `obv(candles)` | Oscillators / volume |
| `dmi(candles, diPeriod?, adxSmoothing?)` | Returns `{ plusDi, minusDi, adx }` |
| `crossover(a, b)`, `crossunder(a, b)` | Cross signals (`1` on cross bar, `0` otherwise) |
| `change(series, length?)`, `percentChange(series, length?)` | Bar delta helpers |
| `source(candles, priceSource)` | Map candles to a price series |
| `highest`, `lowest` | Rolling extrema |
| `atr(candles, period)` | Average true range |

### Stochastic example (sub-pane)

```typescript
function edgeScript() {
  return {
    name: "Stochastic",
    pane: "sub",
    inputs: {
      kPeriod: { kind: "number", label: "%K", default: 9, min: 1 },
      dPeriod: { kind: "number", label: "%D", default: 3, min: 1 },
    },
    calculate(candles, inputs, ta) {
      const { k, d } = ta.stoch(candles, inputs.kPeriod, inputs.dPeriod);
      return { k, d };
    },
    plots: {
      k: { kind: "line", title: "%K", color: "#a78bfa" },
      d: { kind: "line", title: "%D", color: "#94a3b8" },
    },
  };
}
edgeScript();
```

## Richer plot visuals (SDK v3 — `edge-indicator-sdk-3`)

### Marker plots (`plot-marker-signal`)

Use `kind: "marker"` with `shape` + `location`. Series values are numeric gates: `null`/non-finite = off; finite/truthy = on. `absolute` uses the series value as the Y coordinate; `aboveBar` / `belowBar` anchor to candle high/low on the main pane.

```typescript
buy: {
  kind: "marker",
  title: "Buy",
  color: "#22c55e",
  shape: "triangleUp",
  location: "absolute",
  size: 10,
}
```

### Background tints (`plot-bgcolor-band`)

Use `kind: "bgcolor"` with literal `color` and optional `opacity` (0–0.85). Truthy series values tint contiguous bar spans (budget: 256 segments after compaction).

```typescript
overbought: {
  kind: "bgcolor",
  title: "Overbought",
  color: "rgba(239,68,68,0.18)",
  opacity: 0.18,
}
```

### Series styles (`plot-style-stepline`)

Add `style` on `line` or `histogram` plots: `line` (default), `stepline`, `circles`, `crosses`, `area`, `columns`.

```typescript
wma: { kind: "line", title: "WMA", color: "#fbbf24", style: "stepline", lineWidth: 2 }
```

### Bar recolor (`barcolor`, main pane only)

Use `kind: "barcolor"` on `pane: "main"` scripts. Truthy series values recolor candle bodies/wicks via `color` / `colorRules`.

## Multi-timeframe / multi-symbol requests (SDK v4 — `edge-indicator-sdk-4`)

Scripts may accept an optional 4th argument `request` in `calculate(candles, inputs, ta, request)`. Use `request.series({ symbol?, interval? })` to read aligned secondary OHLC arrays (same length as primary). Omitted fields default to the chart symbol/interval. The host fetches and aligns series — guest code never calls `fetch`.

Alignment rule: for each primary bar, use the last secondary bar with `secondary.t <= primary.t` (no lookahead). Gaps before the first secondary bar yield null-safe OHLC via `ta.source`.

Budgets: max **2** distinct secondary series per script run; max **10,000** bars per secondary fetch; **5s** fetch timeout.

### HTF SMA (`request-htf-sma`)

```typescript
calculate(candles, inputs, ta, request) {
  const htf = request.series({ interval: "1d" });
  const closes = ta.source(htf, "close");
  return { htfSma: ta.sma(closes, inputs.period) };
}
```

### Dual-symbol spread (`request-dual-symbol`)

```typescript
calculate(candles, inputs, ta, request) {
  const ref = request.series({ symbol: "SPY", interval: "1d" });
  const primary = ta.source(candles, "close");
  const secondary = ta.source(ref, "close");
  const spread = primary.map((value, index) => {
    const other = secondary[index];
    if (value == null || other == null) return null;
    return value - other;
  });
  return { spread };
}
```

## Script alert conditions (SDK v5 — `edge-indicator-sdk-5`)

Declare named boolean series in the manifest `alerts` map. Each entry references a `seriesId` key returned from `calculate`. Truthy values use the same rules as marker/bgcolor signals (`isTruthyScriptSignal`).

```typescript
function edgeScript() {
  return {
    name: "EMA Cross Alert",
    pane: "sub",
    inputs: { fast: { kind: "number", label: "Fast", default: 9, min: 1 }, slow: { kind: "number", label: "Slow", default: 21, min: 1 } },
    calculate(candles, inputs, ta) {
      const closes = candles.map((c) => c.c);
      const fast = ta.ema(closes, inputs.fast);
      const slow = ta.ema(closes, inputs.slow);
      return { crossUp: ta.crossover(fast, slow), fast, slow };
    },
    plots: {
      fast: { kind: "line", title: "Fast EMA", color: "#4ade80" },
      slow: { kind: "line", title: "Slow EMA", color: "#60a5fa" },
    },
    alerts: {
      crossUp: { title: "Fast crosses above slow", seriesId: "crossUp" },
    },
  };
}
```

Arm alerts from script settings (**Create alert…**) or the Alerts tile. While the chart is open, the client posts snapshots to the shared alerts engine; cron fires in-app notifications when the condition turns true. Script alerts may miss when the chart tab is closed (v1).

## Script-managed objects (box, label, level)

Main-pane scripts can return an `objects` map from `calculate()` — declarative boxes, labels, and time-bounded levels. Objects render on the price pane only; they are not user drawings (no undo/hit-test). Full replace each execution.

```typescript
function edgeScript() {
  return {
    name: "Zone Objects",
    pane: "main",
    inputs: { lookback: { kind: "number", label: "Lookback", default: 20, min: 5 } },
    calculate(candles, inputs, ta) {
      const n = candles.length;
      const start = n > inputs.lookback ? n - inputs.lookback : 0;
      let top = candles[start].h;
      let bottom = candles[start].l;
      for (let i = start + 1; i < n; i += 1) {
        const c = candles[i];
        if (c.h > top) top = c.h;
        if (c.l < bottom) bottom = c.l;
      }
      return {
        mid: ta.sma(candles.map((c) => c.c), inputs.lookback),
        objects: {
          zone: {
            kind: "box",
            leftBar: start,
            rightBar: n - 1,
            top,
            bottom,
            color: "rgba(34,197,94,0.15)",
            borderColor: "#22c55e",
          },
          note: {
            kind: "label",
            bar: n - 1,
            price: top,
            text: "Zone",
            color: "#e2e8f0",
            backgroundColor: "rgba(15,23,42,0.75)",
          },
          lvl: {
            kind: "level",
            price: candles[n - 1].c,
            leftBar: start,
            rightBar: n - 1,
            color: "#f59e0b",
          },
        },
      };
    },
    plots: { mid: { kind: "line", title: "Mid SMA", color: "#60a5fa" } },
  };
}
```

## Upcoming depth examples (reserved)

All Script depth golden fixtures are runnable in tests and dev fixture injection (`?scriptFixture=all`), including `object-box-label`, `alert-condition-cross`, `request-htf-sma`, and `request-dual-symbol`.

## Error states

Compile, runtime, timeout, limit, missing-revision, and invalid-output errors surface in the editor diagnostics and chart legend via typed `errorCode` values. Last-valid results stay visible as **Stale** when a rerun fails.
