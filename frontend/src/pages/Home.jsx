import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://127.0.0.1:8000/items")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch items");
        }
        return res.json();
      })
      .then((data) => {
        setItems(data);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, []);

  return (
    <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
      <h1 style={{ textAlign: "center" }}>SBOM Finder</h1>
      <h2 style={{ textAlign: "center" }}>Items</h2>

      {error && (
        <p style={{ color: "red", textAlign: "center" }}>
          Error: {error}
        </p>
      )}

      {!error && items.length === 0 && (
        <p style={{ textAlign: "center" }}>Loading items...</p>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => navigate(`/item/${item.id}`)}
          style={{
            border: "1px solid gray",
            padding: "20px",
            marginBottom: "12px",
            cursor: "pointer",
            borderRadius: "8px",
          }}
        >
          <h3>{item.name}</h3>
          <p>Type: {item.item_type}</p>
          <p>Manufacturer: {item.manufacturer}</p>
        </div>
      ))}
    </div>
  );
}

export default Home;