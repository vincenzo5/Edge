"""Local TWS/IB Gateway sidecar for Edge market data (Phase 1: read-only)."""

from __future__ import annotations

import json
import os
import queue
import re
import threading
import time
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse
from ib_insync import IB, Option, Stock
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env.local", override=True)
load_dotenv(ROOT / ".env", override=True)

TWS_HOST = os.environ.get("TWS_HOST", "127.0.0.1")
TWS_PORT = int(os.environ.get("TWS_PORT", "4002"))
TWS_CLIENT_ID = int(os.environ.get("TWS_CLIENT_ID", "77"))
TWS_READONLY = os.environ.get("TWS_READONLY", "true").lower() != "false"
SIDECAR_PORT = int(os.environ.get("TWS_SIDECAR_PORT", "8765"))

INTERVAL_TO_BAR = {
    "1m": "1 min",
    "5m": "5 mins",
    "15m": "15 mins",
    "30m": "30 mins",
    "1h": "1 hour",
    "2h": "2 hours",
    "1d": "1 day",
    "1wk": "1 week",
    "1mo": "1 month",
}

RANGE_TO_DURATION = {
    "1d": "1 D",
    "5d": "5 D",
    "1mo": "1 M",
    "3mo": "3 M",
    "6mo": "6 M",
    "1y": "1 Y",
    "2y": "2 Y",
    "5y": "5 Y",
    "ytd": "1 Y",
    "max": "10 Y",
}

app = FastAPI(title="Edge TWS Sidecar", version="0.1.0")
_lock = threading.Lock()
_ib: IB | None = None
_last_connect_error: str | None = None
_contract_cache: dict[str, Any] = {}
_ib_jobs: queue.PriorityQueue[tuple[int, int, str, Any]] = queue.PriorityQueue()
_ib_job_seq = 0
_ib_job_seq_lock = threading.Lock()
_ib_results: dict[str, tuple[bool, Any]] = {}
_ib_results_lock = threading.Lock()
_quote_subscriptions: dict[str, Any] = {}
_quote_sub_lock = threading.Lock()

PRIORITY_HIGH = 0
PRIORITY_QUOTES = 1
PRIORITY_OPTIONS = 2


def _ib_worker() -> None:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    while True:
        _priority, _seq, job_id, fn = _ib_jobs.get()
        try:
            result = fn()
            with _ib_results_lock:
                _ib_results[job_id] = (True, result)
        except Exception as exc:  # noqa: BLE001
            with _ib_results_lock:
                _ib_results[job_id] = (False, exc)
        finally:
            _ib_jobs.task_done()


threading.Thread(target=_ib_worker, name="tws-ib-worker", daemon=True).start()


def run_on_ib_thread(fn, priority: int = PRIORITY_HIGH):
    global _ib_job_seq
    job_id = str(uuid.uuid4())
    with _ib_job_seq_lock:
        _ib_job_seq += 1
        seq = _ib_job_seq
    _ib_jobs.put((priority, seq, job_id, fn))
    while True:
        with _ib_results_lock:
            if job_id in _ib_results:
                ok, value = _ib_results.pop(job_id)
                break
        time.sleep(0.01)
    if ok:
        return value
    raise value


class QuotesRequest(BaseModel):
    symbols: list[str] = Field(min_length=1, max_length=100)


class WarmupRequest(BaseModel):
    symbols: list[str] = Field(default_factory=list, max_length=50)


def _now_ms() -> int:
    return int(time.time() * 1000)


def _safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    if num != num:
        return None
    return num


def _expiration_to_yyyymmdd(expiration: str) -> str:
    raw = expiration.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        return raw.replace("-", "")
    if re.fullmatch(r"\d{8}", raw):
        return raw
    raise ValueError(f"Invalid expiration format: {expiration}")


def _expiration_from_yyyymmdd(raw: str) -> str:
    if len(raw) == 8 and raw.isdigit():
        return f"{raw[0:4]}-{raw[4:6]}-{raw[6:8]}"
    return raw


def _build_occ_symbol(
    underlying: str, expiration_yyyymmdd: str, right: str, strike: float
) -> str:
    yymmdd = expiration_yyyymmdd[2:]
    strike_part = str(int(round(strike * 1000))).zfill(8)
    return f"{underlying}{yymmdd}{right}{strike_part}"


def _get_ib() -> IB:
    global _ib, _last_connect_error
    with _lock:
        if _ib is not None and _ib.isConnected():
            return _ib
        if _ib is not None:
            try:
                _ib.disconnect()
            except Exception:  # noqa: BLE001
                pass
            _ib = None
        last_exc: Exception | None = None
        for offset in range(4):
            client_id = TWS_CLIENT_ID + offset
            ib = IB()
            try:
                ib.connect(
                    TWS_HOST,
                    TWS_PORT,
                    clientId=client_id,
                    readonly=TWS_READONLY,
                    timeout=4,
                )
                _ib = ib
                _last_connect_error = None
                return ib
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                _last_connect_error = str(exc)
                try:
                    ib.disconnect()
                except Exception:  # noqa: BLE001
                    pass
        if last_exc is not None:
            raise last_exc
        raise RuntimeError("Unable to connect to IB Gateway")


def _status_payload() -> dict[str, Any]:
    connected = _ib is not None and _ib.isConnected()
    warnings: list[str] = []
    if not connected:
        if _last_connect_error:
            warnings.append(_last_connect_error)
        else:
            warnings.append(
                f"Not connected to IB Gateway at {TWS_HOST}:{TWS_PORT}. "
                "Enable API access and log in to paper Gateway."
            )
    return {
        "configured": True,
        "sidecarReachable": True,
        "gatewayConnected": connected,
        "host": TWS_HOST,
        "port": TWS_PORT,
        "clientId": TWS_CLIENT_ID,
        "readOnly": TWS_READONLY,
        "message": _last_connect_error,
        "warnings": warnings,
    }


def _resolve_stock(symbol: str):
    sym = symbol.strip().upper()
    cached = _contract_cache.get(sym)
    if cached is not None:
        return cached
    ib = _get_ib()
    contract = Stock(sym, "SMART", "USD")
    qualified = ib.qualifyContracts(contract)
    if not qualified:
        raise HTTPException(status_code=404, detail=f"Could not resolve stock {sym}")
    resolved = qualified[0]
    _contract_cache[sym] = resolved
    return resolved


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
        "o": _safe_float(bar.open),
        "h": _safe_float(bar.high),
        "l": _safe_float(bar.low),
        "c": _safe_float(bar.close),
        "v": _safe_float(bar.volume),
    }


def _map_ticker_quote(symbol: str, ticker) -> dict[str, Any]:
    last = _safe_float(getattr(ticker, "last", None))
    bid = _safe_float(getattr(ticker, "bid", None))
    ask = _safe_float(getattr(ticker, "ask", None))
    close = _safe_float(getattr(ticker, "close", None))
    price = last if last is not None else close
    change = _safe_float(getattr(ticker, "change", None)) or (
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
        "volume": _safe_float(getattr(ticker, "volume", None)),
        "updatedAt": _now_ms(),
    }


def _map_option_contract(
    underlying: str,
    expiration: str,
    contract,
    ticker,
) -> dict[str, Any] | None:
    strike = _safe_float(getattr(contract, "strike", None))
    right = getattr(contract, "right", None)
    if strike is None or strike <= 0 or right not in ("C", "P"):
        return None
    opt_type = "call" if right == "C" else "put"
    maturity = getattr(contract, "lastTradeDateOrContractMonth", "") or ""
    maturity_yyyymmdd = maturity if len(maturity) == 8 else _expiration_to_yyyymmdd(expiration)
    bid = _safe_float(ticker.bid)
    ask = _safe_float(ticker.ask)
    last = _safe_float(ticker.last)
    mark = (bid + ask) / 2 if bid is not None and ask is not None else last
    greeks = getattr(ticker, "modelGreeks", None)
    return {
        "contractSymbol": _build_occ_symbol(underlying, maturity_yyyymmdd, right, strike),
        "underlying": underlying,
        "type": opt_type,
        "expiration": _expiration_from_yyyymmdd(maturity_yyyymmdd),
        "strike": strike,
        "bid": bid,
        "ask": ask,
        "last": last,
        "mark": mark,
        "volume": _safe_float(ticker.volume),
        "openInterest": _safe_float(getattr(ticker, "openInterest", None)),
        "impliedVolatility": _safe_float(getattr(greeks, "impliedVol", None) if greeks else None),
        "delta": _safe_float(getattr(greeks, "delta", None) if greeks else None),
        "gamma": _safe_float(getattr(greeks, "gamma", None) if greeks else None),
        "theta": _safe_float(getattr(greeks, "theta", None) if greeks else None),
        "vega": _safe_float(getattr(greeks, "vega", None) if greeks else None),
        "updatedAt": _now_ms(),
    }


def _ticker_has_data(ticker) -> bool:
    if getattr(ticker, "modelGreeks", None) is not None:
        return True
    for field in ("bid", "ask", "last", "close"):
        val = _safe_float(getattr(ticker, field, None))
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
        )
        if bars:
            return _safe_float(bars[-1].close)
    except Exception:  # noqa: BLE001
        pass
    ticker = ib.reqMktData(stock, "", False, False)
    ib.sleep(0.35)
    spot = _safe_float(ticker.last) or _safe_float(ticker.close)
    ib.cancelMktData(stock)
    return spot


def _fetch_option_chain(
    sym: str,
    expiration: str,
    expiration_yyyymmdd: str,
    strike_window: dict[str, Any] | None,
) -> dict[str, Any]:
    warnings: list[str] = []
    stock = _resolve_stock(sym)
    ib = _get_ib()
    chains = ib.reqSecDefOptParams(stock.symbol, "", stock.secType, stock.conId)
    strikes: set[float] = set()
    trading_class = None
    exchange = "SMART"
    for chain in chains or []:
        if expiration_yyyymmdd in (chain.expirations or []):
            trading_class = chain.tradingClass or trading_class
            exchange = chain.exchange or exchange
            for strike in chain.strikes or []:
                val = _safe_float(strike)
                if val is not None and val > 0:
                    strikes.add(val)
    if not strikes:
        return {
            "chain": {"underlying": sym, "expiration": expiration, "contracts": []},
            "warnings": ["TWS returned no strikes for expiration"],
        }

    spot = _spot_from_stock(ib, stock)
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


def _ensure_quote_subscriptions(ib: IB, symbols: list[str]) -> None:
    with _quote_sub_lock:
        for sym in symbols:
            if sym in _quote_subscriptions:
                continue
            try:
                resolved = _resolve_stock(sym)
                ticker = ib.reqMktData(resolved, "", False, False)
                _quote_subscriptions[sym] = ticker
            except Exception:  # noqa: BLE001
                continue


def _read_cached_quotes(symbols: list[str]) -> dict[str, Any]:
    quotes_out: list[dict[str, Any]] = []
    missing: list[str] = []
    with _quote_sub_lock:
        for sym in symbols:
            ticker = _quote_subscriptions.get(sym)
            if ticker is None:
                missing.append(sym)
                continue
            quotes_out.append(_map_ticker_quote(sym, ticker))
    return {"quotes": quotes_out, "missingSymbols": missing}


def _fetch_quotes(symbols: list[str]) -> dict[str, Any]:
    ib = _get_ib()
    _ensure_quote_subscriptions(ib, symbols)
    payload = _read_cached_quotes(symbols)
    if payload["missingSymbols"]:
        _ensure_quote_subscriptions(ib, payload["missingSymbols"])
        payload = _read_cached_quotes(symbols)
    return payload


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "timestamp": _now_ms()}


@app.get("/status")
def status() -> dict[str, Any]:
    return _status_payload()


@app.post("/warmup")
def warmup(body: WarmupRequest) -> dict[str, Any]:
    symbols = sorted({s.strip().upper() for s in body.symbols if s.strip()})

    def work():
        warmed: list[str] = []
        subscribed: list[str] = []
        try:
            ib = _get_ib()
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
                    _ensure_quote_subscriptions(ib, symbols)
                    subscribed = [sym for sym in symbols if sym in _quote_subscriptions]
                except Exception:  # noqa: BLE001
                    subscribed = []
            return {
                "warmed": warmed,
                "subscribed": subscribed,
                "timestamp": _now_ms(),
            }
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, PRIORITY_HIGH)


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


@app.get("/candles")
def candles(
    symbol: str = Query(min_length=1),
    interval: str = Query(default="1d"),
    range: str = Query(default="1mo", alias="range"),
    before: int | None = None,
    barCount: int | None = None,
) -> dict[str, Any]:
    def work():
        sym = symbol.strip().upper()
        bar_size = INTERVAL_TO_BAR.get(interval, "1 day")
        duration = RANGE_TO_DURATION.get(range, "1 M")
        if before is not None and barCount is not None:
            duration = f"{max(barCount, 1)} D"
        try:
            resolved = _resolve_stock(sym)
            ib = _get_ib()
            end_dt = ""
            if before is not None:
                end_dt = datetime.fromtimestamp(before / 1000, tz=timezone.utc).strftime(
                    "%Y%m%d %H:%M:%S UTC"
                )
            bars = ib.reqHistoricalData(
                resolved,
                endDateTime=end_dt,
                durationStr=duration,
                barSizeSetting=bar_size,
                whatToShow="TRADES",
                useRTH=True,
                formatDate=1,
            )
            mapped = [_map_bar(bar) for bar in bars if _map_bar(bar)["c"] is not None]
            return {
                "symbol": sym,
                "interval": interval,
                "candles": mapped,
                "hasMore": len(mapped) > 0,
            }
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work)


@app.post("/quotes")
def quotes(body: QuotesRequest) -> dict[str, Any]:
    symbols = sorted({s.strip().upper() for s in body.symbols if s.strip()})

    def work():
        try:
            return _fetch_quotes(symbols)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, PRIORITY_QUOTES)


@app.get("/options/expirations")
def option_expirations(underlying: str = Query(min_length=1)) -> dict[str, Any]:
    def work():
        sym = underlying.strip().upper()
        warnings: list[str] = []
        try:
            stock = _resolve_stock(sym)
            ib = _get_ib()
            chains = ib.reqSecDefOptParams(stock.symbol, "", stock.secType, stock.conId)
            expirations: set[str] = set()
            for chain in chains or []:
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

    return run_on_ib_thread(work, PRIORITY_OPTIONS)


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

    return run_on_ib_thread(work, PRIORITY_OPTIONS)


@app.get("/stream/quotes")
def stream_quotes(symbols: str = Query(min_length=1)) -> StreamingResponse:
    symbol_list = sorted({s.strip().upper() for s in symbols.split(",") if s.strip()})
    if not symbol_list:
        raise HTTPException(status_code=400, detail="No symbols provided")

    def event_generator():
        primed = False
        while True:
            try:
                payload = run_on_ib_thread(
                    lambda: _fetch_quotes(symbol_list),
                    PRIORITY_QUOTES,
                )
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
                                "asOf": _now_ms(),
                                "streaming": True,
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=SIDECAR_PORT, log_level="info")
