"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import ContextMenu, { type ContextMenuItem } from "../ContextMenu";
import { useAppChromeActions } from "./AppChromeActionsProvider";
import { useOptionalAppWorkspace } from "../app-workspace/AppWorkspaceContext";
import type { AssignableSurfaceId } from "@/lib/appWorkspace/commands";

const PANEL_SURFACES: AssignableSurfaceId[] = [
  "chart",
  "screener",
  "journal",
  "scripts",
  "alerts",
  "copilot",
];

const PANEL_LABELS: Record<AssignableSurfaceId, string> = {
  chart: "Chart",
  screener: "Screener",
  journal: "Journal",
  scripts: "Scripts",
  alerts: "Alerts",
  copilot: "Copilot",
};

function isInsideAppContextMenuSurface(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[data-app-context-menu-surface="true"]'));
}

function isAppContextMenuGesture(event: MouseEvent): boolean {
  if (event.button !== 2) return false;
  // Control+right-click anywhere in the shell, or plain right-click on the app header.
  return event.ctrlKey || isInsideAppContextMenuSurface(event.target);
}

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

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export const AppContextMenuProvider = forwardRef<HTMLDivElement, Props>(function AppContextMenuProvider(
  { children, ...rest },
  ref,
) {
  const workspace = useOptionalAppWorkspace();
  const chrome = useAppChromeActions();
  const localRef = useRef<HTMLDivElement | null>(null);
  const [menu, setMenu] = useState<{
    position: { x: number; y: number };
    items: ContextMenuItem[];
  } | null>(null);

  const closeMenu = useCallback(() => setMenu(null), []);

  const setShellRef = useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );

  const buildMenuItems = useCallback(
    (tile: { tileId: string; surfaceId: string } | null): ContextMenuItem[] => {
      const items: ContextMenuItem[] = [
        {
          id: "edit-layout",
          label: "Edit layout",
          action: () => {
            workspace?.enterLayoutEdit();
          },
          disabled: !workspace,
        },
        {
          id: "order-account",
          label: "Order account",
          action: () => {
            chrome.openOrderAccountMenu();
          },
        },
        {
          id: "market-data",
          label: "Market data",
          action: () => {
            chrome.openMarketDataMenu();
          },
        },
        {
          id: "settings",
          label: "Settings",
          action: () => {
            chrome.openAppSettings();
          },
        },
      ];

      if (workspace && tile) {
        items.push({
          id: "change-panel-header",
          label: "Change panel",
          sectionHeader: true,
          action: () => {},
        });
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
      }

      return items;
    },
    [chrome, workspace],
  );

  useEffect(() => {
    const shell = localRef.current;
    if (!shell) return;

    const onContextMenu = (event: MouseEvent) => {
      if (!isAppContextMenuGesture(event)) return;
      if (isInsideBlockingOverlay(event.target)) return;

      event.preventDefault();
      event.stopPropagation();

      const tile = resolveWorkspaceTile(event.target);
      const items = buildMenuItems(tile);
      setMenu({
        position: { x: event.clientX, y: event.clientY },
        items,
      });
    };

    shell.addEventListener("contextmenu", onContextMenu, true);
    return () => shell.removeEventListener("contextmenu", onContextMenu, true);
  }, [buildMenuItems]);

  const menuElement = useMemo(
    () => (
      <ContextMenu
        open={Boolean(menu)}
        position={menu?.position ?? null}
        items={menu?.items ?? []}
        aria-label="Application menu"
        onClose={closeMenu}
      />
    ),
    [closeMenu, menu],
  );

  return (
    <div ref={setShellRef} {...rest}>
      {children}
      {menuElement}
    </div>
  );
});
