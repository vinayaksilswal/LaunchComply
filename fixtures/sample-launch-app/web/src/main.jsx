import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

// LaunchComply sets this in the "Connect & go live" step.
const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const visit = async () => {
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/api/visits`, { method: "POST" });
      setResult(await response.json());
    } catch {
      setResult({ message: "Could not reach the backend. It may be waking up; try again in a minute." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560, margin: "64px auto", padding: "0 16px" }}>
      <h1>Sample Shop</h1>
      <p>Launched with LaunchComply. Website on Vercel, backend on Render, database on Neon.</p>
      <p>Backend address: <code>{API_URL || "not set yet"}</code></p>
      <button onClick={visit} disabled={busy || !API_URL}>{busy ? "Saving…" : "Record a visit"}</button>
      {result && <p>{result.count != null ? `Visits saved: ${result.count}. ` : ""}{result.message}</p>}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
