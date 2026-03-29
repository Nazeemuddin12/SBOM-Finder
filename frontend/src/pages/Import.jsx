import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

function Import() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

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
        ? `${API_BASE_URL}/import/cyclonedx`
        : `${API_BASE_URL}/import/spdx`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Import failed");
      }

      setMessage(`Imported successfully: ${data.item_name}`);

      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setMessage(error.message || "Something went wrong during upload");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <button className="back-btn" onClick={() => navigate("/")}>
        ⬅ Back
      </button>

      <section className="hero">
        <h1>Import SBOM</h1>
        <p>
          Upload CycloneDX or SPDX JSON files to populate the unified application and device directory.
        </p>
      </section>

      <section className="section-card upload-box">
        <h2 className="section-title">Upload File</h2>
        <p className="section-subtitle">
          Import real SBOM data to make comparison, lookup, and exploration meaningful.
        </p>

        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <label><strong>SBOM Format</strong></label>
            <div style={{ marginTop: "8px" }}>
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="cyclonedx">CycloneDX</option>
                <option value="spdx">SPDX</option>
              </select>
            </div>
          </div>

          <div>
            <label><strong>Select JSON File</strong></label>
            <div style={{ marginTop: "8px" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </div>
          </div>

          <div className="actions-row">
            <button onClick={handleUpload} disabled={loading}>
              {loading ? "Uploading..." : "Upload SBOM"}
            </button>
          </div>

          {message && (
            <div className="info-banner">
              {message}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Import;