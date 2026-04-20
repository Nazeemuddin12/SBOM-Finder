import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { useAuth } from "../context/Authcontext";

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [externalResults, setExternalResults] = useState([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchName, setSearchName] = useState("");
  const [itemType, setItemType] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [category, setCategory] = useState("");

  const loadDashboard = async () => {
    try {
      const [itemsRes, statsRes] = await Promise.all([
        apiFetch("/items"),
        apiFetch("/stats"),
      ]);
      if (!itemsRes.ok || !statsRes.ok) throw new Error("Failed to load dashboard");
      const [itemsData, statsData] = await Promise.all([
        itemsRes.json(),
        statsRes.json(),
      ]);
      setItems(itemsData);
      setStats(statsData);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const handleSearch = async () => {
    try {
      setSuccessMessage("");
      const params = new URLSearchParams();
      if (searchName.trim()) params.append("q", searchName.trim());
      if (itemType) params.append("item_type", itemType);
      if (manufacturer.trim()) params.append("manufacturer", manufacturer.trim());
      if (category.trim()) params.append("category", category.trim());

      const hasSearchTerm = searchName.trim().length > 0;
      const url = hasSearchTerm ? `/search-smart?${params}` : `/items?${params}`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Search failed");
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
      setError(err.message);
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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="page-shell">

      {/* Hero / Welcome */}
      <section className="hero-welcome">
        <div>
          <h1>{greeting}, {user?.username} 👋</h1>
          <p>
            SBOM Finder helps you import, explore, compare, and trace software
            bill of materials across devices and applications.
          </p>
          <div className="hero-actions">
            <button onClick={() => navigate("/import")}>+ Import SBOM</button>
            <button className="secondary" onClick={() => navigate("/compare")}>Compare Items</button>
            <button className="ghost" onClick={() => navigate("/reverse-lookup")}>Reverse Lookup</button>
          </div>
        </div>
      </section>

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

      {/* Quick actions */}
      <section className="quick-actions-grid">
        <div className="quick-action-card" onClick={() => navigate("/import")}>
          <div className="qa-icon">📥</div>
          <div>
            <h3>Import SBOM</h3>
            <p>Upload CycloneDX or SPDX JSON files</p>
          </div>
        </div>
        <div className="quick-action-card" onClick={() => navigate("/compare")}>
          <div className="qa-icon">⚖️</div>
          <div>
            <h3>Compare Items</h3>
            <p>Side-by-side component matrix</p>
          </div>
        </div>
        <div className="quick-action-card" onClick={() => navigate("/reverse-lookup")}>
          <div className="qa-icon">🔍</div>
          <div>
            <h3>Reverse Lookup</h3>
            <p>Find which products use a component</p>
          </div>
        </div>
        <div className="quick-action-card" onClick={() => navigate("/tracked-products")}>
          <div className="qa-icon">📌</div>
          <div>
            <h3>Tracked Products</h3>
            <p>Monitor external products</p>
          </div>
        </div>
      </section>

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
        </div>
        {error && <p className="error-text" style={{ marginTop: "12px" }}>{error}</p>}
        {successMessage && (
          <p style={{ color: "var(--success)", marginTop: "12px", fontSize: "0.9rem" }}>
            {successMessage}
          </p>
        )}
      </section>

      {/* Items grid */}
      {items.length > 0 && (
        <section className="section-card">
          <h2 className="section-title">
            Indexed Items
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
                  {item.manufacturer || "Unknown manufacturer"} • {item.category || "Uncategorized"}
                </p>
                {item.version && (
                  <p className="item-version">v{item.version}</p>
                )}
                <div className="item-card-footer">
                  <span className="item-source">
                    {item.source_format === "cyclonedx" ? "🔵 CycloneDX" :
                     item.source_format === "spdx" ? "🟢 SPDX" :
                     item.source_format === "external" ? "🌐 External" : "📦 " + (item.source_format || "unknown")}
                  </span>
                  <span className="item-action">View details →</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {items.length === 0 && !error && (
        <section className="section-card">
          <div className="empty-state">
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📭</div>
            <h3>No items yet</h3>
            <p style={{ color: "var(--muted)", marginBottom: "20px" }}>
              Import a CycloneDX or SPDX file to get started exploring SBOM data.
            </p>
            <button onClick={() => navigate("/import")}>+ Import your first SBOM</button>
          </div>
        </section>
      )}

      {/* External results */}
      {externalResults.length > 0 && (
        <section className="section-card">
          <h2 className="section-title">External Suggestions</h2>
          <p className="section-subtitle">No local results found. Here are suggestions from GitHub.</p>
          <div className="items-grid">
            {externalResults.map((item, i) => (
              <div key={i} className="item-card external">
                <div className="item-card-header">
                  <span className="item-name">{item.name}</span>
                  <span className="item-type-badge application">external</span>
                </div>
                <p className="item-meta">{item.owner} • ⭐ {item.stars}</p>
                {item.description && (
                  <p className="item-version" style={{ fontStyle: "italic" }}>{item.description}</p>
                )}
                <div className="actions-row" style={{ marginTop: "10px", gap: "8px" }}>
                  <button
                    style={{ fontSize: "12px", padding: "5px 10px" }}
                    onClick={(e) => { e.stopPropagation(); handleImportExternal(item); }}
                  >Import</button>
                  <button
                    className="ghost"
                    style={{ fontSize: "12px", padding: "5px 10px" }}
                    onClick={(e) => { e.stopPropagation(); handleTrackExternal(item); }}
                  >Track</button>
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