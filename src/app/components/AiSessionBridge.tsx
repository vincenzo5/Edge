"use client";

import { useEffect, useRef } from "react";
import { useAiTools } from "./AiToolsProvider";
import type { SessionJob } from "@/lib/ai/types";

export default function AiSessionBridge() {
  const ai = useAiTools();
  const aiRef = useRef(ai);
  aiRef.current = ai;
  const sessionIdRef = useRef<string | null>(null);
  const pollingRef = useRef(false);

  useEffect(() => {
    if (!aiRef.current) return;

    let cancelled = false;

    async function heartbeat() {
      try {
        const res = await fetch("/api/ai/session/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            sessionIdRef.current ? { sessionId: sessionIdRef.current } : {},
          ),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { sessionId?: string };
        if (json.sessionId) sessionIdRef.current = json.sessionId;
      } catch {
        // ignore transient network errors
      }
    }

    async function runJob(job: SessionJob) {
      const aiTools = aiRef.current;
      if (!aiTools) return;

      const result = await aiTools.execute(job.name, job.input, {
        permissionMode: job.permissionMode,
        confirmed: job.confirmed,
      });

      await fetch("/api/ai/session/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.jobId, result }),
      });
    }

    async function pollLoop() {
      if (pollingRef.current) return;
      pollingRef.current = true;

      while (!cancelled) {
        try {
          // Refresh session on each poll — background tabs throttle setInterval.
          await heartbeat();
          const res = await fetch("/api/ai/session/poll");
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

        await new Promise((r) => setTimeout(r, 250));
      }

      pollingRef.current = false;
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        void heartbeat();
      }
    }

    void heartbeat();
    document.addEventListener("visibilitychange", onVisible);
    void pollLoop();

    return () => {
      cancelled = true;
      pollingRef.current = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [Boolean(ai)]);

  return null;
}
