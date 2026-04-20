import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api";

function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/items/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch item details");
        return res.json();
      })
      .then((data) => {
        setItem(data);
        setError("");
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, [id]);

  if (error) {
    return (
      <div className="page-shell">
        <button className="back-btn ghost" onClick={() => navigate("/")}>
          ⬅ Back
        </button>
        <p className="error-text">Error: {error}</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="page-shell">
        <button className="back-btn ghost" onClick={() => navigate("/")}>
          ⬅ Back
        </button>
        <p style={{ color: "var(--muted)" }}>Loading item details...</p>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <button className="back-btn ghost" onClick={() => navigate("/")}>
        ⬅ Back
      </button>

      <section className="section-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 className="section-title">{item.name}</h2>
            <p style={{ color: "var(--muted)", margin: "4px 0 12px" }}>{item.description || "No description available"}</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span className={`item-type-badge ${item.item_type}`}>{item.item_type}</span>
              {item.category && <span className="item-type-badge application">{item.category}</span>}
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
        <h2 className="section-title">
          Components
          <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--muted)", marginLeft: "10px" }}>
            {item.components?.length || 0} found
          </span>
        </h2>

        {!item.components || item.components.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No components found for this item.</p>
        ) : (
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
                {item.components.map((comp, index) => (
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
        )}
      </section>
    </div>
  );
}

export default ItemDetails;