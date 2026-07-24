import { describe, expect, it } from "vitest";
import {
  connectionStatusLabel,
  connectionStatusTone,
  providerStatusLabel,
} from "./connectionStatusLabel";

describe("connectionStatusLabel", () => {
  it("maps provider health statuses to user labels", () => {
    expect(connectionStatusLabel("healthy")).toBe("Connected");
    expect(connectionStatusLabel("degraded")).toBe("Degraded");
    expect(connectionStatusLabel("offline")).toBe("Disconnected");
    expect(connectionStatusLabel("disabled")).toBe("Not configured");
    expect(providerStatusLabel("healthy")).toBe("Healthy");
  });

  it("maps tones for status badges", () => {
    expect(connectionStatusTone("healthy")).toBe("positive");
    expect(connectionStatusTone("degraded")).toBe("warning");
    expect(connectionStatusTone("offline")).toBe("negative");
    expect(connectionStatusTone("disabled")).toBe("muted");
  });
});
