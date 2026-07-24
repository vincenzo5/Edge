"""TWS sidecar — contract resolution."""

from __future__ import annotations


from typing import Any

from fastapi import HTTPException
from ib_insync import IB, Stock

from tws_sidecar import config
from tws_sidecar.runtime.connections import _connect_ib_to, _get_ib, _get_ib_for_connection
from tws_sidecar.runtime.state import *

def _resolve_stock(symbol: str, ib: IB | None = None) -> Any:
    sym = symbol.strip().upper()
    session_ib = ib or _get_ib()
    cached = _contract_cache.get(sym)
    if cached is not None and ib is None:
        return cached
    contract = Stock(sym, "SMART", "USD")
    qualified = session_ib.qualifyContracts(contract)
    if not qualified:
        raise HTTPException(status_code=404, detail=f"Could not resolve stock {sym}")
    resolved = qualified[0]
    if ib is None:
        _contract_cache[sym] = resolved
    return resolved


def _resolve_stock_for_connection(symbol: str, ib: IB) -> Any:
    return _resolve_stock(symbol, ib)


def _get_secdef_chains(sym: str, stock) -> list[Any]:
    with _secdef_cache_lock:
        cached = _secdef_cache.get(sym)
        if cached and (time.time() - cached[0]) < SECDEF_CACHE_TTL_SEC:
            return cached[1]
    ib = _get_ib()
    chains = ib.reqSecDefOptParams(stock.symbol, "", stock.secType, stock.conId) or []
    with _secdef_cache_lock:
        _secdef_cache[sym] = (time.time(), chains)
    return chains


def _resolve_spot_for_chain(ib: IB, stock, strike_window: dict[str, Any] | None) -> float | None:
    if strike_window and strike_window.get("spot") is not None:
        spot = safe_float(strike_window.get("spot"))
        if spot is not None and spot > 0:
            return spot
    return _spot_from_stock(ib, stock)

def _map_contract_details(symbol: str, resolved, details) -> dict[str, Any]:
    contract = getattr(details, "contract", resolved)
    return {
        "symbol": symbol.strip().upper(),
        "conid": getattr(contract, "conId", None) or getattr(resolved, "conId", None),
        "secType": getattr(contract, "secType", None),
        "exchange": getattr(contract, "exchange", None),
        "primaryExchange": getattr(contract, "primaryExchange", None)
        or getattr(resolved, "primaryExchange", None),
        "companyName": getattr(details, "longName", None)
        or getattr(contract, "symbol", None),
        "industry": getattr(details, "industry", None),
        "category": getattr(details, "category", None),
        "subcategory": getattr(details, "subcategory", None),
    }
