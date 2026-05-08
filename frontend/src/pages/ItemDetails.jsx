import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api";

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
            background: "rgba(255,80,80,0.12)",
            color: "#ff6b6b",
            border: "1px solid rgba(255,80,80,0.3)",
            borderRadius: "8px",
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: "0.85rem",
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
            ["Operating System", item.operating_system],
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