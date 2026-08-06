"""TWS sidecar — order construction and placement."""

from __future__ import annotations


import uuid
from typing import Any

from fastapi import HTTPException
from ib_insync import IB, LimitOrder, MarketOrder, Order, StopLimitOrder, StopOrder

from tws_sidecar.trading.models import BracketOrderRequest, BracketStopLegRequest, ModifyOrderRequest, ProtectiveOcoRequest
from tws_sidecar.mapping import _map_order
def _build_stock_order(
    *,
    action: str,
    quantity: float,
    order_type: str,
    limit_price: float | None,
    stop_price: float | None = None,
    trail_percent: float | None = None,
    account: str,
    transmit: bool,
    order_ref: str | None = None,
    tif: str = "DAY",
    outside_rth: bool = False,
    all_or_none: bool = False,
    use_price_mgmt_algo: bool = False,
):
    action_upper = action.upper()
    order_type_upper = order_type.upper()
    if order_type_upper == "MKT":
        order = MarketOrder(action_upper, quantity)
    elif order_type_upper == "LMT":
        if limit_price is None:
            raise HTTPException(
                status_code=400, detail="limitPrice required for LMT orders"
            )
        order = LimitOrder(action_upper, quantity, limit_price)
    elif order_type_upper == "STP":
        if stop_price is None:
            raise HTTPException(
                status_code=400, detail="stopPrice required for STP orders"
            )
        order = StopOrder(action_upper, quantity, stop_price)
    elif order_type_upper == "STP LMT":
        if stop_price is None:
            raise HTTPException(
                status_code=400, detail="stopPrice required for STP LMT orders"
            )
        if limit_price is None:
            raise HTTPException(
                status_code=400, detail="limitPrice required for STP LMT orders"
            )
        order = StopLimitOrder(action_upper, quantity, limit_price, stop_price)
    elif order_type_upper == "TRAIL":
        if stop_price is None and trail_percent is None:
            raise HTTPException(
                status_code=400,
                detail="stopPrice (trail amount) or trailPercent required for TRAIL orders",
            )
        order = Order()
        order.action = action_upper
        order.totalQuantity = quantity
        order.orderType = "TRAIL"
        if stop_price is not None:
            order.auxPrice = stop_price
        if trail_percent is not None:
            order.trailingPercent = trail_percent
    elif order_type_upper == "TRAIL LIMIT":
        if stop_price is None and trail_percent is None:
            raise HTTPException(
                status_code=400,
                detail="stopPrice (trail amount) or trailPercent required for TRAIL LIMIT orders",
            )
        if limit_price is None:
            raise HTTPException(
                status_code=400, detail="limitPrice required for TRAIL LIMIT orders"
            )
        order = Order()
        order.action = action_upper
        order.totalQuantity = quantity
        order.orderType = "TRAIL LIMIT"
        order.lmtPrice = limit_price
        if stop_price is not None:
            order.auxPrice = stop_price
        if trail_percent is not None:
            order.trailingPercent = trail_percent
    elif order_type_upper == "MOC":
        order = Order()
        order.action = action_upper
        order.totalQuantity = quantity
        order.orderType = "MOC"
    elif order_type_upper == "LOC":
        if limit_price is None:
            raise HTTPException(
                status_code=400, detail="limitPrice required for LOC orders"
            )
        order = Order()
        order.action = action_upper
        order.totalQuantity = quantity
        order.orderType = "LOC"
        order.lmtPrice = limit_price
    else:
        raise HTTPException(
            status_code=400, detail=f"Unsupported orderType: {order_type}"
        )
    order.account = account
    order.transmit = transmit
    order.tif = tif
    order.outsideRth = outside_rth
    order.allOrNone = all_or_none
    order.usePriceMgmtAlgo = use_price_mgmt_algo
    if order_ref:
        order.orderRef = order_ref
    return order


def _apply_child_order_fields(
    order,
    *,
    account: str,
    transmit: bool,
    tif: str,
    outside_rth: bool,
    order_ref: str | None,
    parent_id: int | None = None,
    oca_group: str | None = None,
    oca_type: int = 1,
):
    order.account = account
    order.transmit = transmit
    order.tif = tif
    order.outsideRth = outside_rth
    if order_ref:
        order.orderRef = order_ref
    if parent_id is not None:
        order.parentId = parent_id
    if oca_group:
        order.ocaGroup = oca_group
        order.ocaType = oca_type
    return order


def _resolve_exit_quantities(body) -> tuple[float, float]:
    entry_qty = body.quantity
    tp_qty = body.takeProfitQuantity if body.takeProfitQuantity is not None else entry_qty
    stop_qty = body.stopQuantity if body.stopQuantity is not None else entry_qty
    return tp_qty, stop_qty


def _oca_type_for_exit_legs(tp_qty: float, stop_qty: float) -> int:
    """IBKR OCA: 1 cancel-all; 2 reduce-with-block when partial TP/stop sizes differ."""
    if tp_qty < stop_qty or stop_qty < tp_qty:
        return 2
    return 1


def _build_stop_leg_order(
    *,
    exit_action: str,
    quantity: float,
    stop_leg: BracketStopLegRequest,
):
    if stop_leg.mode == "trail":
        order = Order()
        order.action = exit_action.upper()
        order.totalQuantity = quantity
        order.orderType = "TRAIL"
        if stop_leg.trailAmount is not None:
            order.auxPrice = stop_leg.trailAmount
        elif stop_leg.trailPercent is not None:
            order.trailingPercent = stop_leg.trailPercent
        else:
            raise HTTPException(
                status_code=400,
                detail="trailAmount or trailPercent required for trail stop leg",
            )
        return order
    if stop_leg.stopPrice is None:
        raise HTTPException(status_code=400, detail="stopPrice required for fixed stop leg")
    return StopOrder(exit_action.upper(), quantity, stop_leg.stopPrice)


def _place_bracket_orders(
    ib: IB,
    contract,
    account: str,
    body: BracketOrderRequest,
    order_ref: str,
) -> dict[str, Any]:
    action = body.action.upper()
    exit_action = "SELL" if action == "BUY" else "BUY"
    parent = _build_stock_order(
        action=action,
        quantity=body.quantity,
        order_type=body.orderType,
        limit_price=body.limitPrice,
        stop_price=body.stopPrice,
        trail_percent=body.trailPercent,
        account=account,
        transmit=False,
        order_ref=order_ref,
        tif=body.tif,
        outside_rth=body.outsideRth,
        all_or_none=body.allOrNone,
        use_price_mgmt_algo=body.usePriceMgmtAlgo,
    )
    parent_trade = ib.placeOrder(contract, parent)
    ib.sleep(0.2)
    parent_id = getattr(parent_trade.order, "orderId", None)
    if parent_id is None:
        raise HTTPException(status_code=503, detail="Bracket parent orderId missing")

    oca_group = f"edge-oca-{uuid.uuid4().hex[:8]}"
    tp_qty, stop_qty = _resolve_exit_quantities(body)
    oca_type = _oca_type_for_exit_legs(tp_qty, stop_qty)
    stop_order = _build_stop_leg_order(
        exit_action=exit_action,
        quantity=stop_qty,
        stop_leg=body.stopLeg,
    )
    stop_only = body.takeProfitPrice is None
    _apply_child_order_fields(
        stop_order,
        account=account,
        transmit=stop_only,
        tif=body.tif,
        outside_rth=body.outsideRth,
        order_ref=f"{order_ref}-stop",
        parent_id=int(parent_id),
        oca_group=oca_group,
        oca_type=oca_type,
    )
    stop_trade = ib.placeOrder(contract, stop_order)

    result: dict[str, Any] = {
        "entryOrder": _map_order(parent_trade.order, parent_trade.contract, parent_trade),
        "stopOrder": _map_order(stop_trade.order, stop_trade.contract, stop_trade),
    }

    if body.takeProfitPrice is not None:
        tp_order = LimitOrder(exit_action.upper(), tp_qty, body.takeProfitPrice)
        _apply_child_order_fields(
            tp_order,
            account=account,
            transmit=True,
            tif=body.tif,
            outside_rth=body.outsideRth,
            order_ref=f"{order_ref}-tp",
            parent_id=int(parent_id),
            oca_group=oca_group,
            oca_type=oca_type,
        )
        tp_trade = ib.placeOrder(contract, tp_order)
        result["takeProfitOrder"] = _map_order(tp_trade.order, tp_trade.contract, tp_trade)
        ib.sleep(0.5)
    else:
        ib.sleep(0.5)

    return result


def _place_protective_oco_orders(
    ib: IB,
    contract,
    account: str,
    body: ProtectiveOcoRequest,
    order_ref: str,
) -> dict[str, Any]:
    exit_action = body.action.upper()
    oca_group = f"edge-oca-{uuid.uuid4().hex[:8]}"
    tp_qty, stop_qty = _resolve_exit_quantities(body)
    oca_type = _oca_type_for_exit_legs(tp_qty, stop_qty)
    stop_order = _build_stop_leg_order(
        exit_action=exit_action,
        quantity=stop_qty,
        stop_leg=body.stopLeg,
    )
    stop_only = body.takeProfitPrice is None
    _apply_child_order_fields(
        stop_order,
        account=account,
        transmit=stop_only,
        tif=body.tif,
        outside_rth=body.outsideRth,
        order_ref=f"{order_ref}-stop",
        oca_group=oca_group,
        oca_type=oca_type,
    )
    stop_trade = ib.placeOrder(contract, stop_order)

    result: dict[str, Any] = {
        "stopOrder": _map_order(stop_trade.order, stop_trade.contract, stop_trade),
    }

    if body.takeProfitPrice is not None:
        tp_order = LimitOrder(exit_action.upper(), tp_qty, body.takeProfitPrice)
        _apply_child_order_fields(
            tp_order,
            account=account,
            transmit=True,
            tif=body.tif,
            outside_rth=body.outsideRth,
            order_ref=f"{order_ref}-tp",
            oca_group=oca_group,
            oca_type=oca_type,
        )
        tp_trade = ib.placeOrder(contract, tp_order)
        result["takeProfitOrder"] = _map_order(tp_trade.order, tp_trade.contract, tp_trade)
        ib.sleep(0.5)
    else:
        ib.sleep(0.5)

    return result


def _find_open_trade(ib: IB, order_id: int):
    for trade in ib.openTrades():
        oid = getattr(trade.order, "orderId", None)
        if oid is not None and int(oid) == order_id:
            return trade
    raise HTTPException(status_code=404, detail=f"Open order {order_id} not found")


def _apply_order_modify_patch(order, body: ModifyOrderRequest) -> None:
    if body.quantity is not None:
        order.totalQuantity = body.quantity
    if body.limitPrice is not None:
        order_type = getattr(order, "orderType", None)
        if order_type not in ("LMT", "STP LMT"):
            raise HTTPException(
                status_code=400,
                detail="limitPrice can only be modified on LMT or STP LMT orders",
            )
        order.lmtPrice = body.limitPrice
    if body.stopPrice is not None:
        order_type = getattr(order, "orderType", None)
        if order_type not in ("STP", "STP LMT"):
            raise HTTPException(
                status_code=400,
                detail="stopPrice can only be modified on STP or STP LMT orders",
            )
        order.auxPrice = body.stopPrice
    if body.tif is not None:
        order.tif = body.tif
