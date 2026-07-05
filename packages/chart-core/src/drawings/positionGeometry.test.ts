import { describe, it, expect } from 'vitest';
import {
  boxFromPoints,
  expandTwoPointDraft,
  positionControlPoints,
  positionPlotBounds,
  updatePositionFromControl,
} from './positionGeometry';

describe('positionGeometry', () => {
  const fourPoints = [
    { timestamp: 1000, value: 100, dataIndex: 0 },
    { timestamp: 1000, value: 95, dataIndex: 0 },
    { timestamp: 1000, value: 110, dataIndex: 0 },
    { timestamp: 3000, value: 100, dataIndex: 2 },
  ];

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

  it('positionControlPoints returns six handles', () => {
    const bounds = positionPlotBounds(
      { x: 10, y: 50 },
      { x: 10, y: 80 },
      { x: 10, y: 20 },
      { x: 100, y: 50 },
    );
    expect(positionControlPoints(bounds)).toHaveLength(6);
  });

  it('top-left handle changes target only', () => {
    const d = {
      name: 'long_position',
      label: 'Long',
      points: fourPoints.map((p) => ({ ...p })),
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const next = updatePositionFromControl(d, 0, {
      timestamp: 1000,
      value: 115,
      dataIndex: 0,
    });
    expect(next.points[2]?.value).toBe(115);
    expect(next.points[1]?.value).toBe(95);
    expect(next.points[0]?.value).toBe(100);
  });

  it('top-left handle does not move entry when cpIndex differs from entry point', () => {
    const d = {
      name: 'long_position',
      label: 'Long',
      points: fourPoints.map((p) => ({ ...p })),
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const entryBefore = d.points[0]?.value;
    const stopBefore = d.points[1]?.value;
    const next = updatePositionFromControl(d, 0, {
      timestamp: 1500,
      value: 112,
      dataIndex: 0,
    });
    expect(next.points[0]?.value).toBe(entryBefore);
    expect(next.points[1]?.value).toBe(stopBefore);
    expect(next.points[2]?.value).toBe(112);
  });

  it('bottom handle changes stop only', () => {
    const d = {
      name: 'long_position',
      label: 'Long',
      points: fourPoints.map((p) => ({ ...p })),
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const next = updatePositionFromControl(d, 4, {
      timestamp: 1000,
      value: 90,
      dataIndex: 0,
    });
    expect(next.points[1]?.value).toBe(90);
    expect(next.points[2]?.value).toBe(110);
    expect(next.points[0]?.value).toBe(100);
  });

  it('entry-left handle changes entry price only', () => {
    const d = {
      name: 'long_position',
      label: 'Long',
      points: fourPoints.map((p) => ({ ...p })),
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const next = updatePositionFromControl(d, 2, {
      timestamp: 1000,
      value: 102,
      dataIndex: 0,
    });
    expect(next.points[0]?.value).toBe(102);
    expect(next.points[3]?.value).toBe(102);
    expect(next.points[1]?.value).toBe(95);
    expect(next.points[2]?.value).toBe(110);
  });

  it('entry-right handle changes width only', () => {
    const d = {
      name: 'long_position',
      label: 'Long',
      points: fourPoints.map((p) => ({ ...p })),
      visible: true,
      locked: false,
      zLevel: 0,
    };
    const next = updatePositionFromControl(d, 3, {
      timestamp: 5000,
      value: 999,
      dataIndex: 4,
    });
    expect(next.points[3]?.timestamp).toBe(5000);
    expect(next.points[0]?.value).toBe(100);
    expect(next.points[1]?.value).toBe(95);
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
    const next = updatePositionFromControl(d, 4, {
      timestamp: 1000,
      value: 108,
      dataIndex: 0,
    });
    expect(next.points[1]?.value).toBe(108);
    expect(next.points[0]?.value).toBe(100);
    expect(next.points[2]?.value).toBe(90);
  });
});
