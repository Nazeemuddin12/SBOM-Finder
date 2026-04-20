import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/Authcontext";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="app-header">
      <Link to="/" className="header-brand">
        <span className="header-logo-text">SBOM Finder</span>
        <span className="header-badge">Beta</span>
      </Link>

      <nav className="header-nav">
        <Link to="/">Dashboard</Link>
        <Link to="/compare">Compare</Link>
        <Link to="/reverse-lookup">Reverse Lookup</Link>
        <Link to="/import">Import</Link>
        <Link to="/stats">Stats</Link>
        <Link to="/tracked-products">Tracked</Link>
      </nav>

      <div className="header-user">
        <span className="header-username">{user?.username}</span>
        <button className="ghost header-logout" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </header>
  );
}