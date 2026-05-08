import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

function TrackedProducts() {
  const navigate = useNavigate();
  const [trackedItems, setTrackedItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const loadTrackedItems = async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    setError("");
    try {
      const res = await apiFetch("/tracked-products");
      if (!res.ok) throw new Error("Failed to load tracked products");
      const data = await res.json();
      setTrackedItems(data);
    } catch (err) {
      setError(err.message || "Failed to load tracked products");
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  useEffect(() => { loadTrackedItems(); }, []);

  if (loading) return (
    <div className="page-shell">
      <button className="back-btn ghost" onClick={() => navigate("/")}>⬅ Back</button>
      <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--muted)" }}>
        <p>Loading tracked products...</p>
        <p style={{ fontSize: "0.82rem", marginTop: "6px" }}>
          The backend may be waking up — this can take up to 30 seconds on first load.
        </p>
      </div>
    </div>
  );

  return (
    <div className="page-shell">
      <button className="back-btn ghost" onClick={() => navigate("/")}>⬅ Back</button>
      <section className="section-card">
        <h2 className="section-title">Tracked Products</h2>
        <p className="section-subtitle">Products saved from external search suggestions for future analysis.</p>

        {error && (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <p className="error-text" style={{ marginBottom: "12px" }}>{error}</p>
            <button onClick={() => loadTrackedItems(true)} disabled={retrying}>
              {retrying ? "Retrying..." : "Retry"}
            </button>
          </div>
        )}

        {!error && trackedItems.length === 0 && (
          <div className="empty-state">No tracked products yet.</div>
        )}

        {!error && trackedItems.length > 0 && (
          <div className="item-list">
            {trackedItems.map((item) => (
              <div key={item.id} className="item-card">
                <div className="item-card-header">
                  <h3>{item.name}</h3>
                  <span className="badge">{item.status || "pending"}</span>
                </div>
                <p className="desc">{item.notes || "No notes available."}</p>
                <div className="item-meta">
                  <div className="meta-pill"><span>Type</span><strong>{item.product_type || "N/A"}</strong></div>
                  <div className="meta-pill"><span>Vendor</span><strong>{item.vendor || "N/A"}</strong></div>
                  <div className="meta-pill">
                    <span>Created At</span>
                    <strong>{item.created_at ? new Date(item.created_at).toLocaleString() : "N/A"}</strong>
                  </div>
                  <div className="meta-pill">
                    <span>Last Checked</span>
                    <strong>{item.last_checked ? new Date(item.last_checked).toLocaleString() : "N/A"}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default TrackedProducts;