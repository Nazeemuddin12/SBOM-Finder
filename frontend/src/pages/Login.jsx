// ============================================================
// Login.jsx
// SBOM Finder — Login Page
// ============================================================
// Username + password form that authenticates against
// POST /auth/login. On success:
//   1. JWT and user profile are stored via AuthContext.login()
//   2. User is redirected to "/" (App.jsx sends them to /dashboard)
//
// This page is shown:
//   - When a guest navigates directly to /login
//   - When ProtectedRoute redirects an unauthenticated user
//
// If the user is already logged in, App.jsx redirects them away
// from /login before this component even mounts.
// ============================================================

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useAuth } from "../context/Authcontext";


export default function Login() {
  const navigate    = useNavigate();
  const { login }   = useAuth();

  // Controlled form state — both fields start empty
  const [form, setForm]     = useState({ username: "", password: "" });
  const [error, setError]   = useState("");     // server or network error message
  const [loading, setLoading] = useState(false); // true while the fetch is in flight


  /**
   * handle — generic onChange handler for all form inputs.
   * Uses the input's `name` attribute to update the matching key in state,
   * so we don't need a separate handler function for each field.
   */
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });


  /**
   * submit — called when the form is submitted.
   * Prevents the default browser POST, calls the API, and handles the result.
   */
  const submit = async (e) => {
    e.preventDefault(); // stop the browser from doing a full-page form POST
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form), // { username, password }
      });

      const data = await res.json();

      // Non-2xx response — the backend returns {detail: "..."} for auth errors
      if (!res.ok) throw new Error(data.detail || "Login failed");

      // Success — persist token + profile, update React auth state, redirect
      login(data.access_token, data.user);
      navigate("/"); // App.jsx redirects authenticated users from "/" to "/dashboard"

    } catch (err) {
      // Covers both network errors and server-returned error messages
      setError(err.message);
    } finally {
      setLoading(false); // re-enable the button regardless of outcome
    }
  };


  return (
    <div className="auth-shell">
      <div className="auth-card">

        {/* Brand logo at the top of the card */}
        <div className="auth-logo">
          <span className="auth-logo-text">SBOM Finder</span>
          <span className="auth-badge">Beta</span>
        </div>

        <h2 className="auth-title">Sign in to your account</h2>

        {/* Login form — onSubmit handles Enter key and button click */}
        <form onSubmit={submit} className="auth-form">

          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handle}
            required
            autoComplete="username" // helps password managers autofill
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handle}
            required
            autoComplete="current-password"
          />

          {/* Error banner — only rendered when there's something to show */}
          {error && <p className="auth-error">{error}</p>}

          {/* Submit button — disabled while the request is in flight to prevent double-submit */}
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Navigation links below the form */}
        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>

        {/* Let guests browse without signing up */}
        <p className="auth-switch" style={{ marginTop: "6px" }}>
          <Link to="/browse">Browse public SBOMs without an account →</Link>
        </p>

      </div>
    </div>
  );
}