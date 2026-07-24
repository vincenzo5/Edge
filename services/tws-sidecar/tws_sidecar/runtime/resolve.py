"""Resolve runtime values — prefers `main` module when tests patch attributes."""

from __future__ import annotations

import sys
from typing import Any, Callable, TypeVar

T = TypeVar("T")


def runtime_attr(name: str, fallback: Any = None) -> Any:
    main_mod = sys.modules.get("main")
    if main_mod is not None and name in main_mod.__dict__:
        return main_mod.__dict__[name]
    from tws_sidecar.runtime import state as state_mod

    if hasattr(state_mod, name):
        return getattr(state_mod, name)
    from tws_sidecar import config as config_mod

    if hasattr(config_mod, name):
        return getattr(config_mod, name)
    if fallback is not None:
        return fallback
    raise AttributeError(name)


def runtime_callable(name: str, default: Callable[..., T]) -> Callable[..., T]:
    main_mod = sys.modules.get("main")
    if main_mod is not None and name in main_mod.__dict__:
        candidate = main_mod.__dict__[name]
        if callable(candidate):
            return candidate
    return default
