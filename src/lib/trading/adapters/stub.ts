import { BrokerageRequestError } from "@/lib/brokerage/brokerageClient";
import type { BrokerTradingPort } from "../ports";
import type { OrderDraft, OrderModifyPatch, OrderPreview, TradingAccount } from "../types";

const STUB_MESSAGE = "Stub broker adapter is not configured for trading.";

function reject(): never {
  throw new BrokerageRequestError("disabled", STUB_MESSAGE);
}

export class StubTradingAdapter implements BrokerTradingPort {
  async listAccounts(): Promise<TradingAccount[]> {
    return [];
  }

  async preview(_draft: OrderDraft): Promise<OrderPreview> {
    reject();
  }

  async place(_draft: OrderDraft): Promise<{ order: never; orderRef: string }> {
    reject();
  }

  async modify(
    _accountId: string,
    _orderId: number,
    _patch: OrderModifyPatch,
  ): Promise<{ order: never }> {
    reject();
  }

  async cancel(_accountId: string, _orderId: number): Promise<{ order: never }> {
    reject();
  }

  async listOpenOrders(_accountId?: string): Promise<never[]> {
    return [];
  }
}

let singletonStub: StubTradingAdapter | null = null;

export function getStubTradingAdapter(): StubTradingAdapter {
  if (!singletonStub) {
    singletonStub = new StubTradingAdapter();
  }
  return singletonStub;
}

export function resetStubTradingAdapterForTests(): void {
  singletonStub = null;
}
