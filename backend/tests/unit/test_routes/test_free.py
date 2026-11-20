"""Tests for the Players > Free space calculations (small fake tables, no S3)."""
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import app
from routes import free as Fm
from routes.free import player_free


def _players():
    rows = []
    for pid, (touches, free, team_on, team) in enumerate([(200, 100, 2000.0, "X"), (240, 80, 2400.0, "X"), (300, 90, 3000.0, "Y")], start=1):
        rows.append(dict(pff_player_id=pid, name=f"P{pid}", peers="Midfielders", matches=5, minutes=450.0, touches=touches, free_receptions=free,
                         free_known=touches, free_decisions=40, free_prog=10, free_lost=4, team_on=team_on, chances_free=2, team=team, in_pool=True))
    return pd.DataFrame(rows)


def _touches():
    recs = []
    for pid, team, n, free_every in ((1, "X", 60, 2), (2, "X", 60, 3), (3, "Y", 60, 4)):
        for i in range(n):
            free = i % free_every == 0
            recs.append(dict(pff_player_id=pid, game_id=1, team=team, x_att=-30 + (i % 6) * 12.0, y_att=0.0, nearest_opp_m=9.0 if free else 2.0,
                             outcome=["positive", "neutral", "negative", "other"][i % 4], last_kind="SH" if i % 15 == 0 else "PA", key_pass=bool(i % 20 == 0),
                             completed=pd.NA, chance=bool(i % 10 == 0), match="A v B"))
    df = pd.DataFrame(recs)
    df["completed"] = df.completed.astype("boolean")
    return df


def test_per100_is_involvement_times_share():
    v = player_free(_touches(), _players(), 1)["volume"]
    assert abs(v["involve"] * v["share"] - v["per100"]) < 1e-9
    assert v["touches"] == 200 and v["free"] == 100


def test_zone_groups_and_swap():
    z = player_free(_touches(), _players(), 1)["zone"]
    assert [g["group"] for g in z["groups"]] == ["Own third", "Middle third", "Final third"]
    assert abs(sum(g["mix"] for g in z["groups"]) - 1) < 1e-9
    assert 0 <= z["his_rates_peer_mix"] <= 1


def test_team_block_and_outcomes():
    out = player_free(_touches(), _players(), 1)
    assert out["team"]["team"] == "X" and out["team"]["teams"] == 2
    assert [m["name"] for m in out["team"]["midfielders"]][0] in ("P1", "P2")
    assert abs(sum(o["rate"] for o in out["outcomes"]) - 1) < 1e-9
    assert set(out["tests"]) == {"zone", "space"} and "zone" in out["tables"]


def test_chances_and_examples():
    out = player_free(_touches(), _players(), 1)
    assert len(out["chances"]) >= 1 and all(c["space_m"] >= 6 for c in out["chances"])
    assert len(out["examples"]) == 8 and out["example_match"] == "A v B"


def test_unknown_player_and_route(monkeypatch):
    with pytest.raises(KeyError):
        player_free(_touches(), _players(), 99)
    monkeypatch.setattr(Fm, "load_free_touches", _touches)
    monkeypatch.setattr(Fm, "load_free_players", _players)
    c = TestClient(app)
    assert c.get("/api/players/99/free").status_code == 404
    assert c.get("/api/players/1/free").status_code == 200
