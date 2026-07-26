import { describe, expect, it, vi } from "vitest";

import {
  formatContainerStatusSummary,
  parseLocalProdContainerArgs,
  redactLogLine,
  resolveContainerImageTag,
  runLogsCommand,
  runMigrateCommand,
  runStartCommand,
  runStatusCommand,
  runStopCommand,
  type LocalProdContainerDeps,
} from "./local-prod-container.mts";

const FULL_SHA = "5aa83b921c51a7dadc625101076301ce765ac03d";
const DEV_ROOT = "/Users/example/TV AI";
const IMAGE_TAG = `edge-app:${FULL_SHA}`;

function mockContainerDeps(overrides: Partial<LocalProdContainerDeps> = {}): LocalProdContainerDeps {
  const execFile = vi.fn((file: string, args: string[]) => {
    if (file === "git" && args.includes("rev-parse")) return FULL_SHA;
    if (file === "docker" && args[0] === "inspect") {
      const formatIndex = args.indexOf("--format");
      const format = formatIndex >= 0 ? args[formatIndex + 1] : "";
      const target = args.at(-1);
      if (target === "edge-app-prod") {
        if (format.includes("State.Status")) return "running";
        if (format.includes("State.Health")) return "healthy";
        if (format.includes("Config.Image")) return IMAGE_TAG;
      }
      if (target === "edge-postgres" || target === "edge-redis") {
        if (format.includes("State.Health")) return "healthy";
      }
      if (format.includes("org.opencontainers.image.revision")) return FULL_SHA;
      if (format.includes("Config.User")) return "edge";
    }
    if (file === "docker" && args[0] === "compose") {
      if (args.includes("logs")) return "request completed\n";
      return "";
    }
    if (file === "launchctl" && args[0] === "print") throw new Error("not loaded");
    return "";
  }) as LocalProdContainerDeps["execFile"];

  return {
    execFile,
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => "{}"),
    fetchImpl: vi.fn(async (url: string | URL | Request) => {
      const href = typeof url === "string" ? url : url.toString();
      if (href.includes("/healthz") || href.includes("/readyz")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: false }), { status: 503 });
    }) as typeof fetch,
    uid: 501,
    listenPidsOnPort: vi.fn(() => []),
    buildDeps: {
      execFile,
      execFileSync: vi.fn(),
      existsSync: vi.fn(() => true),
      mkdtempSync: vi.fn(),
      rmSync: vi.fn(),
      listImageTarEntries: vi.fn(() => ["app/server.js"]),
    },
    spawnComposeInherit: vi.fn(),
    readComposeLogs: vi.fn(() => "ok line\nEDGE_AUTH_SECRET=secret\n"),
    ...overrides,
  };
}

describe("parseLocalProdContainerArgs", () => {
  it("parses start with image override", () => {
    expect(
      parseLocalProdContainerArgs(["start", "--image", IMAGE_TAG, "--dev-root", DEV_ROOT], DEV_ROOT),
    ).toEqual({
      command: "start",
      developmentRoot: DEV_ROOT,
      imageTag: IMAGE_TAG,
      revision: null,
      skipInfra: false,
      tailLines: 200,
      skipWorktree: false,
    });
  });
});

describe("resolveContainerImageTag", () => {
  it("rejects latest tags", () => {
    const deps = mockContainerDeps();
    expect(() =>
      resolveContainerImageTag(
        { developmentRoot: DEV_ROOT, imageTag: "edge-app:latest", revision: null },
        deps.execFile,
      ),
    ).toThrow(/latest/);
  });

  it("resolves HEAD revision to edge-app sha tag", () => {
    const deps = mockContainerDeps();
    expect(
      resolveContainerImageTag(
        { developmentRoot: DEV_ROOT, imageTag: null, revision: "HEAD" },
        deps.execFile,
      ),
    ).toBe(IMAGE_TAG);
  });
});

describe("redactLogLine", () => {
  it("redacts secret-like log lines", () => {
    expect(redactLogLine("EDGE_API_KEY=abc")).toBe("[redacted line omitted]");
    expect(redactLogLine("request completed")).toBe("request completed");
  });
});

describe("formatContainerStatusSummary", () => {
  it("formats secret-free status lines", () => {
    const lines = formatContainerStatusSummary({
      container: {
        present: true,
        running: true,
        status: "running",
        health: "healthy",
        imageTag: IMAGE_TAG,
      },
      imageSha: FULL_SHA,
      ociRevision: FULL_SHA,
      healthzOk: true,
      readyzOk: true,
      readyzReasons: [],
      postgresHealth: "healthy",
      redisHealth: "healthy",
      deployLines: ["deploy.current=none"],
    });
    expect(lines.join("\n")).toContain(`container.sha=${FULL_SHA}`);
    expect(lines.join("\n")).not.toMatch(/EDGE_API_KEY|DATABASE_URL/);
  });
});

describe("runStartCommand", () => {
  it("refuses when launchd owns production", () => {
    const deps = mockContainerDeps({
      execFile: vi.fn((file: string, args: string[]) => {
        if (file === "launchctl" && args[0] === "print") return "state = running";
        if (file === "docker" && args[0] === "inspect") throw new Error("missing");
        if (file === "git" && args.includes("rev-parse")) return FULL_SHA;
        return "";
      }) as LocalProdContainerDeps["execFile"],
    });
    const code = runStartCommand(
      {
        command: "start",
        developmentRoot: DEV_ROOT,
        imageTag: IMAGE_TAG,
        revision: null,
        skipInfra: true,
        tailLines: 200,
        skipWorktree: false,
      },
      deps,
    );
    expect(code).toBe(1);
  });

  it("refuses when production env file is missing", () => {
    const deps = mockContainerDeps({
      existsSync: vi.fn(() => false),
    });
    const code = runStartCommand(
      {
        command: "start",
        developmentRoot: DEV_ROOT,
        imageTag: IMAGE_TAG,
        revision: null,
        skipInfra: true,
        tailLines: 200,
        skipWorktree: false,
      },
      deps,
    );
    expect(code).toBe(1);
  });
});

describe("runStopCommand", () => {
  it("noops when container is not running", () => {
    const deps = mockContainerDeps({
      execFile: vi.fn((file: string, args: string[]) => {
        if (file === "docker" && args[0] === "inspect") throw new Error("missing");
        return "";
      }) as LocalProdContainerDeps["execFile"],
    });
    const code = runStopCommand(
      {
        command: "stop",
        developmentRoot: DEV_ROOT,
        imageTag: null,
        revision: null,
        skipInfra: false,
        tailLines: 200,
        skipWorktree: false,
      },
      deps,
    );
    expect(code).toBe(0);
  });
});

describe("runMigrateCommand", () => {
  it("runs compose migrate profile with resolved image env", () => {
    const execFile = vi.fn((file: string, args: string[]) => {
      if (file === "git" && args.includes("rev-parse")) return FULL_SHA;
      return "";
    }) as LocalProdContainerDeps["execFile"];
    const spawnComposeInherit = vi.fn();
    const deps = mockContainerDeps({ execFile, spawnComposeInherit });

    const code = runMigrateCommand(
      {
        command: "migrate",
        developmentRoot: DEV_ROOT,
        imageTag: IMAGE_TAG,
        revision: null,
        skipInfra: true,
        tailLines: 200,
        skipWorktree: false,
      },
      deps,
    );

    expect(code).toBe(0);
    expect(spawnComposeInherit).toHaveBeenCalledWith(
      DEV_ROOT,
      ["--profile", "migrate", "run", "--rm", "app-prod-migrate"],
      IMAGE_TAG,
    );
  });
});

describe("runStatusCommand", () => {
  it("prints redacted status for running container", async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    try {
      const code = await runStatusCommand(
        {
          command: "status",
          developmentRoot: DEV_ROOT,
          imageTag: null,
          revision: null,
          skipInfra: false,
          tailLines: 200,
          skipWorktree: false,
        },
        mockContainerDeps(),
      );
      expect(code).toBe(0);
      expect(logs.join("\n")).toContain("container.state=running");
      expect(logs.join("\n")).toContain("container.healthz=pass");
    } finally {
      console.log = originalLog;
    }
  });
});

describe("runLogsCommand", () => {
  it("redacts secret-like docker log lines", () => {
    const readComposeLogs = vi.fn(() => "ok line\nEDGE_AUTH_SECRET=secret\n");
    const deps = mockContainerDeps({ readComposeLogs });
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    try {
      const code = runLogsCommand(
        {
          command: "logs",
          developmentRoot: DEV_ROOT,
          imageTag: IMAGE_TAG,
          revision: null,
          skipInfra: false,
          tailLines: 10,
          skipWorktree: false,
        },
        deps,
      );
      expect(code).toBe(0);
      expect(logs.join("\n")).toContain("[redacted line omitted]");
      expect(logs.join("\n")).not.toContain("EDGE_AUTH_SECRET=secret");
    } finally {
      console.log = originalLog;
    }
  });
});
