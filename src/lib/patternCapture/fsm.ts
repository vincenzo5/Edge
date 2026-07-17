import type { PatternSection } from "../patternLibrary/types";
import { presetAtIndex } from "./presets";

export type CapturePhase =
  | "idle"
  | "capturing"
  | "labeling"
  | "ready_to_save"
  | "saving";

export type CaptureAnchor = {
  barIndex: number;
  timestamp: number;
  /** Overlay-local dot position (% from left of chart cell). */
  markerLeftPct: number;
  /** Overlay-local dot position (px from top of chart cell). */
  markerTopPx: number;
};

export type CaptureState = {
  phase: CapturePhase;
  pendingStart: CaptureAnchor | null;
  pendingEnd: CaptureAnchor | null;
  sections: PatternSection[];
  /** One entry per bar click — drives immediate dot markers. */
  clickDots: CaptureAnchor[];
  labelDraft: string;
  labelingSectionIndex: number | null;
  error: string | null;
};

export const INITIAL_CAPTURE_STATE: CaptureState = {
  phase: "idle",
  pendingStart: null,
  pendingEnd: null,
  sections: [],
  clickDots: [],
  labelDraft: "",
  labelingSectionIndex: null,
  error: null,
};

export type CaptureEvent =
  | { type: "ENTER" }
  | { type: "CANCEL" }
  | { type: "CLICK_BAR"; anchor: CaptureAnchor }
  | { type: "SET_LABEL_DRAFT"; label: string }
  | { type: "CONFIRM_LABEL" }
  | { type: "PICK_PRESET"; index: number }
  | { type: "UNDO" }
  | { type: "REQUEST_SAVE" }
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS" }
  | { type: "SAVE_ERROR"; message: string };

function relabelSectionIds(sections: PatternSection[]): PatternSection[] {
  return sections.map((section, index) => ({
    ...section,
    id: `section-${index + 1}`,
  }));
}

function draftSection(
  from: CaptureAnchor,
  to: CaptureAnchor,
  index: number,
): PatternSection {
  return {
    id: `section-${index + 1}`,
    label: "",
    fromBar: from.barIndex,
    toBar: to.barIndex,
    fromTimestamp: from.timestamp,
    toTimestamp: to.timestamp,
  };
}

function lastSectionEndBar(state: CaptureState): number | null {
  const last = state.sections[state.sections.length - 1];
  return last?.toBar ?? null;
}

function commitSection(state: CaptureState, label: string): CaptureState {
  if (state.phase !== "labeling" || !state.pendingStart || !state.pendingEnd) {
    return state;
  }
  const trimmed = label.trim();
  if (!trimmed) {
    return { ...state, error: "Section label is required." };
  }
  const index = state.sections.length;
  const section = {
    ...draftSection(state.pendingStart, state.pendingEnd, index),
    label: trimmed,
  };
  return {
    ...state,
    phase: "ready_to_save",
    sections: relabelSectionIds([...state.sections, section]),
    pendingStart: null,
    pendingEnd: null,
    labelDraft: "",
    labelingSectionIndex: null,
    error: null,
  };
}

export function captureMarkerBars(state: CaptureState): CaptureAnchor[] {
  return state.clickDots;
}

function appendClickDot(state: CaptureState, anchor: CaptureAnchor): CaptureAnchor[] {
  return [...state.clickDots, anchor];
}

function popClickDot(state: CaptureState): CaptureAnchor[] {
  return state.clickDots.slice(0, -1);
}

export function canSaveCapture(state: CaptureState): boolean {
  return (
    state.sections.length >= 1 &&
    state.phase === "ready_to_save" &&
    state.pendingStart == null &&
    state.pendingEnd == null
  );
}

export function canUndoCapture(state: CaptureState): boolean {
  if (state.phase === "idle" || state.phase === "saving") return false;
  return (
    state.sections.length > 0 ||
    state.pendingStart != null ||
    state.pendingEnd != null ||
    state.phase === "labeling"
  );
}

export function isCaptureActive(state: CaptureState): boolean {
  return state.phase !== "idle";
}

export function reduceCaptureState(
  state: CaptureState,
  event: CaptureEvent,
): CaptureState {
  switch (event.type) {
    case "ENTER":
      if (state.phase !== "idle") {
        return { ...INITIAL_CAPTURE_STATE, phase: "capturing" };
      }
      return { ...INITIAL_CAPTURE_STATE, phase: "capturing" };

    case "CANCEL":
      return { ...INITIAL_CAPTURE_STATE };

    case "CLICK_BAR": {
      if (state.phase !== "capturing" && state.phase !== "ready_to_save") {
        return state;
      }

      if (state.pendingStart == null) {
        const lastEnd = lastSectionEndBar(state);
        if (lastEnd != null && event.anchor.barIndex < lastEnd) {
          return {
            ...state,
            phase: state.sections.length > 0 ? "ready_to_save" : "capturing",
            error: "Pick a start bar at or after the previous section end.",
          };
        }
        return {
          ...state,
          phase: "capturing",
          pendingStart: event.anchor,
          clickDots: appendClickDot(state, event.anchor),
          error: null,
        };
      }

      if (event.anchor.barIndex < state.pendingStart.barIndex) {
        return {
          ...state,
          error: "Pick an end bar at or after the section start.",
        };
      }

      const labelingSectionIndex = state.sections.length;
      return {
        ...state,
        phase: "labeling",
        pendingEnd: event.anchor,
        clickDots: appendClickDot(state, event.anchor),
        labelingSectionIndex,
        labelDraft: "",
        error: null,
      };
    }

    case "SET_LABEL_DRAFT":
      if (state.phase !== "labeling") return state;
      return { ...state, labelDraft: event.label, error: null };

    case "CONFIRM_LABEL":
      return commitSection(state, state.labelDraft);

    case "PICK_PRESET": {
      if (state.phase !== "labeling") return state;
      const preset = presetAtIndex(event.index);
      if (!preset) return state;
      return commitSection(state, preset);
    }

    case "UNDO": {
      if (state.phase === "idle" || state.phase === "saving") return state;

      if (state.phase === "labeling") {
        return {
          ...state,
          phase: "capturing",
          pendingEnd: null,
          clickDots: popClickDot(state),
          labelDraft: "",
          labelingSectionIndex: null,
          error: null,
        };
      }

      if (state.pendingStart != null) {
        return {
          ...state,
          phase: state.sections.length > 0 ? "ready_to_save" : "capturing",
          pendingStart: null,
          clickDots: popClickDot(state),
          error: null,
        };
      }

      if (state.sections.length === 0) {
        return { ...INITIAL_CAPTURE_STATE, phase: "capturing" };
      }

      const sections = state.sections.slice(0, -1);
      return {
        ...state,
        phase: sections.length > 0 ? "ready_to_save" : "capturing",
        sections: relabelSectionIds(sections),
        clickDots: state.clickDots.slice(0, Math.max(0, state.clickDots.length - 2)),
        error: null,
      };
    }

    case "REQUEST_SAVE":
      if (!canSaveCapture(state)) {
        return {
          ...state,
          error: "Add at least one labeled section before saving.",
        };
      }
      return { ...state, phase: "saving", error: null };

    case "SAVE_START":
      return { ...state, phase: "saving", error: null };

    case "SAVE_SUCCESS":
      return { ...INITIAL_CAPTURE_STATE };

    case "SAVE_ERROR":
      return {
        ...state,
        phase: "ready_to_save",
        error: event.message,
      };

    default:
      return state;
  }
}
