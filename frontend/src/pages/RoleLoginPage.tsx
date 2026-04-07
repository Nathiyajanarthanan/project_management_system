import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";

interface RoleLoginPageProps {
  expectedRole: Role;
}

export default function RoleLoginPage({ expectedRole }: RoleLoginPageProps) {
  const { login, logout, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(expectedRole === "Admin" ? "admin@example.com" : "user@example.com");
  const [password, setPassword] = useState(expectedRole === "Admin" ? "admin123" : "user123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user?.role === "Admin") return <Navigate to="/admin/home" replace />;
  if (user?.role === "User") return <Navigate to="/user/home" replace />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedIn = await login(email, password);
      if (loggedIn.role !== expectedRole) {
        await logout();
        setError(`This is ${expectedRole} login only. Please use ${loggedIn.role} login.`);
        return;
      }
      navigate(expectedRole === "Admin" ? "/admin/home" : "/user/home");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg">
        <p className="text-xs uppercase tracking-wide text-violet-600">{expectedRole} Portal</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{expectedRole} Login</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to continue to the {expectedRole.toLowerCase()} dashboard.</p>

        <form className="mt-6 space-y-3" onSubmit={submit}>
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="w-full rounded-xl bg-slate-900 px-4 py-2 text-white" disabled={loading}>
            {loading ? "Signing in..." : `Login as ${expectedRole}`}
          </button>
        </form>

        <div className="mt-4 text-xs text-slate-500">
          {expectedRole === "Admin" ? "Admin demo: admin@example.com / admin123" : "User demo: user@example.com / user123"}
        </div>
        <div className="mt-4 text-sm text-slate-600">
          {expectedRole === "Admin" ? (
            <Link className="text-violet-700 hover:underline" to="/login/user">
              Switch to User login
            </Link>
          ) : (
            <Link className="text-violet-700 hover:underline" to="/login/admin">
              Switch to Admin login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
