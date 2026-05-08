"""Regression test for the .O -> .P ts_id selection bug.

Confirms find_rainfall_ts_id picks the .P (pluviometer / automatic) timeseries
when MHL returns both .O (manual observer) and .P variants for the same
station, and continues to pick a valid .P-only result when only .P is offered.

Run: py -m unittest tests.test_tsid_suffix_priority
or:  py -m unittest discover -s tests
"""
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

# Ensure the parent dir (where build_station_cache.py lives) is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import build_station_cache as bsc  # noqa: E402


def _mhl_response(rows):
    """Build a fake MHL KiWIS getTimeseriesList response.

    rows = [{ts_id, ts_name, ts_shortname, parametertype_name}, ...]
    KiWIS returns header + rows, so the first list is column names.
    """
    headers = ["ts_id", "ts_name", "ts_shortname", "parametertype_name"]
    body = [headers]
    for r in rows:
        body.append([r.get(h, "") for h in headers])
    resp = MagicMock()
    resp.json.return_value = body
    resp.raise_for_status.return_value = None
    return resp


class FindRainfallTsIdSuffixPriorityTests(unittest.TestCase):
    @patch.object(bsc, "requests")
    def test_prefers_P_when_O_and_P_both_5min(self, mock_requests):
        """Two 5-minute rainfall timeseries; one .P, one .O. .P must win."""
        mock_requests.get.return_value = _mhl_response([
            {"ts_id": "1001", "ts_name": "5min Rainfall.O",
             "ts_shortname": "5MIN.O", "parametertype_name": "Precipitation"},
            {"ts_id": "1002", "ts_name": "5min Rainfall.P",
             "ts_shortname": "5MIN.P", "parametertype_name": "Precipitation"},
        ])
        ts_id, ts_name = bsc.find_rainfall_ts_id("STATION-1")
        self.assertEqual(ts_id, "1002", "Expected .P (1002) to win the tiebreaker over .O (1001)")
        self.assertIn(".P", ts_name)

    @patch.object(bsc, "requests")
    def test_returns_P_when_only_P_offered(self, mock_requests):
        """Only a .P timeseries — the function must still return it."""
        mock_requests.get.return_value = _mhl_response([
            {"ts_id": "2001", "ts_name": "5min Rainfall.P",
             "ts_shortname": "5MIN.P", "parametertype_name": "Precipitation"},
        ])
        ts_id, ts_name = bsc.find_rainfall_ts_id("STATION-2")
        self.assertEqual(ts_id, "2001")
        self.assertIn(".P", ts_name)

    @patch.object(bsc, "requests")
    def test_returns_O_only_if_no_P_available(self, mock_requests):
        """If MHL only offers .O, take it. The fix de-prioritises .O within a
        class but does not exclude it from the candidate set."""
        mock_requests.get.return_value = _mhl_response([
            {"ts_id": "3001", "ts_name": "5min Rainfall.O",
             "ts_shortname": "5MIN.O", "parametertype_name": "Precipitation"},
        ])
        ts_id, ts_name = bsc.find_rainfall_ts_id("STATION-3")
        self.assertEqual(ts_id, "3001")
        self.assertIn(".O", ts_name)

    @patch.object(bsc, "requests")
    def test_class_dominates_over_suffix(self, mock_requests):
        """A 5-min .O entry must still beat an hourly .P entry — priority
        class is the dominant ordering, suffix is only a tiebreaker."""
        mock_requests.get.return_value = _mhl_response([
            {"ts_id": "4001", "ts_name": "5min Rainfall.O",
             "ts_shortname": "5MIN.O", "parametertype_name": "Precipitation"},
            {"ts_id": "4002", "ts_name": "Hourly Rainfall.P",
             "ts_shortname": "HOUR.P", "parametertype_name": "Precipitation"},
        ])
        ts_id, _ = bsc.find_rainfall_ts_id("STATION-4")
        self.assertEqual(ts_id, "4001",
                         "Expected 5-min .O (priority 0 + suffix 9 = 9) to beat hourly .P (priority 3 + suffix 0 = 300)")

    @patch.object(bsc, "requests")
    def test_returns_None_when_no_rainfall_timeseries(self, mock_requests):
        """No rainfall keyword in any row -> None, None."""
        mock_requests.get.return_value = _mhl_response([
            {"ts_id": "5001", "ts_name": "5min Tide",
             "ts_shortname": "5MIN.P", "parametertype_name": "Water Level"},
        ])
        ts_id, ts_name = bsc.find_rainfall_ts_id("STATION-5")
        self.assertIsNone(ts_id)
        self.assertIsNone(ts_name)


if __name__ == "__main__":
    unittest.main()
