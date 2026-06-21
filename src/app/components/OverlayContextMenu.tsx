"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TrackedOverlay } from "@/lib/chartConfig";

type Props = {
  overlay: TrackedOverlay | null;
  position: { x: number; y: number } | null;
  onRemove: (id: string) => void;
  onLock: (id: string, locked: boolean) => void;
  onHide: (id: string, visible: boolean) => void;
  onRename: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onDuplicate: (id: string) => void;
  onClose: () => void;
};

type MenuItem = {
  id: string;
  label: string;
  shortcut?: string;
  danger?: boolean;
  dividerAfter?: boolean;
  action: () => void;
  disabled?: boolean;
};

export default function OverlayContextMenu({
  overlay,
  position,
  onRemove,
  onLock,
  onHide,
  onRename,
  onBringForward,
  onSendBackward,
  onDuplicate,
  onClose,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Adjust position so menu stays within viewport.
  useEffect(() => {
    if (!position || !overlay) {
      setAdjustedPos(null);
      return;
    }
    // Defer measurement to next frame so the menu renders at its natural size.
    const raf = requestAnimationFrame(() => {
      const menu = menuRef.current;
      if (!menu) {
        setAdjustedPos(position);
        return;
      }
      const rect = menu.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = position.x;
      let y = position.y;
      if (x + rect.width > vw) x = vw - rect.width - 8;
      if (y + rect.height > vh) y = vh - rect.height - 8;
      if (x < 0) x = 8;
      if (y < 0) y = 8;
      setAdjustedPos({ x, y });
    });
    return () => cancelAnimationFrame(raf);
  }, [position, overlay]);

  // Close on outside click.
  useEffect(() => {
    if (!overlay) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
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
  }, [overlay, onClose]);

  if (!overlay || !adjustedPos) return null;

  const items: MenuItem[] = [
    {
      id: "rename",
      label: "Rename",
      shortcut: "F2",
      action: () => onRename(overlay.id),
    },
    {
      id: "lock",
      label: overlay.locked ? "Unlock" : "Lock",
      shortcut: "⌘L",
      action: () => onLock(overlay.id, !overlay.locked),
    },
    {
      id: "hide",
      label: overlay.visible ? "Hide" : "Show",
      action: () => onHide(overlay.id, !overlay.visible),
    },
    {
      id: "forward",
      label: "Bring to Front",
      action: () => onBringForward(overlay.id),
      dividerAfter: true,
    },
    {
      id: "backward",
      label: "Send to Back",
      action: () => onSendBackward(overlay.id),
      dividerAfter: true,
    },
    {
      id: "duplicate",
      label: "Duplicate",
      shortcut: "⌘D",
      action: () => onDuplicate(overlay.id),
      dividerAfter: true,
    },
    {
      id: "remove",
      label: "Remove",
      shortcut: "⌫",
      danger: true,
      action: () => onRemove(overlay.id),
    },
  ];

  return (
    <div
      ref={menuRef}
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
      className="fixed z-50 min-w-[180px] rounded border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="border-b border-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 dark:border-gray-800 dark:text-gray-400">
        {overlay.label || overlay.name}
      </div>
      {items.map((item) => (
        <div key={item.id}>
          <MenuItemRow
            label={item.label}
            shortcut={item.shortcut}
            danger={item.danger}
            disabled={item.disabled}
            onClick={item.action}
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