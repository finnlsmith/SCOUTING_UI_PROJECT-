"""Tests for the Players > Action volume calculations (small fake tables, no S3)."""
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import app
from routes import volume as V
from routes.volume import player_volume


def _players():
    return pd.DataFrame([dict(pff_player_id=i, peers="Midfielders", matches=5, minutes=450.0, in_pool=True) for i in (1, 2, 3)])


def _attempts():
    rows = []
    for pid, (n_pass, lb_every) in ((1, (60, 3)), (2, (40, 4)), (3, (30, 5))):
        for i in range(n_pass):
            code = None if i % lb_every else ["A", "M", "D", "AM"][i % 4]
            rows.append(dict(pff_player_id=pid, game_id=1, match="A v B", date="2022-11-22", period=1, clock="01:00", action="pass",
                             success=bool(i % 5), goal=False, lines_broken=code, x_att=0.0, y_att=0.0, xg=np.nan))
        for k in range(2):
            rows.append(dict(pff_player_id=pid, game_id=1, match="A v B", date="2022-11-22", period=1, clock=f"0{k}:30", action="shot",
                             success=bool(k), goal=False, lines_broken=None, x_att=30.0, y_att=0.0, xg=0.05 * (k + 1)))
        rows.append(dict(pff_player_id=pid, game_id=1, match="A v B", date="2022-11-22", period=1, clock="05:00", action="cross",
                         success=False, goal=False, lines_broken=None, x_att=40.0, y_att=20.0, xg=np.nan))
    return pd.DataFrame(rows)


def test_line_breaking_per_90_is_passes_times_share():
    p = player_volume(_attempts(), _players(), 1)["passing"]
    assert abs(p["p90"] * p["share"] - p["lb90"]) < 1e-9
    assert p["passes"] == 60 and p["pool_size"] == 3


def test_completion_groups_and_swap_numbers():
    c = player_volume(_attempts(), _players(), 1)["completion"]
    names = {g["group"] for g in c["groups"]}
    assert names <= {"Midfield line", "Attacking line", "Defensive line", "Two or more lines"} and names
    assert abs(sum(g["mix"] for g in c["groups"]) - 1) < 1e-9
    assert 0 <= c["his_rates_peer_mix"] <= 1 and 0 <= c["peer_rates_his_mix"] <= 1


def test_shots_crosses_and_points():
    out = player_volume(_attempts(), _players(), 1)
    a = out["attempts"]
    assert a["shots"] == 2 and a["crosses"] == 1 and abs(a["xg_total"] - 0.15) < 1e-9
    assert [s["xg"] for s in a["shot_list"]] == sorted((s["xg"] for s in a["shot_list"]), reverse=True)
    assert {p["action"] for p in out["points"]} == {"pass", "shot", "cross"}


def test_unknown_player_and_route(monkeypatch):
    with pytest.raises(KeyError):
        player_volume(_attempts(), _players(), 99)
    monkeypatch.setattr(V, "load_attempts", _attempts)
    monkeypatch.setattr(V, "load_volume_players", _players)
    c = TestClient(app)
    assert c.get("/api/players/99/volume").status_code == 404
    assert c.get("/api/players/1/volume").status_code == 200
