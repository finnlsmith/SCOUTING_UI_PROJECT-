import React from "react";
import { Link } from "react-router-dom";
import useApi from "../hooks/useApi";
import PlayerCard from "./PlayerCard";
import styles from "./PlayersPage.module.css";

const EXAMPLE_CARD = "enzo_fernandez";

/** Players homepage: one real card, with every element a link to the chapter that explains it. */
export default function PlayersHome() {
  const { data: card, loading, error } = useApi(`/players/card/${EXAMPLE_CARD}`);

  return (
    <div>
      <h1 className={styles.title}>Scouting player card: an example</h1>
      <p className={styles.intro}>
        A real card: Enzo Fernández, 2022 World Cup, 7 matches. <b>Click a row</b> to see how it is made and why he gets that number. New here? Start with <Link className={styles.link} to="/players/about">About the card</Link>.
      </p>

      {loading && <p className={styles.muted}>Loading the card…</p>}
      {error && <p className={styles.error}>Could not load the card ({error}). Is the backend running?</p>}
      {card && <PlayerCard card={card} />}
    </div>
  );
}
