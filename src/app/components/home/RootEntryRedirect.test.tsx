import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import RootEntryRedirect from "./RootEntryRedirect";
import {
  LAST_MODULE_STORAGE_KEY,
  serializeLastModuleRecord,
  createLastModuleRecord,
} from "@/lib/app/lastModule";
import {
  RESEARCH_DEFAULT_DENSITY_KEY,
  writeDefaultDensityPreference,
} from "@/lib/research/defaultDensityPreference";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("RootEntryRedirect", () => {
  beforeEach(() => {
    replace.mockReset();
    window.localStorage.clear();
  });

  it("redirects to /workspace when recent chart module is stored", async () => {
    window.localStorage.setItem(
      LAST_MODULE_STORAGE_KEY,
      serializeLastModuleRecord(createLastModuleRecord("chart")),
    );

    render(<RootEntryRedirect />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/workspace");
    });
  });

  it("redirects to /research when recent research module is stored", async () => {
    window.localStorage.setItem(
      LAST_MODULE_STORAGE_KEY,
      serializeLastModuleRecord(createLastModuleRecord("research")),
    );

    render(<RootEntryRedirect />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/research");
    });
  });

  it("redirects to /workspace when no recent module and default density is Desk", async () => {
    render(<RootEntryRedirect />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/workspace");
    });
  });

  it("redirects to /research when no recent module and default density is Board", async () => {
    writeDefaultDensityPreference("Board");

    render(<RootEntryRedirect />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/research");
    });
    expect(window.localStorage.getItem(RESEARCH_DEFAULT_DENSITY_KEY)).toBe("Board");
  });
});
