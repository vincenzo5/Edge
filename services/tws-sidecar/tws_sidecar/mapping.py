"""TWS sidecar — wire JSON mappers."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from tws_sidecar.util import (
    build_occ_symbol,
    expiration_from_yyyymmdd,
    expiration_to_yyyymmdd,
    now_ms,
    safe_float,
)
from tws_sidecar.runtime.state import *
def _map_bar(bar) -> dict[str, Any]:
    ts = bar.date
    if isinstance(ts, datetime):
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        t_ms = int(ts.timestamp() * 1000)
    else:
        raw = str(ts)
        if re.fullmatch(r"\d{8}", raw):
            parsed = datetime.strptime(raw, "%Y%m%d")
        elif re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
            parsed = datetime.strptime(raw, "%Y-%m-%d")
        else:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        t_ms = int(parsed.timestamp() * 1000)
    return {
        "t": t_ms,
        "o": safe_float(bar.open),
        "h": safe_float(bar.high),
        "l": safe_float(bar.low),
        "c": safe_float(bar.close),
        "v": safe_float(bar.volume),
    }
def _map_ticker_quote(symbol: str, ticker) -> dict[str, Any]:
    last = safe_float(getattr(ticker, "last", None))
    bid = safe_float(getattr(ticker, "bid", None))
    ask = safe_float(getattr(ticker, "ask", None))
    close = safe_float(getattr(ticker, "close", None))
    price = last if last is not None else close
    change = safe_float(getattr(ticker, "change", None)) or (
        (price - close) if price is not None and close not in (None, 0) else None
    )
    change_percent = None
    if change is not None and close not in (None, 0):
        change_percent = (change / close) * 100
    return {
        "symbol": symbol,
        "shortName": getattr(ticker.contract, "localSymbol", None) or symbol,
        "exchange": getattr(ticker.contract, "primaryExchange", None)
        or getattr(ticker.contract, "exchange", None),
        "price": price,
        "change": change,
        "changePercent": change_percent,
        "volume": safe_float(getattr(ticker, "volume", None)),
        "updatedAt": now_ms(),
    }
def _map_option_contract(
    underlying: str,
    expiration: str,
    contract,
    ticker,
) -> dict[str, Any] | None:
    strike = safe_float(getattr(contract, "strike", None))
    right = getattr(contract, "right", None)
    if strike is None or strike <= 0 or right not in ("C", "P"):
        return None
    opt_type = "call" if right == "C" else "put"
    maturity = getattr(contract, "lastTradeDateOrContractMonth", "") or ""
    maturity_yyyymmdd = maturity if len(maturity) == 8 else expiration_to_yyyymmdd(expiration)
    bid = safe_float(ticker.bid)
    ask = safe_float(ticker.ask)
    last = safe_float(ticker.last)
    mark = (bid + ask) / 2 if bid is not None and ask is not None else last
    greeks = getattr(ticker, "modelGreeks", None)
    return {
        "contractSymbol": build_occ_symbol(underlying, maturity_yyyymmdd, right, strike),
        "underlying": underlying,
        "type": opt_type,
        "expiration": expiration_from_yyyymmdd(maturity_yyyymmdd),
        "strike": strike,
        "bid": bid,
        "ask": ask,
        "last": last,
        "mark": mark,
        "volume": safe_float(ticker.volume),
        "openInterest": safe_float(getattr(ticker, "openInterest", None)),
        "impliedVolatility": safe_float(getattr(greeks, "impliedVol", None) if greeks else None),
        "delta": safe_float(getattr(greeks, "delta", None) if greeks else None),
        "gamma": safe_float(getattr(greeks, "gamma", None) if greeks else None),
        "theta": safe_float(getattr(greeks, "theta", None) if greeks else None),
        "vega": safe_float(getattr(greeks, "vega", None) if greeks else None),
        "updatedAt": now_ms(),
    }
def _map_contract(contract) -> dict[str, Any]:
    return {
        "conId": getattr(contract, "conId", None),
        "symbol": getattr(contract, "symbol", None),
        "secType": getattr(contract, "secType", None),
        "currency": getattr(contract, "currency", None),
        "exchange": getattr(contract, "exchange", None),
        "primaryExchange": getattr(contract, "primaryExchange", None),
        "lastTradeDateOrContractMonth": getattr(
            contract, "lastTradeDateOrContractMonth", None
        ),
        "strike": safe_float(getattr(contract, "strike", None)),
        "right": getattr(contract, "right", None),
        "multiplier": getattr(contract, "multiplier", None),
        "localSymbol": getattr(contract, "localSymbol", None),
    }
def _portfolio_key(contract) -> int:
    con_id = getattr(contract, "conId", None)
    if con_id is not None:
        return int(con_id)
    return hash(
        (
            getattr(contract, "symbol", ""),
            getattr(contract, "secType", ""),
            getattr(contract, "lastTradeDateOrContractMonth", ""),
            getattr(contract, "strike", 0),
            getattr(contract, "right", ""),
        )
    )
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
def _map_order(order, contract, trade=None) -> dict[str, Any]:
    """Map an IB order (+ optional Trade) to the account-orders payload.

    Status/fill fields live on ``trade.orderStatus`` in ib_insync, not on the
    Order object — without Trade, fall back to attributes on ``order`` (tests).
    """
    order_status = getattr(trade, "orderStatus", None) if trade is not None else None

    def _status_field(name: str) -> Any:
        if order_status is not None:
            value = getattr(order_status, name, None)
            if value is not None and value != "":
                return value
        return getattr(order, name, None)

    return {
        "orderId": getattr(order, "orderId", None),
        "permId": getattr(order, "permId", None),
        "clientId": getattr(order, "clientId", None),
        "account": getattr(order, "account", None),
        "action": getattr(order, "action", None),
        "totalQuantity": safe_float(getattr(order, "totalQuantity", None)),
        "orderType": getattr(order, "orderType", None),
        "lmtPrice": safe_float(getattr(order, "lmtPrice", None)),
        "auxPrice": safe_float(getattr(order, "auxPrice", None)),
        "tif": getattr(order, "tif", None),
        "status": _status_field("status"),
        "filled": safe_float(_status_field("filled")),
        "remaining": safe_float(_status_field("remaining")),
        "avgFillPrice": safe_float(_status_field("avgFillPrice")),
        "lastFillPrice": safe_float(_status_field("lastFillPrice")),
        "whyHeld": _status_field("whyHeld"),
        "symbol": getattr(contract, "symbol", None),
        "secType": getattr(contract, "secType", None),
        "conId": getattr(contract, "conId", None),
        "orderRef": getattr(order, "orderRef", None),
        "parentId": getattr(order, "parentId", None),
        "ocaGroup": getattr(order, "ocaGroup", None),
        "outsideRth": getattr(order, "outsideRth", None),
        "updatedAt": now_ms(),
    }
