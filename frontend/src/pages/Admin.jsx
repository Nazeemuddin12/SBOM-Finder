import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { useAuth } from "../context/Authcontext";

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [pending, setPending] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [vulnerable, setVulnerable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user?.role !== "admin") {
      navigate("/");
      return;
    }
    loadStats();
  }, [user]);

  const loadStats = async () => {
    const res = await apiFetch("/admin/stats");
    if (res.ok) setStats(await res.json());
  };

  const loadTab = async (tab) => {
    setActiveTab(tab);
    setLoading(true);
    try {
      if (tab === "users") {
        const res = await apiFetch("/admin/users");
        if (res.ok) setUsers(await res.json());
      } else if (tab === "items") {
        const res = await apiFetch("/admin/items");
        if (res.ok) setItems(await res.json());
      } else if (tab === "pending") {
        const res = await apiFetch("/admin/pending");
        if (res.ok) setPending(await res.json());
      } else if (tab === "audit") {
        const res = await apiFetch("/admin/audit-log");
        if (res.ok) setAuditLog(await res.json());
      } else if (tab === "vulnerable") {
        const res = await apiFetch("/admin/vulnerable-components");
        if (res.ok) setVulnerable(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    const res = await apiFetch(`/admin/items/${id}/approve`, { method: "POST" });
    if (res.ok) {
      setMessage("Item approved and published ✅");
      setPending(pending.filter(i => i.id !== id));
      loadStats();
    }
  };

  const handleReject = async (id) => {
    const note = prompt("Rejection reason (optional):");
    const res = await apiFetch(`/admin/items/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ note: note || "" }),
    });
    if (res.ok) {
      setMessage("Item rejected");
      setPending(pending.filter(i => i.id !== id));
    }
  };

  const handleVerify = async (id) => {
    const res = await apiFetch(`/admin/items/${id}/verify`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setItems(items.map(i => i.id === id ? { ...i, is_verified: data.is_verified } : i));
    }
  };

  const handleFeature = async (id) => {
    const res = await apiFetch(`/admin/items/${id}/feature`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setItems(items.map(i => i.id === id ? { ...i, is_featured: data.is_featured } : i));
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Delete this item permanently?")) return;
    const res = await apiFetch(`/admin/items/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems(items.filter(i => i.id !== id));
      setMessage("Item deleted");
      loadStats();
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    const res = await apiFetch(`/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setMessage(`Role updated to ${newRole}`);
    }
  };

  const handleToggleActive = async (userId) => {
    const res = await apiFetch(`/admin/users/${userId}/toggle-active`, { method: "PATCH" });
    if (res.ok) {
      const data = await res.json();
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: data.is_active } : u));
    }
  };

  const handleSeedCatalog = async () => {
    setMessage("Seeding catalog...");
    const res = await apiFetch("/admin/seed-catalog", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setMessage(data.message);
      loadStats();
    }
  };

  const tabs = [
    { key: "overview", label: "📊 Overview" },
    { key: "pending", label: `⏳ Pending ${stats?.pending_approvals > 0 ? `(${stats.pending_approvals})` : ""}` },
    { key: "items", label: "📦 All Items" },
    { key: "users", label: "👥 Users" },
    { key: "vulnerable", label: "⚠️ Vulnerable" },
    { key: "audit", label: "📋 Audit Log" },
  ];

  const statCards = stats ? [
    { label: "Total Users", value: stats.total_users, color: "#5b8cff", icon: "👥" },
    { label: "Total Items", value: stats.total_items, color: "#22d3ee", icon: "📦" },
    { label: "Public Items", value: stats.total_public_items, color: "#34d399", icon: "🌐" },
    { label: "Pending Review", value: stats.pending_approvals, color: "#f97316", icon: "⏳" },
    { label: "Components", value: stats.total_components, color: "#a78bfa", icon: "🧩" },
    { label: "Vulnerable", value: stats.vulnerable_components, color: "#ff6b6b", icon: "⚠️" },
    { label: "Tracked", value: stats.total_tracked, color: "#fbbf24", icon: "📌" },
    { label: "SBOM Requests", value: stats.open_sbom_requests, color: "#34d399", icon: "📝" },
  ] : [];

  return (
    <div className="page-shell">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 4px" }}>
            🛡️ Admin Dashboard
          </h1>
          <p style={{ color: "#8b97a8", margin: 0, fontSize: "0.85rem" }}>
            Logged in as <strong style={{ color: "#5b8cff" }}>{user?.username}</strong> · Admin
          </p>
        </div>
        <button
          onClick={handleSeedCatalog}
          style={{ padding: "9px 18px", borderRadius: "8px", background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}
        >
          🌱 Seed Public Catalog
        </button>
      </div>

      {message && (
        <div style={{ padding: "10px 16px", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "8px", color: "#34d399", marginBottom: "16px", fontSize: "0.85rem" }}>
          {message} <button onClick={() => setMessage("")} style={{ background: "none", border: "none", color: "#34d399", cursor: "pointer", float: "right" }}>✕</button>
        </div>
      )}

      {/* Stats grid */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          {statCards.map(card => (
            <div key={card.label} style={{ padding: "16px", background: "rgba(255,255,255,0.03)", border: `1px solid ${card.color}22`, borderRadius: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "1.4rem", marginBottom: "6px" }}>{card.icon}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: card.color, fontFamily: "monospace" }}>{card.value}</div>
              <div style={{ fontSize: "0.7rem", color: "#8b97a8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "0" }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => loadTab(tab.key)}
            style={{
              padding: "8px 14px",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid #5b8cff" : "2px solid transparent",
              color: activeTab === tab.key ? "#5b8cff" : "#8b97a8",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: activeTab === tab.key ? 600 : 400,
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: "#8b97a8" }}>Loading...</p>}

      {/* Overview tab */}
      {activeTab === "overview" && !loading && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#8b97a8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Quick Actions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button onClick={() => loadTab("pending")} style={{ padding: "10px", borderRadius: "8px", background: stats?.pending_approvals > 0 ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.04)", color: stats?.pending_approvals > 0 ? "#f97316" : "#8b97a8", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", textAlign: "left", fontSize: "0.85rem" }}>
                ⏳ Review {stats?.pending_approvals || 0} pending submissions
              </button>
              <button onClick={() => loadTab("vulnerable")} style={{ padding: "10px", borderRadius: "8px", background: "rgba(255,107,107,0.1)", color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.2)", cursor: "pointer", textAlign: "left", fontSize: "0.85rem" }}>
                ⚠️ {stats?.vulnerable_components || 0} vulnerable components flagged
              </button>
              <button onClick={handleSeedCatalog} style={{ padding: "10px", borderRadius: "8px", background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)", cursor: "pointer", textAlign: "left", fontSize: "0.85rem" }}>
                🌱 Seed public catalog with real SBOM data
              </button>
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#8b97a8", textTransform: "uppercase", letterSpacing: "0.06em" }}>System Info</h3>
            {[
              ["Public catalog", `${stats?.total_public_items} approved SBOMs`],
              ["User base", `${stats?.total_users} registered users`],
              ["Component library", `${stats?.total_components} unique components`],
              ["Pending review", `${stats?.pending_approvals} submissions waiting`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.82rem" }}>
                <span style={{ color: "#8b97a8" }}>{label}</span>
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending tab */}
      {activeTab === "pending" && !loading && (
        <div>
          {pending.length === 0 ? (
            <p style={{ color: "#8b97a8", textAlign: "center", padding: "2rem" }}>No pending submissions 🎉</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {pending.map(item => (
                <div key={item.id} style={{ padding: "16px", background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: "0.95rem" }}>{item.name}</h3>
                      <p style={{ margin: "0 0 6px", color: "#8b97a8", fontSize: "0.82rem" }}>
                        {item.manufacturer} · {item.category} · v{item.version} · {item.component_count} components
                      </p>
                      <p style={{ margin: 0, color: "#8b97a8", fontSize: "0.8rem" }}>
                        Submitted by <strong>{item.owner_username}</strong>
                        {item.submitted_at && ` · ${new Date(item.submitted_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => handleApprove(item.id)} style={{ padding: "7px 14px", borderRadius: "7px", background: "rgba(52,211,153,0.2)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                        ✅ Approve
                      </button>
                      <button onClick={() => handleReject(item.id)} style={{ padding: "7px 14px", borderRadius: "7px", background: "rgba(255,107,107,0.15)", color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.3)", cursor: "pointer", fontSize: "0.82rem" }}>
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items tab */}
      {activeTab === "items" && !loading && (
        <div className="table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Components</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <div style={{ fontSize: "0.72rem", color: "#8b97a8" }}>{item.manufacturer}</div>
                  </td>
                  <td><span style={{ fontSize: "0.72rem", padding: "2px 7px", borderRadius: "10px", background: item.item_type === "application" ? "rgba(91,140,255,0.15)" : "rgba(249,115,22,0.15)", color: item.item_type === "application" ? "#5b8cff" : "#f97316" }}>{item.item_type}</span></td>
                  <td style={{ color: "#8b97a8", fontSize: "0.82rem" }}>{item.owner_username}</td>
                  <td style={{ fontFamily: "monospace" }}>{item.component_count}</td>
                  <td>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "8px", background: item.approval_status === "approved" ? "rgba(52,211,153,0.15)" : item.approval_status === "pending" ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.08)", color: item.approval_status === "approved" ? "#34d399" : item.approval_status === "pending" ? "#f97316" : "#8b97a8" }}>
                        {item.approval_status}
                      </span>
                      {item.is_verified && <span style={{ fontSize: "0.65rem" }}>✅</span>}
                      {item.is_featured && <span style={{ fontSize: "0.65rem" }}>⭐</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button onClick={() => handleVerify(item.id)} title={item.is_verified ? "Unverify" : "Verify"} style={{ padding: "4px 8px", borderRadius: "6px", background: "rgba(52,211,153,0.1)", color: "#34d399", border: "none", cursor: "pointer", fontSize: "0.72rem" }}>
                        {item.is_verified ? "✅" : "Verify"}
                      </button>
                      <button onClick={() => handleFeature(item.id)} title={item.is_featured ? "Unfeature" : "Feature"} style={{ padding: "4px 8px", borderRadius: "6px", background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "none", cursor: "pointer", fontSize: "0.72rem" }}>
                        {item.is_featured ? "⭐" : "Feature"}
                      </button>
                      <button onClick={() => handleDeleteItem(item.id)} style={{ padding: "4px 8px", borderRadius: "6px", background: "rgba(255,107,107,0.1)", color: "#ff6b6b", border: "none", cursor: "pointer", fontSize: "0.72rem" }}>
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users tab */}
      {activeTab === "users" && !loading && (
        <div className="table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Items</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.username}</strong></td>
                  <td style={{ color: "#8b97a8", fontSize: "0.82rem" }}>{u.email}</td>
                  <td>
                    <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "10px", background: u.role === "admin" ? "rgba(167,139,250,0.2)" : "rgba(91,140,255,0.1)", color: u.role === "admin" ? "#a78bfa" : "#5b8cff" }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontFamily: "monospace" }}>{u.total_items}</td>
                  <td>
                    <span style={{ fontSize: "0.72rem", color: u.is_active ? "#34d399" : "#ff6b6b" }}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        onClick={() => handleRoleChange(u.id, u.role === "admin" ? "user" : "admin")}
                        style={{ padding: "4px 8px", borderRadius: "6px", background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "none", cursor: "pointer", fontSize: "0.72rem" }}
                      >
                        {u.role === "admin" ? "→ User" : "→ Admin"}
                      </button>
                      <button
                        onClick={() => handleToggleActive(u.id)}
                        style={{ padding: "4px 8px", borderRadius: "6px", background: u.is_active ? "rgba(255,107,107,0.1)" : "rgba(52,211,153,0.1)", color: u.is_active ? "#ff6b6b" : "#34d399", border: "none", cursor: "pointer", fontSize: "0.72rem" }}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vulnerable components tab */}
      {activeTab === "vulnerable" && !loading && (
        <div>
          {vulnerable.length === 0 ? (
            <p style={{ color: "#8b97a8", textAlign: "center", padding: "2rem" }}>No vulnerable components flagged</p>
          ) : (
            <div className="table-wrap">
              <table className="compare-table">
                <thead>
                  <tr><th>Component</th><th>Version</th><th>CVE</th><th>Note</th></tr>
                </thead>
                <tbody>
                  {vulnerable.map(c => (
                    <tr key={c.id}>
                      <td><strong style={{ color: "#ff6b6b" }}>⚠️ {c.component_name}</strong></td>
                      <td style={{ fontFamily: "monospace", color: "#8b97a8" }}>{c.version || "—"}</td>
                      <td style={{ fontFamily: "monospace", color: "#f97316" }}>{c.vulnerability_cve || "—"}</td>
                      <td style={{ color: "#8b97a8", fontSize: "0.82rem" }}>{c.vulnerability_note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Audit log tab */}
      {activeTab === "audit" && !loading && (
        <div className="table-wrap">
          <table className="compare-table">
            <thead>
              <tr><th>Action</th><th>User</th><th>Resource</th><th>Details</th><th>Time</th></tr>
            </thead>
            <tbody>
              {auditLog.map(log => (
                <tr key={log.id}>
                  <td><span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "8px", background: "rgba(91,140,255,0.1)", color: "#5b8cff" }}>{log.action}</span></td>
                  <td style={{ fontSize: "0.82rem" }}>{log.username}</td>
                  <td style={{ fontSize: "0.75rem", color: "#8b97a8" }}>{log.resource_type} #{log.resource_id}</td>
                  <td style={{ fontSize: "0.78rem", color: "#8b97a8", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.details || "—"}</td>
                  <td style={{ fontSize: "0.72rem", color: "#5a6478" }}>{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}