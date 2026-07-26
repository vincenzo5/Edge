import { describe, expect, it, vi } from "vitest";

import {
  inspectComposeAppService,
  parseComposeConfigJson,
  runComposeAppServiceInspect,
  type ComposeConfigExec,
} from "./compose-app-service.mts";
import {
  CONTAINER_COMPOSE_APP_SERVICE_CONTRACT,
  formatComposeAppServiceSummary,
  validateComposeAppService,
  type ComposeAppServiceFacts,
} from "./validate-local-deploy.mts";

const FULL_SHA = "5aa83b921c51a7dadc625101076301ce765ac03d";
const DEV_ROOT = "/Users/example/TV AI";

function validComposeConfig() {
  return {
    services: {
      postgres: {
        ports: [{ host_ip: "127.0.0.1", published: 5432, target: 5432 }],
      },
      redis: {
        ports: [{ host_ip: "127.0.0.1", published: 6379, target: 6379 }],
      },
      "app-prod": {
        ports: [{ host_ip: "127.0.0.1", published: 3000, target: 3000 }],
        env_file: [".edge/local-prod/production.env"],
        depends_on: {
          postgres: { condition: "service_healthy" },
          redis: { condition: "service_healthy" },
        },
        healthcheck: {
          test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/healthz')"],
        },
        restart: "unless-stopped",
        volumes: [
          "./data/journal-screenshots:/app/data/journal-screenshots",
          "./data/copilot-attachments:/app/data/copilot-attachments",
        ],
        extra_hosts: ["host.docker.internal=host-gateway"],
        logging: {
          driver: "json-file",
          options: {
            "max-size": "10m",
            "max-file": "3",
          },
        },
      },
      "app-prod-migrate": {
        image: `edge-app:${FULL_SHA}-migrate`,
        profiles: ["migrate"],
        restart: "no",
        env_file: [".edge/local-prod/production.env"],
        depends_on: {
          postgres: { condition: "service_healthy" },
        },
      },
    },
  };
}

function validFacts(): ComposeAppServiceFacts {
  return parseComposeConfigJson(validComposeConfig(), {
    appProd: [".edge/local-prod/production.env"],
    appProdMigrate: [".edge/local-prod/production.env"],
  });
}

function issueCodes(facts: ComposeAppServiceFacts): string[] {
  return validateComposeAppService(facts).map((issue) => issue.code);
}

describe("compose-app-service contracts", () => {
  it("parses a valid compose config into facts", () => {
    const facts = validFacts();
    expect(facts.appProd?.portBindings).toEqual(["127.0.0.1:3000:3000"]);
    expect(facts.postgres?.portBindings).toEqual(["127.0.0.1:5432:5432"]);
    expect(facts.redis?.portBindings).toEqual(["127.0.0.1:6379:6379"]);
    expect(facts.appProd?.portBindings).toContain("127.0.0.1:3000:3000");
    expect(facts.appProd?.envFiles).toContain(".edge/local-prod/production.env");
    expect(facts.appProd?.dependsOn).toEqual(["postgres", "redis"]);
    expect(facts.appProdMigrate?.profiles).toEqual(["migrate"]);
    expect(facts.appProdMigrate?.image).toBe(`edge-app:${FULL_SHA}-migrate`);
  });

  it("accepts the frozen compose contract", () => {
    expect(issueCodes(validFacts())).toEqual([]);
  });

  it("formats secret-free summary lines", () => {
    const output = formatComposeAppServiceSummary(validFacts());
    expect(output).toContain("app-prod.present=yes");
    expect(output).toContain("app-prod.port=127.0.0.1:3000:3000");
    expect(output).toContain("app-prod.env_file=.edge/local-prod/production.env");
    expect(output).toContain("app-prod.durableMounts=2");
    expect(output).toContain(`app-prod-migrate.profile=${CONTAINER_COMPOSE_APP_SERVICE_CONTRACT.migrateProfile}`);
    expect(output.join("\n")).not.toMatch(/password|secret|api[_-]?key/i);
  });

  it("rejects non-loopback app port binding", () => {
    const config = validComposeConfig();
    config.services["app-prod"].ports = [{ host_ip: "0.0.0.0", published: 3000, target: 3000 }];
    expect(
      issueCodes(
        parseComposeConfigJson(config, {
          appProd: [".edge/local-prod/production.env"],
          appProdMigrate: [".edge/local-prod/production.env"],
        }),
      ),
    ).toContain("app-prod.port_binding");
  });

  it("rejects missing durable mount", () => {
    const config = validComposeConfig();
    config.services["app-prod"].volumes = [
      "./data/journal-screenshots:/app/data/journal-screenshots",
    ];
    expect(
      issueCodes(
        parseComposeConfigJson(config, {
          appProd: [".edge/local-prod/production.env"],
          appProdMigrate: [".edge/local-prod/production.env"],
        }),
      ),
    ).toContain("app-prod.durable_mount_missing");
  });

  it("rejects extra durable mount", () => {
    const config = validComposeConfig();
    config.services["app-prod"].volumes = [
      "./data/journal-screenshots:/app/data/journal-screenshots",
      "./data/copilot-attachments:/app/data/copilot-attachments",
      "./data/extra:/app/data/extra",
    ];
    expect(
      issueCodes(
        parseComposeConfigJson(config, {
          appProd: [".edge/local-prod/production.env"],
          appProdMigrate: [".edge/local-prod/production.env"],
        }),
      ),
    ).toContain("app-prod.durable_mount_extra");
  });

  it("rejects migrate service without profile", () => {
    const config = validComposeConfig();
    delete config.services["app-prod-migrate"].profiles;
    expect(
      issueCodes(
        parseComposeConfigJson(config, {
          appProd: [".edge/local-prod/production.env"],
          appProdMigrate: [".edge/local-prod/production.env"],
        }),
      ),
    ).toContain("app-prod-migrate.profile_missing");
  });

  it("rejects migrate image without suffix", () => {
    const config = validComposeConfig();
    config.services["app-prod-migrate"].image = `edge-app:${FULL_SHA}`;
    expect(
      issueCodes(
        parseComposeConfigJson(config, {
          appProd: [".edge/local-prod/production.env"],
          appProdMigrate: [".edge/local-prod/production.env"],
        }),
      ),
    ).toContain("app-prod-migrate.image_suffix");
  });

  it("rejects non-loopback postgres port binding", () => {
    const config = validComposeConfig();
    config.services.postgres.ports = [{ host_ip: "0.0.0.0", published: 5432, target: 5432 }];
    expect(
      issueCodes(
        parseComposeConfigJson(config, {
          appProd: [".edge/local-prod/production.env"],
          appProdMigrate: [".edge/local-prod/production.env"],
        }),
      ),
    ).toContain("postgres.port_binding");
  });

  it("inspectComposeAppService parses docker compose config output", () => {
    const execFile: ComposeConfigExec = vi.fn(() => JSON.stringify(validComposeConfig()));
    const facts = inspectComposeAppService(process.cwd(), execFile);
    expect(facts.appProd?.dependsOn).toEqual(["postgres", "redis"]);
    expect(facts.appProd?.envFiles).toContain(".edge/local-prod/production.env");
    expect(issueCodes(facts)).toEqual([]);
  });

  it("runComposeAppServiceInspect exits 0 on valid contract", () => {
    const execFile: ComposeConfigExec = vi.fn(() => JSON.stringify(validComposeConfig()));
    const logs: string[] = [];
    const errors: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));
    console.error = (...args: unknown[]) => errors.push(args.join(" "));
    try {
      expect(
        runComposeAppServiceInspect(process.cwd(), execFile, { ensureProductionEnv: false }),
      ).toBe(0);
      expect(logs.some((line) => line.includes("compose.validate=pass"))).toBe(true);
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  });

  it("runComposeAppServiceInspect exits 1 on contract failure", () => {
    const config = validComposeConfig();
    config.services["app-prod"].ports = [{ host_ip: "0.0.0.0", published: 3000, target: 3000 }];
    const execFile: ComposeConfigExec = vi.fn(() => JSON.stringify(config));
    expect(runComposeAppServiceInspect(process.cwd(), execFile, { ensureProductionEnv: false })).toBe(
      1,
    );
  });
});
