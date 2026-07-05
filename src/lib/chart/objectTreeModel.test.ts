import { describe, expect, it } from 'vitest';
import { DEFAULT_CELL } from '@/lib/chartConfig';
import {
  bringCellDrawingForward,
  buildObjectTreeLayoutModel,
  patchCellIndicator,
  removeCellDrawing,
} from './objectTreeModel';

describe('buildObjectTreeLayoutModel', () => {
  it('returns single mode for one pane', () => {
    const model = buildObjectTreeLayoutModel({
      cells: [DEFAULT_CELL],
      activeCellIndex: 0,
      paneCount: 1,
    });

    expect(model.mode).toBe('single');
    expect(model.panes).toHaveLength(1);
    expect(model.panes[0]?.isActive).toBe(true);
  });

  it('returns multi mode with active pane flagged', () => {
    const cells = [
      { ...DEFAULT_CELL, symbol: 'AAPL' },
      { ...DEFAULT_CELL, symbol: 'MSFT' },
    ];
    const model = buildObjectTreeLayoutModel({
      cells,
      activeCellIndex: 1,
      paneCount: 2,
    });

    expect(model.mode).toBe('multi');
    expect(model.panes[0]?.title).toContain('AAPL');
    expect(model.panes[1]?.title).toContain('MSFT');
    expect(model.panes[0]?.isActive).toBe(false);
    expect(model.panes[1]?.isActive).toBe(true);
  });

  it('sorts drawings by zLevel descending', () => {
    const cell = {
      ...DEFAULT_CELL,
      drawings: [
        {
          id: 'low',
          name: 'trend_line',
          label: 'Low',
          points: [],
          visible: true,
          locked: false,
          zLevel: 1,
        },
        {
          id: 'high',
          name: 'trend_line',
          label: 'High',
          points: [],
          visible: true,
          locked: false,
          zLevel: 5,
        },
      ],
    };

    const model = buildObjectTreeLayoutModel({
      cells: [cell],
      activeCellIndex: 0,
      paneCount: 1,
    });

    expect(model.panes[0]?.drawings.map((d) => d.id)).toEqual(['high', 'low']);
  });

  it('uses live overlays for the active pane when provided', () => {
    const cell = {
      ...DEFAULT_CELL,
      drawings: [
        {
          id: 'stale',
          name: 'trend_line',
          label: 'Stale',
          points: [],
          visible: true,
          locked: false,
          zLevel: 0,
        },
      ],
    };

    const model = buildObjectTreeLayoutModel({
      cells: [cell],
      activeCellIndex: 0,
      paneCount: 1,
      activeCellIndexForOverlays: 0,
      activeOverlays: [
        {
          id: 'live',
          name: 'trend_line',
          label: 'Live',
          visible: true,
          locked: false,
          zLevel: 2,
          paneId: 'price',
        },
      ],
    });

    expect(model.panes[0]?.drawings.map((d) => d.id)).toEqual(['live']);
  });
});

describe('objectTreeModel patch helpers', () => {
  it('patches indicator visibility', () => {
    const cell = {
      ...DEFAULT_CELL,
      indicators: [
        {
          id: 'ma1',
          name: 'MA',
          pane: 'main' as const,
          params: { period: 20 },
          visible: true,
        },
      ],
    };

    const next = patchCellIndicator(cell, 'ma1', { visible: false });
    expect(next.indicators[0]?.visible).toBe(false);
  });

  it('removes drawings and bumps z-level forward', () => {
    const cell = {
      ...DEFAULT_CELL,
      drawings: [
        {
          id: 'd1',
          name: 'trend_line',
          label: 'One',
          points: [],
          visible: true,
          locked: false,
          zLevel: 1,
        },
        {
          id: 'd2',
          name: 'trend_line',
          label: 'Two',
          points: [],
          visible: true,
          locked: false,
          zLevel: 2,
        },
      ],
    };

    expect(removeCellDrawing(cell, 'd1').drawings).toHaveLength(1);
    expect(bringCellDrawingForward(cell, 'd1').drawings[0]?.zLevel).toBe(3);
  });
});
