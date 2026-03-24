import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const cardStyle = {
  border: "1px solid #ccc",
  borderRadius: "10px",
  padding: "20px",
  minWidth: "220px",
  textAlign: "center",
};

function Stats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/stats")
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
      <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
        <button onClick={() => navigate("/")}>⬅ Back</button>
        <p style={{ color: "red" }}>Error: {error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
        <button onClick={() => navigate("/")}>⬅ Back</button>
        <p>Loading stats...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
      <button onClick={() => navigate("/")}>⬅ Back</button>

      <h1>SBOM Statistics Dashboard</h1>
      <p>Overview of the current SBOM directory.</p>

      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          marginTop: "25px",
        }}
      >
        <div style={cardStyle}>
          <h2>{stats.total_items}</h2>
          <p>Total Items</p>
        </div>

        <div style={cardStyle}>
          <h2>{stats.total_devices}</h2>
          <p>Total Devices</p>
        </div>

        <div style={cardStyle}>
          <h2>{stats.total_applications}</h2>
          <p>Total Applications</p>
        </div>

        <div style={cardStyle}>
          <h2>{stats.total_components}</h2>
          <p>Total Components</p>
        </div>
      </div>
    </div>
  );
}

export default Stats;