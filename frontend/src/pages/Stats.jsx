import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

function Stats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/stats`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load stats");
        }
        return res.json();
      })
      .then((data) => {
        setStats(data);
        setError("");
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return (
      <div className="page-shell">
        <button className="back-btn ghost" onClick={() => navigate("/")}>
          ⬅ Back
        </button>
        <p className="error-text">Error: {error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="page-shell">
        <button className="back-btn ghost" onClick={() => navigate("/")}>
          ⬅ Back
        </button>
        <p>Loading stats...</p>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <button className="back-btn ghost" onClick={() => navigate("/")}>
        ⬅ Back
      </button>

      <section className="section-card">
        <h2 className="section-title">SBOM Statistics Dashboard</h2>
        <p className="section-subtitle">
          Overview of indexed records, components, and tracked products.
        </p>

        <div className="stats-grid">
          <div className="metric-card metric-blue">
            <h3>{stats.total_items}</h3>
            <p>Total Items</p>
          </div>

          <div className="metric-card metric-green">
            <h3>{stats.total_devices}</h3>
            <p>Total Devices</p>
          </div>

          <div className="metric-card metric-pink">
            <h3>{stats.total_applications}</h3>
            <p>Total Applications</p>
          </div>

          <div className="metric-card metric-gold">
            <h3>{stats.total_components}</h3>
            <p>Total Components</p>
          </div>
        </div>

        <div style={{ marginTop: "18px" }}>
          <div className="metric-card metric-blue">
            <h3>{stats.total_tracked_products}</h3>
            <p>Tracked Products</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Stats;