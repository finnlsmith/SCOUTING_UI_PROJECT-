import React, { useState } from "react";
import { useParams } from "react-router-dom";
import useApi from "../hooks/useApi";
import { CardFrame, Panel } from "./PlayerCard";
import { chapterById } from "./chapters";
import { CHAPTER_CONTENT } from "./chapterContent";
import { CHAPTER_CODE } from "./chapterCode";
import { Arithmetic, RankBlock } from "./chapterBits";
import CodeBlock from "./CodeBlock";
import ComingSoonPage from "./ComingSoonPage";
import GreatActionsPage from "./GreatActionsPage";
import styles from "./PlayersPage.module.css";

const DEFAULT_CARD = "enzo_fernandez";
const groupWord = peers => (peers === "Midfielders" ? "midfielders" : "attackers");

/** Short "N events" text for the try-another table. */
const events = r => (r.n == null ? "–" : r.n);

export function TryAnother({ chapter, peers, defaultId }) {
  const list = useApi("/players/rows/players");
  const [picked, setPicked] = useState(null);
  const players = (list.data || []).filter(p => p.peers === peers);
  const id = picked != null && players.some(p => p.pff_player_id === picked) ? picked : defaultId;
  const rows = useApi(id ? `/players/${id}/rows` : null);
  const word = groupWord(peers);

  if (list.loading) return <p className={styles.muted}>Loading players…</p>;
  if (list.error) return <p className={styles.error}>Could not load players ({list.error}).</p>;
  const mine = rows.data ? chapter.covers.map(label => rows.data.rows.find(r => r.label === label)).filter(Boolean) : [];
  return (
    <div>
      <label className={styles.pickerLabel}>
        Player{" "}
        <select className={styles.picker} aria-label="Select a player" value={id ?? ""} onChange={e => setPicked(Number(e.target.value))}>
          {players.map(x => <option key={x.pff_player_id} value={x.pff_player_id}>{x.name}</option>)}
        </select>
      </label>
      <p className={styles.muted}>{word[0].toUpperCase() + word.slice(1)} with 4+ matches, as on the cards.</p>
      {rows.error && <p className={styles.error}>Could not load this player ({rows.error}).</p>}
      {mine.length > 0 && (
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr><th>Row</th><th>Value</th><th>Percentile</th><th>Events</th></tr></thead>
            <tbody>
              {mine.map(r => (
                <tr key={r.label}>
                  <td>{r.label}</td><td>{r.val}</td>
                  <td>{r.percentile == null ? "not ranked" : r.percentile}</td><td>{events(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChapterBody({ chapter, content }) {
  const slug = content.example || DEFAULT_CARD;
  const cardReq = useApi(`/players/card/${slug}`);
  const card = cardReq.data;
  const rowsReq = useApi(card ? `/players/${card.pff_player_id}/rows` : null);
  const data = rowsReq.data;
  const error = cardReq.error || rowsReq.error;
  const first = card ? card.name.split(" ")[0] : "";

  // card panels that contain this chapter's rows
  let panels = [];
  if (card) {
    if (chapter.id === "standard-stats") {
      panels = [{ title: "Standard stats", sub: "the numbers everyone quotes",
        rows: card.std.map(x => ({ label: x.label, val: x.big, pct: x.pct, judge: true, settled: true, np: false, meta: x.sub })) }];
    } else {
      panels = card.sections.filter(s => s.rows.some(r => chapter.covers.includes(r.label)));
    }
  }
  const rows = data ? chapter.covers.map(l => data.rows.find(r => r.label === l)).filter(Boolean) : [];

  return (
    <div>
      <h1 className={styles.title}>{chapter.title}</h1>
      <p className={styles.intro}>{content.intro} Data: PFF FC, 2022 World Cup.</p>
      {content.exampleNote && <p className={styles.muted}>{content.exampleNote}</p>}

      {cardReq.loading && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.error}>Could not load the example ({error}). Is the backend running?</p>}

      {card && data && (
        <>
          <h2 className={styles.h2}>1. On the card</h2>
          {panels.map(p => (
            <div key={p.title} className={styles.cardMini}>
              <CardFrame>
                <div className={styles.cardMiniPad}>
                  <Panel title={p.title} sub={p.sub} rows={p.rows} games={card.games} linkRows={false} highlightLabel={chapter.covers} />
                </div>
              </CardFrame>
            </div>
          ))}
          <dl className={styles.parts}>
            {chapter.covers.map(l => (
              <div key={l}><dt>{l}</dt><dd>{content.means[l]}</dd></div>
            ))}
          </dl>

          <h2 className={styles.h2}>2. How it is measured</h2>
          <ul className={styles.rules}>{content.measured.map(m => <li key={m}>{m}</li>)}</ul>

          <h2 className={styles.h2}>3. Why {first} gets {rows.length > 1 ? "these numbers" : "this number"}</h2>
          {rows.map(r => (
            <div key={r.label}>
              <h3 className={styles.h3}>{r.label}: {r.val}</h3>
              <Arithmetic row={r} player={data.player} />
              {content.how && content.how[r.label] && <p className={styles.explain}>{content.how[r.label]}</p>}
              <RankBlock row={r} player={data.player} group={groupWord(data.player.peers)} />
            </div>
          ))}
          {content.caution && <p className={styles.caution}><b>Can't tell:</b> {content.caution}</p>}

          <h2 className={styles.h2}>4. Try another {data.player.peers === "Midfielders" ? "midfielder" : "attacker"}</h2>
          <TryAnother chapter={chapter} peers={data.player.peers} defaultId={data.player.pff_player_id} />
        </>
      )}

      <h2 className={styles.h2}>{card && data ? "5" : "2"}. The code</h2>
      <p className={styles.muted}>Real code from the Playing at Speed project, copied as is.</p>
      {(CHAPTER_CODE[chapter.id] || []).map(c => <CodeBlock key={c.fn} {...c} />)}
    </div>
  );
}

/** Route target for every drafted chapter. Unwritten chapters fall back to the placeholder. */
export default function ChapterPage() {
  const { chapter: id } = useParams();
  const chapter = chapterById(id);
  if (chapter && id === "great-actions") return <GreatActionsPage chapter={chapter} />;
  const content = CHAPTER_CONTENT[id];
  if (!chapter || !content || chapter.status === "soon") return <ComingSoonPage />;
  return <ChapterBody chapter={chapter} content={content} />;
}
