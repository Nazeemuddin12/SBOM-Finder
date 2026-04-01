import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

/* ─── Reusable Win2k section card ─────────────────────────── */
function Win2kCard({ title, children }) {
  return (
    <section className="section-card">
      <div className="section-card-titlebar">{title}</div>
      <div className="section-card-body">{children}</div>
    </section>
  );
}

/* ─── Reusable Win2k metric card ──────────────────────────── */
function MetricCard({ value, label, colorClass, titleLabel }) {
  return (
    <div className={`metric-card ${colorClass}`}>
      <div className="metric-card-titlebar">{titleLabel}</div>
      <div className="metric-card-body">
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
    </div>
  );
}

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
    const res = await fetch(`${API_BASE_URL}/items`);
    if (!res.ok) throw new Error("Failed to fetch items");
    return res.json();
  };

  const fetchStats = async () => {
    const res = await fetch(`${API_BASE_URL}/stats`);
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  };

  const loadDashboard = async () => {
    try {
      const [itemsData, statsData] = await Promise.all([fetchAllItems(), fetchStats()]);
      setItems(itemsData);
      setStats(statsData);
      setExternalResults([]);
      setError("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load dashboard");
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

      const query = params.toString();
      const hasSearchTerm = searchName.trim().length > 0;
      const url = hasSearchTerm
        ? `${API_BASE_URL}/search-smart?${query}`
        : `${API_BASE_URL}/items`;

      const res = await fetch(url);
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
      const payload = {
        name: item.full_name || item.name || "External Result",
        product_type: "application",
        vendor: item.owner || "Unknown",
        notes: `Tracked from external ${item.source || "public"} suggestion: ${item.url || "N/A"}`,
      };
      const res = await fetch(`${API_BASE_URL}/tracked-products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to track external result");
      const statsRes = await fetch(`${API_BASE_URL}/stats`);
      if (statsRes.ok) setStats(await statsRes.json());
      setSuccessMessage(`Tracked successfully: ${data.name}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to track item");
    }
  };

  const handleOpenExternalInApp = async (item) => {
    try {
      setError("");
      setSuccessMessage("");
      const payload = {
        name: item.name || "External Result",
        full_name: item.full_name || item.name || "External Result",
        url: item.url || null,
        description: item.description || "Imported from external suggestion.",
        owner: item.owner || "Unknown",
        stars: item.stars ?? null,
        source: item.source || "GitHub",
        item_type: "application",
      };
      const res = await fetch(`${API_BASE_URL}/external-items/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to import external result");
      const itemsRes = await fetch(`${API_BASE_URL}/items`);
      if (itemsRes.ok) setItems(await itemsRes.json());
      const statsRes = await fetch(`${API_BASE_URL}/stats`);
      if (statsRes.ok) setStats(await statsRes.json());
      navigate(`/item/${data.id}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to open external result in app");
    }
  };

  const summary = useMemo(() => {
    if (!stats) return "Loading your SBOM workspace...";
    return `${stats.total_items} indexed items with ${stats.total_components} tracked components across applications and devices.`;
  }, [stats]);

  return (
    <div className="page-shell">

      {/* ── Hero two-column layout ── */}
      <div className="hero">

        {/* Left panel */}
        <div className="hero-panel">
          {/* title bar rendered via CSS ::before */}
          <div className="hero-panel-body">
            <span className="hero-kicker">Unified SBOM Intelligence</span>
            <h2>Explore, Compare, and Trace Software Materials</h2>
            <p>
              SBOM Finder helps you browse imported devices and applications, inspect their
              software bill of materials, compare up to four items side by side, and run
              reverse lookups to identify where specific components appear.
            </p>
            <div className="hero-actions">
              <button onClick={() => navigate("/import")}>Import SBOM</button>
              <button className="secondary" onClick={() => navigate("/compare")}>Compare Items</button>
              <button className="ghost" onClick={() => navigate("/reverse-lookup")}>Reverse Lookup</button>
            </div>
          </div>
        </div>

        {/* Right side panel */}
        <div className="side-panel">
          <div className="side-panel-titlebar">Workspace Summary</div>
          <div className="side-panel-body">
            <p>{summary}</p>
            <div className="quick-list">
              <div className="quick-item">
                <strong>Search and Filter</strong>
                <span>Explore by item name, category, manufacturer, and type.</span>
              </div>
              <div className="quick-item">
                <strong>Comparison Engine</strong>
                <span>Highlight common, partial, and unique dependencies.</span>
              </div>
              <div className="quick-item">
                <strong>Reverse Lookup</strong>
                <span>Find which products include a given library or component.</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Stats Grid ── */}
      {stats && (
        <div className="stats-grid">
          <MetricCard value={stats.total_items}        label="Total Items"         colorClass="metric-blue"  titleLabel="Total Items" />
          <MetricCard value={stats.total_applications} label="Applications"        colorClass="metric-green" titleLabel="Applications" />
          <MetricCard value={stats.total_devices}      label="Devices"             colorClass="metric-pink"  titleLabel="Devices" />
          <MetricCard value={stats.total_components}   label="Tracked Components"  colorClass="metric-gold"  titleLabel="Components" />
        </div>
      )}

      {/* ── Search & Filter ── */}
      <Win2kCard title="Search and Explore — SBOM Finder">
        <h2 className="section-title">Search &amp; Explore</h2>
        <p className="section-subtitle">
          Use partial-match search and filters to locate applications and devices quickly.
        </p>

        <div className="filter-grid">
          <input
            type="text"
            placeholder="Search by name, vendor, category, OS..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
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

        <div className="actions-row">
          <button onClick={handleSearch}>Search</button>
          <button className="ghost" onClick={handleReset}>Reset</button>
          <button className="secondary" onClick={() => navigate("/stats")}>View Stats</button>
          <button className="ghost" onClick={() => navigate("/tracked-products")}>Tracked Products</button>
        </div>

        {successMessage && (
          <div className="info-banner" style={{ marginTop: "10px" }}>{successMessage}</div>
        )}
        {error && (
          <p className="error-text" style={{ marginTop: "10px" }}>Error: {error}</p>
        )}
      </Win2kCard>

      {/* ── Platform Capabilities ── */}
      <Win2kCard title="Platform Capabilities">
        <h2 className="section-title">Platform Capabilities</h2>
        <p className="section-subtitle">
          A build-upon alpha focused on visibility, comparison, and component tracing.
        </p>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-card-titlebar">Unified View</div>
            <div className="feature-card-body">
              <h3>Unified Device + App View</h3>
              <p>One searchable interface for imported devices and applications.</p>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-card-titlebar">Side-by-Side</div>
            <div className="feature-card-body">
              <h3>Side-by-Side Comparison</h3>
              <p>Compare up to four items and inspect overlap across their SBOM contents.</p>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-card-titlebar">Reverse Lookup</div>
            <div className="feature-card-body">
              <h3>Reverse Component Lookup</h3>
              <p>Trace where a software material appears across multiple indexed products.</p>
            </div>
          </div>
        </div>
      </Win2kCard>

      {/* ── Indexed Items ── */}
      <Win2kCard title="Indexed Items — SBOM Records">
        <h2 className="section-title">Indexed Items</h2>
        <p className="section-subtitle">
          Select any item to open its detailed SBOM record and component list.
        </p>

        {!error && items.length === 0 ? (
          <div className="empty-state">
            No items are available yet. Import CycloneDX or SPDX files to populate the dashboard.
          </div>
        ) : (
          <div className="item-list">
            {items.map((item) => (
              <div
                key={item.id}
                className="item-card"
                onClick={() => navigate(`/item/${item.id}`)}
              >
                <div className="item-card-header">
                  <h3>{item.name}</h3>
                  <span className="badge">{item.item_type || "N/A"}</span>
                </div>

                <p className="desc">
                  {item.description || "SBOM record available for detailed inspection and comparison."}
                </p>

                <div className="item-meta">
                  <div className="meta-pill">
                    <span>Manufacturer</span>
                    <strong>{item.manufacturer || "N/A"}</strong>
                  </div>
                  <div className="meta-pill">
                    <span>Category</span>
                    <strong>{item.category || "N/A"}</strong>
                  </div>
                  <div className="meta-pill">
                    <span>Operating System</span>
                    <strong>{item.operating_system || "N/A"}</strong>
                  </div>
                  <div className="meta-pill">
                    <span>Source Format</span>
                    <strong>{item.source_format || "N/A"}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Win2kCard>

      {/* ── External Suggestions ── */}
      {externalResults.length > 0 && (
        <Win2kCard title="External Suggestions — Public Repository Results">
          <h2 className="section-title">External Suggestions</h2>
          <p className="section-subtitle">
            No local SBOM match was found. These public repository suggestions were retrieved as possible related sources.
          </p>

          <div className="item-list">
            {externalResults.map((item, index) => (
              <div key={index} className="item-card">
                <div className="item-card-header">
                  <h3>{item.full_name || item.name || "Unknown Result"}</h3>
                  <span className="badge">{item.source || "External"}</span>
                </div>

                <p className="desc">{item.description || "No description available."}</p>

                <div className="item-meta">
                  <div className="meta-pill">
                    <span>Owner</span>
                    <strong>{item.owner || "N/A"}</strong>
                  </div>
                  <div className="meta-pill">
                    <span>Stars</span>
                    <strong>{item.stars ?? "N/A"}</strong>
                  </div>
                  <div className="meta-pill">
                    <span>Source</span>
                    <strong>{item.source || "N/A"}</strong>
                  </div>
                  <div className="meta-pill">
                    <span>Link</span>
                    <strong>
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                          Open Source
                        </a>
                      ) : "N/A"}
                    </strong>
                  </div>
                </div>

                <div className="actions-row" style={{ padding: "10px" }}>
                  <button onClick={() => handleOpenExternalInApp(item)}>Open in App</button>
                  <button className="secondary" onClick={() => handleTrackExternal(item)}>Track This Result</button>
                </div>
              </div>
            ))}
          </div>
        </Win2kCard>
      )}

      {/* ── Win2k Status Bar ── */}
      <div className="win-statusbar" role="status" aria-live="polite">
        <span className="status-pane">
          {stats ? `${stats.total_items} items loaded` : "Loading..."}
        </span>
        <span className="status-pane">SBOM Finder v1.0</span>
        <span className="status-pane" style={{ marginLeft: "auto" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
        </span>
      </div>

    </div>
  );
}

export default Home;
