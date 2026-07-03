import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AppHydrationShell from "./AppHydrationShell";

describe("AppHydrationShell", () => {
  it("renders the hydration placeholder", () => {
    render(<AppHydrationShell />);
    expect(screen.getByTestId("app-hydration-shell")).toBeInTheDocument();
  });
});
