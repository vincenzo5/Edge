export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.TWS_ENABLED !== "true") return;

  const { ensureSidecarOnServerBoot, killManagedSidecar } = await import(
    "./src/lib/marketData/providers/tws/startup"
  );

  ensureSidecarOnServerBoot().catch((err) =>
    console.warn("[tws] startup ensure failed:", err),
  );

  for (const sig of ["SIGTERM", "SIGINT"] as const) {
    process.on(sig, () => killManagedSidecar());
  }
  process.on("beforeExit", () => killManagedSidecar());
}
