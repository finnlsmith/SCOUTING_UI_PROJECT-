import React from "react";
import useApi from "../hooks/useApi";
import PaceOnCard from "./PaceOnCard";
import PaceDemo from "./PaceDemo";
import { PaceWhyValue, PaceWhyPercentile } from "./PaceWhy";
import PacePlayer from "./PacePlayer";
import CodeBlock from "./CodeBlock";
import { PACE_CODE } from "./paceCode";
import styles from "./PlayersPage.module.css";

const EXAMPLE_CARD = "enzo_fernandez";

/** Chapter: Pace. Starts from the pace row on the example card, then explains how it is measured and why the player gets his numbers. */
export default function PacePage() {
  const cardReq = useApi(`/players/card/${EXAMPLE_CARD}`);
  const card = cardReq.data;
  const paceReq = useApi(card ? `/players/${card.pff_player_id}/pace` : null);
  const pace = paceReq.data;
  const first = card ? card.name.split(" ")[0] : "";

  return (
    <div>
      <h1 className={styles.title}>Playing at speed</h1>
      <p className={styles.intro}>
        How often a player is already moving fast when he does something with the ball. Data: PFF FC, 2022 World Cup.
      </p>

      <h2 className={styles.h2}>1. On the card</h2>
      {(cardReq.loading || paceReq.loading) && <p className={styles.muted}>Loading…</p>}
      {(cardReq.error || paceReq.error) && <p className={styles.error}>Could not load the example ({cardReq.error || paceReq.error}). Is the backend running?</p>}
      {card && pace && <PaceOnCard card={card} pace={pace} />}

      <h2 className={styles.h2}>2. How it is measured</h2>
      <PaceDemo />

      {pace && (
        <>
          <h2 className={styles.h2}>3. Why {first} gets {Math.round(pace.player.pace_share * 100)}%</h2>
          <PaceWhyValue pace={pace} />

          <h2 className={styles.h2}>4. Why the {pace.player.percentile}{ordinalSuffix(pace.player.percentile)} percentile</h2>
          <PaceWhyPercentile pace={pace} />
        </>
      )}

      {pace && (
        <>
          <h2 className={styles.h2}>5. Try another {pace.peer_group.name === "Midfielders" ? "midfielder" : "attacker"}</h2>
          <PacePlayer group={pace.player.peers} />
        </>
      )}

      <h2 className={styles.h2}>6. The code</h2>
      <p className={styles.muted}>Real code from the Playing at Speed project, copied as is.</p>
      {["speed", "attach", "row"].map(k => (
        <CodeBlock key={k} {...PACE_CODE[k]} />
      ))}
    </div>
  );
}

function ordinalSuffix(n) {
  return 10 <= n % 100 && n % 100 <= 20 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
}
