"""Tests for the Players > Flip side calculations (small fake tables, no S3)."""
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import app
from routes import flip as F
from routes.flip import player_flip


def _players():
    rows = []
    for pid, (minutes, opp, nrec, nfin) in enumerate([(450.0, 3000.0, 30, 3), (450.0, 4000.0, 40, 10), (450.0, 5000.0, 60, 12)], start=1):
        rows.append(dict(pff_player_id=pid, peers="Midfielders", in_pool=True, minutes=minutes, minutes_flip=minutes, matches=5,
                         opp_touches_on=opp, n_rec=nrec, n_rec_final=nfin, rec_per90=nrec / minutes * 90, rec_per100_opp_touches=nrec / opp * 100,
                         rec_final_third_per90=nfin / minutes * 90))
    return pd.DataFrame(rows)


def _recs():
    rows = []
    for pid, n in ((1, 30), (2, 40), (3, 60)):
        for i in range(n):
            rows.append(dict(game_id=1, pff_player_id=pid, x_att=-30 + (i % 7) * 12.0, y_att=0.0, source="interception" if i % 2 else "pass",
                             speed_kmh=5.0, fast=False, tracked=True, match="A v B"))
    return pd.DataFrame(rows)


def _duels():
    rows = []
    for pid in (1, 2, 3):
        for i in range(12):
            fast = i % 3 == 0
            rows.append(dict(game_id=1, defender=pid, defender_name=f"P{pid}", attacker_name=f"A{i}", sub="DTB"[i % 3],
                             att_spd=18.0 if fast else 5.0, fast=fast, defender_won=bool((i + pid) % 2), p_exp=0.4, match="A v B"))
    return pd.DataFrame(rows)


def test_recoveries_split_into_opportunity_and_rate():
    out = player_flip(_duels(), _recs(), _players(), 1)["recoveries"]
    # per 90 = opponent touches per 90 x recoveries per touch
    assert abs(out["opp90"] * out["per100"] / 100 - out["per90"]) < 1e-9
    assert out["n"] == 30


def test_final_third_is_recoveries_times_share():
    out = player_flip(_duels(), _recs(), _players(), 1)
    f, r = out["final"], out["recoveries"]
    assert abs(sum(out["thirds"]["player"].values()) - 1) < 1e-9
    assert abs(r["per90"] * f["share"] - r["per90"] * out["thirds"]["player"]["Final third"]) < 1e-9


def test_duels_and_fast_duels():
    out = player_flip(_duels(), _recs(), _players(), 1)
    d = out["duel"]
    assert d["n"] == 12 and abs(d["expected_wins"] - 12 * 0.4) < 1e-9
    assert d["fast_n"] == 4 and len(out["fast_duels"]) == 4
    assert [g["challenge"] for g in out["by_challenge"]] == ["Dribble", "Tackle", "Carrier challenge"]
    assert abs(sum(g["mix"] for g in out["by_challenge"]) - 1) < 1e-9


def test_unknown_player_and_route(monkeypatch):
    with pytest.raises(KeyError):
        player_flip(_duels(), _recs(), _players(), 99)
    monkeypatch.setattr(F, "load_flip_duels", _duels)
    monkeypatch.setattr(F, "load_flip_recoveries", _recs)
    monkeypatch.setattr(F, "load_flip_players", _players)
    c = TestClient(app)
    assert c.get("/api/players/99/flip").status_code == 404
    assert c.get("/api/players/1/flip").status_code == 200
