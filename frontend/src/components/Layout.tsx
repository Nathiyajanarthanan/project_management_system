import clsx from "clsx";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import type { AppNotification, CurrentUser } from "../types";

interface LayoutProps {
  title: string;
  user: CurrentUser;
  onLogout: () => Promise<void> | void;
  notifications: AppNotification[];
  navItems: Array<{ label: string; to: string; icon: "dashboard" | "projects" | "tasks" | "analytics" | "notifications" }>;
  children: ReactNode;
}

function NavIcon({ name }: { name: "dashboard" | "projects" | "tasks" | "analytics" | "notifications" }) {
  const common = "h-5 w-5";
  switch (name) {
    case "dashboard":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path d="M4 13h7V4H4v9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M13 20h7V11h-7v9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M13 4h7v7h-7V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 20h7v-4H4v4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "projects":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path d="M3 7h6l2 2h10v10H3V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 7V5h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "tasks":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path d="M9 11h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M9 17h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M9 5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 5l1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 11l1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 17l1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "analytics":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 16v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 16v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 16v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "notifications":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M6 17h12l-1-2v-5a5 5 0 0 0-10 0v5l-1 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

export default function Layout({ title, user, onLogout, notifications, navItems, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-7xl gap-6 p-4 md:p-6">
        <aside className="hidden w-64 rounded-3xl bg-slate-950 p-5 text-white md:block">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">TaskFlow</h1>
            <div className="rounded-2xl bg-violet-500/20 p-2 text-violet-200">✓</div>
          </div>
          <nav className="mt-8 space-y-1.5 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 rounded-2xl px-3 py-2",
                    isActive ? "bg-violet-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )
                }
              >
                <span className="text-slate-200">
                  <NavIcon name={item.icon} />
                </span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="mt-8 rounded-2xl bg-slate-900 p-3 text-xs text-slate-400">
            Role: <span className="font-semibold text-white">{user.role}</span>
          </div>
        </aside>
        <main className="flex-1">
          <header className="mb-5 rounded-3xl bg-white p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Project Management System</p>
                <h2 className="text-2xl font-semibold">{title}</h2>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
                <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2">
                  <input
                    className="w-56 bg-transparent text-sm outline-none placeholder:text-slate-500"
                    placeholder="Search task..."
                    // UI-only: actual searching lives inside the dashboards.
                    onChange={() => {}}
                  />
                  <div className="text-slate-500">⌕</div>
                </div>

                <div className="hidden items-center gap-2 rounded-2xl bg-slate-100 p-1 md:flex">
                  {["Today", "This Week", "This Month", "Reports"].map((pill) => (
                    <div key={pill} className="rounded-xl bg-white px-3 py-1 text-xs font-medium text-slate-800 shadow-sm">
                      {pill}
                    </div>
                  ))}
                </div>

                <button
                  className="relative hidden rounded-2xl bg-slate-100 p-2 text-slate-800 hover:bg-slate-200 md:block"
                  onClick={() => {}}
                  aria-label="Notifications"
                >
                  <NavIcon name="notifications" />
                  {notifications.length > 0 && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {Math.min(notifications.length, 99)}
                    </span>
                  )}
                </button>

                <div
                  className={clsx(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    user.role === "Admin" ? "bg-violet-100 text-violet-800" : "bg-cyan-100 text-cyan-800"
                  )}
                >
                  {user.name}
                </div>

                <button
                  onClick={onLogout}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
