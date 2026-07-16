import { describe, it, expect } from 'vitest';
import {
  applyStickEntryPrice,
  boxFromPoints,
  DEFAULT_POSITION_WIDTH_BARS,
  defaultPositionPoints,
  entryValueChanged,
  expandTwoPointDraft,
  MAX_POSITION_R_LEVELS,
  POSITION_CP,
  positionControlPoints,
  positionPlotBounds,
  profitRLevels,
  repairPositionPoints,
  stickEntryToLastPriceEnabled,
  updatePositionFromControl,
  withStickEntryDisabled,
} from './positionGeometry';

describe('positionGeometry', () => {
  const fourPoints = [
    { timestamp: 1000, value: 100, dataIndex: 0 },
    { timestamp: 1000, value: 95, dataIndex: 0 },
    { timestamp: 1000, value: 110, dataIndex: 0 },
    { timestamp: 3000, value: 100, dataIndex: 2 },
  ];

  it('repairPositionPoints rewrites timestamp-0 anchors from dataIndex', () => {
    const candles = [
      { t: 1000, o: 100, h: 110, l: 90, c: 105 },
      { t: 2000, o: 105, h: 115, l: 95, c: 110 },
      { t: 3000, o: 110, h: 120, l: 100, c: 115 },
    ];
    const corrupt = [
      { timestamp: 0, value: 115, dataIndex: 2 },
      { timestamp: 0, value: 100, dataIndex: 2 },
      { timestamp: 0, value: 130, dataIndex: 2 },
      { timestamp: 0, value: 115, dataIndex: 12 },
    ];
    const fixed = repairPositionPoints(corrupt, candles);
    expect(fixed[0]?.timestamp).toBe(3000);
    expect(fixed[0]?.dataIndex).toBe(2);
    expect(fixed[3]?.timestamp).toBeGreaterThan(3000);
    expect(fixed[3]?.dataIndex).toBe(12);
  });

  it('repairPositionPoints clamps left virtual indices onto the last real bar', () => {
    const candles = [{ t: 1000, o: 100, h: 110, l: 90, c: 100 }];
    const corrupt = [
      { timestamp: 0, value: 100, dataIndex: 5 },
      { timestamp: 0, value: 95, dataIndex: 5 },
      { timestamp: 0, value: 110, dataIndex: 5 },
      { timestamp: 0, value: 100, dataIndex: 10 },
    ];
    const fixed = repairPositionPoints(corrupt, candles);
    expect(fixed[0]?.dataIndex).toBe(0);
    expect(fixed[0]?.timestamp).toBe(1000);
    expect(fixed[3]?.dataIndex).toBe(10);
  });

  it('defaultPositionPoints anchors entry to last-bar close and left edge', () => {
    const candles = [
      { t: 1000, o: 100, h: 110, l: 90, c: 105 },
      { t: 2000, o: 105, h: 115, l: 95, c: 110 },
      { t: 3000, o: 110, h: 120, l: 100, c: 115 },
    ];
    const points = defaultPositionPoints('long', candles);
    expect(points).not.toBeNull();
    expect(points![0]?.value).toBe(115);
    expect(points![0]?.dataIndex).toBe(2);
    expect(points![0]?.timestamp).toBe(3000);
    expect(points![3]?.dataIndex).toBe(2 + DEFAULT_POSITION_WIDTH_BARS);
    expect(points![1]?.value).toBeLessThan(115);
    expect(points![2]?.value).toBeGreaterThan(115);
  });

  it('defaultPositionPoints mirrors stop/target for shorts', () => {
    const candles = [{ t: 1000, o: 100, h: 110, l: 90, c: 100 }];
    const points = defaultPositionPoints('short', candles);
    expect(points![1]?.value).toBeGreaterThan(100);
    expect(points![2]?.value).toBeLessThan(100);
  });

  it('decodes a long box from four points', () => {
    const box = boxFromPoints(fourPoints, 'long');
    expect(box).toEqual({
      entry: 100,
      stop: 95,
      target: 110,
      leftTimestamp: 1000,
      rightTimestamp: 3000,
    });
  });

  it('decodes a short box from four points', () => {
    const shortPoints = [
      { timestamp: 1000, value: 100, dataIndex: 0 },
      { timestamp: 1000, value: 105, dataIndex: 0 },
      { timestamp: 1000, value: 90, dataIndex: 0 },
      { timestamp: 3000, value: 100, dataIndex: 2 },
    ];
    const box = boxFromPoints(shortPoints, 'short');
    expect(box?.entry).toBe(100);
    expect(box?.stop).toBe(105);
    expect(box?.target).toBe(90);
  });

  it('derives long stop/target from two-point draft', () => {
    const draft = {
      name: 'long_position',
      label: 'Long',
      points: [
        { timestamp: 1000, value: 100, dataIndex: 0 },
        { timestamp: 3000, value: 92, dataIndex: 2 },
      ],
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const box = boxFromPoints(draft.points, 'long');
    expect(box?.entry).toBe(100);
    expect(box!.stop).toBeLessThan(100);
    expect(box!.target).toBeGreaterThan(100);
  });

  it('derives short stop/target from two-point draft', () => {
    const draft = {
      name: 'short_position',
      label: 'Short',
      points: [
        { timestamp: 1000, value: 100, dataIndex: 0 },
        { timestamp: 3000, value: 108, dataIndex: 2 },
      ],
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const box = boxFromPoints(draft.points, 'short');
    expect(box?.entry).toBe(100);
    expect(box!.stop).toBeGreaterThan(100);
    expect(box!.target).toBeLessThan(100);
  });

  it('expandTwoPointDraft produces four anchors', () => {
    const draft = {
      name: 'long_position',
      label: 'Long',
      points: [
        { timestamp: 1000, value: 100, dataIndex: 0 },
        { timestamp: 3000, value: 92, dataIndex: 2 },
      ],
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const expanded = expandTwoPointDraft(draft, 'long');
    expect(expanded.points).toHaveLength(4);
    expect(expanded.points[0]?.value).toBe(100);
    expect(expanded.points[3]?.timestamp).toBe(3000);
  });

  it('expandTwoPointDraft ignores timestamp 0 from empty-margin corner', () => {
    const draft = {
      name: 'long_position',
      label: 'Long',
      points: [
        { timestamp: 1000, value: 100, dataIndex: 0 },
        { timestamp: 0, value: 92, dataIndex: 5 },
      ],
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const expanded = expandTwoPointDraft(draft, 'long');
    expect(expanded.points[0]?.timestamp).toBe(1000);
    expect(expanded.points[0]?.timestamp).not.toBe(0);
    expect(expanded.points[3]?.dataIndex).toBe(5);
  });

  it('expandTwoPointDraft produces four anchors for short', () => {
    const draft = {
      name: 'short_position',
      label: 'Short',
      points: [
        { timestamp: 1000, value: 100, dataIndex: 0 },
        { timestamp: 3000, value: 108, dataIndex: 2 },
      ],
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const expanded = expandTwoPointDraft(draft, 'short');
    expect(expanded.points).toHaveLength(4);
    expect(expanded.points[0]?.value).toBe(100);
    expect(expanded.points[1]?.value).toBeGreaterThan(100);
    expect(expanded.points[2]?.value).toBeLessThan(100);
    expect(expanded.points[3]?.timestamp).toBe(3000);
  });

  it('positionControlPoints returns four TradingView-style handles', () => {
    const bounds = positionPlotBounds(
      { x: 10, y: 50 },
      { x: 10, y: 80 },
      { x: 10, y: 20 },
      { x: 100, y: 50 },
    );
    expect(positionControlPoints(bounds)).toEqual([
      { x: 10, y: 20 },
      { x: 10, y: 50 },
      { x: 10, y: 80 },
      { x: 100, y: 50 },
    ]);
  });

  it('target handle changes take-profit price only', () => {
    const d = {
      name: 'long_position',
      label: 'Long',
      points: fourPoints.map((p) => ({ ...p })),
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const next = updatePositionFromControl(d, POSITION_CP.TARGET, {
      timestamp: 1500,
      value: 115,
      dataIndex: 1,
    });
    expect(next.points[2]?.value).toBe(115);
    expect(next.points[1]?.value).toBe(95);
    expect(next.points[0]?.value).toBe(100);
    expect(next.points[0]?.timestamp).toBe(1000);
    expect(next.points[1]?.timestamp).toBe(1000);
    expect(next.points[2]?.timestamp).toBe(1000);
    expect(next.points[3]?.timestamp).toBe(3000);
  });

  it('stop handle changes stop price only', () => {
    const d = {
      name: 'long_position',
      label: 'Long',
      points: fourPoints.map((p) => ({ ...p })),
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const next = updatePositionFromControl(d, POSITION_CP.STOP, {
      timestamp: 1500,
      value: 90,
      dataIndex: 1,
    });
    expect(next.points[1]?.value).toBe(90);
    expect(next.points[2]?.value).toBe(110);
    expect(next.points[0]?.value).toBe(100);
    expect(next.points[0]?.timestamp).toBe(1000);
    expect(next.points[1]?.timestamp).toBe(1000);
    expect(next.points[3]?.timestamp).toBe(3000);
  });

  it('entry-left handle changes entry price and left edge', () => {
    const d = {
      name: 'long_position',
      label: 'Long',
      points: fourPoints.map((p) => ({ ...p })),
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const next = updatePositionFromControl(d, POSITION_CP.ENTRY_LEFT, {
      timestamp: 1500,
      value: 102,
      dataIndex: 1,
    });
    expect(next.points[0]?.value).toBe(102);
    expect(next.points[3]?.value).toBe(102);
    expect(next.points[1]?.value).toBe(95);
    expect(next.points[2]?.value).toBe(110);
    expect(next.points[0]?.timestamp).toBe(1500);
    expect(next.points[1]?.timestamp).toBe(1500);
    expect(next.points[2]?.timestamp).toBe(1500);
    expect(next.points[3]?.timestamp).toBe(3000);
  });

  it('right handle changes width only without moving entry', () => {
    const d = {
      name: 'long_position',
      label: 'Long',
      points: fourPoints.map((p) => ({ ...p })),
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const next = updatePositionFromControl(d, POSITION_CP.RIGHT, {
      timestamp: 5000,
      value: 999,
      dataIndex: 4,
    });
    expect(next.points[3]?.timestamp).toBe(5000);
    expect(next.points[0]?.value).toBe(100);
    expect(next.points[3]?.value).toBe(100);
    expect(next.points[1]?.value).toBe(95);
    expect(next.points[0]?.timestamp).toBe(1000);
  });

  it('short stop handle changes stop without moving entry', () => {
    const shortPoints = [
      { timestamp: 1000, value: 100, dataIndex: 0 },
      { timestamp: 1000, value: 105, dataIndex: 0 },
      { timestamp: 1000, value: 90, dataIndex: 0 },
      { timestamp: 3000, value: 100, dataIndex: 2 },
    ];
    const d = {
      name: 'short_position',
      label: 'Short',
      points: shortPoints.map((p) => ({ ...p })),
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const next = updatePositionFromControl(d, POSITION_CP.STOP, {
      timestamp: 1000,
      value: 108,
      dataIndex: 0,
    });
    expect(next.points[1]?.value).toBe(108);
    expect(next.points[0]?.value).toBe(100);
    expect(next.points[2]?.value).toBe(90);
  });

  describe('stickEntryToLastPrice', () => {
    const longDrawing = {
      name: 'long_position',
      label: 'Long',
      points: fourPoints.map((p) => ({ ...p })),
      visible: true,
      locked: false,
      zLevel: 0,
    };

    it('defaults to enabled when style is omitted', () => {
      expect(stickEntryToLastPriceEnabled(longDrawing)).toBe(true);
    });

    it('respects explicit false', () => {
      expect(
        stickEntryToLastPriceEnabled({
          ...longDrawing,
          styles: { stickEntryToLastPrice: false },
        }),
      ).toBe(false);
    });

    it('moves entry only; stop and target stay fixed', () => {
      const next = applyStickEntryPrice(longDrawing, 103.5);
      expect(next).not.toBeNull();
      expect(next!.points[0]?.value).toBe(103.5);
      expect(next!.points[3]?.value).toBe(103.5);
      expect(next!.points[1]?.value).toBe(95);
      expect(next!.points[2]?.value).toBe(110);
    });

    it('returns null when stick is off or price unchanged', () => {
      expect(
        applyStickEntryPrice(
          { ...longDrawing, styles: { stickEntryToLastPrice: false } },
          103.5,
        ),
      ).toBeNull();
      expect(applyStickEntryPrice(longDrawing, 100)).toBeNull();
    });

    it('withStickEntryDisabled persists false', () => {
      const next = withStickEntryDisabled(longDrawing);
      expect(next.styles?.stickEntryToLastPrice).toBe(false);
    });

    it('entryValueChanged detects entry price edits', () => {
      expect(entryValueChanged(fourPoints, fourPoints)).toBe(false);
      const moved = fourPoints.map((p, i) => (i === 0 || i === 3 ? { ...p, value: 101 } : p));
      expect(entryValueChanged(fourPoints, moved)).toBe(true);
    });
  });

  describe('profitRLevels', () => {
    it('returns 1R and 2R prices for a long 2R target', () => {
      expect(profitRLevels(100, 95, 110, 'long')).toEqual([
        { r: 1, price: 105 },
        { r: 2, price: 110 },
      ]);
    });

    it('returns mirrored R levels for a short 2R target', () => {
      expect(profitRLevels(100, 105, 90, 'short')).toEqual([
        { r: 1, price: 95 },
        { r: 2, price: 90 },
      ]);
    });

    it('returns empty when reward is less than 1R', () => {
      expect(profitRLevels(100, 95, 103, 'long')).toEqual([]);
    });

    it('caps at MAX_POSITION_R_LEVELS', () => {
      const entry = 100;
      const stop = 99;
      const target = entry + (MAX_POSITION_R_LEVELS + 5);
      const levels = profitRLevels(entry, stop, target, 'long');
      expect(levels).toHaveLength(MAX_POSITION_R_LEVELS);
      expect(levels[0]).toEqual({ r: 1, price: 101 });
      expect(levels[MAX_POSITION_R_LEVELS - 1]?.r).toBe(MAX_POSITION_R_LEVELS);
    });

    it('returns empty when risk distance is zero', () => {
      expect(profitRLevels(100, 100, 110, 'long')).toEqual([]);
    });
  });
});
