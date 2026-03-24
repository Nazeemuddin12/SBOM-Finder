import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const [searchName, setSearchName] = useState("");
  const [itemType, setItemType] = useState("");
  const [manufacturer, setManufacturer] = useState("");

  const navigate = useNavigate();

  const fetchAllItems = () => {
    fetch("http://127.0.0.1:8000/items")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch items");
        }
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
  };

  useEffect(() => {
    fetchAllItems();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (searchName.trim()) {
      params.append("name", searchName.trim());
    }

    if (itemType) {
      params.append("item_type", itemType);
    }

    if (manufacturer.trim()) {
      params.append("manufacturer", manufacturer.trim());
    }

    const queryString = params.toString();
    const url = queryString
      ? `http://127.0.0.1:8000/search?${queryString}`
      : "http://127.0.0.1:8000/items";

    fetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to search items");
        }
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
  };

  const handleReset = () => {
    setSearchName("");
    setItemType("");
    setManufacturer("");
    fetchAllItems();
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
      <h1 style={{ textAlign: "center" }}>SBOM Finder</h1>
      <h2 style={{ textAlign: "center" }}>Items Directory</h2>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "10px",
          padding: "20px",
          marginBottom: "25px",
        }}
      >
        <h3>Search & Filters</h3>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "15px" }}>
          <input
            type="text"
            placeholder="Search by item name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ padding: "10px", minWidth: "220px" }}
          />

          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
            style={{ padding: "10px", minWidth: "180px" }}
          >
            <option value="">All Types</option>
            <option value="device">Device</option>
            <option value="application">Application</option>
          </select>

          <input
            type="text"
            placeholder="Filter by manufacturer"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            style={{ padding: "10px", minWidth: "220px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleSearch}
            style={{ padding: "10px 16px", cursor: "pointer" }}
          >
            Search
          </button>

          <button
            onClick={handleReset}
            style={{ padding: "10px 16px", cursor: "pointer" }}
          >
            Reset
          </button>

          <button
            onClick={() => navigate("/compare")}
            style={{ padding: "10px 16px", cursor: "pointer" }}
          >
            Go to Compare Page
          </button>

          <button
            onClick={() => navigate("/stats")}
            style={{ padding: "10px 16px", cursor: "pointer" }}
          >
            View Stats Dashboard
          </button>
        </div>
      </div>

      {error && (
        <p style={{ color: "red", textAlign: "center" }}>
          Error: {error}
        </p>
      )}

      {!error && items.length === 0 && (
        <p style={{ textAlign: "center" }}>No items found.</p>
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
          <p><strong>Type:</strong> {item.item_type}</p>
          <p><strong>Manufacturer:</strong> {item.manufacturer}</p>
          <p><strong>Category:</strong> {item.category}</p>
          <p><strong>Operating System:</strong> {item.operating_system}</p>
        </div>
      ))}
    </div>
  );
}

export default Home;