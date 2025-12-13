/**
 * Helper function to format stats object into Scoreboard component props
 */
export function formatScoreboardProps(stats) {
  return {
    stage: stats.competition_stage,
    home: stats.home_team,
    away: stats.away_team,
    score:
      Number.isFinite(stats.home_score) && Number.isFinite(stats.away_score)
        ? `${stats.home_score} - ${stats.away_score}`
        : "-",
    shots:
      stats.home_shots !== null &&
      stats.away_shots !== null &&
      stats.home_shots !== undefined &&
      stats.away_shots !== undefined
        ? `${stats.home_shots} - ${stats.away_shots}`
        : "-",
    shotsOnTarget:
      stats.home_shots_on_target !== null &&
      stats.away_shots_on_target !== null &&
      stats.home_shots_on_target !== undefined &&
      stats.away_shots_on_target !== undefined
        ? `${stats.home_shots_on_target} - ${stats.away_shots_on_target}`
        : "-",
    xg: stats.home_xg_sum && stats.away_xg_sum ? `${stats.home_xg_sum} - ${stats.away_xg_sum}` : "-",
    bigChances:
      Number.isFinite(stats.home_big_chances) && Number.isFinite(stats.away_big_chances)
        ? `${stats.home_big_chances} - ${stats.away_big_chances}`
        : "-",
    okChances:
      Number.isFinite(stats.home_ok_chances) && Number.isFinite(stats.away_ok_chances)
        ? `${stats.home_ok_chances} - ${stats.away_ok_chances}`
        : "-",
    fouls:
      Number.isFinite(stats.home_fouls) && Number.isFinite(stats.away_fouls)
        ? `${stats.home_fouls} - ${stats.away_fouls}`
        : "-",
    cardsLeft:
      Number.isFinite(stats.home_cards_total) &&
      Number.isFinite(stats.home_cards_yellow) &&
      Number.isFinite(stats.home_cards_red)
        ? `${stats.home_cards_total} (${stats.home_cards_yellow}/${stats.home_cards_red})`
        : "-",
    cardsRight:
      Number.isFinite(stats.away_cards_total) &&
      Number.isFinite(stats.away_cards_yellow) &&
      Number.isFinite(stats.away_cards_red)
        ? `${stats.away_cards_total} (${stats.away_cards_yellow}/${stats.away_cards_red})`
        : "-",
    boxEntries:
      Number.isFinite(stats.home_box_entries) && Number.isFinite(stats.away_box_entries)
        ? `${stats.home_box_entries} - ${stats.away_box_entries}`
        : "-",
  };
}

