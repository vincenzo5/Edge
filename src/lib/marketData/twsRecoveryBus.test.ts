import { describe, expect, it, vi } from "vitest";
import {
  emitTwsRecovery,
  resetTwsRecoveryBusForTests,
  subscribeTwsRecovery,
} from "./twsRecoveryBus";

describe("twsRecoveryBus", () => {
  it("notifies subscribers on recovery phases", () => {
    resetTwsRecoveryBusForTests();
    const listener = vi.fn();
    subscribeTwsRecovery(listener);

    emitTwsRecovery("started", { source: "test" });
    emitTwsRecovery("completed", { source: "test", message: "Gateway connected." });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[0][0].phase).toBe("started");
    expect(listener.mock.calls[1][0].message).toBe("Gateway connected.");
  });
});
