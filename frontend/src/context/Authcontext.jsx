// ============================================================
// Authcontext.jsx
// SBOM Finder — Global Authentication State
// ============================================================
// Provides a React Context that holds the current user, JWT token,
// and login/logout helpers. Wrap the app in <AuthProvider> once
// (in main.jsx) and then call useAuth() anywhere to access them.
//
// Persistence strategy:
//   - Token is stored in localStorage under "sbom_token"
//   - User profile is stored under "sbom_user" as JSON
//   - Both are read back on mount so refreshing the page keeps the session
//   - Both are cleared on logout or when a 401 is received in apiFetch
// ============================================================

import { createContext, useContext, useState, useEffect } from "react";

// Context object — null default catches any component that forgot the provider
const AuthContext = createContext(null);


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Initialise token synchronously from localStorage.
  // Using a lazy initialiser (() => ...) avoids a render where token is null
  // for a brief moment on page load, which would flash an unauthenticated UI.
  const [token, setToken] = useState(() => localStorage.getItem("sbom_token"));

  // loading stays true until localStorage has been fully read on mount.
  // ProtectedRoute uses this to avoid redirecting before we know the auth state.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore the user profile object from localStorage on first render.
    // We parse defensively — a corrupted JSON value must not crash the whole app.
    const stored = localStorage.getItem("sbom_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // Silently discard bad JSON — the user will just need to log in again
      }
    }
    setLoading(false); // auth state is now fully hydrated — ProtectedRoute can decide
  }, []);


  /**
   * login — call this after a successful POST /auth/login or /auth/register.
   * Persists the token and user profile so they survive page refreshes,
   * then updates React state so the UI re-renders immediately.
   *
   * @param {string} tokenValue  - Raw JWT string from the API response
   * @param {object} userData    - User profile object from the API response
   */
  const login = (tokenValue, userData) => {
    localStorage.setItem("sbom_token", tokenValue);
    localStorage.setItem("sbom_user", JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  };


  /**
   * logout — wipe all stored auth data and reset state to unauthenticated.
   * Called explicitly by the Header "Sign out" button and implicitly by
   * apiFetch when it receives a 401 response.
   */
  const logout = () => {
    localStorage.removeItem("sbom_token");
    localStorage.removeItem("sbom_user");
    setToken(null);
    setUser(null);
  };


  return (
    // Expose everything downstream components might need:
    //   user    → profile object (username, role, …) or null
    //   token   → JWT string or null
    //   login   → call after successful auth
    //   logout  → call to end the session
    //   loading → true until localStorage has been read (use to guard redirects)
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}


/**
 * useAuth — convenience hook so callers don't need to import both
 * useContext and AuthContext separately.
 *
 * Usage:
 *   const { user, token, login, logout } = useAuth();
 */
export function useAuth() {
  return useContext(AuthContext);
}