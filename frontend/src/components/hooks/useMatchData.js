import { useState, useEffect } from "react";
import { BACKEND_URL } from "../../config/api";

export default function useMatchData() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMatches() {
      try {
        setLoading(true);
        setError("");
        const url = `${BACKEND_URL}/matches`;
        console.log("Fetching matches from:", url);
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        setMatches(
          data.map((m, i) => ({
            id: i,
            name: m.file.replace(".csv", ""),
            label: m.label,
            file: m.file,
            date: m.date,
            stage: m.stage,
          }))
        );
      } catch (err) {
        console.error("Error fetching matches:", err);
        const errorMessage = err.message || "Failed to load matches";
        setError(`Failed to load matches: ${errorMessage}. Make sure the backend is running on ${BACKEND_URL.replace('/api', '')}`);
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  return { matches, loading, error, setError };
}
