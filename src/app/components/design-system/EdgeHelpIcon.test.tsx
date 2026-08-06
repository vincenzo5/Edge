import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EdgeHelpIcon from "./EdgeHelpIcon";

describe("EdgeHelpIcon", () => {
  it("renders with accessible label", () => {
    render(<EdgeHelpIcon content="Tooltip body" ariaLabel="Budget help" />);
    expect(screen.getByLabelText("Budget help")).toBeInTheDocument();
    expect(screen.getByLabelText("Budget help")).toHaveTextContent("i");
  });
});
