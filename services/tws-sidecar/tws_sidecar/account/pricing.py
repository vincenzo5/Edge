"""TWS sidecar — position market data seeding."""

from __future__ import annotations


from typing import Any

from ib_insync import IB

from tws_sidecar.mapping import _map_contract, _portfolio_key
from tws_sidecar.util import now_ms, safe_float
from tws_sidecar.runtime.worker import run_on_ib_thread
from tws_sidecar.runtime.state import *

def _price_position_row(
    ib: IB,
    row: dict[str, Any],
) -> dict[str, Any]:
    """Fill marketPrice/marketValue/unrealizedPNL for a position row via reqMktData."""
    if row.get("marketPrice") is not None and row.get("unrealizedPNL") is not None:
        return row
    position = safe_float(row.get("position"))
    if not position:
        return row
    contract_info = row.get("contract") or {}
    symbol = (contract_info.get("symbol") or "").strip().upper()
    if not symbol:
        return row
    try:
        con_id = contract_info.get("conId")
        if con_id:
            from ib_insync import Contract

            contract = Contract(conId=int(con_id), symbol=symbol)
            qualified = ib.qualifyContracts(contract)
            contract = qualified[0] if qualified else Stock(symbol, "SMART", "USD")
        else:
            contract = Stock(symbol, "SMART", "USD")
            qualified = ib.qualifyContracts(contract)
            if not qualified:
                return row
            contract = qualified[0]
        ticker = ib.reqMktData(contract, "", False, False)
        ib.sleep(0.4)
        price = safe_float(getattr(ticker, "last", None)) or safe_float(
            getattr(ticker, "close", None)
        )
        ib.cancelMktData(contract)
        if price is None:
            return row
        avg_cost = safe_float(row.get("avgCost")) or 0.0
        return {
            **row,
            "marketPrice": price,
            "marketValue": price * position,
            "unrealizedPNL": (price - avg_cost) * position,
            "updatedAt": now_ms(),
        }
    except Exception:  # noqa: BLE001
        return row


def _seed_ephemeral_position_market_data(
    ib: IB,
    rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Backfill MKT/PnL on live poll rows when portfolio callbacks are still cold."""
    return [_price_position_row(ib, row) for row in rows]


def _seed_portfolio_market_data(ib: IB) -> None:
    """Synchronously fill _account_portfolio so cold loads include MKT/PnL."""
    try:
        for item in ib.portfolio():
            _on_update_portfolio(item)
    except Exception:  # noqa: BLE001
        pass

    with _account_lock:
        keys_needing_price = [
            key
            for key in _account_positions_raw
            if _account_portfolio.get(key, {}).get("marketPrice") is None
        ]
        raw_snapshots = {
            key: dict(_account_positions_raw.get(key, {})) for key in keys_needing_price
        }

    for key, raw in raw_snapshots.items():
        position = safe_float(raw.get("position"))
        if not position:
            continue
        contract_info = raw.get("contract") or {}
        symbol = (contract_info.get("symbol") or "").strip().upper()
        if not symbol:
            continue
        priced = _price_position_row(
            ib,
            {
                "account": raw.get("account"),
                "contract": contract_info,
                "position": position,
                "avgCost": raw.get("avgCost"),
            },
        )
        if priced.get("marketPrice") is None:
            continue
        with _account_lock:
            existing = _account_portfolio.get(key, {})
            _account_portfolio[key] = {
                "account": raw.get("account") or existing.get("account"),
                "contract": contract_info,
                "position": position,
                "marketPrice": priced.get("marketPrice"),
                "marketValue": priced.get("marketValue"),
                "averageCost": existing.get("averageCost") or safe_float(raw.get("avgCost")),
                "unrealizedPNL": priced.get("unrealizedPNL"),
                "realizedPNL": existing.get("realizedPNL"),
                "updatedAt": now_ms(),
            }

