import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EdgeSkeletonLine from "./EdgeSkeletonLine";

describe("EdgeSkeletonLine", () => {
  it("renders pulse skeleton with aria-hidden", () => {
    const { container } = render(<EdgeSkeletonLine width="80%" />);
    const line = container.firstElementChild;
    expect(line).toHaveAttribute("aria-hidden");
    expect(line?.className).toContain("edge-skeleton-pulse");
  });
});
