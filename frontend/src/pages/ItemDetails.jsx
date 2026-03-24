import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/items/${id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch item details");
        }
        return res.json();
      })
      .then((data) => {
        setItem(data);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, [id]);

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <button onClick={() => navigate("/")}>Back</button>
        <p style={{ color: "red" }}>Error: {error}</p>
      </div>
    );
  }

  if (!item) {
    return <p style={{ padding: "20px" }}>Loading item details...</p>;
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
      <button
        onClick={() => navigate("/")}
        style={{ marginBottom: "20px", padding: "8px 14px", cursor: "pointer" }}
      >
        Back
      </button>

      <h1>{item.name}</h1>
      <p><strong>Type:</strong> {item.item_type}</p>
      <p><strong>Category:</strong> {item.category}</p>
      <p><strong>Manufacturer:</strong> {item.manufacturer}</p>
      <p><strong>Developer:</strong> {item.developer}</p>
      <p><strong>Operating System:</strong> {item.operating_system}</p>
      <p><strong>Description:</strong> {item.description}</p>

      <h2 style={{ marginTop: "30px" }}>Components</h2>

      {item.components.map((comp, index) => (
        <div
          key={index}
          style={{
            border: "1px solid gray",
            padding: "16px",
            marginBottom: "10px",
            borderRadius: "8px",
          }}
        >
          <p><strong>Name:</strong> {comp.component_name}</p>
          <p><strong>Version:</strong> {comp.version}</p>
          <p><strong>Supplier:</strong> {comp.supplier}</p>
          <p><strong>License:</strong> {comp.license}</p>
        </div>
      ))}
    </div>
  );
}

export default ItemDetails;