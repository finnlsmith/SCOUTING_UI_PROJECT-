import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import useApi from "../hooks/useApi";
import { useTheme } from "../../contexts/ThemeContext";
import PlotChart, { chartColors, pitchShapes } from "./PlotChart";
import styles from "./PlayersPage.module.css";

// The card on the Players homepage is Enzo Fernández, so this chapter opens on him.
const DEFAULT_PLAYER_ID = 11856;

const ordinal = n => `${n}${10 <= n % 100 && n % 100 <= 20 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th")}`;
const pct = v => `${Math.round(v * 100)}%`;
const groupName = g => (g === "Midfielders" ? "Midfielders" : "Attackers");

function Stat({ big, label }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statBig}>{big}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

/** "2. A player's pace": the card row, and the pictures behind it. */
export default function PacePlayer({ group }) {
  const { isDark } = useTheme();
  const c = chartColors(isDark);
  const list = useApi("/players/pace/players?ranked_only=true");
  const [params, setParams] = useSearchParams();
  const picked = params.get("player") ? Number(params.get("player")) : null;

  // only players from the same position group as the card (midfielders for Enzo)
  const players = (list.data || []).filter(pl => !group || pl.peers === group);
  const defaultId = players.find(p => p.pff_player_id === DEFAULT_PLAYER_ID)?.pff_player_id ?? players[0]?.pff_player_id;
  const playerId = picked != null && players.some(pl => pl.pff_player_id === picked) ? picked : defaultId;
  const { data, loading, error } = useApi(playerId ? `/players/${playerId}/pace` : null);

  const fastKmh = data?.fast_kmh ?? 15;
  const maps = useMemo(() => {
    if (!data) return null;
    const acts = data.actions;
    const fast = acts.filter(a => a.speed_kmh >= fastKmh);
    const slow = acts.filter(a => a.speed_kmh < fastKmh);
    const dots = (list, color, name) => ({
      x: list.map(a => a.x), y: list.map(a => a.y), type: "scattergl", mode: "markers", name,
      marker: { size: 7, color, opacity: 0.75 },
      text: list.map(a => `${a.action} · ${a.speed_kmh.toFixed(1)} km/h<br>${a.match} ${a.clock}`),
      hovertemplate: "%{text}<extra></extra>",
    });
    const hist = [{
      x: data.speed_bins.map(b => (b.to >= 50 ? `${b.from}+` : `${b.from}–${b.to}`)),
      y: data.speed_bins.map(b => b.count), type: "bar",
      marker: { color: data.speed_bins.map(b => (b.fast ? c.fast : c.slow)) },
      hovertemplate: "%{x} km/h: %{y} actions<extra></extra>",
    }];
    const shares = data.peer_group.shares;
    const mine = data.player.pace_share;
    const strip = [
      {
        x: shares, y: shares.map((_, i) => ((i * 7) % 11) / 11), type: "scatter", mode: "markers", name: "peers",
        marker: { size: 7, color: c.peer }, hovertemplate: "a peer at %{x:.0%}<extra></extra>",
      },
      {
        x: [mine], y: [0.5], type: "scatter", mode: "markers+text", name: data.player.name,
        text: [data.player.name.split(" ").slice(-1)[0]], textposition: "top center",
        marker: { size: 16, color: c.fast, line: { color: c.text, width: 1.5 } },
        hovertemplate: `${data.player.name}: %{x:.0%}<extra></extra>`,
      },
    ];
    return { fast, slow, pitch: [dots(slow, c.slow, `below ${fastKmh} km/h`), dots(fast, c.fast, `${fastKmh} km/h or more`)], hist, strip };
  }, [data, c, fastKmh]);

  if (list.loading) return <p className={styles.muted}>Loading players…</p>;
  if (list.error) return <p className={styles.error}>Could not load players ({list.error}).</p>;

  const p = data?.player;
  const pg = data?.peer_group;

  return (
    <div>
      <label className={styles.pickerLabel}>
        Player{" "}
        <select className={styles.picker} aria-label="Select a player" value={playerId ?? ""} onChange={e => setParams({ player: e.target.value }, { replace: true })}>
          {players.map(pl => (
            <option key={pl.pff_player_id} value={pl.pff_player_id}>{pl.name} ({pl.peers === "Midfielders" ? "midfielder" : "attacker"})</option>
          ))}
        </select>
      </label>
      <p className={styles.muted}>{groupName(group)} with 4+ matches and enough actions to be ranked.</p>

      {loading && <p className={styles.muted}>Loading {p ? p.name : "player"}…</p>}
      {error && <p className={styles.error}>Could not load this player ({error}).</p>}

      {p && maps && !loading && (
        <>
          <div className={styles.stats}>
            <Stat big={pct(p.pace_share)} label={`of ${p.name}'s actions at ${fastKmh} km/h or faster (${p.act_fast} of ${p.act_n})`} />
            <Stat
              big={p.ranked ? ordinal(p.percentile) : "–"}
              label={p.ranked ? `percentile among ${pg.size} ${groupName(pg.name).toLowerCase()}` : "not ranked yet: too few matches or actions"}
            />
            <Stat big={data.actions_unknown_speed} label={`actions with no usable speed (${data.actions_total} in all), left out`} />
          </div>

          <div className={styles.twoCol}>
            <figure className={styles.figure}>
              <PlotChart
                data={maps.pitch}
                height={340}
                layout={{
                  xaxis: { range: [-56, 56], visible: false, scaleanchor: "y" },
                  yaxis: { range: [-37, 37], visible: false },
                  shapes: pitchShapes(c.line), legend: { orientation: "h", y: -0.02 }, margin: { l: 4, r: 4, t: 4, b: 30 },
                }}
              />
              <figcaption className={styles.caption}>
                Each dot is one action across {p.matches} matches, attacking left to right. <span style={{ color: c.fast }}>Blue</span>: {fastKmh} km/h or faster. Grey: slower.
              </figcaption>
            </figure>
            <figure className={styles.figure}>
              <PlotChart
                data={maps.hist}
                height={340}
                layout={{
                  xaxis: { title: "speed when he acted (km/h)", gridcolor: c.grid },
                  yaxis: { title: "actions", gridcolor: c.grid, zeroline: false },
                  bargap: 0.08,
                }}
              />
              <figcaption className={styles.caption}>
                His speed at each action. Blue bars are counted as at pace.
              </figcaption>
            </figure>
          </div>

          <figure className={styles.figure}>
            <PlotChart
              data={maps.strip}
              height={170}
              layout={{
                xaxis: { title: `share of actions at ${fastKmh}+ km/h`, tickformat: ".0%", gridcolor: c.grid, rangemode: "tozero" },
                yaxis: { visible: false, range: [-0.15, 1.15] },
                shapes: pg.median_share == null ? [] : [{ type: "line", x0: pg.median_share, x1: pg.median_share, y0: -0.1, y1: 1.1, line: { color: c.text, width: 1.5, dash: "dash" } }],
                annotations: pg.median_share == null ? [] : [{ x: pg.median_share, y: 1.1, text: `median ${pct(pg.median_share)}`, showarrow: false, yanchor: "bottom", font: { color: c.text } }],
                showlegend: false, margin: { l: 16, r: 16, t: 28, b: 48 },
              }}
            />
            <figcaption className={styles.caption}>
              Where he sits among {pg.size} {groupName(pg.name).toLowerCase()}. One dot each; dashed line is the median.
            </figcaption>
          </figure>
        </>
      )}
    </div>
  );
}
