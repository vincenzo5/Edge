"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type ContextMenuItem = {
  id: string;
  label: string;
  shortcut?: string;
  danger?: boolean;
  dividerAfter?: boolean;
  disabled?: boolean;
  action: () => void;
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
      setAdjustedPos(null);
      return;
    }
    const menu = menuRef.current;
    if (!menu) {
      setAdjustedPos(position);
      return;
    }
    const rect = menu.getBoundingClientRect();
    setAdjustedPos(
      clampMenuPosition(
        position,
        rect.width,
        rect.height,
        window.innerWidth,
        window.innerHeight,
      ),
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
      className="fixed z-50 min-w-[180px] rounded border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
      {header && (
        <div className="border-b border-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 dark:border-gray-800 dark:text-gray-400">
          {header}
        </div>
      )}
      {items.map((item) => (
        <div key={item.id}>
          <MenuItemRow
            label={item.label}
            shortcut={item.shortcut}
            danger={item.danger}
            disabled={item.disabled}
            onClick={() => {
              if (!item.disabled) {
                item.action();
              }
            }}
          />
          {item.dividerAfter && (
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
          )}
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
  onClick,
}: {
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors ${
        disabled
          ? "cursor-not-allowed text-gray-300 dark:text-gray-600"
          : danger
            ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      }`}
    >
      <span>{label}</span>
      {shortcut && (
        <span className="ml-4 text-xs text-gray-400 dark:text-gray-500">
          {shortcut}
        </span>
      )}
    </button>
  );
}
