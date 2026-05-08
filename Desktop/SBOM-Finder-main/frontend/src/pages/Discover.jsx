import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

const SUGGESTIONS = [
  { label: "nginx", type: "software" },
  { label: "react", type: "software" },
  { label: "django", type: "software" },
  { label: "postgresql", type: "software" },
  { label: "redis", type: "software" },
  { label: "openssl", type: "software" },
  { label: "kubernetes", type: "software" },
  { label: "log4j", type: "software" },
  { label: "Raspberry Pi 4", type: "device" },
  { label: "Arduino Uno", type: "device" },
  { label: "Cisco IOS Router", type: "device" },
  { label: "Smart Camera Firmware", type: "device" },
  { label: "Android AOSP", type: "device" },
  { label: "Ring Doorbell", type: "device" },
];

export default function Discover() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("");

  const handleDiscover = async (q) => {
    const searchQuery = (q || query).trim();
    if (!searchQuery) return;

    setLoading(true);
    setError("");
    setResult(null);
    if (q) setQuery(q);

    const stages = [
      "🔍 Searching package registries...",
      "📦 Fetching from npm, PyPI, Maven, GitHub...",
      "🤖 Building SBOM with AI...",
      "💾 Saving to your workspace...",
    ];

    let i = 0;
    setStage(stages[0]);
    const interval = setInterval(() => {
      i = (i + 1) % stages.length;
      setStage(stages[i]);
    }, 2500);

    try {
      const res = await apiFetch("/discover", {
        method: "POST",
        body: JSON.stringify({ query: searchQuery }),
      });
      clearInterval(interval);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Discovery failed");
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
      <div style={{ textAlign: "center", padding: "2rem 0 2.5rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🌐</div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#e2e8f0", margin: "0 0 10px" }}>
          AI-Powered SBOM Discovery
        </h1>
        <p style={{ color: "#8b97a8", maxWidth: "540px", margin: "0 auto", fontSize: "0.92rem", lineHeight: 1.7 }}>
          Search any software package or hardware device. Our AI scans global registries
          and uses deep knowledge to build a complete SBOM — including firmware layers,
          OS components, and all dependencies — saved directly to your workspace.
        </p>
      </div>

      {/* Search */}
      <div style={{ maxWidth: "620px", margin: "0 auto 2rem", display: "flex", gap: "10px" }}>
        <input
          type="text"
          placeholder="e.g. nginx, Raspberry Pi 4, Cisco Router, django..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && handleDiscover()}
          disabled={loading}
          style={{
            flex: 1,
            padding: "14px 18px",
            fontSize: "1rem",
            borderRadius: "12px",
            border: "1px solid rgba(91,140,255,0.3)",
            background: "rgba(255,255,255,0.04)",
            color: "#e2e8f0",
            outline: "none",
          }}
        />
        <button
          onClick={() => handleDiscover()}
          disabled={loading || !query.trim()}
          style={{
            padding: "14px 24px",
            borderRadius: "12px",
            background: loading ? "rgba(91,140,255,0.3)" : "#5b8cff",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            fontSize: "0.92rem",
            cursor: loading ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "Discovering..." : "Discover →"}
        </button>
      </div>

      {/* Suggestions */}
      {!loading && !result && (
        <div style={{ maxWidth: "620px", margin: "0 auto 2.5rem" }}>
          <p style={{ fontSize: "0.72rem", color: "#5a6478", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px", textAlign: "center" }}>
            Try these
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => handleDiscover(s.label)}
                style={{
                  padding: "5px 14px",
                  borderRadius: "20px",
                  border: `1px solid ${s.type === "device" ? "rgba(249,115,22,0.25)" : "rgba(91,140,255,0.2)"}`,
                  background: s.type === "device" ? "rgba(249,115,22,0.06)" : "rgba(91,140,255,0.06)",
                  color: s.type === "device" ? "#f97316" : "#5b8cff",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => e.target.style.opacity = "0.7"}
                onMouseLeave={e => e.target.style.opacity = "1"}
              >
                {s.type === "device" ? "🔧 " : "📦 "}{s.label}
              </button>
            ))}
          </div>
          <p style={{ textAlign: "center", fontSize: "0.72rem", color: "#5a6478", marginTop: "10px" }}>
            🔵 Software packages &nbsp;·&nbsp; 🔧 Hardware devices
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ maxWidth: "500px", margin: "0 auto", textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "16px", display: "inline-block", animation: "spin 2s linear infinite" }}>⚙️</div>
          <p style={{ color: "#5b8cff", fontWeight: 600, marginBottom: "8px", fontSize: "0.95rem" }}>{stage}</p>
          <p style={{ color: "#5a6478", fontSize: "0.82rem", marginBottom: "20px" }}>
            This takes 10–20 seconds. AI is analyzing registries and building your SBOM.
          </p>
          <div style={{ height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: "40%", background: "linear-gradient(90deg, transparent, #5b8cff, transparent)", animation: "slide 1.5s ease-in-out infinite" }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "18px 20px", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: "12px" }}>
          <p style={{ color: "#ff6b6b", margin: "0 0 6px", fontWeight: 600 }}>Discovery failed</p>
          <p style={{ color: "#8b97a8", margin: 0, fontSize: "0.85rem" }}>{error}</p>
          {error.includes("ANTHROPIC_API_KEY") && (
            <p style={{ color: "#f97316", margin: "10px 0 0", fontSize: "0.82rem" }}>
              ⚠️ Set ANTHROPIC_API_KEY in your Render environment variables to enable AI discovery.
            </p>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <div style={{
            background: "rgba(52,211,153,0.06)",
            border: "1px solid rgba(52,211,153,0.2)",
            borderRadius: "16px",
            padding: "26px",
            marginBottom: "16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "1.4rem" }}>✅</span>
                  <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#e2e8f0" }}>
                    {result.item_name}
                  </h2>
                  <span style={{ fontSize: "0.68rem", padding: "3px 10px", borderRadius: "20px", background: "rgba(52,211,153,0.15)", color: "#34d399", fontWeight: 600 }}>
                    AI Discovered
                  </span>
                </div>
                <p style={{ color: "#8b97a8", margin: 0, fontSize: "0.88rem", lineHeight: 1.5 }}>
                  {result.description}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "20px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#5b8cff", fontFamily: "monospace" }}>{result.components_found}</div>
                <div style={{ fontSize: "0.72rem", color: "#8b97a8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Components</div>
              </div>
              {result.category && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#e2e8f0" }}>{result.category}</div>
                  <div style={{ fontSize: "0.72rem", color: "#8b97a8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</div>
                </div>
              )}
              {result.license && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#a78bfa" }}>{result.license}</div>
                  <div style={{ fontSize: "0.72rem", color: "#8b97a8", textTransform: "uppercase", letterSpacing: "0.05em" }}>License</div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => navigate(`/item/${result.item_id}`)}
                style={{ flex: 1, padding: "11px", borderRadius: "10px", background: "#5b8cff", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem" }}
              >
                View Full SBOM & Components →
              </button>
              <button
                onClick={() => { setResult(null); setQuery(""); }}
                className="ghost"
                style={{ padding: "11px 18px", borderRadius: "10px", fontSize: "0.88rem" }}
              >
                Discover another
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slide { 0% { transform: translateX(-200%); } 100% { transform: translateX(400%); } }
      `}</style>
    </div>
  );
}