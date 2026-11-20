/**
 * Text for each drafted chapter. Concise on purpose: how the row is made, and why.
 * `means` = one line per card row. `measured` = the rules. `caution` = what the data cannot say.
 * `example` = the card used for the chapter (goal-side rows are for forwards, so it uses an attacker).
 */
export const CHAPTER_CONTENT = {
  "standard-stats": {
    intro: "The numbers everyone quotes, ranked per 90 minutes.",
    means: {
      "Goals": "Shots that went in.",
      "Assists": "The pass that led directly to a goal.",
      "Key passes": "Passes that led directly to a shot.",
      "High-xG shots": "Shots with a naive xG of 0.15 or more: about the top fifth of open-play shots.",
    },
    measured: [
      "Counted from PFF's event data: goals, assists, key passes and shots.",
      "The percentile is on the per-90 rate (count ÷ minutes × 90) among peers, not on the raw count.",
      "PFF has no xG field, so xG comes from a simple model of shot distance and angle (AUC 0.71 out of sample).",
    ],
    caution: "These counts are tiny. One goal or assist moves the percentile a lot, and many players have none.",
  },
  "touches": {
    intro: "How often he is on the ball.",
    means: { "Touches per 90": "How many times he got the ball and did something with it, per 90 minutes." },
    measured: [
      "A touch is one PFF game event on the ball in open play: a pass, shot, dribble, carry or clearance. A run of touches inside one event counts once.",
      "Each touch is placed at the first moment he had the ball. Only touches with a known position and nearest opponent count.",
      "Per 90 = touches ÷ minutes played × 90.",
    ],
    caution: "Style, not quality. It mostly reflects position and how much his team has the ball.",
  },
  "time-on-ball": {
    intro: "How much time the game gives him.",
    means: { "Moments with 2+ s on the ball": "Of the moments he had the ball, how many gave him 2+ seconds before the nearest opponent could reach him." },
    measured: [
      "A moment is a reception or an on-ball action, with tracking.",
      "At each moment, for every opponent: how long to reach him if he keeps his velocity for 0.7 s, then runs straight at him at 5 m/s. The smallest time is his time on the ball (model from Friends of Tracking, after Spearman 2018).",
      "The row is the share of moments with 2+ s.",
    ],
    caution: "Context, not quality. It depends on how the opponent presses and how his team plays, as much as on him.",
  },
  "action-volume": {
    intro: "What he attempts, not just what he completes.",
    means: {
      "Shots attempted, per 90": "Open-play shots, per 90.",
      "Crosses attempted, per 90": "Open-play crosses, per 90.",
      "Line-breaking passes, per 90": "Passes that break at least one line of opposition players, per 90.",
      "Line-breaking pass completion": "Of those passes, how many were completed.",
      "Cross completion": "Of his crosses, how many were completed.",
    },
    measured: [
      "Open play only. Attempts count whether or not they come off.",
      "A line-breaking pass is one PFF marks as breaking at least one defensive line (linesBrokenType).",
      "Completion rows need 15+ attempts to be ranked; below that the card shows a dash.",
    ],
    caution: "Shots and crosses per 90 are small counts, so ranks swing on one or two attempts.",
  },
  "phone-booth": {
    intro: "Receiving with an opponent right on him.",
    means: {
      "Receptions in the booth, per 90": "How often he gets the ball in the booth, per 90.",
      "Progressive (of decisions)": "Of his decisions there, how many moved the ball on: a completed pass gaining 10+ m or breaking a line, a completed cross, a shot, or a won dribble.",
      "Kept, no progress": "He kept the ball without progressing it.",
      "Lost": "He lost the ball. Lower is better.",
    },
    measured: [
      "The booth: from the back of the middle third to 25 m from goal, with an opponent within 3 m at the moment he gets the ball.",
      "Each touch there is progressive, kept or lost. Clearances and loose touches are left out of the three shares but still count as receptions.",
      "The shares need 15+ decisions to be ranked.",
    ],
    caution: "The strip added in the widened zone is slightly harder for the receiver (10.5% progressive, 33% lost).",
  },
  "free-space": {
    intro: "Touches with room, and what he does with it.",
    means: {
      "Free receptions per 100 team touches": "How often he is the one who gets the ball in space, against how much his team had it while he was on.",
      "Touches taken in free space": "The share of his touches with no defender within 6 m.",
      "Progressive (of free-space decisions)": "Of his decisions in free space, how many moved the ball on.",
      "Lost (of free-space decisions)": "How often he lost the ball in free space. Lower is better.",
      "Chances from free space, per 90": "Shots, key passes and completed crosses taken from free space, per 90.",
    },
    measured: [
      "Free space: no opponent within 6 m when he gets the ball.",
      "Volume comes first. What he does with the space is a separate skill, so it is shown in separate rows.",
      "The outcome shares need 15+ decisions to be ranked.",
    ],
    how: { "Free receptions per 100 team touches": "His free-space receptions ÷ his team's touches while he was on the pitch (approximated from minutes) × 100." },
    caution: "Getting into space also depends on how the opposition defends, not only on him.",
  },
  "ball-holding": {
    intro: "How long he keeps the ball.",
    means: {
      "Long holds (share of his actions)": "The share of his actions that took 4+ touches or 3+ seconds on the ball.",
      "Very long holds (share of his actions)": "The same with 6+ touches or 3.7+ seconds.",
      "Touches per action": "The average number of touches before he releases the ball.",
      "Idle holds (of free-space actions)": "A long hold with no defender within 6 m, as a share of his free-space actions. Lower is better.",
    },
    measured: [
      "One row per release of the ball: a pass, cross, shot, dribble or carry.",
      "Touches come from the possession; seconds on the ball from the time-on-ball model.",
      "A long hold is about the top 15–20% of all actions; a very long hold about the top 5%.",
      "Needs 40+ actions to be ranked (15+ free-space actions for the idle share).",
    ],
    how: { "Touches per action": "All the touches in his actions ÷ the number of actions." },
    caution: "Dribblers read as holders by touch count, so compare within role. The cost of a long hold shows only when he starts in free space, and nothing here measures team-level flow.",
  },
  "goal-side": {
    intro: "Receiving closer to goal than the nearest defender. For forwards.",
    example: "kylian_mbappe",
    exampleNote: "Goal-side rows are not on a midfielder's card, so this chapter uses Kylian Mbappé.",
    means: {
      "Goal-side receptions, per 90": "Times he got the ball closer to goal than the nearest outfield opponent, per 90.",
      "Touches that are goal-side": "The share of his touches where that was true.",
      "Progressive from goal-side touches": "Of those touches, how many moved the ball on.",
    },
    measured: [
      "At each touch: the nearest outfield opponent's distance to goal minus his own. Positive means he is closer to goal. The goalkeeper is left out.",
      "It is a distance test, not a defensive-line test: it says where he stood, not that he ran in behind.",
      "The share needs 20+ touches; the progressive share needs 15+ goal-side decisions.",
    ],
    caution: "A winger beside a full-back near the byline can count. 'Last man' is rare and unstable, so it is not on the card.",
  },
  "flip-side": {
    intro: "Winning the ball back.",
    means: {
      "Ball recoveries per 90": "Times he won the ball back, per 90. Mostly down to role.",
      "Final-third recoveries per 90": "Recoveries in the opponent's final third, per 90.",
      "Duel win rate": "Dribbles, tackles and ball-carrier challenges he won as the defender.",
      "Win rate vs fast carriers (15+ km/h)": "The same, against opponents arriving at 15+ km/h.",
    },
    measured: [
      "Duels are PFF challenge types dribble, tackle and ball-carrier challenge, with a recorded winner. A foul by the defender is a loss.",
      "Fast carrier: the opponent's speed coming into the duel is 15+ km/h (the larger of his speed at the event and 0.5 s earlier). It needs him on camera, about 70% of duels.",
      "Duel win rate needs 10+ duels; the fast-carrier rate needs 6+.",
    ],
    caution: "Recoveries are mostly role. The fast-carrier row rests on a few duels, so treat it as a hint.",
  },
};
