"""Tests for the Players > Standard stats calculations (small fake tables, no S3)."""
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import app
from routes import standard as S
from routes.standard import player_standard


def _players():
    return pd.DataFrame([dict(pff_player_id=i, name=f"P{i}", peers="Midfielders", matches=5, minutes=450.0, in_pool=True) for i in (1, 2, 3, 4)])


def _events():
    rows = []
    def ev(pid, kind, goal=False, assist=False, xg=np.nan, high=False):
        rows.append(dict(pff_player_id=pid, match="A v B", clock="10:00", kind=kind, goal=goal, assist=assist, xg=xg, high_xg=high))
    ev(1, "shot", goal=True, xg=0.06)
    ev(1, "shot", xg=0.2, high=True)
    ev(1, "key pass", assist=True)
    for _ in range(4):
        ev(1, "key pass")
    ev(2, "key pass")
    ev(2, "shot", goal=True, xg=0.3, high=True)
    ev(3, "key pass")
    return pd.DataFrame(rows)


def test_counts_distribution_and_percentile():
    out = player_standard(_events(), _players(), 1)
    st = {s["label"]: s for s in out["stats"]}
    assert st["Goals"]["count"] == 1 and st["Assists"]["count"] == 1 and st["Key passes"]["count"] == 5 and st["High-xG shots"]["count"] == 1
    assert sum(b["n"] for b in st["Goals"]["distribution"]) == 4 and st["Goals"]["zero"] == 2
    assert sum(b["n"] for b in st["Key passes"]["distribution"]) == 4
    # P1 and P2 each scored one with equal minutes: level, so (2 zeros below + half of 2 level) / 4
    assert st["Goals"]["percentile"] == 75


def test_what_if_includes_the_actual_count_and_rises():
    st = {s["label"]: s for s in player_standard(_events(), _players(), 1)["stats"]}
    wi = st["Goals"]["what_if"]
    assert [w["count"] for w in wi] == [0, 1, 2, 3]
    assert next(w for w in wi if w["actual"])["percentile"] == st["Goals"]["percentile"]
    assert [w["percentile"] for w in wi] == sorted(w["percentile"] for w in wi)


def test_xg_and_events():
    out = player_standard(_events(), _players(), 1)
    assert out["xg"]["shots"] == 2 and abs(out["xg"]["xg_total"] - 0.26) < 1e-9 and out["xg"]["goals"] == 1
    kinds = [e["kind"] for e in out["events"]]
    assert kinds.count("key pass") == 5 and kinds.count("shot") == 2


def test_unknown_player_and_route(monkeypatch):
    with pytest.raises(KeyError):
        player_standard(_events(), _players(), 99)
    monkeypatch.setattr(S, "load_great_events", _events)
    monkeypatch.setattr(S, "load_free_players", _players)
    c = TestClient(app)
    assert c.get("/api/players/99/standard").status_code == 404
    assert c.get("/api/players/1/standard").status_code == 200
