export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.TWS_ENABLED !== "true") return;

  // Node-only sidecar hooks live in a dynamic import so Turbopack does not
  // statically analyze process.on for Edge route bundles.
  await import("./src/lib/marketData/providers/tws/registerNodeSidecar").then((m) =>
    m.registerNodeSidecar(),
  );
}
