"""TWS sidecar — historical candles."""

from __future__ import annotations


from typing import Any

from tws_sidecar.util import now_ms, safe_float
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
