import { Navigate } from "react-router-dom";
import { useAuth } from "../context/Authcontext";

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) return (
    <div style={{ textAlign: "center", padding: "4rem", color: "var(--muted)" }}>
      Loading...
    </div>
  );

  if (!token) return <Navigate to="/" replace />;

  return children;
}