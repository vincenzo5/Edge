import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

import ModuleToWorkspaceRedirect from "./ModuleToWorkspaceRedirect";
import { buildWorkspaceDeepLink } from "@/lib/appWorkspace/deepLinks";

const replace = vi.fn();
const searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));

describe("ModuleToWorkspaceRedirect", () => {
  it("redirects chart route to workspace deep link", async () => {
    replace.mockReset();
    searchParams.forEach((_, key) => searchParams.delete(key));
    render(<ModuleToWorkspaceRedirect surface="chart" />);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(buildWorkspaceDeepLink({ surface: "chart" }));
    });
  });

  it("forwards chart deep link params when redirecting from /chart", async () => {
    replace.mockReset();
    searchParams.forEach((_, key) => searchParams.delete(key));
    searchParams.set("symbol", "AAPL");
    searchParams.set("interval", "5m");
    searchParams.set("journalTrade", "trade-1");
    searchParams.set("goto", "1234567890");
    render(<ModuleToWorkspaceRedirect surface="chart" />);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        "/workspace?surface=chart&symbol=AAPL&interval=5m&journalTrade=trade-1&goto=1234567890",
      );
    });
  });

  it("redirects screener route to unified workspace surface", async () => {
    replace.mockReset();
    render(<ModuleToWorkspaceRedirect surface="screener" />);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(buildWorkspaceDeepLink({ surface: "screener" }));
    });
  });

  it("redirects screener screens ingress with screenerView", async () => {
    replace.mockReset();
    render(<ModuleToWorkspaceRedirect surface="screener" screenerView="screens" />);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        buildWorkspaceDeepLink({ surface: "screener", screenerView: "screens" }),
      );
    });
  });
});
