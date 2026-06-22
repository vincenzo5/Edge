import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildChartContextMenuItems,
  buildPriceScaleContextMenuItems,
  type ChartContextMenuActions,
} from "./chartContextMenu";
import { DEFAULT_CHART_SETTINGS, mergeChartSettings } from "@/lib/chart/chartSettings";

function mockActions(): ChartContextMenuActions {
  return {
    resetView: vi.fn(),
    copyPrice: vi.fn(),
    openObjectTree: vi.fn(),
    openSettings: vi.fn(),
    openGoTo: vi.fn(),
    pasteDrawings: vi.fn(),
    saveChartTemplate: vi.fn(),
    applyChartTemplate: vi.fn(),
    removeDrawings: vi.fn(),
    removeIndicators: vi.fn(),
  };
}

function labels(items: ReturnType<typeof buildChartContextMenuItems>) {
  return items.map((item) => item.label);
}

const emptyState = {
  viewportModified: false,
  drawingCount: 0,
  indicatorCount: 0,
  priceLabel: null as string | null,
  canPasteDrawings: false,
};

describe("buildChartContextMenuItems", () => {
  it("always includes reset and object tree with reset disabled by default", () => {
    const actions = mockActions();
    const items = buildChartContextMenuItems(emptyState, actions);

    expect(labels(items)).toEqual([
      "Reset chart view",
      "Go to date…",
      "Object tree",
      "Settings…",
      "Save chart template…",
      "Apply chart template…",
    ]);
    expect(items.find((item) => item.id === "reset-view")?.disabled).toBe(true);
  });

  it("enables reset when viewport is modified", () => {
    const actions = mockActions();
    const items = buildChartContextMenuItems(
      { ...emptyState, viewportModified: true },
      actions,
    );

    expect(items.find((item) => item.id === "reset-view")?.disabled).toBe(false);
  });

  it("includes copy price when priceLabel is set", () => {
    const actions = mockActions();
    const items = buildChartContextMenuItems(
      { ...emptyState, priceLabel: "46.18" },
      actions,
    );

    expect(labels(items)).toContain("Copy price 46.18");
  });

  it("omits copy price when priceLabel is null", () => {
    const actions = mockActions();
    const items = buildChartContextMenuItems(emptyState, actions);

    expect(labels(items).some((label) => label.startsWith("Copy price"))).toBe(
      false,
    );
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
    const items = buildChartContextMenuItems(
      {
        viewportModified: true,
        drawingCount: 2,
        indicatorCount: 1,
        priceLabel: "46.18",
        canPasteDrawings: false,
      },
      actions,
    );

    items.find((item) => item.id === "reset-view")?.action();
    items.find((item) => item.id === "copy-price")?.action();
    items.find((item) => item.id === "object-tree")?.action();
    items.find((item) => item.id === "remove-drawings")?.action();
    items.find((item) => item.id === "remove-indicators")?.action();
    items.find((item) => item.id === "settings")?.action();
    items.find((item) => item.id === "go-to-date")?.action();
    items.find((item) => item.id === "save-chart-template")?.action();
    items.find((item) => item.id === "apply-chart-template")?.action();

    expect(actions.resetView).toHaveBeenCalledOnce();
    expect(actions.copyPrice).toHaveBeenCalledWith("46.18");
    expect(actions.openObjectTree).toHaveBeenCalledOnce();
    expect(actions.removeDrawings).toHaveBeenCalledOnce();
    expect(actions.removeIndicators).toHaveBeenCalledOnce();
    expect(actions.openSettings).toHaveBeenCalledOnce();
    expect(actions.openGoTo).toHaveBeenCalledOnce();
    expect(actions.saveChartTemplate).toHaveBeenCalledOnce();
    expect(actions.applyChartTemplate).toHaveBeenCalledOnce();
  });

  describe("copyPrice clipboard integration", () => {
    beforeEach(() => {
      vi.stubGlobal("navigator", {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
    });

    it("writes price to clipboard when copy action runs via ChartCell-style handler", async () => {
      const actions = mockActions();
      actions.copyPrice = vi.fn((price: string) => {
        void navigator.clipboard.writeText(price);
      });

      const items = buildChartContextMenuItems(
        { ...emptyState, priceLabel: "123.45" },
        actions,
      );

      items.find((item) => item.id === "copy-price")?.action();

      expect(actions.copyPrice).toHaveBeenCalledWith("123.45");
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
