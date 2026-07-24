"""TWS sidecar — market data HTTP routes."""

from __future__ import annotations

from tws_sidecar.app import app


import json
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, Query
from fastapi.responses import StreamingResponse
from ib_insync import Stock

from tws_sidecar import config
from tws_sidecar.market_data.contracts import (
    _get_secdef_chains,
    _map_contract_details,
    _resolve_spot_for_chain,
    _resolve_stock,
)
from tws_sidecar.market_data.models import QuotesRequest, WarmupRequest
from tws_sidecar.market_data.candles import _map_bar
from tws_sidecar.market_data.options import _fetch_option_chain
from tws_sidecar.market_data.quotes import (
    _ensure_quote_subscriptions,
    _fetch_quotes,
    _get_ib_for_market_data,
    _read_cached_quotes,
)
from tws_sidecar.runtime.connections import _get_ib, _resolve_connection_id
from tws_sidecar.runtime.worker import run_on_ib_thread
from tws_sidecar.util import now_ms
@app.post("/warmup")
def warmup(body: WarmupRequest) -> dict[str, Any]:
    symbols = sorted({s.strip().upper() for s in body.symbols if s.strip()})
    resolved = _resolve_connection_id(body.connectionId)

    def work():
        warmed: list[str] = []
        subscribed: list[str] = []
        try:
            ib = _get_ib_for_market_data(resolved)
            for sym in symbols:
                try:
                    _resolve_stock(sym)
                    warmed.append(sym)
                except HTTPException:
                    continue
                except Exception:  # noqa: BLE001
                    continue
            if symbols:
                try:
                    _ensure_quote_subscriptions(ib, symbols, resolved)
                    with _quote_sub_lock:
                        subs = _quote_subscriptions_by_connection.get(resolved, {})
                        subscribed = [sym for sym in symbols if sym in subs]
                except Exception:  # noqa: BLE001
                    subscribed = []
            return {
                "warmed": warmed,
                "subscribed": subscribed,
                "timestamp": now_ms(),
                "connectionId": resolved,
            }
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_HIGH)


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


@app.get("/contract")
def contract(symbol: str = Query(min_length=1)) -> dict[str, Any]:
    def work():
        try:
            resolved = _resolve_stock(symbol)
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return {
            "symbol": symbol.strip().upper(),
            "conid": resolved.conId,
            "exchange": getattr(resolved, "primaryExchange", None)
            or getattr(resolved, "exchange", None),
            "companyName": getattr(resolved, "longName", None)
            or getattr(resolved, "symbol", None),
        }

    return run_on_ib_thread(work)


@app.get("/contracts/details")
def contract_details(symbol: str = Query(min_length=1)) -> dict[str, Any]:
    def work():
        sym = symbol.strip().upper()
        try:
            ib = _get_ib()
            stock = Stock(sym, "SMART", "USD")
            details_list = ib.reqContractDetails(stock) or []
            if not details_list:
                resolved = _resolve_stock(sym)
                return _map_contract_details(sym, resolved, resolved)
            return _map_contract_details(sym, stock, details_list[0])
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_HIGH)


@app.get("/candles")
def candles(
    symbol: str = Query(min_length=1),
    interval: str = Query(default="1d"),
    range: str = Query(default="1mo", alias="range"),
    before: int | None = None,
    barCount: int | None = None,
    sessionMode: str = Query(default="regular"),
    connectionId: str | None = Query(default=None),
) -> dict[str, Any]:
    use_rth = sessionMode.strip().lower() != "extended"
    resolved = _resolve_connection_id(connectionId)

    def work():
        sym = symbol.strip().upper()
        bar_size = INTERVAL_TO_BAR.get(interval, "1 day")
        duration = RANGE_TO_DURATION.get(range, "1 M")
        if before is not None and barCount is not None:
            duration = f"{max(barCount, 1)} D"
        try:
            resolved_stock = _resolve_stock(sym)
            ib = _get_ib_for_market_data(resolved)
            end_dt = ""
            if before is not None:
                end_dt = datetime.fromtimestamp(before / 1000, tz=timezone.utc).strftime(
                    "%Y%m%d %H:%M:%S UTC"
                )
            bars = ib.reqHistoricalData(
                resolved_stock,
                endDateTime=end_dt,
                durationStr=duration,
                barSizeSetting=bar_size,
                whatToShow="TRADES",
                useRTH=use_rth,
                formatDate=1,
                timeout=config.HISTORICAL_DATA_TIMEOUT_SEC,
            )
            mapped = [_map_bar(bar) for bar in bars if _map_bar(bar)["c"] is not None]
            return {
                "symbol": sym,
                "interval": interval,
                "candles": mapped,
                "hasMore": len(mapped) > 0,
                "sessionMode": "extended" if not use_rth else "regular",
                "connectionId": resolved,
            }
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work)


@app.post("/quotes")
def quotes(body: QuotesRequest) -> dict[str, Any]:
    symbols = sorted({s.strip().upper() for s in body.symbols if s.strip()})
    resolved = _resolve_connection_id(body.connectionId)

    def work():
        try:
            payload = _fetch_quotes(symbols, resolved)
            payload["connectionId"] = resolved
            return payload
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_QUOTES)


@app.get("/options/expirations")
def option_expirations(underlying: str = Query(min_length=1)) -> dict[str, Any]:
    def work():
        sym = underlying.strip().upper()
        warnings: list[str] = []
        try:
            stock = _resolve_stock(sym)
            chains = _get_secdef_chains(sym, stock)
            expirations: set[str] = set()
            for chain in chains:
                for raw in chain.expirations or []:
                    if len(raw) == 8 and raw.isdigit():
                        expirations.add(_expiration_from_yyyymmdd(raw))
            rows = [{"underlying": sym, "expiration": exp} for exp in sorted(expirations)]
            if not rows:
                warnings.append("TWS returned no option expirations")
            return {"expirations": rows, "warnings": warnings}
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_OPTIONS)


@app.get("/options/chain")
def option_chain(
    underlying: str = Query(min_length=1),
    expiration: str = Query(min_length=8),
    strikeWindow: str | None = None,
) -> dict[str, Any]:
    window: dict[str, Any] | None = None
    if strikeWindow:
        try:
            window = json.loads(strikeWindow)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Invalid strikeWindow JSON") from exc

    def work():
        sym = underlying.strip().upper()
        expiration_yyyymmdd = _expiration_to_yyyymmdd(expiration)
        try:
            return _fetch_option_chain(sym, expiration, expiration_yyyymmdd, window)
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, config.PRIORITY_OPTIONS)



@app.get("/stream/quotes")
def stream_quotes(
    symbols: str = Query(min_length=1),
    connectionId: str | None = Query(default=None),
) -> StreamingResponse:
    symbol_list = sorted({s.strip().upper() for s in symbols.split(",") if s.strip()})
    if not symbol_list:
        raise HTTPException(status_code=400, detail="No symbols provided")
    resolved = _resolve_connection_id(connectionId)

    def _schedule_quote_refresh() -> None:
        def work():
            return _fetch_quotes(symbol_list, resolved)
        try:
            run_on_ib_thread(work, config.PRIORITY_QUOTES, job_name="stream_quotes_refresh")
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
                payload = _read_cached_quotes(symbol_list, resolved)
                now = time.time()
                if now - last_refresh >= 1.0:
                    _schedule_quote_refresh()
                    last_refresh = now
                event_type = "snapshot" if not primed else "update"
                primed = True
                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": event_type,
                            "quotes": payload["quotes"],
                            "meta": {
                                "source": "tws",
                                "asOf": now_ms(),
                                "streaming": True,
                                "connectionId": resolved,
                            },
                        }
                    )
                    + "\n\n"
                )
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
