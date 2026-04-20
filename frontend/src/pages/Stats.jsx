import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

// ── tiny SVG pie chart ──────────────────────────────────────────────
function PieChart({ slices, size = 140 }) {
  const [hovered, setHovered] = useState(null);
  const cx = size / 2, cy = size / 2, r = size / 2 - 10;
  let cumAngle = -Math.PI / 2;
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (!total) return null;

  const paths = slices.map((sl, i) => {
    const angle = (sl.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`;
    return { d, color: sl.color, label: sl.label, value: sl.value, pct: Math.round((sl.value / total) * 100) };
  });

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <svg width={size} height={size}>
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill={p.color}
            opacity={hovered === null || hovered === i ? 1 : 0.4}
            stroke="#0d1117"
            strokeWidth={2}
            style={{ cursor: "pointer", transition: "opacity 0.2s" }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {/* center hole */}
        <circle cx={cx} cy={cy} r={r * 0.52} fill="#0d1117" />
        {hovered !== null ? (
          <>
            <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={700}>
              {paths[hovered].pct}%
            </text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill="#8b97a8" fontSize={9}>
              {paths[hovered].label}
            </text>
          </>
        ) : (
          <text x={cx} y={cy + 5} textAnchor="middle" fill="#8b97a8" fontSize={9}>
            hover slice
          </text>
        )}
      </svg>
    </div>
  );
}

// ── horizontal bar chart ────────────────────────────────────────────
function BarChart({ items, color = "#5b8cff" }) {
  const [hovered, setHovered] = useState(null);
  if (!items || !items.length) return <p style={{ color: "#8b97a8", fontSize: "0.82rem" }}>No data</p>;
  const max = Math.max(...items.map(i => i.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {items.map((item, i) => (
        <div
          key={i}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "default" }}
        >
          <div style={{ width: "110px", fontSize: "0.75rem", color: hovered === i ? "#fff" : "#8b97a8", textAlign: "right", flexShrink: 0, transition: "color 0.15s", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.label}
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: "4px", height: "18px", overflow: "hidden" }}>
            <div style={{
              width: `${max ? (item.value / max) * 100 : 0}%`,
              height: "100%",
              background: hovered === i ? "#7aa3ff" : color,
              borderRadius: "4px",
              transition: "width 0.5s ease, background 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: "6px",
            }}>
              <span style={{ fontSize: "0.65rem", color: "#fff", fontWeight: 700 }}>
                {item.value > 0 ? item.value : ""}
              </span>
            </div>
          </div>
          <div style={{ width: "28px", fontSize: "0.72rem", color: hovered === i ? "#fff" : "#5a6478", flexShrink: 0 }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── stat number card ────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, onClick, active }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered || active ? `${color}18` : "rgba(255,255,255,0.03)",
        border: `1px solid ${active ? color : hovered ? `${color}60` : "rgba(255,255,255,0.07)"}`,
        borderRadius: "14px",
        padding: "20px",
        cursor: "pointer",
        transition: "all 0.2s",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: active ? `0 0 0 2px ${color}40` : hovered ? `0 4px 20px ${color}20` : "none",
      }}
    >
      <div style={{ fontSize: "1.6rem", marginBottom: "10px" }}>{icon}</div>
      <div style={{ fontSize: "2rem", fontWeight: 800, color: active || hovered ? color : "#e2e8f0", lineHeight: 1, marginBottom: "6px", fontFamily: "monospace" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.8rem", color: "#8b97a8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: "0.72rem", color: active ? color : "#5a6478", marginTop: "6px" }}>
          {active ? "▲ click to close" : sub}
        </div>
      )}
    </div>
  );
}

// ── main component ──────────────────────────────────────────────────
export default function Stats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState(null);
  const [panelData, setPanelData] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelSearch, setPanelSearch] = useState("");
  const [allItems, setAllItems] = useState([]);
  const [allComponents, setAllComponents] = useState([]);
  const panelRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [sRes, iRes, cRes] = await Promise.all([
          apiFetch("/stats"),
          apiFetch("/items"),
          apiFetch("/components-list"),
        ]);
        if (sRes.ok) setStats(await sRes.json());
        if (iRes.ok) setAllItems(await iRes.json());
        if (cRes.ok) setAllComponents(await cRes.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openPanel = async (type) => {
    if (activePanel === type) {
      setActivePanel(null);
      setPanelData([]);
      setPanelSearch("");
      return;
    }
    setActivePanel(type);
    setPanelSearch("");
    setPanelLoading(true);
    try {
      let data = [];
      if (type === "all") data = allItems;
      else if (type === "applications") data = allItems.filter(i => i.item_type === "application");
      else if (type === "devices") data = allItems.filter(i => i.item_type === "device");
      else if (type === "components") data = allComponents;
      else if (type === "tracked") {
        const res = await apiFetch("/tracked-products");
        if (res.ok) data = await res.json();
      }
      setPanelData(data);
    } catch (e) {
      setPanelData([]);
    } finally {
      setPanelLoading(false);
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  // derived chart data
  const typeBreakdown = [
    { label: "Applications", value: stats?.total_applications || 0, color: "#5b8cff" },
    { label: "Devices", value: stats?.total_devices || 0, color: "#f97316" },
  ];

  const sourceBreakdown = (() => {
    const counts = {};
    allItems.forEach(i => {
      const s = i.source_format || "unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    const colors = { cyclonedx: "#22d3ee", spdx: "#a78bfa", external: "#34d399", seed: "#fbbf24", unknown: "#6b7280" };
    return Object.entries(counts).map(([k, v]) => ({ label: k, value: v, color: colors[k] || "#8b97a8" }));
  })();

  const topLicenses = (() => {
    const counts = {};
    allComponents.forEach(c => {
      const l = c.license || "Unknown";
      counts[l] = (counts[l] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => ({ label: k, value: v }));
  })();

  const topSuppliers = (() => {
    const counts = {};
    allComponents.forEach(c => {
      const s = c.supplier || "Unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => ({ label: k, value: v }));
  })();

  const filtered = panelData.filter(item => {
    if (!panelSearch) return true;
    const s = panelSearch.toLowerCase();
    return (
      (item.name || item.component_name || "").toLowerCase().includes(s) ||
      (item.item_type || "").toLowerCase().includes(s) ||
      (item.manufacturer || item.supplier || "").toLowerCase().includes(s) ||
      (item.version || "").toLowerCase().includes(s) ||
      (item.license || "").toLowerCase().includes(s) ||
      (item.category || "").toLowerCase().includes(s)
    );
  });

  if (loading) return (
    <div className="page-shell" style={{ textAlign: "center", padding: "4rem", color: "#8b97a8" }}>
      <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📊</div>
      <p>Loading analytics...</p>
    </div>
  );

  if (error) return (
    <div className="page-shell">
      <button className="back-btn ghost" onClick={() => navigate("/")}>⬅ Back</button>
      <p className="error-text">{error}</p>
    </div>
  );

  const tiles = [
    { key: "all", icon: "📦", label: "Total Items", value: stats.total_items, color: "#5b8cff", sub: "click to browse all" },
    { key: "applications", icon: "💻", label: "Applications", value: stats.total_applications, color: "#22d3ee", sub: "click to filter" },
    { key: "devices", icon: "🔧", label: "Devices", value: stats.total_devices, color: "#f97316", sub: "click to filter" },
    { key: "components", icon: "🧩", label: "Components", value: stats.total_components, color: "#a78bfa", sub: "click to browse" },
    { key: "tracked", icon: "📌", label: "Tracked", value: stats.total_tracked_products, color: "#34d399", sub: "click to view" },
  ];

  return (
    <div className="page-shell">
      <button className="back-btn ghost" onClick={() => navigate("/")}>⬅ Back</button>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 6px", color: "#e2e8f0" }}>
          📊 Analytics Dashboard
        </h1>
        <p style={{ color: "#8b97a8", margin: 0, fontSize: "0.88rem" }}>
          Live overview of your SBOM workspace. Hover charts for details. Click tiles to drill down.
        </p>
      </div>

      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "28px" }}>
        {tiles.map(t => (
          <StatCard key={t.key} {...t} active={activePanel === t.key} onClick={() => openPanel(t.key)} />
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px", marginBottom: "28px" }}>

        {/* Pie — type breakdown */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px" }}>
          <h3 style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b97a8", margin: "0 0 16px", fontWeight: 600 }}>
            Item Type Split
          </h3>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <PieChart slices={typeBreakdown} size={130} />
            <div style={{ display: "flex", gap: "14px" }}>
              {typeBreakdown.map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", color: "#8b97a8" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pie — source format */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px" }}>
          <h3 style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b97a8", margin: "0 0 16px", fontWeight: 600 }}>
            Source Format
          </h3>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <PieChart slices={sourceBreakdown} size={130} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
              {sourceBreakdown.map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", color: "#8b97a8" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar — top licenses */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px" }}>
          <h3 style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b97a8", margin: "0 0 16px", fontWeight: 600 }}>
            Top Licenses
          </h3>
          <BarChart items={topLicenses} color="#a78bfa" />
        </div>

        {/* Bar — top suppliers */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px" }}>
          <h3 style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b97a8", margin: "0 0 16px", fontWeight: 600 }}>
            Top Suppliers
          </h3>
          <BarChart items={topSuppliers} color="#34d399" />
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" }}>

        {/* Recent items */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px" }}>
          <h3 style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b97a8", margin: "0 0 16px", fontWeight: 600 }}>
            Recently Indexed
          </h3>
          {allItems.slice(-5).reverse().map((item, i) => (
            <div
              key={i}
              onClick={() => navigate(`/item/${item.id}`)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <div>
                <div style={{ fontSize: "0.85rem", color: "#e2e8f0", fontWeight: 500 }}>{item.name}</div>
                <div style={{ fontSize: "0.72rem", color: "#8b97a8" }}>{item.manufacturer || "Unknown"} • {item.category || "N/A"}</div>
              </div>
              <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", background: item.item_type === "application" ? "rgba(91,140,255,0.15)" : "rgba(249,115,22,0.15)", color: item.item_type === "application" ? "#5b8cff" : "#f97316" }}>
                {item.item_type}
              </span>
            </div>
          ))}
          {allItems.length === 0 && <p style={{ color: "#8b97a8", fontSize: "0.82rem" }}>No items yet</p>}
        </div>

        {/* Component breakdown summary */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px" }}>
          <h3 style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b97a8", margin: "0 0 16px", fontWeight: 600 }}>
            Workspace Summary
          </h3>
          {[
            { label: "Avg components per item", value: allItems.length ? Math.round(stats.total_components / allItems.length) : 0, icon: "📐" },
            { label: "Unique licenses", value: topLicenses.length, icon: "📜" },
            { label: "Unique suppliers", value: topSuppliers.length, icon: "🏭" },
            { label: "External imports", value: allItems.filter(i => i.source_format === "external").length, icon: "🌐" },
            { label: "CycloneDX imports", value: allItems.filter(i => i.source_format === "cyclonedx").length, icon: "🔵" },
            { label: "SPDX imports", value: allItems.filter(i => i.source_format === "spdx").length, icon: "🟢" },
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize: "0.82rem", color: "#8b97a8" }}>{row.icon} {row.label}</span>
              <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#e2e8f0", fontFamily: "monospace" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Drill-down panel */}
      {activePanel && (
        <div ref={panelRef} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(91,140,255,0.2)", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#e2e8f0" }}>
                {tiles.find(t => t.key === activePanel)?.icon} {tiles.find(t => t.key === activePanel)?.label}
              </h2>
              <p style={{ margin: "4px 0 0", color: "#8b97a8", fontSize: "0.82rem" }}>
                {filtered.length} {panelSearch ? "matching" : "total"} records
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Search within..."
                value={panelSearch}
                onChange={(e) => setPanelSearch(e.target.value)}
                style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e2e8f0", fontSize: "0.85rem", width: "200px" }}
              />
              <button
                className="ghost"
                onClick={() => { setActivePanel(null); setPanelData([]); setPanelSearch(""); }}
                style={{ padding: "8px 14px", fontSize: "0.82rem" }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {panelLoading && <p style={{ color: "#8b97a8" }}>Loading...</p>}

          {!panelLoading && filtered.length === 0 && (
            <p style={{ color: "#8b97a8", textAlign: "center", padding: "2rem" }}>
              {panelSearch ? "No results match your search." : "Nothing here yet."}
            </p>
          )}

          {/* Components table */}
          {!panelLoading && activePanel === "components" && filtered.length > 0 && (
            <div className="table-wrap">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Version</th>
                    <th>Supplier</th>
                    <th>License</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={i}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(91,140,255,0.06)"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}
                    >
                      <td><strong style={{ color: "#a78bfa" }}>{c.component_name}</strong></td>
                      <td style={{ fontFamily: "monospace", color: "#8b97a8" }}>{c.version || "—"}</td>
                      <td style={{ color: "#8b97a8" }}>{c.supplier || "—"}</td>
                      <td><span style={{ fontSize: "11px", padding: "2px 7px", borderRadius: "10px", background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>{c.license || "—"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tracked products */}
          {!panelLoading && activePanel === "tracked" && filtered.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
              {filtered.map((item, i) => (
                <div key={i} style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(52,211,153,0.3)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
                >
                  <div style={{ fontWeight: 600, color: "#e2e8f0", marginBottom: "4px", fontSize: "0.88rem" }}>{item.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#8b97a8" }}>{item.vendor || "No vendor"} • {item.product_type || "N/A"}</div>
                  <span style={{ marginTop: "8px", display: "inline-block", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", background: "rgba(52,211,153,0.12)", color: "#34d399" }}>
                    {item.status || "pending"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Items grid */}
          {!panelLoading && ["all", "applications", "devices"].includes(activePanel) && filtered.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
              {filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(91,140,255,0.4)"; e.currentTarget.style.background = "rgba(91,140,255,0.06)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "140px" }}>{item.name}</span>
                    <span style={{ fontSize: "0.7rem", padding: "2px 7px", borderRadius: "10px", flexShrink: 0, background: item.item_type === "application" ? "rgba(91,140,255,0.15)" : "rgba(249,115,22,0.15)", color: item.item_type === "application" ? "#5b8cff" : "#f97316" }}>
                      {item.item_type}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#8b97a8" }}>{item.manufacturer || "Unknown"}</div>
                  <div style={{ fontSize: "0.72rem", color: "#5a6478", marginTop: "4px" }}>{item.source_format || "unknown"} {item.version ? `• v${item.version}` : ""}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}