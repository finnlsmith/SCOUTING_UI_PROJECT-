"""Tests for the Players > Ball holding calculations (small fake tables, no S3)."""
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import app
from routes import holds as Hm
from routes.holds import player_holds

COST = {"passes": 4, "rows": [{"start": "free", "touches": "1-2", "n": 2, "space_change": -2.0, "progressive": 0.27, "completed": 0.9}]}


def _players():
    return pd.DataFrame([dict(pff_player_id=i, peers="Midfielders", matches=5, minutes=450.0, hold_actions=50, in_pool=True) for i in (1, 2, 3)])


def _holds():
    rows = []
    for pid, long_every in ((1, 2), (2, 5), (3, 4)):
        for i in range(50):
            touches = 5 if i % long_every == 0 else 2
            rows.append(dict(game_id=1, match="A v B", date="2022-11-22", period=1, clock=f"{i // 60:02d}:{i % 60:02d}", pff_player_id=pid,
                             action="pass" if i % 7 else "dribble", touches=float(touches), time_on_ball=1.0 + (i % 4), nearest_m=1.0 + (i % 9),
                             long=touches >= 4 or (1.0 + (i % 4)) >= 3, very=False, long_t=touches >= 4, long_s=(1.0 + (i % 4)) >= 3,
                             idle=False, is_pass=bool(i % 7)))
    return pd.DataFrame(rows)


def test_summary_and_distribution_add_up():
    out = player_holds(_holds(), _players(), COST, 1)
    assert out["summary"]["actions"] == 50 and out["pool_size"] == 3
    assert abs(sum(out["touches"]["player"].values()) - 1) < 1e-9
    assert abs(sum(out["touches"]["peers"].values()) - 1) < 1e-9
    assert set(out["routes"]["player"]) == {"Touches only", "Seconds only", "Both"}


def test_swap_tests_for_space_and_kind():
    out = player_holds(_holds(), _players(), COST, 1)
    assert set(out["tests"]) == {"space", "kind"}
    for t in out["tests"].values():
        assert 0 <= t["his_rates_peer_mix"] <= 1 and 0 <= t["peer_rates_his_mix"] <= 1
    assert {g["group"] for g in out["tables"]["kind"]} == {"Pass", "Other action"}


def test_idle_block_and_examples():
    out = player_holds(_holds(), _players(), COST, 1)
    assert 0 <= out["idle"]["free_share"] <= 1 and out["idle"]["free_actions"] > 0
    assert len(out["examples"]) == 10 and out["example_match"] == "A v B"
    clocks = [e["clock"] for e in out["examples"]]
    assert clocks == sorted(clocks)
    assert out["cost"]["passes"] == 4


def test_unknown_player_and_route(monkeypatch):
    with pytest.raises(KeyError):
        player_holds(_holds(), _players(), COST, 99)
    monkeypatch.setattr(Hm, "load_holds", _holds)
    monkeypatch.setattr(Hm, "load_hold_players", _players)
    monkeypatch.setattr(Hm, "load_hold_cost", lambda: COST)
    c = TestClient(app)
    assert c.get("/api/players/99/holds").status_code == 404
    assert c.get("/api/players/1/holds").status_code == 200
