"""Tests for Players > Tempo and technique calculations (small fake tables, no S3)."""
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import app
from routes import technique as T
from routes.technique import player_technique, wilson


def _players():
    rows = []
    for pid, (k_ot, n_rec, fail) in enumerate([(20, 100, 0), (30, 100, 2), (40, 100, 4)], start=1):
        rows.append({
            "pff_player_id": pid, "name": f"P{pid}", "peers": "Midfielders", "matches": 5, "minutes": 450.0, "in_pool": True,
            "one_touch_k": k_ot, "one_touch_n": n_rec, "one_touch_value": k_ot / n_rec,
            "kept_k": n_rec - fail, "kept_n": n_rec, "kept_value": (n_rec - fail) / n_rec,
            "ft_pass_k": 8, "ft_pass_n": 10, "ft_pass_value": 0.8,
            "pass_k": 80, "pass_n": 100, "pass_value": 0.8,
            "pass_fast_k": 9, "pass_fast_n": 10, "pass_fast_value": 0.9,
        })
    df = pd.DataFrame(rows)
    for key, minn in T_ROWS.items():
        df[f"{key}_pct"] = np.nan
        df[f"{key}_below"] = np.nan
        df[f"{key}_equal"] = np.nan
        df[f"{key}_pool"] = 3
    df.loc[0, "one_touch_pct"] = 17.0
    df.loc[0, "one_touch_below"] = 0
    df.loc[0, "one_touch_equal"] = 1
    return df


T_ROWS = {r["key"]: r["min_events"] for r in T.ROWS}


def _receptions():
    n = 12
    return pd.DataFrame({
        "game_id": [1] * n, "match": ["A v B"] * n, "date": ["2022-11-22"] * n, "period": [1] * n,
        "clock": [f"0{i}:00" for i in range(n)],
        "receiver_id": [1] * 4 + [2] * 4 + [3] * 4,
        "passer": ["x"] * n, "touches": [1.0, 2.0, 1.0, 3.0] * 3,
        "one_touch": [True, False, True, False] * 3,
        "failed_reception": [False] * n, "failed_how": [""] * n,
        "next_action": ["pass"] * n, "next_pass_complete": pd.array([True, None, False, None] * 3, dtype="boolean"),
        "pressure": ["N", "N", "P", "N"] * 3, "distance_m": [10.0] * n, "arrival_kmh": [25.0] * n,
    })


def _passes():
    n = 9
    return pd.DataFrame({
        "game_id": [1] * n, "match": ["A v B"] * n, "date": ["2022-11-22"] * n, "clock": ["01:00"] * n,
        "pff_player_id": [1] * 3 + [2] * 3 + [3] * 3,
        "success": [True, True, False] * 3, "speed_kmh": [5.0, 20.0, 5.0] * 3, "pressure": ["N", "P", "N"] * 3,
    })


def test_wilson_is_a_sensible_range():
    lo, hi = wilson(50, 100)
    assert 0.40 < lo < 0.5 < hi < 0.60
    assert wilson(0, 0) is None


def test_rows_carry_the_ranking_arithmetic():
    out = player_technique(_players(), _receptions(), _passes(), 1)
    one = next(r for r in out["rows"] if r["key"] == "one_touch")
    assert (one["k"], one["n"]) == (20, 100)
    assert one["percentile"] == 17 and one["below"] == 0 and one["equal"] == 1
    assert one["pool_size"] == 3
    assert one["peer_shares"] == sorted(one["peer_shares"])
    # 5 matches: settled for one_touch (needs 4), not for kept (needs 11)
    assert one["settled"] is True
    kept = next(r for r in out["rows"] if r["key"] == "kept")
    assert kept["settled"] is False


def test_pressure_split_and_swap_numbers():
    out = player_technique(_players(), _receptions(), _passes(), 1)
    ft = out["first_time_by_pressure"]
    assert {g["group"] for g in ft["groups"]} == {"No pressure", "Pressured"}
    assert abs(sum(g["mix"] for g in ft["groups"]) - 1) < 1e-9
    assert 0 <= ft["his_rates_peer_mix"] <= 1 and 0 <= ft["peer_rates_his_mix"] <= 1


def test_pass_splits_cover_all_passes():
    out = player_technique(_players(), _receptions(), _passes(), 1)
    speeds = out["pass_by_speed"]["groups"]
    assert sum(g["peer_n"] for g in speeds) == 9
    assert {g["group"] for g in speeds} == {"15+ km/h", "Under 15 km/h"}


def test_examples_are_his_receptions_in_order():
    out = player_technique(_players(), _receptions(), _passes(), 1)
    assert out["example_match"] == "A v B"
    assert [e["clock"] for e in out["examples"]] == sorted(e["clock"] for e in out["examples"])
    assert len(out["examples"]) == 4


def test_unknown_player_raises():
    with pytest.raises(KeyError):
        player_technique(_players(), _receptions(), _passes(), 999)


def test_route_404_for_unknown_player(monkeypatch):
    monkeypatch.setattr(T, "load_technique_players", _players)
    monkeypatch.setattr(T, "load_receptions", _receptions)
    monkeypatch.setattr(T, "load_passes", _passes)
    assert TestClient(app).get("/api/players/999/technique").status_code == 404
    r = TestClient(app).get("/api/players/1/technique")
    assert r.status_code == 200 and r.json()["player"]["name"] == "P1"
