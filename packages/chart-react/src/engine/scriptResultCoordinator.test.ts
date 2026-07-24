import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Candle, IndicatorConfig } from '@edge/chart-core';
import { SCRIPT_FIXTURES, applyCandleReplaceLatest, makeSyntheticCandles } from '@edge/chart-core';
import {
  IndicatorResultProvider,
  clearScriptIndicatorPlugins,
} from './indicatorResultProvider';
import { ScriptResultCoordinator } from './scriptResultCoordinator';
import { resetScriptRuntimeWorkerForTests } from './scriptRuntimeWorkerClient';

const candles = makeSyntheticCandles(120);

describe('ScriptResultCoordinator', () => {
  beforeEach(() => {
    clearScriptIndicatorPlugins();
    resetScriptRuntimeWorkerForTests();
  });

  it('schedules golden line fixture and publishes ready snapshot', async () => {
    const provider = new IndicatorResultProvider({ sessionKey: 'coord-test' });
    let invalidations = 0;
    const coordinator = new ScriptResultCoordinator({
      provider,
      sessionKey: 'coord-test',
      onSnapshot: () => {
        invalidations += 1;
      },
    });

    const instance: IndicatorConfig = {
      id: 'script-line-1',
      kind: 'script',
      scriptId: 'line-midpoint',
      revision: 'golden-v1',
      name: '__script_line_midpoint',
      pane: 'main',
      inputs: SCRIPT_FIXTURES['line-midpoint'].defaultInputs,
    };

    coordinator.sync([instance], candles);
    await vi.waitFor(
      () => {
        const snap = provider.getSnapshot(instance.id);
        expect(snap?.state).toBe('ready');
      },
      { timeout: 15_000 },
    );

    expect(invalidations).toBeGreaterThan(0);
    coordinator.dispose();
  });

  it('coalesces duplicate fingerprint requests', async () => {
    const provider = new IndicatorResultProvider({ sessionKey: 'coord-coalesce' });
    const coordinator = new ScriptResultCoordinator({
      provider,
      sessionKey: 'coord-coalesce',
    });

    const instance: IndicatorConfig = {
      id: 'script-line-2',
      kind: 'script',
      scriptId: 'line-midpoint',
      revision: 'golden-v1',
      name: '__script_line_midpoint',
      pane: 'main',
    };

    coordinator.sync([instance], candles);
    coordinator.sync([instance], candles);
    await vi.waitFor(() => expect(provider.getSnapshot(instance.id)?.state).toBe('ready'), {
      timeout: 15_000,
    });
    coordinator.dispose();
  });

  it('uses injected resolver before fixtures', async () => {
    const provider = new IndicatorResultProvider({ sessionKey: 'coord-resolver' });
    const coordinator = new ScriptResultCoordinator({
      provider,
      sessionKey: 'coord-resolver',
      scriptSourceResolver: (scriptId, revision) => {
        if (scriptId !== 'user-script' || revision !== 'rev-1') return null;
        return {
          scriptId,
          revision,
          source: SCRIPT_FIXTURES['line-midpoint'].source,
          defaultInputs: SCRIPT_FIXTURES['line-midpoint'].defaultInputs ?? {},
          displayName: 'User midpoint',
          pane: 'main',
        };
      },
    });

    const instance: IndicatorConfig = {
      id: 'script-user-1',
      kind: 'script',
      scriptId: 'user-script',
      revision: 'rev-1',
      name: '__script_user',
      pane: 'main',
    };

    coordinator.sync([instance], candles);
    await vi.waitFor(() => expect(provider.getSnapshot(instance.id)?.state).toBe('ready'), {
      timeout: 15_000,
    });
    coordinator.dispose();
  });

  it('marks stale when compile fails after last valid result', async () => {
    const provider = new IndicatorResultProvider({ sessionKey: 'coord-stale' });
    const coordinator = new ScriptResultCoordinator({
      provider,
      sessionKey: 'coord-stale',
    });

    const instance: IndicatorConfig = {
      id: 'script-line-3',
      kind: 'script',
      scriptId: 'line-midpoint',
      revision: 'golden-v1',
      name: '__script_line_midpoint',
      pane: 'main',
    };

    coordinator.sync([instance], candles);
    await vi.waitFor(() => expect(provider.getSnapshot(instance.id)?.state).toBe('ready'), {
      timeout: 15_000,
    });

    const broken: IndicatorConfig = {
      ...instance,
      scriptId: 'unknown-fixture-id',
    };

    coordinator.scheduleInstance(broken, candles);
    await vi.waitFor(() => expect(provider.getSnapshot(instance.id)?.state).toBe('stale'), {
      timeout: 15_000,
    });

    coordinator.dispose();
  });

  it('dispose clears result cache and lastValid maps', async () => {
    const provider = new IndicatorResultProvider({ sessionKey: 'coord-dispose' });
    const coordinator = new ScriptResultCoordinator({
      provider,
      sessionKey: 'coord-dispose',
    });

    const instance: IndicatorConfig = {
      id: 'script-line-dispose',
      kind: 'script',
      scriptId: 'line-midpoint',
      revision: 'golden-v1',
      name: '__script_line_midpoint',
      pane: 'main',
      inputs: SCRIPT_FIXTURES['line-midpoint'].defaultInputs,
    };

    coordinator.sync([instance], candles);
    await vi.waitFor(() => expect(provider.getSnapshot(instance.id)?.state).toBe('ready'), {
      timeout: 15_000,
    });
    expect(coordinator.getResultCacheSizeForTests()).toBeGreaterThan(0);
    expect(coordinator.getLastValidCountForTests()).toBe(1);

    coordinator.dispose();
    expect(coordinator.getResultCacheSizeForTests()).toBe(0);
    expect(coordinator.getLastValidCountForTests()).toBe(0);
  });

  it('prunes lastValid when instance is removed from sync', async () => {
    const provider = new IndicatorResultProvider({ sessionKey: 'coord-prune' });
    const coordinator = new ScriptResultCoordinator({
      provider,
      sessionKey: 'coord-prune',
    });

    const instance: IndicatorConfig = {
      id: 'script-line-prune',
      kind: 'script',
      scriptId: 'line-midpoint',
      revision: 'golden-v1',
      name: '__script_line_midpoint',
      pane: 'main',
    };

    coordinator.sync([instance], candles);
    await vi.waitFor(() => expect(provider.getSnapshot(instance.id)?.state).toBe('ready'), {
      timeout: 15_000,
    });
    expect(coordinator.getLastValidCountForTests()).toBe(1);

    coordinator.sync([], candles);
    expect(coordinator.getLastValidCountForTests()).toBe(0);
    coordinator.dispose();
  });

  it('does not grow script cache entry count on tip replace-latest ticks', async () => {
    const provider = new IndicatorResultProvider({ sessionKey: 'coord-tip' });
    const coordinator = new ScriptResultCoordinator({
      provider,
      sessionKey: 'coord-tip',
    });

    const instance: IndicatorConfig = {
      id: 'script-line-tip',
      kind: 'script',
      scriptId: 'line-midpoint',
      revision: 'golden-v1',
      name: '__script_line_midpoint',
      pane: 'main',
      inputs: SCRIPT_FIXTURES['line-midpoint'].defaultInputs,
    };

    let series: Candle[] = [...candles];
    coordinator.sync([instance], series);
    await vi.waitFor(() => expect(provider.getSnapshot(instance.id)?.state).toBe('ready'), {
      timeout: 15_000,
    });
    expect(coordinator.getResultCacheSizeForTests()).toBe(1);

    for (let i = 0; i < 5; i += 1) {
      const last = series[series.length - 1]!;
      series = applyCandleReplaceLatest(series, {
        ...last,
        c: last.c + 0.05 * (i + 1),
        h: Math.max(last.h, last.c + 0.05 * (i + 1)),
      });
      coordinator.scheduleInstance(instance, series);
      await vi.waitFor(
        () => expect(provider.getSnapshot(instance.id)?.state).toBe('ready'),
        { timeout: 15_000 },
      );
      expect(coordinator.getResultCacheSizeForTests()).toBe(1);
    }

    coordinator.dispose();
  });
});
