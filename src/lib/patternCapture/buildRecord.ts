import type { OhlcvBar, PatternCapture, PatternRecord, PatternSection } from "../patternLibrary/types";
import { extractOhlcvFeatures } from "../patternLibrary/features";
import {
  DEFAULT_LEFT_PADDING,
  DEFAULT_RIGHT_PADDING,
  buildPaddedRenderBars,
  sectionExtremes,
  slicePatternOhlcv,
  timestampToIso,
} from "./slice";
import type { CaptureState } from "./fsm";

export { SECTION_LABEL_PRESETS, presetAtIndex } from "./presets";
export type { SectionLabelPreset } from "./presets";

export type BuildRecordInput = {
  state: CaptureState;
  allBars: OhlcvBar[];
  symbol: string;
  timeframe: string;
  interval: string;
  range?: string;
  sourceCellId?: string;
  setupFamilyId?: string;
  quality?: 1 | 2 | 3 | 4 | 5;
  decision?: "take" | "pass";
  thesis?: string;
  indicatorsSnapshot?: PatternCapture["indicatorsSnapshot"];
  padding?: { left: number; right: number };
};

export type BuildRecordResult = {
  record: PatternRecord;
  renderBars: OhlcvBar[];
  leftPaddingApplied: number;
};

function newCaptureId(symbol: string, endTimestamp: number): string {
  const safe = symbol.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  return `capture-${safe}-${endTimestamp}`;
}

export function patternBoundsFromSections(sections: PatternSection[]): {
  startBar: number;
  endBar: number;
  startTimestamp: number;
  endTimestamp: number;
} {
  if (sections.length === 0) {
    throw new Error("Need at least one labeled section");
  }
  let startBar = sections[0]!.fromBar;
  let endBar = sections[0]!.toBar;
  let startTimestamp = sections[0]!.fromTimestamp;
  let endTimestamp = sections[0]!.toTimestamp;

  for (const section of sections.slice(1)) {
    if (section.fromBar < startBar) {
      startBar = section.fromBar;
      startTimestamp = section.fromTimestamp;
    }
    if (section.toBar > endBar) {
      endBar = section.toBar;
      endTimestamp = section.toTimestamp;
    }
  }

  return { startBar, endBar, startTimestamp, endTimestamp };
}

export function buildPatternRecordFromCapture(input: BuildRecordInput): BuildRecordResult {
  const { state, allBars } = input;
  if (state.sections.length === 0) {
    throw new Error("Need at least one labeled section");
  }
  if (!state.sections.every((s) => s.label.trim().length > 0)) {
    throw new Error("All sections must be labeled before save");
  }

  const { startBar, endBar, startTimestamp, endTimestamp } =
    patternBoundsFromSections(state.sections);
  const padding = input.padding ?? {
    left: DEFAULT_LEFT_PADDING,
    right: DEFAULT_RIGHT_PADDING,
  };

  const ohlcv = slicePatternOhlcv(allBars, startBar, endBar);
  const { renderBars, leftPaddingApplied } = buildPaddedRenderBars(
    allBars,
    startBar,
    endBar,
    padding,
  );

  const sections = state.sections.map((section) => {
    const { high, low } = sectionExtremes(allBars, section.fromBar, section.toBar);
    return { ...section, high, low };
  });

  const features = extractOhlcvFeatures(ohlcv);
  const last = ohlcv[ohlcv.length - 1]!;
  const capturedAt = new Date().toISOString();
  const asOf = timestampToIso(endTimestamp);

  const capture: PatternCapture = {
    patternStart: {
      barIndex: startBar,
      timestamp: startTimestamp,
    },
    patternEnd: {
      barIndex: endBar,
      timestamp: endTimestamp,
    },
    sections,
    paddingBars: padding,
    interval: input.interval,
    range: input.range,
    indicatorsSnapshot: input.indicatorsSnapshot,
    sourceCellId: input.sourceCellId,
    capturedAt,
  };

  const thesis =
    input.thesis ??
    sections.map((s) => s.label).join(" → ");

  const recordId = newCaptureId(input.symbol, endTimestamp);

  const record: PatternRecord = {
    id: recordId,
    asOf,
    symbol: input.symbol,
    timeframe: input.timeframe,
    barWindow: ohlcv.length,
    setupFamilyId: input.setupFamilyId ?? "unclassified",
    quality: input.quality ?? 3,
    decision: input.decision ?? "take",
    regime:
      features.trendSlope > 0
        ? "uptrend"
        : features.trendSlope < 0
          ? "downtrend"
          : "range",
    plan: {
      direction: "long",
      entry: last.close,
      stop: last.low - features.atr14 * 0.5,
      targets: [last.close + features.atr14 * 2],
      thesis,
    },
    outcome: {
      resolved: false,
      win: null,
      rMultiple: null,
      mfe: null,
      mae: null,
      holdBars: null,
    },
    ohlcv,
    chartStyleId: "edge-frozen-v1",
    chartSvgPath: `records/${recordId}.svg`,
    capture,
  };

  return { record, renderBars, leftPaddingApplied };
}
