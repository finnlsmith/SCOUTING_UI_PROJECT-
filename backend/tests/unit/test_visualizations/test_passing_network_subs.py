"""Passing network: starting XI comes from THIS match's lineup, and substitutes replace the
players they came on for."""

import json

import pandas as pd
import pytest

from visualizations import passing_network as pn

TEAM = "Reds"
STARTERS = list(range(1, 12))  # player ids 1..11 start
SUB_ON, SUB_OFF = 12, 3  # player 12 replaces player 3 at 60'


def _events() -> pd.DataFrame:
    rows = []
    # Everyone in a chain of passes: 1->2->...->11->1 before the sub, then 12 replaces 3
    def passes(ids, minute):
        for a, b in zip(ids, ids[1:] + ids[:1]):
            rows.append(dict(
                type="Pass", team=TEAM, minute=minute, second=0,
                player_id=a, player=f"Player {a} Name", pass_recipient_id=b, pass_recipient=f"Player {b} Name",
                location=[40, 40], pass_end_location=[50, 40], pass_outcome=None,
            ))
    passes(STARTERS, 10)
    passes([i for i in STARTERS if i != SUB_OFF] + [SUB_ON], 70)
    rows.append(dict(
        type="Substitution", team=TEAM, minute=60, second=0, player_id=SUB_OFF, player=f"Player {SUB_OFF} Name",
        substitution_replacement=f"Player {SUB_ON} Name", substitution_replacement_id=SUB_ON,
    ))
    return pd.DataFrame(rows)


def _lineups() -> pd.DataFrame:
    def row(pid, match_id, start):
        return dict(
            match_id=match_id, player_id=pid, player_name=f"Player {pid} Name", team_name=TEAM,
            positions=str([{"start_reason": "Starting XI" if start else "Substitution - On (Attacking)"}]),
        )
    rows = [row(pid, 1, True) for pid in STARTERS] + [row(SUB_ON, 1, False)]
    # Same sub STARTED a different match: this must not make him a starter here
    rows.append(row(SUB_ON, 2, True))
    return pd.DataFrame(rows)


@pytest.fixture
def fake_s3(monkeypatch):
    import cache
    ev, lu = _events(), _lineups()
    monkeypatch.setattr(cache.s3, "get_dataframe", lambda key, cache_type=None: lu if key.startswith("lineups") else ev)
    monkeypatch.setattr(cache.cache, "get", lambda *a, **k: None)
    monkeypatch.setattr(cache.cache, "set", lambda *a, **k: None)


def _nodes(resp):
    body = json.loads(resp.body)
    node = [t for t in body["data"] if t.get("name") == "players"][0]
    return body, node


async def test_starters_only_ignores_other_matches_lineups(fake_s3):
    resp = await pn.passing_network_like_matplotlib("events_1.csv", TEAM, 1, False, False)
    body, node = _nodes(resp)
    assert body["node_count"] == 11
    assert not any("Player 12" in t or "P. 12" in t for t in node["text"])
    assert body["substitutes_shown"] is False


async def test_substitute_replaces_player_they_came_on_for(fake_s3):
    resp = await pn.passing_network_like_matplotlib("events_1.csv", TEAM, 1, False, True)
    body, node = _nodes(resp)
    labels = node["text"]
    assert body["node_count"] == 11
    assert any(label.endswith("▲60'") for label in labels)  # the sub, with his minute
    assert not any("3 Name" in label or label.startswith("P. 3") for label in labels)  # player 3 is gone
    assert body["substitutions"] == [{"on": "Player 12 Name", "off": "Player 3 Name", "minute": 60}]


def test_replacement_is_inferred_when_event_lacks_it():
    ev = _events()
    ev["substitution_replacement_id"] = None
    ev["substitution_replacement"] = None
    pairs = pn._substitution_pairs(ev, TEAM)
    assert [(p["off_id"], p["on_id"]) for p in pairs] == [(SUB_OFF, SUB_ON)]
