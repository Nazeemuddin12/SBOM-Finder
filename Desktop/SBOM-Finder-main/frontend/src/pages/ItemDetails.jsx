import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api";

const PRESET_OS = ["Windows", "Linux", "macOS", "Android", "iOS", "FreeBSD", "Embedded/RTOS"];

function OSManager({ itemId, osEntries, onUpdate }) {
  const [entries, setEntries] = useState(osEntries || []);
  const [selected, setSelected] = useState("");
  const [custom, setCustom] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    const osName = selected === "__custom__" ? custom.trim() : selected;
    if (!osName) return;
    setAdding(true);
    setError("");
    try {
      const res = await apiFetch(`/items/${itemId}/os`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ os_name: osName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to add OS");
      }
      const newEntry = await res.json();
      const updated = [...entries, newEntry];
      setEntries(updated);
      onUpdate(updated);
      setSelected("");
      setCustom("");
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (osId, osName) => {
    try {
      const res = await apiFetch(`/items/${itemId}/os/${osId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove OS");
      const updated = entries.filter((e) => e.id !== osId);
      setEntries(updated);
      onUpdate(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {/* Current OS tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
        {entries.length === 0 && (
          <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No platforms added yet</span>
        )}
        {entries.map((e) => (
          <span key={e.id} style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: "20px", padding: "4px 12px", fontSize: "0.82rem", color: "var(--text)",
          }}>
            {e.os_name}
            <button
              onClick={() => handleRemove(e.id, e.os_name)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "14px", padding: 0, lineHeight: 1 }}
            >×</button>
          </span>
        ))}
      </div>

      {/* Add OS row */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{ padding: "7px 10px", fontSize: "0.85rem", borderRadius: "8px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", minWidth: "160px" }}
        >
          <option value="">Select platform...</option>
          {PRESET_OS.filter((os) => !entries.find((e) => e.os_name === os)).map((os) => (
            <option key={os} value={os}>{os}</option>
          ))}
          <option value="__custom__">+ Custom...</option>
        </select>

        {selected === "__custom__" && (
          <input
            type="text"
            placeholder="e.g. VxWorks"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            style={{ padding: "7px 10px", fontSize: "0.85rem", borderRadius: "8px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", width: "140px" }}
          />
        )}

        <button
          onClick={handleAdd}
          disabled={adding || !selected || (selected === "__custom__" && !custom.trim())}
          style={{
            padding: "7px 16px", fontSize: "0.85rem", borderRadius: "8px",
            background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer",
            opacity: adding ? 0.6 : 1,
          }}
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </div>

      {error && <p style={{ color: "#ff6b6b", fontSize: "0.82rem", marginTop: "8px" }}>{error}</p>}
    </div>
  );
}

function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [componentSearch, setComponentSearch] = useState("");

  useEffect(() => {
    apiFetch(`/items/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch item details");
        return res.json();
      })
      .then((data) => { setItem(data); setError(""); })
      .catch((err) => setError(err.message));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      navigate("/");
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  const filteredComponents = item?.components?.filter((c) =>
    c.component_name?.toLowerCase().includes(componentSearch.toLowerCase()) ||
    c.version?.toLowerCase().includes(componentSearch.toLowerCase()) ||
    c.license?.toLowerCase().includes(componentSearch.toLowerCase())
  ) || [];

  if (error) return (
    <div className="page-shell">
      <button className="back-btn ghost" onClick={() => navigate("/")}>⬅ Back</button>
      <p className="error-text">Error: {error}</p>
    </div>
  );

  if (!item) return (
    <div className="page-shell">
      <button className="back-btn ghost" onClick={() => navigate("/")}>⬅ Back</button>
      <p style={{ color: "var(--muted)" }}>Loading item details...</p>
    </div>
  );

  return (
    <div className="page-shell">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <button className="back-btn ghost" onClick={() => navigate("/")}>⬅ Back</button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            background: "rgba(255,80,80,0.12)", color: "#ff6b6b",
            border: "1px solid rgba(255,80,80,0.3)", borderRadius: "8px",
            padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem",
          }}
        >
          {deleting ? "Deleting..." : "🗑 Delete Item"}
        </button>
      </div>

      <section className="section-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 className="section-title">{item.name}</h2>
            <p style={{ color: "var(--muted)", margin: "4px 0 12px" }}>{item.description || "No description available"}</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span className={`item-type-badge ${item.item_type}`}>{item.item_type}</span>
              {item.category && <span className="item-type-badge application">{item.category}</span>}
              {item.source_format && <span className="item-type-badge">{item.source_format}</span>}
            </div>
          </div>
          {item.version && (
            <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>v{item.version}</span>
          )}
        </div>

        <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[
            ["Manufacturer", item.manufacturer],
            ["Developer", item.developer],
            ["Owner", item.owner],
            ["Source Format", item.source_format],
            ["Source Name", item.source_name],
          ].map(([label, value]) => value && (
            <div key={label} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
              <p style={{ fontSize: "0.92rem", color: "var(--text)", margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* OS Manager — replaces the old plain text OS field */}
        <div style={{ marginTop: "16px", padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Operating Systems
          </p>
          <OSManager
            itemId={id}
            osEntries={item.os_entries || []}
            onUpdate={(updated) => setItem((prev) => ({ ...prev, os_entries: updated }))}
          />
        </div>
      </section>

      <section className="section-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            Components
            <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--muted)", marginLeft: "10px" }}>
              {item.components?.length || 0} total
            </span>
          </h2>
          {item.components?.length > 5 && (
            <input
              type="text"
              placeholder="Search components..."
              value={componentSearch}
              onChange={(e) => setComponentSearch(e.target.value)}
              style={{ width: "220px", padding: "8px 12px", fontSize: "0.85rem" }}
            />
          )}
        </div>

        {!item.components || item.components.length === 0 ? (
          <div className="empty-state">
            <p>No components found for this item.</p>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "6px" }}>
              This may be an externally imported item without SBOM component data.
            </p>
          </div>
        ) : (
          <>
            {componentSearch && (
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "12px" }}>
                Showing {filteredComponents.length} of {item.components.length} components
              </p>
            )}
            <div className="table-wrap">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Version</th>
                    <th>Supplier</th>
                    <th>License</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComponents.map((comp, index) => (
                    <tr key={index}>
                      <td><strong>{comp.component_name || "N/A"}</strong></td>
                      <td style={{ fontFamily: "monospace", color: "var(--muted)" }}>{comp.version || "—"}</td>
                      <td style={{ color: "var(--muted)" }}>{comp.supplier || "—"}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "12px" }}>{comp.license || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default ItemDetails;