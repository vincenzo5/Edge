"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import EdgeMenuItem from "./design-system/EdgeMenuItem";
import { popoverPanelClass } from "./design-system/styles";

export type ContextMenuItem = {
  id: string;
  label: string;
  shortcut?: string;
  danger?: boolean;
  dividerAfter?: boolean;
  disabled?: boolean;
  action: () => void;
  children?: ContextMenuItem[];
};

type Props = {
  open: boolean;
  position: { x: number; y: number } | null;
  items: ContextMenuItem[];
  header?: string;
  onClose: () => void;
};

export function clampMenuPosition(
  position: { x: number; y: number },
  menuWidth: number,
  menuHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding = 8,
): { x: number; y: number } {
  let x = position.x;
  let y = position.y;
  if (x + menuWidth > viewportWidth) x = viewportWidth - menuWidth - padding;
  if (y + menuHeight > viewportHeight) y = viewportHeight - menuHeight - padding;
  if (x < 0) x = padding;
  if (y < 0) y = padding;
  return { x, y };
}

export function resolveSubmenuPlacement(
  triggerRect: Pick<DOMRect, "left" | "right">,
  submenuWidth: number,
  viewportWidth: number,
  gap = 2,
): "left" | "right" {
  const rightSpace = viewportWidth - triggerRect.right - gap;
  const leftSpace = triggerRect.left - gap;
  if (rightSpace >= submenuWidth) return "right";
  if (leftSpace >= submenuWidth) return "left";
  return leftSpace > rightSpace ? "left" : "right";
}

const menuShellClass = `${popoverPanelClass("dark")} fixed z-50 min-w-[220px] py-1`;

export default function ContextMenu({
  open,
  position,
  items,
  header,
  onClose,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open || !position) {
      setAdjustedPos((prev) => (prev == null ? prev : null));
      return;
    }
    const menu = menuRef.current;
    if (!menu) {
      setAdjustedPos((prev) =>
        prev && prev.x === position.x && prev.y === position.y ? prev : position,
      );
      return;
    }
    const rect = menu.getBoundingClientRect();
    const next = clampMenuPosition(
      position,
      rect.width,
      rect.height,
      window.innerWidth,
      window.innerHeight,
    );
    setAdjustedPos((prev) =>
      prev && prev.x === next.x && prev.y === next.y ? prev : next,
    );
  }, [open, position, items, header]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [open, onClose]);

  if (!open || !position || items.length === 0) return null;

  const displayPos = adjustedPos ?? position;

  return (
    <div
      ref={menuRef}
      style={{ left: displayPos.x, top: displayPos.y }}
      className={menuShellClass}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseMove={(event) => event.stopPropagation()}
    >
      {header ? (
        <div className="border-b border-[var(--edge-border)] px-3 py-1.5 text-xs font-medium text-[var(--edge-text-secondary)]">
          {header}
        </div>
      ) : null}
      {items.map((item) => (
        <div key={item.id}>
          <MenuItemRow
            label={item.label}
            shortcut={item.shortcut}
            danger={item.danger}
            disabled={item.disabled}
            hasSubmenu={Boolean(item.children?.length)}
            onClick={() => {
              if (!item.disabled && !item.children?.length) {
                item.action();
              }
            }}
            submenu={
              item.children?.length ? (
                <SubMenu items={item.children} onClose={onClose} />
              ) : null
            }
          />
          {item.dividerAfter ? <div className="edge-menu-divider" /> : null}
        </div>
      ))}
    </div>
  );
}

function SubMenu({
  items,
  onClose,
}: {
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  const submenuRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<"left" | "right">("right");

  useLayoutEffect(() => {
    const submenu = submenuRef.current;
    const trigger = submenu?.parentElement;
    if (!submenu || !trigger) return;

    setPlacement(
      resolveSubmenuPlacement(
        trigger.getBoundingClientRect(),
        submenu.getBoundingClientRect().width,
        window.innerWidth,
      ),
    );
  }, [items]);

  return (
    <div
      ref={submenuRef}
      className={`${menuShellClass} absolute top-0 min-w-[200px]`}
      style={
        placement === "left"
          ? { right: "100%", marginRight: 2 }
          : { left: "100%", marginLeft: 2 }
      }
    >
      {items.map((item) => (
        <div key={item.id}>
          <EdgeMenuItem
            label={item.label}
            shortcut={item.shortcut}
            danger={item.danger}
            disabled={item.disabled}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
          />
        </div>
      ))}
    </div>
  );
}

function MenuItemRow({
  label,
  shortcut,
  danger,
  disabled,
  hasSubmenu,
  submenu,
  onClick,
}: {
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  hasSubmenu?: boolean;
  submenu?: React.ReactNode;
  onClick: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => hasSubmenu && setOpen(true)}
      onMouseLeave={() => hasSubmenu && setOpen(false)}
    >
      <EdgeMenuItem
        label={label}
        shortcut={shortcut}
        danger={danger}
        disabled={disabled}
        hasSubmenu={hasSubmenu}
        onClick={onClick}
      />
      {open && submenu}
    </div>
  );
}
