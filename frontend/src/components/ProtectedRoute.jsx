// ============================================================
// ProtectedRoute.jsx
// SBOM Finder — Authentication Guard Component
// ============================================================
// Wraps any page component that should only be visible to
// authenticated users. If the user has no token, they are
// redirected to "/" (which renders Browse for guests).
//
// Why redirect to "/" instead of "/login"?
//   "/" already handles the guest → Browse redirect, so guests
//   always land on the public catalog rather than a login form.
//   The login link is visible from Browse.
//
// The `loading` guard prevents a flash-redirect:
//   On first page load, AuthProvider reads localStorage asynchronously.
//   Without this guard, ProtectedRoute would see token=null for a brief
//   moment and redirect even for users who ARE logged in — visible as
//   a flicker or a redirect loop. We wait for loading=false first.
// ============================================================

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/Authcontext";


/**
 * ProtectedRoute — renders `children` for authenticated users,
 * redirects to "/" for unauthenticated users.
 *
 * Usage:
 *   <Route path="/dashboard" element={
 *     <ProtectedRoute><Home /></ProtectedRoute>
 *   } />
 */
export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  // Auth state is still being read from localStorage — show a neutral
  // loading indicator instead of making a premature redirect decision.
  if (loading) return (
    <div style={{ textAlign: "center", padding: "4rem", color: "var(--muted)" }}>
      Loading...
    </div>
  );

  // No token — the user is not authenticated. Redirect to root.
  // `replace` removes this URL from browser history so pressing Back
  // doesn't loop back to a page the user can't access.
  if (!token) return <Navigate to="/" replace />;

  // Authenticated — render the requested page component as-is
  return children;
}