"""Shared event rules: defensive errors in the own half and boxes gained without a pass or carry."""

import pandas as pd

from visualizations.player_events import box_gain_entries, defensive_errors


def _events():
    rows = [
        # Reds: an error deep in their own half, a miscontrol in the other half, a dispossession in their half
        dict(index_num=1, period=1, type="Error", team="Reds", player="A", location=[10, 40], possession=1, possession_team="Blues"),
        dict(index_num=2, period=1, type="Miscontrol", team="Reds", player="B", location=[70, 40], possession=1, possession_team="Reds"),
        dict(index_num=3, period=1, type="Dispossessed", team="Reds", player="C", location=[30, 20], possession=2, possession_team="Blues"),
        # Blues get the ball in the Reds' box: possession 1 by a recovery (no pass or carry), 2 already counted
        dict(index_num=4, period=1, type="Ball Recovery", team="Blues", player="X", location=[106, 38], possession=1, possession_team="Blues"),
        dict(index_num=5, period=1, type="Shot", team="Blues", player="X", location=[107, 38], possession=1, possession_team="Blues"),
        dict(index_num=6, period=1, type="Ball Receipt*", team="Blues", player="Y", location=[105, 30], possession=2, possession_team="Blues"),
        # outside the box: ignored
        dict(index_num=7, period=1, type="Ball Recovery", team="Blues", player="Z", location=[90, 30], possession=3, possession_team="Blues"),
    ]
    return pd.DataFrame(rows)


def test_defensive_errors_only_in_own_half():
    got = defensive_errors(_events(), "Reds")
    assert list(got["player"]) == ["A", "C"]  # the miscontrol at x=70 is in the other half
    assert defensive_errors(_events(), "Blues").empty


def test_box_gain_is_first_touch_in_box_per_possession_and_skips_counted():
    got = box_gain_entries(_events(), "Blues", counted_possessions={2})
    assert list(got["possession"]) == [1]
    assert got.iloc[0]["type"] == "Ball Recovery"  # the first touch, not the shot that followed
    assert (got.iloc[0]["px"], got.iloc[0]["py"]) == (106, 38)


def test_box_gain_ignores_touches_outside_the_box():
    got = box_gain_entries(_events(), "Blues", counted_possessions=set())
    assert 3 not in list(got["possession"])
