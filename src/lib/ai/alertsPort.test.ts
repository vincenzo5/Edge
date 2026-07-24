import { describe, expect, it } from "vitest";
import { createFetchAlertsPort } from "./alertsPort";

describe("createFetchAlertsPort", () => {
  it("exposes alert CRUD and event list methods", () => {
    const port = createFetchAlertsPort();
    expect(typeof port.listAlerts).toBe("function");
    expect(typeof port.getAlert).toBe("function");
    expect(typeof port.createAlert).toBe("function");
    expect(typeof port.patchAlert).toBe("function");
    expect(typeof port.removeAlert).toBe("function");
    expect(typeof port.listEvents).toBe("function");
  });
});
