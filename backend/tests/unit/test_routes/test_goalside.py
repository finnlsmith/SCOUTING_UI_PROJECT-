"""Tests for the Players > Goal-side calculations (small fake tables, no S3)."""
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import app
from routes import goalside as GS
from routes.goalside import player_goalside


def _players():
    rows = []
    for pid, (role, gs_t, gs_r, team) in enumerate([("wide forward", 100, 20, "X"), ("striker", 80, 32, "X"), ("striker", 90, 36, "Y"), ("wide midfielder", 60, 15, "Y")], start=1):
        rows.append(dict(pff_player_id=pid, name=f"P{pid}", peers="Attackers", role=role, position="LW", matches=5, minutes=450.0, team=team, in_pool=True,
                         gs_touches=gs_t, gs_receptions=gs_r, goalside_per90=gs_r / 450 * 90, goalside_share=gs_r / gs_t, goalside_prog_pct=0.2))
    return pd.DataFrame(rows)


def _touches():
    recs = []
    for pid, n, every in ((1, 100, 5), (2, 80, 2), (3, 90, 2), (4, 60, 4)):
        for i in range(n):
            gs = i % every == 0
            recs.append(dict(pff_player_id=pid, game_id=1, game_event_id=i, team="X" if pid < 3 else "Y", x_att=-30 + (i % 6) * 12.0, y_att=0.0,
                             margin_m=2.0 if gs else -3.0, goalside=gs, outcome=["positive", "neutral", "negative", "other"][i % 4], last_kind="PA",
                             n_ahead_of_opp=1, match="A v B"))
    return pd.DataFrame(recs)


EX = [{"label": "goal-side", "margin_m": 3.0}, {"label": "not goal-side", "margin_m": -8.3}]


def test_per90_is_touches_times_share():
    v = player_goalside(_touches(), _players(), EX, 1)["volume"]
    assert abs(v["t90"] * v["share"] - v["per90"]) < 1e-9
    assert v["touches"] == 100 and v["goalside"] == 20 and v["pool_size"] == 4


def test_role_zone_team_and_progress_blocks():
    out = player_goalside(_touches(), _players(), EX, 1)
    assert [g["role"] for g in out["role"]["groups"]] == ["striker", "wide forward", "wide midfielder"] and out["role"]["role"] == "wide forward"
    assert [g["group"] for g in out["zone"]["groups"]] == ["Own third", "Middle third", "Final third"]
    assert out["team"]["team"] == "X" and [a["name"] for a in out["team"]["attackers"]] == ["P2", "P1"]
    assert out["progressive"]["goalside"]["n"] > 0 and out["progressive"]["behind"]["n"] > 0
    assert out["examples"] == EX


def test_unknown_player_and_route(monkeypatch):
    with pytest.raises(KeyError):
        player_goalside(_touches(), _players(), EX, 99)
    monkeypatch.setattr(GS, "load_goalside_touches", _touches)
    monkeypatch.setattr(GS, "load_goalside_players", _players)
    monkeypatch.setattr(GS, "load_goalside_examples", lambda: EX)
    c = TestClient(app)
    assert c.get("/api/players/99/goalside").status_code == 404
    assert c.get("/api/players/1/goalside").status_code == 200
