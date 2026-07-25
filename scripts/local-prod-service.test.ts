import { describe, expect, it, vi } from "vitest";

import {
  LOCAL_PROD_SERVICE_LABEL,
  launchAgentPlistPath,
  launchAgentTarget,
  parseLocalProdServiceArgs,
  renderLaunchAgentPlist,
  runInstallCommand,
  runLogsCommand,
  runUninstallCommand,
  type LocalProdServiceDeps,
} from "./local-prod-service.mts";

const TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>Label</key><string>com.edge.local-prod</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>@DEV_ROOT@/scripts/local-prod-service.sh</string><string>run</string></array>
  <key>EnvironmentVariables</key>
  <dict><key>HOME</key><string>@HOME@</string><key>PATH</key><string>@PATH@</string></dict>
</dict>
</plist>`;

function mockServiceDeps(partial: Partial<LocalProdServiceDeps> = {}): LocalProdServiceDeps {
  const files = new Map<string, string>();
  const dirs = new Set<string>();
  return {
    execFile: vi.fn(() => "state = running"),
    existsSync: (path) => files.has(String(path)) || dirs.has(String(path)),
    readFileSync: (path) => files.get(String(path)) ?? "",
    writeFileSync: (path, data) => {
      files.set(String(path), String(data));
    },
    mkdirSync: (path) => {
      dirs.add(String(path));
    },
    unlinkSync: (path) => {
      files.delete(String(path));
    },
    uid: 501,
    homeDir: "/Users/tester",
    cwd: "/Users/tester/TV AI",
    ...partial,
  };
}

describe("renderLaunchAgentPlist", () => {
  it("substitutes paths without secret keys", () => {
    const rendered = renderLaunchAgentPlist({
      devRoot: "/Users/tester/TV AI",
      homeDir: "/Users/tester",
      pathEnv: "/opt/homebrew/bin:/usr/bin:/bin",
      template: TEMPLATE,
    });
    expect(rendered).toContain("/Users/tester/TV AI/scripts/local-prod-service.sh");
    expect(rendered).not.toContain("EDGE_API_KEY");
    expect(rendered).not.toContain("EDGE_AUTH_SECRET");
    expect(rendered).toContain("<string>com.edge.local-prod</string>");
  });
});

describe("parseLocalProdServiceArgs", () => {
  it("parses install with tail lines override", () => {
    const options = parseLocalProdServiceArgs(["install", "--lines", "50"], "/tmp/dev");
    expect(options.command).toBe("install");
    expect(options.tailLines).toBe(50);
  });
});

describe("runInstallCommand", () => {
  it("refuses when preflight fails", async () => {
    const options = parseLocalProdServiceArgs(["install"], "/missing/dev");
    const code = await runInstallCommand(options, mockServiceDeps());
    expect(code).toBe(1);
  });
});

describe("runUninstallCommand", () => {
  it("is idempotent when plist is absent", () => {
    const deps = mockServiceDeps({
      execFile: vi.fn(() => {
        throw new Error("not loaded");
      }),
    });
    expect(runUninstallCommand(parseLocalProdServiceArgs(["uninstall"]), deps)).toBe(0);
  });
});

describe("runLogsCommand", () => {
  it("redacts secret-like lines", () => {
    const devRoot = "/Users/tester/TV AI";
    const logPath = `${devRoot}/.edge/local-prod/local-prod.log`;
    const deps = mockServiceDeps({
      existsSync: (path) => String(path) === logPath,
      readFileSync: () => "ok line\nEDGE_API_KEY=secret-value\n",
    });
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    try {
      runLogsCommand(parseLocalProdServiceArgs(["logs"], devRoot), deps);
    } finally {
      console.log = originalLog;
    }
    expect(logs.some((line) => line.includes("[redacted line omitted]"))).toBe(true);
    expect(logs.some((line) => line.includes("secret-value"))).toBe(false);
  });
});

describe("launchAgentTarget", () => {
  it("uses gui uid label path", () => {
    expect(launchAgentTarget({ uid: 501 })).toBe(`gui/501/${LOCAL_PROD_SERVICE_LABEL}`);
    expect(launchAgentPlistPath({ homeDir: "/Users/tester" })).toBe(
      "/Users/tester/Library/LaunchAgents/com.edge.local-prod.plist",
    );
  });
});
