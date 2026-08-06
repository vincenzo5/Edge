"""TWS sidecar — trading HTTP routes."""

from __future__ import annotations

from tws_sidecar.app import app


import uuid
from typing import Any

from fastapi import HTTPException, Query

from tws_sidecar import config
from tws_sidecar.mapping import _map_order
from tws_sidecar.runtime.connections import _get_ib, _get_ib_for_connection
from tws_sidecar.runtime.state import *  # noqa: F403 — route handlers use shared account caches
from tws_sidecar.runtime.worker import run_on_ib_thread
from tws_sidecar.trading.guards import _require_trading_enabled, _validate_account_id
from tws_sidecar.trading.models import BracketOrderRequest, ModifyOrderRequest, PlaceOrderRequest, ProtectiveOcoRequest
from tws_sidecar.trading.orders import (
    _apply_order_modify_patch,
    _build_stock_order,
    _find_open_trade,
    _place_bracket_orders,
    _place_protective_oco_orders,
)
from tws_sidecar.market_data.contracts import _resolve_stock
from tws_sidecar.util import now_ms
@app.post("/trading/orders")
def trading_place_order(body: PlaceOrderRequest) -> dict[str, Any]:
    resolved = _require_trading_enabled(body.connectionId)

    def work():
        sym = body.symbol.strip().upper()
        action = body.action.upper()
        order_ref = body.orderRef or f"edge-{uuid.uuid4()}"
        try:
            ib = (
                _get_ib()
                if resolved == config.PRIMARY_CONNECTION_ID
                else _get_ib_for_connection(resolved)
            )
            account = _validate_account_id(ib, body.accountId)
            contract = _resolve_stock(sym, ib)
            order = _build_stock_order(
                action=action,
                quantity=body.quantity,
                order_type=body.orderType,
                limit_price=body.limitPrice,
                stop_price=body.stopPrice,
                trail_percent=body.trailPercent,
                account=account,
                transmit=True,
                order_ref=order_ref,
                tif=body.tif,
                outside_rth=body.outsideRth,
                all_or_none=body.allOrNone,
                use_price_mgmt_algo=body.usePriceMgmtAlgo,
            )
            trade = ib.placeOrder(contract, order)
            ib.sleep(0.5)
            mapped = _map_order(trade.order, trade.contract, trade)
            if resolved == config.PRIMARY_CONNECTION_ID:
                with _account_lock:
                    oid = mapped.get("orderId")
                    if oid is not None:
                        _account_orders[int(oid)] = mapped
            return {"order": mapped, "updatedAt": now_ms()}
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_HIGH)


@app.post("/trading/brackets")
def trading_place_bracket(body: BracketOrderRequest) -> dict[str, Any]:
    resolved = _require_trading_enabled(body.connectionId)

    def work():
        sym = body.symbol.strip().upper()
        order_ref = body.orderRef or f"edge-bracket-{uuid.uuid4()}"
        try:
            ib = (
                _get_ib()
                if resolved == config.PRIMARY_CONNECTION_ID
                else _get_ib_for_connection(resolved)
            )
            account = _validate_account_id(ib, body.accountId)
            contract = _resolve_stock(sym, ib)
            orders = _place_bracket_orders(ib, contract, account, body, order_ref)
            if resolved == config.PRIMARY_CONNECTION_ID:
                with _account_lock:
                    for key in ("entryOrder", "stopOrder", "takeProfitOrder"):
                        mapped = orders.get(key) or {}
                        oid = mapped.get("orderId")
                        if oid is not None:
                            _account_orders[int(oid)] = mapped
            return {"orders": orders, "orderRef": order_ref, "updatedAt": now_ms()}
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_HIGH)


@app.post("/trading/oco")
def trading_place_protective_oco(body: ProtectiveOcoRequest) -> dict[str, Any]:
    resolved = _require_trading_enabled(body.connectionId)

    def work():
        sym = body.symbol.strip().upper()
        order_ref = body.orderRef or f"edge-oco-{uuid.uuid4()}"
        try:
            ib = (
                _get_ib()
                if resolved == config.PRIMARY_CONNECTION_ID
                else _get_ib_for_connection(resolved)
            )
            account = _validate_account_id(ib, body.accountId)
            contract = _resolve_stock(sym, ib)
            orders = _place_protective_oco_orders(ib, contract, account, body, order_ref)
            if resolved == config.PRIMARY_CONNECTION_ID:
                with _account_lock:
                    for key in ("stopOrder", "takeProfitOrder"):
                        mapped = orders.get(key) or {}
                        oid = mapped.get("orderId")
                        if oid is not None:
                            _account_orders[int(oid)] = mapped
            return {"orders": orders, "orderRef": order_ref, "updatedAt": now_ms()}
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_HIGH)


@app.patch("/trading/orders/{order_id}")
def trading_modify_order(order_id: int, body: ModifyOrderRequest) -> dict[str, Any]:
    resolved = _require_trading_enabled(body.connectionId)

    def work():
        try:
            ib = (
                _get_ib()
                if resolved == config.PRIMARY_CONNECTION_ID
                else _get_ib_for_connection(resolved)
            )
            account = _validate_account_id(ib, body.accountId)
            trade = _find_open_trade(ib, order_id)
            trade_account = getattr(trade.order, "account", None)
            if trade_account and str(trade_account).strip() != account:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Order {order_id} belongs to {trade_account!r}, "
                        f"not {account!r}"
                    ),
                )
            _apply_order_modify_patch(trade.order, body)
            ib.placeOrder(trade.contract, trade.order)
            ib.sleep(0.5)
            mapped = _map_order(trade.order, trade.contract, trade)
            if resolved == config.PRIMARY_CONNECTION_ID:
                with _account_lock:
                    oid = mapped.get("orderId")
                    if oid is not None:
                        _account_orders[int(oid)] = mapped
            return {"order": mapped, "updatedAt": now_ms()}
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_HIGH)


@app.delete("/trading/orders/{order_id}")
def trading_cancel_order(
    order_id: int,
    connectionId: str | None = Query(default=None),
) -> dict[str, Any]:
    resolved = _require_trading_enabled(connectionId)

    def work():
        try:
            ib = (
                _get_ib()
                if resolved == config.PRIMARY_CONNECTION_ID
                else _get_ib_for_connection(resolved)
            )
            trade = _find_open_trade(ib, order_id)
            ib.cancelOrder(trade.order)
            ib.sleep(1.0)
            mapped: dict[str, Any] | None = None
            for open_trade in ib.openTrades():
                oid = getattr(open_trade.order, "orderId", None)
                if oid is not None and int(oid) == order_id:
                    mapped = _map_order(open_trade.order, open_trade.contract, open_trade)
                    break
            if mapped is None:
                with _account_lock:
                    cached = _account_orders.get(order_id)
                if cached:
                    mapped = {**cached, "status": "Cancelled", "updatedAt": now_ms()}
                else:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Order {order_id} not found after cancel",
                    )
            with _account_lock:
                _account_orders[order_id] = mapped
            return {"order": mapped, "updatedAt": now_ms()}
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_HIGH)
