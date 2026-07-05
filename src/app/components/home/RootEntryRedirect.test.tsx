import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import RootEntryRedirect from "./RootEntryRedirect";
import {
  LAST_MODULE_STORAGE_KEY,
  serializeLastModuleRecord,
  createLastModuleRecord,
} from "@/lib/app/lastModule";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("RootEntryRedirect", () => {
  beforeEach(() => {
    replace.mockReset();
    window.localStorage.clear();
  });

  it("redirects to /chart when recent chart module is stored", async () => {
    window.localStorage.setItem(
      LAST_MODULE_STORAGE_KEY,
      serializeLastModuleRecord(createLastModuleRecord("chart")),
    );

    render(<RootEntryRedirect />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/chart");
    });
  });

  it("redirects to /home when no recent module is stored", async () => {
    render(<RootEntryRedirect />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/home");
    });
  });
});
