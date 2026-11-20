"""Tests for the Players > Touches calculations (small fake tables, no S3)."""
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import app
from routes import touches as Tm
from routes.touches import player_touches


def _players():
    rows = []
    for pid, (touches, team_on, team) in enumerate([(300, 2400.0, "X"), (240, 2400.0, "X"), (200, 2500.0, "Y")], start=1):
        rows.append(dict(pff_player_id=pid, name=f"P{pid}", peers="Midfielders", matches=5, minutes=450.0, touches=touches, team_on=team_on, team=team, in_pool=True))
    return pd.DataFrame(rows)


def _touches():
    recs = []
    for pid, n in ((1, 60), (2, 48), (3, 40)):
        for i in range(n):
            recs.append(dict(pff_player_id=pid, game_id=1, team="X" if pid < 3 else "Y", x_att=-30 + (i % 6) * 12.0, y_att=0.0, nearest_opp_m=5.0,
                             outcome="neutral", last_kind="PA" if i % 5 else "CH", match="A v B"))
    return pd.DataFrame(recs)


def _matches():
    rows = []
    for pid, team in ((1, "X"), (2, "X"), (3, "Y")):
        for g, (m, t, tt) in enumerate([(90.0, 40, 600), (90.0, 20, 500)], start=1):
            rows.append(dict(pff_player_id=pid, game_id=g, match=f"M{g}", team=team, minutes=m, touches=t, team_touches=tt, match_len=90.0, team_on=tt))
    return pd.DataFrame(rows)


def test_per90_is_team_tempo_times_share():
    v = player_touches(_touches(), _players(), _matches(), 1)["volume"]
    assert abs(v["team90"] * v["involve"] / 100 - v["per90"]) < 1e-9
    assert v["touches"] == 300 and v["pool_size"] == 3


def test_zones_next_and_matches():
    out = player_touches(_touches(), _players(), _matches(), 1)
    assert set(out["zones"]["player"]) == {"Own third", "Middle third", "Final third"}
    assert abs(sum(out["next"]["player"].values()) - 1) < 1e-9
    assert len(out["by_match"]["rows"]) == 2 and out["by_match"]["rows"][0]["per90"] == 40.0


def test_team_block_and_examples():
    out = player_touches(_touches(), _players(), _matches(), 1)
    assert out["team"]["team"] == "X" and out["team"]["teams"] == 2
    assert len(out["examples"]) == 8 and out["example_match"] == "A v B"


def test_unknown_player_and_route(monkeypatch):
    with pytest.raises(KeyError):
        player_touches(_touches(), _players(), _matches(), 99)
    monkeypatch.setattr(Tm, "load_free_touches", _touches)
    monkeypatch.setattr(Tm, "load_free_players", _players)
    monkeypatch.setattr(Tm, "load_touch_matches", _matches)
    c = TestClient(app)
    assert c.get("/api/players/99/touches").status_code == 404
    assert c.get("/api/players/1/touches").status_code == 200
