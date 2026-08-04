import { describe, it, expect } from 'vitest';
import { createViewport } from '@edge/chart-react/engine/viewport';
import type { Candle } from '@edge/chart-core/contracts';
import { longPosition } from '@edge/chart-core/drawings/long_position';
import {
  positionAxisAnnotations,
  shouldShowPositionLabels,
} from '@edge/chart-core/drawings/position_tool';
import { shortPosition } from '@edge/chart-core/drawings/short_position';
import { POSITION_CP } from '@edge/chart-core/drawings/positionGeometry';
import { formatPrice } from '@edge/chart-core/format';

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

describe('position price-axis annotations', () => {
  it('emits entry, stop, and take-profit axis labels for long position', () => {
    const draft = longPosition.create(
      { timestamp: 1000, value: 100, dataIndex: 0 },
      vp(),
      candles,
    );
    const final = longPosition.finalize!(draft, vp(), candles);
    const anns = longPosition.axisAnnotations!(final, vp(), candles, 'dark');
    expect(anns).toHaveLength(3);

    const byRole = Object.fromEntries(
      anns.map((a) => [a.id.split(':').pop()!, a]),
    );
    expect(byRole.target?.value).toBe(final.points[2]?.value);
    expect(byRole.entry?.value).toBe(final.points[0]?.value);
    expect(byRole.stop?.value).toBe(final.points[1]?.value);
    expect(byRole.target?.label).toBe(formatPrice(final.points[2]!.value!));
    expect(byRole.entry?.label).toBe(formatPrice(final.points[0]!.value!));
    expect(byRole.stop?.label).toBe(formatPrice(final.points[1]!.value!));
    expect(byRole.target?.color).toBe('#15803d');
    expect(byRole.stop?.color).toBe('#b91c1c');
    expect(anns.every((a) => a.source === 'drawing' && a.showLabel === true)).toBe(true);
  });

  it('emits entry, stop, and take-profit axis labels for short position', () => {
    const draft = shortPosition.create(
      { timestamp: 1000, value: 100, dataIndex: 0 },
      vp(),
      candles,
    );
    const final = shortPosition.finalize!(draft, vp(), candles);
    const anns = positionAxisAnnotations(final, 'short', candles);
    expect(anns.map((a) => a.value).sort((a, b) => a - b)).toEqual(
      [final.points[2]!.value!, final.points[0]!.value!, final.points[1]!.value!].sort(
        (a, b) => a - b,
      ),
    );
    // Short: stop above entry, target below
    expect(final.points[1]!.value!).toBeGreaterThan(final.points[0]!.value!);
    expect(final.points[2]!.value!).toBeLessThan(final.points[0]!.value!);
  });

  it('returns empty annotations for incomplete drawings', () => {
    expect(
      positionAxisAnnotations(
        {
          id: 'x',
          name: 'long_position',
          label: 'Long',
          points: [{ timestamp: 1000, value: 100 }],
          visible: true,
          locked: false,
          zLevel: 0,
        },
        'long',
        candles,
      ),
    ).toEqual([]);
  });
});

describe('long_position drawing plugin', () => {
  it('creates a one-point draft at the click anchor', () => {
    const start = { timestamp: 1000, value: 102, dataIndex: 0 };
    const draft = longPosition.create(start, vp(), candles);
    expect(draft.name).toBe('long_position');
    expect(draft.points).toHaveLength(4);
    expect(draft.points[0]?.dataIndex).toBe(0);
    expect(draft.points[0]?.value).toBe(102);
    expect(draft.points[0]?.timestamp).toBe(1000);
    expect(draft.points[1]?.value).toBeLessThan(102);
    expect(draft.points[2]?.value).toBeGreaterThan(102);
    expect(longPosition.placement).toBe('one-point');
  });

  it('updates preview to track cursor on second point', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    let draft = longPosition.create(start, vp(), candles);
    draft = {
      ...draft,
      points: [
        { timestamp: 1000, value: 100, dataIndex: 0 },
        { timestamp: 1000, value: 100, dataIndex: 0 },
      ],
    };
    const cursor = { timestamp: 3000, value: 90, dataIndex: 2 };
    const updated = longPosition.updatePreview!(draft, cursor, vp(), candles);
    expect(updated.points[1]).toEqual(cursor);
  });

  it('finalize expands to four points with risk metadata', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    let draft = longPosition.create(start, vp(), candles);
    draft = {
      ...draft,
      points: [
        { timestamp: 1000, value: 100, dataIndex: 0 },
        { timestamp: 3000, value: 92, dataIndex: 2 },
      ],
    };
    const final = longPosition.finalize!(draft, vp(), candles);
    expect(final.points).toHaveLength(4);
    expect(final.metadata?.fields?.riskSetup).toBeDefined();
    expect(final.metadata?.computed?.riskRewardRatio).toBeGreaterThan(0);
  });

  it('uses entry as magnet anchor for whole-tool drag', () => {
    expect(longPosition.magnetAnchorIndex?.({
      name: 'long_position',
      label: 'Long',
      points: [],
      visible: true,
      locked: false,
      zLevel: 0,
    })).toBe(0);
  });

  it('hit-tests inside the profit/loss box', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    const draft = longPosition.create(start, vp(), candles);
    const final = longPosition.finalize!(draft, vp(), candles);
    const plots = longPosition.getControlPoints!(final, vp(), candles);
    expect(plots.length).toBe(4);
    const midX = (plots[POSITION_CP.ENTRY_LEFT]!.x + plots[POSITION_CP.RIGHT]!.x) / 2;
    const midY = (plots[POSITION_CP.ENTRY_LEFT]!.y + plots[POSITION_CP.STOP]!.y) / 2;
    expect(longPosition.hitTest(midX, midY, final, vp(), candles)).toBe(true);
    expect(longPosition.hitTest(-500, -500, final, vp(), candles)).toBe(false);
  });

  it('control-point drag updates target without moving entry', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    const draft = longPosition.create(start, vp(), candles);
    const final = longPosition.finalize!(draft, vp(), candles);
    const entryBefore = final.points[0]?.value;
    const stopBefore = final.points[1]?.value;
    const leftBefore = final.points[0]?.timestamp;
    const cps = longPosition.getControlPoints!(final, vp(), candles);
    const top = cps[POSITION_CP.TARGET]!;
    const updated = longPosition.updateFromControl!(
      final,
      POSITION_CP.TARGET,
      top.x,
      top.y - 20,
      vp(),
      candles,
    );
    expect(updated.points[0]?.value).toBe(entryBefore);
    expect(updated.points[1]?.value).toBe(stopBefore);
    expect(updated.points[0]?.timestamp).toBe(leftBefore);
    expect(updated.points[2]?.value).toBeGreaterThan(final.points[2]!.value!);
  });

  it('entry-left handle moves entry and left edge', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    const draft = longPosition.create(start, vp(), candles);
    const final = longPosition.finalize!(draft, vp(), candles);
    const cps = longPosition.getControlPoints!(final, vp(), candles);
    const entryLeft = cps[POSITION_CP.ENTRY_LEFT]!;
    const rightX = cps[POSITION_CP.RIGHT]!.x;
    const updated = longPosition.updateFromControl!(
      final,
      POSITION_CP.ENTRY_LEFT,
      entryLeft.x + (rightX - entryLeft.x) * 0.5,
      entryLeft.y - 10,
      vp(),
      candles,
    );
    expect(updated.points[0]?.value).not.toBe(final.points[0]?.value);
    expect(updated.points[3]?.value).toBe(updated.points[0]?.value);
    expect(updated.points[0]?.timestamp).toBeGreaterThan(final.points[0]!.timestamp!);
    expect(updated.points[1]?.timestamp).toBe(updated.points[0]?.timestamp);
    expect(updated.points[2]?.timestamp).toBe(updated.points[0]?.timestamp);
    expect(updated.points[3]?.timestamp).toBe(final.points[3]?.timestamp);
  });
});

describe('short_position drawing plugin', () => {
  it('creates a one-point draft at the click anchor', () => {
    const start = { timestamp: 2000, value: 108, dataIndex: 1 };
    const draft = shortPosition.create(start, vp(), candles);
    expect(draft.name).toBe('short_position');
    expect(draft.points).toHaveLength(4);
    expect(draft.points[0]?.dataIndex).toBe(1);
    expect(draft.points[0]?.value).toBe(108);
    expect(draft.points[1]?.value).toBeGreaterThan(108);
    expect(draft.points[2]?.value).toBeLessThan(108);
    expect(shortPosition.placement).toBe('one-point');
  });

  it('updates preview to track cursor on second point', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    let draft = shortPosition.create(start, vp(), candles);
    draft = {
      ...draft,
      points: [
        { timestamp: 1000, value: 100, dataIndex: 0 },
        { timestamp: 1000, value: 100, dataIndex: 0 },
      ],
    };
    const cursor = { timestamp: 3000, value: 108, dataIndex: 2 };
    const updated = shortPosition.updatePreview!(draft, cursor, vp(), candles);
    expect(updated.points[1]).toEqual(cursor);
  });

  it('finalize expands to four points with short risk metadata', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    let draft = shortPosition.create(start, vp(), candles);
    draft = {
      ...draft,
      points: [
        { timestamp: 1000, value: 100, dataIndex: 0 },
        { timestamp: 3000, value: 108, dataIndex: 2 },
      ],
    };
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
    const draft = shortPosition.create(start, vp(), candles);
    const final = shortPosition.finalize!(draft, vp(), candles);
    const plots = shortPosition.getControlPoints!(final, vp(), candles);
    expect(plots.length).toBe(4);
    const midX = (plots[POSITION_CP.ENTRY_LEFT]!.x + plots[POSITION_CP.RIGHT]!.x) / 2;
    const midY = (plots[POSITION_CP.ENTRY_LEFT]!.y + plots[POSITION_CP.STOP]!.y) / 2;
    expect(shortPosition.hitTest(midX, midY, final, vp(), candles)).toBe(true);
    expect(shortPosition.hitTest(0, 0, final, vp(), candles)).toBe(false);
  });

  it('control-point drag updates stop without moving entry', () => {
    const start = { timestamp: 1000, value: 100, dataIndex: 0 };
    const draft = shortPosition.create(start, vp(), candles);
    const final = shortPosition.finalize!(draft, vp(), candles);
    const entryBefore = final.points[0]?.value;
    const targetBefore = final.points[2]?.value;
    const leftBefore = final.points[0]?.timestamp;
    const cps = shortPosition.getControlPoints!(final, vp(), candles);
    const stopHandle = cps[POSITION_CP.STOP]!;
    const updated = shortPosition.updateFromControl!(
      final,
      POSITION_CP.STOP,
      stopHandle.x,
      stopHandle.y - 20,
      vp(),
      candles,
    );
    expect(updated.points[0]?.value).toBe(entryBefore);
    expect(updated.points[2]?.value).toBe(targetBefore);
    expect(updated.points[0]?.timestamp).toBe(leftBefore);
    expect(updated.points[1]?.value).toBeGreaterThan(final.points[1]!.value!);
  });
});
