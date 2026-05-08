import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useAuth } from "../context/Authcontext";

export default function Browse() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [itemType, setItemType] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetail, setItemDetail] = useState(null);
  const [copying, setCopying] = useState(null);
  const [copyMsg, setCopyMsg] = useState("");

  const loadPublic = async (q = "", type = "", verified = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.append("q", q);
      if (type) params.append("item_type", type);
      if (verified) params.append("verified_only", "true");
      const [itemsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/public/items?${params}`),
        fetch(`${API_BASE_URL}/public/stats`),
      ]);
      if (itemsRes.ok) setItems(await itemsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadItemDetail = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/public/items/${id}`);
      if (res.ok) setItemDetail(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadPublic(); }, []);

  const handleSearch = () => loadPublic(search, itemType, verifiedOnly);
  const handleReset = () => {
    setSearch(""); setItemType(""); setVerifiedOnly(false);
    setSelectedItem(null); setItemDetail(null); setCopyMsg("");
    loadPublic();
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setItemDetail(null);
    setCopyMsg("");
    loadItemDetail(item.id);
  };

  const handleCopyToWorkspace = async (itemId) => {
    if (!token) {
      navigate("/register");
      return;
    }
    setCopying(itemId);
    setCopyMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/public/items/${itemId}/copy-to-workspace`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setCopyMsg(data.message);
    } catch (err) {
      setCopyMsg("Failed to copy: " + err.message);
    } finally {
      setCopying(null);
    }
  };

  const handleUpvote = async (itemId, e) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/public/items/${itemId}/upvote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(items.map(i => i.id === itemId ? { ...i, upvotes: (i.upvotes || 0) + 1 } : i));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e2e8f0" }}>
      {/* Top bar */}
      <div style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#5b8cff", cursor: "pointer" }} onClick={() => token ? navigate("/") : null}>
            SBOM Finder
          </span>
          <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", background: "rgba(52,211,153,0.15)", color: "#34d399" }}>
            Public Catalog
          </span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {token ? (
            <button onClick={() => navigate("/")} style={{ padding: "8px 16px", borderRadius: "8px", background: "rgba(91,140,255,0.2)", color: "#5b8cff", border: "1px solid rgba(91,140,255,0.3)", cursor: "pointer", fontSize: "0.85rem" }}>
              ← My Dashboard
            </button>
          ) : (
            <>
              <button onClick={() => navigate("/login")} style={{ padding: "8px 16px", borderRadius: "8px", background: "transparent", color: "#8b97a8", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontSize: "0.85rem" }}>
                Sign in
              </button>
              <button onClick={() => navigate("/register")} style={{ padding: "8px 16px", borderRadius: "8px", background: "#5b8cff", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                Create account
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 24px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 10px" }}>🌐 Public SBOM Catalog</h1>
          <p style={{ color: "#8b97a8", fontSize: "0.92rem", maxWidth: "500px", margin: "0 auto 20px" }}>
            Browse verified Software Bill of Materials for popular applications and devices. No account required.
          </p>
          {!token && (
            <p style={{ color: "#5b8cff", fontSize: "0.85rem" }}>
              <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate("/register")}>
                Create a free account
              </span> to add items to your workspace and compare them.
            </p>
          )}
          {stats && (
            <div style={{ display: "flex", gap: "28px", justifyContent: "center", flexWrap: "wrap", marginTop: "16px" }}>
              {[
                { label: "Public SBOMs", value: stats.total_public_items, color: "#5b8cff" },
                { label: "Verified", value: stats.total_verified, color: "#34d399" },
                { label: "Components", value: stats.total_components, color: "#a78bfa" },
                { label: "Users", value: stats.total_users, color: "#f97316" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
                  <div style={{ fontSize: "0.7rem", color: "#8b97a8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "18px", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search by name, category, manufacturer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              style={{ flex: 1, minWidth: "200px", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e2e8f0", fontSize: "0.9rem", outline: "none" }}
            />
            <select value={itemType} onChange={(e) => setItemType(e.target.value)} style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "#1a2030", color: "#e2e8f0" }}>
              <option value="">All Types</option>
              <option value="application">Applications</option>
              <option value="device">Devices</option>
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#8b97a8", cursor: "pointer" }}>
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
              Verified only
            </label>
            <button onClick={handleSearch} style={{ padding: "10px 20px", borderRadius: "8px", background: "#5b8cff", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}>Search</button>
            <button onClick={handleReset} style={{ padding: "10px 16px", borderRadius: "8px", background: "transparent", color: "#8b97a8", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>Reset</button>
          </div>
        </div>

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: selectedItem ? "1fr 420px" : "1fr", gap: "16px" }}>

          {/* Items list */}
          <div>
            {loading && <p style={{ color: "#8b97a8", textAlign: "center", padding: "3rem" }}>Loading catalog...</p>}
            {!loading && items.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem", color: "#8b97a8" }}>
                <p style={{ fontSize: "1.1rem" }}>No public SBOMs found.</p>
                {!token && (
                  <p style={{ fontSize: "0.85rem", marginTop: "8px" }}>
                    <span style={{ color: "#5b8cff", cursor: "pointer" }} onClick={() => navigate("/register")}>Create an account</span> to import and publish SBOMs.
                  </p>
                )}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  style={{
                    padding: "14px 16px",
                    background: selectedItem?.id === item.id ? "rgba(91,140,255,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedItem?.id === item.id ? "rgba(91,140,255,0.4)" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: "10px", cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (selectedItem?.id !== item.id) { e.currentTarget.style.borderColor = "rgba(91,140,255,0.25)"; e.currentTarget.style.background = "rgba(91,140,255,0.04)"; }}}
                  onMouseLeave={e => { if (selectedItem?.id !== item.id) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.92rem" }}>{item.name}</span>
                      {item.is_verified && <span title="Verified">✅</span>}
                      {item.is_featured && <span title="Featured">⭐</span>}
                    </div>
                    <span style={{ fontSize: "0.62rem", padding: "2px 7px", borderRadius: "10px", flexShrink: 0, fontWeight: 600, textTransform: "uppercase", background: item.item_type === "application" ? "rgba(91,140,255,0.15)" : "rgba(249,115,22,0.15)", color: item.item_type === "application" ? "#5b8cff" : "#f97316" }}>
                      {item.item_type}
                    </span>
                  </div>
                  <p style={{ color: "#8b97a8", fontSize: "0.75rem", margin: "0 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.manufacturer} · {item.category}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "10px", fontSize: "0.7rem", color: "#5a6478" }}>
                      <span>🧩 {item.component_count}</span>
                      {item.version && <span>v{item.version}</span>}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUpvote(item.id, e); }}
                      style={{ fontSize: "0.7rem", color: "#5a6478", background: "none", border: "none", cursor: token ? "pointer" : "default" }}
                    >
                      👍 {item.upvotes || 0}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          {selectedItem && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px", position: "sticky", top: "20px", maxHeight: "85vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: "1.05rem", fontWeight: 800 }}>{selectedItem.name}</h2>
                  {selectedItem.is_verified && <span style={{ fontSize: "0.72rem", color: "#34d399" }}>✅ Verified SBOM</span>}
                </div>
                <button onClick={() => { setSelectedItem(null); setItemDetail(null); setCopyMsg(""); }} style={{ background: "none", border: "none", color: "#8b97a8", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
              </div>

              {selectedItem.description && (
                <p style={{ color: "#8b97a8", fontSize: "0.82rem", margin: "0 0 14px", lineHeight: 1.5 }}>{selectedItem.description}</p>
              )}

              {/* Copy to workspace button */}
              <button
                onClick={() => handleCopyToWorkspace(selectedItem.id)}
                disabled={copying === selectedItem.id}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "9px",
                  background: token ? "rgba(91,140,255,0.2)" : "rgba(52,211,153,0.15)",
                  color: token ? "#5b8cff" : "#34d399",
                  border: `1px solid ${token ? "rgba(91,140,255,0.3)" : "rgba(52,211,153,0.3)"}`,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  marginBottom: "10px",
                }}
              >
                {copying === selectedItem.id ? "Adding..." : token ? "📥 Add to My Workspace" : "🔑 Sign up to add to workspace"}
              </button>

              {copyMsg && (
                <p style={{ color: copyMsg.includes("Failed") ? "#ff6b6b" : "#34d399", fontSize: "0.8rem", margin: "0 0 12px", textAlign: "center" }}>
                  {copyMsg} {!copyMsg.includes("Failed") && token && <span style={{ cursor: "pointer", color: "#5b8cff", textDecoration: "underline" }} onClick={() => navigate("/")}>Go to dashboard →</span>}
                </p>
              )}

              {!itemDetail && <p style={{ color: "#8b97a8", fontSize: "0.85rem" }}>Loading components...</p>}

              {itemDetail && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "14px" }}>
                    {[["Manufacturer", itemDetail.manufacturer], ["Version", itemDetail.version], ["Category", itemDetail.category], ["Format", itemDetail.source_format]].map(([l, v]) => v && (
                      <div key={l} style={{ padding: "7px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "7px" }}>
                        <div style={{ fontSize: "0.65rem", color: "#5a6478", textTransform: "uppercase", marginBottom: "2px" }}>{l}</div>
                        <div style={{ fontSize: "0.8rem", color: "#e2e8f0" }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  <h3 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#8b97a8", margin: "0 0 8px" }}>
                    Components ({itemDetail.components?.length || 0})
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    {itemDetail.components?.map((comp, i) => (
                      <div key={i} style={{ padding: "7px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontWeight: 600, color: comp.is_vulnerable ? "#ff6b6b" : "#e2e8f0", fontSize: "0.82rem" }}>
                            {comp.is_vulnerable && "⚠️ "}{comp.component_name}
                          </span>
                          {comp.version && <span style={{ color: "#5b8cff", fontFamily: "monospace", fontSize: "0.7rem", marginLeft: "6px" }}>v{comp.version}</span>}
                        </div>
                        {comp.license && <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "8px", background: "rgba(167,139,250,0.1)", color: "#a78bfa" }}>{comp.license}</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}