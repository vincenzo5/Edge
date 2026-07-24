import { beforeEach, describe, expect, it, vi } from "vitest";

const adapterControl = vi.hoisted(() => ({ throwOnConvert: false }));

vi.mock("./adapters", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./adapters")>();
  return {
    ...actual,
    observationFromRouteResult: vi.fn((...args: Parameters<typeof actual.observationFromRouteResult>) => {
      if (adapterControl.throwOnConvert) throw new Error("instrumentation conversion failed");
      return actual.observationFromRouteResult(...args);
    }),
  };
});

import { createDataResult } from "../contracts/result";
import { RouteCollector } from "./routeCollector";
import {
  finalizeRouteDelivery,
  recordServiceDelivery,
} from "./serviceInstrumentation";

describe("serviceInstrumentation no-throw boundary", () => {
  beforeEach(() => {
    adapterControl.throwOnConvert = false;
  });

  it("returns the original result when observation conversion throws", () => {
    const result = createDataResult([], "tws");
    adapterControl.throwOnConvert = true;

    expect(recordServiceDelivery(result, "chart_candles")).toBe(result);
    expect(
      finalizeRouteDelivery(result, "chart_candles", new RouteCollector()),
    ).toBe(result);
  });
});
