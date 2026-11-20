"""Shared lead-up rules: windows, lead-up sequences, mistakes that led to a shot, keeper handling."""

import pandas as pd

from visualizations.event_context import (
    apply_window, error_follow_up, event_context, player_touches,
)
from visualizations.player_events import defensive_errors


def _row(i, typ, team, player, t, loc, **kw):
    r = dict(id=f"e{i}", index_num=i, period=1, minute=t // 60, second=t % 60, type=typ, team=team,
             player=player, location=loc, possession=1, position=kw.pop("position", "Center Back"))
    r.update(kw)
    return r


def _events():
    return pd.DataFrame([
        # Reds make a mistake in their half, Blues win it and shoot 6 seconds later
        _row(1, "Pass", "Blues", "B1", 95, [40, 40], pass_end_location=[50, 40], pass_cross=float('nan')),
        _row(2, "Error", "Reds", "R1", 100, [12, 38]),                      # Reds' own half, mirrors for Blues
        _row(3, "Ball Recovery", "Blues", "B2", 101, [104, 40]),
        _row(4, "Pass", "Blues", "B2", 103, [104, 40], pass_end_location=[108, 36], pass_cut_back=1.0),
        _row(5, "Shot", "Blues", "B3", 106, [108, 36], shot_outcome="Goal", shot_statsbomb_xg=0.4),
        # Much later, unrelated
        _row(20, "Shot", "Blues", "B3", 400, [100, 30], shot_outcome="Saved", shot_statsbomb_xg=0.1, possession=9),
    ])


def test_window_keeps_one_period_and_a_time_range():
    ev = _events()
    got = apply_window(ev, period=1, start=100, end=106)
    assert list(got["id"]) == ["e3", "e4", "e5"]            # start is exclusive, end inclusive
    assert apply_window(ev, period=2).empty
    assert len(apply_window(ev)) == len(ev)                 # no window = everything


def test_event_context_lists_the_lead_up_in_the_shooters_frame():
    ctx = event_context(_events(), "e5")
    kinds = [(a["kind"], a["team"]) for a in ctx["sequence"]]
    assert kinds == [("Pass", "Blues"), ("Error", "Reds"), ("Ball Recovery", "Blues"), ("Pass", "Blues")]
    err = ctx["sequence"][1]
    assert err["own_team"] is False and (err["x1"], err["y1"]) == (108, 42)   # Reds' (12, 38) mirrored
    assert ctx["sequence"][3]["label"] == "Cut-back"
    assert ctx["network_window"] == {"period": 1, "start": 46.0, "end": 106.0}   # the 60s before the shot
    assert ctx["event"]["outcome"] == "Goal"


def test_event_context_ignores_actions_older_than_the_lookback():
    ctx = event_context(_events(), "e20")
    assert ctx["sequence"] == []                            # nothing in the 15s before it


def test_error_that_leads_to_a_shot_is_linked_with_the_goal_flag():
    ev = _events()
    err = ev[ev["id"] == "e2"].iloc[0]
    link = error_follow_up(ev, err)
    assert link["shot_id"] == "e5" and link["goal"] is True and link["delay"] == 6


def test_mistake_with_no_shot_in_30s_has_no_link():
    ev = _events()
    ev.loc[ev["id"] == "e5", "type"] = "Pass"              # remove the shot
    assert error_follow_up(ev, ev[ev["id"] == "e2"].iloc[0]) == {}


def test_goalkeeper_errors_in_the_six_yard_box_or_after_a_shot_are_not_defensive_errors():
    rows = [
        _row(1, "Error", "Reds", "GK", 50, [3, 40], position="Goalkeeper"),          # inside own 6-yard box
        _row(2, "Shot", "Blues", "B", 80, [100, 40], shot_outcome="Saved"),
        _row(3, "Error", "Reds", "GK", 81, [10, 40], position="Goalkeeper"),         # spill right after a shot
        _row(4, "Error", "Reds", "CB", 120, [20, 40]),                                 # a real defender's error
        _row(5, "Goal Keeper", "Reds", "GK", 150, [8, 40], position="Goalkeeper"),   # the keeper punches a cross...
        _row(6, "Error", "Reds", "GK", 151, [9, 40], position="Goalkeeper"),         # ...and then fumbles it: a parry, not an error
    ]
    got = defensive_errors(pd.DataFrame(rows), "Reds")
    assert list(got["player"]) == ["CB"]


def test_player_touches_modes():
    rows = [
        _row(1, "Pass", "Reds", "A", 10, [30, 40], pass_end_location=[50, 40]),
        _row(2, "Ball Receipt*", "Reds", "A", 12, [85, 40]),
        _row(3, "Ball Receipt*", "Reds", "A", 20, [60, 40]),
    ]
    ev = pd.DataFrame(rows)
    assert player_touches(ev, "Reds", "A", "touches")["count"] == 3
    final = player_touches(ev, "Reds", "A", "final_third_receptions")
    assert final["count"] == 1 and final["points"][0]["x"] == 85


def test_flags_are_read_the_way_the_data_stores_them():
    from visualizations.event_context import flag, pass_label
    assert flag(1.0) and flag(True) and flag("True") and flag("1.0")
    assert not flag(float("nan")) and not flag(None) and not flag(0.0) and not flag("")
    assert pass_label({"pass_cross": 1.0}) == "Cross"
    assert pass_label({"pass_through_ball": 1.0, "pass_cross": 1.0}) == "Through ball"
    assert pass_label({"pass_cut_back": float("nan"), "pass_height": "High Pass"}) == "High Pass"
