import { Link, useLocation } from "react-router-dom";

function Header() {
  const location = useLocation();

  const links = [
    { label: "Home", path: "/" },
    { label: "Compare", path: "/compare" },
    { label: "Reverse Lookup", path: "/reverse-lookup" },
    { label: "Tracked", path: "/tracked-products" },
    { label: "Stats", path: "/stats" },
    { label: "Import", path: "/import" },
  ];

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div className="brand-text">
            <h1>SBOM Finder</h1>
            <p>Software Bill of Materials Explorer</p>
          </div>
        </div>

        <nav className="topbar-nav">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="nav-chip"
              style={
                location.pathname === link.path
                  ? {
                      color: "white",
                      borderColor: "rgba(91, 140, 255, 0.35)",
                      background: "rgba(91, 140, 255, 0.12)",
                    }
                  : {}
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default Header;