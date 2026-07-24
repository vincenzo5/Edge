import {
  GOLDEN_SCRIPT_FIXTURE_IDS,
  GOLDEN_SCRIPT_FIXTURE_REVISION,
  SCRIPT_FIXTURES,
  scriptInstanceNameForFixture,
  type GoldenScriptFixtureId,
} from "@edge/chart-core";
import {
  createScriptIndicatorInstance,
  type CellConfig,
  type IndicatorConfig,
} from "@/lib/chartConfig";

/** Dev-only gate: `?scriptFixture=all` or `NEXT_PUBLIC_SCRIPT_FIXTURE=1`. */
export function isScriptFixtureDevEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("scriptFixture") === "all" || params.get("scriptFixture") === "1") {
    return true;
  }
  return process.env.NEXT_PUBLIC_SCRIPT_FIXTURE === "1";
}

export function buildGoldenScriptFixtureInstances(): IndicatorConfig[] {
  return GOLDEN_SCRIPT_FIXTURE_IDS.map((scriptId: GoldenScriptFixtureId) => {
    const fixture = SCRIPT_FIXTURES[scriptId];
    const pane =
      scriptId === "histogram-macd-style" ||
      scriptId === "hline-rsi-style" ||
      scriptId === "plot-marker-signal" ||
      scriptId === "plot-bgcolor-band"
        ? "sub"
        : "main";
    return createScriptIndicatorInstance({
      scriptId,
      revision: GOLDEN_SCRIPT_FIXTURE_REVISION,
      name: scriptInstanceNameForFixture(scriptId),
      pane,
      inputs: fixture.defaultInputs as IndicatorConfig["inputs"],
    });
  });
}

export function injectScriptFixtures(config: CellConfig): CellConfig {
  if (!isScriptFixtureDevEnabled()) return config;

  const existingScriptIds = new Set(
    config.indicators.filter((ind) => ind.kind === "script").map((ind) => ind.scriptId),
  );

  const additions = buildGoldenScriptFixtureInstances().filter(
    (ind) => !existingScriptIds.has(ind.scriptId),
  );
  if (additions.length === 0) return config;

  return {
    ...config,
    indicators: [...config.indicators, ...additions],
  };
}
