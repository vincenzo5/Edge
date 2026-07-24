"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useCopilot } from "./CopilotContext";

export function CopilotThreadUrlFocus() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copilot = useCopilot();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const threadId = searchParams.get("threadId");
    if (!threadId || !copilot || handledRef.current === threadId) return;
    handledRef.current = threadId;

    void (async () => {
      await copilot.switchThread(threadId);
      router.replace("/copilot");
    })();
  }, [copilot, router, searchParams]);

  return null;
}
