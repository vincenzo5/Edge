"""Unit tests for TWS sidecar config resolution (bind + dual-host)."""

from __future__ import annotations

import importlib
import os
import sys
import unittest
from unittest import mock
from pathlib import Path

SIDECAR_DIR = Path(__file__).resolve().parent
if str(SIDECAR_DIR) not in sys.path:
    sys.path.insert(0, str(SIDECAR_DIR))


def _reload_config(env: dict[str, str]) -> object:
    """Reload tws_sidecar.config with a controlled env (dotenv disabled)."""
    clean = {k: v for k, v in os.environ.items() if not k.startswith("TWS_")}
    clean.update(env)
    with mock.patch.dict(os.environ, clean, clear=True):
        with mock.patch("dotenv.load_dotenv"):
            import tws_sidecar.config as cfg

            importlib.reload(cfg)
            return cfg


class ConfigResolutionTests(unittest.TestCase):
    def test_default_bind_and_hosts(self) -> None:
        cfg = _reload_config({})
        self.assertEqual(cfg.TWS_SIDECAR_BIND, "127.0.0.1")
        self.assertEqual(cfg.TWS_PAPER_HOST, "127.0.0.1")
        self.assertEqual(cfg.TWS_LIVE_HOST, "127.0.0.1")
        self.assertEqual(cfg.TWS_HOST, "127.0.0.1")
        paper = cfg._CONNECTION_SPECS[cfg.PRIMARY_CONNECTION_ID]
        live = cfg._CONNECTION_SPECS[cfg.IB_LIVE_CONNECTION_ID]
        self.assertEqual(paper["host"], "127.0.0.1")
        self.assertEqual(paper["port"], 4002)
        self.assertEqual(live["host"], "127.0.0.1")
        self.assertEqual(live["port"], 4001)

    def test_legacy_tws_host_applies_to_both_sockets(self) -> None:
        cfg = _reload_config({"TWS_HOST": "10.0.0.5"})
        self.assertEqual(cfg.TWS_PAPER_HOST, "10.0.0.5")
        self.assertEqual(cfg.TWS_LIVE_HOST, "10.0.0.5")
        self.assertEqual(cfg.TWS_HOST, "10.0.0.5")

    def test_compose_dual_host_resolution(self) -> None:
        cfg = _reload_config(
            {
                "TWS_PAPER_HOST": "ib-gateway-paper",
                "TWS_PAPER_PORT": "4004",
                "TWS_LIVE_HOST": "ib-gateway-live",
                "TWS_LIVE_PORT": "4003",
            }
        )
        paper = cfg._CONNECTION_SPECS[cfg.PRIMARY_CONNECTION_ID]
        live = cfg._CONNECTION_SPECS[cfg.IB_LIVE_CONNECTION_ID]
        self.assertEqual(paper["host"], "ib-gateway-paper")
        self.assertEqual(paper["port"], 4004)
        self.assertEqual(live["host"], "ib-gateway-live")
        self.assertEqual(live["port"], 4003)
        self.assertEqual(cfg.TWS_HOST, "ib-gateway-paper")

    def test_container_bind_default_override(self) -> None:
        cfg = _reload_config({"TWS_SIDECAR_BIND": "0.0.0.0"})
        self.assertEqual(cfg.TWS_SIDECAR_BIND, "0.0.0.0")

    def test_per_connection_host_overrides_legacy(self) -> None:
        cfg = _reload_config(
            {
                "TWS_HOST": "legacy-host",
                "TWS_PAPER_HOST": "paper-only",
                "TWS_LIVE_HOST": "live-only",
            }
        )
        paper = cfg._CONNECTION_SPECS[cfg.PRIMARY_CONNECTION_ID]
        live = cfg._CONNECTION_SPECS[cfg.IB_LIVE_CONNECTION_ID]
        self.assertEqual(paper["host"], "paper-only")
        self.assertEqual(live["host"], "live-only")


if __name__ == "__main__":
    unittest.main()
