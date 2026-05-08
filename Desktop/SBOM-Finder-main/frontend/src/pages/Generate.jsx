import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, API_BASE_URL } from "../api";

const SUPPORTED = [
  { ext: "package.json, package-lock.json", icon: "📦", label: "Node.js / npm" },
  { ext: "requirements.txt, Pipfile.lock", icon: "🐍", label: "Python / pip" },
  { ext: "pom.xml, build.gradle", icon: "☕", label: "Java / Maven" },
  { ext: "go.mod, go.sum", icon: "🐹", label: "Go modules" },
  { ext: "Gemfile.lock", icon: "💎", label: "Ruby / Bundler" },
  { ext: "Cargo.toml, Cargo.lock", icon: "🦀", label: "Rust / Cargo" },
  { ext: ".jar, .war, .ear", icon: "📦", label: "Java Archives" },
  { ext: ".zip, .tar.gz", icon: "🗜️", label: "Any archive" },
  { ext: "composer.json", icon: "🐘", label: "PHP / Composer" },
  { ext: ".apk, .exe, .dll", icon: "📱", label: "Binaries & APKs" },
];

export default function Generate() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("");
  const [syftAvailable, setSyftAvailable] = useState(null);

  useEffect(() => {
    apiFetch("/syft/status")
      .then(r => r.json())
      .then(d => setSyftAvailable(d.available))
      .catch(() => setSyftAvailable(false));
  }, []);

  const handleFile = (f) => {
    setFile(f);
    setResult(null);
    setError("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleGenerate = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    const stages = [
      "📂 Reading your file...",
      "🔍 Detecting file type and ecosystems...",
      "🔬 Syft scanning all components...",
      "📦 Extracting dependencies and licenses...",
      "💾 Saving SBOM to your workspace...",
    ];

    let i = 0;
    setStage(stages[0]);
    const interval = setInterval(() => {
      i = Math.min(i + 1, stages.length - 1);
      setStage(stages[i]);
    }, 4000);

    try {
      const token = localStorage.getItem("sbom_token");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/generate-sbom`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      clearInterval(interval);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed");
      setResult(data);
      setStage("");
    } catch (err) {
      clearInterval(interval);
      setError(err.message);
      setStage("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <button className="back-btn ghost" onClick={() => navigate("/")}>⬅ Back</button>

      {/* Header */}
      <div style={{ textAlign: "center", padding: "2rem 0 2rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🔬</div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#e2e8f0", margin: "0 0 10px" }}>
          Generate SBOM from Any File
        </h1>
        <p style={{ color: "#8b97a8", maxWidth: "520px", margin: "0 auto", fontSize: "0.92rem", lineHeight: 1.7 }}>
          Upload your app file — Syft automatically detects what it is,
          scans every component inside, and saves the full SBOM to your workspace.
          No configuration needed.
        </p>
        <div style={{ marginTop: "14px" }}>
          {syftAvailable === true && (
            <span style={{ padding: "5px 14px", background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: "20px", color: "#34d399", fontSize: "0.8rem" }}>
              ✅ Syft is ready
            </span>
          )}
          {syftAvailable === false && (
            <span style={{ padding: "5px 14px", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: "20px", color: "#f97316", fontSize: "0.8rem" }}>
              ⚠️ Syft deploying — check back after next Render deploy
            </span>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        style={{ maxWidth: "580px", margin: "0 auto 1.5rem" }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div
          onClick={() => !loading && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "#5b8cff" : file ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.15)"}`,
            borderRadius: "16px",
            padding: "3rem 2rem",
            textAlign: "center",
            cursor: loading ? "default" : "pointer",
            background: dragging ? "rgba(91,140,255,0.06)" : file ? "rgba(52,211,153,0.04)" : "rgba(255,255,255,0.02)",
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>
            {loading ? "⚙️" : file ? "📄" : "📂"}
          </div>
          {file ? (
            <>
              <p style={{ color: "#34d399", fontWeight: 700, margin: "0 0 4px", fontSize: "1rem" }}>{file.name}</p>
              <p style={{ color: "#8b97a8", fontSize: "0.82rem", margin: 0 }}>
                {(file.size / 1024).toFixed(1)} KB · {loading ? "scanning..." : "click to change file"}
              </p>
            </>
          ) : (
            <>
              <p style={{ color: "#e2e8f0", fontWeight: 600, margin: "0 0 8px", fontSize: "1rem" }}>
                Drop your file here or click to browse
              </p>
              <p style={{ color: "#8b97a8", fontSize: "0.82rem", margin: 0 }}>
                Supports package.json, requirements.txt, .jar, .zip, .apk and more
              </p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
        />
      </div>

      {/* Generate button */}
      {file && !loading && !result && (
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <button
            onClick={handleGenerate}
            disabled={syftAvailable === false}
            style={{
              padding: "14px 40px", borderRadius: "12px",
              background: syftAvailable === false ? "rgba(255,255,255,0.1)" : "#5b8cff",
              color: "#fff", border: "none", fontWeight: 700,
              fontSize: "1rem", cursor: syftAvailable === false ? "not-allowed" : "pointer",
            }}
          >
            🔬 Generate SBOM Automatically
          </button>
          {syftAvailable === false && (
            <p style={{ color: "#f97316", fontSize: "0.8rem", marginTop: "8px" }}>
              Syft not ready yet — push to GitHub and wait for Render to redeploy
            </p>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: "500px", margin: "0 auto 2rem" }}>
          <p style={{ color: "#5b8cff", fontWeight: 600, marginBottom: "8px", fontSize: "0.95rem" }}>{stage}</p>
          <p style={{ color: "#5a6478", fontSize: "0.82rem", marginBottom: "16px" }}>
            This takes 15–60 seconds depending on file size and complexity.
          </p>
          <div style={{ height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: "40%", background: "linear-gradient(90deg, transparent, #5b8cff, transparent)", animation: "slide 1.5s ease-in-out infinite" }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ maxWidth: "580px", margin: "0 auto 2rem", padding: "16px 20px", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: "12px" }}>
          <p style={{ color: "#ff6b6b", margin: "0 0 6px", fontWeight: 600 }}>Generation failed</p>
          <p style={{ color: "#8b97a8", margin: 0, fontSize: "0.85rem" }}>{error}</p>
          <button
            onClick={() => { setError(""); setFile(null); }}
            style={{ marginTop: "12px", padding: "6px 14px", borderRadius: "7px", background: "rgba(255,255,255,0.06)", color: "#8b97a8", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontSize: "0.82rem" }}
          >
            Try another file
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ maxWidth: "580px", margin: "0 auto 2rem" }}>
          <div style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: "14px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "1.4rem" }}>✅</span>
                  <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#e2e8f0" }}>{result.item_name}</h2>
                  {result.already_existed && (
                    <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: "10px", background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>Already existed</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.82rem", color: "#8b97a8" }}>
                    🧩 <strong style={{ color: "#e2e8f0" }}>{result.components_found}</strong> components
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "#8b97a8" }}>
                    📂 Detected: <strong style={{ color: "#e2e8f0" }}>{result.file_type_detected}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate(`/item/${result.item_id}`)}
                style={{ padding: "9px 18px", borderRadius: "9px", background: "#5b8cff", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}
              >
                View Full SBOM →
              </button>
            </div>
            <p style={{ color: "#5a6478", fontSize: "0.78rem", margin: 0 }}>
              SBOM saved to your workspace — you can now compare it, run reverse lookup, or submit it to the public catalog.
            </p>
          </div>
          <div style={{ textAlign: "center", marginTop: "14px" }}>
            <button className="ghost" onClick={() => { setResult(null); setFile(null); }} style={{ fontSize: "0.85rem" }}>
              Generate another
            </button>
          </div>
        </div>
      )}

      {/* Supported formats grid */}
      {!loading && !result && (
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <p style={{ textAlign: "center", fontSize: "0.72rem", color: "#5a6478", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            Supported file types — Syft auto-detects everything
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))", gap: "8px" }}>
            {SUPPORTED.map((s, i) => (
              <div key={i} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "1.1rem" }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: "0.78rem", color: "#e2e8f0", fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: "0.67rem", color: "#5a6478" }}>{s.ext}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide { 0% { transform: translateX(-200%); } 100% { transform: translateX(400%); } }
      `}</style>
    </div>
  );
}