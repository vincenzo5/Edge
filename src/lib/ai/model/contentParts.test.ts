import { describe, expect, it } from "vitest";

import { buildMultimodalContent } from "./contentParts";

describe("buildMultimodalContent", () => {
  it("returns plain string for text-only messages", () => {
    expect(buildMultimodalContent("Hello", [])).toBe("Hello");
  });

  it("returns image parts when text is empty", () => {
    expect(buildMultimodalContent("", ["data:image/png;base64,abc"])).toEqual([
      { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
    ]);
  });

  it("combines text and images into content parts", () => {
    expect(buildMultimodalContent("Chart?", ["data:image/png;base64,abc"])).toEqual([
      { type: "text", text: "Chart?" },
      { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
    ]);
  });
});
