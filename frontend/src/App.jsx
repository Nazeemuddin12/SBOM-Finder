// ============================================================
// App.jsx
// SBOM Finder — Root Router Component
// ============================================================
// Defines the complete URL → component mapping for the entire app.
// Auth enforcement is done at the route level via ProtectedRoute.
//
// Route categories:
//   Public   → no token required (Browse, Login, Register, root)
//   Auth-redirect → if already logged in, skip to /dashboard
//   Protected → ProtectedRoute redirects to / if token is missing
//   Catch-all → unknown URLs bounce to dashboard or root
//
// The Header nav bar is only rendered for authenticated users —
// guests see a lightweight top bar built into Browse.jsx.
// ============================================================

import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";

// Page components — each maps to one route below
import Home from "./pages/Home";
import ItemDetails from "./pages/ItemDetails";
import Compare from "./pages/Compare";
import Stats from "./pages/Stats";
import Import from "./pages/Import";
import ReverseLookup from "./pages/ReverseLookup";
import TrackedProducts from "./pages/TrackedProducts";
import Discover from "./pages/Discover";
import Browse from "./pages/Browse";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Generate from "./pages/Generate";

import { useAuth } from "./context/Authcontext";


function App() {
  // token === null  → user is logged out
  // token === "eyJ…" → user is authenticated; used to conditionally render routes
  const { token } = useAuth();

  return (
    <div className="app-shell">

      {/* Header nav bar — only shown to authenticated users.
          Guests see a self-contained top bar inside Browse.jsx instead. */}
      {token && <Header />}

      <Routes>

        {/* ── Public routes ────────────────────────────────────────────────
            Accessible without logging in. No ProtectedRoute wrapper needed. */}

        {/* Public SBOM catalog — the app's "landing page" for guests */}
        <Route path="/browse" element={<Browse />} />

        {/* Login — if already authenticated, skip straight to dashboard */}
        <Route
          path="/login"
          element={token ? <Navigate to="/dashboard" replace /> : <Login />}
        />

        {/* Register — same skip-if-logged-in behaviour as login */}
        <Route
          path="/register"
          element={token ? <Navigate to="/dashboard" replace /> : <Register />}
        />

        {/* Root "/" — logged-in users land on their dashboard;
            guests see the public catalog (Browse) */}
        <Route
          path="/"
          element={token ? <Navigate to="/dashboard" replace /> : <Browse />}
        />

        {/* ── Protected routes ─────────────────────────────────────────────
            ProtectedRoute checks the token and redirects to "/" if missing.
            Authenticated users see the component; guests get redirected. */}

        {/* Personal SBOM library — lists all items in the user's workspace */}
        <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />

        {/* Full component breakdown for a single SBOM item */}
        <Route path="/item/:id" element={<ProtectedRoute><ItemDetails /></ProtectedRoute>} />

        {/* Side-by-side comparison of 2–4 items */}
        <Route path="/compare" element={<ProtectedRoute><Compare /></ProtectedRoute>} />

        {/* Workspace stats — item counts, source format breakdown, charts */}
        <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />

        {/* Upload a CycloneDX or SPDX JSON file */}
        <Route path="/import" element={<ProtectedRoute><Import /></ProtectedRoute>} />

        {/* Reverse lookup — "which products use this component?" */}
        <Route path="/reverse-lookup" element={<ProtectedRoute><ReverseLookup /></ProtectedRoute>} />

        {/* Tracked products watchlist */}
        <Route path="/tracked-products" element={<ProtectedRoute><TrackedProducts /></ProtectedRoute>} />

        {/* AI-powered SBOM discovery via Claude + external registries */}
        <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />

        {/* Admin moderation panel — route is accessible to all logged-in users
            but the component itself redirects non-admins away on mount */}
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

        {/* File-upload SBOM generation using the Syft scanner */}
        <Route path="/generate" element={<ProtectedRoute><Generate /></ProtectedRoute>} />

        {/* ── Catch-all ────────────────────────────────────────────────────
            Unknown paths bounce authenticated users to their dashboard
            and guests to the root (which then shows Browse). */}
        <Route
          path="*"
          element={token ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />}
        />

      </Routes>
    </div>
  );
}

export default App;