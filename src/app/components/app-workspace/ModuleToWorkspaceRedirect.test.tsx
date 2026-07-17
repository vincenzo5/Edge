import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

import ModuleToWorkspaceRedirect from "./ModuleToWorkspaceRedirect";
import { buildWorkspaceDeepLink } from "@/lib/appWorkspace/deepLinks";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("ModuleToWorkspaceRedirect", () => {
  it("redirects chart route to workspace deep link", async () => {
    replace.mockReset();
    render(<ModuleToWorkspaceRedirect surface="chart" />);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(buildWorkspaceDeepLink({ surface: "chart" }));
    });
  });

  it("redirects screener route to unified workspace surface", async () => {
    replace.mockReset();
    render(<ModuleToWorkspaceRedirect surface="screener" />);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(buildWorkspaceDeepLink({ surface: "screener" }));
    });
  });
});
