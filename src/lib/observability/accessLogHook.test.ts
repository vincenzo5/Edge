import http from "node:http";
import { describe, expect, it, vi, afterEach } from "vitest";
import { registerAccessLogHook } from "./accessLogHook";
import { getRequestId } from "./requestIdContext";

describe("accessLogHook", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("logs /api requests on finish with status and requestId header", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.VITEST;
    registerAccessLogHook();

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await new Promise<void>((resolve, reject) => {
      const server = http.createServer((_req, res) => {
        expect(getRequestId()).toBe("incoming-req");
        res.statusCode = 201;
        res.end("ok");
      });

      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          reject(new Error("missing listen address"));
          return;
        }

        const req = http.request(
          {
            host: "127.0.0.1",
            port: address.port,
            path: "/api/candles?token=secret",
            method: "GET",
            headers: { "x-edge-request-id": "incoming-req" },
          },
          (res) => {
            res.on("data", () => {});
            res.on("end", () => {
              expect(res.headers["x-edge-request-id"]).toBe("incoming-req");
              server.close((closeErr) => {
                if (closeErr) {
                  reject(closeErr);
                  return;
                }
                resolve();
              });
            });
          },
        );
        req.on("error", reject);
        req.end();
      });
    });

    expect(consoleSpy).toHaveBeenCalled();
    const line = JSON.parse(String(consoleSpy.mock.calls.at(-1)?.[0]));
    expect(line).toMatchObject({
      event: "http.access",
      method: "GET",
      path: "/api/candles",
      status: 201,
      requestId: "incoming-req",
    });
    expect(String(consoleSpy.mock.calls.at(-1)?.[0])).not.toContain("token");
  });

  it("skips non-api paths", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.VITEST;
    registerAccessLogHook();

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await new Promise<void>((resolve, reject) => {
      const server = http.createServer((_req, res) => {
        res.statusCode = 200;
        res.end("ok");
      });

      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          reject(new Error("missing listen address"));
          return;
        }

        const req = http.request(
          {
            host: "127.0.0.1",
            port: address.port,
            path: "/healthz",
            method: "GET",
          },
          (res) => {
            res.on("data", () => {});
            res.on("end", () => {
              server.close((closeErr) => {
                if (closeErr) {
                  reject(closeErr);
                  return;
                }
                resolve();
              });
            });
          },
        );
        req.on("error", reject);
        req.end();
      });
    });

    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
