"use client";

import { useEffect, useRef } from "react";
import { useActiveChart } from "../ActiveChartContext";
import { useAppActions } from "../AppActionsContext";
import { isEditableTarget } from "@/lib/shortcuts/isEditableTarget";
import {
  normalizeKeyboardEvent,
  resolveShortcutCommand,
  matchesCommand,
} from "@/lib/shortcuts/normalizeShortcut";
import { SHORTCUT_BINDINGS } from "@/lib/shortcuts/formatShortcutLabel";
import { buildShortcutCommands } from "./buildShortcutCommands";
import { useShortcutUIOptional } from "./ShortcutUIContext";

function isCommandPaletteToggle(event: KeyboardEvent): boolean {
  const normalized = normalizeKeyboardEvent(event);
  return matchesCommand(normalized, {
    id: "openCommandPalette",
    scope: "app",
    keys: SHORTCUT_BINDINGS.openCommandPalette,
    run: () => {},
  });
}

export default function ShortcutProvider({ children }: { children: React.ReactNode }) {
  const appActions = useAppActions();
  const activeChart = useActiveChart();
  const shortcutUI = useShortcutUIOptional();

  const depsRef = useRef({
    appActions,
    activeChart,
    commandPalette: shortcutUI?.getCommandPalette() ?? null,
    symbolSearch: shortcutUI?.getSymbolSearch() ?? null,
    toggleTheme: shortcutUI?.getThemeToggle() ?? null,
    openPositionsMenu: shortcutUI?.getOpenPositionsMenu() ?? null,
    hasOpenPositions: shortcutUI?.getOpenPositionsAvailability() ?? null,
  });

  depsRef.current = {
    appActions,
    activeChart,
    commandPalette: shortcutUI?.getCommandPalette() ?? null,
    symbolSearch: shortcutUI?.getSymbolSearch() ?? null,
    toggleTheme: shortcutUI?.getThemeToggle() ?? null,
    openPositionsMenu: shortcutUI?.getOpenPositionsMenu() ?? null,
    hasOpenPositions: shortcutUI?.getOpenPositionsAvailability() ?? null,
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const liveDeps = {
        appActions: depsRef.current.appActions,
        activeChart: depsRef.current.activeChart,
        commandPalette: shortcutUI?.getCommandPalette() ?? null,
        symbolSearch: shortcutUI?.getSymbolSearch() ?? null,
        toggleTheme: shortcutUI?.getThemeToggle() ?? null,
        openPositionsMenu: shortcutUI?.getOpenPositionsMenu() ?? null,
        hasOpenPositions: shortcutUI?.getOpenPositionsAvailability() ?? null,
      };

      const paletteToggle = isCommandPaletteToggle(event);
      const palette = liveDeps.commandPalette;
      const paletteOpen = palette?.isOpen() ?? false;

      if (paletteOpen && !paletteToggle) {
        return;
      }

      if (isEditableTarget(event.target) && !paletteToggle) {
        return;
      }

      const normalized = normalizeKeyboardEvent(event);
      const liveCommands = buildShortcutCommands(liveDeps);
      const match = resolveShortcutCommand(normalized, liveCommands);
      if (!match) return;

      if (paletteToggle && paletteOpen) {
        event.preventDefault();
        palette?.close();
        return;
      }

      event.preventDefault();
      void match.run();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcutUI]);

  return <>{children}</>;
}
