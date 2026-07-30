import type {
  CompactResearchResult,
  CompareResearchRunsResult,
  CreateDatasetInput,
  DatasetManifest,
  PreviewTable,
  ProfileOptions,
  ResearchCodeSpec,
  ResearchDraftExport,
  SignalStudySpec,
  StrategyEvalSpec,
} from "./contracts";

export type ResearchArtifactPreview = {
  artifactId: string;
  kind: string;
  label?: string;
  preview?: PreviewTable | Record<string, unknown>;
};

export type ResearchComputePort = {
  createDataset(input: CreateDatasetInput): Promise<{
    datasetId: string;
    created: boolean;
    manifest: DatasetManifest;
  }>;
  getDataset(datasetId: string): Promise<ReturnType<typeof import("./materialize").datasetSummaryFromManifest>>;
  profileDataset(args: {
    datasetId: string;
    options?: ProfileOptions;
  }): Promise<CompactResearchResult>;
  runSignalStudy(args: {
    datasetId: string;
    spec: SignalStudySpec;
  }): Promise<CompactResearchResult>;
  runStrategyEvaluation(args: {
    datasetId: string;
    spec: StrategyEvalSpec;
  }): Promise<CompactResearchResult>;
  runResearchCode(args: {
    datasetId: string;
    spec: ResearchCodeSpec;
  }): Promise<CompactResearchResult>;
  cancelJob(jobId: string): Promise<CompactResearchResult | ResearchJobSummary>;
  getJob(jobId: string): Promise<CompactResearchResult | ResearchJobSummary>;
  getArtifact(args: {
    artifactId: string;
    previewLimit?: number;
  }): Promise<ResearchArtifactPreview>;
  compareRuns(args: { refs: string[] }): Promise<CompareResearchRunsResult>;
  exportResearchDraft(args: { ref: string }): Promise<ResearchDraftExport>;
};

export type ResearchJobSummary = {
  jobId: string;
  status: CompactResearchResult["status"];
  toolName: string;
  datasetId?: string;
  runFingerprint?: string;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  compactResult?: CompactResearchResult;
};
