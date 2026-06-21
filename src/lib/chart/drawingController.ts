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
  | 'dragging_cp';

export type DrawingMode = 'navigate' | 'create' | 'edit';

export type DrawingPointerPhase = 'down' | 'move' | 'up';

export type DrawingPointerEvent = {
  phase: DrawingPointerPhase;
  plotX: number;
  plotY: number;
  button: number;
};

export type DrawingControllerState = {
  fsm: DrawingFsmState;
  activeTool: string | null;
  selectedId: string | null;
  placingDraft: SerializedDrawing | null;
  draggingCpIndex: number;
  draggingDrawingId: string | null;
};

export function initialDrawingState(): DrawingControllerState {
  return {
    fsm: 'idle',
    activeTool: null,
    selectedId: null,
    placingDraft: null,
    draggingCpIndex: -1,
    draggingDrawingId: null,
  };
}

export function drawingModeFromState(state: DrawingControllerState): DrawingMode {
  if (state.fsm === 'idle' || state.fsm === 'selected') return 'navigate';
  if (state.fsm === 'dragging_cp') return 'edit';
  return 'create';
}

export function shouldHideCrosshair(state: DrawingControllerState): boolean {
  return state.fsm === 'tool_armed' || state.fsm === 'placing' || state.fsm === 'dragging_cp';
}

export function shouldSuppressPan(state: DrawingControllerState): boolean {
  return state.fsm === 'tool_armed' || state.fsm === 'placing' || state.fsm === 'dragging_cp';
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
  };
}

export function startPlacing(
  state: DrawingControllerState,
  draft: SerializedDrawing
): DrawingControllerState {
  return { ...state, fsm: 'placing', placingDraft: draft };
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
  return plugin?.placement === 'two-point' || plugin?.placement === 'multi-point';
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

export function newDrawingId(): string {
  return `d${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
