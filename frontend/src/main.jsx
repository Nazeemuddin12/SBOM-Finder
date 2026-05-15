// ============================================================
// main.jsx
// SBOM Finder — React Application Entry Point
// ============================================================
// Mounts the React app into the <div id="root"> in index.html.
// Sets up three top-level providers that wrap the entire app:
//
//   StrictMode    → Intentionally double-invokes renders/effects
//                   in development to surface side-effect bugs early.
//                   Has zero effect in production builds.
//
//   BrowserRouter → Enables client-side routing via react-router-dom.
//                   Uses the HTML5 History API (pushState) so URLs
//                   look like /dashboard rather than /#/dashboard.
//
//   AuthProvider  → Makes auth state (user, token, login, logout)
//                   available to every component via useAuth().
// ============================================================

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/Authcontext";
import "./index.css";   // global CSS variables, resets, utility classes
import "./App.css";     // component-level styles
import App from "./App";

// createRoot is the React 18 API — it enables concurrent rendering features
// and replaces the older ReactDOM.render() call.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* BrowserRouter must wrap everything that uses <Route>, <Link>, or hooks like useNavigate */}
    <BrowserRouter>
      {/* AuthProvider must wrap everything that calls useAuth() */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);