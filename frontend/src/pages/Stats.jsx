import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

function Stats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [filterData, setFilterData] = useState([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");

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

  const handleTileClick = async (filterType) => {
    if (activeFilter === filterType) {
      setActiveFilter(null);
      setFilterData([]);
      setFilterSearch("");
      return;
    }
    setActiveFilter(filterType);
    setFilterLoading(true);
    setFilterSearch("");
    try {
      let res;
      if (filterType === "components") {
        res = await apiFetch("/components-list");
      } else if (filterType === "tracked") {
        res = await apiFetch("/tracked-products");
      } else {
        const params = filterType === "all" ? "" :
          filterType === "applications" ? "?item_type=application" :
          filterType === "devices" ? "?item_type=device" : "";
        res = await apiFetch(`/items${params}`);
      }
      if (!res.ok) throw new Error("Failed to load data");
      const data = await res.json();
      setFilterData(data);
    } catch (err) {
      setFilterData([]);
    } finally {
      setFilterLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  const filteredData = filterData.filter((item) => {
    if (!filterSearch) return true;
    const s = filterSearch.toLowerCase();
    return (
      (item.name || item.component_name || "").toLowerCase().includes(s) ||
      (item.item_type || "").toLowerCase().includes(s) ||
      (item.manufacturer || item.supplier || "").toLowerCase().includes(s) ||
      (item.version || "").toLowerCase().includes(s) ||
      (item.license || "").toLowerCase().includes(s)
    );
  });

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
        <button onClick={() => loadStats(true)} disabled={retrying}>
          {retrying ? "Retrying..." : "Retry"}
        </button>
      </div>
    </div>
  );

  const tiles = [
    { key: "all", label: "Total Items", value: stats.total_items, color: "metric-blue", icon: "📦" },
    { key: "applications", label: "Applications", value: stats.total_applications, color: "metric-green", icon: "💻" },
    { key: "devices", label: "Devices", value: stats.total_devices, color: "metric-pink", icon: "🔧" },
    { key: "components", label: "Components", value: stats.total_components, color: "metric-gold", icon: "🧩" },
    { key: "tracked", label: "Tracked Products", value: stats.total_tracked_products, color: "metric-blue", icon: "📌" },
  ];

  return (
    <div className="page-shell">
      <button className="back-btn ghost" onClick={() => navigate("/")}>⬅ Back</button>

      <section className="section-card">
        <h2 className="section-title">SBOM Statistics Dashboard</h2>
        <p className="section-subtitle">
          Click any tile to explore what's inside that category.
        </p>

        <div className="stats-grid">
          {tiles.map((tile) => (
            <div
              key={tile.key}
              className={`metric-card ${tile.color} ${activeFilter === tile.key ? "metric-active" : ""}`}
              onClick={() => handleTileClick(tile.key)}
              style={{ cursor: "pointer", transition: "all 0.15s" }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "6px" }}>{tile.icon}</div>
              <h3>{tile.value}</h3>
              <p>{tile.label}</p>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", marginTop: "6px" }}>
                {activeFilter === tile.key ? "▲ Hide" : "▼ Click to explore"}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Expanded tile content */}
      {activeFilter && (
        <section className="section-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              {tiles.find(t => t.key === activeFilter)?.icon}{" "}
              {tiles.find(t => t.key === activeFilter)?.label}
              <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--muted)", marginLeft: "10px" }}>
                {filteredData.length} {filterSearch ? "matching" : "total"}
              </span>
            </h2>
            <input
              type="text"
              placeholder="Search within results..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              style={{ width: "220px", padding: "8px 12px", fontSize: "0.85rem" }}
            />
          </div>

          {filterLoading && (
            <p style={{ color: "var(--muted)", padding: "1rem 0" }}>Loading...</p>
          )}

          {!filterLoading && filteredData.length === 0 && (
            <div className="empty-state">
              <p>{filterSearch ? "No results match your search." : "Nothing here yet."}</p>
            </div>
          )}

          {!filterLoading && filteredData.length > 0 && (
            <>
              {/* Components view */}
              {activeFilter === "components" && (
                <div className="table-wrap">
                  <table className="compare-table">
                    <thead>
                      <tr>
                        <th>Component Name</th>
                        <th>Version</th>
                        <th>Supplier</th>
                        <th>License</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((comp, i) => (
                        <tr key={i}>
                          <td><strong>{comp.component_name || "N/A"}</strong></td>
                          <td style={{ fontFamily: "monospace", color: "var(--muted)" }}>{comp.version || "—"}</td>
                          <td style={{ color: "var(--muted)" }}>{comp.supplier || "—"}</td>
                          <td style={{ fontFamily: "monospace", fontSize: "12px" }}>{comp.license || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tracked products view */}
              {activeFilter === "tracked" && (
                <div className="item-list">
                  {filteredData.map((item) => (
                    <div key={item.id} className="item-card">
                      <div className="item-card-header">
                        <strong>{item.name}</strong>
                        <span className="badge">{item.status || "pending"}</span>
                      </div>
                      <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "6px 0 0" }}>
                        {item.vendor || "No vendor"} • {item.product_type || "N/A"}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Items view (all, applications, devices) */}
              {["all", "applications", "devices"].includes(activeFilter) && (
                <div className="items-grid">
                  {filteredData.map((item) => (
                    <div
                      key={item.id}
                      className="item-card"
                      onClick={() => navigate(`/item/${item.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="item-card-header">
                        <span className="item-name">{item.name}</span>
                        <span className={`item-type-badge ${item.item_type}`}>{item.item_type}</span>
                      </div>
                      <p className="item-meta">
                        {item.manufacturer || "Unknown"} • {item.category || "Uncategorized"}
                      </p>
                      {item.version && <p className="item-version">v{item.version}</p>}
                      <p className="item-source" style={{ marginTop: "8px", fontSize: "0.78rem", color: "var(--muted)" }}>
                        {item.source_format || "unknown"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default Stats;