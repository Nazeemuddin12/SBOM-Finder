import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Import() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState("cyclonedx");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a JSON file.");
      return;
    }

    setLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    const endpoint =
      format === "cyclonedx"
        ? "http://127.0.0.1:8000/import/cyclonedx"
        : "http://127.0.0.1:8000/import/spdx";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Import failed");
      }

      setMessage(`✅ ${data.message} (${data.item_name})`);
      setFile(null);
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <button
        onClick={() => navigate("/")}
        style={{ marginBottom: "20px", padding: "8px 14px", cursor: "pointer" }}
      >
        ⬅ Back
      </button>

      <h1>Import SBOM</h1>
      <p>Upload a CycloneDX or SPDX JSON file to add real SBOM data into the system.</p>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "10px",
          padding: "20px",
          marginTop: "20px",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <label>
            <strong>SBOM Format:</strong>
          </label>
          <br />
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            style={{ marginTop: "8px", padding: "10px", minWidth: "220px" }}
          >
            <option value="cyclonedx">CycloneDX</option>
            <option value="spdx">SPDX</option>
          </select>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label>
            <strong>Select JSON File:</strong>
          </label>
          <br />
          <input
            type="file"
            accept=".json"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ marginTop: "8px" }}
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={loading}
          style={{ padding: "10px 16px", cursor: "pointer" }}
        >
          {loading ? "Uploading..." : "Upload SBOM"}
        </button>

        {message && (
          <p style={{ marginTop: "20px" }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default Import;