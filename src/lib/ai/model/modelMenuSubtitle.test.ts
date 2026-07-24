import { describe, expect, it } from "vitest";
import { modelMenuSubtitle } from "./modelMenuSubtitle";

describe("modelMenuSubtitle", () => {
  it("returns provider and id tail", () => {
    expect(
      modelMenuSubtitle({
        id: "x-ai/grok-4.5",
        label: "Grok 4.5",
        provider: "openrouter",
      }),
    ).toBe("openrouter · grok-4.5");
  });

  it("uses the full id tail for nested vendor paths", () => {
    expect(
      modelMenuSubtitle({
        id: "openai/gpt-5.6-sol",
        label: "GPT-5.6",
        provider: "openrouter",
      }),
    ).toBe("openrouter · gpt-5.6-sol");
  });
});
