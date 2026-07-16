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
    fireEvent.click(screen.getByTestId("test-recover"));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByTestId("test-recover")).toHaveTextContent("Reconnect TWS");
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
