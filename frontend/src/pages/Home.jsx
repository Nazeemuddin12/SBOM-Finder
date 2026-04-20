import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

function Home() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [externalResults, setExternalResults] = useState([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchName, setSearchName] = useState("");
  const [itemType, setItemType] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [category, setCategory] = useState("");

  const fetchAllItems = async () => {
    const res = await apiFetch("/items");
    if (!res.ok) throw new Error("Failed to fetch items");
    return res.json();
  };

  const fetchStats = async () => {
    const res = await apiFetch("/stats");
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  };

  const loadDashboard = async () => {
    try {
      const [itemsData, statsData] = await Promise.all([
        fetchAllItems(),
        fetchStats(),
      ]);
      setItems(itemsData);
      setStats(statsData);
      setExternalResults([]);
      setError("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load dashboard");
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleSearch = async () => {
    try {
      setSuccessMessage("");

      const params = new URLSearchParams();
      if (searchName.trim()) params.append("q", searchName.trim());
      if (itemType) params.append("item_type", itemType);
      if (manufacturer.trim()) params.append("manufacturer", manufacturer.trim());
      if (category.trim()) params.append("category", category.trim());

      const query = params.toString();
      const hasSearchTerm = searchName.trim().length > 0;

      const url = hasSearchTerm
        ? `/search-smart?${query}`
        : `/items`;

      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Failed to search items");

      const data = await res.json();

      if (hasSearchTerm) {
        setItems(data.local_results || []);
        setExternalResults(data.external_results || []);
      } else {
        setItems(data);
        setExternalResults([]);
      }

      setError("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Search failed");
    }
  };

  const handleReset = async () => {
    setSearchName("");
    setItemType("");
    setManufacturer("");
    setCategory("");
    setExternalResults([]);
    setSuccessMessage("");
    await loadDashboard();
  };

  const handleTrackExternal = async (item) => {
    try {
      setError("");
      setSuccessMessage("");

      const res = await apiFetch("/tracked-products", {
        method: "POST",
        body: JSON.stringify({
          name: item.full_name || item.name,
          product_type: "application",
          vendor: item.owner || null,
          notes: item.description || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to track product");
      setSuccessMessage(`"${item.name}" added to tracked products.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImportExternal = async (item) => {
    try {
      setError("");
      setSuccessMessage("");

      const res = await apiFetch("/external-items/import", {
        method: "POST",
        body: JSON.stringify({
          name: item.name,
          full_name: item.full_name,
          url: item.url,
          description: item.description,
          owner: item.owner,
          stars: item.stars,
          source: item.source,
          item_type: "application",
        }),
      });

      if (!res.ok) throw new Error("Failed to import item");
      setSuccessMessage(`"${item.name}" imported to workspace.`);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page-shell">
      {/* Stats bar */}
      {stats && (
        <section className="stats-bar">
          <div className="stat-pill">
            <span className="stat-num">{stats.total_items}</span>
            <span className="stat-label">Total Items</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num">{stats.total_applications}</span>
            <span className="stat-label">Applications</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num">{stats.total_devices}</span>
            <span className="stat-label">Devices</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num">{stats.total_components}</span>
            <span className="stat-label">Components</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num">{stats.total_tracked_products}</span>
            <span className="stat-label">Tracked</span>
          </div>
        </section>
      )}

      {/* Search */}
      <section className="section-card">
        <h2 className="section-title">Search & Filter</h2>

        <div className="search-grid">
          <input
            type="text"
            placeholder="Search by name, keyword..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <select value={itemType} onChange={(e) => setItemType(e.target.value)}>
            <option value="">All Types</option>
            <option value="application">Application</option>
            <option value="device">Device</option>
          </select>
          <input
            type="text"
            placeholder="Manufacturer"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
          />
          <input
            type="text"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        <div className="actions-row" style={{ marginTop: "14px" }}>
          <button onClick={handleSearch}>Search</button>
          <button className="ghost" onClick={handleReset}>Reset</button>
          <button className="ghost" onClick={() => navigate("/import")}>
            + Import SBOM
          </button>
        </div>

        {error && <p className="error-text" style={{ marginTop: "12px" }}>{error}</p>}
        {successMessage && (
          <p style={{ color: "var(--success)", marginTop: "12px", fontSize: "0.9rem" }}>
            {successMessage}
          </p>
        )}
      </section>

      {/* Local results */}
      {items.length > 0 && (
        <section className="section-card">
          <h2 className="section-title">
            Items
            <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--muted)", marginLeft: "10px" }}>
              {items.length} found
            </span>
          </h2>
          <div className="items-grid">
            {items.map((item) => (
              <div
                key={item.id}
                className="item-card"
                onClick={() => navigate(`/item/${item.id}`)}
              >
                <div className="item-card-header">
                  <span className="item-name">{item.name}</span>
                  <span className={`item-type-badge ${item.item_type}`}>
                    {item.item_type}
                  </span>
                </div>
                <p className="item-meta">
                  {item.manufacturer || "Unknown manufacturer"} •{" "}
                  {item.category || "Uncategorized"}
                </p>
                {item.version && (
                  <p className="item-version">v{item.version}</p>
                )}
                <p className="item-source">
                  Source: {item.source_format || "unknown"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {items.length === 0 && !error && (
        <section className="section-card">
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem 0" }}>
            No items yet. Import an SBOM file to get started.
          </p>
        </section>
      )}

      {/* External results */}
      {externalResults.length > 0 && (
        <section className="section-card">
          <h2 className="section-title">External Suggestions</h2>
          <p className="section-subtitle">
            No local results found. Here are suggestions from GitHub.
          </p>
          <div className="items-grid">
            {externalResults.map((item, i) => (
              <div key={i} className="item-card external">
                <div className="item-card-header">
                  <span className="item-name">{item.name}</span>
                  <span className="item-type-badge application">external</span>
                </div>
                <p className="item-meta">{item.owner} • {item.stars} stars</p>
                {item.description && (
                  <p className="item-version" style={{ fontStyle: "italic" }}>
                    {item.description}
                  </p>
                )}
                <div className="actions-row" style={{ marginTop: "10px", gap: "8px" }}>
                  <button
                    style={{ fontSize: "12px", padding: "5px 10px" }}
                    onClick={(e) => { e.stopPropagation(); handleImportExternal(item); }}
                  >
                    Import
                  </button>
                  <button
                    className="ghost"
                    style={{ fontSize: "12px", padding: "5px 10px" }}
                    onClick={(e) => { e.stopPropagation(); handleTrackExternal(item); }}
                  >
                    Track
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default Home;