import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/Authcontext";
import Header from "./components/Header";
import Home from "./pages/Home";
import ItemDetails from "./pages/ItemDetails";
import Compare from "./pages/Compare";
import Stats from "./pages/Stats";
import Import from "./pages/Import";
import ReverseLookup from "./pages/ReverseLookup";
import TrackedProducts from "./pages/TrackedProducts";
import Login from "./pages/Login";
import Register from "./pages/Register";

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const { token } = useAuth();

  return (
    <div className="app-shell">
      {token && <Header />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/item/:id" element={<ProtectedRoute><ItemDetails /></ProtectedRoute>} />
        <Route path="/compare" element={<ProtectedRoute><Compare /></ProtectedRoute>} />
        <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
        <Route path="/import" element={<ProtectedRoute><Import /></ProtectedRoute>} />
        <Route path="/reverse-lookup" element={<ProtectedRoute><ReverseLookup /></ProtectedRoute>} />
        <Route path="/tracked-products" element={<ProtectedRoute><TrackedProducts /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to={token ? "/" : "/login"} replace />} />
      </Routes>
    </div>
  );
}

export default App;