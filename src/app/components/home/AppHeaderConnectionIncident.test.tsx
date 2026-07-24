/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AppHeaderConnectionIncident, {
  HEADER_CONNECTION_SLOT_ID,
} from "./AppHeaderConnectionIncident";

const mockRecoverTws = vi.fn().mockResolvedValue(undefined);

let chromeIncidentLabel: string | null = null;
let chromeRecoveryLabel: "Reconnect" | null = null;
let showRecovery = false;
let recoveringTws = false;
let recoverMessage: string | null = null;

vi.mock("../data-health/DataHealthProvider", () => ({
  useDataHealth: () => ({
    snapshot: {
      projection: {
        chromeIncidentLabel,
        chromeRecoveryLabel,
        showRecovery,
      },
    },
    recoveringTws,
    recoverMessage,
    recoverTws: mockRecoverTws,
  }),
}));

function renderWithSlot() {
  document.body.innerHTML = `<div id="${HEADER_CONNECTION_SLOT_ID}"></div>`;
  return render(<AppHeaderConnectionIncident />);
}

describe("AppHeaderConnectionIncident", () => {
  beforeEach(() => {
    chromeIncidentLabel = null;
    chromeRecoveryLabel = null;
    showRecovery = false;
    recoveringTws = false;
    recoverMessage = null;
    mockRecoverTws.mockClear();
    document.body.innerHTML = "";
  });

  it("renders calm incident and reconnect into the header slot", async () => {
    chromeIncidentLabel = "Broker disconnected";
    chromeRecoveryLabel = "Reconnect";
    showRecovery = true;

    renderWithSlot();

    await waitFor(() => {
      expect(screen.getByTestId("app-header-connection-incident")).toHaveTextContent(
        "Broker disconnected",
      );
    });
    expect(screen.getByTestId("app-header-recover-tws")).toHaveTextContent("Reconnect");

    fireEvent.click(screen.getByTestId("app-header-recover-tws"));
    expect(mockRecoverTws).toHaveBeenCalled();
  });

  it("renders reconnecting incident without recover CTA", async () => {
    chromeIncidentLabel = "Broker reconnecting";
    chromeRecoveryLabel = null;
    showRecovery = false;

    renderWithSlot();

    await waitFor(() => {
      expect(screen.getByTestId("app-header-connection-incident")).toHaveTextContent(
        "Broker reconnecting",
      );
    });
    expect(screen.queryByTestId("app-header-recover-tws")).toBeNull();
  });

  it("renders nothing when incident label is null", () => {
    renderWithSlot();
    expect(screen.queryByTestId("app-header-connection-incident")).toBeNull();
  });
});
