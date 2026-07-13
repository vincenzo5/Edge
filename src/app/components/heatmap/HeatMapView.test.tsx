/** @vitest-environment jsdom */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import HeatMapView from "./HeatMapView";
import HeatMapToolbar from "./HeatMapToolbar";
import { DEFAULT_HEAT_MAP_CONFIG } from "@/lib/heatmap/defaults";
import type { HeatMapConfig, HeatMapItem } from "@/lib/heatmap/types";

const layoutSize = { width: 600, height: 360 };

const items: HeatMapItem[] = [
  {
    id: "AAPL",
    label: "AAPL",
    sizeValue: 3_000_000_000_000,
    colorValue: 1.2,
    groupPath: ["Technology", "Consumer Electronics"],
  },
  {
    id: "MSFT",
    label: "MSFT",
    sizeValue: 2_800_000_000_000,
    colorValue: -0.4,
    groupPath: ["Technology", "Software"],
  },
  {
    id: "XOM",
    label: "XOM",
    sizeValue: 400_000_000_000,
    colorValue: -1.1,
    groupPath: ["Energy", "Oil & Gas"],
  },
];

describe("HeatMapView", () => {
  it("renders leaf cells and legend", () => {
    render(<HeatMapView items={items} layoutSize={layoutSize} />);

    expect(screen.getByTestId("heatmap-view")).toBeInTheDocument();
    expect(screen.getByTestId("heatmap-leaf-AAPL")).toBeInTheDocument();
    expect(screen.getByTestId("heatmap-legend")).toBeInTheDocument();
  });

  it("fires onLeafClick when a cell is clicked", () => {
    const onLeafClick = vi.fn();
    render(
      <HeatMapView items={items} layoutSize={layoutSize} onLeafClick={onLeafClick} />,
    );

    fireEvent.click(screen.getByTestId("heatmap-leaf-AAPL"));
    expect(onLeafClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "AAPL" }),
    );
  });

  it("renders group frames when grouped", () => {
    render(
      <HeatMapView
        items={items}
        layoutSize={layoutSize}
        config={{ ...DEFAULT_HEAT_MAP_CONFIG, groupBy: "sector" }}
      />,
    );

    expect(screen.getByTestId("heatmap-group-Technology")).toBeInTheDocument();
    expect(screen.getByTestId("heatmap-group-Energy")).toBeInTheDocument();
  });

  it("renders flat treemap when groupBy is none", () => {
    render(
      <HeatMapView
        items={items}
        layoutSize={layoutSize}
        config={{ ...DEFAULT_HEAT_MAP_CONFIG, groupBy: "none" }}
      />,
    );

    expect(screen.queryByTestId("heatmap-group-Technology")).not.toBeInTheDocument();
    expect(screen.getByTestId("heatmap-leaf-MSFT")).toBeInTheDocument();
  });
});

describe("HeatMapToolbar", () => {
  it("changes size, color, and group config", () => {
    const onChange = vi.fn();
    render(<HeatMapToolbar config={DEFAULT_HEAT_MAP_CONFIG} onChange={onChange} />);

    fireEvent.change(screen.getByTestId("heatmap-group-by"), {
      target: { value: "none" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ groupBy: "none" }),
    );

    fireEvent.change(screen.getByTestId("heatmap-size-by"), {
      target: { value: "volume" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sizeBy: expect.objectContaining({ metric: "volume", scale: "linear" }),
      }),
    );
  });

  it("preserves scale when switching size metric and exposes scale control", () => {
    const onChange = vi.fn();
    render(<HeatMapToolbar config={DEFAULT_HEAT_MAP_CONFIG} onChange={onChange} />);

    expect(screen.getByTestId("heatmap-size-scale")).toBeInTheDocument();
    expect(screen.getByTestId("heatmap-size-scale")).toHaveValue("linear");

    fireEvent.change(screen.getByTestId("heatmap-size-by"), {
      target: { value: "marketCap" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sizeBy: expect.objectContaining({ metric: "marketCap", scale: "linear" }),
      }),
    );

    onChange.mockClear();
    fireEvent.change(screen.getByTestId("heatmap-size-scale"), {
      target: { value: "log" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sizeBy: expect.objectContaining({ scale: "log" }),
      }),
    );
  });

  it("hides scale control when size metric is equal", () => {
    render(
      <HeatMapToolbar
        config={{
          ...DEFAULT_HEAT_MAP_CONFIG,
          sizeBy: { ...DEFAULT_HEAT_MAP_CONFIG.sizeBy, metric: "equal" },
        }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("heatmap-size-scale")).toBeNull();
  });
});

describe("HeatMapView live config updates", () => {
  function StatefulHeatMap({ initialConfig = DEFAULT_HEAT_MAP_CONFIG }: { initialConfig?: HeatMapConfig }) {
    const [config, setConfig] = useState(initialConfig);
    return (
      <>
        <HeatMapToolbar config={config} onChange={setConfig} />
        <HeatMapView items={items} config={config} layoutSize={layoutSize} />
      </>
    );
  }

  function leafArea(symbol: string): number {
    const leaf = screen.getByTestId(`heatmap-leaf-${symbol}`);
    return Number.parseFloat(leaf.style.width) * Number.parseFloat(leaf.style.height);
  }

  it("re-layouts immediately when size, color, or group changes", () => {
    render(<StatefulHeatMap />);

    expect(screen.getByTestId("heatmap-group-Technology")).toBeInTheDocument();
    expect(screen.getByTestId("heatmap-group-Energy")).toBeInTheDocument();
    const marketCapAapl = leafArea("AAPL");
    const marketCapXom = leafArea("XOM");
    expect(marketCapAapl).toBeGreaterThan(marketCapXom);

    fireEvent.change(screen.getByTestId("heatmap-group-by"), {
      target: { value: "none" },
    });
    expect(screen.queryByTestId("heatmap-group-Technology")).not.toBeInTheDocument();
    expect(screen.getByTestId("heatmap-leaf-AAPL")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("heatmap-size-by"), {
      target: { value: "equal" },
    });
    expect(leafArea("AAPL")).toBeCloseTo(leafArea("XOM"), 0);

    const beforeTitle = screen.getByTestId("heatmap-leaf-AAPL").getAttribute("title");
    fireEvent.change(screen.getByTestId("heatmap-color-by"), {
      target: { value: "volume" },
    });
    expect(screen.getByTestId("heatmap-color-by")).toHaveValue("volume");
    expect(screen.getByTestId("heatmap-leaf-AAPL").getAttribute("title")).not.toBe(beforeTitle);
  });
});
