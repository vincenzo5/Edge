import { describe, expect, it } from "vitest";
import {
  INITIAL_CAPTURE_STATE,
  canSaveCapture,
  canUndoCapture,
  reduceCaptureState,
} from "./fsm";
import {
  barBandStyle,
  barIndexFromClientX,
  barMarkerLeftPercent,
  buildPaddedRenderBars,
  resolveCaptureDotLayout,
  slicePatternOhlcv,
} from "./slice";
import { buildPatternRecordFromCapture, patternBoundsFromSections } from "./buildRecord";
import { SECTION_LABEL_PRESETS } from "./presets";
import type { OhlcvBar } from "../patternLibrary/types";

const bars: OhlcvBar[] = Array.from({ length: 20 }, (_, i) => ({
  timestamp: 1_700_000_000_000 + i * 60_000,
  open: 100 + i,
  high: 101 + i,
  low: 99 + i,
  close: 100.5 + i,
  volume: 1000 + i,
}));

function click(state: typeof INITIAL_CAPTURE_STATE, barIndex: number) {
  return reduceCaptureState(state, {
    type: "CLICK_BAR",
    anchor: {
      barIndex,
      timestamp: bars[barIndex]!.timestamp,
      markerLeftPct: 50,
      markerTopPx: 40,
    },
  });
}

function label(state: typeof INITIAL_CAPTURE_STATE, labelText: string) {
  let next = reduceCaptureState(state, { type: "SET_LABEL_DRAFT", label: labelText });
  next = reduceCaptureState(next, { type: "CONFIRM_LABEL" });
  return next;
}

function pickPreset(state: typeof INITIAL_CAPTURE_STATE, index: number) {
  return reduceCaptureState(state, { type: "PICK_PRESET", index });
}

describe("patternCapture fsm", () => {
  it("rejects section start before previous section end", () => {
    let state = reduceCaptureState(INITIAL_CAPTURE_STATE, { type: "ENTER" });
    state = click(state, 5);
    state = click(state, 8);
    state = label(state, "setup");
    state = click(state, 6);
    expect(state.error).toMatch(/after the previous section end/);
    expect(state.pendingStart).toBeNull();
  });

  it("records a click dot immediately on each bar click", () => {
    let state = reduceCaptureState(INITIAL_CAPTURE_STATE, { type: "ENTER" });
    state = click(state, 5);
    expect(state.clickDots).toHaveLength(1);
    expect(state.clickDots[0]?.barIndex).toBe(5);
    state = click(state, 8);
    expect(state.clickDots).toHaveLength(2);
    expect(state.clickDots[1]?.barIndex).toBe(8);
  });

  it("supports a 1-bar section when start and end share a bar", () => {
    let state = reduceCaptureState(INITIAL_CAPTURE_STATE, { type: "ENTER" });
    state = click(state, 5);
    state = click(state, 5);
    state = label(state, "trigger");
    expect(state.sections).toHaveLength(1);
    expect(state.sections[0]).toMatchObject({ fromBar: 5, toBar: 5, label: "trigger" });
    expect(canSaveCapture(state)).toBe(true);
  });

  it("supports adjacent 1-bar sections", () => {
    let state = reduceCaptureState(INITIAL_CAPTURE_STATE, { type: "ENTER" });
    state = click(state, 5);
    state = click(state, 5);
    state = label(state, "start");
    state = click(state, 6);
    state = click(state, 6);
    state = label(state, "outcome");
    expect(state.sections).toHaveLength(2);
    expect(state.sections[0]).toMatchObject({ fromBar: 5, toBar: 5 });
    expect(state.sections[1]).toMatchObject({ fromBar: 6, toBar: 6 });
    expect(canSaveCapture(state)).toBe(true);
  });

  it("allows gaps between sections", () => {
    let state = reduceCaptureState(INITIAL_CAPTURE_STATE, { type: "ENTER" });
    state = click(state, 4);
    state = click(state, 6);
    state = label(state, "setup");
    state = click(state, 10);
    state = click(state, 12);
    state = label(state, "outcome");
    expect(state.sections[1]).toMatchObject({ fromBar: 10, toBar: 12 });
    expect(canSaveCapture(state)).toBe(true);
  });

  it("labels each section and enables save", () => {
    let state = reduceCaptureState(INITIAL_CAPTURE_STATE, { type: "ENTER" });
    state = click(state, 4);
    state = click(state, 7);
    state = label(state, "setup");
    state = click(state, 8);
    state = click(state, 10);
    state = label(state, "outcome");
    expect(state.sections).toHaveLength(2);
    expect(canSaveCapture(state)).toBe(true);
  });

  it("confirms preset labels via PICK_PRESET", () => {
    let state = reduceCaptureState(INITIAL_CAPTURE_STATE, { type: "ENTER" });
    state = click(state, 3);
    state = click(state, 5);
    state = pickPreset(state, 2);
    expect(state.sections[0]?.label).toBe(SECTION_LABEL_PRESETS[1]);
    expect(state.phase).toBe("ready_to_save");
  });

  it("undo removes pending end while labeling", () => {
    let state = reduceCaptureState(INITIAL_CAPTURE_STATE, { type: "ENTER" });
    state = click(state, 4);
    state = click(state, 7);
    state = reduceCaptureState(state, { type: "UNDO" });
    expect(state.phase).toBe("capturing");
    expect(state.pendingStart).not.toBeNull();
    expect(state.pendingEnd).toBeNull();
    expect(state.sections).toHaveLength(0);
  });

  it("undo removes pending start while awaiting end", () => {
    let state = reduceCaptureState(INITIAL_CAPTURE_STATE, { type: "ENTER" });
    state = click(state, 4);
    state = reduceCaptureState(state, { type: "UNDO" });
    expect(state.pendingStart).toBeNull();
    expect(canUndoCapture(state)).toBe(false);
  });

  it("undo removes last committed section", () => {
    let state = reduceCaptureState(INITIAL_CAPTURE_STATE, { type: "ENTER" });
    state = click(state, 4);
    state = click(state, 7);
    state = label(state, "setup");
    state = reduceCaptureState(state, { type: "UNDO" });
    expect(state.sections).toHaveLength(0);
    expect(state.phase).toBe("capturing");
  });
});

describe("patternCapture slice layout", () => {
  const vp = {
    startIndex: 10,
    endIndex: 20,
    width: 800,
    xForIndex: (i: number) => ((i - 10) / 10) * 750,
    indexForX: (x: number) => 10 + Math.floor((x / 750) * 10),
  };

  it("maps client X through the chart viewport", () => {
    expect(barIndexFromClientX(375, 0, vp)).toBe(15);
  });

  it("positions markers within the plot area (not full container width)", () => {
    expect(barMarkerLeftPercent(10, vp)).toBe(0);
    expect(barMarkerLeftPercent(15, vp)).toBeCloseTo(46.875, 1);
  });

  it("sizes single-bar bands to one candle width", () => {
    const style = barBandStyle(12, 12, vp);
    expect(parseFloat(style.width)).toBeCloseTo(9.375, 1);
  });

  it("resolves dot layout relative to canvas within overlay", () => {
    const overlay = document.createElement("div");
    overlay.getBoundingClientRect = () =>
      ({ width: 800, height: 400, left: 0, top: 0, right: 800, bottom: 400 }) as DOMRect;
    const canvas = document.createElement("canvas");
    canvas.getBoundingClientRect = () =>
      ({ width: 800, height: 300, left: 0, top: 60, right: 800, bottom: 360 }) as DOMRect;
    overlay.appendChild(canvas);

    const layout = resolveCaptureDotLayout(15, overlay, vp);
    expect(layout).not.toBeNull();
    expect(layout!.markerTopPx).toBe(70);
    expect(layout!.markerLeftPct).toBeCloseTo(51.5625, 1);
  });
});

describe("patternCapture slice", () => {
  it("slices pattern ohlcv without look-ahead", () => {
    const slice = slicePatternOhlcv(bars, 5, 10);
    expect(slice).toHaveLength(6);
    expect(slice.at(-1)?.timestamp).toBe(bars[10]!.timestamp);
  });

  it("applies left padding only by default render bars", () => {
    const { renderBars, leftPaddingApplied } = buildPaddedRenderBars(bars, 8, 12, {
      left: 5,
      right: 0,
    });
    expect(leftPaddingApplied).toBe(5);
    expect(renderBars[0]?.timestamp).toBe(bars[3]!.timestamp);
    expect(renderBars.at(-1)?.timestamp).toBe(bars[12]!.timestamp);
  });
});

describe("buildPatternRecordFromCapture", () => {
  it("builds record with capture metadata from section bounds", () => {
    let state = reduceCaptureState(INITIAL_CAPTURE_STATE, { type: "ENTER" });
    state = click(state, 5);
    state = click(state, 8);
    state = label(state, "setup");
    state = click(state, 11);
    state = click(state, 11);
    state = label(state, "outcome");

    const built = buildPatternRecordFromCapture({
      state,
      allBars: bars,
      symbol: "AAPL",
      timeframe: "1h",
      interval: "1h",
    });

    expect(built.record.ohlcv).toHaveLength(7);
    expect(built.record.capture?.sections).toHaveLength(2);
    expect(built.record.capture?.patternStart.barIndex).toBe(5);
    expect(built.record.capture?.patternEnd.barIndex).toBe(11);
    expect(built.record.asOf).toBe(new Date(bars[11]!.timestamp).toISOString());
    expect(built.record.setupFamilyId).toBe("unclassified");
  });

  it("derives pattern bounds across gapped sections", () => {
    const bounds = patternBoundsFromSections([
      {
        id: "section-1",
        label: "setup",
        fromBar: 2,
        toBar: 4,
        fromTimestamp: bars[2]!.timestamp,
        toTimestamp: bars[4]!.timestamp,
      },
      {
        id: "section-2",
        label: "outcome",
        fromBar: 8,
        toBar: 8,
        fromTimestamp: bars[8]!.timestamp,
        toTimestamp: bars[8]!.timestamp,
      },
    ]);
    expect(bounds).toEqual({
      startBar: 2,
      endBar: 8,
      startTimestamp: bars[2]!.timestamp,
      endTimestamp: bars[8]!.timestamp,
    });
  });
});
