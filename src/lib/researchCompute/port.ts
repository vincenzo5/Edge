import type {
  CompactResearchResult,
  CreateDatasetInput,
  DatasetManifest,
  PreviewTable,
  ProfileOptions,
  ResearchCodeSpec,
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
