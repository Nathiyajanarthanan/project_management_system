import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import RoleLoginPage from "./pages/RoleLoginPage";
import UserDashboard from "./pages/UserDashboard";

function App() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? (user.role === "Admin" ? "/admin/home" : "/user/home") : "/login/user"} replace />} />
      <Route path="/login/admin" element={<RoleLoginPage expectedRole="Admin" />} />
      <Route path="/login/user" element={<RoleLoginPage expectedRole="User" />} />
      <Route
        path="/admin/:section"
        element={user?.role === "Admin" ? <AdminRouteScreen user={user} onLogout={logout} /> : <Navigate to="/login/admin" replace />}
      />
      <Route
        path="/user/:section"
        element={user?.role === "User" ? <UserRouteScreen user={user} onLogout={logout} /> : <Navigate to="/login/user" replace />}
      />
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

function AdminRouteScreen({ user, onLogout }: { user: NonNullable<ReturnType<typeof useAuth>["user"]>; onLogout: () => Promise<void> | void }) {
  const section = useParams().section || "home";
  return <AdminDashboard user={user} onLogout={onLogout} section={section} />;
}

function UserRouteScreen({ user, onLogout }: { user: NonNullable<ReturnType<typeof useAuth>["user"]>; onLogout: () => Promise<void> | void }) {
  const section = useParams().section || "home";
  return <UserDashboard user={user} onLogout={onLogout} section={section} />;
}

export default App;
