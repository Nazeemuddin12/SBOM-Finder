// ============================================================
// Header.jsx
// SBOM Finder — Top Navigation Bar
// ============================================================
// Rendered only for authenticated users (App.jsx conditionally
// mounts this based on whether a token exists).
//
// Features:
//   - Active-route highlighting (blue underline on current page)
//   - Admin link injected only for role="admin" users
//   - Username display and Sign out button
//   - Brand logo link back to root
//
// The Header is NOT shown on the public Browse page — that page
// has its own lightweight top bar built in.
// ============================================================

import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/Authcontext";


export default function Header() {
  const { user, logout } = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation(); // current pathname — used to highlight the active link

  /**
   * handleLogout — clears auth state then sends the user to the login page.
   * Calling logout() alone would leave them on a now-protected route,
   * which ProtectedRoute would bounce back anyway, so we navigate proactively.
   */
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Build the nav link array at render time so the Admin entry is included
  // only when the current user has the "admin" role. The spread at the end
  // appends zero or one extra item — no conditional rendering needed in JSX.
  const links = [
    { label: "Dashboard",      path: "/dashboard" },
    { label: "Browse",         path: "/browse" },
    { label: "Discover",       path: "/discover" },
    { label: "Compare",        path: "/compare" },
    { label: "Reverse Lookup", path: "/reverse-lookup" },
    { label: "Import",         path: "/import" },
    { label: "Stats",          path: "/stats" },
    { label: "Tracked",        path: "/tracked-products" },
    { label: "Generate",       path: "/generate" },
    // Append the admin link only for admin-role users
    ...(user?.role === "admin" ? [{ label: "🛡️ Admin", path: "/admin" }] : []),
  ];

  return (
    <header className="app-header">

      {/* Brand / logo ─────────────────────────────────────────────────────
          Clicking the logo navigates to root "/" which redirects authenticated
          users to /dashboard via the App.jsx route definition. */}
      <Link to="/" className="header-brand">
        <span className="header-logo-text">SBOM Finder</span>
        <span className="header-badge">Beta</span>
      </Link>

      {/* Primary navigation ───────────────────────────────────────────────
          Active link detection: compare location.pathname to each link's path.
          We apply a blue colour + bottom border to the matched link.
          2px transparent border on inactive links prevents layout shift
          when the active border appears. */}
      <nav className="header-nav">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="nav-link"
            style={{
              color:        location.pathname === link.path ? "#5b8cff" : undefined,
              borderBottom: location.pathname === link.path
                ? "2px solid #5b8cff"
                : "2px solid transparent",
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* User area ────────────────────────────────────────────────────────
          Shows a purple "Admin" badge for admin users so they always know
          which role they're operating under. Username is displayed next to it,
          followed by the sign-out button. */}
      <div className="header-user">
        {user?.role === "admin" && (
          <span style={{
            fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px",
            background: "rgba(167,139,250,0.15)", color: "#a78bfa", marginRight: "8px",
          }}>
            Admin
          </span>
        )}
        <span className="header-username">{user?.username}</span>
        <button className="ghost header-logout" onClick={handleLogout}>Sign out</button>
      </div>

    </header>
  );
}