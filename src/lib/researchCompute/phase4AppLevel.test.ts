import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { summarizeToolResult } from "@/lib/ai/agent/summarizeToolResult";
import { executeTool } from "@/lib/ai/adapters/execute";
import { edgeToolRegistry } from "@/lib/ai/tools";
import type { ToolContext } from "@/lib/ai/context";
import { researchCodeSpecSchema } from "@/lib/researchCompute/contracts";
import { isDockerAvailable, setResearchWorkerExecutorForTests } from "@/lib/researchCompute/dockerWorker";
import { toArtifactHint } from "@/lib/research/artifactHint";
import { toolStepToDataBlock } from "@/lib/copilot/chatBlockMapping";
import type { CandleResponse } from "@/lib/marketData/contracts/equities";
import { createDataResult } from "@/lib/marketData/contracts/result";

function makeBars(startT: number, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    t: startT + index * 86_400_000,
    o: 100 + index,
    h: 101 + index,
    l: 99 + index,
    c: 100 + index * 0.5,
    v: 1000,
  }));
}

function runCommand(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

const HAPPY_CELL = `
import polars as pl
from pathlib import Path

root = Path(DATASET_ROOT)
files = list(root.glob("partitions/symbol=*/bars.parquet"))
df = pl.read_parquet(files[0])
research.set_metrics({"Row count": df.height, "Columns": len(df.columns)})
research.set_preview(["metric", "value"], [["rows", df.height]])
`.trim();

const HOSTILE_IMPORT = `import socket\nsocket.socket()`;
const HOSTILE_WRITE = `open("/etc/passwd", "w").write("x")`;
const HOSTILE_FORBIDDEN = `import subprocess\nsubprocess.run(["echo", "hi"])`;
const SLOW_CELL = `
import time
time.sleep(120)
`.trim();

describe("Quant research runtime Phase 4 app-level", () => {
  let tempDir = "";
  let context: ToolContext;
  let dockerReady = false;

  beforeAll(async () => {
    dockerReady = await isDockerAvailable();
    if (!dockerReady) return;
    const code = await runCommand("docker", [
      "build",
      "-t",
      "edge-research-worker:latest",
      "-f",
      "services/research-worker/Dockerfile",
      "services/research-worker",
    ]);
    dockerReady = code === 0;
  }, 300_000);

  beforeEach(async () => {
    if (!dockerReady) return;
    tempDir = mkdtempSync(path.join(os.tmpdir(), "edge-research-p4-app-"));
    process.env.EDGE_RESEARCH_ROOT = tempDir;
    setResearchWorkerExecutorForTests(null);
    vi.resetModules();

    const bars = makeBars(1_700_000_000_000, 30);
    const marketData = {
      getCandles: vi.fn(async () =>
        createDataResult<CandleResponse>(
          {
            symbol: "AAPL",
            interval: "1d",
            candles: bars,
            hasMore: false,
          },
          "yahoo",
        ),
      ),
      searchSymbols: vi.fn(),
      getQuotes: vi.fn(),
      getFundamentals: vi.fn(),
      getOptionExpirations: vi.fn(),
      getOptionsChain: vi.fn(),
    };

    const { ResearchComputeService, resetResearchComputeJobCounterForTests } = await import(
      "@/lib/researchCompute/service"
    );
    resetResearchComputeJobCounterForTests();

    context = {
      clientSession: false,
      app: null,
      chart: null,
      watchlist: null,
      screener: null,
      risk: null,
      account: null,
      options: null,
      scriptLibrary: null,
      marketData: marketData as never,
      trading: null,
      journal: null,
      alerts: null,
      research: null,
      researchCompute: new ResearchComputeService(marketData as never),
    };
  });

  afterEach(() => {
    if (tempDir) {
      delete process.env.EDGE_RESEARCH_ROOT;
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("requires Docker for Phase 4 app-level gate", () => {
    expect(dockerReady).toBe(true);
  });

  it("rejects oversized source via Zod", () => {
    const parsed = researchCodeSpecSchema.safeParse({ source: "x".repeat(40_000) });
    expect(parsed.success).toBe(false);
  });

  it("create → run_research_code returns compact metrics and Data block without OHLCV", async () => {
    if (!dockerReady) return;

    const bars = makeBars(1_700_000_000_000, 30);
    const create = await executeTool(
      edgeToolRegistry,
      "create_research_dataset",
      {
        symbols: ["AAPL"],
        interval: "1d",
        fromMs: bars[0]!.t,
        toMs: bars[bars.length - 1]!.t,
      },
      context,
    );
    expect(create.ok).toBe(true);
    if (!create.ok) return;

    const datasetId = (create.data as { datasetId: string }).datasetId;
    const code = await executeTool(
      edgeToolRegistry,
      "run_research_code",
      { datasetId, spec: { source: HAPPY_CELL } },
      context,
    );

    expect(code.ok).toBe(true);
    if (!code.ok) return;

    const payload = code.data as {
      keyMetrics: Record<string, string | number>;
      artifactRefs: { kind: string }[];
    };

    expect(JSON.stringify(code.data)).not.toMatch(/candles/i);
    expect(payload.keyMetrics["Row count"]).toBe(30);
    expect(payload.artifactRefs.some((ref) => ref.kind === "source_py")).toBe(true);

    const summary = summarizeToolResult("run_research_code", code);
    expect(summary.length).toBeLessThanOrEqual(120);

    const hint = toArtifactHint("run_research_code", code);
    expect(hint?.type).toBe("researchProfile");
    if (hint?.type === "researchProfile") {
      expect(hint.title).toBe("Research code");
    }

    const block = hint
      ? toolStepToDataBlock({
          callId: "app-level-p4",
          name: "run_research_code",
          status: "done",
          summary,
          artifactHint: hint,
        })
      : null;
    expect(block?.kind).toBe("data");
  });

  it("hostile cells fail closed", async () => {
    if (!dockerReady) return;

    const bars = makeBars(1_700_000_000_000, 10);
    const create = await executeTool(
      edgeToolRegistry,
      "create_research_dataset",
      {
        symbols: ["AAPL"],
        interval: "1d",
        fromMs: bars[0]!.t,
        toMs: bars[bars.length - 1]!.t,
      },
      context,
    );
    expect(create.ok).toBe(true);
    if (!create.ok) return;
    const datasetId = (create.data as { datasetId: string }).datasetId;

    for (const source of [HOSTILE_IMPORT, HOSTILE_WRITE, HOSTILE_FORBIDDEN]) {
      const result = await executeTool(
        edgeToolRegistry,
        "run_research_code",
        { datasetId, spec: { source } },
        context,
      );
      expect(result.ok).toBe(false);
    }
  });

  it("cancel_research_job stops a running cell", async () => {
    if (!dockerReady) return;

    const bars = makeBars(1_700_000_000_000, 10);
    const create = await executeTool(
      edgeToolRegistry,
      "create_research_dataset",
      {
        symbols: ["AAPL"],
        interval: "1d",
        fromMs: bars[0]!.t,
        toMs: bars[bars.length - 1]!.t,
      },
      context,
    );
    expect(create.ok).toBe(true);
    if (!create.ok) return;
    const datasetId = (create.data as { datasetId: string }).datasetId;

    const pending = executeTool(
      edgeToolRegistry,
      "run_research_code",
      { datasetId, spec: { source: SLOW_CELL } },
      context,
    );

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const jobsDir = path.join(tempDir, "jobs");
    const jobIds = readdirSync(jobsDir);
    expect(jobIds.length).toBeGreaterThan(0);

    const cancel = await executeTool(
      edgeToolRegistry,
      "cancel_research_job",
      { jobId: jobIds[0]! },
      context,
    );
    expect(cancel.ok).toBe(true);
    if (cancel.ok) {
      expect((cancel.data as { status: string }).status).toBe("canceled");
    }

    const runResult = await pending;
    expect(runResult.ok).toBe(false);
  }, 60_000);
});
