import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";

import { WorkspaceDriveProvider, useWorkspaceDrive } from "./WorkspaceDriveContext";

function DriveProbe() {
  const { driveSymbol, registerDriveHandler } = useWorkspaceDrive();
  const [symbol, setSymbol] = useState("");

  useEffect(() => {
    registerDriveHandler((params) => setSymbol(params.symbol));
    return () => registerDriveHandler(null);
  }, [registerDriveHandler]);

  return (
    <div>
      <span data-testid="target">{symbol}</span>
      <button type="button" onClick={() => driveSymbol({ symbol: "AAPL" })}>
        Drive
      </button>
    </div>
  );
}

describe("WorkspaceDriveProvider", () => {
  it("routes driveSymbol to registered handler", () => {
    render(
      <WorkspaceDriveProvider>
        <DriveProbe />
      </WorkspaceDriveProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Drive" }));
    expect(screen.getByTestId("target")).toHaveTextContent("AAPL");
  });
});
