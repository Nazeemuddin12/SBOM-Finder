import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

function ReverseLookup() {
  const navigate = useNavigate();

  const [componentName, setComponentName] = useState("");
  const [itemType, setItemType] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!componentName.trim()) {
      setError("Please enter a component/material name.");
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const params = new URLSearchParams();
      params.append("component_name", componentName.trim());
      if (itemType) params.append("item_type", itemType);
      if (manufacturer.trim()) params.append("manufacturer", manufacturer.trim());
      if (category.trim()) params.append("category", category.trim());

      const res = await fetch(`${API_BASE_URL}/reverse-search?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to run reverse search");

      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setComponentName("");
    setItemType("");
    setManufacturer("");
    setCategory("");
    setResults([]);
    setError("");
    setSearched(false);
  };

  return (
    <div className="page-shell">
      <button className="back-btn" onClick={() => navigate("/")}>
        ⬅ Back
      </button>

      <section className="hero">
        <h1>Reverse Lookup</h1>
        <p>
          Search for products and applications that include a given library,
          component, or software material.
        </p>
      </section>

      <section className="section-card" style={{ marginBottom: "22px" }}>
        <h2 className="section-title">Search Filters</h2>
        <p className="section-subtitle">
          Use a component name like OpenSSL, zlib, Log4j, or curl.
        </p>

        <div className="filter-grid">
          <input
            type="text"
            placeholder="Component name"
            value={componentName}
            onChange={(e) => setComponentName(e.target.value)}
          />

          <select value={itemType} onChange={(e) => setItemType(e.target.value)}>
            <option value="">All Types</option>
            <option value="device">Device</option>
            <option value="application">Application</option>
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
          <button onClick={handleSearch} disabled={loading}>
            {loading ? "Searching..." : "Run Reverse Search"}
          </button>
          <button onClick={handleReset}>Reset</button>
        </div>

        {error && <p className="error-text" style={{ marginTop: "16px" }}>{error}</p>}
      </section>

      {searched && !loading && !error && results.length === 0 && (
        <section className="section-card">
          <div className="empty-state">
            No matching items were found for this component.
          </div>
        </section>
      )}

      {results.length > 0 && (
        <section className="section-card">
          <h2 className="section-title">Matching Items</h2>
          <p className="section-subtitle">
            Click any result to inspect its full SBOM component list.
          </p>

          <div className="item-list">
            {results.map((item) => (
              <div
                key={item.id}
                className="item-card"
                onClick={() => navigate(`/item/${item.id}`)}
              >
                <h3>{item.name}</h3>
                <div className="item-meta">
                  <div className="meta-pill">
                    <span>Type</span>
                    <strong>{item.item_type || "N/A"}</strong>
                  </div>
                  <div className="meta-pill">
                    <span>Manufacturer</span>
                    <strong>{item.manufacturer || "N/A"}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default ReverseLookup;