import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import ChartPage from "../chart/page";
import { buildWorkspaceDeepLink } from "@/lib/appWorkspace/deepLinks";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("ChartPage", () => {
  it("redirects to workspace chart deep link", async () => {
    replace.mockReset();
    render(<ChartPage />);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(buildWorkspaceDeepLink({ surface: "chart" }));
    });
  });
});
