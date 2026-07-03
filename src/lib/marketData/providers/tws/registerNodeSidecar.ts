import "server-only";

/** Node-only sidecar boot + shutdown hooks — never import statically from instrumentation. */
export async function registerNodeSidecar(): Promise<void> {
  const { isTwsLocalManaged } = await import("./managedMode");
  if (!isTwsLocalManaged()) {
    return;
  }

  const globalState = globalThis as typeof globalThis & {
    __edgeSidecarHooksRegistered?: boolean;
  };
  if (globalState.__edgeSidecarHooksRegistered) {
    return;
  }
  globalState.__edgeSidecarHooksRegistered = true;

  const { ensureSidecarOnServerBoot, killManagedSidecar } = await import("./startup");

  ensureSidecarOnServerBoot().catch((err) =>
    console.warn("[tws] startup ensure failed:", err),
  );

  for (const sig of ["SIGTERM", "SIGINT"] as const) {
    process.on(sig, () => killManagedSidecar());
  }
  process.on("beforeExit", () => killManagedSidecar());
}
