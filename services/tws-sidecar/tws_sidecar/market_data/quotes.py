"""TWS sidecar — quote subscriptions and cache."""

from __future__ import annotations


from typing import Any

from ib_insync import IB

from tws_sidecar import config
from tws_sidecar.mapping import _map_ticker_quote
from tws_sidecar.util import safe_float
from tws_sidecar.market_data.contracts import _resolve_stock
from tws_sidecar.runtime.connections import _get_ib, _get_ib_for_connection
from tws_sidecar.runtime.state import *

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
def _ticker_has_data(ticker) -> bool:
    if getattr(ticker, "modelGreeks", None) is not None:
        return True
    for field in ("bid", "ask", "last", "close"):
        val = safe_float(getattr(ticker, field, None))
        if val is not None and val > 0:
            return True
    return False

def _spot_from_stock(ib: IB, stock) -> float | None:
    try:
        bars = ib.reqHistoricalData(
            stock,
            endDateTime="",
            durationStr="1 D",
            barSizeSetting="1 day",
            whatToShow="TRADES",
            useRTH=True,
            formatDate=1,
            timeout=config.HISTORICAL_DATA_TIMEOUT_SEC,
        )
        if bars:
            return safe_float(bars[-1].close)
    except Exception:  # noqa: BLE001
        pass
    ticker = ib.reqMktData(stock, "", False, False)
    ib.sleep(0.35)
    spot = safe_float(ticker.last) or safe_float(ticker.close)
    ib.cancelMktData(stock)
    return spot

def _get_ib_for_market_data(connection_id: str) -> IB:
    if connection_id == config.PRIMARY_CONNECTION_ID:
        return _get_ib()
    return _get_ib_for_connection(connection_id)



def _ensure_quote_subscriptions(
    ib: IB,
    symbols: list[str],
    connection_id: str = config.PRIMARY_CONNECTION_ID,
) -> None:
    pending: list[tuple[str, Any]] = []
    with _quote_sub_lock:
        subs = _quote_subscriptions_by_connection.setdefault(connection_id, {})
        for sym in symbols:
            if sym in subs:
                continue
            pending.append((sym, None))
    for sym, _ in pending:
        try:
            resolved = _resolve_stock(sym)
            ticker = ib.reqMktData(resolved, "", False, False)
            with _quote_sub_lock:
                subs = _quote_subscriptions_by_connection.setdefault(connection_id, {})
                if sym not in subs:
                    subs[sym] = ticker
        except Exception:  # noqa: BLE001
            continue
            try:
                resolved = _resolve_stock(sym)
                ticker = ib.reqMktData(resolved, "", False, False)
                subs[sym] = ticker
            except Exception:  # noqa: BLE001
                continue


def _read_cached_quotes(
    symbols: list[str],
    connection_id: str = config.PRIMARY_CONNECTION_ID,
) -> dict[str, Any]:
    quotes_out: list[dict[str, Any]] = []
    missing: list[str] = []
    with _quote_sub_lock:
        subs = _quote_subscriptions_by_connection.get(connection_id, {})
        for sym in symbols:
            ticker = subs.get(sym)
            if ticker is None:
                missing.append(sym)
                continue
            quotes_out.append(_map_ticker_quote(sym, ticker))
    return {"quotes": quotes_out, "missingSymbols": missing}


def _fetch_quotes(
    symbols: list[str],
    connection_id: str = config.PRIMARY_CONNECTION_ID,
) -> dict[str, Any]:
    ib = _get_ib_for_market_data(connection_id)
    _ensure_quote_subscriptions(ib, symbols, connection_id)
    payload = _read_cached_quotes(symbols, connection_id)
    if payload["missingSymbols"]:
        _ensure_quote_subscriptions(ib, payload["missingSymbols"], connection_id)
        payload = _read_cached_quotes(symbols, connection_id)
    return payload
