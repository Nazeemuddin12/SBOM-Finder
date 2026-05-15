// ============================================================
// ReverseLookup.jsx
// SBOM Finder — Reverse Component Search
// ============================================================
// Answers the question: "Which products use this component?"
//
// Primary use case: CVE blast-radius analysis.
// When a new vulnerability is published for a library (e.g. openssl,
// log4j, curl), the user can type the component name here and instantly
// see every SBOM in the database that includes it.
//
// The required field is the component name.
// Optional filters narrow results by item type, manufacturer, or category.
// All filtering happens server-side via GET /reverse-search.
// ============================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";


function ReverseLookup() {
  const navigate = useNavigate();

  // ── Search inputs ──────────────────────────────────────────────────────────
  const [componentName, setComponentName] = useState(""); // required — the component to search for
  const [itemType, setItemType]           = useState(""); // optional: "" | "application" | "device"
  const [manufacturer, setManufacturer]   = useState(""); // optional free-text filter
  const [category, setCategory]           = useState(""); // optional free-text filter

  // ── UI state ───────────────────────────────────────────────────────────────
  const [results, setResults]   = useState([]);
  const [error, setError]       = useState("");
  const [searched, setSearched] = useState(false);  // true after the first search attempt
  const [loading, setLoading]   = useState(false);


  /**
   * handleSearch — validates the required field then calls /reverse-search.
   * Only the component_name param is required; the rest are appended conditionally
   * so the query string stays clean when optional fields are empty.
   */
  const handleSearch = async () => {
    // Guard — component name is required; show a helpful message instead of a 422
    if (!componentName.trim()) {
      setError("Please enter a component/material name.");
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError("");
    setSearched(true); // flip the flag so the "no results" message can appear

    try {
      // Build query params — only append optional filters when they have a value
      const params = new URLSearchParams();
      params.append("component_name", componentName.trim());
      if (itemType)            params.append("item_type",    itemType);
      if (manufacturer.trim()) params.append("manufacturer", manufacturer.trim());
      if (category.trim())     params.append("category",     category.trim());

      const res = await apiFetch(`/reverse-search?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to run reverse search");
      const data = await res.json();
      setResults(data); // array of { id, name, item_type, manufacturer, is_verified }
    } catch (err) {
      setError(err.message || "Something went wrong");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };


  /**
   * handleReset — clears all inputs, results, and error state.
   * Also resets the `searched` flag so the "no results" message disappears.
   */
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
      <button className="back-btn ghost" onClick={() => navigate("/")}>⬅ Back</button>

      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 6px" }}>🔎 Reverse Lookup</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 24px", fontSize: "0.88rem" }}>
        Find every SBOM that contains a specific component or library.
        Useful for CVE impact analysis.
      </p>

      {/* ── Search form ───────────────────────────────────────────────────── */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "18px", marginBottom: "1.5rem" }}>

        {/* Required: component name input + action buttons */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="Component name (e.g. openssl, log4j, curl)"
            value={componentName}
            onChange={(e) => setComponentName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()} // Enter key shortcut
            style={{ flex: 1, minWidth: "220px", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e2e8f0", fontSize: "0.9rem" }}
          />
          {/* Disabled while loading to prevent duplicate requests */}
          <button onClick={handleSearch} disabled={loading} style={{ padding: "10px 20px", borderRadius: "8px", background: "#5b8cff", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}>
            {loading ? "Searching..." : "Search"}
          </button>
          <button onClick={handleReset} className="ghost" style={{ padding: "10px 16px", borderRadius: "8px" }}>
            Reset
          </button>
        </div>

        {/* Optional filters — all three narrow the server-side query.
            Leaving them blank returns results across all types/manufacturers/categories. */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {/* Type filter — restricts to application or device items */}
          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "#1a2030", color: "#e2e8f0", fontSize: "0.85rem" }}
          >
            <option value="">All Types</option>
            <option value="application">Applications</option>
            <option value="device">Devices</option>
          </select>

          {/* Manufacturer filter — e.g. "Microsoft", "OpenSSL Project" */}
          <input
            type="text"
            placeholder="Manufacturer (optional)"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e2e8f0", fontSize: "0.85rem" }}
          />

          {/* Category filter — e.g. "Developer Tools", "Networking Device" */}
          <input
            type="text"
            placeholder="Category (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e2e8f0", fontSize: "0.85rem" }}
          />
        </div>
      </div>

      {/* ── Results area ──────────────────────────────────────────────────── */}

      {/* Error banner */}
      {error && <p style={{ color: "#ff6b6b", marginBottom: "12px", fontSize: "0.88rem" }}>{error}</p>}

      {/* Zero-results message — only shown AFTER a search has been run.
          Without the `searched` guard this would flash on initial page load. */}
      {searched && !loading && results.length === 0 && !error && (
        <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>
          No items found containing "{componentName}".
        </p>
      )}

      {/* Results list — each row is a clickable card linking to the item detail page */}
      {results.length > 0 && (
        <div>
          {/* Result count header */}
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "12px" }}>
            {results.length} item{results.length !== 1 ? "s" : ""} contain "{componentName}"
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {results.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/item/${item.id}`)}
                style={{
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "10px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(91,140,255,0.3)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
              >
                <div>
                  {/* Item name + verified badge */}
                  <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{item.name}</span>
                  {item.is_verified && (
                    <span style={{ marginLeft: "6px" }} title="Admin-verified SBOM">✅</span>
                  )}
                  {/* Manufacturer and item type sub-line */}
                  <div style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: "2px" }}>
                    {item.manufacturer} · {item.item_type}
                  </div>
                </div>
                {/* Right-side navigation hint */}
                <span style={{ fontSize: "0.78rem", color: "#5b8cff" }}>View →</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReverseLookup;