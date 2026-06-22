import { describe, it, expect } from 'vitest';
import {
  isDraftComplete,
  advancePlacing,
  startPlacing,
  armTool,
  initialDrawingState,
  createDraftFromPoint,
  commitDrawing,
  finishPlacingIfComplete,
  isDoubleClickFinish,
  supportsDoubleClickFinish,
} from './drawingController';
import { createViewport } from './viewport';
import { parallelChannel } from './drawings/channels';
import { updateTwoPointPreview, appendPointPreview } from './drawings/drawingUtils';
import type { Candle, SerializedDrawing } from './contracts';
import type { DrawingPlugin } from './plugin-api';

const candles: Candle[] = [
  { t: 1000, o: 100, h: 110, l: 90, c: 105 },
  { t: 2000, o: 105, h: 115, l: 95, c: 110 },
  { t: 3000, o: 110, h: 120, l: 100, c: 115 },
];

function draftWithPoints(count: number): SerializedDrawing {
  const points = Array.from({ length: count }, (_, i) => ({
    timestamp: 1000 + i * 1000,
    value: 100 + i,
    dataIndex: i,
  }));
  return {
    name: 'parallel_channel',
    label: 'Parallel Channel',
    points,
    visible: true,
    locked: false,
    zLevel: 0,
  };
}

describe('drawing placement completeness', () => {
  it('parallel_channel incomplete with 2 points', () => {
    expect(isDraftComplete(parallelChannel, draftWithPoints(2))).toBe(false);
  });

  it('parallel_channel complete with 3 points', () => {
    expect(isDraftComplete(parallelChannel, draftWithPoints(3))).toBe(true);
  });

  it('advancePlacing increments placingStep', () => {
    let s = armTool(initialDrawingState(), 'parallelStraightLine');
    const draft = draftWithPoints(2);
    s = startPlacing(s, draft);
    expect(s.placingStep).toBe(1);
    s = advancePlacing(s, draft);
    expect(s.placingStep).toBe(2);
  });

  it('parallel_channel commits only after 3 clicks', () => {
    const vp = createViewport(candles, 800, 400, 3, 0);
    const p1 = { timestamp: 1000, value: 100, dataIndex: 0 };
    const p2 = { timestamp: 2000, value: 110, dataIndex: 1 };
    const p3 = { timestamp: 2500, value: 105, dataIndex: 1 };

    let s = armTool(initialDrawingState(), 'parallelStraightLine');
    let draft = createDraftFromPoint('parallelStraightLine', p1, vp, candles)!;
    s = startPlacing(s, draft);
    expect(s.placingStep).toBe(1);
    expect(isDraftComplete(parallelChannel, draft)).toBe(false);

    draft = updateTwoPointPreview(draft, p2);
    expect(isDraftComplete(parallelChannel, draft)).toBe(false);
    s = advancePlacing(s, draft);
    expect(s.placingStep).toBe(2);

    draft = parallelChannel.updatePreview!(draft, p3, vp, candles);
    expect(isDraftComplete(parallelChannel, draft)).toBe(true);
    expect(draft.points).toHaveLength(3);

    const { state, drawing } = commitDrawing(s, draft, []);
    expect(drawing.points).toHaveLength(3);
    expect(state.placingStep).toBe(0);
    expect(state.fsm).toBe('tool_armed');
  });
});

const polylineStub: DrawingPlugin = {
  name: 'polyline_stub',
  placement: 'multi-point',
  maxControlPoints: 99,
  isPlacementComplete: (draft) => draft.points.length >= 3,
  create: (start) => ({
    name: 'polyline_stub',
    label: 'Polyline',
    points: [{ ...start }],
    visible: true,
    locked: false,
    zLevel: 0,
  }),
  draw: () => {},
  hitTest: () => false,
};

describe('variable-N placement (isPlacementComplete)', () => {
  it('isDraftComplete defers to isPlacementComplete over maxControlPoints', () => {
    const draft = draftWithPoints(2);
    draft.name = 'polyline_stub';
    expect(isDraftComplete(polylineStub, draft)).toBe(false);
    expect(isDraftComplete(polylineStub, draftWithPoints(3))).toBe(true);
  });

  it('supportsDoubleClickFinish only when plugin defines isPlacementComplete', () => {
    expect(supportsDoubleClickFinish(polylineStub)).toBe(true);
    expect(supportsDoubleClickFinish(parallelChannel)).toBe(false);
  });

  it('isDoubleClickFinish detects detail === 2', () => {
    expect(isDoubleClickFinish({ phase: 'down', plotX: 0, plotY: 0, button: 0, detail: 1 })).toBe(
      false
    );
    expect(isDoubleClickFinish({ phase: 'down', plotX: 0, plotY: 0, button: 0, detail: 2 })).toBe(
      true
    );
  });

  it('finishPlacingIfComplete commits when isPlacementComplete is true', () => {
    let s = armTool(initialDrawingState(), 'polyline_stub');
    const draft = draftWithPoints(3);
    draft.name = 'polyline_stub';
    s = startPlacing(s, draft);
    const result = finishPlacingIfComplete(s, polylineStub, draft, []);
    expect(result).not.toBeNull();
    expect(result!.drawing.points).toHaveLength(3);
    expect(result!.state.placingDraft).toBeNull();
    expect(result!.state.fsm).toBe('tool_armed');
  });

  it('finishPlacingIfComplete returns null when placement incomplete', () => {
    let s = armTool(initialDrawingState(), 'polyline_stub');
    const draft = draftWithPoints(2);
    draft.name = 'polyline_stub';
    s = startPlacing(s, draft);
    expect(finishPlacingIfComplete(s, polylineStub, draft, [])).toBeNull();
  });

  it('appendPointPreview appends a fixed control point', () => {
    const base = draftWithPoints(1);
    const next = { timestamp: 3000, value: 103, dataIndex: 2 };
    const updated = appendPointPreview(base, next);
    expect(updated.points).toHaveLength(2);
    expect(updated.points[1]).toEqual(next);
  });
});
