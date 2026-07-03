import { describe, it, expect } from 'vitest';
import {
  initialDrawingState,
  armTool,
  disarmTool,
  startPlacing,
  cancelPlacing,
  commitDrawing,
  selectDrawing,
  drawingModeFromState,
  shouldHideCrosshair,
  createDraftFromPoint,
  advancePlacing,
} from './drawingController';
import { createViewport } from './viewport';
import type { Candle } from './contracts';

const candles: Candle[] = [
  { t: 1000, o: 100, h: 110, l: 90, c: 105 },
  { t: 2000, o: 105, h: 115, l: 95, c: 110 },
];

describe('drawingController FSM', () => {
  it('arms tool from idle', () => {
    let s = initialDrawingState();
    s = armTool(s, 'straightLine');
    expect(s.fsm).toBe('tool_armed');
    expect(s.activeTool).toBe('straightLine');
  });

  it('disarm returns to idle', () => {
    let s = armTool(initialDrawingState(), 'straightLine');
    s = disarmTool(s);
    expect(s.fsm).toBe('idle');
  });

  it('placing then cancel returns to tool_armed and clears placingStep', () => {
    const vp = createViewport(candles, 800, 400, 2, 0);
    let s = armTool(initialDrawingState(), 'straightLine');
    const draft = createDraftFromPoint('straightLine', { timestamp: 1000, value: 100, dataIndex: 0 }, vp, candles)!;
    s = startPlacing(s, draft);
    expect(s.fsm).toBe('placing');
    expect(s.placingStep).toBe(1);
    s = advancePlacing(s, draft);
    expect(s.placingStep).toBe(2);
    s = cancelPlacing(s);
    expect(s.fsm).toBe('tool_armed');
    expect(s.placingDraft).toBeNull();
    expect(s.placingStep).toBe(0);
  });

  it('commit stays in tool_armed when tool active', () => {
    const vp = createViewport(candles, 800, 400, 2, 0);
    let s = armTool(initialDrawingState(), 'straightLine');
    const draft = createDraftFromPoint('straightLine', { timestamp: 1000, value: 100, dataIndex: 0 }, vp, candles)!;
    draft.id = 'd1';
    const { state } = commitDrawing(s, draft, []);
    expect(state.fsm).toBe('tool_armed');
  });

  it('select drawing clears active tool', () => {
    let s = armTool(initialDrawingState(), 'straightLine');
    s = selectDrawing(s, 'd1');
    expect(s.fsm).toBe('selected');
    expect(s.activeTool).toBeNull();
  });

  it('drawingMode and crosshair hide flags', () => {
    expect(drawingModeFromState(initialDrawingState())).toBe('navigate');
    const armed = armTool(initialDrawingState(), 'straightLine');
    expect(drawingModeFromState(armed)).toBe('create');
    expect(shouldHideCrosshair(armed)).toBe(true);
  });

  it('shift+click ruler path uses armTool + startPlacing', () => {
    const vp = createViewport(candles, 800, 400, 2, 0);
    let s = initialDrawingState();
    s = startPlacing(armTool(s, 'ruler'), {
      name: 'ruler',
      label: 'Ruler',
      points: [
        { timestamp: 1000, value: 100, dataIndex: 0 },
        { timestamp: 1000, value: 100, dataIndex: 0 },
      ],
      visible: true,
      locked: false,
      zLevel: 0,
    });
    expect(s.fsm).toBe('placing');
    expect(s.activeTool).toBe('ruler');
    expect(s.placingDraft?.name).toBe('ruler');
  });
});
