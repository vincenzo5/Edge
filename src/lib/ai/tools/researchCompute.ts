import { z } from "zod";

import {
  createDatasetInputSchema,
  profileOptionsSchema,
  researchIntervalSchema,
  signalStudySpecSchema,
  strategyEvalSpecSchema,
} from "@/lib/researchCompute/contracts";
import { datasetSummaryFromManifest } from "@/lib/researchCompute/materialize";

import { defineTool } from "../types";
import type { AiTool } from "../types";
import { requireResearchCompute } from "../researchComputePort";

export const createResearchDatasetTool = defineTool({
  name: "create_research_dataset",
  description:
    "Materialize a versioned research dataset from market data. Server paginates beyond chat bar limits; returns dataset id and provenance — never raw OHLCV.",
  inputSchema: createDatasetInputSchema,
  permission: "read",
  requiresConfirmation: false,
  async execute(input, context) {
    const port = requireResearchCompute(context);
    const result = await port.createDataset(input);
    const summary = datasetSummaryFromManifest(result.manifest);
    return {
      ok: true,
      data: {
        datasetId: result.datasetId,
        created: result.created,
        identityFingerprint: summary.identityFingerprint,
        contentFingerprint: summary.contentFingerprint,
        rowCount: summary.rowCount,
        symbolRowCounts: summary.symbolRowCounts,
        provenance: summary.provenance,
        materializedAt: summary.materializedAt,
      },
    };
  },
});

export const getResearchDatasetTool = defineTool({
  name: "get_research_dataset",
  description: "Fetch metadata and provenance for a versioned research dataset by datasetId.",
  inputSchema: z.object({
    datasetId: z.string().trim().min(1).max(64),
  }),
  permission: "read",
  requiresConfirmation: false,
  async execute(input, context) {
    const port = requireResearchCompute(context);
    const summary = await port.getDataset(input.datasetId);
    return { ok: true, data: summary };
  },
});

export const profileResearchDatasetTool = defineTool({
  name: "profile_research_dataset",
  description:
    "Run a descriptive profile study on a research dataset. Returns compact metrics, warnings, and artifact refs — not raw bars.",
  inputSchema: z.object({
    datasetId: z.string().trim().min(1).max(64),
    options: profileOptionsSchema.optional(),
  }),
  permission: "read",
  requiresConfirmation: false,
  async execute(input, context) {
    const port = requireResearchCompute(context);
    const result = await port.profileDataset({
      datasetId: input.datasetId,
      options: input.options,
    });
    return { ok: true, data: result };
  },
});

export const runSignalStudyTool = defineTool({
  name: "run_signal_study",
  description:
    "Run a declarative signal / event study on a research dataset. Returns forward-return metrics, train/holdout splits, warnings, and artifact refs — not raw bars or order simulation.",
  inputSchema: z.object({
    datasetId: z.string().trim().min(1).max(64),
    spec: signalStudySpecSchema,
  }),
  permission: "read",
  requiresConfirmation: false,
  async execute(input, context) {
    const port = requireResearchCompute(context);
    const result = await port.runSignalStudy({
      datasetId: input.datasetId,
      spec: input.spec,
    });
    return { ok: true, data: result };
  },
});

export const runStrategyEvaluationTool = defineTool({
  name: "run_strategy_evaluation",
  description:
    "Run minimal vectorized strategy evaluation on a research dataset. Requires fees, slippage, and fill timing. Returns compact metrics, trade preview, equity curve + trades artifacts — not raw bars or broker-accurate simulation.",
  inputSchema: z.object({
    datasetId: z.string().trim().min(1).max(64),
    spec: strategyEvalSpecSchema,
  }),
  permission: "read",
  requiresConfirmation: false,
  async execute(input, context) {
    const port = requireResearchCompute(context);
    const result = await port.runStrategyEvaluation({
      datasetId: input.datasetId,
      spec: input.spec,
    });
    return { ok: true, data: result };
  },
});

export const getResearchJobTool = defineTool({
  name: "get_research_job",
  description: "Fetch async research job status and compact results by jobId.",
  inputSchema: z.object({
    jobId: z.string().trim().min(1).max(64),
  }),
  permission: "read",
  requiresConfirmation: false,
  async execute(input, context) {
    const port = requireResearchCompute(context);
    const result = await port.getJob(input.jobId);
    return { ok: true, data: result };
  },
});

export const getResearchArtifactTool = defineTool({
  name: "get_research_artifact",
  description: "Fetch artifact metadata and a bounded preview by artifactId.",
  inputSchema: z.object({
    artifactId: z.string().trim().min(1).max(64),
    previewLimit: z.number().int().min(1).max(20).optional(),
  }),
  permission: "read",
  requiresConfirmation: false,
  async execute(input, context) {
    const port = requireResearchCompute(context);
    const preview = await port.getArtifact({
      artifactId: input.artifactId,
      previewLimit: input.previewLimit,
    });
    return { ok: true, data: preview };
  },
});

/** Shared interval schema for tool docs parity with chart intervals. */
export const researchToolIntervalSchema = researchIntervalSchema;

export const researchComputeTools: AiTool[] = [
  createResearchDatasetTool,
  getResearchDatasetTool,
  profileResearchDatasetTool,
  runSignalStudyTool,
  runStrategyEvaluationTool,
  getResearchJobTool,
  getResearchArtifactTool,
];
