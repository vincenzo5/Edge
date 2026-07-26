import {
  LOCAL_CONTAINER_PRODUCTION_CONTRACT,
  type PortOwnershipFacts,
} from "./validate-local-deploy.mts";

export const APP_PROD_CONTAINER_NAME = "edge-app-prod";
export const PRODUCTION_APP_PORT = LOCAL_CONTAINER_PRODUCTION_CONTRACT.port;

export type PortOwnershipExec = (
  file: string,
  args: string[],
  options?: { cwd?: string; encoding?: BufferEncoding | null },
) => string;

export type ContainerProductionFacts = {
  present: boolean;
  running: boolean;
  status: string | null;
  health: string | null;
  imageTag: string | null;
};

export type LaunchAgentLoadState = {
  loaded: boolean;
  state: string | null;
  blocksContainerLifecycle: boolean;
};

export function readLaunchAgentLoadState(
  execFile: PortOwnershipExec,
  uid: number,
  label = "com.edge.local-prod",
): LaunchAgentLoadState {
  try {
    const output = execFile("launchctl", ["print", `gui/${uid}/${label}`]);
    const stateMatch = output.match(/^\s*state\s*=\s*(\S+)/m);
    const state = stateMatch?.[1] ?? null;
    const blocksContainerLifecycle =
      state === "running" || state === "launching" || state === "waiting";
    return { loaded: true, state, blocksContainerLifecycle };
  } catch {
    return { loaded: false, state: null, blocksContainerLifecycle: false };
  }
}

export function isLaunchAgentBlockingContainer(
  execFile: PortOwnershipExec,
  uid: number,
): boolean {
  return readLaunchAgentLoadState(execFile, uid).blocksContainerLifecycle;
}

export type PortOwnershipProbeDeps = {
  execFile: PortOwnershipExec;
  listenPidsOnPort: (port: number) => number[];
  isLaunchAgentLoaded: () => boolean;
  launchAgentBlocksContainer?: () => boolean;
};

export function readContainerProductionFacts(
  execFile: PortOwnershipExec,
  containerName = APP_PROD_CONTAINER_NAME,
): ContainerProductionFacts {
  try {
    const status = execFile("docker", [
      "inspect",
      "--format",
      "{{.State.Status}}",
      containerName,
    ]).trim();
    const running = status === "running";
    let health: string | null = null;
    try {
      const rawHealth = execFile("docker", [
        "inspect",
        "--format",
        "{{if .State.Health}}{{.State.Health.Status}}{{end}}",
        containerName,
      ]).trim();
      health = rawHealth || null;
    } catch {
      health = null;
    }
    let imageTag: string | null = null;
    try {
      imageTag =
        execFile("docker", ["inspect", "--format", "{{.Config.Image}}", containerName]).trim() ||
        null;
    } catch {
      imageTag = null;
    }
    return { present: true, running, status, health, imageTag };
  } catch {
    return {
      present: false,
      running: false,
      status: null,
      health: null,
      imageTag: null,
    };
  }
}

export function isContainerBoundPort3000(facts: ContainerProductionFacts): boolean {
  return facts.running;
}

export function collectPortOwnershipFacts(
  deps: PortOwnershipProbeDeps,
): PortOwnershipFacts {
  const container = readContainerProductionFacts(deps.execFile);
  return {
    legacyLaunchAgentLoaded: deps.isLaunchAgentLoaded(),
    containerBoundPort3000: isContainerBoundPort3000(container),
  };
}

export function unmanagedPort3000Listeners(
  deps: Pick<PortOwnershipProbeDeps, "execFile" | "listenPidsOnPort">,
  containerFacts: ContainerProductionFacts = readContainerProductionFacts(deps.execFile),
): number[] {
  if (containerFacts.running) return [];
  return deps.listenPidsOnPort(PRODUCTION_APP_PORT);
}

export function assertContainerLifecycleAllowed(
  deps: PortOwnershipProbeDeps,
): string | null {
  const launchAgentBlocks =
    deps.launchAgentBlocksContainer?.() ?? deps.isLaunchAgentLoaded();
  if (launchAgentBlocks) {
    return (
      "LaunchAgent owns production lifecycle. Stop it first: npm run local:prod:service:stop"
    );
  }

  const container = readContainerProductionFacts(deps.execFile);
  const listeners = unmanagedPort3000Listeners(deps, container);
  if (listeners.length > 0) {
    return `Port ${PRODUCTION_APP_PORT} is in use by unmanaged process(es): ${listeners.join(", ")}. Stop them before starting container production.`;
  }

  return null;
}

export function assertLegacyProductionStartAllowed(
  deps: Pick<PortOwnershipProbeDeps, "execFile">,
): string | null {
  const container = readContainerProductionFacts(deps.execFile);
  if (container.running) {
    return (
      "Docker container production owns port 3000. Use: npm run local:prod:container:stop (or container lifecycle commands)."
    );
  }
  return null;
}

export function readDockerServiceHealth(
  execFile: PortOwnershipExec,
  containerName: string,
): string | null {
  try {
    const health = execFile("docker", [
      "inspect",
      "--format",
      "{{if .State.Health}}{{.State.Health.Status}}{{end}}",
      containerName,
    ]).trim();
    return health || null;
  } catch {
    return null;
  }
}
