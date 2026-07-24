import {
  DEFAULT_SCRIPT_RUNTIME_BUDGETS,
  SCRIPT_FIXTURES,
  SCRIPT_LANGUAGE_VERSION,
  SCRIPT_RUNTIME_ABI,
  SCRIPT_SDK_VERSION,
} from "@edge/chart-core";
import { FORBIDDEN_SOURCE_PATTERNS, HOST_TA_SDK } from "@edge/indicator-runtime";

const CURATED_FIXTURE_IDS = [
  "line-midpoint",
  "histogram-macd-style",
  "hline-rsi-style",
  "band-boll-style",
] as const;

export type ScriptAuthoringContext = {
  languageVersion: typeof SCRIPT_LANGUAGE_VERSION;
  sdkVersion: typeof SCRIPT_SDK_VERSION;
  runtimeAbi: typeof SCRIPT_RUNTIME_ABI;
  taHelpers: string[];
  examples: Array<{ id: string; description: string; source: string }>;
  budgets: {
    maxSourceBytes: number;
    maxExecuteMs: number;
    maxGuestMemoryBytes: number;
    maxOutputValues: number;
  };
  forbiddenConstructs: string[];
  authoringShape: string;
};

export function getScriptAuthoringContext(): ScriptAuthoringContext {
  return {
    languageVersion: SCRIPT_LANGUAGE_VERSION,
    sdkVersion: SCRIPT_SDK_VERSION,
    runtimeAbi: SCRIPT_RUNTIME_ABI,
    taHelpers: Object.keys(HOST_TA_SDK),
    examples: CURATED_FIXTURE_IDS.map((id) => {
      const fixture = SCRIPT_FIXTURES[id];
      return {
        id: fixture.id,
        description: fixture.description,
        source: fixture.source.trim(),
      };
    }),
    budgets: {
      maxSourceBytes: DEFAULT_SCRIPT_RUNTIME_BUDGETS.maxSourceBytes,
      maxExecuteMs: DEFAULT_SCRIPT_RUNTIME_BUDGETS.maxExecuteMs,
      maxGuestMemoryBytes: DEFAULT_SCRIPT_RUNTIME_BUDGETS.maxGuestMemoryBytes,
      maxOutputValues: DEFAULT_SCRIPT_RUNTIME_BUDGETS.maxOutputValues,
    },
    forbiddenConstructs: FORBIDDEN_SOURCE_PATTERNS.map(({ message }) => message),
    authoringShape:
      'function edgeScript() { return { name, pane: "main"|"sub", inputs, calculate(candles, inputs, ta, request?), plots }; } edgeScript(); ' +
      'Plot kinds: line, histogram, hline, band, marker, bgcolor, barcolor (main only). ' +
      'Styles on line/histogram: line, stepline, circles, crosses, area, columns. ' +
      'Marker plots require shape + location (absolute|aboveBar|belowBar). ' +
      'request.series({ symbol?, interval? }) returns aligned secondary candles (max 2 secondary series).',
  };
}
