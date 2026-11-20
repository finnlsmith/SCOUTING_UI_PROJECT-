import { useState, useEffect } from "react";
import { BACKEND_URL } from "../../config/api";

/**
 * GET {BACKEND_URL}{path} as JSON. Pass null to skip the request.
 * Returns { data, loading, error }. A late reply for an old path is ignored.
 */
export default function useApi(path) {
  const [state, setState] = useState({ data: null, loading: Boolean(path), error: "" });

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: "" });
      return undefined;
    }
    // Offline file: every response was saved into the page, so read it from there.
    if (typeof window !== "undefined" && window.__SNAPSHOT__) {
      const hit = window.__SNAPSHOT__[path];
      setState(hit === undefined
        ? { data: null, loading: false, error: "not saved in this offline file" }
        : { data: hit, loading: false, error: "" });
      return undefined;
    }
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: "" }));
    fetch(`${BACKEND_URL}${path}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => { if (!cancelled) setState({ data, loading: false, error: "" }); })
      .catch(e => { if (!cancelled) setState({ data: null, loading: false, error: e.message || "Failed to load" }); });
    return () => { cancelled = true; };
  }, [path]);

  return state;
}
