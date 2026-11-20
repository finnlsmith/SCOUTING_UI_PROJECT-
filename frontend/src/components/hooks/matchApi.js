import { BACKEND_URL } from "../../config/api";

// Plain fetch helpers shared by the whole-match view and the phases. A "window" is
// { period, start, end }: one period, match clock in seconds (start exclusive, end inclusive).

async function getJson(path, params = {}) {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  const res = await fetch(`${BACKEND_URL}${path}${query ? `?${query}` : ""}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const windowParams = w => (w ? { period: w.period, start: w.start, end: w.end } : {});

const file = f => encodeURIComponent(f);

/** The actions right before one event (a shot or a mistake), plus the 60s window before it. */
export const fetchEventContext = (filename, eventId) =>
  getJson(`/match/${file(filename)}/event_context`, { event_id: eventId });

/** A team's passing network, optionally for just a window (a phase, or the minute before a shot). */
export const fetchNetwork = (filename, team, { flip = false, subs = false, window } = {}) =>
  getJson(`/match/${file(filename)}/passing_network`, { team, min_passes: 1, flip, subs, ...windowParams(window) });

/** Where one player touched the ball ("touches") or received it in the final third. */
export const fetchTouches = (filename, team, player, mode = "touches", window) =>
  getJson(`/match/${file(filename)}/player_touches`, { team, player, mode, ...windowParams(window) });

/** The per-player attack and creation tables for one team, for the whole match or a window. */
export const fetchPlayerTables = (filename, team, window) =>
  getJson(`/match/${file(filename)}/player_tables`, { team, ...windowParams(window) });
