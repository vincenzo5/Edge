"""TWS sidecar — account cache and subscriptions."""

from __future__ import annotations


from typing import Any

from ib_insync import IB

from tws_sidecar import config
from tws_sidecar.runtime.resolve import runtime_attr
from tws_sidecar.mapping import (
    _map_contract,
    _map_execution_from_fill,
    _map_order,
    _portfolio_key,
    _upsert_execution,
)
from tws_sidecar.util import now_ms, safe_float
import tws_sidecar.runtime.state as state_mod
from tws_sidecar.runtime.state import *

def _resolve_account_id(ib: IB) -> str:
    account_pin = runtime_attr("TWS_ACCOUNT_ID", "")
    if account_pin:
        state_mod._account_id = account_pin
        return account_pin
    accounts = ib.managedAccounts() or []
    state_mod._managed_accounts = list(accounts)
    if not accounts:
        raise RuntimeError("No managed IB accounts available")
    state_mod._account_id = accounts[0]
    return accounts[0]


def _resolve_ephemeral_account_id(ib: IB) -> str | None:
    """Live/extra Gateway sockets — never apply paper TWS_ACCOUNT_ID pin."""
    live_pin = runtime_attr("TWS_LIVE_ACCOUNT_ID", "")
    if live_pin:
        return live_pin
    managed = list(ib.managedAccounts() or [])
    return managed[0] if managed else None


def _ensure_extra_account_subscriptions(ib: IB, connection_id: str) -> None:
    """Keep reqAccountUpdates + reqPnL alive on ib-live between polls."""
    with _account_lock:
        if connection_id in _extra_account_subscriptions_active:
            return

    account_id = _resolve_ephemeral_account_id(ib)
    if not account_id:
        return

    def on_pnl(pnl) -> None:
        pnl_account = getattr(pnl, "account", None)
        if pnl_account not in (None, account_id):
            return
        payload = {
            "account": account_id,
            "dailyPnL": safe_float(getattr(pnl, "dailyPnL", None)),
            "unrealizedPnL": safe_float(getattr(pnl, "unrealizedPnL", None)),
            "realizedPnL": safe_float(getattr(pnl, "realizedPnL", None)),
            "updatedAt": now_ms(),
        }
        with _account_lock:
            _extra_account_pnl[connection_id] = payload

    ib.pnlEvent += on_pnl
    try:
        ib.client.reqAccountUpdates(True, account_id)
    except Exception:  # noqa: BLE001
        pass
    try:
        ib.reqPnL(account_id)
    except Exception:  # noqa: BLE001
        pass
    with _account_lock:
        _extra_account_subscriptions_active.add(connection_id)

def _on_update_portfolio(item) -> None:
    contract = item.contract
    key = _portfolio_key(contract)
    with _account_lock:
        _account_portfolio[key] = {
            "account": item.account,
            "contract": _map_contract(contract),
            "position": safe_float(item.position),
            "marketPrice": safe_float(item.marketPrice),
            "marketValue": safe_float(item.marketValue),
            "averageCost": safe_float(item.averageCost),
            "unrealizedPNL": safe_float(item.unrealizedPNL),
            "realizedPNL": safe_float(item.realizedPNL),
            "updatedAt": now_ms(),
        }


def _cache_account_value(
    key: str | None,
    value: Any,
    currency: str | None,
    account_name: str | None,
) -> None:
    if key is None or value is None:
        return
    with _account_lock:
        bucket = _account_values.setdefault(currency or "BASE", {})
        bucket[key] = {
            "value": value,
            "currency": currency,
            "account": account_name,
            "updatedAt": now_ms(),
        }
        if key in (
            "NetLiquidation",
            "BuyingPower",
            "AvailableFunds",
            "ExcessLiquidity",
            "InitMarginReq",
            "MaintMarginReq",
            "Leverage",
            "DayTradesRemaining",
            "GrossPositionValue",
            "TotalCashValue",
            "SettledCash",
            "Cushion",
            "EquityWithLoanValue",
            "UnrealizedPnL",
            "RealizedPnL",
        ):
            _account_summary[key] = {
                "tag": key,
                "value": value,
                "currency": currency,
                "account": account_name,
            }
            global _account_summary_updated_at
            _account_summary_updated_at = now_ms()


def _on_update_account_value(account_value) -> None:
    _cache_account_value(
        getattr(account_value, "tag", None),
        getattr(account_value, "value", None),
        getattr(account_value, "currency", None),
        getattr(account_value, "account", None),
    )


def _on_pnl(pnl) -> None:
    with _account_lock:
        _account_pnl.clear()
        _account_pnl.update(
            {
                "account": getattr(pnl, "account", None),
                "dailyPnL": safe_float(getattr(pnl, "dailyPnL", None)),
                "unrealizedPnL": safe_float(getattr(pnl, "unrealizedPnL", None)),
                "realizedPnL": safe_float(getattr(pnl, "realizedPnL", None)),
                "updatedAt": now_ms(),
            }
        )


def _on_open_order(trade) -> None:
    order = trade.order
    order_id = getattr(order, "orderId", None)
    if order_id is None:
        return
    contract = trade.contract
    with _account_lock:
        _account_orders[int(order_id)] = _map_order(order, contract, trade)


def _on_order_status(trade) -> None:
    _on_open_order(trade)


def _map_execution_from_fill(fill, commission_report=None) -> dict[str, Any]:
    contract = getattr(fill, "contract", None)
    execution = getattr(fill, "execution", None)
    commission = commission_report or getattr(fill, "commissionReport", None)
    mapped_contract = _map_contract(contract) if contract else {}
    return {
        "execId": getattr(execution, "execId", None) if execution else None,
        "time": str(getattr(execution, "time", "")) if execution else None,
        "account": getattr(execution, "acctNumber", None) if execution else None,
        "side": getattr(execution, "side", None) if execution else None,
        "shares": safe_float(getattr(execution, "shares", None)) if execution else None,
        "price": safe_float(getattr(execution, "price", None)) if execution else None,
        "cumQty": safe_float(getattr(execution, "cumQty", None)) if execution else None,
        "avgPrice": safe_float(getattr(execution, "avgPrice", None)) if execution else None,
        "orderId": getattr(execution, "orderId", None) if execution else None,
        "permId": getattr(execution, "permId", None) if execution else None,
        "orderRef": getattr(execution, "orderRef", None) if execution else None,
        "exchange": getattr(execution, "exchange", None) if execution else None,
        "symbol": mapped_contract.get("symbol"),
        "secType": mapped_contract.get("secType"),
        "contract": mapped_contract,
        "commission": safe_float(getattr(commission, "commission", None))
        if commission
        else None,
        "commissionCurrency": getattr(commission, "currency", None) if commission else None,
        "realizedPNL": safe_float(getattr(commission, "realizedPNL", None))
        if commission
        else None,
        "updatedAt": now_ms(),
    }


def _upsert_execution(mapped: dict[str, Any]) -> None:
    exec_id = mapped.get("execId")
    if exec_id:
        for index, existing in enumerate(_account_executions):
            if existing.get("execId") == exec_id:
                merged = {**existing, **mapped}
                _account_executions[index] = merged
                return
    _account_executions.append(mapped)
    if len(_account_executions) > 200:
        _account_executions[:] = _account_executions[-200:]


def _on_exec_details(trade, fill) -> None:
    with _account_lock:
        _upsert_execution(_map_execution_from_fill(fill))


def _on_commission_report(trade, fill, report) -> None:
    with _account_lock:
        _upsert_execution(_map_execution_from_fill(fill, commission_report=report))

def _setup_account_subscriptions(ib: IB) -> None:
    if state_mod._account_subscriptions_active:
        return
    account = _resolve_account_id(ib)
    state_mod._managed_accounts = list(ib.managedAccounts() or [account])

    ib.updatePortfolioEvent += _on_update_portfolio
    ib.accountValueEvent += _on_update_account_value
    ib.pnlEvent += _on_pnl
    ib.openOrderEvent += _on_open_order
    ib.orderStatusEvent += _on_order_status
    ib.execDetailsEvent += _on_exec_details
    ib.commissionReportEvent += _on_commission_report

    try:
        # ib.reqAccountUpdates() waits for accountDownloadEnd and can hang on
        # live/read-only Gateway sessions. The client call only sends the
        # subscription request; updateAccountValue/updatePortfolio events fill
        # the caches as IB delivers them.
        ib.client.reqAccountUpdates(True, account)
    except Exception:  # noqa: BLE001
        pass
    try:
        ib.reqPnL(account)
    except Exception:  # noqa: BLE001
        pass
    try:
        ib.reqAccountSummary()
        for item in ib.accountSummary():
            _on_update_account_value(item)
        state_mod._account_summary_updated_at = now_ms()
    except Exception:  # noqa: BLE001
        pass
    if not config.TWS_READONLY:
        try:
            ib.client.reqOpenOrders()
            for trade in ib.openTrades():
                _on_open_order(trade)
        except Exception:  # noqa: BLE001
            pass
    try:
        for pos in ib.positions():
            key = _portfolio_key(pos.contract)
            with state_mod._account_lock:
                state_mod._account_positions_raw[key] = {
                    "account": pos.account,
                    "contract": _map_contract(pos.contract),
                    "position": safe_float(pos.position),
                    "avgCost": safe_float(pos.avgCost),
                    "updatedAt": now_ms(),
                }
    except Exception:  # noqa: BLE001
        pass

    try:
        _seed_portfolio_market_data(ib)
    except Exception:  # noqa: BLE001
        pass

    state_mod._account_subscriptions_active = True

