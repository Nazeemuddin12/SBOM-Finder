import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

function Compare() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/items`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load items");
        return res.json();
      })
      .then((data) => {
        setItems(data);
        setError("");
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, []);

  const handleCheckboxChange = (itemId) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleCompare = async () => {
    if (selectedItems.length < 2) {
      setError("Please select at least 2 items to compare.");
      setResult(null);
      return;
    }

    if (selectedItems.length > 4) {
      setError("You can compare at most 4 items.");
      setResult(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/compare-multi?item_ids=${selectedItems.join(",")}`);
      if (!res.ok) throw new Error("Comparison failed");

      const data = await res.json();
      setResult(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError(err.message);
      setResult(null);
    }
  };

  const handleClear = () => {
    setSelectedItems([]);
    setResult(null);
    setError("");
  };

  const getClassForCategory = (category) => {
    if (category === "common") return "tag-common";
    if (category === "partial") return "tag-partial";
    if (category === "unique") return "tag-unique";
    return "";
  };

  return (
    <div className="page-shell">
      <button className="back-btn ghost" onClick={() => navigate("/")}>
        ⬅ Back
      </button>

      <section className="section-card">
        <h2 className="section-title">Compare Items</h2>
        <p className="section-subtitle">
          Select 2 to 4 items and inspect shared, partial, and unique SBOM components.
        </p>

        <div className="compare-selection-grid">
          {items.map((item) => (
            <label key={item.id} className="compare-option">
              <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => handleCheckboxChange(item.id)}
                  style={{ width: "auto", marginTop: "4px" }}
                />
                <div>
                  <strong style={{ fontSize: "1.05rem" }}>{item.name}</strong>
                  <p style={{ margin: "8px 0 0", color: "#a9b7d0" }}>
                    {item.item_type || "N/A"} • {item.manufacturer || "Unknown manufacturer"}
                  </p>
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="actions-row" style={{ marginTop: "18px" }}>
          <button onClick={handleCompare}>Run Comparison</button>
          <button className="ghost" onClick={handleClear}>Clear</button>
        </div>

        {error && <p className="error-text" style={{ marginTop: "14px" }}>{error}</p>}
      </section>

      {result && (
        <section className="section-card">
          <h2 className="section-title">Comparison Matrix</h2>
          <p className="section-subtitle">
            Common = present in all selected items, Partial = present in some, Unique = present in only one.
          </p>

          <div className="table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Component</th>
                  {result.selected_items.map((item, idx) => (
                    <th key={idx}>{item}</th>
                  ))}
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {result.comparison_rows.map((row, idx) => (
                  <tr key={idx}>
                    <td><strong>{row.component_name}</strong></td>
                    {result.selected_items.map((itemName, i) => {
                      const details = row.item_details[itemName];
                      return (
                        <td key={i}>
                          {details ? (
                            <div>
                              <div>✔ Present</div>
                              <div>Version: {details.version || "N/A"}</div>
                              <div>License: {details.license || "N/A"}</div>
                              <div>Supplier: {details.supplier || "N/A"}</div>
                            </div>
                          ) : (
                            <div>—</div>
                          )}
                        </td>
                      );
                    })}
                    <td className={getClassForCategory(row.category)}>{row.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default Compare;