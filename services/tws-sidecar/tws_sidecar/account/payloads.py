"""TWS sidecar — account HTTP payloads."""

from __future__ import annotations


from typing import Any

import time

from ib_insync import IB

from tws_sidecar import config
from tws_sidecar.mapping import _map_contract, _map_execution_from_fill, _map_order, _portfolio_key
from tws_sidecar.util import now_ms, safe_float
from tws_sidecar.account.cache import (
    _ensure_extra_account_subscriptions,
    _resolve_account_id,
    _resolve_ephemeral_account_id,
)
from tws_sidecar.account.pricing import (
    _price_position_row,
    _seed_ephemeral_position_market_data,
    _seed_portfolio_market_data,
)
from tws_sidecar.runtime.resolve import runtime_attr, runtime_callable
from tws_sidecar.runtime.worker import run_on_ib_thread
import tws_sidecar.runtime.state as state_mod
from tws_sidecar.runtime.state import *

def _merge_positions() -> list[dict[str, Any]]:
    with _account_lock:
        keys = set(_account_positions_raw.keys()) | set(_account_portfolio.keys())
        rows: list[dict[str, Any]] = []
        for key in keys:
            raw = _account_positions_raw.get(key, {})
            portfolio = _account_portfolio.get(key, {})
            contract = portfolio.get("contract") or raw.get("contract") or {}
            position = portfolio.get("position")
            if position is None:
                position = raw.get("position")
            if position in (None, 0):
                continue
            rows.append(
                {
                    "account": portfolio.get("account") or raw.get("account"),
                    "contract": contract,
                    "position": position,
                    "avgCost": portfolio.get("averageCost") or raw.get("avgCost"),
                    "marketPrice": portfolio.get("marketPrice"),
                    "marketValue": portfolio.get("marketValue"),
                    "unrealizedPNL": portfolio.get("unrealizedPNL"),
                    "realizedPNL": portfolio.get("realizedPNL"),
                    "updatedAt": max(
                        portfolio.get("updatedAt") or 0, raw.get("updatedAt") or 0
                    ),
                }
            )
        rows.sort(
            key=lambda row: abs(safe_float(row.get("marketValue")) or 0),
            reverse=True,
        )
        return rows


def _account_status_payload() -> dict[str, Any]:
    ib = state_mod._ib
    connected = ib is not None and ib.isConnected()
    with state_mod._account_lock:
        return {
            "enabled": True,
            "connected": connected
            and bool(runtime_attr("_account_subscriptions_active", state_mod._account_subscriptions_active)),
            "accountId": runtime_attr("_account_id", state_mod._account_id),
            "managedAccounts": list(
                runtime_attr("_managed_accounts", state_mod._managed_accounts) or []
            ),
            "summaryUpdatedAt": state_mod._account_summary_updated_at or None,
            "readOnly": config.IB_CONNECT_READONLY,
            "timestamp": now_ms(),
        }


def _account_summary_payload() -> dict[str, Any]:
    with _account_lock:
        tags = dict(_account_summary)
        pnl = dict(_account_pnl)
        updated_at = _account_summary_updated_at
    return {
        "accountId": _account_id,
        "tags": tags,
        "pnl": pnl,
        "updatedAt": updated_at or now_ms(),
    }


def _account_stream_payload() -> dict[str, Any]:
    return {
        "type": "update",
        "status": _account_status_payload(),
        "summary": _account_summary_payload(),
        "positions": _merge_positions(),
        "pnl": dict(_account_pnl),
        "orders": list(_account_orders.values()),
        "executions": list(_account_executions)[-50:],
        "meta": {"source": "tws", "asOf": now_ms(), "streaming": True},
    }


def _ephemeral_account_status(ib: IB) -> dict[str, Any]:
    connected = ib.isConnected()
    managed = list(ib.managedAccounts() or [])
    account_id = _resolve_ephemeral_account_id(ib)
    return {
        "enabled": True,
        "connected": connected,
        "accountId": account_id,
        "managedAccounts": managed,
        "summaryUpdatedAt": now_ms() if connected else None,
        "readOnly": config.IB_CONNECT_READONLY,
        "timestamp": now_ms(),
    }


def _ephemeral_account_summary(
    ib: IB,
    pnl: dict[str, Any] | None = None,
    connection_id: str | None = None,
) -> dict[str, Any]:
    account_id = _resolve_ephemeral_account_id(ib)
    tags: dict[str, dict[str, Any]] = {}
    try:
        ib.reqAccountSummary()
        ib.sleep(0.3)
        for item in ib.accountSummary():
            tag = getattr(item, "tag", None)
            if not tag:
                continue
            tags[str(tag)] = {
                "value": getattr(item, "value", None),
                "currency": getattr(item, "currency", None),
            }
        try:
            ib.cancelAccountSummary()
        except Exception:  # noqa: BLE001
            pass
    except Exception:  # noqa: BLE001
        pass
    resolved_pnl = pnl if pnl is not None else _ephemeral_pnl(ib, connection_id)
    return {
        "accountId": account_id,
        "tags": tags,
        "pnl": resolved_pnl,
        "updatedAt": now_ms(),
    }


def _ephemeral_pnl(ib: IB, connection_id: str | None = None) -> dict[str, Any]:
    resolve_account = runtime_callable("_resolve_ephemeral_account_id", _resolve_ephemeral_account_id)
    ensure_subs = runtime_callable("_ensure_extra_account_subscriptions", _ensure_extra_account_subscriptions)
    account_id = resolve_account(ib)
    if not account_id:
        return {"updatedAt": now_ms()}

    persistent = bool(connection_id and connection_id != config.PRIMARY_CONNECTION_ID)
    if persistent:
        ensure_subs(ib, connection_id)
        with _account_lock:
            cached = dict(_extra_account_pnl.get(connection_id, {}))
        if safe_float(cached.get("dailyPnL")) is not None:
            cached.setdefault("account", account_id)
            cached["updatedAt"] = now_ms()
            return cached

    subscribed = False
    try:
        existing = ib.pnl(account_id)
        if existing:
            pnl_obj = existing[0]
        else:
            ib.reqPnL(account_id)
            subscribed = True
            deadline = time.time() + 2.0
            pnl_obj = None
            while time.time() < deadline:
                ib.sleep(0.2)
                subs = ib.pnl(account_id)
                if subs:
                    pnl_obj = subs[0]
                    if safe_float(getattr(pnl_obj, "dailyPnL", None)) is not None:
                        break
        if pnl_obj is None:
            return {"account": account_id, "updatedAt": now_ms()}
        payload = {
            "account": account_id,
            "dailyPnL": safe_float(getattr(pnl_obj, "dailyPnL", None)),
            "unrealizedPnL": safe_float(getattr(pnl_obj, "unrealizedPnL", None)),
            "realizedPnL": safe_float(getattr(pnl_obj, "realizedPnL", None)),
            "updatedAt": now_ms(),
        }
        if persistent and connection_id:
            with _account_lock:
                _extra_account_pnl[connection_id] = payload
        return payload
    except Exception:  # noqa: BLE001
        return {"account": account_id, "updatedAt": now_ms()}
    finally:
        if subscribed and not persistent:
            try:
                ib.cancelPnL(account_id)
            except Exception:  # noqa: BLE001
                pass


def _merge_ephemeral_position_rows(
    portfolio_rows: list[dict[str, Any]],
    raw_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen_keys: set[Any] = set()
    for portfolio in portfolio_rows:
        contract = portfolio.get("contract") or {}
        key = _portfolio_key_from_dict(contract)
        position = portfolio.get("position")
        if position in (None, 0):
            continue
        seen_keys.add(key)
        rows.append(
            {
                "account": portfolio.get("account"),
                "contract": contract,
                "position": position,
                "avgCost": portfolio.get("avgCost"),
                "marketPrice": portfolio.get("marketPrice"),
                "marketValue": portfolio.get("marketValue"),
                "unrealizedPNL": portfolio.get("unrealizedPNL"),
                "realizedPNL": portfolio.get("realizedPNL"),
                "updatedAt": portfolio.get("updatedAt") or now_ms(),
            }
        )

    for raw in raw_rows:
        contract = raw.get("contract") or {}
        key = _portfolio_key_from_dict(contract)
        if key in seen_keys:
            continue
        position = raw.get("position")
        if position in (None, 0):
            continue
        rows.append(
            {
                "account": raw.get("account"),
                "contract": contract,
                "position": position,
                "avgCost": raw.get("avgCost"),
                "marketPrice": raw.get("marketPrice"),
                "marketValue": raw.get("marketValue"),
                "unrealizedPNL": raw.get("unrealizedPNL"),
                "realizedPNL": raw.get("realizedPNL"),
                "updatedAt": raw.get("updatedAt") or now_ms(),
            }
        )

    rows.sort(
        key=lambda row: abs(safe_float(row.get("marketValue")) or 0),
        reverse=True,
    )
    return rows


def _portfolio_key_from_dict(contract: dict[str, Any]) -> Any:
    return (
        contract.get("conId")
        or (
            contract.get("symbol"),
            contract.get("secType"),
            contract.get("lastTradeDateOrContractMonth"),
            contract.get("strike"),
            contract.get("right"),
        )
    )


def _ephemeral_positions(ib: IB, connection_id: str | None = None) -> list[dict[str, Any]]:
    account_id = _resolve_ephemeral_account_id(ib)
    portfolio_rows: list[dict[str, Any]] = []
    raw_rows: list[dict[str, Any]] = []
    persistent = bool(connection_id and connection_id != config.PRIMARY_CONNECTION_ID)
    started_updates = False

    if persistent and connection_id:
        _ensure_extra_account_subscriptions(ib, connection_id)

    if account_id and not persistent:
        try:
            ib.client.reqAccountUpdates(True, account_id)
            started_updates = True
            ib.sleep(0.6)
        except Exception:  # noqa: BLE001
            pass
    elif account_id and persistent:
        ib.sleep(0.3)

    try:
        for item in ib.portfolio():
            if account_id and getattr(item, "account", None) != account_id:
                continue
            portfolio_rows.append(
                {
                    "account": item.account,
                    "contract": _map_contract(item.contract),
                    "position": safe_float(item.position),
                    "avgCost": safe_float(item.averageCost),
                    "marketPrice": safe_float(item.marketPrice),
                    "marketValue": safe_float(item.marketValue),
                    "unrealizedPNL": safe_float(item.unrealizedPNL),
                    "realizedPNL": safe_float(item.realizedPNL),
                    "updatedAt": now_ms(),
                }
            )
    except Exception:  # noqa: BLE001
        pass

    for pos in ib.positions():
        if account_id and pos.account != account_id:
            continue
        if safe_float(pos.position) in (None, 0):
            continue
        raw_rows.append(
            {
                "account": pos.account,
                "contract": _map_contract(pos.contract),
                "position": safe_float(pos.position),
                "avgCost": safe_float(pos.avgCost),
                "updatedAt": now_ms(),
            }
        )

    if started_updates and account_id:
        try:
            ib.client.reqAccountUpdates(False, account_id)
        except Exception:  # noqa: BLE001
            pass

    rows = _merge_ephemeral_position_rows(portfolio_rows, raw_rows)
    return _seed_ephemeral_position_market_data(ib, rows)


def _ephemeral_orders(ib: IB, account_id: str | None = None) -> list[dict[str, Any]]:
    orders: list[dict[str, Any]] = []
    for trade in ib.openTrades():
        mapped = _map_order(trade.order, trade.contract, trade)
        if account_id and mapped.get("account") != account_id:
            continue
        orders.append(mapped)
    return orders


def _ephemeral_trades(ib: IB, limit: int = 100) -> list[dict[str, Any]]:
    try:
        ib.reqExecutions()
        ib.sleep(1.5)
        fills = list(ib.fills())
        mapped = [_map_execution_from_fill(fill) for fill in fills]
        if len(mapped) > limit:
            mapped = mapped[-limit:]
        return mapped
    except Exception:  # noqa: BLE001
        return []


def _ephemeral_stream_payload(ib: IB, connection_id: str | None = None) -> dict[str, Any]:
    pnl = _ephemeral_pnl(ib, connection_id)
    return {
        "type": "update",
        "status": _ephemeral_account_status(ib),
        "summary": _ephemeral_account_summary(ib, pnl=pnl, connection_id=connection_id),
        "positions": _ephemeral_positions(ib, connection_id),
        "pnl": pnl,
        "orders": _ephemeral_orders(ib),
        "executions": _ephemeral_trades(ib, limit=50),
        "meta": {"source": "tws", "asOf": now_ms(), "streaming": True},
    }

