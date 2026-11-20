"""Tests for the Players > Pace calculations (no S3: small fake tables)."""
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import app
from routes import players as players_route
from routes.players import player_pace


@pytest.fixture
def tables():
    players = pd.DataFrame({
        "pff_player_id": [1, 2, 3],
        "name": ["A", "B", "C"],
        "peers": ["Midfielders"] * 3,
        "matches": [5, 5, 5],
        "minutes": [450.0, 450.0, 450.0],
        "act_n": [60, 80, 10],
        "act_fast": [12, 40, 1],
        "pace_share": [0.2, 0.5, 0.1],
        "in_pool": [True, True, True],
        "percentile": [25.0, 75.0, np.nan],
        "ranked": [True, True, False],
    })
    speeds = [2.0, 7.0, 12.0, 16.0, 22.0, 27.0, 35.0, np.nan]
    actions = pd.DataFrame({
        "pff_player_id": [1] * 8,
        "match": ["X v Y"] * 4 + ["Z v Y"] * 4, "date": ["2022-12-18"] * 4 + ["2022-12-19"] * 4, "clock": ["10:00"] * 8,
        "action": ["pass"] * 6 + ["first touch"] * 2, "success": [True] * 8,
        "x": [0.0] * 8, "y": [0.0] * 8,
        "speed_kmh": speeds,
        "usable": [True] * 7 + [False],
    })
    return players, actions


def test_histogram_counts_only_usable_actions_and_marks_fast_bins(tables):
    players, actions = tables
    out = player_pace(players, actions, 1)
    assert out["actions_total"] == 8
    assert out["actions_usable"] == 7
    assert out["actions_unknown_speed"] == 1
    assert sum(b["count"] for b in out["speed_bins"]) == 7
    fast = sum(b["count"] for b in out["speed_bins"] if b["fast"])
    assert fast == 4  # 16, 22, 27, 35 km/h


def test_peer_group_uses_only_ranked_sized_pool(tables):
    players, actions = tables
    out = player_pace(players, actions, 1)
    # player 3 has only 10 actions, below the 50 needed to be ranked, so is not in the peer strip
    assert out["peer_group"]["size"] == 2
    assert out["peer_group"]["shares"] == [0.2, 0.5]


def test_unranked_player_has_no_percentile(tables):
    players, actions = tables
    out = player_pace(players, actions, 3)
    assert out["player"]["percentile"] is None
    assert out["player"]["ranked"] is False


def test_unknown_player_raises(tables):
    players, actions = tables
    with pytest.raises(KeyError):
        player_pace(players, actions, 999)


def test_route_returns_404_for_unknown_player(tables, monkeypatch):
    players, actions = tables
    monkeypatch.setattr(players_route, "load_pace_players", lambda: players)
    monkeypatch.setattr(players_route, "load_all_actions", lambda: actions)
    r = TestClient(app).get("/api/players/999/pace")
    assert r.status_code == 404


def test_route_returns_valid_json_with_missing_values(tables, monkeypatch):
    players, actions = tables
    monkeypatch.setattr(players_route, "load_pace_players", lambda: players)
    monkeypatch.setattr(players_route, "load_all_actions", lambda: actions)
    r = TestClient(app).get("/api/players/1/pace")
    assert r.status_code == 200
    assert r.json()["player"]["name"] == "A"


def test_card_route_rejects_unsafe_names():
    r = TestClient(app).get("/api/players/card/..%2Fsecrets")
    assert r.status_code in (400, 404)
    r = TestClient(app).get("/api/players/card/Enzo-Fernandez")
    assert r.status_code == 400


def test_card_route_returns_the_card(monkeypatch):
    monkeypatch.setattr(players_route, "load_card", lambda slug: {"name": "Test Player", "sections": []})
    r = TestClient(app).get("/api/players/card/test_player")
    assert r.status_code == 200
    assert r.json()["name"] == "Test Player"


def test_rank_detail_explains_the_percentile(tables):
    players, actions = tables
    out = player_pace(players, actions, 1)
    # ranked pool is players 1 and 2 (shares 0.2 and 0.5); player 1 has one below-him count of 0
    assert out["peer_group"]["below"] == 0
    assert out["peer_group"]["equal"] == 1
    out2 = player_pace(players, actions, 2)
    assert out2["peer_group"]["below"] == 1


def test_by_action_and_by_match_add_up(tables):
    players, actions = tables
    out = player_pace(players, actions, 1)
    assert sum(a["n"] for a in out["by_action"]) == out["actions_usable"]
    assert abs(sum(a["mix"] for a in out["by_action"]) - 1) < 1e-9
    assert sum(m["n"] for m in out["by_match"]) == out["actions_usable"]
    assert sum(m["fast"] for m in out["by_match"]) == sum(b["count"] for b in out["speed_bins"] if b["fast"])
