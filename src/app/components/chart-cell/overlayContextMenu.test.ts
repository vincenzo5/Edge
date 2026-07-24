import { describe, expect, it, vi } from "vitest";
import { buildOverlayContextMenuItems } from "./overlayContextMenu";
import type { TrackedOverlay } from "@/lib/chartConfig";

const overlayBase: TrackedOverlay = {
  id: "ov-1",
  name: "long_position",
  label: "Long",
  visible: true,
  locked: false,
  zLevel: 0,
  paneId: "price",
};

const noopActions = {
  remove: vi.fn(),
  setVisible: vi.fn(),
  setLocked: vi.fn(),
  rename: vi.fn(),
  bringForward: vi.fn(),
  sendBackward: vi.fn(),
  duplicate: vi.fn(),
};

const noopClipboard = {
  onCopy: vi.fn(),
  onPaste: vi.fn(),
  canPaste: false,
};

describe("buildOverlayContextMenuItems", () => {
  it("includes Trade setup for position drawings when handler provided", () => {
    const onTradeSetup = vi.fn();
    const items = buildOverlayContextMenuItems(
      overlayBase,
      noopActions,
      vi.fn(),
      vi.fn(),
      noopClipboard,
      { onTradeSetup },
    );
    expect(items[0]?.id).toBe("trade-setup");
    expect(items[0]?.label).toBe("Trade setup…");
    items[0]?.action?.();
    expect(onTradeSetup).toHaveBeenCalled();
  });

  it("omits Trade setup for non-position drawings", () => {
    const items = buildOverlayContextMenuItems(
      { ...overlayBase, name: "trend_line" },
      noopActions,
      vi.fn(),
      vi.fn(),
      noopClipboard,
      { onTradeSetup: vi.fn() },
    );
    expect(items.some((item) => item.id === "trade-setup")).toBe(false);
  });

  it("includes Add trade plan alerts for position drawings when handler provided", () => {
    const onAddTradePlanAlerts = vi.fn();
    const items = buildOverlayContextMenuItems(
      overlayBase,
      noopActions,
      vi.fn(),
      vi.fn(),
      noopClipboard,
      { onAddTradePlanAlerts },
    );
    expect(items.some((item) => item.id === "add-trade-plan-alerts")).toBe(true);
    const item = items.find((entry) => entry.id === "add-trade-plan-alerts");
    item?.action?.();
    expect(onAddTradePlanAlerts).toHaveBeenCalled();
  });

  it("omits Trade setup when handler not provided", () => {
    const items = buildOverlayContextMenuItems(
      overlayBase,
      noopActions,
      vi.fn(),
      vi.fn(),
      noopClipboard,
    );
    expect(items.some((item) => item.id === "trade-setup")).toBe(false);
  });
});
