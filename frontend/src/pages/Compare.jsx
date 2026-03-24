import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const thStyle = {
  border: "1px solid #ccc",
  padding: "10px",
  background: "#222",
  color: "#fff",
};

const tdStyle = {
  border: "1px solid #ccc",
  padding: "10px",
  verticalAlign: "top",
};

const cardStyle = {
  border: "1px solid #ccc",
  borderRadius: "10px",
  padding: "16px",
  minWidth: "180px",
  textAlign: "center",
};

function Compare() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/items")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load items");
        return res.json();
      })
      .then((data) => setItems(data))
      .catch((err) => setError(err.message));
  }, []);

  const handleCheckboxChange = (itemId) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleCompare = () => {
    if (selectedItems.length === 0) {
      setError("Select at least one item");
      return;
    }

    const ids = selectedItems.join(",");

    fetch(`http://127.0.0.1:8000/compare-multi?item_ids=${ids}`)
      .then((res) => {
        if (!res.ok) throw new Error("Compare failed");
        return res.json();
      })
      .then((data) => {
        setResult(data);
        setError("");
      })
      .catch((err) => setError(err.message));
  };

  const getCategoryColor = (category) => {
    if (category === "common") return "lightgreen";
    if (category === "partial") return "orange";
    if (category === "unique") return "tomato";
    return "white";
  };

  const getSummaryCounts = () => {
    if (!result) {
      return {
        totalComparedItems: 0,
        totalDistinctComponents: 0,
        commonCount: 0,
        partialCount: 0,
        uniqueCount: 0,
      };
    }

    const totalDistinctComponents = result.comparison_rows.length;
    const commonCount = result.comparison_rows.filter(
      (row) => row.category === "common"
    ).length;
    const partialCount = result.comparison_rows.filter(
      (row) => row.category === "partial"
    ).length;
    const uniqueCount = result.comparison_rows.filter(
      (row) => row.category === "unique"
    ).length;

    return {
      totalComparedItems: result.selected_items.length,
      totalDistinctComponents,
      commonCount,
      partialCount,
      uniqueCount,
    };
  };

  const summary = getSummaryCounts();

  return (
    <div style={{ padding: "20px", maxWidth: "1300px", margin: "0 auto" }}>
      <button onClick={() => navigate("/")}>⬅ Back</button>

      <h1>Compare Items</h1>
      <p>
        Select multiple items to compare their components, versions, licenses,
        and suppliers.
      </p>

      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        {items.map((item) => (
          <div key={item.id} style={{ marginBottom: "10px" }}>
            <label>
              <input
                type="checkbox"
                checked={selectedItems.includes(item.id)}
                onChange={() => handleCheckboxChange(item.id)}
              />
              {" "}
              {item.name} ({item.item_type})
            </label>
          </div>
        ))}
      </div>

      <button onClick={handleCompare} style={{ marginBottom: "20px" }}>
        Compare
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: "30px" }}>
          <h2>Comparison Summary</h2>

          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "30px",
              marginTop: "20px",
            }}
          >
            <div style={cardStyle}>
              <h3>{summary.totalComparedItems}</h3>
              <p>Compared Items</p>
            </div>

            <div style={cardStyle}>
              <h3>{summary.totalDistinctComponents}</h3>
              <p>Distinct Components</p>
            </div>

            <div style={cardStyle}>
              <h3 style={{ color: "lightgreen" }}>{summary.commonCount}</h3>
              <p>Common Components</p>
            </div>

            <div style={cardStyle}>
              <h3 style={{ color: "orange" }}>{summary.partialCount}</h3>
              <p>Partial Components</p>
            </div>

            <div style={cardStyle}>
              <h3 style={{ color: "tomato" }}>{summary.uniqueCount}</h3>
              <p>Unique Components</p>
            </div>
          </div>

          <h2>Advanced Comparison Matrix</h2>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "20px",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Component</th>
                {result.selected_items.map((item, idx) => (
                  <th key={idx} style={thStyle}>{item}</th>
                ))}
                <th style={thStyle}>Category</th>
              </tr>
            </thead>

            <tbody>
              {result.comparison_rows.map((row, idx) => (
                <tr key={idx}>
                  <td style={tdStyle}>
                    <strong>{row.component_name}</strong>
                  </td>

                  {result.selected_items.map((itemName, i) => {
                    const details = row.item_details[itemName];

                    return (
                      <td key={i} style={tdStyle}>
                        {details ? (
                          <div>
                            <div>✔️ Present</div>
                            <div><strong>Version:</strong> {details.version || "N/A"}</div>
                            <div><strong>License:</strong> {details.license || "N/A"}</div>
                            <div><strong>Supplier:</strong> {details.supplier || "N/A"}</div>
                          </div>
                        ) : (
                          <div>—</div>
                        )}
                      </td>
                    );
                  })}

                  <td
                    style={{
                      ...tdStyle,
                      color: getCategoryColor(row.category),
                      fontWeight: "bold",
                      textTransform: "capitalize",
                    }}
                  >
                    {row.category}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "20px" }}>
            <p><strong>Legend:</strong></p>
            <p style={{ color: "lightgreen" }}>
              Common = present in all selected items
            </p>
            <p style={{ color: "orange" }}>
              Partial = present in some but not all selected items
            </p>
            <p style={{ color: "tomato" }}>
              Unique = present in only one selected item
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Compare;