/**
 * The chapters of the Players section: one per element (or small group of elements) on the player card.
 * The side contents list, the routes and the clickable card all read this one list.
 *
 * status: "ready" = the chapter page is written; "soon" = shows a placeholder listing what it will cover.
 * `sections` maps a card section title to its chapter; `rows` overrides that for single rows.
 */
export const CHAPTERS = [
  { group: "standard", id: "standard-stats", title: "Standard stats", status: "ready",
    blurb: "Goals, assists, key passes and high-xG shots: the numbers everyone quotes.",
    covers: ["Goals", "Assists", "Key passes", "High-xG shots"] },
  { group: "speed", id: "pace", title: "Playing at speed", status: "ready",
    blurb: "How often he acts at 15 km/h or faster.",
    covers: ["Actions at 15+ km/h (pace)"] },
  { group: "speed", id: "tempo-and-technique", title: "Tempo and technique", status: "ready",
    blurb: "Playing first time, first touch, and passing at speed.",
    covers: ["Played first time (tempo)", "First touch kept", "First-time pass completion", "Pass completion", "Pass completion at 15+ km/h"] },
  { group: "speed", id: "phone-booth", title: "Phone booth", status: "ready",
    blurb: "Receiving with an opponent within 3 m, and what he does next.",
    covers: ["Receptions in the booth, per 90", "Progressive (of decisions)", "Kept, no progress", "Lost"] },
  { group: "speed", id: "ball-holding", title: "Ball holding", status: "ready",
    blurb: "Long holds of the ball, and idle holds when nobody is near.",
    covers: ["Long holds (share of his actions)", "Very long holds (share of his actions)", "Touches per action", "Idle holds (of free-space actions)"] },
  { group: "time", id: "time-on-ball", title: "Time on the ball", status: "ready",
    blurb: "How much time the game gives him: moments with 2+ seconds on the ball.",
    covers: ["Moments with 2+ s on the ball"] },
  { group: "time", id: "free-space", title: "Free space", status: "ready",
    blurb: "Touches with no defender within 6 m, and what he does with them.",
    covers: ["Free receptions per 100 team touches", "Touches taken in free space", "Progressive (of free-space decisions)", "Lost (of free-space decisions)", "Chances from free space, per 90"] },
  { group: "volume", id: "touches", title: "Touches", status: "ready",
    blurb: "How involved he is: touches per 90 minutes.",
    covers: ["Touches per 90"] },
  { group: "volume", id: "action-volume", title: "Action volume", status: "ready",
    blurb: "Attempts, not just completions: shots, crosses and line-breaking passes.",
    covers: ["Shots attempted, per 90", "Crosses attempted, per 90", "Line-breaking passes, per 90", "Line-breaking pass completion", "Cross completion"] },
  { group: "defending", id: "flip-side", title: "Flip side and recoveries", status: "ready", midfieldersOnly: true,
    blurb: "Winning the ball back, including off players who carry it at speed. Midfielders only.",
    covers: ["Ball recoveries per 90", "Final-third recoveries per 90", "Duel win rate", "Win rate vs fast carriers (15+ km/h)"] },
  { group: "great", id: "great-actions", title: "Great actions", status: "ready",
    blurb: "Goals, assists, key passes and high-xG shots, split by speed, space and time on the ball.",
    covers: ["Great actions table"] },
  { group: "off", id: "goal-side", title: "Goal-side", status: "ready", forwardsOnly: true,
    blurb: "Receiving closer to goal than the nearest defender. Forwards only, so it is not part of this card.",
    covers: ["Goal-side receptions, per 90", "Touches that are goal-side", "Progressive from goal-side touches"] },
];

/** How the chapters are grouped in the contents list. `muted` groups are shown greyed out. */
export const GROUPS = [
  { id: "standard", title: "Standard stats" },
  { id: "speed", title: "Playing at speed" },
  { id: "time", title: "Time on the ball and space" },
  { id: "volume", title: "Volume" },
  { id: "defending", title: "Defending" },
  { id: "great", title: "Great actions" },
  { id: "off", title: "Not on this card", muted: true },
];
export const chapterById = id => CHAPTERS.find(c => c.id === id);

// Card section title -> chapter id. Single rows can override (see ROW_OVERRIDES).
const SECTION_TO_CHAPTER = {
  "Standard stats": "standard-stats",
  "What the game gave him": "time-on-ball",
  "Technique": "tempo-and-technique",
  "Action volume": "action-volume",
  "Phone booth": "phone-booth",
  "Free space": "free-space",
  "Ball holding": "ball-holding",
  "Goal-side": "goal-side",
  "Flip side and recoveries": "flip-side",
};
const ROW_OVERRIDES = {
  "Touches per 90": "touches",
  "Actions at 15+ km/h (pace)": "pace",
  "Chances from free space, per 90": "free-space",
};

export function chapterForRow(sectionTitle, rowLabel) {
  return ROW_OVERRIDES[rowLabel] || SECTION_TO_CHAPTER[sectionTitle] || null;
}
export const chapterForSection = title => SECTION_TO_CHAPTER[title] || null;

export const chapterPath = id => `/players/${id}`;
