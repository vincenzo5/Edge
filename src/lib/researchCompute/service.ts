import "server-only";

import type { MarketDataService } from "@/lib/marketData/service/marketDataService";

import type {
  CompactResearchResult,
  CompareResearchRunsResult,
  CreateDatasetInput,
  ProfileOptions,
  ResearchCodeSpec,
  ResearchDraftExport,
  RunManifest,
  SignalStudySpec,
  StrategyEvalSpec,
} from "./contracts";
import { COMPUTE_VERSION, MAX_CONCURRENT_JOBS, MAX_JOB_WALL_TIME_MS } from "./constants";
import {
  getResearchWorkerExecutor,
  workerResultToJobPayload,
  type ResearchWorkerExecutor,
} from "./dockerWorker";
import { requireDatasetManifest } from "./datasetStore";
import { computeRunFingerprint, createJobId } from "./fingerprints";
import { readJobRecord, requireJobRecord, resolveJobsByRefs, updateJobRecord, writeJobRecord } from "./jobStore";
import {
  datasetSummaryFromManifest,
  materializeDataset,
} from "./materialize";
import { readBarsParquet } from "./parquet";
import { symbolPartitionPath } from "./paths";
import { computeProfileMetrics } from "./profileMetrics";
import { computeSignalStudyMetrics } from "./signalStudyMetrics";
import { computeStrategyEvalMetrics } from "./strategyEvalMetrics";
import type { ResearchArtifactPreview, ResearchComputePort, ResearchJobSummary } from "./port";
import { writeArtifact, readArtifactPayload, requireArtifactMeta } from "./artifactStore";
import { compareResearchRuns } from "./compareRuns";
import { exportResearchDraftFromJob } from "./exportResearchDraft";
import { normalizeToolInputForStorage } from "./toolInput";

let activeJobs = 0;
const activeJobAbortControllers = new Map<string, AbortController>();

export function resetResearchComputeJobCounterForTests(): void {
  activeJobs = 0;
  activeJobAbortControllers.clear();
}

export class ResearchComputeService implements ResearchComputePort {
  constructor(
    private readonly marketData: MarketDataService,
    private readonly workerExecutor: ResearchWorkerExecutor = getResearchWorkerExecutor(),
  ) {}

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

  async runSignalStudy(args: { datasetId: string; spec: SignalStudySpec }) {
    return this.runJob({
      toolName: "run_signal_study",
      datasetId: args.datasetId,
      toolInput: args.spec,
      execute: async (jobId, manifest) => {
        const barsBySymbol: Record<string, import("./contracts").ResearchBar[]> = {};
        for (const symbol of manifest.identity.symbols) {
          barsBySymbol[symbol] = await readBarsParquet(
            symbolPartitionPath(manifest.datasetId, symbol),
          );
        }
        const study = computeSignalStudyMetrics({
          barsBySymbol,
          spec: args.spec,
        });
        const metricsArtifact = writeArtifact({
          jobId,
          kind: "metrics_json",
          label: "Signal study metrics",
          payload: study.keyMetrics,
        });
        const previewArtifact = writeArtifact({
          jobId,
          kind: "preview_table",
          label: "Signal study preview",
          payload: study.previewTable,
        });
        return {
          warnings: study.warnings,
          keyMetrics: study.keyMetrics,
          artifactRefs: [metricsArtifact, previewArtifact],
          previewTable: study.previewTable,
        };
      },
    });
  }

  async runStrategyEvaluation(args: { datasetId: string; spec: StrategyEvalSpec }) {
    return this.runJob({
      toolName: "run_strategy_evaluation",
      datasetId: args.datasetId,
      toolInput: args.spec,
      execute: async (jobId, manifest) => {
        const barsBySymbol: Record<string, import("./contracts").ResearchBar[]> = {};
        for (const symbol of manifest.identity.symbols) {
          barsBySymbol[symbol] = await readBarsParquet(
            symbolPartitionPath(manifest.datasetId, symbol),
          );
        }
        const evaluation = computeStrategyEvalMetrics({
          barsBySymbol,
          spec: args.spec,
          datasetIdentity: manifest.identity,
        });
        const metricsArtifact = writeArtifact({
          jobId,
          kind: "metrics_json",
          label: "Strategy evaluation metrics",
          payload: evaluation.keyMetrics,
        });
        const previewArtifact = writeArtifact({
          jobId,
          kind: "preview_table",
          label: "Strategy trades preview",
          payload: evaluation.previewTable,
        });
        const tradesArtifact = writeArtifact({
          jobId,
          kind: "trades_table",
          label: "Trades table",
          payload: evaluation.trades,
        });
        const equityArtifact = writeArtifact({
          jobId,
          kind: "equity_curve",
          label: "Equity curve",
          payload: evaluation.equityCurve,
        });
        return {
          warnings: evaluation.warnings,
          keyMetrics: evaluation.keyMetrics,
          artifactRefs: [metricsArtifact, previewArtifact, tradesArtifact, equityArtifact],
          previewTable: evaluation.previewTable,
        };
      },
    });
  }

  async runResearchCode(args: { datasetId: string; spec: ResearchCodeSpec }) {
    return this.runWorkerJob({
      toolName: "run_research_code",
      datasetId: args.datasetId,
      toolInput: args.spec,
      spec: args.spec,
    });
  }

  async cancelJob(jobId: string): Promise<CompactResearchResult | ResearchJobSummary> {
    const record = requireJobRecord(jobId);
    if (record.status === "succeeded" || record.status === "failed" || record.status === "canceled") {
      return record.compactResult ?? {
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

    const controller = activeJobAbortControllers.get(jobId);
    controller?.abort();

    if (record.containerId) {
      await this.workerExecutor.cancel(record.containerId);
    } else {
      await this.workerExecutor.cancel(`edge-research-${jobId.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 32)}`);
    }

    const finishedAt = new Date().toISOString();
    const canceledResult: CompactResearchResult = record.compactResult ?? {
      jobId: record.jobId,
      status: "canceled",
      runFingerprint: record.runFingerprint ?? jobId,
      datasetId: record.datasetId,
      warnings: ["Research job canceled"],
      keyMetrics: { Status: "canceled" },
      artifactRefs: [],
    };

    updateJobRecord(jobId, {
      status: "canceled",
      finishedAt,
      error: "Research job canceled",
      compactResult: {
        ...canceledResult,
        status: "canceled",
      },
    });

    activeJobAbortControllers.delete(jobId);

    const updated = requireJobRecord(jobId);
    return updated.compactResult ?? {
      jobId: updated.jobId,
      status: updated.status,
      toolName: updated.toolName,
      datasetId: updated.datasetId,
      runFingerprint: updated.runFingerprint,
      startedAt: updated.startedAt,
      finishedAt: updated.finishedAt,
      error: updated.error,
    };
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

  async compareRuns(args: { refs: string[] }): Promise<CompareResearchRunsResult> {
    const records = resolveJobsByRefs(args.refs);
    if (records.length < 2) {
      throw new Error(
        `Need at least 2 succeeded research runs to compare; resolved ${records.length}`,
      );
    }
    if (records.length < args.refs.length) {
      throw new Error("One or more research runs were not found or not succeeded");
    }
    return compareResearchRuns({ refs: args.refs, records });
  }

  async exportResearchDraft(args: { ref: string }): Promise<ResearchDraftExport> {
    const records = resolveJobsByRefs([args.ref]);
    if (records.length === 0) {
      throw new Error(`Research run not found: ${args.ref}`);
    }
    return exportResearchDraftFromJob(records[0]!);
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
    const storedToolInput = normalizeToolInputForStorage(args.toolInput);
    const runFingerprint = computeRunFingerprint({
      datasetId: manifest.datasetId,
      identityFingerprint: manifest.identityFingerprint,
      toolName: args.toolName,
      toolInput: storedToolInput,
    });

    writeJobRecord({
      jobId,
      toolName: args.toolName,
      status: "queued",
      datasetId: manifest.datasetId,
      runFingerprint,
      toolInput: storedToolInput,
      startedAt,
    });

    activeJobs += 1;
    writeJobRecord({
      jobId,
      toolName: args.toolName,
      status: "running",
      datasetId: manifest.datasetId,
      runFingerprint,
      toolInput: storedToolInput,
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
        toolInput: storedToolInput,
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
        toolInput: storedToolInput,
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
        toolInput: storedToolInput,
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

  private async runWorkerJob(args: {
    toolName: string;
    datasetId: string;
    toolInput: ResearchCodeSpec;
    spec: ResearchCodeSpec;
  }): Promise<CompactResearchResult> {
    if (activeJobs >= MAX_CONCURRENT_JOBS) {
      throw new Error(`Concurrent research job cap reached (${MAX_CONCURRENT_JOBS})`);
    }

    const manifest = requireDatasetManifest(args.datasetId);
    const jobId = createJobId();
    const startedAt = new Date().toISOString();
    const storedToolInput = normalizeToolInputForStorage(args.toolInput);
    const runFingerprint = computeRunFingerprint({
      datasetId: manifest.datasetId,
      identityFingerprint: manifest.identityFingerprint,
      toolName: args.toolName,
      toolInput: storedToolInput,
    });

    writeJobRecord({
      jobId,
      toolName: args.toolName,
      status: "queued",
      datasetId: manifest.datasetId,
      runFingerprint,
      toolInput: storedToolInput,
      startedAt,
    });

    activeJobs += 1;
    const abortController = new AbortController();
    activeJobAbortControllers.set(jobId, abortController);

    writeJobRecord({
      jobId,
      toolName: args.toolName,
      status: "running",
      datasetId: manifest.datasetId,
      runFingerprint,
      toolInput: storedToolInput,
      startedAt,
    });

    const timeout = setTimeout(() => {
      abortController.abort();
    }, MAX_JOB_WALL_TIME_MS);

    try {
      const execution = await this.workerExecutor.execute({
        jobId,
        datasetId: manifest.datasetId,
        spec: args.spec,
        signal: abortController.signal,
        onContainerStart: (containerId) => {
          updateJobRecord(jobId, { containerId });
        },
      });

      if (abortController.signal.aborted) {
        throw new Error("Research cell canceled");
      }

      const payload = workerResultToJobPayload(execution.workerResult);
      const sourceArtifact = writeArtifact({
        jobId,
        kind: "source_py",
        label: args.spec.label ?? "Research cell source",
        payload: {
          source: args.spec.source,
          workerImageId: execution.workerImageId,
        },
      });
      const metricsArtifact = writeArtifact({
        jobId,
        kind: "metrics_json",
        label: "Research code metrics",
        payload: payload.keyMetrics,
      });
      const artifactRefs = [sourceArtifact, metricsArtifact];
      let previewTable = payload.previewTable;
      if (previewTable) {
        const previewArtifact = writeArtifact({
          jobId,
          kind: "preview_table",
          label: "Research code preview",
          payload: previewTable,
        });
        artifactRefs.push(previewArtifact);
      }

      const finishedAt = new Date().toISOString();
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
        warnings: payload.warnings,
        computeVersion: COMPUTE_VERSION,
        workerImageId: execution.workerImageId,
        artifactRefs,
        toolInput: storedToolInput,
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
          workerImageId: execution.workerImageId,
        },
        warnings: payload.warnings,
        keyMetrics: payload.keyMetrics,
        artifactRefs,
        previewTable,
      };

      writeJobRecord({
        jobId,
        toolName: args.toolName,
        status: "succeeded",
        datasetId: manifest.datasetId,
        runFingerprint,
        toolInput: storedToolInput,
        startedAt,
        finishedAt,
        containerId: execution.containerId,
        compactResult,
      });

      return compactResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Research job failed";
      const isCanceled = abortController.signal.aborted || /canceled/i.test(message);
      writeJobRecord({
        jobId,
        toolName: args.toolName,
        status: isCanceled ? "canceled" : "failed",
        datasetId: manifest.datasetId,
        runFingerprint,
        toolInput: storedToolInput,
        startedAt,
        finishedAt: new Date().toISOString(),
        error: message,
        compactResult: {
          jobId,
          status: isCanceled ? "canceled" : "failed",
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
      activeJobAbortControllers.delete(jobId);
      activeJobs = Math.max(0, activeJobs - 1);
    }
  }
}

export function isTerminalJob(jobId: string): boolean {
  const record = readJobRecord(jobId);
  if (!record) return false;
  return record.status === "succeeded" || record.status === "failed" || record.status === "canceled";
}
