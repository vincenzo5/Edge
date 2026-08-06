"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import ContextMenu, { type ContextMenuItem } from "../ContextMenu";
import { useAppWorkspace } from "./AppWorkspaceContext";
import type { AssignableSurfaceId } from "@/lib/appWorkspace/commands";

const PANEL_SURFACES: AssignableSurfaceId[] = [
  "chart",
  "screener",
  "journal",
  "scripts",
  "alerts",
  "copilot",
  "expectancy",
];

const PANEL_LABELS: Record<AssignableSurfaceId, string> = {
  chart: "Chart",
  screener: "Screener",
  journal: "Journal",
  scripts: "Scripts",
  alerts: "Alerts",
  copilot: "Copilot",
  expectancy: "Expectancy",
};

function isInsideBlockingOverlay(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('[role="dialog"], [role="alertdialog"], [data-app-context-menu-block="true"]'),
  );
}

function resolveWorkspaceTile(target: EventTarget | null): {
  tileId: string;
  surfaceId: string;
} | null {
  if (!(target instanceof Element)) return null;
  const tile = target.closest("[data-workspace-tile-id]");
  if (!tile) return null;
  const tileId = tile.getAttribute("data-workspace-tile-id");
  const surfaceId = tile.getAttribute("data-surface");
  if (!tileId || !surfaceId) return null;
  return { tileId, surfaceId };
}

function isPanelChangeGesture(event: MouseEvent): boolean {
  if (event.button !== 2) return false;
  return event.ctrlKey;
}

/**
 * Control+right-click over a workspace tile opens Change panel (replace surface).
 * Mount inside AppWorkspaceProvider so assign actions have context.
 */
export default function WorkspacePanelContextMenu() {
  const workspace = useAppWorkspace();
  const [menu, setMenu] = useState<{
    position: { x: number; y: number };
    items: ContextMenuItem[];
  } | null>(null);

  const closeMenu = useCallback(() => setMenu(null), []);

  const buildMenuItems = useCallback(
    (tile: { tileId: string; surfaceId: string }): ContextMenuItem[] => {
      const items: ContextMenuItem[] = [
        {
          id: "change-panel-header",
          label: "Change panel",
          sectionHeader: true,
          action: () => {},
        },
      ];
      for (const surfaceId of PANEL_SURFACES) {
        items.push({
          id: `panel-${surfaceId}`,
          label: PANEL_LABELS[surfaceId],
          selected: tile.surfaceId === surfaceId,
          action: () => {
            workspace.assignWorkspaceTileSurface(tile.tileId, surfaceId);
          },
        });
      }
      return items;
    },
    [workspace],
  );

  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      if (!isPanelChangeGesture(event)) return;
      if (isInsideBlockingOverlay(event.target)) return;

      const tile = resolveWorkspaceTile(event.target);
      if (!tile) return;

      event.preventDefault();
      event.stopPropagation();

      setMenu({
        position: { x: event.clientX, y: event.clientY },
        items: buildMenuItems(tile),
      });
    };

    // Capture so chart/module menus do not win over panel swap.
    document.addEventListener("contextmenu", onContextMenu, true);
    return () => document.removeEventListener("contextmenu", onContextMenu, true);
  }, [buildMenuItems]);

  const menuElement = useMemo(
    () => (
      <ContextMenu
        open={Boolean(menu)}
        position={menu?.position ?? null}
        items={menu?.items ?? []}
        aria-label="Change panel"
        onClose={closeMenu}
      />
    ),
    [closeMenu, menu],
  );

  return menuElement;
}
