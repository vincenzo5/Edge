"""TWS sidecar — account HTTP routes."""

from __future__ import annotations

from tws_sidecar.app import app


from typing import Any

import json
import time

from fastapi import HTTPException, Query
from fastapi.responses import StreamingResponse

from tws_sidecar import config
from tws_sidecar.account.cache import _on_open_order, _on_update_account_value, _resolve_account_id
from tws_sidecar.account.payloads import (
    _account_status_payload,
    _account_summary_payload,
    _account_stream_payload,
    _ephemeral_account_status,
    _ephemeral_account_summary,
    _ephemeral_orders,
    _ephemeral_pnl,
    _ephemeral_positions,
    _ephemeral_stream_payload,
    _ephemeral_trades,
    _merge_positions,
)
from tws_sidecar.account.pricing import _seed_portfolio_market_data
from tws_sidecar.mapping import _map_contract, _map_execution_from_fill, _portfolio_key, _upsert_execution
from tws_sidecar.runtime.connections import _get_ib, _get_ib_for_connection, _resolve_connection_id
from tws_sidecar.runtime.worker import run_on_ib_thread
from tws_sidecar.runtime.state import *
from tws_sidecar.trading.guards import _require_brokerage_enabled
from tws_sidecar.trading.models import WhatIfRequest
from tws_sidecar.trading.orders import _build_stock_order
from tws_sidecar.market_data.contracts import _resolve_stock_for_connection
from tws_sidecar.util import now_ms, safe_float
@app.get("/account/status")
def account_status(connectionId: str | None = Query(default=None)) -> dict[str, Any]:
    _require_brokerage_enabled()
    resolved = _resolve_connection_id(connectionId)

    # Warm primary cache is non-blocking — keep accounts visible when the IB worker is busy/wedged.
    if resolved == config.PRIMARY_CONNECTION_ID:
        with _account_lock:
            warm = bool(_managed_accounts)
        if warm:
            return _account_status_payload()

    def work():
        try:
            if resolved == config.PRIMARY_CONNECTION_ID:
                _get_ib()
                return _account_status_payload()
            ib = _get_ib_for_connection(resolved)
            return _ephemeral_account_status(ib)
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_HIGH)


@app.get("/account/summary")
def account_summary(connectionId: str | None = Query(default=None)) -> dict[str, Any]:
    _require_brokerage_enabled()
    resolved = _resolve_connection_id(connectionId)

    def work():
        try:
            if resolved == config.PRIMARY_CONNECTION_ID:
                ib = _get_ib()
                if _account_summary_updated_at == 0:
                    try:
                        ib.reqAccountSummary()
                        for item in ib.accountSummary():
                            _on_update_account_value(item)
                    except Exception:  # noqa: BLE001
                        pass
                return _account_summary_payload()
            ib = _get_ib_for_connection(resolved)
            return _ephemeral_account_summary(ib, connection_id=resolved)
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_HIGH)


@app.get("/account/positions")
def account_positions(connectionId: str | None = Query(default=None)) -> dict[str, Any]:
    _require_brokerage_enabled()
    resolved = _resolve_connection_id(connectionId)

    def work():
        try:
            if resolved == config.PRIMARY_CONNECTION_ID:
                ib = _get_ib()
                for pos in ib.positions():
                    key = _portfolio_key(pos.contract)
                    with _account_lock:
                        _account_positions_raw[key] = {
                            "account": pos.account,
                            "contract": _map_contract(pos.contract),
                            "position": safe_float(pos.position),
                            "avgCost": safe_float(pos.avgCost),
                            "updatedAt": now_ms(),
                        }
                _seed_portfolio_market_data(ib)
                return {"positions": _merge_positions(), "updatedAt": now_ms()}
            ib = _get_ib_for_connection(resolved)
            return {"positions": _ephemeral_positions(ib, resolved), "updatedAt": now_ms()}
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_HIGH)


@app.get("/account/pnl")
def account_pnl(connectionId: str | None = Query(default=None)) -> dict[str, Any]:
    _require_brokerage_enabled()
    resolved = _resolve_connection_id(connectionId)

    def work():
        try:
            if resolved == config.PRIMARY_CONNECTION_ID:
                _get_ib()
                with _account_lock:
                    payload = dict(_account_pnl)
                payload.setdefault("updatedAt", now_ms())
                return payload
            ib = _get_ib_for_connection(resolved)
            return _ephemeral_pnl(ib, resolved)
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_HIGH)


@app.get("/account/orders")
def account_orders(
    accountId: str | None = Query(default=None),
    connectionId: str | None = Query(default=None),
) -> dict[str, Any]:
    _require_brokerage_enabled()
    resolved = _resolve_connection_id(connectionId)

    def work():
        try:
            if resolved == config.PRIMARY_CONNECTION_ID:
                ib = _get_ib()
                if not config.TWS_READONLY:
                    ib.client.reqOpenOrders()
                    for trade in ib.openTrades():
                        _on_open_order(trade)
                orders = list(_account_orders.values())
                if accountId:
                    orders = [
                        order
                        for order in orders
                        if str(order.get("account", "")).strip() == accountId.strip()
                    ]
                return {"orders": orders, "updatedAt": now_ms()}
            ib = _get_ib_for_connection(resolved)
            return {
                "orders": _ephemeral_orders(ib, accountId.strip() if accountId else None),
                "updatedAt": now_ms(),
            }
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_HIGH)


@app.get("/account/trades")
def account_trades(connectionId: str | None = Query(default=None)) -> dict[str, Any]:
    _require_brokerage_enabled()
    resolved = _resolve_connection_id(connectionId)

    def work():
        try:
            if resolved == config.PRIMARY_CONNECTION_ID:
                ib = _get_ib()
                ib.reqExecutions()
                ib.sleep(1.5)
                fills = list(ib.fills())
                mapped = [_map_execution_from_fill(fill) for fill in fills]
                if len(mapped) > 200:
                    mapped = mapped[-200:]
                with _account_lock:
                    _account_executions.clear()
                    for row in mapped:
                        _account_executions.append(row)
                with _account_lock:
                    executions = list(_account_executions)[-100:]
                return {"executions": executions, "updatedAt": now_ms()}
            ib = _get_ib_for_connection(resolved)
            executions = _ephemeral_trades(ib, limit=100)
            return {"executions": executions, "updatedAt": now_ms()}
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_HIGH)


@app.post("/account/whatif")
def account_whatif(body: WhatIfRequest) -> dict[str, Any]:
    _require_brokerage_enabled()
    if config.TWS_READONLY:
        raise HTTPException(
            status_code=403,
            detail="What-if preview requires config.TWS_READONLY=false for the IB API session.",
        )
    resolved = _resolve_connection_id(body.connectionId)

    def work():
        sym = body.symbol.strip().upper()
        action = body.action.upper()
        try:
            ib = (
                _get_ib()
                if resolved == config.PRIMARY_CONNECTION_ID
                else _get_ib_for_connection(resolved)
            )
            contract = _resolve_stock_for_connection(sym, ib)
            order = _build_stock_order(
                action=action,
                quantity=body.quantity,
                order_type=body.orderType,
                limit_price=body.limitPrice,
                stop_price=body.stopPrice,
                trail_percent=body.trailPercent,
                account=_resolve_account_id(ib),
                transmit=False,
                outside_rth=body.outsideRth,
            )
            state = ib.whatIfOrder(contract, order)
            return {
                "symbol": sym,
                "action": action,
                "quantity": body.quantity,
                "orderType": body.orderType.upper(),
                "limitPrice": body.limitPrice,
                "stopPrice": body.stopPrice,
                "initMarginChange": safe_float(getattr(state, "initMarginChange", None)),
                "maintMarginChange": safe_float(getattr(state, "maintMarginChange", None)),
                "equityWithLoanChange": safe_float(
                    getattr(state, "equityWithLoanChange", None)
                ),
                "commission": safe_float(getattr(state, "commission", None)),
                "minCommission": safe_float(getattr(state, "minCommission", None)),
                "maxCommission": safe_float(getattr(state, "maxCommission", None)),
                "warningText": getattr(state, "warningText", None),
                "updatedAt": now_ms(),
            }
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_HIGH)



@app.get("/stream/account")
def stream_account(connectionId: str | None = Query(default=None)) -> StreamingResponse:
    _require_brokerage_enabled()
    resolved = _resolve_connection_id(connectionId)

    def _schedule_account_refresh() -> None:
        def work():
            if resolved == config.PRIMARY_CONNECTION_ID:
                _get_ib()
                return _account_stream_payload()
            return _ephemeral_stream_payload(_get_ib_for_connection(resolved), resolved)
        try:
            run_on_ib_thread(
                work,
                config.PRIORITY_HIGH,
                job_name=f"stream_account_refresh_{resolved}",
            )
        except Exception:  # noqa: BLE001
            pass

    def event_generator():
        primed = False
        last_refresh = 0.0
        while True:
            with _recovery_lock:
                paused = _reconnect_paused
            if paused:
                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": "error",
                            "message": "Reconnect in progress",
                            "recoverable": True,
                            "code": "reconnecting",
                        }
                    )
                    + "\n\n"
                )
                time.sleep(1)
                continue
            try:
                if resolved == config.PRIMARY_CONNECTION_ID:
                    payload = _account_stream_payload()
                else:
                    with _account_lock:
                        payload = dict(_extra_account_pnl.get(resolved, {}))
                    payload = payload if payload else {"connectionId": resolved}
                now = time.time()
                if now - last_refresh >= 1.0:
                    _schedule_account_refresh()
                    last_refresh = now
                if not primed:
                    payload = {**payload, "type": "snapshot"}
                    primed = True
                yield "data: " + json.dumps(payload) + "\n\n"
            except Exception as exc:  # noqa: BLE001
                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": "error",
                            "message": str(exc),
                            "recoverable": True,
                        }
                    )
                    + "\n\n"
                )
            time.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
