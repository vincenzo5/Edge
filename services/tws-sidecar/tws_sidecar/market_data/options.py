"""TWS sidecar — options chain."""

from __future__ import annotations

from tws_sidecar import config

from typing import Any

from fastapi import HTTPException
from ib_insync import IB, Option

from tws_sidecar.util import (
    build_occ_symbol,
    expiration_from_yyyymmdd,
    expiration_to_yyyymmdd,
    now_ms,
    safe_float,
)
from tws_sidecar.market_data.contracts import _resolve_stock
from tws_sidecar.market_data.quotes import _spot_from_stock, _ticker_has_data
from tws_sidecar.runtime.worker import run_on_ib_thread
from tws_sidecar.runtime.state import *

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
def _fetch_option_chain(
    sym: str,
    expiration: str,
    expiration_yyyymmdd: str,
    strike_window: dict[str, Any] | None,
) -> dict[str, Any]:
    warnings: list[str] = []
    stock = _resolve_stock(sym)
    ib = _get_ib()
    chains = _get_secdef_chains(sym, stock)
    strikes: set[float] = set()
    trading_class = None
    exchange = "SMART"
    for chain in chains or []:
        if expiration_yyyymmdd in (chain.expirations or []):
            trading_class = chain.tradingClass or trading_class
            exchange = chain.exchange or exchange
            for strike in chain.strikes or []:
                val = safe_float(strike)
                if val is not None and val > 0:
                    strikes.add(val)
    if not strikes:
        return {
            "chain": {"underlying": sym, "expiration": expiration, "contracts": []},
            "warnings": ["TWS returned no strikes for expiration"],
        }

    spot = _resolve_spot_for_chain(ib, stock, strike_window)
    selected = _select_strikes(sorted(strikes), strike_window, spot)
    option_specs = [
        Option(
            sym,
            expiration_yyyymmdd,
            strike,
            right,
            exchange,
            tradingClass=trading_class,
        )
        for strike in selected
        for right in ("C", "P")
    ]
    if not option_specs:
        return {
            "chain": {"underlying": sym, "expiration": expiration, "contracts": []},
            "warnings": ["No option contracts selected for strike window"],
        }

    qualified = ib.qualifyContracts(*option_specs)
    if not qualified:
        return {
            "chain": {"underlying": sym, "expiration": expiration, "contracts": []},
            "warnings": ["TWS could not qualify selected option contracts"],
        }

    tickers = [ib.reqMktData(opt, "106", False, False) for opt in qualified]
    wait_budget = min(8.0, 1.0 + 0.12 * len(qualified))
    deadline = time.time() + wait_budget
    while time.time() < deadline:
        ib.sleep(0.1)
        ready = sum(1 for ticker in tickers if _ticker_has_data(ticker))
        if ready >= max(1, len(tickers) // 2):
            break

    contracts: list[dict[str, Any]] = []
    for resolved_opt, ticker in zip(qualified, tickers, strict=True):
        mapped = _map_option_contract(sym, expiration, resolved_opt, ticker)
        if mapped:
            contracts.append(mapped)
        ib.cancelMktData(resolved_opt)

    contracts.sort(key=lambda row: (row["strike"], row["type"]))
    if not contracts:
        warnings.append("TWS returned no option contracts with market data")
    elif any(not _ticker_has_data(ticker) for ticker in tickers):
        warnings.append("Some option contracts returned without live market data")
    return {
        "chain": {"underlying": sym, "expiration": expiration, "contracts": contracts},
        "warnings": warnings,
    }


def _select_strikes(
    all_strikes: list[float], strike_window: dict[str, Any] | None, spot: float | None
) -> list[float]:
    if not strike_window or strike_window.get("mode") == "full":
        return sorted(all_strikes)
    count = int(strike_window.get("count") or 20)
    window_spot = strike_window.get("spot", spot)
    if window_spot is None:
        mid = len(all_strikes) // 2
        half = (count + 1) // 2
        start = max(0, mid - half)
        return sorted(all_strikes)[start : start + count]
    ranked = sorted(all_strikes, key=lambda s: abs(s - float(window_spot)))
    return ranked[:count]

