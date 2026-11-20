import React, { useState } from "react";
import useApi from "../hooks/useApi";
import { TechniqueOnCard, TechniqueMeasured } from "./TechniqueParts";
import TechniqueWhy from "./TechniqueWhy";
import CodeBlock from "./CodeBlock";
import { TECHNIQUE_CODE } from "./techniqueCode";
import styles from "./PlayersPage.module.css";

const EXAMPLE_CARD = "enzo_fernandez";
const ROWS = [
  ["one_touch", "Played first time"], ["kept", "First touch kept"], ["ft_pass", "First-time pass completion"],
  ["pass", "Pass completion"], ["pass_fast", "Pass completion at 15+ km/h"],
];
const pc = v => (v == null ? "–" : `${(v * 100).toFixed(1)}%`);

function TryAnother({ group, defaultId }) {
  const list = useApi("/players/technique/players");
  const [picked, setPicked] = useState(null);
  const players = (list.data || []).filter(p => p.peers === group);
  const id = picked != null && players.some(p => p.pff_player_id === picked) ? picked : defaultId;
  const p = players.find(x => x.pff_player_id === id);
  const noun = group === "Midfielders" ? "midfielders" : "attackers";

  if (list.loading) return <p className={styles.muted}>Loading players…</p>;
  if (list.error) return <p className={styles.error}>Could not load players ({list.error}).</p>;
  return (
    <div>
      <label className={styles.pickerLabel}>
        Player{" "}
        <select className={styles.picker} aria-label="Select a player" value={id ?? ""} onChange={e => setPicked(Number(e.target.value))}>
          {players.map(x => <option key={x.pff_player_id} value={x.pff_player_id}>{x.name}</option>)}
        </select>
      </label>
      <p className={styles.muted}>{noun[0].toUpperCase() + noun.slice(1)} with 4+ matches, as on the cards.</p>
      {p && (
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr><th>Row</th><th>Value</th><th>Percentile</th><th>Events</th></tr></thead>
            <tbody>
              {ROWS.map(([k, label]) => (
                <tr key={k}>
                  <td>{label}</td>
                  <td>{pc(p[`${k}_value`])}</td>
                  <td>{p[`${k}_pct`] == null ? "not ranked" : p[`${k}_pct`]}</td>
                  <td>{p[`${k}_n`]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Chapter: Tempo and technique. */
export default function TechniquePage() {
  const cardReq = useApi(`/players/card/${EXAMPLE_CARD}`);
  const card = cardReq.data;
  const techReq = useApi(card ? `/players/${card.pff_player_id}/technique` : null);
  const tech = techReq.data;
  const error = cardReq.error || techReq.error;

  return (
    <div>
      <h1 className={styles.title}>Tempo and technique</h1>
      <p className={styles.intro}>
        How a player deals with the ball when it arrives, and how well he passes it on. Data: PFF FC, 2022 World Cup.
      </p>

      {(cardReq.loading || techReq.loading) && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.error}>Could not load the example ({error}). Is the backend running?</p>}

      {card && tech && (
        <>
          <h2 className={styles.h2}>1. On the card</h2>
          <TechniqueOnCard card={card} tech={tech} />

          <h2 className={styles.h2}>2. How it is measured</h2>
          <TechniqueMeasured card={card} tech={tech} />

          <h2 className={styles.h2}>3. Why {card.name.split(" ")[0]} gets these numbers</h2>
          <TechniqueWhy tech={tech} />

          <h2 className={styles.h2}>4. Try another {tech.peer_group === "Midfielders" ? "midfielder" : "attacker"}</h2>
          <TryAnother group={tech.peer_group} defaultId={tech.player.pff_player_id} />
        </>
      )}

      <h2 className={styles.h2}>5. The code</h2>
      <p className={styles.muted}>Real code from the Playing at Speed project, copied as is.</p>
      {["flag", "count", "rows"].map(k => <CodeBlock key={k} {...TECHNIQUE_CODE[k]} />)}
    </div>
  );
}
