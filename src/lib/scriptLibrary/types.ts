import type { ScriptManifest } from "@edge/chart-core";
import {
  SCRIPT_LANGUAGE_VERSION,
  SCRIPT_SDK_VERSION,
} from "@edge/chart-core";

export const SCRIPT_LIBRARY_STORAGE_KEY = "edge:script-library:v1";
export const SCRIPT_LIBRARY_IDB_NAME = "edge-script-library";
export const SCRIPT_LIBRARY_IDB_STORE = "library";
export const SCRIPT_LIBRARY_IDB_KEY = "state";

export const MAX_SCRIPTS = 50;
export const MAX_REVISIONS_PER_SCRIPT = 10;

export type ScriptRevisionRecord = {
  revision: string;
  source: string;
  languageVersion: typeof SCRIPT_LANGUAGE_VERSION;
  sdkVersion: typeof SCRIPT_SDK_VERSION;
  manifest?: ScriptManifest;
  artifactHash?: string;
  compiledAt?: number;
  compileOk: boolean;
};

export type ScriptDraft = {
  source: string;
  updatedAt: number;
  dirty: boolean;
  manifest?: ScriptManifest;
};

export type ScriptLibraryEntry = {
  scriptId: string;
  displayName: string;
  createdAt: number;
  updatedAt: number;
  headRevision: string | null;
  draft?: ScriptDraft;
  revisions: ScriptRevisionRecord[];
};

export type ScriptLibraryState = {
  version: 1;
  scripts: ScriptLibraryEntry[];
  corrupt?: boolean;
};

export const DEFAULT_SCRIPT_LIBRARY_STATE: ScriptLibraryState = {
  version: 1,
  scripts: [],
};

export const DEFAULT_SCRIPT_TEMPLATE = `function edgeScript() {
  return {
    name: "My Indicator",
    pane: "main",
    inputs: {
      period: { kind: "number", label: "Period", default: 20, min: 1 },
    },
    calculate(candles, inputs, ta) {
      const mid = candles.map((c) => (c.h + c.l) / 2);
      return { midpoint: ta.sma(mid, inputs.period) };
    },
    plots: {
      midpoint: { kind: "line", title: "Midpoint", color: "#4ade80" },
    },
  };
}
edgeScript();
`;

export function scriptInstanceNameForScript(scriptId: string): string {
  return `__script_${scriptId.replace(/-/g, "_")}`;
}
