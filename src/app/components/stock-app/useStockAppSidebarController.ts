"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_SIDEBAR_PREFS,
  type ChartLayout,
  type SidebarPanelId,
  type FloatingPanelGeometry,
} from "@/lib/chartConfig";
import {
  resolveSidebarPanelWidth,
  computeScreenerExpandedSidebarWidth,
  clampSidebarWidthOnPanelLeave,
} from "@/lib/responsive/sidebarWidth";
import {
  LAYOUT_DIMENSIONS,
  RESPONSIVE_BREAKPOINTS,
} from "@/lib/responsive/layoutConstants";
import { useResponsiveLayout } from "@/lib/responsive/useResponsiveLayout";
import {
  defaultFloatingGeometry,
  getPanelPresentation,
} from "@/lib/sidebar/floatingPanelGeometry";
import type { MutableRefObject } from "react";

type Args = {
  layout: ChartLayout;
  setLayout: (updater: ChartLayout | ((prev: ChartLayout) => ChartLayout)) => void;
  hydratedRef: MutableRefObject<boolean>;
};

export function useStockAppSidebarController({ layout, setLayout, hydratedRef }: Args) {
  const [screenerPanelExpanded, setScreenerPanelExpanded] = useState(false);
  const screenerPreExpandWidthRef = useRef<number | null>(null);
  const responsive = useResponsiveLayout();
  const activePanel = layout.sidebar?.activePanel ?? null;
  const sidebarRailWidth =
    responsive.railMode === "compact"
      ? LAYOUT_DIMENSIONS.compactSidebarRailWidth
      : LAYOUT_DIMENSIONS.sidebarRailWidth;
  const sidebarPanelWidth = resolveSidebarPanelWidth(
    layout.sidebar?.width,
    activePanel,
    responsive.viewportWidth,
    sidebarRailWidth,
  );
  const activePresentation =
    activePanel != null ? getPanelPresentation(layout.sidebar, activePanel) : "docked";
  const isPanelFloating = activePresentation === "floating";

  const handleSidebarPanelChange = useCallback(
    (activePanelId: SidebarPanelId | null) => {
      setLayout((prev) => {
        const prevPanel = prev.sidebar?.activePanel ?? null;
        const storedWidth = prev.sidebar?.width;
        const shouldClamp =
          prevPanel === "screener" &&
          activePanelId !== "screener" &&
          typeof storedWidth === "number";
        return {
          ...prev,
          sidebar: {
            ...(prev.sidebar ?? DEFAULT_SIDEBAR_PREFS),
            activePanel: activePanelId,
            ...(shouldClamp ? { width: clampSidebarWidthOnPanelLeave(storedWidth) } : {}),
          },
        };
      });
      setScreenerPanelExpanded(false);
      screenerPreExpandWidthRef.current = null;
    },
    [setLayout],
  );

  const handleSidebarToggle = useCallback(
    (id: SidebarPanelId) => {
      setLayout((prev) => {
        const current = prev.sidebar?.activePanel ?? null;
        const nextPanel = current === id ? null : id;
        const storedWidth = prev.sidebar?.width;
        const shouldClamp =
          current === "screener" &&
          nextPanel !== "screener" &&
          typeof storedWidth === "number";
        if (current === "screener" && nextPanel !== "screener") {
          setScreenerPanelExpanded(false);
          screenerPreExpandWidthRef.current = null;
        }
        return {
          ...prev,
          sidebar: {
            ...(prev.sidebar ?? DEFAULT_SIDEBAR_PREFS),
            activePanel: nextPanel,
            ...(shouldClamp ? { width: clampSidebarWidthOnPanelLeave(storedWidth) } : {}),
          },
        };
      });
    },
    [setLayout],
  );

  const handleSidebarWidthChange = useCallback(
    (width: number) => {
      setLayout((prev) => ({
        ...prev,
        sidebar: {
          ...(prev.sidebar ?? DEFAULT_SIDEBAR_PREFS),
          width,
        },
      }));
    },
    [setLayout],
  );

  const handleFloatingGeometryChange = useCallback(
    (panelId: SidebarPanelId, geometry: FloatingPanelGeometry) => {
      setLayout((prev) => ({
        ...prev,
        sidebar: {
          ...(prev.sidebar ?? DEFAULT_SIDEBAR_PREFS),
          floatingGeometry: {
            ...(prev.sidebar?.floatingGeometry),
            [panelId]: geometry,
          },
        },
      }));
    },
    [setLayout],
  );

  const handlePanelDock = useCallback(
    (panelId: SidebarPanelId) => {
      setLayout((prev) => ({
        ...prev,
        sidebar: {
          ...(prev.sidebar ?? DEFAULT_SIDEBAR_PREFS),
          presentation: {
            ...(prev.sidebar?.presentation),
            [panelId]: "docked",
          },
        },
      }));
    },
    [setLayout],
  );

  const handlePanelPopOut = useCallback(() => {
    setLayout((prev) => {
      const panelId = prev.sidebar?.activePanel;
      if (!panelId) return prev;
      const sidebar = prev.sidebar ?? DEFAULT_SIDEBAR_PREFS;
      const geometry =
        sidebar.floatingGeometry?.[panelId] ?? defaultFloatingGeometry(panelId);
      return {
        ...prev,
        sidebar: {
          ...sidebar,
          presentation: {
            ...sidebar.presentation,
            [panelId]: "floating",
          },
          floatingGeometry: {
            ...sidebar.floatingGeometry,
            [panelId]: geometry,
          },
        },
      };
    });
  }, [setLayout]);

  const handleSidebarClose = useCallback(() => {
    handleSidebarPanelChange(null);
  }, [handleSidebarPanelChange]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (responsive.viewportWidth >= RESPONSIVE_BREAKPOINTS.tablet) return;
    const panelId = layout.sidebar?.activePanel;
    if (!panelId) return;
    if (getPanelPresentation(layout.sidebar, panelId) !== "floating") return;
    handlePanelDock(panelId);
  }, [responsive.viewportWidth, layout.sidebar, handlePanelDock, hydratedRef]);

  const panelPresentation = useMemo(
    () => ({
      presentation: activePresentation,
      popOut: handlePanelPopOut,
      dock: () => {
        if (activePanel) handlePanelDock(activePanel);
      },
      canPopOut: activePanel != null && !isPanelFloating,
      canDock: isPanelFloating,
    }),
    [
      activePresentation,
      activePanel,
      handlePanelDock,
      handlePanelPopOut,
      isPanelFloating,
    ],
  );

  const handleScreenerExpand = useCallback(() => {
    screenerPreExpandWidthRef.current = sidebarPanelWidth;
    setScreenerPanelExpanded(true);
    const fillWidth = computeScreenerExpandedSidebarWidth(
      responsive.viewportWidth,
      sidebarRailWidth,
    );
    handleSidebarWidthChange(fillWidth);
  }, [
    handleSidebarWidthChange,
    responsive.viewportWidth,
    sidebarPanelWidth,
    sidebarRailWidth,
  ]);

  const handleScreenerCollapse = useCallback(() => {
    const restore =
      screenerPreExpandWidthRef.current ?? LAYOUT_DIMENSIONS.sidebarPanelWidth;
    setScreenerPanelExpanded(false);
    screenerPreExpandWidthRef.current = null;
    handleSidebarWidthChange(restore);
  }, [handleSidebarWidthChange]);

  const sidebarPanelWidthContext = useMemo(
    () => ({
      panelWidth: sidebarPanelWidth,
      viewportWidth: responsive.viewportWidth,
      isExpanded: screenerPanelExpanded,
      canExpand: activePanel === "screener" && !isPanelFloating,
      expand: handleScreenerExpand,
      collapse: handleScreenerCollapse,
    }),
    [
      activePanel,
      handleScreenerCollapse,
      handleScreenerExpand,
      isPanelFloating,
      responsive.viewportWidth,
      screenerPanelExpanded,
      sidebarPanelWidth,
    ],
  );

  return {
    activePanel,
    sidebarPanelWidth,
    sidebarRailWidth,
    isPanelFloating,
    responsive,
    handleSidebarPanelChange,
    handleSidebarToggle,
    handleSidebarWidthChange,
    handleFloatingGeometryChange,
    handlePanelDock,
    handlePanelPopOut,
    handleSidebarClose,
    panelPresentation,
    sidebarPanelWidthContext,
  };
}
