import type { TwsHealthProbe } from "./client";

export type SidecarOwnershipResult = {
  foreign: boolean;
  reason?: string;
};

/** Verify sidecar /health ownership in local managed mode. */
export function checkSidecarOwnership(
  health: TwsHealthProbe | null,
  ownedInstanceId: string | null,
): SidecarOwnershipResult {
  if (!health?.ok) {
    return { foreign: false };
  }

  const managedBy = health.managedBy ?? "standalone";
  const instanceId = health.instanceId;

  if (managedBy === "edge-local") {
    if (ownedInstanceId && instanceId === ownedInstanceId) {
      return { foreign: false };
    }
    if (!ownedInstanceId) {
      return {
        foreign: true,
        reason:
          "Port 8765 is owned by another Edge dev instance. Stop that instance, set TWS_MANAGED=external, or run a standalone sidecar (npm run tws:sidecar).",
      };
    }
    return {
      foreign: true,
      reason: "Sidecar instance mismatch — restart the managed sidecar or use TWS_MANAGED=external.",
    };
  }

  return { foreign: false };
}
