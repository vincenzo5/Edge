"""Regression tests for TWS sidecar account cache helpers."""

from __future__ import annotations

import importlib
import sys
import unittest
from pathlib import Path

SIDECAR_DIR = Path(__file__).resolve().parent
if str(SIDECAR_DIR) not in sys.path:
    sys.path.insert(0, str(SIDECAR_DIR))

main = importlib.import_module("main")


class AccountCacheTests(unittest.TestCase):
    def setUp(self) -> None:
        with main._account_lock:
            main._account_positions_raw.clear()
            main._account_portfolio.clear()
            main._account_executions.clear()

    def test_executions_cache_is_list(self) -> None:
        self.assertIsInstance(main._account_executions, list)

    def test_merge_positions_prefers_portfolio_market_data(self) -> None:
        key = 12345
        with main._account_lock:
            main._account_positions_raw[key] = {
                "account": "U123",
                "contract": {"symbol": "HOOD", "conId": key},
                "position": 700.0,
                "avgCost": 103.10,
                "updatedAt": 1,
            }
            main._account_portfolio[key] = {
                "account": "U123",
                "contract": {"symbol": "HOOD", "conId": key},
                "position": 700.0,
                "averageCost": 103.10,
                "marketPrice": 108.02,
                "marketValue": 75614.0,
                "unrealizedPNL": 3441.0,
                "updatedAt": 2,
            }

        rows = main._merge_positions()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["contract"]["symbol"], "HOOD")
        self.assertEqual(rows[0]["marketPrice"], 108.02)
        self.assertEqual(rows[0]["unrealizedPNL"], 3441.0)

    def test_merge_positions_market_price_none_when_portfolio_missing(self) -> None:
        key = 67890
        with main._account_lock:
            main._account_positions_raw[key] = {
                "account": "U123",
                "contract": {"symbol": "HOOD", "conId": key},
                "position": 700.0,
                "avgCost": 103.10,
                "updatedAt": 1,
            }

        rows = main._merge_positions()
        self.assertEqual(len(rows), 1)
        self.assertIsNone(rows[0]["marketPrice"])
        self.assertIsNone(rows[0]["unrealizedPNL"])


if __name__ == "__main__":
    unittest.main()
