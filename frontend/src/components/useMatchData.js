import { useState, useEffect } from "react";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "http://localhost:8000/api").replace(/\/+$/, "");

export default function useMatchData() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMatches() {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/matches`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMatches(
          data.map((m, i) => ({
            id: i,
            name: m.file.replace(".csv", ""),
            label: m.label,
            file: m.file,
          }))
        );
      } catch (err) {
        setError("Failed to load matches");
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  return { matches, loading, error, setError };
}
