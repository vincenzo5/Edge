"use client";

import { useEffect, useRef } from "react";
import { useActiveChart } from "../ActiveChartContext";
import { useAppActions } from "../AppActionsContext";
import { isEditableTarget } from "@/lib/shortcuts/isEditableTarget";
import {
  normalizeKeyboardEvent,
  resolveShortcutCommand,
} from "@/lib/shortcuts/normalizeShortcut";
import { buildShortcutCommands } from "./buildShortcutCommands";
import { useShortcutUIOptional } from "./ShortcutUIContext";

export default function ShortcutProvider({ children }: { children: React.ReactNode }) {
  const appActions = useAppActions();
  const activeChart = useActiveChart();
  const shortcutUI = useShortcutUIOptional();

  const depsRef = useRef({
    appActions,
    activeChart,
    quickSearch: shortcutUI?.getQuickSearch() ?? null,
  });

  depsRef.current = {
    appActions,
    activeChart,
    quickSearch: shortcutUI?.getQuickSearch() ?? null,
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const normalized = normalizeKeyboardEvent(event);
      const liveCommands = buildShortcutCommands(depsRef.current);
      const match = resolveShortcutCommand(normalized, liveCommands);
      if (!match) return;

      event.preventDefault();
      void match.run();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return <>{children}</>;
}
