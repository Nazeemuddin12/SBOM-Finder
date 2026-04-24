import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
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
import { useAuth } from "./context/Authcontext";
import Generate from "./pages/Generate";

function App() {
  // token is null when logged out, a JWT string when logged in
  const { token } = useAuth();

  return (
    <div className="app-shell">
      {/* Only show the nav bar to logged in users — guests just see the public catalog */}
      {token && <Header />}

      <Routes>

        {/* ── Public routes — no login required ─────────────────────────── */}

        {/* Public SBOM catalog — anyone can browse without an account */}
        <Route path="/browse" element={<Browse />} />

        {/* If already logged in, skip login page and go straight to dashboard */}
        <Route
          path="/login"
          element={token ? <Navigate to="/dashboard" replace /> : <Login />}
        />

        {/* Same redirect logic for register page */}
        <Route
          path="/register"
          element={token ? <Navigate to="/dashboard" replace /> : <Register />}
        />

        {/* Root path — logged in users go to dashboard, guests see public catalog */}
        <Route
          path="/"
          element={token ? <Navigate to="/dashboard" replace /> : <Browse />}
        />

        {/* ── Protected routes — redirect to /login if no token ──────────── */}

        {/* Personal SBOM library */}
        <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />

        {/* Full component list for a single SBOM */}
        <Route path="/item/:id" element={<ProtectedRoute><ItemDetails /></ProtectedRoute>} />

        {/* Side by side comparison of 2 to 4 items */}
        <Route path="/compare" element={<ProtectedRoute><Compare /></ProtectedRoute>} />

        {/* Workspace stats and charts */}
        <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />

        {/* Upload a CycloneDX or SPDX file */}
        <Route path="/import" element={<ProtectedRoute><Import /></ProtectedRoute>} />

        {/* Search by component name to find all products using it */}
        <Route path="/reverse-lookup" element={<ProtectedRoute><ReverseLookup /></ProtectedRoute>} />

        {/* Watchlist of products the user wants to track */}
        <Route path="/tracked-products" element={<ProtectedRoute><TrackedProducts /></ProtectedRoute>} />

        {/* AI powered SBOM discovery using Claude */}
        <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />

        {/* Admin moderation panel — visible to all logged in users but only functional for admins */}
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

        {/* Upload a file and generate an SBOM using Syft */}
        <Route path="/generate" element={<ProtectedRoute><Generate /></ProtectedRoute>} />

        {/* ── Catch-all — redirect unknown URLs based on auth state ───────── */}
        <Route
          path="*"
          element={token ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />}
        />

      </Routes>
    </div>
  );
}

export default App;