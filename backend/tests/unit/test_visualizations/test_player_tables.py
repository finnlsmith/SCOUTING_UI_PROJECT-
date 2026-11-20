"""Per-player tables: definitions checked on a small made-up match."""

import pandas as pd

from visualizations.player_tables import build_player_tables

TEAM = "Reds"


def _ev(i, typ, player, t, loc, **kw):
    row = dict(id=f"e{i}", index_num=i, period=1, minute=t // 60, second=t % 60, type=typ, team=TEAM,
               player=player, location=loc, possession=kw.pop("possession", 1))
    row.update(kw)
    return row


def _events():
    rows = [
        # Possession 1: a forward pass into the final third, a dribble, then a shot
        _ev(1, "Pass", "A", 100, [50, 40], pass_end_location=[85, 40]),
        _ev(2, "Dribble", "B", 102, [85, 40], dribble_outcome="Complete"),
        _ev(3, "Shot", "B", 104, [100, 40], shot_statsbomb_xg=0.3, shot_outcome="Saved"),
        # Possession 2: a pass 20s before a shot does NOT create it
        _ev(9, "Pass", "A", 180, [60, 30], pass_end_location=[70, 30], possession=2),
        _ev(10, "Shot", "B", 200, [95, 30], shot_statsbomb_xg=0.1, shot_outcome="Off T", possession=2),
        # Incomplete pass by A ends a possession
        _ev(11, "Pass", "A", 300, [40, 40], pass_end_location=[60, 40], pass_outcome="Incomplete", possession=3),
        # Carry and pass into the box
        _ev(12, "Carry", "B", 400, [70, 40], carry_end_location=[105, 40], possession=4),
        _ev(13, "Pass", "A", 410, [70, 40], pass_end_location=[108, 40], possession=5),
        # A pass played from inside the box is a box touch (but not a pass INTO the box)
        _ev(14, "Pass", "A", 500, [105, 40], pass_end_location=[110, 45], possession=6),
    ]
    return pd.DataFrame(rows)


def _frames():
    # Event e1: three opponents between passer (x=50) and receiver (x=85), one far off the line, plus a keeper
    def r(i, mate, x, y, keeper=0, actor=0):
        return dict(id=i, teammate=mate, actor=actor, keeper=keeper, location=[x, y])
    return pd.DataFrame([
        r("e1", 1, 50, 40, actor=1),
        r("e1", 0, 60, 40), r("e1", 0, 65, 42), r("e1", 0, 70, 38),   # beaten
        r("e1", 0, 75, 70),                                           # too far from the line
        r("e1", 0, 118, 40, keeper=1),                                # keeper never counts
    ])


def _tables():
    return build_player_tables(_events(), _frames(), TEAM)


def _row(table, name):
    return next(r for r in table if r["player"] == name)


def test_attack_counts():
    a = _tables()["attack"]
    b, aa = _row(a, "B"), _row(a, "A")
    assert b["shots"] == 2 and round(b["xg"], 2) == 0.4
    assert aa["final_third_entries"] == 2          # e1 (50 -> 85) and e13 (70 -> 108)
    assert b["final_third_entries"] == 1           # the carry 70 -> 105
    assert b["box_touches"] == 0                   # both shots were taken from outside the box
    assert aa["box_touches"] == 1                  # the pass played from inside it (e14)


def test_creation_counts():
    c = _tables()["creation"]
    a, b = _row(c, "A"), _row(c, "B")
    assert a["line_breaking_passes"] == 1          # e1 beats 3 opponents
    assert a["passes_into_box"] == 1               # e13
    assert b["carries_into_box"] == 1              # e12
    assert a["possession_ending"] == 1             # the incomplete pass
    assert b["possession_ending"] == 2             # two shots


def test_shot_creating_needs_to_be_within_ten_seconds():
    c = _tables()["creation"]
    a, b = _row(c, "A"), _row(c, "B")
    assert a["shot_creating"] == 1                 # e1 (4s before shot 1); e9 is 20s before shot 2
    assert b["shot_creating"] == 1                 # the dribble 2s before shot 1


def test_goalside_reception_needs_space_in_the_attacking_35_percent():
    rows = [
        _ev(30, "Ball Receipt*", "A", 600, [95, 40]),   # in space, nearest opponent behind -> counts
        _ev(31, "Ball Receipt*", "A", 610, [95, 40]),   # opponent right on top of him -> no
        _ev(32, "Ball Receipt*", "A", 620, [60, 40]),   # not in the attacking 35% -> no
        _ev(33, "Ball Receipt*", "A", 630, [95, 40]),   # nearest opponent is in front of him -> no
    ]
    frames = []
    def fr(i, ox, oy, x):
        frames.extend([
            dict(id=i, teammate=1, actor=1, keeper=0, location=[x, 40]),
            dict(id=i, teammate=0, actor=0, keeper=0, location=[ox, oy]),
        ])
    fr("e30", 85, 40, 95)       # 10 yards behind: counts
    fr("e31", 94, 40, 95)       # 1 yard away: pressured
    fr("e32", 50, 40, 60)       # fine, but x < 78
    fr("e33", 100, 40, 95)      # in front
    out = build_player_tables(pd.DataFrame(rows), pd.DataFrame(frames), TEAM)
    assert _row(out["attack"], "A")["goalside_receptions"] == 1
