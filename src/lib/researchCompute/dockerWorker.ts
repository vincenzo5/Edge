import "server-only";

import { spawn } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  MAX_JOB_WALL_TIME_MS,
  MAX_RESEARCH_CODE_SOURCE_BYTES,
  MAX_RESEARCH_WORKER_MEMORY_MB,
  MAX_RESEARCH_WORKER_OUTPUT_BYTES,
  MAX_RESEARCH_WORKER_PIDS,
  RESEARCH_WORKER_IMAGE,
} from "./constants";
import type { PreviewTable, ResearchCodeSpec, ResearchWorkerResult } from "./contracts";
import { researchWorkerResultSchema } from "./contracts";
import { assertSafeId, datasetRoot, jobRoot } from "./paths";

export type ResearchWorkerExecuteArgs = {
  jobId: string;
  datasetId: string;
  spec: ResearchCodeSpec;
  onContainerStart?: (containerId: string) => void;
  signal?: AbortSignal;
};

export type ResearchWorkerExecuteResult = {
  workerResult: ResearchWorkerResult;
  workerImageId: string;
  containerId?: string;
};

export type ResearchWorkerExecutor = {
  execute(args: ResearchWorkerExecuteArgs): Promise<ResearchWorkerExecuteResult>;
  cancel(containerId: string): Promise<void>;
  resolveImageId(): Promise<string>;
};

const BLOCKED_WORKER_ENV_KEYS = new Set([
  "EDGE_AUTH_SECRET",
  "DATABASE_URL",
  "REDIS_URL",
  "TWS_SIDECAR_SECRET",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENROUTER_API_KEY",
]);

function assertNoSecretsInEnv(): void {
  for (const key of BLOCKED_WORKER_ENV_KEYS) {
    if (process.env[key]) {
      throw new Error(`Refusing to run worker with secret env present: ${key}`);
    }
  }
}

function readWorkerResult(outDir: string): ResearchWorkerResult {
  const resultPath = path.join(outDir, "result.json");
  try {
    const raw = JSON.parse(readFileSync(resultPath, "utf8")) as unknown;
    return researchWorkerResultSchema.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid worker result";
    return {
      status: "failed",
      keyMetrics: { Error: message },
      warnings: [message],
      error: message,
    };
  }
}

export class DockerResearchWorkerExecutor implements ResearchWorkerExecutor {
  async resolveImageId(): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn("docker", ["image", "inspect", RESEARCH_WORKER_IMAGE, "--format", "{{.Id}}"], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim());
          return;
        }
        resolve(RESEARCH_WORKER_IMAGE);
      });
    });
  }

  async execute(args: ResearchWorkerExecuteArgs): Promise<ResearchWorkerExecuteResult> {
    assertNoSecretsInEnv();
    assertSafeId(args.jobId, "job");
    assertSafeId(args.datasetId, "dataset");

    const sourceBytes = Buffer.byteLength(args.spec.source, "utf8");
    if (sourceBytes > MAX_RESEARCH_CODE_SOURCE_BYTES) {
      throw new Error(`Cell source exceeds max bytes (${MAX_RESEARCH_CODE_SOURCE_BYTES})`);
    }

    const workDir = path.join(jobRoot(args.jobId), "worker");
    const outDir = path.join(workDir, "out");
    mkdirSync(workDir, { recursive: true, mode: 0o777 });
    mkdirSync(outDir, { recursive: true, mode: 0o777 });
    chmodSync(workDir, 0o777);
    chmodSync(outDir, 0o777);

    const cellPath = path.join(workDir, "cell.py");
    writeFileSync(cellPath, args.spec.source, "utf8");

    const datasetMount = datasetRoot(args.datasetId);
    const workerImageId = await this.resolveImageId();

    const containerName = `edge-research-${args.jobId.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 32)}`;

    const dockerArgs = [
      "run",
      "-d",
      "--rm",
      "--name",
      containerName,
      "--network=none",
      "--memory",
      `${MAX_RESEARCH_WORKER_MEMORY_MB}m`,
      "--pids-limit",
      String(MAX_RESEARCH_WORKER_PIDS),
      "-v",
      `${datasetMount}:/dataset:ro`,
      "-v",
      `${workDir}:/work:rw`,
      "-v",
      `${outDir}:/out:rw`,
      "-e",
      `RESEARCH_CELL_PATH=/work/cell.py`,
      "-e",
      `RESEARCH_DATASET_ROOT=/dataset`,
      "-e",
      `RESEARCH_OUT_DIR=/out`,
      "-e",
      `RESEARCH_MAX_SOURCE_BYTES=${MAX_RESEARCH_CODE_SOURCE_BYTES}`,
      "-e",
      `RESEARCH_MAX_OUTPUT_BYTES=${MAX_RESEARCH_WORKER_OUTPUT_BYTES}`,
      RESEARCH_WORKER_IMAGE,
    ];

    return new Promise((resolve, reject) => {
      let containerId: string | undefined;
      let settled = false;

      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        args.signal?.removeEventListener("abort", onAbort);
        fn();
      };

      const onAbort = () => {
        void this.cancel(containerName);
      };

      if (args.signal) {
        if (args.signal.aborted) {
          onAbort();
        } else {
          args.signal.addEventListener("abort", onAbort, { once: true });
        }
      }

      const timer = setTimeout(() => {
        void this.cancel(containerName);
      }, MAX_JOB_WALL_TIME_MS);

      const runChild = spawn("docker", dockerArgs, { stdio: ["ignore", "pipe", "pipe"] });
      let runStdout = "";

      runChild.stdout.on("data", (chunk: Buffer) => {
        runStdout += chunk.toString("utf8");
      });

      runChild.on("error", (error) => {
        finish(() => reject(error));
      });

      runChild.on("close", (code) => {
        if (code !== 0) {
          finish(() => reject(new Error(`docker run failed with code ${code ?? "unknown"}`)));
          return;
        }

        containerId = runStdout.trim();
        if (containerId) {
          args.onContainerStart?.(containerId);
        }

        const waitChild = spawn("docker", ["wait", containerName], { stdio: ["ignore", "pipe", "pipe"] });
        waitChild.on("close", (waitCode) => {
          const workerResult = readWorkerResult(outDir);
          if (args.signal?.aborted) {
            finish(() => reject(new Error("Research cell canceled")));
            return;
          }
          if (waitCode !== 0 && workerResult.status !== "failed") {
            workerResult.status = "failed";
            workerResult.error =
              workerResult.error ?? `Worker exited with code ${waitCode ?? "unknown"}`;
            workerResult.warnings = [...workerResult.warnings, workerResult.error];
          }
          finish(() =>
            resolve({
              workerResult,
              workerImageId,
              containerId,
            }),
          );
        });
        waitChild.on("error", (error) => {
          finish(() => reject(error));
        });
      });
    });
  }

  async cancel(containerIdOrName: string): Promise<void> {
    await new Promise<void>((resolve) => {
      const child = spawn("docker", ["kill", containerIdOrName], { stdio: "ignore" });
      child.on("close", () => resolve());
      child.on("error", () => resolve());
    });
  }
}

export class MockResearchWorkerExecutor implements ResearchWorkerExecutor {
  constructor(
    private readonly handler: (
      args: ResearchWorkerExecuteArgs,
    ) => Promise<ResearchWorkerResult> | ResearchWorkerResult,
    private readonly imageId = "mock-research-worker",
  ) {}

  async resolveImageId(): Promise<string> {
    return this.imageId;
  }

  async execute(args: ResearchWorkerExecuteArgs): Promise<ResearchWorkerExecuteResult> {
    if (args.signal?.aborted) {
      throw new Error("Research cell canceled");
    }
    const workerResult = await this.handler(args);
    return {
      workerResult: researchWorkerResultSchema.parse(workerResult),
      workerImageId: this.imageId,
    };
  }

  async cancel(_containerId: string): Promise<void> {
    /* no-op for mock */
  }
}

let defaultExecutor: ResearchWorkerExecutor | null = null;

export function getResearchWorkerExecutor(): ResearchWorkerExecutor {
  if (!defaultExecutor) {
    defaultExecutor = new DockerResearchWorkerExecutor();
  }
  return defaultExecutor;
}

export function setResearchWorkerExecutorForTests(executor: ResearchWorkerExecutor | null): void {
  defaultExecutor = executor;
}

export async function isDockerAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("docker", ["info"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export function workerResultToJobPayload(result: ResearchWorkerResult): {
  warnings: string[];
  keyMetrics: Record<string, string | number>;
  previewTable?: PreviewTable;
} {
  if (result.status === "failed") {
    throw new Error(result.error ?? "Research cell failed");
  }
  return {
    warnings: result.warnings,
    keyMetrics: result.keyMetrics,
    previewTable: result.previewTable,
  };
}
