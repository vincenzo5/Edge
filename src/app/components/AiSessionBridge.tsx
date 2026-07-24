"use client";

import { useEffect, useRef } from "react";
import { useAiTools } from "./AiToolsProvider";
import type { SessionJob } from "@/lib/ai/types";
import {
  bridgeSecretGetHeaders,
  bridgeSecretHeaders,
  persistBridgeCredentials,
  readStoredBridgeCredentials,
} from "@/lib/ai/bridgeClientStorage";

export const AI_SESSION_HEARTBEAT_INTERVAL_MS = 45_000;
/** Yield after an empty long-poll so fast responses do not tight-loop the client. */
export const AI_SESSION_POLL_IDLE_YIELD_MS = 50;

export default function AiSessionBridge() {
  const ai = useAiTools();
  const aiRef = useRef(ai);
  aiRef.current = ai;
  const sessionIdRef = useRef<string | null>(null);
  const bridgeSecretRef = useRef<string | null>(null);
  const pollingRef = useRef(false);

  useEffect(() => {
    if (!aiRef.current) return;

    const stored = readStoredBridgeCredentials();
    sessionIdRef.current = stored.sessionId;
    bridgeSecretRef.current = stored.bridgeSecret;

    let cancelled = false;

    async function heartbeat() {
      try {
        const res = await fetch("/api/ai/session/heartbeat", {
          method: "POST",
          headers: bridgeSecretHeaders(bridgeSecretRef.current),
          body: JSON.stringify(
            sessionIdRef.current ? { sessionId: sessionIdRef.current } : {},
          ),
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          sessionId?: string;
          bridgeSecret?: string;
        };
        if (json.sessionId) sessionIdRef.current = json.sessionId;
        if (json.bridgeSecret) {
          bridgeSecretRef.current = json.bridgeSecret;
        }
        if (json.sessionId && bridgeSecretRef.current) {
          persistBridgeCredentials(json.sessionId, bridgeSecretRef.current);
        }
      } catch {
        // ignore transient network errors
      }
    }

    async function runJob(job: SessionJob) {
      const aiTools = aiRef.current;
      if (!aiTools) return;

      let result;
      try {
        result = await aiTools.execute(job.name, job.input, {
          permissionMode: job.permissionMode,
          confirmationValidatedByServer: job.confirmationValidatedByServer,
        });
      } catch (err) {
        result = {
          ok: false,
          error: err instanceof Error ? err.message : "Tool execution failed",
          code: "execution",
        };
      }

      await fetch("/api/ai/session/result", {
        method: "POST",
        headers: bridgeSecretHeaders(bridgeSecretRef.current),
        body: JSON.stringify({ jobId: job.jobId, result }),
      });
    }

    async function pollLoop() {
      if (pollingRef.current) return;
      pollingRef.current = true;

      while (!cancelled) {
        try {
          const res = await fetch("/api/ai/session/poll", {
            headers: bridgeSecretGetHeaders(bridgeSecretRef.current),
          });
          if (res.ok) {
            const json = (await res.json()) as { job: SessionJob | null };
            if (json.job) {
              await runJob(json.job);
              continue;
            }
          }
        } catch {
          // retry on next iteration
        }

        await new Promise((r) => setTimeout(r, AI_SESSION_POLL_IDLE_YIELD_MS));
      }

      pollingRef.current = false;
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        void heartbeat();
      }
    }

    void (async () => {
      await heartbeat();
      if (!cancelled) {
        void pollLoop();
      }
    })();

    const heartbeatTimer = window.setInterval(() => {
      void heartbeat();
    }, AI_SESSION_HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      pollingRef.current = false;
      window.clearInterval(heartbeatTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [Boolean(ai)]);

  return null;
}
