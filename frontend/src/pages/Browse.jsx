import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

export default function Browse() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [itemType, setItemType] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetail, setItemDetail] = useState(null);

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
    setSelectedItem(null); setItemDetail(null);
    loadPublic();
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setItemDetail(null);
    loadItemDetail(item.id);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e2e8f0" }}>
      {/* Top bar */}
      <div style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#5b8cff" }}>SBOM Finder</span>
          <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", background: "rgba(52,211,153,0.15)", color: "#34d399" }}>Public Catalog</span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => navigate("/login")} className="ghost" style={{ fontSize: "0.85rem", padding: "8px 16px" }}>Sign in</button>
          <button onClick={() => navigate("/register")} style={{ fontSize: "0.85rem", padding: "8px 16px" }}>Create account</button>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 24px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 10px" }}>
            🌐 Public SBOM Catalog
          </h1>
          <p style={{ color: "#8b97a8", fontSize: "0.92rem", maxWidth: "500px", margin: "0 auto 20px" }}>
            Browse verified Software Bill of Materials for popular applications and devices. No account required.
          </p>
          {stats && (
            <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { label: "Public SBOMs", value: stats.total_public_items },
                { label: "Verified", value: stats.total_verified },
                { label: "Components", value: stats.total_components },
                { label: "Users", value: stats.total_users },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#5b8cff", fontFamily: "monospace" }}>{s.value}</div>
                  <div style={{ fontSize: "0.72rem", color: "#8b97a8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
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
              style={{ flex: 1, minWidth: "200px", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e2e8f0", fontSize: "0.9rem" }}
            />
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e2e8f0" }}
            >
              <option value="">All Types</option>
              <option value="application">Applications</option>
              <option value="device">Devices</option>
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#8b97a8", cursor: "pointer" }}>
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
              Verified only
            </label>
            <button onClick={handleSearch} style={{ padding: "10px 20px", borderRadius: "8px", background: "rgba(91,140,255,0.7)", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}>Search</button>
            <button onClick={handleReset} style={{ padding: "10px 16px", borderRadius: "8px", background: "transparent", color: "#8b97a8", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>Reset</button>
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: "grid", gridTemplateColumns: selectedItem ? "1fr 1fr" : "1fr", gap: "16px" }}>

          {/* Items list */}
          <div>
            {loading && <p style={{ color: "#8b97a8", textAlign: "center", padding: "2rem" }}>Loading catalog...</p>}
            {!loading && items.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem", color: "#8b97a8" }}>
                <p>No public SBOMs found.</p>
                <p style={{ fontSize: "0.82rem", marginTop: "6px" }}>
                  <button onClick={() => navigate("/register")} style={{ color: "#5b8cff", background: "none", border: "none", cursor: "pointer" }}>Create an account</button> to import and publish SBOMs.
                </p>
              </div>
            )}
            <div style={{ display: "grid", gap: "10px" }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  style={{
                    padding: "14px 16px",
                    background: selectedItem?.id === item.id ? "rgba(91,140,255,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedItem?.id === item.id ? "rgba(91,140,255,0.4)" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (selectedItem?.id !== item.id) { e.currentTarget.style.borderColor = "rgba(91,140,255,0.25)"; e.currentTarget.style.background = "rgba(91,140,255,0.04)"; }}}
                  onMouseLeave={e => { if (selectedItem?.id !== item.id) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.92rem" }}>{item.name}</span>
                      {item.is_verified && <span title="Verified">✅</span>}
                      {item.is_featured && <span title="Featured">⭐</span>}
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: "10px", background: item.item_type === "application" ? "rgba(91,140,255,0.15)" : "rgba(249,115,22,0.15)", color: item.item_type === "application" ? "#5b8cff" : "#f97316", fontWeight: 600, textTransform: "uppercase" }}>
                        {item.item_type}
                      </span>
                    </div>
                  </div>
                  <p style={{ color: "#8b97a8", fontSize: "0.78rem", margin: "0 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.manufacturer} · {item.category}
                  </p>
                  <div style={{ display: "flex", gap: "12px", fontSize: "0.72rem", color: "#5a6478" }}>
                    <span>🧩 {item.component_count} components</span>
                    {item.version && <span>v{item.version}</span>}
                    <span>👍 {item.upvotes || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Item detail panel */}
          {selectedItem && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px", position: "sticky", top: "20px", maxHeight: "80vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 800 }}>{selectedItem.name}</h2>
                  <p style={{ color: "#8b97a8", margin: 0, fontSize: "0.82rem" }}>{selectedItem.description}</p>
                </div>
                <button onClick={() => { setSelectedItem(null); setItemDetail(null); }} style={{ background: "none", border: "none", color: "#8b97a8", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
              </div>

              {!itemDetail && <p style={{ color: "#8b97a8" }}>Loading components...</p>}

              {itemDetail && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                    {[
                      ["Manufacturer", itemDetail.manufacturer],
                      ["Version", itemDetail.version],
                      ["Category", itemDetail.category],
                      ["Source", itemDetail.source_format],
                    ].map(([label, value]) => value && (
                      <div key={label} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                        <div style={{ fontSize: "0.68rem", color: "#5a6478", textTransform: "uppercase", marginBottom: "2px" }}>{label}</div>
                        <div style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#8b97a8", margin: "0 0 10px" }}>
                    Components ({itemDetail.components?.length || 0})
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {itemDetail.components?.map((comp, i) => (
                      <div key={i} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontWeight: 600, color: comp.is_vulnerable ? "#ff6b6b" : "#e2e8f0", fontSize: "0.85rem" }}>
                            {comp.is_vulnerable && "⚠️ "}{comp.component_name}
                          </span>
                          {comp.version && <span style={{ color: "#5b8cff", fontFamily: "monospace", fontSize: "0.72rem", marginLeft: "6px" }}>v{comp.version}</span>}
                        </div>
                        {comp.license && <span style={{ fontSize: "0.68rem", padding: "2px 6px", borderRadius: "8px", background: "rgba(167,139,250,0.1)", color: "#a78bfa" }}>{comp.license}</span>}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: "8px" }}>
                    <button onClick={() => navigate("/register")} style={{ flex: 1, padding: "9px", borderRadius: "8px", background: "rgba(91,140,255,0.2)", color: "#5b8cff", border: "1px solid rgba(91,140,255,0.3)", cursor: "pointer", fontSize: "0.82rem" }}>
                      Sign up to compare
                    </button>
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