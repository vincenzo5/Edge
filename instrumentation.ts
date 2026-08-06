export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  await import("./src/lib/marketData/cache/serverCacheBackends").then((m) =>
    m.ensureServerCacheBackendsInitialized(),
  );

  await import("./src/lib/observability/accessLogHook").then((m) =>
    m.registerAccessLogHook(),
  );

  await import("./src/lib/trading/manageWorker").then((m) => m.startManageWorker());

  if (process.env.TWS_ENABLED !== "true") return;

  // Node-only sidecar hooks live in a dynamic import so Turbopack does not
  // statically analyze process.on for Edge route bundles.
  await import("./src/lib/marketData/providers/tws/registerNodeSidecar").then((m) =>
    m.registerNodeSidecar(),
  );
}
