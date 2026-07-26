import { describe, expect, it, vi } from "vitest";

import {
  assertLoopbackCaddyfile,
  collectLocalHttpsStatusFacts,
  formatLocalHttpsStatusSummary,
  hasHostsEntryForEdgeLocal,
  LOCAL_HTTPS_BIND,
  LOCAL_HTTPS_HOST,
  LOCAL_HTTPS_UPSTREAM,
  parseLocalHttpsArgs,
  renderLaunchAgentPlist,
  type LocalHttpsDeps,
} from "./local-https.mts";

const DEV_ROOT = "/Users/example/TV AI";

function mockDeps(overrides: Partial<LocalHttpsDeps> = {}): LocalHttpsDeps {
  return {
    execFile: vi.fn(() => "") as LocalHttpsDeps["execFile"],
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn((path: string) => {
      if (path.endsWith("Caddyfile")) {
        return `edge.local {\n  bind 127.0.0.1\n  reverse_proxy 127.0.0.1:3000\n}\n`;
      }
      if (path.endsWith("plist.template")) {
        return "@DEV_ROOT@\n@HOME@\n@PATH@";
      }
      if (path === "/etc/hosts") {
        return "127.0.0.1 edge.local\n";
      }
      return "";
    }),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    unlinkSync: vi.fn(),
    uid: 501,
    homeDir: "/Users/example",
    fetchImpl: vi.fn(async (url: string | URL | Request) => {
      const href = typeof url === "string" ? url : url.toString();
      if (href.includes("/healthz") || href.includes("/readyz")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: false }), { status: 503 });
    }) as typeof fetch,
    listenPidsOnPort: vi.fn(() => [1234]),
    ...overrides,
  };
}

describe("parseLocalHttpsArgs", () => {
  it("parses install-certs with dev root", () => {
    expect(parseLocalHttpsArgs(["install-certs", "--dev-root", DEV_ROOT], DEV_ROOT)).toEqual({
      command: "install-certs",
      developmentRoot: DEV_ROOT,
      purgeCerts: false,
    });
  });

  it("parses uninstall with purge flag", () => {
    expect(parseLocalHttpsArgs(["uninstall", "--purge-certs"], DEV_ROOT)).toEqual({
      command: "uninstall",
      developmentRoot: DEV_ROOT,
      purgeCerts: true,
    });
  });
});

describe("assertLoopbackCaddyfile", () => {
  it("accepts loopback bind", () => {
    expect(() =>
      assertLoopbackCaddyfile("edge.local { bind 127.0.0.1 reverse_proxy 127.0.0.1:3000 }"),
    ).not.toThrow();
  });

  it("rejects missing loopback bind", () => {
    expect(() => assertLoopbackCaddyfile("edge.local { reverse_proxy 127.0.0.1:3000 }")).toThrow(
      /127\.0\.0\.1/,
    );
  });

  it("rejects public bind", () => {
    expect(() =>
      assertLoopbackCaddyfile("edge.local { bind 0.0.0.0 reverse_proxy 127.0.0.1:3000 }"),
    ).toThrow(/non-loopback/);
  });
});

describe("hasHostsEntryForEdgeLocal", () => {
  it("detects edge.local hosts entry", () => {
    const deps = mockDeps({
      readFileSync: vi.fn(() => "127.0.0.1 localhost\n127.0.0.1 edge.local\n"),
    });
    expect(hasHostsEntryForEdgeLocal(deps)).toBe(true);
  });

  it("returns false when missing", () => {
    const deps = mockDeps({
      readFileSync: vi.fn(() => "127.0.0.1 localhost\n"),
    });
    expect(hasHostsEntryForEdgeLocal(deps)).toBe(false);
  });
});

describe("formatLocalHttpsStatusSummary", () => {
  it("prints secret-free status lines", async () => {
    const facts = await collectLocalHttpsStatusFacts(DEV_ROOT, mockDeps());
    const output = formatLocalHttpsStatusSummary(facts);
    expect(output).toContain(`proxy.host=${LOCAL_HTTPS_HOST}`);
    expect(output).toContain(`upstream=${LOCAL_HTTPS_UPSTREAM}`);
    expect(output).toContain(`proxy.bind=${LOCAL_HTTPS_BIND}:443`);
    expect(output).toContain("proxy.up=yes");
    expect(output).toContain("tls.present=yes");
    expect(output).not.toMatch(/EDGE_AUTH_SECRET|EDGE_API_KEY|postgres:\/\//i);
  });
});

describe("renderLaunchAgentPlist", () => {
  it("substitutes dev root and home without secrets", () => {
    const rendered = renderLaunchAgentPlist({
      devRoot: DEV_ROOT,
      homeDir: "/Users/example",
      template: "@DEV_ROOT@\n@HOME@\n@PATH@",
    });
    expect(rendered).toContain(DEV_ROOT);
    expect(rendered).toContain("/Users/example");
    expect(rendered).toContain("/opt/homebrew/bin");
  });
});
