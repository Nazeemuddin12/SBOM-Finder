import { Link, useLocation } from "react-router-dom";

function Header() {
  const location = useLocation();

  const links = [
    { label: "Home",           path: "/" },
    { label: "Compare",        path: "/compare" },
    { label: "Reverse Lookup", path: "/reverse-lookup" },
    { label: "Tracked",        path: "/tracked-products" },
    { label: "Stats",          path: "/stats" },
    { label: "Import",         path: "/import" },
  ];

  return (
    <header className="topbar">
      <div className="topbar-inner">

        {/* ---- Title bar row (blue gradient, Win2k chrome) ---- */}
        <div className="topbar-titlebar">
          <div className="brand">
            {/* 16×16 app icon */}
            <div className="brand-mark">S</div>
            <div className="brand-text">
              <h1>SBOM Finder — Software Bill of Materials Explorer</h1>
            </div>
          </div>

          {/* Win2k window control buttons */}
          <div className="win-controls">
            <button className="win-btn" title="Minimize" aria-label="Minimize">_</button>
            <button className="win-btn" title="Maximize" aria-label="Maximize">□</button>
            <button className="win-btn" title="Close"    aria-label="Close">✕</button>
          </div>
        </div>

        {/* ---- Menu bar row ---- */}
        <div className="topbar-menubar">
          <nav className="topbar-nav" aria-label="Main navigation">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={
                  "nav-chip" +
                  (location.pathname === link.path ? " active" : "")
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

      </div>
    </header>
  );
}

export default Header;
