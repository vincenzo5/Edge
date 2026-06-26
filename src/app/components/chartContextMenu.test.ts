import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildChartContextMenuItems,
  buildPriceScaleContextMenuItems,
  type ChartContextMenuActions,
} from "./chartContextMenu";
import type { ChartCopyItem } from "./chartCopyMenu";
import { mergeChartSettings } from "@/lib/chart/chartSettings";
import { getShortcutLabel } from "@/lib/shortcuts/formatShortcutLabel";

function mockActions(): ChartContextMenuActions {
  return {
    resetView: vi.fn(),
    copyText: vi.fn(),
    openObjectTree: vi.fn(),
    openSettings: vi.fn(),
    openGoTo: vi.fn(),
    pasteDrawings: vi.fn(),
    saveChartTemplate: vi.fn(),
    applyChartTemplate: vi.fn(),
    removeDrawings: vi.fn(),
    removeIndicators: vi.fn(),
    removeAll: vi.fn(),
    toggleLockCrosshairToTime: vi.fn(),
  };
}

function labels(items: ReturnType<typeof buildChartContextMenuItems>) {
  return items.map((item) => item.label);
}

const emptyState = {
  viewportModified: false,
  drawingCount: 0,
  indicatorCount: 0,
  copyItems: [] as ChartCopyItem[],
  canPasteDrawings: false,
  lockCrosshairToTime: false,
};

describe("buildChartContextMenuItems", () => {
  it("always includes reset and object tree with reset disabled by default", () => {
    const actions = mockActions();
    const items = buildChartContextMenuItems(emptyState, actions);

    expect(labels(items)).toEqual([
      "Reset chart view",
      "Go to date…",
      "Object tree",
      "Lock vertical cursor line by time",
      "Settings…",
      "Save chart template…",
      "Apply chart template…",
    ]);
    expect(items.find((item) => item.id === "reset-view")?.disabled).toBe(true);
    expect(items.find((item) => item.id === "reset-view")?.shortcut).toBe(
      getShortcutLabel("resetChartView"),
    );
  });

  it("enables reset when viewport is modified", () => {
    const actions = mockActions();
    const items = buildChartContextMenuItems(
      { ...emptyState, viewportModified: true },
      actions,
    );

    expect(items.find((item) => item.id === "reset-view")?.disabled).toBe(false);
  });

  it("includes Copy submenu when copyItems are provided", () => {
    const actions = mockActions();
    const copyItems: ChartCopyItem[] = [
      { id: "price", label: "Price", value: "46.18" },
      { id: "symbol", label: "Symbol", value: "AAPL" },
    ];
    const items = buildChartContextMenuItems(
      { ...emptyState, copyItems },
      actions,
    );

    const copyMenu = items.find((item) => item.id === "copy-submenu");
    expect(copyMenu?.label).toBe("Copy");
    expect(copyMenu?.children?.map((child) => child.label)).toEqual([
      "Price",
      "Symbol",
    ]);
  });

  it("omits Copy submenu when copyItems is empty", () => {
    const actions = mockActions();
    const items = buildChartContextMenuItems(emptyState, actions);

    expect(items.some((item) => item.id === "copy-submenu")).toBe(false);
  });

  it("includes paste when canPasteDrawings is true", () => {
    const actions = mockActions();
    const items = buildChartContextMenuItems(
      { ...emptyState, canPasteDrawings: true },
      actions,
    );

    expect(labels(items)).toContain("Paste");
    items.find((item) => item.id === "paste-drawings")?.action();
    expect(actions.pasteDrawings).toHaveBeenCalledOnce();
  });

  it("shows checked lock label when crosshair lock is on", () => {
    const actions = mockActions();
    const items = buildChartContextMenuItems(
      { ...emptyState, lockCrosshairToTime: true },
      actions,
    );

    expect(labels(items)).toContain("✓ Lock vertical cursor line by time");
  });

  it("defaults the persisted crosshair lock setting off", () => {
    expect(mergeChartSettings().canvas.lockCrosshairToTime).toBe(false);
    expect(mergeChartSettings().canvas.lockedCrosshairPlotX).toBeNull();
  });

  it("includes combined remove when drawings and indicators are present", () => {
    const actions = mockActions();
    const items = buildChartContextMenuItems(
      { ...emptyState, drawingCount: 2, indicatorCount: 1 },
      actions,
    );

    expect(labels(items)).toContain("Remove 2 drawings");
    expect(labels(items)).toContain("Remove 1 indicator");
    expect(labels(items)).toContain("Remove drawings and indicators");

    items.find((item) => item.id === "remove-all")?.action();
    expect(actions.removeAll).toHaveBeenCalledOnce();
  });

  it("toggles lock crosshair action", () => {
    const actions = mockActions();
    const items = buildChartContextMenuItems(emptyState, actions);

    items.find((item) => item.id === "lock-crosshair-to-time")?.action();
    expect(actions.toggleLockCrosshairToTime).toHaveBeenCalledOnce();
  });

  it("uses singular and plural remove drawing labels", () => {
    const actions = mockActions();

    const one = buildChartContextMenuItems(
      { ...emptyState, drawingCount: 1 },
      actions,
    );
    expect(labels(one)).toContain("Remove 1 drawing");

    const many = buildChartContextMenuItems(
      { ...emptyState, drawingCount: 3 },
      actions,
    );
    expect(labels(many)).toContain("Remove 3 drawings");
  });

  it("uses singular and plural remove indicator labels", () => {
    const actions = mockActions();

    const one = buildChartContextMenuItems(
      { ...emptyState, indicatorCount: 1 },
      actions,
    );
    expect(labels(one)).toContain("Remove 1 indicator");

    const many = buildChartContextMenuItems(
      { ...emptyState, indicatorCount: 2 },
      actions,
    );
    expect(labels(many)).toContain("Remove 2 indicators");
  });

  it("invokes action handlers", () => {
    const actions = mockActions();
    const copyItems: ChartCopyItem[] = [
      { id: "price", label: "Price", value: "46.18" },
    ];
    const items = buildChartContextMenuItems(
      {
        ...emptyState,
        viewportModified: true,
        drawingCount: 2,
        indicatorCount: 1,
        copyItems,
        canPasteDrawings: false,
      },
      actions,
    );

    items.find((item) => item.id === "reset-view")?.action();
    items
      .find((item) => item.id === "copy-submenu")
      ?.children?.find((child) => child.id === "copy-price")
      ?.action();
    items.find((item) => item.id === "object-tree")?.action();
    items.find((item) => item.id === "remove-drawings")?.action();
    items.find((item) => item.id === "remove-indicators")?.action();
    items.find((item) => item.id === "settings")?.action();
    items.find((item) => item.id === "go-to-date")?.action();
    items.find((item) => item.id === "lock-crosshair-to-time")?.action();
    items.find((item) => item.id === "save-chart-template")?.action();
    items.find((item) => item.id === "apply-chart-template")?.action();

    expect(actions.resetView).toHaveBeenCalledOnce();
    expect(actions.copyText).toHaveBeenCalledWith("46.18");
    expect(actions.openObjectTree).toHaveBeenCalledOnce();
    expect(actions.removeDrawings).toHaveBeenCalledOnce();
    expect(actions.removeIndicators).toHaveBeenCalledOnce();
    expect(actions.toggleLockCrosshairToTime).toHaveBeenCalledOnce();
    expect(actions.openSettings).toHaveBeenCalledOnce();
    expect(actions.openGoTo).toHaveBeenCalledOnce();
    expect(actions.saveChartTemplate).toHaveBeenCalledOnce();
    expect(actions.applyChartTemplate).toHaveBeenCalledOnce();
  });

  describe("copyText clipboard integration", () => {
    beforeEach(() => {
      vi.stubGlobal("navigator", {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
    });

    it("writes selected copy value to clipboard via ChartCell-style handler", async () => {
      const actions = mockActions();
      actions.copyText = vi.fn((text: string) => {
        void navigator.clipboard.writeText(text);
      });

      const items = buildChartContextMenuItems(
        {
          ...emptyState,
          copyItems: [{ id: "price", label: "Price", value: "123.45" }],
        },
        actions,
      );

      items
        .find((item) => item.id === "copy-submenu")
        ?.children?.find((child) => child.id === "copy-price")
        ?.action();

      expect(actions.copyText).toHaveBeenCalledWith("123.45");
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("123.45");
    });
  });
});

describe("buildPriceScaleContextMenuItems", () => {
  it("lists scale types and label submenus", () => {
    const setType = vi.fn();
    const patchSettings = vi.fn();
    const items = buildPriceScaleContextMenuItems(
      {
        settings: mergeChartSettings({
          scales: { priceScaleType: "log" },
        }),
        priceScaleMode: "auto",
      },
      {
        resetPriceScale: vi.fn(),
        setPriceScaleType: setType,
        openScaleSettings: vi.fn(),
        patchSettings,
      },
    );

    expect(items.some((i) => i.label.includes("Logarithmic"))).toBe(true);
    expect(items.some((i) => i.id === "labels-submenu" && i.children?.length)).toBe(true);
    expect(items.some((i) => i.id === "lines-submenu" && i.children?.length)).toBe(true);

    items.find((i) => i.id === "scale-percent")?.action();
    expect(setType).toHaveBeenCalledWith("percent");
  });

  it("offers to move the scale back right when currently placed left", () => {
    const patchSettings = vi.fn();
    const items = buildPriceScaleContextMenuItems(
      {
        settings: mergeChartSettings({
          scales: { priceScalePlacement: "left" },
        }),
        priceScaleMode: "auto",
      },
      {
        resetPriceScale: vi.fn(),
        setPriceScaleType: vi.fn(),
        openScaleSettings: vi.fn(),
        patchSettings,
      },
    );

    const moveScale = items.find((i) => i.id === "move-scale");
    expect(moveScale?.label).toBe("Move scale to right");

    moveScale?.action();
    expect(patchSettings).toHaveBeenCalledWith({ scales: { priceScalePlacement: "right" } });
  });
});
