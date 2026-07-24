/**
 * Golden script fixtures for Phase 0 compiler/runtime/async-bridge tests.
 */

/** Reserved fixture IDs for upcoming Script depth phases — not yet in ScriptFixtureId. */
export const RESERVED_SCRIPT_DEPTH_FIXTURE_SLOTS = {
  phase1: [] as const,
  phase2: [] as const,
  phase3: [] as const,
  phase4: [] as const,
  phase5: [] as const,
} as const;

export type ScriptFixtureId =
  | 'line-midpoint'
  | 'histogram-macd-style'
  | 'hline-rsi-style'
  | 'band-boll-style'
  | 'ta-wma'
  | 'ta-macd-compose'
  | 'ta-stoch'
  | 'ta-cci'
  | 'ta-cross-glue'
  | 'plot-marker-signal'
  | 'plot-bgcolor-band'
  | 'plot-style-stepline'
  | 'request-htf-sma'
  | 'request-dual-symbol'
  | 'alert-condition-cross'
  | 'object-box-label'
  | 'syntax-error'
  | 'type-error'
  | 'infinite-loop'
  | 'allocation-pressure'
  | 'import-rejected'
  | 'dynamic-import-rejected'
  | 'draw-rejected'
  | 'async-rejected'
  | 'malformed-output';

export type ScriptFixture = {
  id: ScriptFixtureId;
  description: string;
  source: string;
  /** Expected to compile successfully. */
  expectCompileOk: boolean;
  /** Expected to execute successfully when compile ok. */
  expectExecuteOk?: boolean;
  defaultInputs?: Record<string, number | string | boolean>;
};

export const SCRIPT_FIXTURES: Record<ScriptFixtureId, ScriptFixture> = {
  'line-midpoint': {
    id: 'line-midpoint',
    description: 'Simple line overlay — SMA of high-low midpoint',
    expectCompileOk: true,
    expectExecuteOk: true,
    defaultInputs: { period: 20 },
    source: `
function edgeScript() {
  return {
    name: "Midpoint",
    pane: "main",
    inputs: { period: { kind: "number", label: "Period", default: 20, min: 1 } },
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
`,
  },
  'histogram-macd-style': {
    id: 'histogram-macd-style',
    description: 'Histogram sub-pane with zero hline',
    expectCompileOk: true,
    expectExecuteOk: true,
    defaultInputs: { fast: 12, slow: 26, signal: 9 },
    source: `
function edgeScript() {
  return {
    name: "MACD Style",
    pane: "sub",
    inputs: {
      fast: { kind: "number", label: "Fast", default: 12, min: 1 },
      slow: { kind: "number", label: "Slow", default: 26, min: 1 },
      signal: { kind: "number", label: "Signal", default: 9, min: 1 },
    },
    calculate(candles, inputs, ta) {
      const closes = candles.map((c) => c.c);
      const macd = ta.ema(closes, inputs.fast).map((v, i) => {
        const slow = ta.ema(closes, inputs.slow)[i];
        return v != null && slow != null ? v - slow : null;
      });
      const signal = ta.ema(macd.map((v) => v ?? 0), inputs.signal);
      const hist = macd.map((v, i) => (v != null && signal[i] != null ? v - signal[i] : null));
      return { hist, zero: candles.map(() => 0) };
    },
    plots: {
      hist: { kind: "histogram", title: "Histogram", color: "#60a5fa" },
      zero: { kind: "hline", title: "Zero", color: "#64748b", hlineAt: 0 },
    },
  };
}
edgeScript();
`,
  },
  'hline-rsi-style': {
    id: 'hline-rsi-style',
    description: 'Horizontal guide levels without unused data series',
    expectCompileOk: true,
    expectExecuteOk: true,
    defaultInputs: { period: 14 },
    source: `
function edgeScript() {
  return {
    name: "RSI Style",
    pane: "sub",
    inputs: { period: { kind: "number", label: "Period", default: 14, min: 1 } },
    calculate(candles, inputs, ta) {
      const closes = candles.map((c) => c.c);
      return {
        rsi: ta.rsi(closes, inputs.period),
        upper: candles.map(() => 70),
        lower: candles.map(() => 30),
      };
    },
    plots: {
      rsi: { kind: "line", title: "RSI", color: "#a78bfa" },
      upper: { kind: "hline", title: "Overbought", color: "#64748b", hlineAt: 70 },
      lower: { kind: "hline", title: "Oversold", color: "#64748b", hlineAt: 30 },
    },
  };
}
edgeScript();
`,
  },
  'band-boll-style': {
    id: 'band-boll-style',
    description: 'Band fill between upper and lower series',
    expectCompileOk: true,
    expectExecuteOk: true,
    defaultInputs: { period: 20, mult: 2 },
    source: `
function edgeScript() {
  return {
    name: "BOLL Style",
    pane: "main",
    inputs: {
      period: { kind: "number", label: "Period", default: 20, min: 1 },
      mult: { kind: "number", label: "Mult", default: 2, min: 0.1 },
    },
    calculate(candles, inputs, ta) {
      const closes = candles.map((c) => c.c);
      const mid = ta.sma(closes, inputs.period);
      const std = ta.stddev(closes, inputs.period, mid);
      const upper = mid.map((m, i) => (m != null && std[i] != null ? m + inputs.mult * std[i] : null));
      const lower = mid.map((m, i) => (m != null && std[i] != null ? m - inputs.mult * std[i] : null));
      return { upper, lower, mid };
    },
    plots: {
      upper: { kind: "line", title: "Upper", color: "#94a3b8" },
      lower: { kind: "line", title: "Lower", color: "#94a3b8" },
      mid: { kind: "band", title: "Band", fillBetween: "lower", fillColor: "rgba(148,163,184,0.15)" },
    },
  };
}
edgeScript();
`,
  },
  'ta-wma': {
    id: 'ta-wma',
    description: 'WMA overlay on close',
    expectCompileOk: true,
    expectExecuteOk: true,
    defaultInputs: { period: 10 },
    source: `
function edgeScript() {
  return {
    name: "WMA",
    pane: "main",
    inputs: { period: { kind: "number", label: "Period", default: 10, min: 1 } },
    calculate(candles, inputs, ta) {
      const closes = candles.map((c) => c.c);
      return { wma: ta.wma(closes, inputs.period) };
    },
    plots: {
      wma: { kind: "line", title: "WMA", color: "#fbbf24" },
    },
  };
}
edgeScript();
`,
  },
  'ta-macd-compose': {
    id: 'ta-macd-compose',
    description: 'MACD composite helper — histogram sub-pane',
    expectCompileOk: true,
    expectExecuteOk: true,
    defaultInputs: { fast: 12, slow: 26, signal: 9 },
    source: `
function edgeScript() {
  return {
    name: "MACD Compose",
    pane: "sub",
    inputs: {
      fast: { kind: "number", label: "Fast", default: 12, min: 1 },
      slow: { kind: "number", label: "Slow", default: 26, min: 1 },
      signal: { kind: "number", label: "Signal", default: 9, min: 1 },
    },
    calculate(candles, inputs, ta) {
      const closes = candles.map((c) => c.c);
      const { histogram } = ta.macd(closes, inputs.fast, inputs.slow, inputs.signal);
      return { hist: histogram, zero: candles.map(() => 0) };
    },
    plots: {
      hist: { kind: "histogram", title: "Histogram", color: "#60a5fa" },
      zero: { kind: "hline", title: "Zero", color: "#64748b", hlineAt: 0 },
    },
  };
}
edgeScript();
`,
  },
  'ta-stoch': {
    id: 'ta-stoch',
    description: 'Stochastic %K/%D sub-pane',
    expectCompileOk: true,
    expectExecuteOk: true,
    defaultInputs: { kPeriod: 9, dPeriod: 3 },
    source: `
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
      return {
        k,
        d,
        upper: candles.map(() => 80),
        lower: candles.map(() => 20),
      };
    },
    plots: {
      k: { kind: "line", title: "%K", color: "#a78bfa" },
      d: { kind: "line", title: "%D", color: "#94a3b8" },
      upper: { kind: "hline", title: "Overbought", color: "#64748b", hlineAt: 80 },
      lower: { kind: "hline", title: "Oversold", color: "#64748b", hlineAt: 20 },
    },
  };
}
edgeScript();
`,
  },
  'ta-cci': {
    id: 'ta-cci',
    description: 'CCI oscillator sub-pane',
    expectCompileOk: true,
    expectExecuteOk: true,
    defaultInputs: { period: 20 },
    source: `
function edgeScript() {
  return {
    name: "CCI",
    pane: "sub",
    inputs: { period: { kind: "number", label: "Period", default: 20, min: 1 } },
    calculate(candles, inputs, ta) {
      return {
        cci: ta.cci(candles, inputs.period),
        upper: candles.map(() => 100),
        lower: candles.map(() => -100),
        zero: candles.map(() => 0),
      };
    },
    plots: {
      cci: { kind: "line", title: "CCI", color: "#22d3ee" },
      upper: { kind: "hline", title: "+100", color: "#64748b", hlineAt: 100 },
      lower: { kind: "hline", title: "-100", color: "#64748b", hlineAt: -100 },
      zero: { kind: "hline", title: "Zero", color: "#475569", hlineAt: 0 },
    },
  };
}
edgeScript();
`,
  },
  'ta-cross-glue': {
    id: 'ta-cross-glue',
    description: 'Crossover glue — EMA cross signal histogram',
    expectCompileOk: true,
    expectExecuteOk: true,
    defaultInputs: { fast: 9, slow: 21 },
    source: `
function edgeScript() {
  return {
    name: "EMA Cross",
    pane: "sub",
    inputs: {
      fast: { kind: "number", label: "Fast", default: 9, min: 1 },
      slow: { kind: "number", label: "Slow", default: 21, min: 1 },
    },
    calculate(candles, inputs, ta) {
      const closes = candles.map((c) => c.c);
      const fast = ta.ema(closes, inputs.fast);
      const slow = ta.ema(closes, inputs.slow);
      const crossUp = ta.crossover(fast, slow);
      const crossDn = ta.crossunder(fast, slow);
      const signal = crossUp.map((v, i) => {
        if (v === 1) return 1;
        if (crossDn[i] === 1) return -1;
        return 0;
      });
      return { signal, zero: candles.map(() => 0) };
    },
    plots: {
      signal: { kind: "histogram", title: "Cross", color: "#4ade80" },
      zero: { kind: "hline", title: "Zero", color: "#64748b", hlineAt: 0 },
    },
  };
}
edgeScript();
`,
  },
  'plot-marker-signal': {
    id: 'plot-marker-signal',
    description: 'Crossover signal markers on stochastic sub-pane',
    expectCompileOk: true,
    expectExecuteOk: true,
    defaultInputs: { kPeriod: 9, dPeriod: 3 },
    source: `
function edgeScript() {
  return {
    name: "Stoch Signals",
    pane: "sub",
    inputs: {
      kPeriod: { kind: "number", label: "%K", default: 9, min: 1 },
      dPeriod: { kind: "number", label: "%D", default: 3, min: 1 },
    },
    calculate(candles, inputs, ta) {
      const { k, d } = ta.stoch(candles, inputs.kPeriod, inputs.dPeriod);
      const crossUp = ta.crossover(k, d);
      const crossDn = ta.crossunder(k, d);
      const buy = crossUp.map((v, i) => (v === 1 ? k[i] : null));
      const sell = crossDn.map((v, i) => (v === 1 ? k[i] : null));
      return {
        k,
        d,
        buy,
        sell,
        upper: candles.map(() => 80),
        lower: candles.map(() => 20),
      };
    },
    plots: {
      k: { kind: "line", title: "%K", color: "#a78bfa" },
      d: { kind: "line", title: "%D", color: "#94a3b8" },
      buy: {
        kind: "marker",
        title: "Buy",
        color: "#22c55e",
        shape: "triangleUp",
        location: "absolute",
        size: 10,
      },
      sell: {
        kind: "marker",
        title: "Sell",
        color: "#ef4444",
        shape: "triangleDown",
        location: "absolute",
        size: 10,
      },
      upper: { kind: "hline", title: "Overbought", color: "#64748b", hlineAt: 80 },
      lower: { kind: "hline", title: "Oversold", color: "#64748b", hlineAt: 20 },
    },
  };
}
edgeScript();
`,
  },
  'plot-bgcolor-band': {
    id: 'plot-bgcolor-band',
    description: 'Condition background tint on RSI sub-pane',
    expectCompileOk: true,
    expectExecuteOk: true,
    defaultInputs: { period: 14 },
    source: `
function edgeScript() {
  return {
    name: "RSI Tint",
    pane: "sub",
    inputs: { period: { kind: "number", label: "Period", default: 14, min: 1 } },
    calculate(candles, inputs, ta) {
      const closes = candles.map((c) => c.c);
      const rsi = ta.rsi(closes, inputs.period);
      const overbought = rsi.map((v) => (v != null && v >= 70 ? 1 : null));
      const oversold = rsi.map((v) => (v != null && v <= 30 ? 1 : null));
      return {
        rsi,
        overbought,
        oversold,
        upper: candles.map(() => 70),
        lower: candles.map(() => 30),
      };
    },
    plots: {
      rsi: { kind: "line", title: "RSI", color: "#a78bfa" },
      overbought: {
        kind: "bgcolor",
        title: "Overbought",
        color: "rgba(239,68,68,0.18)",
        opacity: 0.18,
      },
      oversold: {
        kind: "bgcolor",
        title: "Oversold",
        color: "rgba(34,197,94,0.18)",
        opacity: 0.18,
      },
      upper: { kind: "hline", title: "Overbought", color: "#64748b", hlineAt: 70 },
      lower: { kind: "hline", title: "Oversold", color: "#64748b", hlineAt: 30 },
    },
  };
}
edgeScript();
`,
  },
  'plot-style-stepline': {
    id: 'plot-style-stepline',
    description: 'Stepline style on WMA overlay',
    expectCompileOk: true,
    expectExecuteOk: true,
    defaultInputs: { period: 10 },
    source: `
function edgeScript() {
  return {
    name: "Stepline WMA",
    pane: "main",
    inputs: { period: { kind: "number", label: "Period", default: 10, min: 1 } },
    calculate(candles, inputs, ta) {
      const closes = candles.map((c) => c.c);
      return { wma: ta.wma(closes, inputs.period) };
    },
    plots: {
      wma: { kind: "line", title: "WMA", color: "#fbbf24", style: "stepline", lineWidth: 2 },
    },
  };
}
edgeScript();
`,
  },
  'request-htf-sma': {
    id: 'request-htf-sma',
    description: 'HTF SMA via request.series({ interval: "1d" })',
    expectCompileOk: true,
    expectExecuteOk: true,
    defaultInputs: { period: 20 },
    source: `
function edgeScript() {
  return {
    name: "HTF SMA",
    pane: "sub",
    inputs: { period: { kind: "number", label: "Period", default: 20, min: 1 } },
    calculate(candles, inputs, ta, request) {
      const htf = request.series({ interval: "1d" });
      const closes = ta.source(htf, "close");
      return { htfSma: ta.sma(closes, inputs.period) };
    },
    plots: {
      htfSma: { kind: "line", title: "Daily SMA", color: "#38bdf8" },
    },
  };
}
edgeScript();
`,
  },
  'request-dual-symbol': {
    id: 'request-dual-symbol',
    description: 'Dual-symbol spread via request.series({ symbol, interval })',
    expectCompileOk: true,
    expectExecuteOk: true,
    source: `
function edgeScript() {
  return {
    name: "Dual Symbol Spread",
    pane: "sub",
    inputs: {},
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
    },
    plots: {
      spread: { kind: "line", title: "Spread vs SPY", color: "#f97316" },
    },
  };
}
edgeScript();
`,
  },
  'alert-condition-cross': {
    id: 'alert-condition-cross',
    description: 'EMA cross alert condition — crossover series + manifest alerts',
    expectCompileOk: true,
    expectExecuteOk: true,
    defaultInputs: { fast: 9, slow: 21 },
    source: `
function edgeScript() {
  return {
    name: "EMA Cross Alert",
    pane: "sub",
    inputs: {
      fast: { kind: "number", label: "Fast", default: 9, min: 1 },
      slow: { kind: "number", label: "Slow", default: 21, min: 1 },
    },
    calculate(candles, inputs, ta) {
      const closes = candles.map((c) => c.c);
      const fast = ta.ema(closes, inputs.fast);
      const slow = ta.ema(closes, inputs.slow);
      const crossUp = ta.crossover(fast, slow);
      return {
        crossUp,
        fast,
        slow,
      };
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
edgeScript();
`,
  },
  'object-box-label': {
    id: 'object-box-label',
    description: 'Declarative box, label, and level objects on main pane',
    expectCompileOk: true,
    expectExecuteOk: true,
    defaultInputs: { lookback: 20 },
    source: `
function edgeScript() {
  return {
    name: "Object Zone Demo",
    pane: "main",
    inputs: {
      lookback: { kind: "number", label: "Lookback", default: 20, min: 5 },
    },
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
      const mid = ta.sma(candles.map((c) => c.c), inputs.lookback);
      const lastMid = mid[n - 1];
      const levelPrice = lastMid != null ? lastMid : candles[n - 1].c;
      return {
        mid,
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
            price: levelPrice,
            leftBar: start,
            rightBar: n - 1,
            color: "#f59e0b",
          },
        },
      };
    },
    plots: {
      mid: { kind: "line", title: "Mid SMA", color: "#60a5fa" },
    },
  };
}
edgeScript();
`,
  },
  'syntax-error': {
    id: 'syntax-error',
    description: 'Invalid TypeScript syntax',
    expectCompileOk: false,
    source: `
function edgeScript( {
  return { name: "Broken" };
}
edgeScript();
`,
  },
  'type-error': {
    id: 'type-error',
    description: 'TypeScript type error surfaces as compile diagnostic',
    expectCompileOk: false,
    source: `
function edgeScript(): { name: string } {
  return { name: 123 };
}
edgeScript();
`,
  },
  'infinite-loop': {
    id: 'infinite-loop',
    description: 'Runaway loop terminated by execute budget',
    expectCompileOk: true,
    expectExecuteOk: false,
    source: `
function edgeScript() {
  return {
    name: "Loop",
    pane: "sub",
    inputs: {},
    calculate() {
      while (true) {}
      return { x: [] };
    },
    plots: { x: { kind: "line", title: "X", color: "#fff" } },
  };
}
edgeScript();
`,
  },
  'allocation-pressure': {
    id: 'allocation-pressure',
    description: 'Large allocation rejected by output validation',
    expectCompileOk: true,
    expectExecuteOk: false,
    source: `
function edgeScript() {
  return {
    name: "Alloc",
    pane: "sub",
    inputs: {},
    calculate(candles) {
      return { x: new Array(candles.length * 1000).fill(1) };
    },
    plots: { x: { kind: "line", title: "X", color: "#fff" } },
  };
}
edgeScript();
`,
  },
  'import-rejected': {
    id: 'import-rejected',
    description: 'Import statement rejected at compile gate',
    expectCompileOk: false,
    source: [
      `${'im'}${'port'} fs from "fs";`,
      'function edgeScript() {',
      '  return { name: "Bad", pane: "main", inputs: {}, calculate: () => ({}), plots: { x: { kind: "line", title: "X", color: "#fff" } } };',
      '}',
      'edgeScript();',
    ].join('\n'),
  },
  'dynamic-import-rejected': {
    id: 'dynamic-import-rejected',
    description: 'Dynamic import rejected at compile gate',
    expectCompileOk: false,
    source: [
      'function edgeScript() {',
      `  ${'im'}${'port'}("fs");`,
      '  return { name: "Bad", pane: "main", inputs: {}, calculate: () => ({}), plots: { x: { kind: "line", title: "X", color: "#fff" } } };',
      '}',
      'edgeScript();',
    ].join('\n'),
  },
  'draw-rejected': {
    id: 'draw-rejected',
    description: 'Custom draw access rejected at compile gate',
    expectCompileOk: false,
    source: `
function edgeScript() {
  return {
    name: "Draw",
    pane: "main",
    inputs: {},
    calculate(candles, inputs, ta) {
      draw(candles);
      return { x: candles.map(() => 1) };
    },
    plots: { x: { kind: "line", title: "X", color: "#fff" } },
  };
}
edgeScript();
`,
  },
  'async-rejected': {
    id: 'async-rejected',
    description: 'Async function rejected at compile gate',
    expectCompileOk: false,
    source: `
async function edgeScript() {
  return { name: "Async", pane: "main", inputs: {}, calculate: () => ({}), plots: { x: { kind: "line", title: "X", color: "#fff" } } };
}
edgeScript();
`,
  },
  'malformed-output': {
    id: 'malformed-output',
    description: 'Non-array series rejected at validation',
    expectCompileOk: true,
    expectExecuteOk: false,
    source: `
function edgeScript() {
  return {
    name: "Malformed",
    pane: "sub",
    inputs: {},
    calculate(candles) {
      return { x: 42 };
    },
    plots: { x: { kind: "line", title: "X", color: "#fff" } },
  };
}
edgeScript();
`,
  },
};

export function getScriptFixture(id: ScriptFixtureId): ScriptFixture {
  return SCRIPT_FIXTURES[id];
}

export function makeSyntheticCandles(count: number, seed = 100): import('./contracts').Candle[] {
  const candles: import('./contracts').Candle[] = [];
  let price = seed;
  for (let i = 0; i < count; i += 1) {
    const o = price;
    const c = price + Math.sin(i / 7) * 2;
    const h = Math.max(o, c) + 1;
    const l = Math.min(o, c) - 1;
    candles.push({ t: 1_700_000_000_000 + i * 60_000, o, h, l, c, v: 1000 + i });
    price = c;
  }
  return candles;
}
