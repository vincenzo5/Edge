import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildChartContextMenuItems,
  type ChartContextMenuActions,
} from "./chartContextMenu";

function mockActions(): ChartContextMenuActions & {
  [K in keyof ChartContextMenuActions]: ReturnType<typeof vi.fn>;
} {
  return {
    resetView: vi.fn(),
    copyPrice: vi.fn(),
    openObjectTree: vi.fn(),
    removeDrawings: vi.fn(),
    removeIndicators: vi.fn(),
  };
}

function labels(items: ReturnType<typeof buildChartContextMenuItems>) {
  return items.map((item) => item.label);
}

describe("buildChartContextMenuItems", () => {
  it("always includes reset and object tree with reset disabled by default", () => {
    const actions = mockActions();
    const items = buildChartContextMenuItems(
      {
        viewportModified: false,
        drawingCount: 0,
        indicatorCount: 0,
        priceLabel: null,
      },
      actions,
    );

    expect(labels(items)).toEqual(["Reset chart view", "Object tree"]);
    expect(items.find((item) => item.id === "reset-view")?.disabled).toBe(true);
  });

  it("enables reset when viewport is modified", () => {
    const actions = mockActions();
    const items = buildChartContextMenuItems(
      {
        viewportModified: true,
        drawingCount: 0,
        indicatorCount: 0,
        priceLabel: null,
      },
      actions,
    );

    expect(items.find((item) => item.id === "reset-view")?.disabled).toBe(false);
  });

  it("includes copy price when priceLabel is set", () => {
    const actions = mockActions();
    const items = buildChartContextMenuItems(
      {
        viewportModified: false,
        drawingCount: 0,
        indicatorCount: 0,
        priceLabel: "46.18",
      },
      actions,
    );

    expect(labels(items)).toContain("Copy price 46.18");
  });

  it("omits copy price when priceLabel is null", () => {
    const actions = mockActions();
    const items = buildChartContextMenuItems(
      {
        viewportModified: false,
        drawingCount: 0,
        indicatorCount: 0,
        priceLabel: null,
      },
      actions,
    );

    expect(labels(items).some((label) => label.startsWith("Copy price"))).toBe(
      false,
    );
  });

  it("uses singular and plural remove drawing labels", () => {
    const actions = mockActions();

    const one = buildChartContextMenuItems(
      {
        viewportModified: false,
        drawingCount: 1,
        indicatorCount: 0,
        priceLabel: null,
      },
      actions,
    );
    expect(labels(one)).toContain("Remove 1 drawing");

    const many = buildChartContextMenuItems(
      {
        viewportModified: false,
        drawingCount: 3,
        indicatorCount: 0,
        priceLabel: null,
      },
      actions,
    );
    expect(labels(many)).toContain("Remove 3 drawings");
  });

  it("uses singular and plural remove indicator labels", () => {
    const actions = mockActions();

    const one = buildChartContextMenuItems(
      {
        viewportModified: false,
        drawingCount: 0,
        indicatorCount: 1,
        priceLabel: null,
      },
      actions,
    );
    expect(labels(one)).toContain("Remove 1 indicator");

    const many = buildChartContextMenuItems(
      {
        viewportModified: false,
        drawingCount: 0,
        indicatorCount: 2,
        priceLabel: null,
      },
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
      },
      actions,
    );

    items.find((item) => item.id === "reset-view")?.action();
    items.find((item) => item.id === "copy-price")?.action();
    items.find((item) => item.id === "object-tree")?.action();
    items.find((item) => item.id === "remove-drawings")?.action();
    items.find((item) => item.id === "remove-indicators")?.action();

    expect(actions.resetView).toHaveBeenCalledOnce();
    expect(actions.copyPrice).toHaveBeenCalledWith("46.18");
    expect(actions.openObjectTree).toHaveBeenCalledOnce();
    expect(actions.removeDrawings).toHaveBeenCalledOnce();
    expect(actions.removeIndicators).toHaveBeenCalledOnce();
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
        {
          viewportModified: false,
          drawingCount: 0,
          indicatorCount: 0,
          priceLabel: "123.45",
        },
        actions,
      );

      items.find((item) => item.id === "copy-price")?.action();

      expect(actions.copyPrice).toHaveBeenCalledWith("123.45");
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("123.45");
    });
  });
});
