import "server-only";

import type { MarketDataService } from "@/lib/marketData/service/marketDataService";

import type {
  CompactResearchResult,
  CreateDatasetInput,
  ProfileOptions,
  RunManifest,
} from "./contracts";
import { COMPUTE_VERSION, MAX_CONCURRENT_JOBS, MAX_JOB_WALL_TIME_MS } from "./constants";
import { requireDatasetManifest } from "./datasetStore";
import { computeRunFingerprint, createJobId } from "./fingerprints";
import { readJobRecord, requireJobRecord, writeJobRecord } from "./jobStore";
import {
  datasetSummaryFromManifest,
  materializeDataset,
} from "./materialize";
import { readBarsParquet } from "./parquet";
import { symbolPartitionPath } from "./paths";
import { computeProfileMetrics } from "./profileMetrics";
import type { ResearchArtifactPreview, ResearchComputePort, ResearchJobSummary } from "./port";
import { writeArtifact, readArtifactPayload, requireArtifactMeta } from "./artifactStore";

let activeJobs = 0;

export function resetResearchComputeJobCounterForTests(): void {
  activeJobs = 0;
}

export class ResearchComputeService implements ResearchComputePort {
  constructor(private readonly marketData: MarketDataService) {}

  async createDataset(input: CreateDatasetInput) {
    const resolvedProvider = input.provider?.trim() || "auto";
    const { manifest, created } = await materializeDataset({
      marketData: this.marketData,
      input,
      resolvedProvider,
    });
    return {
      datasetId: manifest.datasetId,
      created,
      manifest,
    };
  }

  async getDataset(datasetId: string) {
    const manifest = requireDatasetManifest(datasetId);
    return datasetSummaryFromManifest(manifest);
  }

  async profileDataset(args: { datasetId: string; options?: ProfileOptions }) {
    return this.runJob({
      toolName: "profile_research_dataset",
      datasetId: args.datasetId,
      toolInput: args.options ?? {},
      execute: async (jobId, manifest) => {
        const barsBySymbol: Record<string, import("./contracts").ResearchBar[]> = {};
        for (const symbol of manifest.identity.symbols) {
          barsBySymbol[symbol] = await readBarsParquet(
            symbolPartitionPath(manifest.datasetId, symbol),
          );
        }
        const profile = computeProfileMetrics({
          barsBySymbol,
          interval: manifest.identity.interval,
          options: args.options,
        });
        const metricsArtifact = writeArtifact({
          jobId,
          kind: "metrics_json",
          label: "Profile metrics",
          payload: profile.keyMetrics,
        });
        const previewArtifact = writeArtifact({
          jobId,
          kind: "preview_table",
          label: "Profile preview",
          payload: profile.previewTable,
        });
        return {
          warnings: profile.warnings,
          keyMetrics: profile.keyMetrics,
          artifactRefs: [metricsArtifact, previewArtifact],
          previewTable: profile.previewTable,
        };
      },
    });
  }

  async getJob(jobId: string): Promise<CompactResearchResult | ResearchJobSummary> {
    const record = requireJobRecord(jobId);
    if (record.compactResult) {
      return record.compactResult;
    }
    return {
      jobId: record.jobId,
      status: record.status,
      toolName: record.toolName,
      datasetId: record.datasetId,
      runFingerprint: record.runFingerprint,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
      error: record.error,
    };
  }

  async getArtifact(args: {
    artifactId: string;
    previewLimit?: number;
  }): Promise<ResearchArtifactPreview> {
    const meta = requireArtifactMeta(args.artifactId);
    const payload = readArtifactPayload(meta.artifactId);
    if (meta.kind === "preview_table" && payload && typeof payload === "object") {
      const table = payload as { columns?: string[]; rows?: unknown[][] };
      const limit = args.previewLimit ?? 20;
      return {
        artifactId: meta.artifactId,
        kind: meta.kind,
        label: meta.label,
        preview: {
          columns: table.columns ?? [],
          rows: (table.rows ?? []).slice(0, limit),
        },
      };
    }
    return {
      artifactId: meta.artifactId,
      kind: meta.kind,
      label: meta.label,
      preview: payload && typeof payload === "object" ? (payload as Record<string, unknown>) : undefined,
    };
  }

  private async runJob<TInput>(args: {
    toolName: string;
    datasetId: string;
    toolInput: TInput;
    execute: (
      jobId: string,
      manifest: Awaited<ReturnType<typeof requireDatasetManifest>>,
    ) => Promise<{
      warnings: string[];
      keyMetrics: Record<string, string | number>;
      artifactRefs: CompactResearchResult["artifactRefs"];
      previewTable?: CompactResearchResult["previewTable"];
    }>;
  }): Promise<CompactResearchResult> {
    if (activeJobs >= MAX_CONCURRENT_JOBS) {
      throw new Error(`Concurrent research job cap reached (${MAX_CONCURRENT_JOBS})`);
    }

    const manifest = requireDatasetManifest(args.datasetId);
    const jobId = createJobId();
    const startedAt = new Date().toISOString();
    const runFingerprint = computeRunFingerprint({
      datasetId: manifest.datasetId,
      identityFingerprint: manifest.identityFingerprint,
      toolName: args.toolName,
      toolInput: args.toolInput,
    });

    writeJobRecord({
      jobId,
      toolName: args.toolName,
      status: "queued",
      datasetId: manifest.datasetId,
      runFingerprint,
      startedAt,
    });

    activeJobs += 1;
    writeJobRecord({
      jobId,
      toolName: args.toolName,
      status: "running",
      datasetId: manifest.datasetId,
      runFingerprint,
      startedAt,
    });

    const timeout = setTimeout(() => {
      /* wall-time guard handled in catch */
    }, MAX_JOB_WALL_TIME_MS);

    try {
      const result = await args.execute(jobId, manifest);
      const finishedAt = new Date().toISOString();
      const artifactRefs = [...result.artifactRefs];
      const runManifest: RunManifest = {
        jobId,
        toolName: args.toolName,
        datasetRef: {
          datasetId: manifest.datasetId,
          identityFingerprint: manifest.identityFingerprint,
        },
        runFingerprint,
        startedAt,
        finishedAt,
        status: "succeeded",
        warnings: result.warnings,
        computeVersion: COMPUTE_VERSION,
        artifactRefs,
      };
      const manifestArtifact = writeArtifact({
        jobId,
        kind: "run_manifest",
        label: "Run manifest",
        payload: runManifest,
      });
      artifactRefs.unshift(manifestArtifact);

      const compactResult: CompactResearchResult = {
        jobId,
        status: "succeeded",
        runFingerprint,
        datasetId: manifest.datasetId,
        datasetRef: {
          datasetId: manifest.datasetId,
          identityFingerprint: manifest.identityFingerprint,
        },
        provenance: {
          providerRoute: manifest.acquisitionMeta.providerRoute,
          sources: manifest.acquisitionMeta.sources,
          contentFingerprint: manifest.contentFingerprint,
        },
        warnings: result.warnings,
        keyMetrics: result.keyMetrics,
        artifactRefs,
        previewTable: result.previewTable,
      };

      writeJobRecord({
        jobId,
        toolName: args.toolName,
        status: "succeeded",
        datasetId: manifest.datasetId,
        runFingerprint,
        startedAt,
        finishedAt,
        compactResult,
      });

      return compactResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Research job failed";
      writeJobRecord({
        jobId,
        toolName: args.toolName,
        status: "failed",
        datasetId: manifest.datasetId,
        runFingerprint,
        startedAt,
        finishedAt: new Date().toISOString(),
        error: message,
        compactResult: {
          jobId,
          status: "failed",
          runFingerprint,
          datasetId: manifest.datasetId,
          warnings: [message],
          keyMetrics: { Error: message },
          artifactRefs: [],
        },
      });
      throw error;
    } finally {
      clearTimeout(timeout);
      activeJobs = Math.max(0, activeJobs - 1);
    }
  }
}

export function isTerminalJob(jobId: string): boolean {
  const record = readJobRecord(jobId);
  if (!record) return false;
  return record.status === "succeeded" || record.status === "failed" || record.status === "canceled";
}
