"use client";

import { useEffect } from "react";
import { useAppChromeActions } from "@/app/components/home/AppChromeActionsProvider";
import { useShortcutUI } from "./ShortcutUIContext";

export default function OpenRiskShortcutRegistration() {
  const {
    positionsMenuOpen,
    openPositionsMenu,
    closePositionsMenu,
    hasOpenPositions,
  } = useAppChromeActions();
  const {
    registerOpenPositionsMenu,
    registerOpenPositionsAvailability,
  } = useShortcutUI();

  useEffect(() => {
    registerOpenPositionsMenu({
      open: openPositionsMenu,
      close: closePositionsMenu,
      isOpen: () => positionsMenuOpen,
    });
    registerOpenPositionsAvailability(hasOpenPositions);
    return () => {
      registerOpenPositionsMenu(null);
      registerOpenPositionsAvailability(null);
    };
  }, [
    closePositionsMenu,
    hasOpenPositions,
    openPositionsMenu,
    positionsMenuOpen,
    registerOpenPositionsAvailability,
    registerOpenPositionsMenu,
  ]);

  return null;
}
