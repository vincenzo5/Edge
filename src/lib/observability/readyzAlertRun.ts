import {
  applyReadyzProbeToState,
  readReadyzAlertState,
  resolveReadyzAlertFailureThreshold,
  resolveReadyzAlertStatePath,
  writeReadyzAlertState,
} from "./readyzAlertState";
import {
  postReadyzAlertWebhook,
  resolveAlertHost,
  type ReadyzAlertMessage,
} from "./readyzAlertNotify";
import { probeReadyz, resolveReadyzUrl } from "./readyzProbe";

export type ReadyzAlertRunOptions = {
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
  statePath?: string;
  readyzUrl?: string;
  threshold?: number;
  host?: string;
  webhookUrl?: string;
  now?: () => Date;
};

export type ReadyzAlertRunResult = {
  probe: Awaited<ReturnType<typeof probeReadyz>>;
  transition: ReturnType<typeof applyReadyzProbeToState>["transition"];
  notified: boolean;
  message?: ReadyzAlertMessage;
};

function buildMessage(
  transition: Exclude<
    ReturnType<typeof applyReadyzProbeToState>["transition"],
    { kind: "none" }
  >,
  host: string,
  at: Date,
): ReadyzAlertMessage {
  if (transition.kind === "recovery") {
    return {
      kind: "recovery",
      host,
      reasons: [],
      at: at.toISOString(),
    };
  }

  return {
    kind: "alert",
    host,
    reasons: transition.reasons,
    consecutiveFailures: transition.consecutiveFailures,
    at: at.toISOString(),
  };
}

export async function runReadyzAlertTick(
  options: ReadyzAlertRunOptions = {},
): Promise<ReadyzAlertRunResult> {
  const statePath = options.statePath ?? resolveReadyzAlertStatePath();
  const readyzUrl = options.readyzUrl ?? resolveReadyzUrl();
  const threshold =
    options.threshold ?? resolveReadyzAlertFailureThreshold();
  const host = options.host ?? resolveAlertHost();
  const at = options.now?.() ?? new Date();

  const probe = await probeReadyz(readyzUrl, options.fetchImpl);
  const previous = readReadyzAlertState(statePath);
  const { state, transition } = applyReadyzProbeToState(
    previous,
    probe,
    threshold,
    at.getTime(),
  );
  writeReadyzAlertState(state, statePath);

  if (transition.kind === "none") {
    return { probe, transition, notified: false };
  }

  const message = buildMessage(transition, host, at);

  if (options.dryRun) {
    return { probe, transition, notified: false, message };
  }

  await postReadyzAlertWebhook(message, {
    fetchImpl: options.fetchImpl,
    webhookUrl: options.webhookUrl,
  });
  return { probe, transition, notified: true, message };
}
