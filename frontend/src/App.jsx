import "./App.css";
import { useEffect, useMemo, useState } from "react";

function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  const healthUrl = useMemo(() => {
    const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
    return apiBase ? `${apiBase}/api/health` : "/api/health";
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadHealth = async () => {
      try {
        const response = await fetch(healthUrl);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await response.json();
        if (isActive) {
          setHealth(data);
        }
      } catch (requestError) {
        if (isActive) {
          setError(requestError.message || "Unable to fetch backend health.");
        }
      }
    };

    loadHealth();

    return () => {
      isActive = false;
    };
  }, [healthUrl]);

  return (
    <main className="app">
      <h1>Utilities Tracker</h1>
      <p>React frontend is ready.</p>
      {health ? (
        <p className="status ok">
          Backend health: <strong>{health.status}</strong> ({health.service})
        </p>
      ) : error ? (
        <p className="status error">Backend health error: {error}</p>
      ) : (
        <p className="status loading">Checking backend health...</p>
      )}
    </main>
  );
}

export default App;
