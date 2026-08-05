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

function isInsideAppContextMenuSurface(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[data-app-context-menu-surface="true"]'));
}

function isAppContextMenuGesture(event: MouseEvent): boolean {
  if (event.button !== 2) return false;
  // App chrome menu is header-only (plain or Control+right-click).
  return isInsideAppContextMenuSurface(event.target);
}

function isInsideBlockingOverlay(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('[role="dialog"], [role="alertdialog"], [data-app-context-menu-block="true"]'),
  );
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

  const buildMenuItems = useCallback((): ContextMenuItem[] => {
    return [
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
        id: "settings",
        label: "Settings",
        action: () => {
          chrome.openAppSettings();
        },
      },
    ];
  }, [chrome, workspace]);

  useEffect(() => {
    const shell = localRef.current;
    if (!shell) return;

    const onContextMenu = (event: MouseEvent) => {
      if (!isAppContextMenuGesture(event)) return;
      if (isInsideBlockingOverlay(event.target)) return;

      event.preventDefault();
      event.stopPropagation();

      setMenu({
        position: { x: event.clientX, y: event.clientY },
        items: buildMenuItems(),
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
