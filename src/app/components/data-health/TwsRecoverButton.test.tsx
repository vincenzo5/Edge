/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TwsRecoverButton from "./TwsRecoverButton";

describe("TwsRecoverButton", () => {
  it("renders compact label and calls onClick", () => {
    const onClick = vi.fn();
    render(
      <TwsRecoverButton compact label="Reconnect TWS" onClick={onClick} testId="test-recover" />,
    );
    const button = screen.getByTestId("test-recover");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
    expect(button).toHaveTextContent("Reconnect TWS");
    expect(button.className).toContain("edge-control-compact");
    expect(button.className).toContain("edge-type-body");
  });

  it("marks compact recover button busy while recovering", () => {
    render(
      <TwsRecoverButton
        compact
        label="Reconnect TWS"
        recovering
        onClick={vi.fn()}
        testId="test-recover"
      />,
    );
    expect(screen.getByTestId("test-recover")).toHaveAttribute("aria-busy", "true");
  });

  it("shows recovering text and disables while busy", () => {
    render(
      <TwsRecoverButton
        label="Reconnect TWS"
        recovering
        onClick={vi.fn()}
        testId="test-recover"
      />,
    );
    expect(screen.getByTestId("test-recover")).toHaveTextContent("Recovering TWS…");
    expect(screen.getByTestId("test-recover")).toBeDisabled();
  });
});
