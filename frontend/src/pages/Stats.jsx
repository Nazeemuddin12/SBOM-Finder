import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

function Stats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const loadStats = async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    setError("");
    try {
      const res = await apiFetch("/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err.message || "Failed to load stats");
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  if (loading) return (
    <div className="page-shell">
      <button className="back-btn ghost" onClick={() => navigate("/")}>⬅ Back</button>
      <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--muted)" }}>
        <p>Loading stats...</p>
        <p style={{ fontSize: "0.82rem", marginTop: "6px" }}>
          The backend may be waking up — this can take up to 30 seconds on first load.
        </p>
      </div>
    </div>
  );

  if (error) return (
    <div className="page-shell">
      <button className="back-btn ghost" onClick={() => navigate("/")}>⬅ Back</button>
      <div className="section-card" style={{ textAlign: "center", padding: "2rem" }}>
        <p className="error-text" style={{ marginBottom: "16px" }}>{error}</p>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "18px" }}>
          The backend may still be waking up. Please wait a moment and try again.
        </p>
        <button onClick={() => loadStats(true)} disabled={retrying}>
          {retrying ? "Retrying..." : "Retry"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-shell">
      <button className="back-btn ghost" onClick={() => navigate("/")}>⬅ Back</button>
      <section className="section-card">
        <h2 className="section-title">SBOM Statistics Dashboard</h2>
        <p className="section-subtitle">Overview of your indexed records, components, and tracked products.</p>
        <div className="stats-grid">
          <div className="metric-card metric-blue"><h3>{stats.total_items}</h3><p>Total Items</p></div>
          <div className="metric-card metric-green"><h3>{stats.total_devices}</h3><p>Total Devices</p></div>
          <div className="metric-card metric-pink"><h3>{stats.total_applications}</h3><p>Total Applications</p></div>
          <div className="metric-card metric-gold"><h3>{stats.total_components}</h3><p>Total Components</p></div>
        </div>
        <div style={{ marginTop: "18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div className="metric-card metric-blue"><h3>{stats.total_tracked_products}</h3><p>Tracked Products</p></div>
          {stats.total_ai_discovered !== undefined && (
            <div className="metric-card metric-green"><h3>{stats.total_ai_discovered}</h3><p>AI Discovered</p></div>
          )}
          {stats.total_users !== undefined && (
            <div className="metric-card metric-pink"><h3>{stats.total_users}</h3><p>Registered Users</p></div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Stats;