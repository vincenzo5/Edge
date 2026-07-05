import { describe, it, expect } from 'vitest';
import { createViewport } from '../viewport';
import type { Candle } from '../contracts';
import { longPosition } from '@edge/chart-core/drawings/long_position';
import { shouldShowPositionLabels } from '@edge/chart-core/drawings/position_tool';
import { shortPosition } from '@edge/chart-core/drawings/short_position';

const candles: Candle[] = [
  { t: 1000, o: 100, h: 110, l: 90, c: 105 },
  { t: 2000, o: 105, h: 115, l: 95, c: 110 },
  { t: 3000, o: 110, h: 120, l: 100, c: 115 },
];

function vp() {
  return createViewport(candles, 800, 400, 3, 0);
}

describe('position label visibility', () => {
  it('shows labels only for selected or hovered non-preview drawings', () => {
    expect(shouldShowPositionLabels(false)).toBe(false);
    expect(shouldShowPositionLabels(false, { hovered: false })).toBe(false);
    expect(shouldShowPositionLabels(false, { hovered: true })).toBe(true);
    expect(shouldShowPositionLabels(true)).toBe(true);
    expect(shouldShowPositionLabels(true, { preview: true })).toBe(false);
    expect(shouldShowPositionLabels(false, { hovered: true, preview: true })).toBe(false);
  });
});

describe('long_position drawing plugin', () => {
  it('creates a two-point draft', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    const draft = longPosition.create(start, vp(), candles);
    expect(draft.name).toBe('long_position');
    expect(draft.points).toHaveLength(2);
  });

  it('updates preview to track cursor on second point', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    const draft = longPosition.create(start, vp(), candles);
    const cursor = { timestamp: 3000, value: 90, dataIndex: 2 };
    const updated = longPosition.updatePreview!(draft, cursor, vp(), candles);
    expect(updated.points[1]).toEqual(cursor);
  });

  it('finalize expands to four points with risk metadata', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    let draft = longPosition.create(start, vp(), candles);
    draft = longPosition.updatePreview!(
      draft,
      { timestamp: 3000, value: 92, dataIndex: 2 },
      vp(),
      candles,
    );
    const final = longPosition.finalize!(draft, vp(), candles);
    expect(final.points).toHaveLength(4);
    expect(final.metadata?.fields?.riskSetup).toBeDefined();
    expect(final.metadata?.computed?.riskRewardRatio).toBeGreaterThan(0);
  });

  it('hit-tests inside the profit/loss box', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    let draft = longPosition.create(start, vp(), candles);
    draft = longPosition.updatePreview!(
      draft,
      { timestamp: 3000, value: 92, dataIndex: 2 },
      vp(),
      candles,
    );
    const final = longPosition.finalize!(draft, vp(), candles);
    const plots = longPosition.getControlPoints!(final, vp(), candles);
    expect(plots.length).toBe(6);
    const midX = (plots[2]!.x + plots[3]!.x) / 2;
    const midY = (plots[2]!.y + plots[4]!.y) / 2;
    expect(longPosition.hitTest(midX, midY, final, vp(), candles)).toBe(true);
    expect(longPosition.hitTest(0, 0, final, vp(), candles)).toBe(false);
  });

  it('control-point drag updates target without moving entry', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    let draft = longPosition.create(start, vp(), candles);
    draft = longPosition.updatePreview!(
      draft,
      { timestamp: 3000, value: 92, dataIndex: 2 },
      vp(),
      candles,
    );
    const final = longPosition.finalize!(draft, vp(), candles);
    const entryBefore = final.points[0]?.value;
    const stopBefore = final.points[1]?.value;
    const cps = longPosition.getControlPoints!(final, vp(), candles);
    const top = cps[0]!;
    const updated = longPosition.updateFromControl!(
      final,
      0,
      top.x,
      top.y - 20,
      vp(),
      candles,
    );
    expect(updated.points[0]?.value).toBe(entryBefore);
    expect(updated.points[1]?.value).toBe(stopBefore);
    expect(updated.points[2]?.value).toBeGreaterThan(final.points[2]!.value!);
  });
});

describe('short_position drawing plugin', () => {
  it('creates a two-point draft', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    const draft = shortPosition.create(start, vp(), candles);
    expect(draft.name).toBe('short_position');
    expect(draft.points).toHaveLength(2);
  });

  it('updates preview to track cursor on second point', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    const draft = shortPosition.create(start, vp(), candles);
    const cursor = { timestamp: 3000, value: 108, dataIndex: 2 };
    const updated = shortPosition.updatePreview!(draft, cursor, vp(), candles);
    expect(updated.points[1]).toEqual(cursor);
  });

  it('finalize expands to four points with short risk metadata', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    let draft = shortPosition.create(start, vp(), candles);
    draft = shortPosition.updatePreview!(
      draft,
      { timestamp: 3000, value: 108, dataIndex: 2 },
      vp(),
      candles,
    );
    const final = shortPosition.finalize!(draft, vp(), candles);
    expect(final.points).toHaveLength(4);
    const setup = final.metadata?.fields?.riskSetup as { direction?: string } | undefined;
    expect(setup?.direction).toBe('short');
    expect(final.metadata?.computed?.riskRewardRatio).toBeGreaterThan(0);
    expect(final.points[1]?.value).toBeGreaterThan(final.points[0]?.value ?? 0);
    expect(final.points[2]?.value).toBeLessThan(final.points[0]?.value ?? 0);
  });

  it('hit-tests inside the profit/loss box', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    let draft = shortPosition.create(start, vp(), candles);
    draft = shortPosition.updatePreview!(
      draft,
      { timestamp: 3000, value: 108, dataIndex: 2 },
      vp(),
      candles,
    );
    const final = shortPosition.finalize!(draft, vp(), candles);
    const plots = shortPosition.getControlPoints!(final, vp(), candles);
    expect(plots.length).toBe(6);
    const midX = (plots[2]!.x + plots[3]!.x) / 2;
    const midY = (plots[2]!.y + plots[4]!.y) / 2;
    expect(shortPosition.hitTest(midX, midY, final, vp(), candles)).toBe(true);
    expect(shortPosition.hitTest(0, 0, final, vp(), candles)).toBe(false);
  });

  it('control-point drag updates stop without moving entry', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    let draft = shortPosition.create(start, vp(), candles);
    draft = shortPosition.updatePreview!(
      draft,
      { timestamp: 3000, value: 108, dataIndex: 2 },
      vp(),
      candles,
    );
    const final = shortPosition.finalize!(draft, vp(), candles);
    const entryBefore = final.points[0]?.value;
    const targetBefore = final.points[2]?.value;
    const cps = shortPosition.getControlPoints!(final, vp(), candles);
    const stopHandle = cps[4]!;
    const updated = shortPosition.updateFromControl!(
      final,
      4,
      stopHandle.x,
      stopHandle.y - 20,
      vp(),
      candles,
    );
    expect(updated.points[0]?.value).toBe(entryBefore);
    expect(updated.points[2]?.value).toBe(targetBefore);
    expect(updated.points[1]?.value).toBeGreaterThan(final.points[1]!.value!);
  });
});
