import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

function TrackedProducts() {
  const navigate = useNavigate();
  const [trackedItems, setTrackedItems] = useState([]);
  const [error, setError] = useState("");

  const loadTrackedItems = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/tracked-products`);
      if (!res.ok) {
        throw new Error("Failed to load tracked products");
      }
      const data = await res.json();
      setTrackedItems(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load tracked products");
    }
  };

  useEffect(() => {
    loadTrackedItems();
  }, []);

  return (
    <div className="page-shell">
      <button className="back-btn ghost" onClick={() => navigate("/")}>
        ⬅ Back
      </button>

      <section className="section-card">
        <h2 className="section-title">Tracked Products</h2>
        <p className="section-subtitle">
          Products saved from external search suggestions for future analysis.
        </p>

        {error && <p className="error-text">Error: {error}</p>}

        {!error && trackedItems.length === 0 ? (
          <div className="empty-state">
            No tracked products yet.
          </div>
        ) : (
          <div className="item-list">
            {trackedItems.map((item) => (
              <div key={item.id} className="item-card">
                <div className="item-card-header">
                  <h3>{item.name}</h3>
                  <span className="badge">{item.status || "pending"}</span>
                </div>

                <p className="desc">{item.notes || "No notes available."}</p>

                <div className="item-meta">
                  <div className="meta-pill">
                    <span>Type</span>
                    <strong>{item.product_type || "N/A"}</strong>
                  </div>
                  <div className="meta-pill">
                    <span>Vendor</span>
                    <strong>{item.vendor || "N/A"}</strong>
                  </div>
                  <div className="meta-pill">
                    <span>Created At</span>
                    <strong>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : "N/A"}
                    </strong>
                  </div>
                  <div className="meta-pill">
                    <span>Last Checked</span>
                    <strong>
                      {item.last_checked
                        ? new Date(item.last_checked).toLocaleString()
                        : "N/A"}
                    </strong>
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