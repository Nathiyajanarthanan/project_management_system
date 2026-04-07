import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import api from "../api";
import type { CurrentUser } from "../types";

interface AuthContextType {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore logout API failures
    }
    localStorage.removeItem("token");
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    const response = await api.post<{ token: string; user: CurrentUser }>("/auth/login", { email, password });
    localStorage.setItem("token", response.data.token);
    setUser(response.data.user);
    return response.data.user;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<CurrentUser>("/auth/me")
      .then((response) => setUser(response.data))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextType>(() => ({ user, loading, login, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
