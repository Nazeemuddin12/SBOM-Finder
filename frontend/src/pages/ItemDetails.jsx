import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { API_BASE_URL } from "../config";

function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/items/${id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch item details");
        }
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
      <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
        <button
          onClick={() => navigate("/")}
          style={{ marginBottom: "20px", padding: "8px 14px", cursor: "pointer" }}
        >
          ⬅ Back
        </button>
        <p style={{ color: "red" }}>Error: {error}</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
        <button
          onClick={() => navigate("/")}
          style={{ marginBottom: "20px", padding: "8px 14px", cursor: "pointer" }}
        >
          ⬅ Back
        </button>
        <p>Loading item details...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
      <button
        onClick={() => navigate("/")}
        style={{ marginBottom: "20px", padding: "8px 14px", cursor: "pointer" }}
      >
        ⬅ Back
      </button>

      <h1>{item.name}</h1>
      <p><strong>Type:</strong> {item.item_type || "N/A"}</p>
      <p><strong>Category:</strong> {item.category || "N/A"}</p>
      <p><strong>Manufacturer:</strong> {item.manufacturer || "N/A"}</p>
      <p><strong>Developer:</strong> {item.developer || "N/A"}</p>
      <p><strong>Operating System:</strong> {item.operating_system || "N/A"}</p>
      <p><strong>Description:</strong> {item.description || "N/A"}</p>
      <p><strong>Owner:</strong> {item.owner || "N/A"}</p>
      <p><strong>Version:</strong> {item.version || "N/A"}</p>
      <p><strong>Source Format:</strong> {item.source_format || "N/A"}</p>
      <p><strong>Source Name:</strong> {item.source_name || "N/A"}</p>

      <h2 style={{ marginTop: "30px" }}>Components</h2>

      {!item.components || item.components.length === 0 ? (
        <p>No components found for this item.</p>
      ) : (
        item.components.map((comp, index) => (
          <div
            key={index}
            style={{
              border: "1px solid gray",
              padding: "16px",
              marginBottom: "10px",
              borderRadius: "8px",
            }}
          >
            <p><strong>Name:</strong> {comp.component_name || "N/A"}</p>
            <p><strong>Version:</strong> {comp.version || "N/A"}</p>
            <p><strong>Supplier:</strong> {comp.supplier || "N/A"}</p>
            <p><strong>License:</strong> {comp.license || "N/A"}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default ItemDetails;