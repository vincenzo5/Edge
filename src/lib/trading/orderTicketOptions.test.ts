import { describe, expect, it } from "vitest";
import {
  isTifValidForOrderType,
  supportsBracketAttach,
  supportsPriceMgmtAlgo,
  tifOptionsForOrderType,
} from "./orderTicketOptions";

describe("orderTicketOptions", () => {
  it("limits MOC and LOC to DAY tif", () => {
    expect(tifOptionsForOrderType("MOC")).toEqual(["DAY"]);
    expect(tifOptionsForOrderType("LOC")).toEqual(["DAY"]);
    expect(isTifValidForOrderType("MOC", "GTC")).toBe(false);
  });

  it("allows IOC and OPG on market and limit", () => {
    expect(tifOptionsForOrderType("MKT")).toContain("IOC");
    expect(tifOptionsForOrderType("MKT")).toContain("OPG");
    expect(tifOptionsForOrderType("LMT")).toContain("IOC");
  });

  it("excludes IOC and OPG from stop and trail types", () => {
    expect(tifOptionsForOrderType("STP")).not.toContain("IOC");
    expect(tifOptionsForOrderType("TRAIL")).not.toContain("OPG");
  });

  it("bracket attach on MKT, LMT, STP, and STP LMT", () => {
    expect(supportsBracketAttach("MKT")).toBe(true);
    expect(supportsBracketAttach("LMT")).toBe(true);
    expect(supportsBracketAttach("STP")).toBe(true);
    expect(supportsBracketAttach("STP LMT")).toBe(true);
    expect(supportsBracketAttach("TRAIL")).toBe(false);
    expect(supportsBracketAttach("MOC")).toBe(false);
  });

  it("price mgmt algo on limit-like types", () => {
    expect(supportsPriceMgmtAlgo("LMT")).toBe(true);
    expect(supportsPriceMgmtAlgo("STP LMT")).toBe(true);
    expect(supportsPriceMgmtAlgo("TRAIL LIMIT")).toBe(true);
    expect(supportsPriceMgmtAlgo("LOC")).toBe(true);
    expect(supportsPriceMgmtAlgo("MKT")).toBe(false);
  });
});
