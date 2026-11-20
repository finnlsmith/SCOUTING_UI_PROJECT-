"""Tests for the Players > Time on the ball calculations (small fake tables, no S3)."""
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import app
from routes import timeonball as TB
from routes.timeonball import player_time

EXAMPLES = [{"label": "pressed", "time_on_ball": 0.9}, {"label": "free", "time_on_ball": 3.1}]


def _players():
    return pd.DataFrame([dict(pff_player_id=i, name=f"P{i}", peers="Midfielders", matches=5, minutes=450.0, in_pool=True) for i in (1, 2, 3)])


def _moments():
    rows = []
    for pid, team, free_every in ((1, "X", 2), (2, "X", 4), (3, "Y", 5)):
        for i in range(60):
            rows.append(dict(player_id=pid, game_id=1, team=team, kind="reception" if i % 3 else "action",
                             time_on_ball=3.0 if i % free_every == 0 else 1.0, zone=["own third", "middle third", "final third"][i % 3],
                             match="X v Y"))
    return pd.DataFrame(rows)


def test_summary_and_bands_add_up():
    out = player_time(_moments(), _players(), EXAMPLES, 1)
    s = out["summary"]
    assert s["moments"] == 60 and s["two"] == 30 and abs(s["share"] - 0.5) < 1e-9
    assert abs(sum(out["bands"]["player"].values()) - 1) < 1e-9 and abs(sum(out["bands"]["peers"].values()) - 1) < 1e-9
    assert s["pool_size"] == 3


def test_swap_tests_and_tables():
    out = player_time(_moments(), _players(), EXAMPLES, 1)
    assert set(out["tests"]) == {"kind", "zone"}
    for t in out["tests"].values():
        assert 0 <= t["his_rates_peer_mix"] <= 1 and 0 <= t["peer_rates_his_mix"] <= 1
    assert {g["group"] for g in out["tables"]["zone"]} == {"own third", "middle third", "final third"}


def test_team_block_ranks_and_lists_teammates():
    t = player_time(_moments(), _players(), EXAMPLES, 1)["team"]
    assert t["team"] == "X" and t["teams"] == 2 and t["rank"] == 1
    assert [m["name"] for m in t["midfielders"]] == ["P1", "P2"] and t["midfielders"][0]["me"] is True


def test_unknown_player_and_route(monkeypatch):
    with pytest.raises(KeyError):
        player_time(_moments(), _players(), EXAMPLES, 99)
    monkeypatch.setattr(TB, "load_time_moments", _moments)
    monkeypatch.setattr(TB, "load_time_players", _players)
    monkeypatch.setattr(TB, "load_time_examples", lambda: EXAMPLES)
    c = TestClient(app)
    assert c.get("/api/players/99/time").status_code == 404
    assert c.get("/api/players/1/time").status_code == 200
