import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/Authcontext";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const links = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Browse", path: "/browse" },
    { label: "Discover", path: "/discover" },
    { label: "Compare", path: "/compare" },
    { label: "Reverse Lookup", path: "/reverse-lookup" },
    { label: "Import", path: "/import" },
    { label: "Stats", path: "/stats" },
    { label: "Tracked", path: "/tracked-products" },
    ...(user?.role === "admin" ? [{ label: "🛡️ Admin", path: "/admin" }] : []),
  ];

  return (
    <header className="app-header">
      <Link to="/" className="header-brand">
        <span className="header-logo-text">SBOM Finder</span>
        <span className="header-badge">Beta</span>
      </Link>
      <nav className="header-nav">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="nav-link"
            style={{
              color: location.pathname === link.path ? "#5b8cff" : undefined,
              borderBottom: location.pathname === link.path ? "2px solid #5b8cff" : "2px solid transparent",
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="header-user">
        {user?.role === "admin" && (
          <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", background: "rgba(167,139,250,0.15)", color: "#a78bfa", marginRight: "8px" }}>
            Admin
          </span>
        )}
        <span className="header-username">{user?.username}</span>
        <button className="ghost header-logout" onClick={handleLogout}>Sign out</button>
      </div>
    </header>
  );
}