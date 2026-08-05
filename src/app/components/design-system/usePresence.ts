"use client";

import { useEffect, useState } from "react";

/** Matches `--edge-motion-normal` in globals.css. */
export const PRESENCE_EXIT_MS = 180;

function getPresenceExitMs(): number {
  if (typeof window === "undefined") return PRESENCE_EXIT_MS;
  if (typeof window.matchMedia !== "function") return PRESENCE_EXIT_MS;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : PRESENCE_EXIT_MS;
}

export type UsePresenceResult = {
  /** True while the node stays in the DOM (enter or exit animation in flight). */
  mounted: boolean;
  /** True when the visible CSS state should apply (post-enter rAF). */
  visible: boolean;
};

/** Keep a surface mounted through exit animations; honor reduced-motion with instant unmount. */
export function usePresence(open: boolean): UsePresenceResult {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setVisible(false);
    const exitMs = getPresenceExitMs();
    if (exitMs === 0) {
      setMounted(false);
      return;
    }

    const timer = window.setTimeout(() => setMounted(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [open]);

  return { mounted, visible };
}
