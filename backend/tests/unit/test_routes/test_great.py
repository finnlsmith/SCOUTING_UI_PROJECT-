"""Tests for the Players > Great actions calculations (small fake tables, no S3)."""
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import app
from routes import great as G
from routes.great import player_great


def _tables():
    row = lambda action, total, speed, space, time: {
        "action": action,
        "me": {"total": total, "speed": speed, "space": space, "time": time},
        "ref": {"total": 100, "speed": [30, 40, 30], "space": [50, 30, 20], "time": [40, 30, 10, 20]}}
    return {"1": [row("goals", 1, [1, 0, 0], [1, 0, 0], [1, 0, 0, 0]),
                  row("key passes", 7, [2, 0, 5], [3, 2, 2], [3, 2, 1, 1])]}


def _events():
    return pd.DataFrame([
        dict(pff_player_id=1, match="A v B", clock="10:00", kind="shot", goal=True, assist=False, xg=0.06, high_xg=False, speed_kmh=8.0, nearest_m=0.7, time_on_ball=0.8),
        dict(pff_player_id=1, match="A v B", clock="05:00", kind="key pass", goal=False, assist=True, xg=np.nan, high_xg=False, speed_kmh=np.nan, nearest_m=np.nan, time_on_ball=np.nan),
        dict(pff_player_id=2, match="A v B", clock="01:00", kind="shot", goal=False, assist=False, xg=0.2, high_xg=True, speed_kmh=3.0, nearest_m=5.0, time_on_ball=2.0),
    ])


def test_splits_use_known_readings_only():
    out = player_great(_events(), _tables(), 1)
    kp = {s["split"]: s for s in out["splits"] if s["action"] == "key passes"}
    assert kp["speed"]["k"] == 0 and kp["speed"]["known"] == 2 and kp["speed"]["unknown"] == 5
    assert kp["space"]["k"] == 3 and kp["space"]["known"] == 5 and abs(kp["space"]["share"] - 0.6) < 1e-9
    assert kp["time"]["known"] == 6 and kp["time"]["unknown"] == 1
    assert abs(kp["speed"]["ref_share"] - 40 / 70) < 1e-9
    assert kp["space"]["range"][0] <= kp["space"]["share"] <= kp["space"]["range"][1]


def test_events_are_his_and_tagged():
    out = player_great(_events(), _tables(), 1)
    assert len(out["events"]) == 2
    assert out["events"][0]["clock"] == "05:00" and out["events"][0]["tags"] == "assist"
    assert out["events"][1]["tags"] == "goal"


def test_unknown_player_and_route(monkeypatch):
    with pytest.raises(KeyError):
        player_great(_events(), _tables(), 99)
    monkeypatch.setattr(G, "load_great_events", _events)
    monkeypatch.setattr(G, "load_great_tables", _tables)
    c = TestClient(app)
    assert c.get("/api/players/99/great").status_code == 404
    assert c.get("/api/players/1/great").status_code == 200
