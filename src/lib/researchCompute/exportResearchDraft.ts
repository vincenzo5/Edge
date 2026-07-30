import type {
  ResearchDraftExport,
  ResearchJobRecord,
  SignalStudySpec,
  StrategyEvalSpec,
} from "./contracts";
import { signalStudySpecSchema, strategyEvalSpecSchema } from "./contracts";

function signalIrToIndicatorStub(spec: SignalStudySpec): string {
  const irComment = JSON.stringify(spec.signal, null, 2)
    .split("\n")
    .map((line) => `// ${line}`)
    .join("\n");
  return `// Research signal draft — manual review required
// Generated from run_signal_study — not auto-applied to chart
// Persist with create_indicator_script after user review
export default {
  meta: { name: "Research signal" },
  calculate(input) {
    // Signal IR:
${irComment}
    // horizonBars: ${spec.horizonBars}
    // direction: ${spec.direction}
    // entryLagBars: ${spec.entryLagBars}
    return { plots: [] };
  },
};
`;
}

function strategySpecToNote(
  spec: StrategyEvalSpec,
  metrics: Record<string, string | number>,
): string {
  const metricLines = Object.entries(metrics)
    .slice(0, 12)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");
  return `# Strategy research note

## Entry / exit (JSON IR)
\`\`\`json
${JSON.stringify({ entry: spec.entry, exit: spec.exit }, null, 2)}
\`\`\`

## Execution assumptions
- direction: ${spec.direction}
- fillTiming: ${spec.fillTiming}
- feesBps: ${spec.feesBps}
- slippageBps: ${spec.slippageBps}
- maxHoldBars: ${spec.maxHoldBars}
- sizing: ${spec.sizing.shares} shares

## Key metrics
${metricLines}

Manual promotion only — does not attach playbooks or place orders.
`;
}

export function exportResearchDraftFromJob(record: ResearchJobRecord): ResearchDraftExport {
  if (record.status !== "succeeded" || !record.compactResult) {
    throw new Error(`Research run not succeeded: ${record.jobId}`);
  }

  const provenance = {
    jobId: record.jobId,
    runFingerprint: record.runFingerprint ?? record.jobId,
    toolName: record.toolName,
    datasetId: record.datasetId ?? record.compactResult.datasetId,
  };

  if (record.toolName === "run_signal_study") {
    const signalSpec = signalStudySpecSchema.parse(record.toolInput);
    return {
      draftKind: "indicator_script",
      title: "Research signal draft",
      source: signalIrToIndicatorStub(signalSpec),
      signalSpec,
      provenance,
    };
  }

  if (record.toolName === "run_strategy_evaluation") {
    const strategySpec = strategyEvalSpecSchema.parse(record.toolInput);
    return {
      draftKind: "strategy_note",
      title: "Strategy evaluation note",
      source: strategySpecToNote(strategySpec, record.compactResult.keyMetrics),
      strategySpec,
      provenance,
    };
  }

  throw new Error(
    `Export not supported for tool ${record.toolName} — use run_signal_study or run_strategy_evaluation`,
  );
}
