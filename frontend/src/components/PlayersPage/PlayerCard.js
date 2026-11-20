import React, { useState } from "react";
import { Link } from "react-router-dom";
import { chapterById, chapterForRow, chapterForSection, chapterPath } from "./chapters";
import styles from "./PlayerCard.module.css";

// The card's three views, as on the printed card.
const TABS = [
  { id: "profile", label: "Profile" },
  { id: "booth", label: "Booth, free space and holding" },
  { id: "great", label: "Great actions" },
];

const tone = r => (!r.judge ? "ne" : r.pct >= 67 ? "hi" : r.pct >= 34 ? "mid" : "lo");

function Status({ row, games }) {
  if (row.settled) return <em className={styles.ok}>Settled</em>;
  if (row.np) return <em className={styles.nr}>Too few events to rank</em>;
  return <em className={styles.wait}>Needs ~{row.need} matches, has {games}</em>;
}

/** One row of the card. The whole row links to the chapter that explains it. */
function Row({ row, section, games, link = true, highlight = false }) {
  const chapterId = link ? chapterForRow(section, row.label) : null;
  const chapter = chapterId && chapterById(chapterId);
  const t = tone(row);
  const meta = row.meta
    ? <>{row.meta}</>
    : <>
        {[row.rng ? `90% range ${row.rng}` : "", row.n != null ? `${row.n} events` : ""].filter(Boolean).join(" · ")}
        {(row.rng || row.n != null) && " · "}
        <Status row={row} games={games} />
      </>;

  const body = (
    <>
      <div className={styles.lab}>
        {row.label}
        <small>{meta}</small>
      </div>
      <div className={styles.bar} aria-hidden="true">
        <div className={styles.gl} style={{ left: "25%" }} />
        <div className={`${styles.gl} ${styles.glMid}`} style={{ left: "50%" }} />
        <div className={styles.gl} style={{ left: "75%" }} />
        {!row.np && <div className={`${styles.fl} ${styles[`fl_${t}`]}`} style={{ width: `${row.pct}%` }} />}
      </div>
      <div className={`${styles.chip} ${row.np ? styles.chipNp : styles[`chip_${t}`]}`}>{row.np ? "–" : row.pct}</div>
      <div className={styles.val}>{row.val}</div>
    </>
  );
  const cls = `${styles.row} ${row.settled ? "" : styles.unsettled} ${row.judge && row.pct >= 67 ? styles.strong : ""} ${highlight ? styles.highlight : ""}`;

  return chapter ? (
    <Link
      to={chapterPath(chapter.id)}
      className={`${cls} ${styles.rowLink}`}
      aria-label={`${row.label}: ${row.val}. Open the ${chapter.title} chapter${chapter.status === "soon" ? " (not written yet)" : ""}`}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Panel({ title, sub, rows, games, linkTo, linkRows = true, highlightLabel }) {
  const chapter = linkTo && chapterById(linkTo);
  return (
    <div className={styles.panel}>
      <div className={styles.ph}>
        {chapter
          ? <Link to={chapterPath(chapter.id)} className={styles.phTitle}>{title}</Link>
          : <b className={styles.phTitle}>{title}</b>}
        <span>{sub}</span>
        {chapter && chapter.status === "ready" && <span className={styles.tag}>explained</span>}
        {chapter && chapter.status === "draft" && <span className={styles.tag}>draft</span>}
      </div>
      {rows.map(r => <Row key={r.label} row={r} section={title} games={games} link={linkRows} highlight={Array.isArray(highlightLabel) ? highlightLabel.includes(r.label) : r.label === highlightLabel} />)}
    </div>
  );
}

/** The card's dark frame and colour variables, for showing part of a card elsewhere. */
export function CardFrame({ children }) {
  return <div className={styles.card}>{children}</div>;
}

const SPLIT = [
  ["Speed", ["Under 15 km/h", "15+ km/h", "Unknown"], "speed"],
  ["Space at the action", ["Under 3 m", "3 m or more", "Unknown"], "space"],
  ["Time on the ball", ["Under 1.5 s", "1.5–3 s", "3+ s", "Unknown"], "time"],
];

function SplitBar({ values, cls }) {
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <div className={`${styles.sb} ${cls || ""}`}>
      {total
        ? values.map((x, i) => (x ? <div key={i} className={styles[`s${i}`]} style={{ flex: x }}>{cls ? "" : x}</div> : null))
        : <div className={styles.sbZero}>none</div>}
    </div>
  );
}

export function GreatActions({ card }) {
  return (
    <>
      <div className={styles.panel}>
        <div className={styles.gaScroll}>
          <table className={styles.ga}>
            <thead>
              <tr>
                <th>Great action</th>
                <th className={styles.gaC}>Total</th>
                {SPLIT.map(([name, labels]) => (
                  <th key={name}>
                    {name}
                    <div className={styles.lg2}>{labels.map((l, i) => <span key={l}><i className={styles[`s${i}`]} />{l}</span>)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {card.great.rows.map(r => {
                const label = r.action.replace(/ \(.*/, "");
                return (
                  <tr key={r.action}>
                    <td className={styles.gaAct}>
                      {label[0].toUpperCase() + label.slice(1)}
                      {r.action.includes("xG") && <small>xG 0.15 and above (top ~22% of shots)</small>}
                    </td>
                    <td className={styles.gaTot}>{r.me.total}</td>
                    {SPLIT.map(([name, , key]) => (
                      <td key={name}>
                        <SplitBar values={r.me[key]} />
                        <SplitBar values={r.ref[key]} cls={styles.sbRef} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className={styles.note}>
        <b>Top bar: this player's actions. Thin bar below: all World Cup players' actions of that kind,</b> for comparison. Counts, not percentiles:
        one player has too few of these to rank. Space and time are measured at the action; speed is unknown for about 30% of events and is shown, not dropped.
        High-xG uses a simple naive xG (distance and angle), because PFF has no xG field.
      </p>
    </>
  );
}

/**
 * The player card, rebuilt from the card generator's data. Every row and section title is a link to the
 * chapter that explains it. `card` is the JSON from /api/players/card/<slug>.
 */
export default function PlayerCard({ card }) {
  const [tab, setTab] = useState("profile");
  const S = card.sections;
  const by = (frame, names) => S.filter(s => s.frame === frame && names.some(n => s.title.startsWith(n)));
  const settled = S.reduce((a, s) => a + s.rows.filter(r => r.settled).length, 0);
  const total = S.reduce((a, s) => a + s.rows.length, 0);
  const initials = card.name.split(" ").map(w => w[0]).slice(0, 2).join("");

  const std = {
    title: "Standard stats", sub: "the numbers everyone quotes",
    rows: card.std.map(x => ({ label: x.label, val: x.big, pct: x.pct, judge: true, settled: true, np: false, meta: x.sub })),
  };
  const panel = s => <Panel key={s.title} title={s.title} sub={s.sub} rows={s.rows} games={card.games} linkTo={chapterForSection(s.title)} />;

  const left = tab === "profile" ? [std, ...by(1, ["Action volume"])] : by(2, ["Phone", "Free"]);
  const right = tab === "profile" ? by(1, ["How", "What", "Technique"]) : by(2, ["Flip", "Ball", "Goal"]);

  return (
    <div className={styles.card}>
      <div className={styles.band}>
        <div className={styles.badge}>{initials}</div>
        <div className={styles.who}>
          <h2 className={styles.name}>{card.name}</h2>
          <div className={styles.sub}>{card.pos} · {card.source}</div>
        </div>
        <div className={styles.pills}>
          <div className={styles.pill}><small>Matches</small><b>{card.games}</b></div>
          <div className={styles.pill}><small>Minutes</small><b>{card.minutes}</b></div>
          <div className={styles.pill}><small>Settled stats</small><b>{settled} / {total}</b></div>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Card views">
        {TABS.map(t => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
            className={tab === t.id ? styles.tabOn : styles.tab} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.legend}>
        <span className={styles.peers}>Compared with {card.peers}</span>
        <span><i className={styles.sq} style={{ background: "var(--hi)" }} />strong</span>
        <span><i className={styles.sq} style={{ background: "var(--mid)" }} />average</span>
        <span><i className={styles.sq} style={{ background: "var(--lo)" }} />weak</span>
        <span><i className={styles.sq} style={{ background: "var(--neu)" }} />style and context, not good or bad</span>
      </div>

      {tab === "great" ? (
        <GreatActions card={card} />
      ) : (
        <div className={styles.cols}>
          <div className={styles.col}>{left.map(panel)}</div>
          <div className={styles.col}>{right.map(panel)}</div>
        </div>
      )}

      <div className={styles.foot}>
        <span>Percentile among peers. Lines mark 25, 50 and 75. Hatched means not enough matches yet to settle. Click any row to see how it is measured.</span>
        <span>{card.source}</span>
      </div>
    </div>
  );
}
