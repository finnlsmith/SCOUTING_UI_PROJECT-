"""Tests for the Players > Phone booth calculations (small fake tables, no S3)."""
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import app
from routes import booth as B
from routes.booth import player_booth


def _players():
    rows = []
    for pid, (touches, booth, dec) in enumerate([(500, 60, 20), (400, 80, 20), (300, 60, 20)], start=1):
        rows.append(dict(pff_player_id=pid, peers="Midfielders", matches=5, minutes=450.0, touches=touches,
                         booth_receptions=booth, booth_decisions=dec, in_pool=True))
    return pd.DataFrame(rows)


def _touches():
    recs = []
    outcomes = {1: ["negative"] * 10 + ["neutral"] * 8 + ["positive"] * 2,
                2: ["negative"] * 4 + ["neutral"] * 12 + ["positive"] * 4,
                3: ["negative"] * 5 + ["neutral"] * 10 + ["positive"] * 5}
    for pid, outs in outcomes.items():
        for i, o in enumerate(outs):
            recs.append(dict(game_id=1, match="A v B", date="2022-11-22", period=1, pff_player_id=pid,
                             x_att=-10.0 + i * 1.5, y_att=0.0, nearest_opp_m=1.0 + (i % 3), pressure="P" if i % 2 else "N",
                             phase="settled" if i % 3 else "press_break", last_kind="PA", completed=pd.NA, gain_m=3.0, outcome=o))
    df = pd.DataFrame(recs)
    df["completed"] = df.completed.astype("boolean")
    return df


def test_volume_is_touches_times_share():
    out = player_booth(_touches(), _players(), 1)
    v = out["volume"]
    assert abs(v["t90"] * v["share"] - v["b90"]) < 1e-9
    assert v["pool_size"] == 3 and v["share_below"] == 0     # player 1 has the lowest booth share (60/500)


def test_outcome_rates_add_up():
    out = player_booth(_touches(), _players(), 1)
    rates = {o["outcome"]: o["rate"] for o in out["outcomes"]}
    assert abs(sum(rates.values()) - 1) < 1e-9
    assert rates["Lost"] == 0.5


def test_swap_tests_present_for_each_factor():
    out = player_booth(_touches(), _players(), 1)
    assert set(out["tests"]) == {"zone", "closeness", "pressure", "phase"}
    for t in out["tests"].values():
        assert 0 <= t["negative"]["his_rates_peer_mix"] <= 1
    assert set(out["tables"]) == {"zone", "closeness"}


def test_picture_and_examples_are_his_touches():
    out = player_booth(_touches(), _players(), 1)
    assert len(out["touches"]) == 20
    assert out["example_match"] == "A v B" and len(out["examples"]) == 8


def test_unknown_player_and_route(monkeypatch):
    with pytest.raises(KeyError):
        player_booth(_touches(), _players(), 99)
    monkeypatch.setattr(B, "load_booth_touches", _touches)
    monkeypatch.setattr(B, "load_booth_players", _players)
    c = TestClient(app)
    assert c.get("/api/players/99/booth").status_code == 404
    assert c.get("/api/players/1/booth").status_code == 200
