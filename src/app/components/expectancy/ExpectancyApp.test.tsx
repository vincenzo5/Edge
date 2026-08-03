import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ExpectancyApp, { defaultSurfaceParams } from "./ExpectancyApp";
import { TileDensityOverrideProvider } from "@/app/components/app-workspace/TileDensityContext";

describe("ExpectancyApp", () => {
  it("renders deterministic projection metrics", () => {
    render(
      <TileDensityOverrideProvider mode="wide" width={1200}>
        <ExpectancyApp
          mode="deterministic"
          params={defaultSurfaceParams()}
          onModeChange={vi.fn()}
          onParamsChange={vi.fn()}
        />
      </TileDensityOverrideProvider>,
    );

    expect(screen.getByTestId("expectancy-app")).toBeTruthy();
    expect(screen.getByTestId("expectancy-ending-equity").textContent).toMatch(/\$/);
    expect(screen.getByTestId("expectancy-equity-curve-svg")).toBeTruthy();
    expect(screen.getByTestId("expectancy-summary").textContent).toContain("Risk");
  });

  it("applies preset params", () => {
    const onParamsChange = vi.fn();
    render(
      <TileDensityOverrideProvider mode="wide" width={1200}>
        <ExpectancyApp
          mode="deterministic"
          params={defaultSurfaceParams()}
          onModeChange={vi.fn()}
          onParamsChange={onParamsChange}
        />
      </TileDensityOverrideProvider>,
    );

    fireEvent.click(screen.getByTestId("expectancy-preset-retail_1pct"));
    expect(onParamsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: "retail_1pct",
        riskFraction: 0.01,
      }),
    );
  });

  it("switches to Monte Carlo mode", () => {
    const onModeChange = vi.fn();
    render(
      <TileDensityOverrideProvider mode="wide" width={1200}>
        <ExpectancyApp
          mode="deterministic"
          params={defaultSurfaceParams()}
          onModeChange={onModeChange}
          onParamsChange={vi.fn()}
        />
      </TileDensityOverrideProvider>,
    );

    fireEvent.click(screen.getByTestId("expectancy-mode-monte-carlo"));
    expect(onModeChange).toHaveBeenCalledWith("monteCarlo");
  });

  it("shows compact ending equity in compact density", () => {
    render(
      <TileDensityOverrideProvider mode="compact" width={400}>
        <ExpectancyApp
          mode="deterministic"
          params={defaultSurfaceParams()}
          onModeChange={vi.fn()}
          onParamsChange={vi.fn()}
        />
      </TileDensityOverrideProvider>,
    );

    expect(screen.getByTestId("expectancy-ending-equity").textContent).toMatch(/\$/);
  });
});
