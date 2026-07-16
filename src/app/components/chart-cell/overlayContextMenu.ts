import type { ContextMenuItem } from "../ContextMenu";
import type { TrackedOverlay } from "@/lib/chartConfig";
import { getShortcutLabel } from "@/lib/shortcuts/formatShortcutLabel";
import { isPositionDrawingName } from "@/lib/trading/positionTradeSetup";

export type OverlayActionHandlers = {
  remove: (id: string) => void;
  setVisible: (id: string, visible: boolean) => void;
  setLocked: (id: string, locked: boolean) => void;
  rename: (id: string, label: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  duplicate: (id: string) => void;
};

export type OverlayClipboardHandlers = {
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
};

export type OverlayContextMenuOptions = {
  onTradeSetup?: () => void;
};

export function buildOverlayContextMenuItems(
  overlay: TrackedOverlay,
  actions: OverlayActionHandlers,
  onRenamePrompt: (id: string) => void,
  onOpenSettings: (id: string) => void,
  clipboard: OverlayClipboardHandlers,
  options?: OverlayContextMenuOptions,
): ContextMenuItem[] {
  const tradeItem: ContextMenuItem[] =
    options?.onTradeSetup && isPositionDrawingName(overlay.name)
      ? [
          {
            id: "trade-setup",
            label: "Trade setup…",
            action: options.onTradeSetup,
            dividerAfter: true,
          },
        ]
      : [];

  return [
    ...tradeItem,
    {
      id: "rename",
      label: "Rename",
      shortcut: getShortcutLabel("renameDrawing"),
      action: () => onRenamePrompt(overlay.id),
    },
    {
      id: "settings",
      label: "Settings…",
      action: () => onOpenSettings(overlay.id),
      dividerAfter: true,
    },
    {
      id: "copy",
      label: "Copy",
      shortcut: getShortcutLabel("copyDrawing"),
      action: clipboard.onCopy,
      dividerAfter: !clipboard.canPaste,
    },
    ...(clipboard.canPaste
      ? [
          {
            id: "paste",
            label: "Paste",
            shortcut: getShortcutLabel("pasteDrawing"),
            action: clipboard.onPaste,
            dividerAfter: true,
          } as ContextMenuItem,
        ]
      : []),
    {
      id: "lock",
      label: overlay.locked ? "Unlock" : "Lock",
      shortcut: getShortcutLabel("lockDrawing"),
      action: () => actions.setLocked(overlay.id, !overlay.locked),
    },
    {
      id: "hide",
      label: overlay.visible ? "Hide" : "Show",
      action: () => actions.setVisible(overlay.id, !overlay.visible),
    },
    {
      id: "forward",
      label: "Bring to Front",
      action: () => actions.bringForward(overlay.id),
      dividerAfter: true,
    },
    {
      id: "backward",
      label: "Send to Back",
      action: () => actions.sendBackward(overlay.id),
      dividerAfter: true,
    },
    {
      id: "duplicate",
      label: "Duplicate",
      shortcut: getShortcutLabel("duplicateDrawing"),
      action: () => actions.duplicate(overlay.id),
      dividerAfter: true,
    },
    {
      id: "remove",
      label: "Remove",
      shortcut: getShortcutLabel("deleteDrawing"),
      danger: true,
      action: () => actions.remove(overlay.id),
    },
  ];
}
