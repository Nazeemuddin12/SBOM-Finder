import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useAuth } from "../context/Authcontext";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
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
          email: form.email,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");
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
        </div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Start discovering and analyzing SBOMs</p>

        <form onSubmit={submit} className="auth-form">
          <div className="auth-field">
            <label>Username</label>
            <input name="username" type="text" value={form.username}
              onChange={handle} placeholder="choose a username" required autoFocus />
          </div>
          <div className="auth-field">
            <label>Email</label>
            <input name="email" type="email" value={form.email}
              onChange={handle} placeholder="you@example.com" required />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input name="password" type="password" value={form.password}
              onChange={handle} placeholder="min 6 characters" required />
          </div>
          <div className="auth-field">
            <label>Confirm password</label>
            <input name="confirm" type="password" value={form.confirm}
              onChange={handle} placeholder="repeat password" required />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-btn" disabled={loading}>
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