// ============================================================
// Import.jsx
// SBOM Finder — SBOM File Import Page
// ============================================================
// Lets the user upload a JSON file in either CycloneDX or SPDX
// format and import it into their workspace.
//
// Flow:
//   1. User selects format (CycloneDX or SPDX) from a dropdown
//   2. User picks a .json file using a hidden <input type="file">
//      triggered by a styled button (avoids ugly native file input)
//   3. File is sent as multipart/form-data to the matching endpoint:
//        CycloneDX → POST /import/cyclonedx
//        SPDX      → POST /import/spdx
//   4. On success, shows a message and auto-navigates to the item
//
// Important: Content-Type must NOT be set manually for FormData —
// the browser must set it with the correct multipart boundary.
// ============================================================

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, getToken } from "../api";


function Import() {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null); // ref to the hidden <input type="file">

  const [file, setFile]       = useState(null);
  const [format, setFormat]   = useState("cyclonedx"); // "cyclonedx" | "spdx"
  const [message, setMessage] = useState("");           // feedback text
  const [isError, setIsError] = useState(false);        // controls message colour
  const [loading, setLoading] = useState(false);


  /**
   * handleUpload — validates the file selection then POSTs to the backend.
   * Uses raw fetch() (not apiFetch) because we need multipart/form-data,
   * not JSON — apiFetch always sets Content-Type: application/json.
   */
  const handleUpload = async () => {
    // Guard — should not be reachable because the button is disabled without a file,
    // but checking here makes the function safe to call programmatically too.
    if (!file) {
      setMessage("Please select a JSON file.");
      setIsError(true);
      return;
    }

    setLoading(true);
    setMessage("");
    setIsError(false);

    // Wrap the file in FormData — the backend expects multipart/form-data
    // with a field named "file" (matches the FastAPI UploadFile parameter name)
    const formData = new FormData();
    formData.append("file", file);

    // Pick the correct endpoint based on the SBOM format the user selected
    const endpoint = format === "cyclonedx"
      ? `${API_BASE_URL}/import/cyclonedx`
      : `${API_BASE_URL}/import/spdx`;

    const token = getToken(); // may be null for unauthenticated requests

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          // Attach auth token when present — backend will reject without it for private imports
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          // ⚠️ Do NOT set Content-Type here. When using FormData, the browser
          //    automatically sets:  Content-Type: multipart/form-data; boundary=----xyz
          //    Manually setting it would omit the boundary and break parsing server-side.
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Import failed");

      // Success path — show feedback message
      setMessage(data.message || "Import successful!");
      setIsError(false);

      // If the backend returns the new item's ID, navigate to its detail page
      // after a short delay so the user can read the success message first
      if (data.item_id) {
        setTimeout(() => navigate(`/item/${data.item_id}`), 1200);
      }

    } catch (err) {
      setMessage(err.message || "Upload failed");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="page-shell">
      <button className="back-btn ghost" onClick={() => navigate("/")}>⬅ Back</button>

      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 6px" }}>📥 Import SBOM</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 28px", fontSize: "0.88rem" }}>
        Upload a CycloneDX or SPDX JSON file to import it into your workspace.
      </p>

      {/* ── Format selector ──────────────────────────────────────────────── */}
      {/* Determines which backend endpoint receives the file */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", color: "var(--muted)" }}>
          SBOM Format
        </label>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          style={{ padding: "9px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "#1a2030", color: "#e2e8f0" }}
        >
          <option value="cyclonedx">CycloneDX JSON</option>
          <option value="spdx">SPDX JSON</option>
        </select>
      </div>

      {/* ── File picker ──────────────────────────────────────────────────── */}
      {/* The actual <input type="file"> is hidden; the styled button triggers it.
          This gives full control over the button appearance without browser chrome. */}
      <div style={{ marginBottom: "20px" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"              // restrict the picker to JSON files
          style={{ display: "none" }} // hidden — triggered programmatically below
          onChange={(e) => setFile(e.target.files[0] || null)}
        />
        <button
          className="ghost"
          onClick={() => fileInputRef.current?.click()} // open the native file dialog
          style={{ marginRight: "12px" }}
        >
          {/* Label changes once a file is chosen to show the filename */}
          {file ? `📄 ${file.name}` : "Choose file…"}
        </button>

        {/* File size hint — helps the user confirm they picked the right file */}
        {file && (
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
            {(file.size / 1024).toFixed(1)} KB
          </span>
        )}
      </div>

      {/* ── Upload button ─────────────────────────────────────────────────── */}
      {/* Disabled when no file is chosen or while a request is in flight */}
      <button onClick={handleUpload} disabled={loading || !file}>
        {loading ? "Importing…" : "Import"}
      </button>

      {/* ── Feedback message ──────────────────────────────────────────────── */}
      {/* Green for success, red for errors — isError flag controls colour */}
      {message && (
        <p style={{ marginTop: "16px", color: isError ? "#ff6b6b" : "#34d399", fontSize: "0.88rem" }}>
          {message}
        </p>
      )}
    </div>
  );
}

export default Import;