import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AccountPickerMenu from "./AccountPickerMenu";
import type { TradingAccount } from "@/lib/trading/types";

const paperAccount: TradingAccount = {
  broker: "ib",
  connectionId: "ib-paper",
  accountId: "DUP586813",
  environment: "paper",
  availability: "online",
};

const liveAccount: TradingAccount = {
  broker: "ib",
  connectionId: "ib-live",
  accountId: "U25026894",
  environment: "live",
  availability: "online",
};

describe("AccountPickerMenu", () => {
  const onSelectAccount = vi.fn();
  const onSetAlias = vi.fn();

  beforeEach(() => {
    onSelectAccount.mockReset();
    onSetAlias.mockReset();
  });

  it("opens account list with settings rail when trigger is clicked", () => {
    render(
      <AccountPickerMenu
        accounts={[paperAccount, liveAccount]}
        aliases={{}}
        selectedAccount={paperAccount}
        loading={false}
        onSelectAccount={onSelectAccount}
        onSetAlias={onSetAlias}
      />,
    );

    fireEvent.click(screen.getByTestId("app-account-picker"));
    expect(screen.getByTestId("app-account-picker-menu")).toBeInTheDocument();
    expect(screen.getByTestId("app-account-picker-option-ib-paper::DUP586813")).toBeInTheDocument();
    expect(screen.getByTestId("app-account-aliases-settings")).toBeInTheDocument();
  });

  it("selects account from custom menu", () => {
    render(
      <AccountPickerMenu
        accounts={[paperAccount, liveAccount]}
        aliases={{}}
        selectedAccount={paperAccount}
        loading={false}
        onSelectAccount={onSelectAccount}
        onSetAlias={onSetAlias}
      />,
    );

    fireEvent.click(screen.getByTestId("app-account-picker"));
    fireEvent.click(screen.getByTestId("app-account-picker-option-ib-live::U25026894"));
    expect(onSelectAccount).toHaveBeenCalledWith(liveAccount);
  });

  it("opens display-name editor from settings rail inside dropdown", () => {
    render(
      <AccountPickerMenu
        accounts={[paperAccount, liveAccount]}
        aliases={{}}
        selectedAccount={paperAccount}
        loading={false}
        onSelectAccount={onSelectAccount}
        onSetAlias={onSetAlias}
      />,
    );

    fireEvent.click(screen.getByTestId("app-account-picker"));
    fireEvent.click(screen.getByTestId("app-account-aliases-settings"));
    expect(screen.getByTestId("app-account-aliases-popover")).toBeInTheDocument();
    expect(screen.getByTestId("account-alias-input-ib-paper::DUP586813")).toBeInTheDocument();
  });

  it("shows alias in trigger label and account options", () => {
    render(
      <AccountPickerMenu
        accounts={[paperAccount, liveAccount]}
        aliases={{ "ib-paper::DUP586813": "Paper IRA" }}
        selectedAccount={paperAccount}
        loading={false}
        onSelectAccount={onSelectAccount}
        onSetAlias={onSetAlias}
      />,
    );

    expect(screen.getByTestId("app-account-picker")).toHaveTextContent("Paper IRA (paper)");
    fireEvent.click(screen.getByTestId("app-account-picker"));
    expect(screen.getByTestId("app-account-picker-option-ib-paper::DUP586813")).toHaveTextContent(
      "Paper IRA (paper)",
    );
  });
});
