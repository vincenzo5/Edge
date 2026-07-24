import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  HeaderCenterSlotProvider,
  useHeaderCenterSlot,
  useRegisterHeaderCenterSlot,
} from "./HeaderCenterSlot";

function HeaderWithSlot() {
  const centerSlot = useHeaderCenterSlot();
  return <div data-testid="header">{centerSlot}</div>;
}

function DeskHeaderRegistration() {
  useRegisterHeaderCenterSlot(<span data-testid="desk-controls">Desk controls</span>);
  return null;
}

describe("HeaderCenterSlot", () => {
  it("registers a center slot for the shared density header", () => {
    render(
      <HeaderCenterSlotProvider>
        <DeskHeaderRegistration />
        <HeaderWithSlot />
      </HeaderCenterSlotProvider>,
    );

    expect(screen.getByTestId("desk-controls")).toBeInTheDocument();
  });
});
