"use client";

import type { TrackedOverlay } from "@/lib/chartConfig";
import { getShortcutLabel } from "@/lib/shortcuts/formatShortcutLabel";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";

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
  if (!overlay) {
    return (
      <ContextMenu open={false} position={null} items={[]} onClose={onClose} />
    );
  }

  const items: ContextMenuItem[] = [
    {
      id: "rename",
      label: "Rename",
      shortcut: getShortcutLabel("renameDrawing"),
      action: () => onRename(overlay.id),
    },
    {
      id: "lock",
      label: overlay.locked ? "Unlock" : "Lock",
      shortcut: getShortcutLabel("lockDrawing"),
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
      shortcut: getShortcutLabel("duplicateDrawing"),
      action: () => onDuplicate(overlay.id),
      dividerAfter: true,
    },
    {
      id: "remove",
      label: "Remove",
      shortcut: getShortcutLabel("deleteDrawing"),
      danger: true,
      action: () => onRemove(overlay.id),
    },
  ];

  return (
    <ContextMenu
      open={!!overlay}
      position={position}
      items={items}
      header={overlay.label || overlay.name}
      onClose={onClose}
    />
  );
}
