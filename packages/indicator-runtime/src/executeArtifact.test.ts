import { describe, expect, it } from 'vitest';
import { compileScript } from './compileScript.js';
import {
  executeArtifact,
  probeGuestCapabilities,
  recoverFromWorkerCrash,
} from './executeArtifact.js';
import { rejectStalePipelineResponse, ScriptSession } from './scriptSession.js';
import { SCRIPT_FIXTURES, makeSyntheticCandles } from '@edge/chart-core';
import { DEFAULT_SCRIPT_RUNTIME_BUDGETS } from '@edge/chart-core';

const candles = makeSyntheticCandles(120);

describe('executeArtifact', () => {
  it('executes line midpoint fixture', async () => {
    const fixture = SCRIPT_FIXTURES['line-midpoint'];
    const compiled = compileScript(fixture.source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    expect(compiled.ok).toBe(true);
    const result = await executeArtifact({
      artifact: compiled.artifact!,
      manifest: compiled.manifest!,
      candles,
      inputs: fixture.defaultInputs ?? {},
      revision: compiled.artifactHash!,
      sessionKey: 'test-session-1',
    });
    expect(result.status).toBe('ready');
    expect(result.series.midpoint?.length).toBe(candles.length);
  });

  it('executes histogram + hline fixture', async () => {
    const fixture = SCRIPT_FIXTURES['histogram-macd-style'];
    const compiled = compileScript(fixture.source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    const result = await executeArtifact({
      artifact: compiled.artifact!,
      manifest: compiled.manifest!,
      candles,
      inputs: fixture.defaultInputs ?? {},
      revision: compiled.artifactHash!,
      sessionKey: 'test-session-2',
    });
    expect(result.status).toBe('ready');
    expect(result.series.hist?.length).toBe(candles.length);
  });

  it('executes band fixture', async () => {
    const fixture = SCRIPT_FIXTURES['band-boll-style'];
    const compiled = compileScript(fixture.source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    const result = await executeArtifact({
      artifact: compiled.artifact!,
      manifest: compiled.manifest!,
      candles,
      inputs: fixture.defaultInputs ?? {},
      revision: compiled.artifactHash!,
      sessionKey: 'test-session-3',
    });
    expect(result.status).toBe('ready');
    expect(result.series.upper?.length).toBe(candles.length);
    expect(result.series.lower?.length).toBe(candles.length);
  });

  it.each([
    ['ta-wma', 'wma'],
    ['ta-macd-compose', 'hist'],
    ['ta-stoch', 'k'],
    ['ta-cci', 'cci'],
    ['ta-cross-glue', 'signal'],
  ] as const)('executes Phase 1 fixture %s', async (fixtureId, seriesKey) => {
    const fixture = SCRIPT_FIXTURES[fixtureId];
    const compiled = compileScript(fixture.source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    expect(compiled.ok).toBe(true);
    const result = await executeArtifact({
      artifact: compiled.artifact!,
      manifest: compiled.manifest!,
      candles,
      inputs: fixture.defaultInputs ?? {},
      revision: compiled.artifactHash!,
      sessionKey: `test-session-${fixtureId}`,
    });
    expect(result.status).toBe('ready');
    expect(result.series[seriesKey]?.length).toBe(candles.length);
  });

  it('terminates infinite loop fixture', async () => {
    const fixture = SCRIPT_FIXTURES['infinite-loop'];
    const compiled = compileScript(fixture.source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    const result = await executeArtifact({
      artifact: compiled.artifact!,
      manifest: compiled.manifest!,
      candles: makeSyntheticCandles(20),
      inputs: {},
      revision: compiled.artifactHash!,
      sessionKey: 'test-session-loop',
      budgets: { ...DEFAULT_SCRIPT_RUNTIME_BUDGETS, maxExecuteMs: 200 },
    });
    expect(result.status).toBe('error');
    expect(['timeout', 'runtime']).toContain(result.errorCode);
  }, 10_000);

  it('rejects allocation pressure via validation or memory', async () => {
    const fixture = SCRIPT_FIXTURES['allocation-pressure'];
    const compiled = compileScript(fixture.source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    const result = await executeArtifact({
      artifact: compiled.artifact!,
      manifest: compiled.manifest!,
      candles: makeSyntheticCandles(50),
      inputs: {},
      revision: compiled.artifactHash!,
      sessionKey: 'test-session-alloc',
      budgets: { ...DEFAULT_SCRIPT_RUNTIME_BUDGETS, maxOutputValues: 1000 },
    });
    expect(result.status).toBe('error');
    expect(['invalid-output', 'memory', 'runtime', 'limit']).toContain(result.errorCode);
  }, 15_000);

  it('rejects malformed output fixture', async () => {
    const fixture = SCRIPT_FIXTURES['malformed-output'];
    const compiled = compileScript(fixture.source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    const result = await executeArtifact({
      artifact: compiled.artifact!,
      manifest: compiled.manifest!,
      candles: makeSyntheticCandles(20),
      inputs: {},
      revision: compiled.artifactHash!,
      sessionKey: 'test-session-malformed',
    });
    expect(result.status).toBe('error');
    expect(result.errorCode).toBe('invalid-output');
  });

  it('rejects stale session key mismatch', async () => {
    const fixture = SCRIPT_FIXTURES['line-midpoint'];
    const compiled = compileScript(fixture.source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    const result = await executeArtifact({
      artifact: compiled.artifact!,
      manifest: compiled.manifest!,
      candles: makeSyntheticCandles(20),
      inputs: {},
      revision: compiled.artifactHash!,
      sessionKey: 'actual-session',
      expectedSessionKey: 'expected-session',
    });
    expect(result.status).toBe('error');
    expect(result.error).toContain('Stale');
  });

  it('rejects candle count over budget', async () => {
    const fixture = SCRIPT_FIXTURES['line-midpoint'];
    const compiled = compileScript(fixture.source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    const result = await executeArtifact({
      artifact: compiled.artifact!,
      manifest: compiled.manifest!,
      candles: makeSyntheticCandles(100),
      inputs: {},
      revision: compiled.artifactHash!,
      sessionKey: 'test-session-candles',
      budgets: { ...DEFAULT_SCRIPT_RUNTIME_BUDGETS, maxCandleCount: 50 },
    });
    expect(result.status).toBe('error');
    expect(result.errorCode).toBe('limit');
  });

  it('returns cancelled when signal is already aborted', async () => {
    const fixture = SCRIPT_FIXTURES['line-midpoint'];
    const compiled = compileScript(fixture.source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    const controller = new AbortController();
    controller.abort();
    const result = await executeArtifact({
      artifact: compiled.artifact!,
      manifest: compiled.manifest!,
      candles: makeSyntheticCandles(20),
      inputs: {},
      revision: compiled.artifactHash!,
      sessionKey: 'test-session-cancel',
      signal: controller.signal,
    });
    expect(result.errorCode).toBe('cancelled');
  });

  it('executes HTF SMA fixture with aligned secondary series', async () => {
    const fixture = SCRIPT_FIXTURES['request-htf-sma'];
    const compiled = compileScript(fixture.source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    expect(compiled.ok).toBe(true);
    const primary = makeSyntheticCandles(60);
    const daily = makeSyntheticCandles(20).map((bar, index) => ({
      ...bar,
      t: primary[Math.min(index * 3, primary.length - 1)]!.t,
      c: 100 + index,
    }));
    const { alignSeriesToPrimary } = await import('@edge/chart-core');
    const alignedDaily = alignSeriesToPrimary(primary, daily);
    const result = await executeArtifact({
      artifact: compiled.artifact!,
      manifest: compiled.manifest!,
      candles: primary,
      inputs: fixture.defaultInputs ?? {},
      revision: compiled.artifactHash!,
      sessionKey: 'test-session-htf',
      seriesContext: {
        symbol: 'AAPL',
        interval: '1h',
        range: '1y',
        sessionMode: 'regular',
      },
      secondarySeries: {
        'AAPL|1d': alignedDaily,
      },
      secondarySeriesFingerprint: 'htf-test',
    });
    expect(result.status).toBe('ready');
    expect(result.series.htfSma?.length).toBe(primary.length);
  });

  it('rejects secondary series budget in collect pass', async () => {
    const overBudgetSource = `
function edgeScript() {
  return {
    name: "Too Many Series",
    pane: "sub",
    inputs: {},
    calculate(candles, inputs, ta, request) {
      request.series({ symbol: "SPY", interval: "1d" });
      request.series({ symbol: "QQQ", interval: "1d" });
      request.series({ symbol: "IWM", interval: "1d" });
      return { x: candles.map(() => 1) };
    },
    plots: { x: { kind: "line", title: "X", color: "#fff" } },
  };
}
edgeScript();
`;
    const overCompiled = compileScript(overBudgetSource, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    expect(overCompiled.ok).toBe(true);
    const { collectScriptSeriesRequests } = await import('./executeArtifact.js');
    const collect = await collectScriptSeriesRequests({
      artifact: overCompiled.artifact!,
      manifest: overCompiled.manifest!,
      candles: makeSyntheticCandles(20),
      inputs: {},
      revision: overCompiled.artifactHash!,
      sessionKey: 'test-session-budget',
      seriesContext: {
        symbol: 'AAPL',
        interval: '1h',
        range: '1y',
      },
      budgets: { ...DEFAULT_SCRIPT_RUNTIME_BUDGETS, maxSecondarySeriesRequests: 2 },
    });
    expect(collect.ok).toBe(false);
    if (!collect.ok) {
      expect(collect.errorCode).toBe('series-budget');
    }
  });

  it('peels and validates calculate() objects map', async () => {
    const source = SCRIPT_FIXTURES['object-box-label'].source;
    const compiled = compileScript(source, DEFAULT_SCRIPT_RUNTIME_BUDGETS);
    expect(compiled.ok).toBe(true);
    const candles = makeSyntheticCandles(50);
    const result = await executeArtifact({
      artifact: compiled.artifact!,
      manifest: compiled.manifest!,
      candles,
      inputs: { lookback: 20 },
      revision: compiled.artifactHash!,
      sessionKey: 'test-objects',
    });
    expect(result.status).toBe('ready');
    expect(result.objects?.zone?.kind).toBe('box');
    expect(result.objects?.note?.kind).toBe('label');
    expect(result.objects?.lvl?.kind).toBe('level');
    expect(result.series.mid?.length).toBe(candles.length);
  });
});

describe('guest capability probe', () => {
  it('does not expose host globals in guest', async () => {
    const probe = await probeGuestCapabilities();
    expect(probe.window).toBe('undefined');
    expect(probe.document).toBe('undefined');
    expect(probe.fetch).toBe('undefined');
    expect(probe.indexedDB).toBe('undefined');
    expect(probe.localStorage).toBe('undefined');
    expect(probe.Worker).toBe('undefined');
    expect(probe.Promise).toBe('undefined');
    expect(probe.setTimeout).toBe('undefined');
    expect(probe.Math).toBe('object');
  });
});

describe('worker recovery', () => {
  it('can boot a fresh QuickJS runtime after dispose', async () => {
    const result = await recoverFromWorkerCrash();
    expect(result.recovered).toBe(true);
  });
});

describe('ScriptSession last-valid behavior', () => {
  it('preserves last-valid series on compile failure after success', async () => {
    const session = new ScriptSession();
    const good = await session.evaluate({
      source: SCRIPT_FIXTURES['line-midpoint'].source,
      candles: makeSyntheticCandles(30),
      inputs: { period: 20 },
      sessionKey: 'session-a',
    });
    expect(good.effective?.status).toBe('ready');

    const bad = await session.evaluate({
      source: SCRIPT_FIXTURES['syntax-error'].source,
      candles: makeSyntheticCandles(30),
      inputs: { period: 20 },
      sessionKey: 'session-b',
    });
    expect(bad.effective?.status).toBe('stale');
    expect(bad.effective?.series.midpoint?.length).toBe(30);
    expect(bad.lastValid?.artifactHash).toBe(good.compile.artifactHash);
  });

  it('preserves last-valid on runtime failure after success', async () => {
    const session = new ScriptSession();
    await session.evaluate({
      source: SCRIPT_FIXTURES['line-midpoint'].source,
      candles: makeSyntheticCandles(30),
      inputs: { period: 20 },
      sessionKey: 'session-c',
    });

    const bad = await session.evaluate({
      source: SCRIPT_FIXTURES['infinite-loop'].source,
      candles: makeSyntheticCandles(30),
      inputs: {},
      sessionKey: 'session-d',
      budgets: { ...DEFAULT_SCRIPT_RUNTIME_BUDGETS, maxExecuteMs: 200 },
    });
    expect(bad.effective?.status).toBe('stale');
    expect(bad.effective?.series.midpoint?.length).toBe(30);
  }, 10_000);

  it('returns deterministic replay for identical source', async () => {
    const session = new ScriptSession();
    const source = SCRIPT_FIXTURES['line-midpoint'].source;
    const candles = makeSyntheticCandles(40);
    const a = await session.evaluate({ source, candles, inputs: { period: 20 }, sessionKey: 's1' });
    const b = await session.evaluate({ source, candles, inputs: { period: 20 }, sessionKey: 's2' });
    expect(a.compile.artifactHash).toBe(b.compile.artifactHash);
    expect(a.effective?.series.midpoint?.[10]).toBe(b.effective?.series.midpoint?.[10]);
  });
});

describe('rejectStalePipelineResponse', () => {
  it('detects session key mismatch', () => {
    expect(rejectStalePipelineResponse('a', 'b')).toBe(true);
    expect(rejectStalePipelineResponse('a', 'a')).toBe(false);
  });
});
