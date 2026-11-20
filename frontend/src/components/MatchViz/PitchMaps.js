import React from "react";
import styles from "./MatchViz.module.css";

// StatsBomb pitch is 120 x 80; SVG y runs top-down so every y is flipped with 80 - y.
const flipY = y => 80 - y;

/** Pitch outline. With highlightAttackingBox the right-hand 18-yard box is tinted. */
function PitchSvg({ highlightAttackingBox = false, children }) {
  return (
    <svg viewBox="0 0 120 80" className={styles.shotMapSvg}>
      <rect x="0" y="0" width="120" height="80" fill="#f9f9f9" stroke="#888" strokeWidth="0.5" />
      <line x1="60" y1="0" x2="60" y2="80" stroke="#888" strokeWidth="0.5" />
      {/* 18-yard boxes */}
      {highlightAttackingBox ? (
        <rect x="102" y="18" width="18" height="44" fill="rgba(255, 200, 200, 0.3)" stroke="#888" strokeWidth="0.8" />
      ) : (
        <rect x="102" y="18" width="18" height="44" fill="none" stroke="#888" strokeWidth="0.5" />
      )}
      <rect x="0" y="18" width="18" height="44" fill="none" stroke="#888" strokeWidth="0.5" />
      {/* 6-yard boxes */}
      <rect x="0" y="30" width="6" height="20" fill="none" stroke="#888" strokeWidth="0.5" />
      <rect x="114" y="30" width="6" height="20" fill="none" stroke="#888" strokeWidth="0.5" />
      {/* Penalty spots */}
      <circle cx="12" cy="40" r="0.8" fill="#888" />
      <circle cx="108" cy="40" r="0.8" fill="#888" />
      {/* Goals */}
      <rect x="0" y="36" width="0.5" height="8" fill="#333" stroke="#333" strokeWidth="0.3" />
      <rect x="119.5" y="36" width="0.5" height="8" fill="#333" stroke="#333" strokeWidth="0.3" />
      {children}
    </svg>
  );
}

function KeyEventMarker({ event }) {
  if (event.event_type === "red_card") {
    return (
      <rect
        x={event.x - 2.5}
        y={flipY(event.y) - 2.5}
        width="5"
        height="5"
        fill={event.color}
        stroke="black"
        strokeWidth="0.5"
        opacity="0.9"
      >
        <title>{`${event.player}\nRed Card`}</title>
      </rect>
    );
  }
  if (event.event_type === "own_goal") {
    return (
      <g>
        <line x1={event.x - 3} y1={flipY(event.y) - 3} x2={event.x + 3} y2={flipY(event.y) + 3} stroke={event.color} strokeWidth="1.5" />
        <line x1={event.x - 3} y1={flipY(event.y) + 3} x2={event.x + 3} y2={flipY(event.y) - 3} stroke={event.color} strokeWidth="1.5" />
        <title>{`${event.player}\nOwn Goal For`}</title>
      </g>
    );
  }
  const outcome = event.outcome.toLowerCase();
  const cx = event.x;
  const cy = flipY(event.y);
  return (
    <g>
      <circle cx={cx} cy={cy} r="2.5" fill={event.color} stroke="black" strokeWidth="0.3" opacity="0.85">
        <title>{`${event.player}\nxG: ${event.xg}\n${event.outcome}`}</title>
      </circle>

      {(outcome === "woodwork" || outcome === "post" || outcome === "saved to post") && (
        <>
          <line x1={cx - 2} y1={cy - 2} x2={cx + 2} y2={cy + 2} stroke="white" strokeWidth="2" />
          <line x1={cx - 2} y1={cy + 2} x2={cx + 2} y2={cy - 2} stroke="white" strokeWidth="2" />
          <line x1={cx - 2} y1={cy - 2} x2={cx + 2} y2={cy + 2} stroke="black" strokeWidth="0.5" />
          <line x1={cx - 2} y1={cy + 2} x2={cx + 2} y2={cy - 2} stroke="black" strokeWidth="0.5" />
        </>
      )}
      {outcome === "saved" && <circle cx={cx} cy={cy} r="3.5" fill="none" stroke="red" strokeWidth="1.2" />}
      {outcome === "blocked" && (
        <>
          <line x1={cx - 2} y1={cy - 2} x2={cx + 2} y2={cy + 2} stroke="red" strokeWidth="1" />
          <line x1={cx - 2} y1={cy + 2} x2={cx + 2} y2={cy - 2} stroke="red" strokeWidth="1" />
        </>
      )}
      {outcome === "wayward" && (
        <text x={cx} y={cy + 1.5} textAnchor="middle" fontSize="5" fill="purple" fontWeight="bold">?</text>
      )}
    </g>
  );
}

function BoxEntryMarker({ entry }) {
  const color = entry.color || (entry.type === "pass" ? "#2196F3" : "#FF9800");
  return (
    <g>
      <line
        x1={entry.x1}
        y1={flipY(entry.y1)}
        x2={entry.x2}
        y2={flipY(entry.y2)}
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray={entry.type === "pass" ? "2,2" : "0"}
        opacity="0.7"
      />
      <circle cx={entry.x2} cy={flipY(entry.y2)} r="2" fill={color} stroke="black" strokeWidth="0.3" opacity="0.75">
        <title>{entry.type === "pass" ? "Pass into box" : "Carry into box"}</title>
      </circle>
    </g>
  );
}

/** Home and away pitches side by side, one marker per item. */
function TeamPitchPair({ teams, data, highlightAttackingBox, renderMarker }) {
  return (
    <div className={styles.shotMapsGrid}>
      {[teams.home, teams.away].map(team => (
        <div key={team} className={styles.shotMapCard}>
          <div className={styles.shotMapTeamLabel}>{team}</div>
          <PitchSvg highlightAttackingBox={highlightAttackingBox}>
            {(data[team] || []).map((item, i) => (
              <React.Fragment key={i}>{renderMarker(item)}</React.Fragment>
            ))}
          </PitchSvg>
        </div>
      ))}
    </div>
  );
}

/** Key events (shots, red cards, own goals) for one phase, one pitch per team. */
export function PhaseKeyEventsMap({ teams, shotMapData }) {
  return (
    <div className={styles.shotMapsContainer}>
      <h3 className={styles.phaseVisualizationTitle}>Key Events (shots, red cards, own goals)</h3>
      <TeamPitchPair
        teams={teams}
        data={shotMapData}
        renderMarker={event => <KeyEventMarker event={event} />}
      />
      <div className={styles.shotMapLegend}>
        <span><span className={styles.legendDot} style={{ backgroundColor: "green" }}></span> Goal</span>
        <span><span className={styles.legendDot} style={{ backgroundColor: "yellow" }}></span> High xG (≥0.27)</span>
        <span><span className={styles.legendDot} style={{ backgroundColor: "orange" }}></span> Normal xG (0.08-0.27)</span>
        <span><span className={styles.legendDot} style={{ backgroundColor: "black" }}></span> Low xG (&lt;0.08)</span>
        <span><span className={styles.legendSquare}></span> Red Card</span>
        <span><span className={styles.legendX}></span> Own Goal For</span>
      </div>
      <div className={styles.shotOutcomeLegend}>
        <span><span className={styles.legendWhiteX}></span> Woodwork/Post/Saved to Post</span>
        <span><span className={styles.legendRedCircle}></span> Saved</span>
        <span><span className={styles.legendRedX}></span> Blocked</span>
        <span><span className={styles.legendQuestion}></span> Wayward</span>
      </div>
    </div>
  );
}

/** Passes and carries into the box for one phase, one pitch per team. */
export function PhaseBoxEntryMaps({ teams, boxEntryLocations }) {
  return (
    <div className={styles.shotMapsContainer}>
      <h3 className={styles.phaseVisualizationTitle}>Box Entry Maps</h3>
      <TeamPitchPair
        teams={teams}
        data={boxEntryLocations}
        highlightAttackingBox
        renderMarker={entry => <BoxEntryMarker entry={entry} />}
      />
      <div className={styles.shotMapLegend}>
        <span><span className={styles.legendLine} style={{ backgroundColor: "#2196F3", borderStyle: "dashed" }}></span> Pass into box</span>
        <span><span className={styles.legendLine} style={{ backgroundColor: "#FF9800" }}></span> Carry into box</span>
      </div>
      <div className={styles.shotOutcomeLegend}>
        <span><span className={styles.legendDot} style={{ backgroundColor: "#00C853" }}></span> → Goal</span>
        <span><span className={styles.legendDot} style={{ backgroundColor: "#69F0AE" }}></span> → Own Goal</span>
        <span><span className={styles.legendDot} style={{ backgroundColor: "#FFF59D" }}></span> → Shot</span>
      </div>
    </div>
  );
}
