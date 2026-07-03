import "server-only";

import type { TwsHealthProbe, TwsStatusProbe } from "./client";
import { getTwsManagedMode } from "./managedMode";

export type TwsSystemLifecycle =
  | "disabled"
  | "sidecar_starting"
  | "sidecar_ready"
  | "gateway_disconnected"
  | "api_connecting"
  | "ready"
  | "degraded"
  | "recovering"
  | "wedged"
  | "shutdown";

export type TwsLifecycleInput = {
  health?: TwsHealthProbe | null;
  status?: TwsStatusProbe | null;
  recoveryActive?: boolean;
};

export function deriveTwsSystemLifecycle(input: TwsLifecycleInput): TwsSystemLifecycle {
  const managed = getTwsManagedMode();
  if (managed == null) {
    return "disabled";
  }

  const { health, status, recoveryActive } = input;

  if (status?.connectionState === "shutdown" || health?.managedBy === "shutdown") {
    return "shutdown";
  }

  if (recoveryActive || status?.reconnectInProgress) {
    return "recovering";
  }

  if (status?.diagnostics?.workerWedged || status?.restartRequired) {
    return "wedged";
  }

  if (!health?.ok && !status?.sidecarReachable) {
    return managed === "local" ? "sidecar_starting" : "degraded";
  }

  if (health?.ok && !status?.gatewayConnected) {
    if (status?.connectionState === "gateway_disconnected") {
      return "gateway_disconnected";
    }
    if (status?.connectionState === "api_connecting") {
      return "api_connecting";
    }
    return "sidecar_ready";
  }

  if (status?.gatewayConnected) {
    if (status.subscriptionsLost) {
      return "degraded";
    }
    return "ready";
  }

  if (health?.ok) {
    return "sidecar_ready";
  }

  return "degraded";
}
