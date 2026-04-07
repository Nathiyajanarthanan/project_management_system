import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../api";
import KanbanBoard from "../components/KanbanBoard";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import type { ActivityLogItem, AppNotification, CurrentUser, Project, SimpleUser, Task, TaskPriority, TaskStatus } from "../types";

const COLORS = ["#0f172a", "#7c3aed", "#06b6d4"];

interface AdminDashboardProps {
  user: CurrentUser;
  onLogout: () => Promise<void> | void;
  section: string;
}

interface AdminAnalytics {
  totals: {
    projects: number;
    tasks: number;
    completed: number;
    in_progress: number;
    todo: number;
  };
  user_performance: Array<{ name: string; total: number; completed: number }>;
}

interface TaskForm {
  title: string;
  project_id: number | "";
  assigned_to: number | "";
  deadline: string;
  priority: TaskPriority;
  status: TaskStatus;
}

interface ProjectForm {
  title: string;
  description: string;
  deadline: string;
}

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: "Admin" | "User";
}

export default function AdminDashboard({ user, onLogout, section }: AdminDashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activity, setActivity] = useState<ActivityLogItem[]>([]);
  const [taskForm, setTaskForm] = useState<TaskForm>({
    title: "",
    project_id: "",
    assigned_to: "",
    deadline: "",
    priority: "Medium",
    status: "To Do",
  });
  const [projectForm, setProjectForm] = useState<ProjectForm>({ title: "", description: "", deadline: "" });
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [userForm, setUserForm] = useState<UserForm>({ name: "", email: "", password: "", role: "User" });
  const [error, setError] = useState<string>("");

  const fetchAll = async () => {
    try {
      const [p, t, u, a, n, logs] = await Promise.all([
        api.get<Project[]>("/projects"),
        api.get<Task[]>("/tasks"),
        api.get<SimpleUser[]>("/users"),
        api.get<AdminAnalytics>("/analytics/admin"),
        api.get<AppNotification[]>("/notifications"),
        api.get<ActivityLogItem[]>("/activity"),
      ]);
      setProjects(p.data);
      setTasks(t.data);
      setUsers(u.data);
      setAnalytics(a.data);
      setNotifications(n.data);
      setActivity(logs.data);
      setError("");
    } catch {
      setError("Failed to load dashboard data.");
    }
  };

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, 10000);
    return () => clearInterval(timer);
  }, []);

  const moveTask = async (taskId: number, status: TaskStatus) => {
    await api.put(`/tasks/${taskId}`, { status });
    fetchAll();
  };

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!taskForm.project_id || !taskForm.assigned_to) return;
    await api.post("/tasks", {
      ...taskForm,
      project_id: Number(taskForm.project_id),
      assigned_to: Number(taskForm.assigned_to),
    });
    setTaskForm({ title: "", project_id: "", assigned_to: "", deadline: "", priority: "Medium", status: "To Do" });
    fetchAll();
  };

  const createProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectForm.title || !projectForm.deadline) return;
    await api.post("/projects", projectForm);
    setProjectForm({ title: "", description: "", deadline: "" });
    fetchAll();
  };

  const startEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectForm({
      title: project.title,
      description: project.description || "",
      deadline: project.deadline.slice(0, 10),
    });
  };

  const saveProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProject) return;
    await api.put(`/projects/${editingProject.id}`, projectForm);
    setEditingProject(null);
    setProjectForm({ title: "", description: "", deadline: "" });
    fetchAll();
  };

  const deleteProject = async (projectId: number) => {
    await api.delete(`/projects/${projectId}`);
    if (editingProject?.id === projectId) {
      setEditingProject(null);
      setProjectForm({ title: "", description: "", deadline: "" });
    }
    fetchAll();
  };

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userForm.name || !userForm.email || !userForm.password) return;
    await api.post("/users", userForm);
    setUserForm({ name: "", email: "", password: "", role: "User" });
    fetchAll();
  };

  const toggleUserRole = async (selectedUser: SimpleUser) => {
    const nextRole = selectedUser.role === "Admin" ? "User" : "Admin";
    await api.put(`/users/${selectedUser.id}`, { role: nextRole });
    fetchAll();
  };

  const removeUser = async (userId: number) => {
    await api.delete(`/users/${userId}`);
    fetchAll();
  };

  const pieData = useMemo(
    () => [
      { name: "Completed", value: analytics?.totals.completed || 0 },
      { name: "In Progress", value: analytics?.totals.in_progress || 0 },
      { name: "To Do", value: analytics?.totals.todo || 0 },
    ],
    [analytics]
  );

  const titles: Record<string, string> = {
    home: "Admin Home",
    projects: "Project Management",
    progress: "Progress Board",
    reports: "Reports & Analytics",
  };
  const title = titles[section] || "Admin Home";

  const navItems = [
    { label: "Home", to: "/admin/home", icon: "dashboard" as const },
    { label: "Projects", to: "/admin/projects", icon: "projects" as const },
    { label: "Progress", to: "/admin/progress", icon: "tasks" as const },
    { label: "Reports", to: "/admin/reports", icon: "analytics" as const },
  ];

  return (
    <Layout title={title} user={user} onLogout={onLogout} notifications={notifications} navItems={navItems}>
      {(section === "home" || section === "progress" || section === "reports") && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Projects" value={analytics?.totals.projects || 0} />
        <StatCard label="Total Tasks" value={analytics?.totals.tasks || 0} tone="violet" />
        <StatCard label="Completed Tasks" value={analytics?.totals.completed || 0} tone="emerald" />
        <StatCard label="In Progress" value={analytics?.totals.in_progress || 0} tone="cyan" />
      </section>
      )}

      {error && <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {(section === "home" || section === "progress") && <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm xl:col-span-2">
          <h3 className="mb-3 font-semibold">Kanban Board</h3>
          <KanbanBoard tasks={tasks} onMove={moveTask} />
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">Create Task</h3>
          <form className="space-y-2" onSubmit={createTask}>
            <input
              placeholder="Task title"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              required
            />
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={taskForm.project_id}
              onChange={(e) => setTaskForm({ ...taskForm, project_id: e.target.value ? Number(e.target.value) : "" })}
              required
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={taskForm.assigned_to}
              onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value ? Number(e.target.value) : "" })}
              required
            >
              <option value="">Assign user</option>
              {users
                .filter((u) => u.role === "User")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={taskForm.deadline}
              onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
              required
            />
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={taskForm.priority}
              onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={taskForm.status}
              onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })}
            >
              <option>To Do</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
            <button className="w-full rounded-xl bg-slate-900 px-3 py-2 text-white">Create</button>
          </form>
        </div>
      </section>}

      {(section === "home" || section === "reports") && <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">Task Stats</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={84}>
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm xl:col-span-2">
          <h3 className="mb-3 font-semibold">User Performance</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.user_performance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" fill="#0f172a" />
                <Bar dataKey="total" fill="#7c3aed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>}

      {(section === "progress" || section === "reports") && <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-2 font-semibold">Recent Activity Logs</h3>
          <div className="max-h-52 space-y-2 overflow-auto text-sm">
            {activity.map((log) => (
              <div key={log.id} className="rounded-lg bg-slate-50 p-2">
                {log.action} - {log.entity_type} #{log.entity_id}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-2 font-semibold">Delay Predictions</h3>
          <div className="space-y-2 text-sm">
            {projects.map((project) => (
              <ProjectPrediction key={project.id} project={project} />
            ))}
          </div>
        </div>
      </section>}

      {(section === "projects" || section === "home") && <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">{editingProject ? "Update Project" : "Create Project"}</h3>
          <form className="space-y-2" onSubmit={editingProject ? saveProject : createProject}>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              placeholder="Project title"
              value={projectForm.title}
              onChange={(e) => setProjectForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
            <textarea
              className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2"
              placeholder="Project description"
              value={projectForm.description}
              onChange={(e) => setProjectForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={projectForm.deadline}
              onChange={(e) => setProjectForm((prev) => ({ ...prev, deadline: e.target.value }))}
              required
            />
            <div className="flex gap-2">
              <button className="rounded-xl bg-slate-900 px-3 py-2 text-white">{editingProject ? "Save Changes" : "Create Project"}</button>
              {editingProject && (
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 px-3 py-2"
                  onClick={() => {
                    setEditingProject(null);
                    setProjectForm({ title: "", description: "", deadline: "" });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          <div className="mt-3 max-h-56 space-y-2 overflow-auto text-sm">
            {projects.map((project) => (
              <div key={project.id} className="rounded-lg border border-slate-200 p-2">
                <p className="font-medium">{project.title}</p>
                <p className="text-xs text-slate-500">Deadline: {new Date(project.deadline).toLocaleDateString()}</p>
                <div className="mt-2 flex gap-2">
                  <button className="rounded-lg bg-violet-100 px-2 py-1 text-violet-700" onClick={() => startEditProject(project)}>
                    Edit
                  </button>
                  <button className="rounded-lg bg-red-100 px-2 py-1 text-red-700" onClick={() => deleteProject(project.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">User Management</h3>
          <form className="grid gap-2 md:grid-cols-2" onSubmit={createUser}>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2"
              placeholder="Name"
              value={userForm.name}
              onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2"
              placeholder="Email"
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2"
              placeholder="Password"
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
            <select
              className="rounded-xl border border-slate-200 px-3 py-2"
              value={userForm.role}
              onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value as "Admin" | "User" }))}
            >
              <option>User</option>
              <option>Admin</option>
            </select>
            <button className="rounded-xl bg-slate-900 px-3 py-2 text-white md:col-span-2">Add User</button>
          </form>
          <div className="mt-3 max-h-56 space-y-2 overflow-auto text-sm">
            {users.map((listedUser) => (
              <div key={listedUser.id} className="rounded-lg border border-slate-200 p-2">
                <p className="font-medium">{listedUser.name}</p>
                <p className="text-xs text-slate-500">{listedUser.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{listedUser.role}</span>
                  {listedUser.id !== user.id && (
                    <>
                      <button className="rounded-lg bg-violet-100 px-2 py-1 text-violet-700" onClick={() => toggleUserRole(listedUser)}>
                        Toggle Role
                      </button>
                      <button className="rounded-lg bg-red-100 px-2 py-1 text-red-700" onClick={() => removeUser(listedUser.id)}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>}
    </Layout>
  );
}

interface PredictionResponse {
  risk: "Low" | "Medium" | "High";
  score: number;
  reason: string;
}

function ProjectPrediction({ project }: { project: Project }) {
  const [data, setData] = useState<PredictionResponse | null>(null);
  useEffect(() => {
    api.get<PredictionResponse>(`/prediction/project/${project.id}`).then((response) => setData(response.data));
  }, [project.id]);
  if (!data) return <div className="rounded-lg bg-slate-50 p-2">{project.title}: loading...</div>;
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <span className="font-medium">{project.title}</span>: <span className="font-semibold">{data.risk}</span> ({data.reason})
    </div>
  );
}
