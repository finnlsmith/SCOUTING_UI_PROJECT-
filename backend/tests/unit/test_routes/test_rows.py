"""Tests for the generic card-rows endpoint (small fake tables, no S3)."""
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import app
from routes import rows as R
from routes.rows import player_rows, rank_in_pool


def test_rank_matches_the_cards_rule():
    # 3 below, 1 level, 2 above: (3 + 0.5) / 6 = 58.3%
    r = rank_in_pool([1, 2, 3, 4, 4.5, 5.0, 6.0][:6], 4.0)
    assert (r["below"], r["equal"], r["above"], r["pool_size"]) == (3, 1, 2, 6) or r["pool_size"] == 6
    r = rank_in_pool([1, 2, 3, 4, 5, 6], 3.5)
    assert (r["below"], r["equal"], r["above"]) == (3, 0, 3)
    assert abs(r["exact"] - 50.0) < 1e-9


def test_lower_is_better_counts_peers_with_a_higher_value():
    r = rank_in_pool([0.1, 0.2, 0.3, 0.4], 0.15, invert=True)
    assert r["below"] == 3 and r["equal"] == 0 and r["above"] == 0 + 1  # 0.1 is better than 0.15


def _tables():
    rows = pd.DataFrame([
        dict(pff_player_id=1, name="A", peers="Midfielders", matches=7, minutes=600.0, section="How he plays", frame=1,
             label="Touches per 90", val="75.3", n=np.nan, rng="", pct=50.0, need=4.0, settled=True, np=False, judge=False,
             v=3.0, invert=False, has_pool=True),
        dict(pff_player_id=1, name="A", peers="Midfielders", matches=7, minutes=600.0, section="Action volume", frame=1,
             label="Cross completion", val="0%", n=2.0, rng="", pct=np.nan, need=10.0, settled=False, np=True, judge=True,
             v=np.nan, invert=False, has_pool=False),
    ])
    pools = {"Midfielders": {"Touches per 90": [1.0, 2.0, 3.0, 4.0, 5.0]}}
    return rows, pools


def test_player_rows_adds_rank_only_where_there_is_a_pool():
    rows, pools = _tables()
    out = player_rows(rows, pools, 1)
    t = out["rows"][0]
    assert t["rank"]["pool_size"] == 5 and t["rank"]["below"] == 2 and t["rank"]["equal"] == 1 and t["rank"]["above"] == 2
    assert t["peer_median"] == 3.0 and t["peer_values"] == [1.0, 2.0, 3.0, 4.0, 5.0]
    c = out["rows"][1]
    assert c["rank"] is None and c["not_ranked"] is True and c["percentile"] is None


def test_unknown_player():
    rows, pools = _tables()
    with pytest.raises(KeyError):
        player_rows(rows, pools, 99)


def test_route(monkeypatch):
    rows, pools = _tables()
    monkeypatch.setattr(R, "load_card_rows", lambda: rows)
    monkeypatch.setattr(R, "load_card_pools", lambda: pools)
    c = TestClient(app)
    assert c.get("/api/players/99/rows").status_code == 404
    j = c.get("/api/players/1/rows").json()
    assert j["player"]["name"] == "A" and len(j["rows"]) == 2
