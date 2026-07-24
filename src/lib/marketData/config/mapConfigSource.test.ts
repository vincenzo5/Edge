import { describe, expect, it } from "vitest";
import { MapConfigSource } from "./mapConfigSource";

describe("MapConfigSource", () => {
  it("reads trimmed values from the map", () => {
    const source = new MapConfigSource({
      TWS_ENABLED: " true ",
      FMP_API_KEY: "",
    });
    expect(source.get("TWS_ENABLED")).toBe("true");
    expect(source.isSet("TWS_ENABLED")).toBe(true);
    expect(source.get("FMP_API_KEY")).toBeUndefined();
    expect(source.isSet("FMP_API_KEY")).toBe(false);
  });
});
