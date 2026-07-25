export type ChartPerfScenarioMetrics = {
  p50FrameMs?: number | null;
  p95FrameMs?: number | null;
  durationMs?: number;
};

export type ChartPerfScenario = {
  scenario: string;
  tag?: string | null;
  metrics: ChartPerfScenarioMetrics;
};

export type ChartPerfBaseline = {
  scenarios: ChartPerfScenario[];
};

export type ChartPerfBudgetBreach = {
  scenario: string;
  metric: "p50FrameMs" | "p95FrameMs";
  actual: number;
  limit: number;
};

export type ChartPerfBudgetConfig = {
  regressionFactor: number;
  strict: boolean;
};

export const DEFAULT_REGRESSION_FACTOR = 1.15;

export function readChartPerfBudgetConfig(env: NodeJS.ProcessEnv = process.env): ChartPerfBudgetConfig {
  const factorRaw = env.CHART_PERF_BUDGET_REGRESSION_FACTOR;
  const regressionFactor =
    factorRaw != null && factorRaw.trim() !== "" ? Number(factorRaw) : DEFAULT_REGRESSION_FACTOR;
  return {
    regressionFactor: Number.isFinite(regressionFactor) && regressionFactor > 0
      ? regressionFactor
      : DEFAULT_REGRESSION_FACTOR,
    strict: env.CHART_PERF_BUDGET_STRICT === "1" || env.CHART_PERF_BUDGET_STRICT === "true",
  };
}

function metricLimit(
  reference: ChartPerfScenarioMetrics,
  metric: "p50FrameMs" | "p95FrameMs",
  factor: number,
): number | null {
  const base = reference[metric];
  if (base == null || !Number.isFinite(base)) return null;
  return base * factor;
}

export function evaluateChartPerfBudgets(
  reference: ChartPerfBaseline,
  current: ChartPerfBaseline,
  config: ChartPerfBudgetConfig = readChartPerfBudgetConfig(),
): ChartPerfBudgetBreach[] {
  const referenceByScenario = new Map(
    reference.scenarios
      .filter((scenario) => scenario.tag === "resident-typical")
      .map((scenario) => [scenario.scenario, scenario] as const),
  );

  const breaches: ChartPerfBudgetBreach[] = [];

  for (const scenario of current.scenarios) {
    if (scenario.tag !== "resident-typical") continue;
    const ref = referenceByScenario.get(scenario.scenario);
    if (!ref) continue;

    for (const metric of ["p50FrameMs", "p95FrameMs"] as const) {
      const actual = scenario.metrics[metric];
      const limit = metricLimit(ref.metrics, metric, config.regressionFactor);
      if (actual == null || limit == null) continue;
      if (actual > limit) {
        breaches.push({ scenario: scenario.scenario, metric, actual, limit });
      }
    }
  }

  return breaches;
}

export function formatChartPerfBudgetReport(breaches: ChartPerfBudgetBreach[]): string[] {
  return breaches.map(
    (breach) =>
      `budget: ${breach.scenario} ${breach.metric}=${breach.actual} exceeds ${breach.limit.toFixed(2)}`,
  );
}

export function applyChartPerfBudgetGate(
  reference: ChartPerfBaseline,
  current: ChartPerfBaseline,
  config: ChartPerfBudgetConfig = readChartPerfBudgetConfig(),
): { breaches: ChartPerfBudgetBreach[]; exitCode: number } {
  const breaches = evaluateChartPerfBudgets(reference, current, config);
  if (breaches.length === 0) {
    return { breaches, exitCode: 0 };
  }

  for (const line of formatChartPerfBudgetReport(breaches)) {
    if (config.strict) {
      console.error(line);
    } else {
      console.warn(line);
    }
  }

  return { breaches, exitCode: config.strict ? 1 : 0 };
}
