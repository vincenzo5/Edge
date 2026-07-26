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

  it("does not rerender the registering subtree when the slot is published", () => {
    let registrationRenders = 0;

    function CountedRegistration() {
      registrationRenders += 1;
      useRegisterHeaderCenterSlot(<span>Desk controls</span>);
      return null;
    }

    render(
      <HeaderCenterSlotProvider>
        <CountedRegistration />
        <HeaderWithSlot />
      </HeaderCenterSlotProvider>,
    );

    expect(registrationRenders).toBe(1);
  });
});
