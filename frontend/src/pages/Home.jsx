// ============================================================
// Home.jsx
// SBOM Finder — Personal Dashboard (requires login)
// ============================================================
// The main workspace view for authenticated users. Three sections:
//
//   1. Welcome header — greeting, workspace stats, Import button
//   2. Search bar     — smart search with live-fetch row
//   3. Results        — local items grid OR external registry results
//
// Search behaviour:
//   - Empty search  → shows all workspace items (GET /items)
//   - With keyword  → calls GET /search-smart which returns
//       { local_results, external_results }
//       Local hits fill the items grid; external hits (npm/PyPI/GitHub/…)
//       appear in a separate "External Results" section below.
//
// Live fetch:
//   - User types a package name + picks an ecosystem (npm/PyPI/Maven/…)
//   - POST /fetch-live-sbom pulls real dependency data from the registry
//     and saves it directly to the workspace as a new item
// ============================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { useAuth } from "../context/Authcontext";


export default function Home() {
  const navigate    = useNavigate();
  const { user }    = useAuth(); // used for the greeting (user.username)

  // ── State ─────────────────────────────────────────────────────────────────
  const [items, setItems]                   = useState([]);    // workspace items (local DB)
  const [stats, setStats]                   = useState(null);  // aggregate workspace stats
  const [externalResults, setExternalResults] = useState([]); // fallback registry search hits
  const [error, setError]                   = useState("");
  const [successMessage, setSuccessMessage] = useState("");    // green confirmation banner
  const [searchName, setSearchName]         = useState("");    // text field value
  const [itemType, setItemType]             = useState("");    // filter: "" | "application" | "device"
  const [loading, setLoading]               = useState(true);  // initial page load
  const [liveEcosystem, setLiveEcosystem]   = useState("npm"); // live-fetch dropdown


  // ── Data loading ──────────────────────────────────────────────────────────

  /**
   * loadDashboard — fetches the item list and workspace stats in parallel.
   * Uses Promise.all so both requests fire simultaneously instead of sequentially.
   * Called on mount and after any action that modifies the workspace
   * (live fetch, import external, etc.)
   */
  const loadDashboard = async () => {
    try {
      const [itemsRes, statsRes] = await Promise.all([
        apiFetch("/items"),
        apiFetch("/stats"),
      ]);
      if (itemsRes.ok) setItems(await itemsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Run loadDashboard once when the component first mounts
  useEffect(() => { loadDashboard(); }, []);


  // ── Search handlers ───────────────────────────────────────────────────────

  /**
   * handleSearch — runs a smart search against the backend.
   *
   * With a keyword: calls /search-smart which checks the local DB first,
   *   then fans out to npm/PyPI/Maven/GitHub/NuGet/RubyGems in parallel.
   *   Returns { local_results, external_results }.
   *
   * Without a keyword: falls back to /items with optional type filter,
   *   which is faster and doesn't hit external registries.
   */
  const handleSearch = async () => {
    try {
      setSuccessMessage("");
      setExternalResults([]); // clear any previous external results

      const params = new URLSearchParams();
      if (searchName.trim()) params.append("q", searchName.trim());
      if (itemType)          params.append("item_type", itemType);

      const hasSearchTerm = searchName.trim().length > 0;
      // Route to the smart search endpoint only when there's a keyword —
      // filtering by type alone doesn't need the external registry lookup
      const url = hasSearchTerm ? `/search-smart?${params}` : `/items?${params}`;

      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();

      if (hasSearchTerm) {
        // Smart search returns two separate lists
        setItems(data.local_results || []);
        setExternalResults(data.external_results || []);
      } else {
        // Plain item list — just an array
        setItems(data);
      }
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };


  /**
   * handleReset — clears all filters and reloads the full unfiltered workspace.
   * Also clears any success/error messages left over from previous actions.
   */
  const handleReset = async () => {
    setSearchName("");
    setItemType("");
    setExternalResults([]);
    setSuccessMessage("");
    setError("");
    await loadDashboard();
  };


  /**
   * handleLiveFetch — fetches a live SBOM from a package registry.
   * Requires a package name in the search box.
   * POST /fetch-live-sbom { name, ecosystem } → backend queries the registry,
   * extracts dependencies, and saves a new Item to the workspace.
   */
  const handleLiveFetch = async () => {
    if (!searchName.trim()) {
      setError("Enter a package name in the search box first");
      return;
    }
    setError("");
    setSuccessMessage("");
    try {
      const res = await apiFetch("/fetch-live-sbom", {
        method: "POST",
        body: JSON.stringify({ name: searchName.trim(), ecosystem: liveEcosystem }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      // Show how many components were found in the success banner
      setSuccessMessage(`✅ ${data.message} — ${data.components_found} components found`);
      await loadDashboard(); // refresh the items grid to show the new item
    } catch (err) {
      setError(err.message);
    }
  };


  /**
   * handleImportExternal — saves an external search result into the workspace.
   * Converts the external hit (which has no local ID) into a proper Item record.
   * After import, reloads the dashboard so the new item appears in the grid.
   */
  const handleImportExternal = async (item) => {
    try {
      const res = await apiFetch("/external-items/import", {
        method: "POST",
        body: JSON.stringify({
          name:        item.name,
          full_name:   item.full_name,
          url:         item.url,
          description: item.description,
          owner:       item.owner,
          stars:       item.stars,
          source:      item.source,
          item_type:   "application", // external results are always applications
        }),
      });
      if (!res.ok) throw new Error("Failed to import");
      setSuccessMessage(`"${item.name}" imported to workspace.`);
      await loadDashboard(); // show the newly imported item in the grid
    } catch (err) {
      setError(err.message);
    }
  };


  /**
   * handleTrackExternal — adds an external result to the tracked products watchlist.
   * Unlike import, this doesn't create an Item — it creates a TrackedProduct so
   * the backend can monitor it for SBOM updates over time.
   */
  const handleTrackExternal = async (item) => {
    try {
      const res = await apiFetch("/tracked-products", {
        method: "POST",
        body: JSON.stringify({
          name:         item.full_name || item.name, // prefer full_name (e.g. "owner/repo")
          product_type: "application",
          vendor:       item.owner || null,
          notes:        item.description || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to track");
      setSuccessMessage(`"${item.name}" added to tracked products.`);
      // No dashboard reload needed — tracked products are on a separate page
    } catch (err) {
      setError(err.message);
    }
  };


  /**
   * greeting — time-aware greeting for the dashboard header.
   * Returns "Good morning", "Good afternoon", or "Good evening"
   * based on the user's local time.
   */
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };


  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-shell">

      {/* ── Welcome header ────────────────────────────────────────────────── */}
      {/* Shows the greeting, aggregate stats, and the Import SBOM shortcut */}
      <div style={{
        padding: "2rem 0 1.5rem",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        marginBottom: "2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        flexWrap: "wrap",
        gap: "16px",
      }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 6px", color: "#e2e8f0" }}>
            {greeting()}, {user?.username} 👋
          </h1>
          {/* Stats sub-line — shows item/component/tracked counts once loaded */}
          <p style={{ color: "#8b97a8", margin: 0, fontSize: "0.88rem" }}>
            {stats
              ? `${stats.total_items} items · ${stats.total_components} components · ${stats.total_tracked_products} tracked`
              : "Loading workspace..."}
          </p>
        </div>
        {/* Primary CTA — navigate to the import page */}
        <button
          onClick={() => navigate("/import")}
          style={{
            padding: "10px 20px", borderRadius: "10px",
            background: "rgba(91,140,255,0.8)", color: "#fff",
            border: "none", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem",
          }}
        >
          + Import SBOM
        </button>
      </div>

      {/* ── Search & live-fetch panel ──────────────────────────────────────── */}
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        padding: "20px",
        marginBottom: "1.5rem",
      }}>

        {/* Top row: keyword input, type filter, Search + Reset buttons */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search items by name, keyword, component..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()} // Enter key support
            style={{ flex: 1, minWidth: "200px", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e2e8f0", fontSize: "0.9rem" }}
          />
          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e2e8f0", fontSize: "0.9rem" }}
          >
            <option value="">All Types</option>
            <option value="application">Applications</option>
            <option value="device">Devices</option>
          </select>
          <button onClick={handleSearch} style={{ padding: "10px 20px", borderRadius: "8px", background: "rgba(91,140,255,0.7)", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}>
            Search
          </button>
          <button onClick={handleReset} className="ghost" style={{ padding: "10px 16px", borderRadius: "8px" }}>
            Reset
          </button>
        </div>

        {/* Live-fetch row — separate from the smart search above.
            Directly queries a package registry and saves the result as a new workspace item. */}
        <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.78rem", color: "#8b97a8" }}>🌐 Fetch live SBOM from registry:</span>
          {/* Ecosystem picker — determines which registry the backend queries */}
          <select
            value={liveEcosystem}
            onChange={(e) => setLiveEcosystem(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "#1a2030", color: "#e2e8f0", fontSize: "0.82rem" }}
          >
            <option value="npm">npm</option>
            <option value="pypi">PyPI</option>
            <option value="maven">Maven</option>
            <option value="go">Go</option>
            <option value="cargo">Cargo</option>
          </select>
          <button
            onClick={handleLiveFetch}
            style={{ padding: "6px 14px", borderRadius: "6px", background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}
          >
            Fetch Live SBOM
          </button>
        </div>

        {/* Error and success banners — mutually exclusive in practice */}
        {error          && <p style={{ color: "#ff6b6b", margin: "10px 0 0", fontSize: "0.85rem" }}>{error}</p>}
        {successMessage && <p style={{ color: "#34d399", margin: "10px 0 0", fontSize: "0.85rem" }}>{successMessage}</p>}
      </div>

      {/* ── Loading state ──────────────────────────────────────────────────── */}
      {/* Shown only during the initial dashboard load, not during searches */}
      {loading && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#8b97a8" }}>
          <p>Loading your workspace...</p>
          <p style={{ fontSize: "0.8rem", marginTop: "6px" }}>Backend may be waking up — please wait up to 30 seconds.</p>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {/* Shown after loading completes with zero items and no errors */}
      {!loading && items.length === 0 && !error && externalResults.length === 0 && (
        <div style={{ textAlign: "center", padding: "4rem 2rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📭</div>
          <h3 style={{ color: "#e2e8f0", margin: "0 0 8px" }}>No items yet</h3>
          <p style={{ color: "#8b97a8", marginBottom: "20px", fontSize: "0.88rem" }}>
            Import a CycloneDX or SPDX file, or use the live fetch above to get started.
          </p>
          <button onClick={() => navigate("/import")}>+ Import your first SBOM</button>
        </div>
      )}

      {/* ── Local items grid ───────────────────────────────────────────────── */}
      {/* Responsive card grid — each card navigates to the item detail page on click */}
      {!loading && items.length > 0 && (
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "14px",
          padding: "20px",
          marginBottom: "1.5rem",
        }}>
          <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "#8b97a8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 16px" }}>
            Indexed Items
            <span style={{ fontWeight: 400, marginLeft: "8px", color: "#5a6478" }}>{items.length} found</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/item/${item.id}`)}
                style={{
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(91,140,255,0.35)"; e.currentTarget.style.background = "rgba(91,140,255,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              >
                {/* Card header: item name (truncated) + type badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <span style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "170px" }}>
                    {item.name}
                  </span>
                  {/* Blue for applications, orange for devices */}
                  <span style={{
                    fontSize: "0.65rem", padding: "2px 8px", borderRadius: "20px",
                    flexShrink: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                    background: item.item_type === "application" ? "rgba(91,140,255,0.15)" : "rgba(249,115,22,0.15)",
                    color:      item.item_type === "application" ? "#5b8cff"              : "#f97316",
                  }}>
                    {item.item_type}
                  </span>
                </div>

                {/* Manufacturer and category sub-line */}
                <p style={{ color: "#8b97a8", fontSize: "0.78rem", margin: "0 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.manufacturer || "Unknown"} · {item.category || "Uncategorized"}
                </p>

                {/* Card footer: source format badge + "View →" link */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize: "0.72rem", color: "#5a6478" }}>
                    {/* Map source_format to a human-readable emoji label */}
                    {item.source_format === "cyclonedx"     ? "🔵 CycloneDX" :
                     item.source_format === "spdx"          ? "🟢 SPDX"      :
                     item.source_format === "ai_discovered" ? "🤖 AI"         :
                     item.source_format === "external"      ? "🌐 External"   :
                     item.source_format === "live_fetched"  ? "📡 Live"       :
                     item.source_format === "public_catalog"? "🌐 Public"     :
                     "📦 " + (item.source_format || "unknown")}
                    {item.version ? ` · v${item.version}` : ""}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "#5b8cff" }}>View →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── External results section ───────────────────────────────────────── */}
      {/* Shown when the smart search found no local results but did find
          external hits from npm/PyPI/GitHub/Maven/NuGet/RubyGems.
          Each card has two actions: Import (save to workspace) or Track (watchlist). */}
      {externalResults.length > 0 && (
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(52,211,153,0.15)",   // green border to distinguish from local
          borderRadius: "14px",
          padding: "20px",
        }}>
          <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px" }}>
            External Results
          </h2>
          <p style={{ color: "#8b97a8", fontSize: "0.8rem", margin: "0 0 16px" }}>
            No local matches found. Results from npm, PyPI, Maven, GitHub and more:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
            {externalResults.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "10px",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(52,211,153,0.3)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
              >
                {/* Package name + source badge (e.g. "npm", "GitHub") */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.88rem" }}>{item.name}</span>
                  <span style={{ fontSize: "0.68rem", color: "#34d399", background: "rgba(52,211,153,0.1)", padding: "2px 7px", borderRadius: "10px" }}>
                    {item.source}
                  </span>
                </div>
                {/* Version — shown in monospace when available */}
                {item.version && <p style={{ color: "#5b8cff", fontSize: "0.72rem", margin: "2px 0 4px", fontFamily: "monospace" }}>v{item.version}</p>}
                {/* Description — clamped to 2 lines with CSS */}
                <p style={{ color: "#8b97a8", fontSize: "0.78rem", margin: "0 0 10px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {item.description || "No description available."}
                </p>
                {item.license && <p style={{ fontSize: "0.7rem", color: "#a78bfa", margin: "0 0 10px" }}>📜 {item.license}</p>}
                {/* Action buttons — Import saves immediately; Track adds to watchlist */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => handleImportExternal(item)}
                    style={{ flex: 1, padding: "6px", fontSize: "0.75rem", borderRadius: "6px", background: "rgba(91,140,255,0.2)", color: "#5b8cff", border: "1px solid rgba(91,140,255,0.3)", cursor: "pointer" }}
                  >
                    Import
                  </button>
                  <button
                    onClick={() => handleTrackExternal(item)}
                    style={{ flex: 1, padding: "6px", fontSize: "0.75rem", borderRadius: "6px", background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)", cursor: "pointer" }}
                  >
                    Track
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}