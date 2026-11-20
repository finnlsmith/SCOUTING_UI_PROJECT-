// Copied verbatim from the Playing at Speed project on 2026-11-19 (see each file path).
// Regenerate rather than edit by hand, so this always matches the code that built the cards.
export const CHAPTER_CODE = {
  "standard-stats": [
    {
      "file": "mockups/PLAYER SCOUTING CARDS/generator/build_cards_v3.py",
      "fn": "strip_real",
      "note": "The four standard stats: the count, the per-90 rate, and the percentile among peers.",
      "code": "def strip_real(ev, pid, pool, me):\n    d = ev[ev.player == pid]\n    cells = []\n    allp = ev.groupby('player')\n    def per90(sel):\n        s = ev[sel].groupby('player').size().reindex(pool.index).fillna(0)\n        return s / pool.minutes * 90\n    defs = [('Goals', ev.goal & ev.kind.eq('shot')), ('Assists', ev.assist & ev.kind.eq('key pass')),\n            ('Key passes', ev.kind.eq('key pass')), ('High-xG shots', ev.kind.eq('shot') & (ev.xg >= pv.HIGH_XG))]\n    for label, sel in defs:\n        mine = int(((ev.player == pid) & sel).sum())\n        rate = mine / me.minutes * 90\n        pct = pct_rank(per90(sel), rate)\n        cells.append(dict(label=label, big=str(mine), sub=f'{rate:.2f} per 90' + (f' · {ordn(pct)}' if pct is not None else ''), pct=pct if pct is not None else 0))\n    return cells"
    },
    {
      "file": "notebooks/xg_naive.py",
      "fn": "features",
      "note": "High-xG shots use a simple xG from distance and angle, because PFF has no xG field.",
      "code": "def features(x, y):\n    x, y = np.asarray(x, float), np.asarray(y, float)\n    dx = GOAL_X - x\n    d = np.hypot(dx, y)\n    a = np.hypot(dx, y - HALF_GOAL)\n    b = np.hypot(dx, y + HALF_GOAL)\n    cos = np.clip((a ** 2 + b ** 2 - (2 * HALF_GOAL) ** 2) / (2 * a * b), -1, 1)\n    return np.column_stack([d, np.arccos(cos)])"
    },
    {
      "file": "notebooks/profiles_v3.py",
      "fn": "great_actions",
      "note": "Builds the table of goals, assists, key passes and shots, with xG, that the stats are counted from.",
      "code": "def great_actions():\n    \"\"\"One row per goal / assist / key pass / high-xG shot, with speed, space and time at the action.\"\"\"\n    _, C = xg_naive.fitted()\n    A = loaders.load_pff_actions()\n    S = loaders.load_pff_space()\n    S = S[S.usable & (S.kind == 'action')].dropna(subset=['ref_id'])[['game_id', 'ref_id', 'time_on_ball', 'nearest_m']].drop_duplicates(['game_id', 'ref_id'])\n    A = A[A.usable][['game_id', 'possession_event_id', 'speed_kmh']].drop_duplicates(['game_id', 'possession_event_id'])\n    T = loaders.load_pff_touches()\n    shots = C[['game_id', 'shot_id', 'shooter', 'xg', 'goal']].rename(columns={'shot_id': 'pe', 'shooter': 'player'})\n    shots['kind'] = 'shot'\n    kp = T[T.key_pass][['game_id', 'last_pe_id', 'pff_player_id', 'assist']].rename(columns={'last_pe_id': 'pe', 'pff_player_id': 'player'})\n    kp['kind'] = 'key pass'\n    ev = pd.concat([shots, kp], ignore_index=True)\n    ev = ev.merge(A, left_on=['game_id', 'pe'], right_on=['game_id', 'possession_event_id'], how='left')\n    ev = ev.merge(S, left_on=['game_id', 'pe'], right_on=['game_id', 'ref_id'], how='left')\n    ev['at_speed'] = np.where(ev.speed_kmh.isna(), np.nan, (ev.speed_kmh >= 15).astype(float))\n    ev['space'] = pd.cut(ev.nearest_m, SPACE_BINS, labels=SPACE_LABELS, right=False)\n    ev['time'] = pd.cut(ev.time_on_ball, TIME_BINS, labels=TIME_LABELS, right=False)\n    ev['goal'] = ev.goal.fillna(False).astype(bool)\n    ev['assist'] = ev.assist.fillna(False).astype(bool)\n    return ev"
    }
  ],
  "touches": [
    {
      "file": "notebooks/profiles_v3.py",
      "fn": "build (touches)",
      "note": "A touch is one PFF event on the ball in open play. Touches per player are counted from the touches table.",
      "code": "    base = per_player_base()\n    T = loaders.load_pff_touches().dropna(subset=['x_att', 'y_att', 'nearest_opp_m']).copy()\n    T['mid'] = T.x_att.between(BOOTH_X_MIN, BOOTH_X_MAX)\n    T['booth'] = T.mid & (T.nearest_opp_m <= BOOTH_M)\n    T['free'] = T.nearest_opp_m >= 6\n    _, C = xg_naive.fitted()\n    T = T.merge(C[['game_id', 'shot_id', 'xg']], left_on=['game_id', 'last_pe_id'], right_on=['game_id', 'shot_id'], how='left')\n    T['chance'] = T.last_kind.eq('SH') | T.key_pass | (T.last_kind.eq('CR') & T.completed.fillna(False).astype(bool))\n\n    g = T.groupby('pff_player_id')\n    P = pd.DataFrame({'touches': g.size(), 'chances_free': g.apply(lambda d: (d.chance & d.free).sum()),\n                      'free_touches': g.apply(lambda d: d.free.sum())})\n    # Receptions in free space (nearest defender 6+ m at reception): volume is the thing rewarded; what he does with them is a separate skill."
    },
    {
      "file": "mockups/PLAYER SCOUTING CARDS/generator/build_cards_v3.py",
      "fn": "the row",
      "note": "Touches per 90 = touches ÷ minutes × 90, ranked against peers.",
      "code": "    touches_rate = pool.touches / pool.minutes * 90\n    my_touch = me.touches / me.minutes * 90\n    t_row = dict(label='Touches per 90', val=f'{my_touch:.1f}', pct=pct_rank(touches_rate, my_touch), need=4, n=None, rng='', judge=False,\n                 settled=pct_rank(touches_rate, my_touch) is not None and 4 <= games, np=False)"
    }
  ],
  "time-on-ball": [
    {
      "file": "notebooks/build_pff_space.py",
      "fn": "time to reach the player",
      "note": "For each opponent: how long to reach the player on the ball, if he keeps his velocity for 0.7 s then runs at 5 m/s. The smallest is the time on the ball.",
      "code": "REACTION_S, VMAX = 0.7, 5.0         # Friends of Tracking / Spearman defaults\n\n# inside build_one():\n        best_t, best_d, best_vis, within5, n_opp = np.inf, np.inf, None, 0, 0\n        for o in opp_ids[tm]:\n            s = state(o, f)\n            if s is None:\n                continue\n            n_opp += 1\n            p, v = s[0][:2], np.nan_to_num(s[0][2:4])\n            d = float(np.hypot(*(p - pos)))\n            tti = REACTION_S + np.hypot(*(pos - (p + v * REACTION_S))) / VMAX\n            within5 += d <= 5\n            if tti < best_t:\n                best_t, best_vis = tti, s[1]\n            best_d = min(best_d, d)\n        if n_opp < 9:            # too many opponents missing from tracking at this moment\n            continue\n        sign = attack_sign.get((tm, me[2]), np.nan)\n        rows.append({\"game_id\": game_id, \"kind\": r.kind, \"ref_id\": r.ref_id, \"player_id\": pid, \"frame\": f,\n                     \"time_on_ball\": best_t, \"nearest_m\": best_d, \"opponents_5m\": within5,\n                     \"closest_threat_visible\": best_vis, \"player_visible\": me[1],"
    },
    {
      "file": "mockups/PLAYER SCOUTING CARDS/generator/build_cards_v3.py",
      "fn": "the row",
      "note": "Share of moments with 2+ seconds, ranked against peers.",
      "code": "    time_row = base_row('Moments with 2+ s on the ball', mb.time_2s, mb.time_n, B.time_2s, B.time_n, 4, False, lambda v: f_pct(v), 50)"
    }
  ],
  "action-volume": [
    {
      "file": "mockups/PLAYER SCOUTING CARDS/generator/build_cards_v3.py",
      "fn": "volume_table",
      "note": "Open-play attempts per player: shots, crosses, and passes that break at least one defensive line (PFF linesBrokenType). Attempts, not completions.",
      "code": "def volume_table():\n    \"\"\"Open-play attempts per player: shots, crosses, passes that break at least one defensive line (PFF linesBrokenType). Attempts, not completions.\"\"\"\n    A = pv.loaders.load_pff_actions()\n    X = pd.read_parquet(pv.loaders.PFF_CACHE / 'action_extras.parquet')[['game_id', 'possession_event_id', 'lines_broken']]\n    A = A[A.set_piece == 'O'].merge(X, on=['game_id', 'possession_event_id'], how='left')\n    g = A.groupby('pff_player_id')\n    V = pd.DataFrame({'shots': g.apply(lambda d: (d.action == 'shot').sum()),\n                      'crosses': g.apply(lambda d: (d.action == 'cross').sum()),\n                      'cross_ok': g.apply(lambda d: ((d.action == 'cross') & d.success.astype(bool)).sum()),\n                      'lb': g.apply(lambda d: ((d.action == 'pass') & d.lines_broken.notna()).sum()),\n                      'lb_ok': g.apply(lambda d: ((d.action == 'pass') & d.lines_broken.notna() & d.success.astype(bool)).sum())})\n    return V"
    },
    {
      "file": "mockups/PLAYER SCOUTING CARDS/generator/build_cards_v3.py",
      "fn": "the five rows",
      "note": "Per-90 rates and completion rates, ranked against peers.",
      "code": "    # action volume: attempts per 90, then how often they come off\n    V = VOL.reindex(pool.index).fillna(0).join(pool[['minutes']])\n    mv = VOL.loc[pid] if pid in VOL.index else pd.Series(dict(shots=0, crosses=0, cross_ok=0, lb=0, lb_ok=0))\n    vr = lambda c: V[c] / V.minutes * 90\n    def vrow(key, label, col, ok_col=None, judge=False):\n        k = int(mv[col]); rate = k / me.minutes * 90\n        return row(key, label, f_num(rate, 2), pct_rank(vr(col), rate), GATE['vol'], k, '{:.2f} – {:.2f}'.format(*poisson(k, me.minutes)), judge)\n    def crow(key, label, col, ok_col):\n        n, k = int(mv[col]), int(mv[ok_col]); okc = n >= MIN_EVENTS['vol_rate']\n        m = V[V[col] >= 15]\n        return row(key, label, f_pct(k / n) if n else '–', pct_rank(m[ok_col] / m[col], k / n) if okc else None, GATE['vol_rate'], n, rng_p(wilson(k, n)) if okc else '', True)\n    sections.append(dict(frame=1, title='Action volume', sub='attempts in open play, not just completions', rows=[\n        vrow('shots', 'Shots attempted, per 90', 'shots'),\n        vrow('crosses', 'Crosses attempted, per 90', 'crosses'),\n        vrow('lb', 'Line-breaking passes, per 90', 'lb'),\n        crow('lbok', 'Line-breaking pass completion', 'lb', 'lb_ok'),\n        crow('crok', 'Cross completion', 'crosses', 'cross_ok'),\n    ]))"
    }
  ],
  "phone-booth": [
    {
      "file": "notebooks/profiles_v3.py",
      "fn": "build (booth)",
      "note": "A touch in the booth zone with an opponent within 3 m. Progressive, kept and lost are the touch's outcome.",
      "code": "    base = per_player_base()\n    T = loaders.load_pff_touches().dropna(subset=['x_att', 'y_att', 'nearest_opp_m']).copy()\n    T['mid'] = T.x_att.between(BOOTH_X_MIN, BOOTH_X_MAX)\n    T['booth'] = T.mid & (T.nearest_opp_m <= BOOTH_M)\n    T['free'] = T.nearest_opp_m >= 6\n...\n    P['free_lost'] = fd.outcome.apply(lambda s: (s == 'negative').sum())\n    P['team_on'] = team_on\n    b = T[T.booth]\n    gb = b.groupby('pff_player_id')\n    P['booth_receptions'] = gb.size()\n    dec = b[b.outcome.ne('other')]\n    gd = dec.groupby('pff_player_id')\n    P['booth_decisions'] = gd.size()\n    for k, name in (('positive', 'booth_prog'), ('neutral', 'booth_kept'), ('negative', 'booth_lost')):\n        P[name] = gd.outcome.apply(lambda s, k=k: (s == k).sum())"
    },
    {
      "file": "mockups/PLAYER SCOUTING CARDS/generator/build_cards_v3.py",
      "fn": "the four rows",
      "note": "Receptions per 90, then the three outcome shares ranked against peers.",
      "code": "    # frame 2: phone booth\n    okb = me.booth_decisions >= MIN_EVENTS['booth_dec']\n    bp = pool[pool.booth_decisions >= 15]\n    k = lambda c: int(me[c])\n    booth_rows = [\n        row('bv', 'Receptions in the booth, per 90', f_num(me.booth_per90), pct_rank(pool.booth_per90, me.booth_per90), GATE['booth_vol'], me.booth_receptions,\n            '{:.1f} – {:.1f}'.format(*poisson(me.booth_receptions, me.minutes)), False),\n        row('bp', 'Progressive (of decisions)', f_pct(me.booth_prog_pct), pct_rank(bp.booth_prog_pct, me.booth_prog_pct) if okb else None, GATE['booth_prog'],\n            me.booth_decisions, rng_p(wilson(k('booth_prog'), me.booth_decisions)) if okb else '', True),\n        row('bk', 'Kept, no progress', f_pct(me.booth_kept_pct), pct_rank(bp.booth_kept_pct, me.booth_kept_pct) if okb else None, GATE['booth_kept'],\n            me.booth_decisions, rng_p(wilson(k('booth_kept'), me.booth_decisions)) if okb else '', False),\n        row('bl', 'Lost', f_pct(me.booth_lost_pct), pct_rank(bp.booth_lost_pct, me.booth_lost_pct, invert=True) if okb else None, GATE['booth_lost'],\n            me.booth_decisions, rng_p(wilson(k('booth_lost'), me.booth_decisions)) if okb else '', True),\n    ]\n    sections.append(dict(frame=2, title='Phone booth', sub='opponent within 3 m, back of middle third to 25 m from goal', rows=booth_rows))"
    }
  ],
  "free-space": [
    {
      "file": "notebooks/profiles_v3.py",
      "fn": "build (free space)",
      "note": "A touch with no defender within 6 m. Chances are shots, key passes and completed crosses taken from free space.",
      "code": "    base = per_player_base()\n    T = loaders.load_pff_touches().dropna(subset=['x_att', 'y_att', 'nearest_opp_m']).copy()\n    T['mid'] = T.x_att.between(BOOTH_X_MIN, BOOTH_X_MAX)\n    T['booth'] = T.mid & (T.nearest_opp_m <= BOOTH_M)\n    T['free'] = T.nearest_opp_m >= 6\n    _, C = xg_naive.fitted()\n    T = T.merge(C[['game_id', 'shot_id', 'xg']], left_on=['game_id', 'last_pe_id'], right_on=['game_id', 'shot_id'], how='left')\n    T['chance'] = T.last_kind.eq('SH') | T.key_pass | (T.last_kind.eq('CR') & T.completed.fillna(False).astype(bool))\n\n...\n    gf = f.groupby('pff_player_id')\n    P['free_receptions'] = gf.size()\n    P['free_known'] = g.apply(lambda d: d.nearest_opp_m.notna().sum())\n    fd = f[f.outcome.ne('other')].groupby('pff_player_id')\n    P['free_decisions'] = fd.size()\n    P['free_prog'] = fd.outcome.apply(lambda s: (s == 'positive').sum())"
    },
    {
      "file": "mockups/PLAYER SCOUTING CARDS/generator/build_cards_v3.py",
      "fn": "the rows",
      "note": "Volume first (per 100 team touches, share of his touches), then what he does with the space.",
      "code": "    # free space (no defender within 6 m): volume first, then what he does with it\n    scale = (me.minutes / 90) / me.team_on * 100 if me.team_on else np.nan\n    fr_lo_hi = [x * scale for x in poisson(int(me.free_receptions), me.minutes)]\n    okfd = me.free_decisions >= MIN_EVENTS['free_dec']\n    fpool = pool[pool.free_decisions >= 15]\n    free_rows = [\n        row('fv', 'Free receptions per 100 team touches', f_num(me.free_per100_team), pct_rank(pool.free_per100_team, me.free_per100_team), GATE['free_vol'],\n            me.free_receptions, '{:.1f} – {:.1f}'.format(*fr_lo_hi), False),\n        row('fs', 'Touches taken in free space', f_pct(me.free_share), pct_rank(pool.free_share, me.free_share), GATE['free_share'], me.free_known,\n            rng_p(wilson(me.free_receptions, me.free_known)), False),\n        row('fp', 'Progressive (of free-space decisions)', f_pct(me.free_prog_pct) if okfd else '–', pct_rank(fpool.free_prog_pct, me.free_prog_pct) if okfd else None,\n            GATE['free_prog'], me.free_decisions, rng_p(wilson(me.free_prog, me.free_decisions)) if okfd else '', True),\n        row('fl', 'Lost (of free-space decisions)', f_pct(me.free_lost_pct) if okfd else '–', pct_rank(fpool.free_lost_pct, me.free_lost_pct, invert=True) if okfd else None,\n            GATE['free_lost'], me.free_decisions, rng_p(wilson(me.free_lost, me.free_decisions)) if okfd else '', True),\n    ]\n    sections.append(dict(frame=2, title='Free space', sub='no defender within 6 m; volume, then what he does with it', rows=free_rows))"
    }
  ],
  "ball-holding": [
    {
      "file": "notebooks/ball_stopper.py",
      "fn": "holds",
      "note": "One row per release of the ball: touches in the possession and seconds on the ball. Long hold: 4+ touches or 3+ s. Very long: 6+ touches or 3.7+ s. Idle: a long hold with no defender within 6 m.",
      "code": "def holds():\n    A = loaders.load_pff_actions()\n    S = loaders.load_pff_space()\n    S = S[S.usable & (S.kind == 'action')].dropna(subset=['ref_id'])[['game_id', 'ref_id', 'time_on_ball', 'nearest_m']].drop_duplicates(['game_id', 'ref_id'])\n    A = A.merge(S, left_on=['game_id', 'possession_event_id'], right_on=['game_id', 'ref_id'], how='left')\n    # one row per release of the ball: passes, crosses, shots, dribbles, carries. The 47k 'first touch' rows have no event id and would double-count the same possession.\n    A = A.dropna(subset=['pff_player_id', 'touches', 'possession_event_id'])\n    A = A[A.action.isin(['pass', 'carry', 'dribble', 'cross', 'shot'])].drop_duplicates(['game_id', 'possession_event_id'])\n    A['long'] = (A.touches >= LONG_T) | (A.time_on_ball >= LONG_S)\n    A['very'] = (A.touches >= VERY_T) | (A.time_on_ball >= VERY_S)\n    A['long_t'] = A.touches >= LONG_T\n    A['long_s'] = A.time_on_ball >= LONG_S\n    A['is_pass'] = A.action.eq('pass')\n    # idle hold = a long hold with no defender within 6 m (free): nobody forced the extra touches or time\n    A['idle'] = A.long & (A.nearest_m >= 6)\n    return A"
    },
    {
      "file": "mockups/PLAYER SCOUTING CARDS/generator/build_cards_v3.py",
      "fn": "the four rows",
      "note": "Shares of his actions, ranked against peers with 40+ actions.",
      "code": "    # ball holding (\"ball stopper\")\n    okh = me.hold_actions >= MIN_EVENTS['hold']\n    hpool = pool[pool.hold_actions >= 40]\n    okidle = me.hold_free >= MIN_EVENTS['free_act']\n    hold_rows = [\n        row('hl', 'Long holds (share of his actions)', f_pct(me.long_hold_pct) if okh else '–', pct_rank(hpool.long_hold_pct, me.long_hold_pct) if okh else None, GATE['hold_long'],\n            me.hold_actions, rng_p(wilson(me.hold_long, me.hold_actions)) if okh else '', False),\n        row('hv', 'Very long holds (share of his actions)', f_pct(me.very_long_hold_pct) if okh else '–', pct_rank(hpool.very_long_hold_pct, me.very_long_hold_pct) if okh else None,\n            GATE['hold_very'], me.hold_actions, rng_p(wilson(me.hold_very, me.hold_actions)) if okh else '', False),\n        row('ht', 'Touches per action', f_num(me.touches_per_action, 2) if okh else '–', pct_rank(hpool.touches_per_action, me.touches_per_action) if okh else None,\n            GATE['hold_long'], me.hold_actions, '', False),\n        row('hi', 'Idle holds (of free-space actions)', f_pct(me.idle_of_free_pct) if okidle else '–',\n            pct_rank(pool.idle_of_free_pct[pool.hold_free >= 15], me.idle_of_free_pct, invert=True) if okidle else None, GATE['idle'], me.hold_free,\n            rng_p(wilson(me.hold_idle, me.hold_free)) if okidle else '', True),\n    ]\n    sections.append(dict(frame=2, title='Ball holding', sub='4+ touches or 3+ s; dribblers hold longer', rows=hold_rows))"
    }
  ],
  "goal-side": [
    {
      "file": "notebooks/build_pff_goalside.py",
      "fn": "build_one (the comparison)",
      "note": "Distance of the nearest outfield opponent to goal minus the receiver's distance to goal. Positive means the receiver is closer to goal.",
      "code": "        ox = np.array([p[\"x\"] * s for p in opp]); oy = np.array([p[\"y\"] * s for p in opp])\n        d_def_goal = np.hypot(GOAL[0] - ox, GOAL[1] - oy)\n        d_rec_goal = float(np.hypot(GOAL[0] - ax, GOAL[1] - ay))\n        near = int(np.hypot(ox - ax, oy - ay).argmin())\n        rows.append({\"game_id\": game_id, \"game_event_id\": gid, \"event_time_s\": e[\"eventTime\"], \"pff_player_id\": actor_id,\n                     \"x_att\": ax, \"y_att\": ay, \"nd_x\": float(ox[near]), \"nd_y\": float(oy[near]),\n                     \"nd_dist_m\": float(np.hypot(ox[near] - ax, oy[near] - ay)), \"nd_visible\": opp[near].get(\"visibility\") == \"VISIBLE\",\n                     \"d_goal_receiver\": d_rec_goal, \"d_goal_nearest_def\": float(d_def_goal[near]),\n                     \"margin_m\": float(d_def_goal[near] - d_rec_goal), \"n_ahead_of_opp\": int((d_def_goal < d_rec_goal).sum()),\n                     \"n_opp_outfield\": len(opp)})\n    df = pd.DataFrame(rows).sort_values(\"event_time_s\").drop_duplicates(\"game_event_id\") if rows else pd.DataFrame()\n    if len(df):\n        df[\"goalside\"] = df.margin_m > 0"
    },
    {
      "file": "notebooks/profiles_v3.py",
      "fn": "build (goal-side)",
      "note": "Per player: goal-side receptions, touches, and the progressive share of goal-side touches.",
      "code": "    # Goal-side receptions: closer to goal than his nearest outfield defender when he got the ball (strikers / wide forwards). See build_pff_goalside.py, goalside_check.py.\n    import goalside_check\n    GS = goalside_check.touches_with_goalside()\n    gg = GS.groupby('pff_player_id')\n    P['gs_touches'] = gg.size(); P['gs_receptions'] = gg.goalside.sum()\n    P[['gs_touches', 'gs_receptions']] = P[['gs_touches', 'gs_receptions']].fillna(0)\n    P['goalside_per90'] = P.gs_receptions / P.minutes * 90\n    P['goalside_share'] = P.gs_receptions / P.gs_touches.where(P.gs_touches >= 20)\n    D = GS[GS.outcome.ne('other') & GS.goalside].groupby('pff_player_id')\n    P['goalside_prog_pct'] = (D.outcome.apply(lambda s: (s == 'positive').sum()) / D.size().where(D.size() >= 15)).reindex(P.index)\n\n    ev = great_actions()\n    return P, ev"
    },
    {
      "file": "mockups/PLAYER SCOUTING CARDS/generator/build_cards_v3.py",
      "fn": "the three rows",
      "note": "Per 90, share of touches, and progressive share, ranked against peers.",
      "code": "    # goal-side (forwards)\n    if not is_mid:\n        oks = me.gs_touches >= MIN_EVENTS['gs_touch']\n        gs_rows = [\n            row('gv', 'Goal-side receptions, per 90', f_num(me.goalside_per90), pct_rank(pool.goalside_per90, me.goalside_per90), GATE['gs_vol'], me.gs_receptions,\n                '{:.1f} – {:.1f}'.format(*poisson(int(me.gs_receptions), me.minutes)), False),\n            row('gh', 'Touches that are goal-side', f_pct(me.goalside_share) if oks else '–', pct_rank(pool.goalside_share, me.goalside_share) if oks else None,\n                GATE['gs_share'], me.gs_touches, rng_p(wilson(me.gs_receptions, me.gs_touches)) if oks else '', False),\n            row('gp', 'Progressive from goal-side touches', f_pct(me.goalside_prog_pct) if not pd.isna(me.goalside_prog_pct) else '–',\n                pct_rank(pool.goalside_prog_pct, me.goalside_prog_pct), GATE['gs_prog'], None, '', True),\n        ]\n        sections.append(dict(frame=2, title='Goal-side', sub='closer to goal than his nearest defender', rows=gs_rows))"
    }
  ],
  "flip-side": [
    {
      "file": "notebooks/flip_lib.py",
      "fn": "headline",
      "note": "Which duels count: dribbles, tackles and ball-carrier challenges with a recorded winner. A foul by the defender is a loss.",
      "code": "def headline(d):\n    return d[d.kind.eq(\"duel\") & d[\"sub\"].isin(HEADLINE) & d.att_spd.notna()].copy()"
    },
    {
      "file": "notebooks/flip_lib.py",
      "fn": "player_table",
      "note": "Per player: recoveries, duels, wins, and wins against fast carriers (15+ km/h).",
      "code": "def player_table(pm, min_matches=3, min_minutes=180):\n    \"\"\"Totals per player (outfield, 3+ matches and 180+ minutes) with every stat the card reads.\"\"\"\n    s = pm.groupby(\"pff_player_id\").agg(player=(\"player_name\", \"last\"), team=(\"team\", \"last\"),\n                                        position=(\"position\", lambda x: x.mode().iat[0]), matches=(\"game_id\", \"nunique\"),\n                                        minutes=(\"minutes\", \"sum\"), **{c: (c, \"sum\") for c in pm.columns if c.startswith((\"n_\", \"res\")) or c == \"opp_touches_on\"})\n    s[\"role\"] = s.position.map(GROUP)\n    s = s[(s.matches >= min_matches) & (s.minutes >= min_minutes) & (s.role != \"goalkeeper\")].copy()\n    per90 = lambda c: s[c] / s.minutes * 90\n    s[\"duels_per90\"] = per90(\"n_duel\")\n    s[\"duel_win_pct\"] = s.n_win / s.n_duel.where(s.n_duel > 0)\n    s[\"duel_above_exp_per100\"] = s.res / s.n_duel.where(s.n_duel > 0) * 100\n    s[\"fast_share\"] = s.n_fast / s.n_duel.where(s.n_duel > 0)\n    s[\"fast_duels_per90\"] = per90(\"n_fast\")\n    s[\"fast_win_pct\"] = s.n_fast_win / s.n_fast.where(s.n_fast > 0)\n    s[\"fast_above_exp_per100\"] = s.res_fast / s.n_fast.where(s.n_fast > 0) * 100\n    s[\"fast_wins_per90\"] = per90(\"n_fast_win\")\n    s[\"fastdrib_win_pct\"] = s.n_fastdrib_win / s.n_fastdrib.where(s.n_fastdrib > 0)\n    s[\"carries_stopped_per90\"] = per90(\"n_carry_stop\")\n    s[\"pass_dis_per90\"] = per90(\"n_pass_dis\")\n    s[\"pass_dis_fast_per90\"] = per90(\"n_pass_dis_fast\")\n    s[\"rec_per90\"] = per90(\"n_rec\")\n    s[\"rec_per100_opp_touches\"] = s.n_rec / s.opp_touches_on * 100\n    s[\"rec_fast_share\"] = s.n_rec_fast / s.n_rec_tracked.where(s.n_rec_tracked > 0)\n    s[\"rec_final_third_per90\"] = per90(\"n_rec_final\")\n    s[\"rec_int_per90\"] = per90(\"n_rec_int\")\n    return s.reset_index()"
    },
    {
      "file": "mockups/PLAYER SCOUTING CARDS/generator/build_cards_v3.py",
      "fn": "the four rows",
      "note": "How the card turns that table into rows and percentiles.",
      "code": "    if is_mid and my_fl is not None:\n        def fl_row(key, label, col, val_fmt, need, judge, n_col=None, minn=None, rng=None, invert=False, n_val=None):\n            v = my_fl[col]\n            n = my_fl[n_col] if n_col else n_val\n            okk = (n is not None and not pd.isna(v) and (minn is None or n >= minn))\n            pool_v = fl[col][(fl[n_col] >= minn)] if (n_col and minn) else fl[col]\n            return row(key, label, val_fmt(v) if not pd.isna(v) else '–', pct_rank(pool_v, v, invert) if okk else None, need, n, rng if okk and rng else '', judge)\n        fr = [\n            fl_row('rec', 'Ball recoveries per 90', 'rec_per90', lambda v: f_num(v), GATE['rec'], False, n_col='n_rec',\n                   rng='{:.1f} – {:.1f}'.format(*poisson(my_fl.n_rec, my_fl.minutes))),\n            fl_row('rec_ft', 'Final-third recoveries per 90', 'rec_final_third_per90', lambda v: f_num(v, 2), GATE['rec_ft'], False,\n                   n_val=round(my_fl.rec_final_third_per90 * my_fl.minutes / 90),\n                   rng='{:.2f} – {:.2f}'.format(*poisson(round(my_fl.rec_final_third_per90 * my_fl.minutes / 90), my_fl.minutes))),\n            fl_row('duel', 'Duel win rate', 'duel_win_pct', lambda v: f_pct(v), GATE['duel'], True, n_col='n_duel', minn=MIN_EVENTS['n_duel'],\n                   rng=rng_p(wilson(my_fl.n_win, my_fl.n_duel))),\n            fl_row('fastwin', 'Win rate vs fast carriers (15+ km/h)', 'fast_win_pct', lambda v: f_pct(v), GATE['fast_win'], True, n_col='n_fast', minn=MIN_EVENTS['n_fast'],\n                   rng=rng_p(wilson(my_fl.n_fast_win, my_fl.n_fast))),\n        ]\n        sections.append(dict(frame=2, title='Flip side and recoveries', sub='winning the ball off players who do things at speed; recoveries are mostly role', rows=fr))\n"
    }
  ],
  "great-actions": [
    {
      "file": "notebooks/profiles_v3.py",
      "fn": "great_actions",
      "note": "Goals, assists, key passes and high-xG shots, each with speed, space and time on the ball attached.",
      "code": "def great_actions():\n    \"\"\"One row per goal / assist / key pass / high-xG shot, with speed, space and time at the action.\"\"\"\n    _, C = xg_naive.fitted()\n    A = loaders.load_pff_actions()\n    S = loaders.load_pff_space()\n    S = S[S.usable & (S.kind == 'action')].dropna(subset=['ref_id'])[['game_id', 'ref_id', 'time_on_ball', 'nearest_m']].drop_duplicates(['game_id', 'ref_id'])\n    A = A[A.usable][['game_id', 'possession_event_id', 'speed_kmh']].drop_duplicates(['game_id', 'possession_event_id'])\n    T = loaders.load_pff_touches()\n    shots = C[['game_id', 'shot_id', 'shooter', 'xg', 'goal']].rename(columns={'shot_id': 'pe', 'shooter': 'player'})\n    shots['kind'] = 'shot'\n    kp = T[T.key_pass][['game_id', 'last_pe_id', 'pff_player_id', 'assist']].rename(columns={'last_pe_id': 'pe', 'pff_player_id': 'player'})\n    kp['kind'] = 'key pass'\n    ev = pd.concat([shots, kp], ignore_index=True)\n    ev = ev.merge(A, left_on=['game_id', 'pe'], right_on=['game_id', 'possession_event_id'], how='left')\n    ev = ev.merge(S, left_on=['game_id', 'pe'], right_on=['game_id', 'ref_id'], how='left')\n    ev['at_speed'] = np.where(ev.speed_kmh.isna(), np.nan, (ev.speed_kmh >= 15).astype(float))\n    ev['space'] = pd.cut(ev.nearest_m, SPACE_BINS, labels=SPACE_LABELS, right=False)\n    ev['time'] = pd.cut(ev.time_on_ball, TIME_BINS, labels=TIME_LABELS, right=False)\n    ev['goal'] = ev.goal.fillna(False).astype(bool)\n    ev['assist'] = ev.assist.fillna(False).astype(bool)\n    return ev"
    },
    {
      "file": "notebooks/profiles_v3.py",
      "fn": "great_table",
      "note": "Counts per action in each speed, space and time band for one player, and for everyone as the thin reference bar.",
      "code": "def great_table(ev, pid):\n    d = ev[ev.player == pid]\n    rows = []\n    for label, sel in (('goals', d.goal & d.kind.eq('shot')), ('assists', d.assist & d.kind.eq('key pass')),\n                       ('key passes', d.kind.eq('key pass')), (f'high-xG shots (xG {HIGH_XG:.2f}+)', d.kind.eq('shot') & (d.xg >= HIGH_XG))):\n        e = d[sel]\n        rows.append({'action': label, 'total': len(e),\n                     'below 15 km/h': int((e.at_speed == 0).sum()), 'at 15+ km/h': int((e.at_speed == 1).sum()), 'speed unknown': int(e.at_speed.isna().sum()),\n                     'tight <3 m': int((e.space == SPACE_LABELS[0]).sum()), 'contested 3-6 m': int((e.space == SPACE_LABELS[1]).sum()), 'free 6+ m': int((e.space == SPACE_LABELS[2]).sum()), 'not tight (3+ m)': int((e.space != SPACE_LABELS[0]).sum() - e.space.isna().sum()),\n                     '<1.5 s': int((e.time == TIME_LABELS[0]).sum()), '1.5-3 s': int((e.time == TIME_LABELS[1]).sum()), '3+ s': int((e.time == TIME_LABELS[2]).sum())})\n    return pd.DataFrame(rows).set_index('action')"
    }
  ]
};
