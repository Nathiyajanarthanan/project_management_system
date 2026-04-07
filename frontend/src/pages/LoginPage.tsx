import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">TaskFlow PMS</p>
            <h1 className="text-lg font-bold">Project Management Platform</h1>
          </div>
          <a href="#login" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Get Started
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <section className="grid gap-6 rounded-3xl bg-gradient-to-r from-slate-950 via-violet-950 to-slate-900 p-6 text-white md:grid-cols-2 md:p-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-violet-200">Last updated April 2026</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">TaskFlow vs Traditional PM Tools</h2>
            <p className="mt-4 max-w-xl text-sm text-slate-200 md:text-base">
              TaskFlow helps Admin and User teams plan, execute, and deliver faster with role-based workflows, real-time updates,
              analytics, and project delay prediction.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#comparison" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900">
                Explore Comparison
              </a>
              <a href="#login" className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white">
                Login to Dashboard
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { title: "Flexible Views", value: "Board, List, Calendar, Analytics" },
              { title: "Connected Teams", value: "Admin + User collaboration" },
              { title: "Actionable Insights", value: "Live stats and performance charts" },
              { title: "Integrated Context", value: "Comments, files, notifications" },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/20 bg-white/10 p-3">
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-xs text-slate-200">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            "No more admin headaches with centralized permissions and user control.",
            "Kanban board, task assignment, deadlines, and priority management.",
            "Real-time polling notifications and activity logs for accountability.",
          ].map((text) => (
            <div key={text} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              {text}
            </div>
          ))}
        </section>

        <section id="comparison" className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h3 className="text-2xl font-bold">Why choose TaskFlow for project delivery?</h3>
          <p className="mt-2 text-sm text-slate-600">
            Built for modern teams that need secure authentication, role-based control, and measurable execution.
          </p>
          <div className="mt-4 overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100">
                  <th className="px-3 py-2 font-semibold">Feature comparison</th>
                  <th className="px-3 py-2 font-semibold">TaskFlow PMS</th>
                  <th className="px-3 py-2 font-semibold">Basic task tools</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Role-based auth (Admin/User)", "Yes", "Limited"],
                  ["Kanban + drag and drop", "Yes", "Partial"],
                  ["Task comments and attachments", "Yes", "Varies"],
                  ["Deadline risk prediction", "Yes", "No"],
                  ["Activity logs and notifications", "Yes", "Partial"],
                  ["Analytics dashboard", "Yes", "Basic"],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-slate-100">
                    <td className="px-3 py-2">{row[0]}</td>
                    <td className="px-3 py-2 font-medium text-emerald-700">{row[1]}</td>
                    <td className="px-3 py-2 text-slate-600">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xl font-bold">Trusted by fast-moving teams</h3>
            <p className="mt-2 text-sm text-slate-600">
              Manage projects from strategy to execution with a single workspace for planning, task progress, and team accountability.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
              {["Engineering", "Marketing", "Operations", "Design", "IT", "Leadership"].map((team) => (
                <div key={team} className="rounded-lg bg-slate-100 px-2 py-2 text-center font-medium">
                  {team}
                </div>
              ))}
            </div>
          </div>

          <div id="login" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">Welcome back</p>
            <h3 className="mb-4 text-2xl font-bold">Sign in to TaskFlow</h3>
            <form onSubmit={submit}>
              <label className="mb-2 block text-sm font-medium">Email</label>
              <input
                className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-violet-500 focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label className="mb-2 block text-sm font-medium">Password</label>
              <input
                type="password"
                className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-violet-500 focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
              <button
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 px-3 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>
            <p className="mt-4 text-xs text-slate-500">Admin: admin@example.com / admin123 | User: user@example.com / user123</p>
          </div>
        </section>
      </main>
    </div>
  );
}
