import type { SerializedDrawing } from './contracts';
import type { DrawingPoint } from './drawingCoords';
import type { DrawingPlugin } from './plugin-api';
import { DrawingRegistry } from './pluginHost';
import { nextZLevel } from './drawings/primitives';

export type DrawingFsmState =
  | 'idle'
  | 'tool_armed'
  | 'placing'
  | 'selected'
  | 'dragging_cp'
  | 'dragging_drawing';

export type DrawingMode = 'navigate' | 'create' | 'edit';

export type DrawingPointerPhase = 'down' | 'move' | 'up';

export type DrawingPointerEvent = {
  phase: DrawingPointerPhase;
  plotX: number;
  plotY: number;
  button: number;
  /** Native click count (2 = second leg of double-click). */
  detail?: number;
  shiftKey?: boolean;
  paneId?: string;
};

export type DrawingControllerState = {
  fsm: DrawingFsmState;
  activeTool: string | null;
  selectedId: string | null;
  placingDraft: SerializedDrawing | null;
  placingStep: number;
  draggingCpIndex: number;
  draggingDrawingId: string | null;
};

export function initialDrawingState(): DrawingControllerState {
  return {
    fsm: 'idle',
    activeTool: null,
    selectedId: null,
    placingDraft: null,
    placingStep: 0,
    draggingCpIndex: -1,
    draggingDrawingId: null,
  };
}

export function drawingModeFromState(state: DrawingControllerState): DrawingMode {
  if (state.fsm === 'idle' || state.fsm === 'selected') return 'navigate';
  if (state.fsm === 'dragging_cp' || state.fsm === 'dragging_drawing') return 'edit';
  return 'create';
}

export function shouldHideCrosshair(state: DrawingControllerState): boolean {
  return (
    state.fsm === 'tool_armed' ||
    state.fsm === 'placing' ||
    state.fsm === 'dragging_cp' ||
    state.fsm === 'dragging_drawing'
  );
}

export function shouldSuppressPan(state: DrawingControllerState): boolean {
  return (
    state.fsm === 'tool_armed' ||
    state.fsm === 'placing' ||
    state.fsm === 'dragging_cp' ||
    state.fsm === 'dragging_drawing'
  );
}

export function armTool(state: DrawingControllerState, toolName: string): DrawingControllerState {
  return {
    ...initialDrawingState(),
    fsm: 'tool_armed',
    activeTool: toolName,
  };
}

export function disarmTool(state: DrawingControllerState): DrawingControllerState {
  return { ...initialDrawingState() };
}

export function selectDrawing(state: DrawingControllerState, id: string | null): DrawingControllerState {
  if (!id) {
    return { ...state, fsm: state.activeTool ? 'tool_armed' : 'idle', selectedId: null };
  }
  return {
    ...state,
    fsm: 'selected',
    selectedId: id,
    activeTool: null,
    placingDraft: null,
  };
}

export function cancelPlacing(state: DrawingControllerState): DrawingControllerState {
  return {
    ...state,
    fsm: state.activeTool ? 'tool_armed' : 'idle',
    placingDraft: null,
    placingStep: 0,
  };
}

export function startPlacing(
  state: DrawingControllerState,
  draft: SerializedDrawing
): DrawingControllerState {
  return { ...state, fsm: 'placing', placingDraft: draft, placingStep: 1 };
}

export function commitDrawing(
  state: DrawingControllerState,
  drawing: SerializedDrawing,
  existing: SerializedDrawing[]
): { state: DrawingControllerState; drawing: SerializedDrawing } {
  const withZ = { ...drawing, zLevel: nextZLevel(existing) };
  return {
    state: {
      ...state,
      fsm: state.activeTool ? 'tool_armed' : 'idle',
      placingDraft: null,
      placingStep: 0,
      selectedId: null,
    },
    drawing: withZ,
  };
}

export function getPluginForTool(toolName: string): DrawingPlugin | undefined {
  return DrawingRegistry.get(toolName);
}

export function createDraftFromPoint(
  toolName: string,
  point: DrawingPoint,
  vp: import('./contracts').VisibleRange,
  candles: import('./contracts').Candle[]
): SerializedDrawing | null {
  const plugin = getPluginForTool(toolName);
  if (!plugin) return null;
  return plugin.create(point, vp, candles);
}

export function isOnePointTool(toolName: string): boolean {
  const plugin = getPluginForTool(toolName);
  return plugin?.placement === 'one-point';
}

export function isTwoPointTool(toolName: string): boolean {
  const plugin = getPluginForTool(toolName);
  return plugin?.placement === 'two-point';
}

export function isMultiPointTool(toolName: string): boolean {
  const plugin = getPluginForTool(toolName);
  return plugin?.placement === 'multi-point';
}

export function isDraftComplete(
  plugin: DrawingPlugin,
  draft: SerializedDrawing
): boolean {
  if (plugin.isPlacementComplete?.(draft)) return true;
  const max = plugin.maxControlPoints ?? 2;
  return draft.points.length >= max;
}

/** Variable-N plugins (e.g. polylines) expose isPlacementComplete for open-ended placement. */
export function supportsDoubleClickFinish(plugin: DrawingPlugin): boolean {
  return typeof plugin.isPlacementComplete === 'function';
}

/** Second mousedown of a double-click — finish without appending another CP. */
export function isDoubleClickFinish(event: DrawingPointerEvent): boolean {
  return event.detail === 2;
}

/**
 * Commit placing draft when complete (max CPs or isPlacementComplete).
 * Shared by click-advance and double-click finish stub.
 */
export function finishPlacingIfComplete(
  state: DrawingControllerState,
  plugin: DrawingPlugin,
  draft: SerializedDrawing,
  existing: SerializedDrawing[],
  ctx?: { vp: import('./contracts').VisibleRange; candles: import('./contracts').Candle[] }
): { state: DrawingControllerState; drawing: SerializedDrawing } | null {
  if (state.fsm !== 'placing') return null;
  if (!isDraftComplete(plugin, draft)) return null;
  let finalDraft = draft;
  if (plugin.finalize && ctx) {
    finalDraft = plugin.finalize(draft, ctx.vp, ctx.candles);
  }
  return commitDrawing(state, finalDraft, existing);
}

export function advancePlacing(
  state: DrawingControllerState,
  draft: SerializedDrawing
): DrawingControllerState {
  return {
    ...state,
    placingDraft: draft,
    placingStep: state.placingStep + 1,
  };
}

export function startDraggingCp(
  state: DrawingControllerState,
  drawingId: string,
  cpIndex: number
): DrawingControllerState {
  return {
    ...state,
    fsm: 'dragging_cp',
    draggingDrawingId: drawingId,
    draggingCpIndex: cpIndex,
    selectedId: drawingId,
  };
}

export function stopDraggingCp(state: DrawingControllerState): DrawingControllerState {
  return {
    ...state,
    fsm: 'selected',
    draggingCpIndex: -1,
    draggingDrawingId: null,
  };
}

export function startDraggingDrawing(
  state: DrawingControllerState,
  drawingId: string
): DrawingControllerState {
  return {
    ...state,
    fsm: 'dragging_drawing',
    draggingDrawingId: drawingId,
    draggingCpIndex: -1,
    selectedId: drawingId,
    activeTool: null,
    placingDraft: null,
  };
}

export function stopDraggingDrawing(state: DrawingControllerState): DrawingControllerState {
  return {
    ...state,
    fsm: 'selected',
    draggingDrawingId: null,
    draggingCpIndex: -1,
  };
}

export function newDrawingId(): string {
  return `d${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
