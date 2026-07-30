#!/usr/bin/env python3
"""Execute a bounded research cell against a read-only dataset mount."""

from __future__ import annotations

import builtins
import json
import os
import sys
import traceback
from pathlib import Path
from typing import Any

MAX_STDOUT_CHARS = 8_192
MAX_METRIC_KEYS = 24
MAX_PREVIEW_ROWS = 20
MAX_PREVIEW_COLS = 12

ALLOWED_ROOTS = frozenset({
    "polars",
    "duckdb",
    "numpy",
    "scipy",
    "math",
    "statistics",
    "pathlib",
    "glob",
    "time",
})


class ResearchContext:
    def __init__(self) -> None:
        self.key_metrics: dict[str, str | int | float] = {}
        self.preview_table: dict[str, Any] | None = None
        self.warnings: list[str] = []

    def set_metrics(self, metrics: dict[str, Any]) -> None:
        if len(metrics) > MAX_METRIC_KEYS:
            raise ValueError(f"Too many metrics (max {MAX_METRIC_KEYS})")
        normalized: dict[str, str | int | float] = {}
        for key, value in metrics.items():
            if not isinstance(key, str) or not key.strip():
                raise ValueError("Metric keys must be non-empty strings")
            if isinstance(value, bool) or value is None:
                normalized[key] = str(value)
            elif isinstance(value, (int, float, str)):
                normalized[key] = value
            else:
                normalized[key] = str(value)
        self.key_metrics = normalized

    def set_preview(self, columns: list[str], rows: list[list[Any]]) -> None:
        if len(columns) < 1 or len(columns) > MAX_PREVIEW_COLS:
            raise ValueError(f"Preview columns must be 1..{MAX_PREVIEW_COLS}")
        if len(rows) > MAX_PREVIEW_ROWS:
            raise ValueError(f"Preview rows exceed max {MAX_PREVIEW_ROWS}")
        safe_rows: list[list[str | int | float | None]] = []
        for row in rows:
            safe_row: list[str | int | float | None] = []
            for cell in row:
                if cell is None or isinstance(cell, (str, int, float)):
                    safe_row.append(cell)
                else:
                    safe_row.append(str(cell))
            safe_rows.append(safe_row)
        self.preview_table = {"columns": columns, "rows": safe_rows}

    def warn(self, message: str) -> None:
        trimmed = message.strip()
        if trimmed:
            self.warnings.append(trimmed[:500])


def _blocked_open(path: str | os.PathLike[str], *args: Any, **kwargs: Any) -> Any:
    mode = args[0] if args else kwargs.get("mode", "r")
    if isinstance(mode, str) and any(flag in mode for flag in ("w", "a", "+", "x")):
        resolved = Path(path).resolve()
        out_root = Path(os.environ.get("RESEARCH_OUT_DIR", "/out")).resolve()
        if out_root not in resolved.parents and resolved != out_root:
            raise PermissionError("Write outside /out is blocked")
    return builtins.open(path, *args, **kwargs)


def _restricted_import(
    name: str,
    globals: dict[str, Any] | None = None,
    locals: dict[str, Any] | None = None,
    fromlist: tuple[str, ...] = (),
    level: int = 0,
) -> Any:
    root = name.split(".", 1)[0]
    if root not in ALLOWED_ROOTS:
        raise ImportError(f"Import blocked: {name}")
    return builtins.__import__(name, globals, locals, fromlist, level)


def _load_cell_source() -> str:
    cell_path = Path(os.environ.get("RESEARCH_CELL_PATH", "/work/cell.py"))
    source = cell_path.read_text(encoding="utf-8")
    max_bytes = int(os.environ.get("RESEARCH_MAX_SOURCE_BYTES", "32768"))
    encoded = source.encode("utf-8")
    if len(encoded) > max_bytes:
        raise ValueError(f"Cell source exceeds max bytes ({max_bytes})")
    return source


def _write_result(payload: dict[str, Any]) -> None:
    out_dir = Path(os.environ.get("RESEARCH_OUT_DIR", "/out"))
    out_dir.mkdir(parents=True, exist_ok=True)
    result_path = out_dir / "result.json"
    serialized = json.dumps(payload, separators=(",", ":"))
    max_bytes = int(os.environ.get("RESEARCH_MAX_OUTPUT_BYTES", "256000"))
    if len(serialized.encode("utf-8")) > max_bytes:
        raise ValueError(f"Result envelope exceeds max bytes ({max_bytes})")
    result_path.write_text(serialized, encoding="utf-8")


def main() -> int:
    ctx = ResearchContext()
    dataset_root = Path(os.environ.get("RESEARCH_DATASET_ROOT", "/dataset"))
    stdout_capture: list[str] = []

    class _Stdout:
        def write(self, text: str) -> int:
            if text:
                stdout_capture.append(text)
            return len(text)

        def flush(self) -> None:
            return None

    namespace: dict[str, Any] = {
        "__builtins__": {
            "__import__": _restricted_import,
            "print": print,
            "len": len,
            "range": range,
            "min": min,
            "max": max,
            "sum": sum,
            "abs": abs,
            "round": round,
            "sorted": sorted,
            "enumerate": enumerate,
            "zip": zip,
            "list": list,
            "dict": dict,
            "set": set,
            "tuple": tuple,
            "str": str,
            "int": int,
            "float": float,
            "bool": bool,
            "open": _blocked_open,
        },
        "research": ctx,
        "DATASET_ROOT": str(dataset_root),
    }

    try:
        source = _load_cell_source()
        old_stdout = sys.stdout
        sys.stdout = _Stdout()
        try:
            exec(compile(source, "<cell>", "exec"), namespace, namespace)
        finally:
            sys.stdout = old_stdout

        stdout = "".join(stdout_capture)
        if len(stdout) > MAX_STDOUT_CHARS:
            stdout = stdout[:MAX_STDOUT_CHARS] + "…"

        payload = {
            "status": "succeeded",
            "stdout": stdout,
            "keyMetrics": ctx.key_metrics,
            "warnings": ctx.warnings,
        }
        if ctx.preview_table is not None:
            payload["previewTable"] = ctx.preview_table
        _write_result(payload)
        return 0
    except Exception as exc:  # noqa: BLE001
        stdout = "".join(stdout_capture)
        if len(stdout) > MAX_STDOUT_CHARS:
            stdout = stdout[:MAX_STDOUT_CHARS] + "…"
        payload = {
            "status": "failed",
            "stdout": stdout,
            "keyMetrics": ctx.key_metrics,
            "warnings": ctx.warnings,
            "error": str(exc),
            "traceback": traceback.format_exc()[-4000:],
        }
        _write_result(payload)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
