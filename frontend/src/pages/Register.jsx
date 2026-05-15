// ============================================================
// Register.jsx
// SBOM Finder — Registration Page
// ============================================================
// New account creation form. Performs two client-side checks
// before hitting the network:
//   1. password === confirm  (mismatches caught instantly)
//   2. password.length >= 6  (minimum enforced client + server)
//
// On success the backend returns a JWT immediately so the user
// is auto-logged-in — no separate login step required.
//
// If the user is already logged in, App.jsx redirects them away
// from /register before this component mounts.
// ============================================================

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useAuth } from "../context/Authcontext";


export default function Register() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  // Four controlled fields — confirm is client-only and never sent to the API
  const [form, setForm]       = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);


  /**
   * handle — single onChange handler for all inputs.
   * e.target.name must match the key in the form object.
   */
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });


  /**
   * submit — validates client-side then POSTs to /auth/register.
   * On success, calls AuthContext.login() with the returned token
   * and navigates to "/" which App.jsx forwards to /dashboard.
   */
  const submit = async (e) => {
    e.preventDefault();

    // ── Client-side validation ───────────────────────────────
    // Run these before touching the network — gives instant feedback.
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return; // stop here, don't even reach setLoading
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          email:    form.email,
          password: form.password,
          // `confirm` is intentionally omitted — it's only for the UI
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");

      // Backend returns a token immediately after registration.
      // Log the user in and navigate — no separate login step needed.
      login(data.access_token, data.user);
      navigate("/");

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="auth-shell">
      <div className="auth-card">

        <div className="auth-logo">
          <span className="auth-logo-text">SBOM Finder</span>
          <span className="auth-badge">Beta</span>
        </div>

        <h2 className="auth-title">Create your account</h2>

        <form onSubmit={submit} className="auth-form">

          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handle}
            required
            autoComplete="username"
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handle}
            required
            autoComplete="email"
          />

          {/* Password field — browser won't autofill with existing password */}
          <input
            name="password"
            type="password"
            placeholder="Password (min 6 chars)"
            value={form.password}
            onChange={handle}
            required
            autoComplete="new-password"
          />

          {/* Confirm field — client-side only, not sent to API */}
          <input
            name="confirm"
            type="password"
            placeholder="Confirm password"
            value={form.confirm}
            onChange={handle}
            required
            autoComplete="new-password"
          />

          {/* Validation or server error — shown below the inputs */}
          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

      </div>
    </div>
  );
}