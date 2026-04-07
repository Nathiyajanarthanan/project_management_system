import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api";
import KanbanBoard from "../components/KanbanBoard";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import type { AppComment, AppFile, AppNotification, CurrentUser, Project, Task, TaskPriority, TaskStatus } from "../types";

interface UserDashboardProps {
  user: CurrentUser;
  onLogout: () => Promise<void> | void;
  section: string;
}

interface TaskFilters {
  search: string;
  priority: "" | TaskPriority;
}

export default function UserDashboard({ user, onLogout, section }: UserDashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [comments, setComments] = useState<Record<number, AppComment[]>>({});
  const [files, setFiles] = useState<Record<number, AppFile[]>>({});
  const [commentText, setCommentText] = useState<Record<number, string>>({});
  const [filters, setFilters] = useState<TaskFilters>({ search: "", priority: "" });

  const fetchAll = useCallback(async () => {
    const [p, t, n] = await Promise.all([
      api.get<Project[]>("/projects"),
      api.get<Task[]>("/tasks", { params: filters }),
      api.get<AppNotification[]>("/notifications"),
    ]);
    setProjects(p.data);
    setTasks(t.data);
    setNotifications(n.data);
  }, [filters]);

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, 10000);
    return () => clearInterval(timer);
  }, [fetchAll]);

  const moveTask = async (taskId: number, status: TaskStatus) => {
    await api.put(`/tasks/${taskId}`, { status });
    fetchAll();
  };

  const loadComments = async (taskId: number) => {
    const res = await api.get<AppComment[]>(`/tasks/${taskId}/comments`);
    setComments((prev) => ({ ...prev, [taskId]: res.data }));
  };

  const loadFiles = async (taskId: number) => {
    const res = await api.get<AppFile[]>(`/tasks/${taskId}/files`);
    setFiles((prev) => ({ ...prev, [taskId]: res.data }));
  };

  const addComment = async (taskId: number) => {
    if (!commentText[taskId]) return;
    await api.post(`/tasks/${taskId}/comments`, { message: commentText[taskId] });
    setCommentText((prev) => ({ ...prev, [taskId]: "" }));
    loadComments(taskId);
  };

  const uploadFile = async (taskId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    await api.post(`/tasks/${taskId}/files`, formData);
    loadFiles(taskId);
  };

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.status === "Completed").length;
    const inProgress = tasks.filter((task) => task.status === "In Progress").length;
    return { completed, inProgress, total: tasks.length };
  }, [tasks]);

  const titles: Record<string, string> = {
    home: "User Home",
    tasks: "My Tasks",
    progress: "Progress",
    reports: "My Reports",
  };
  const title = titles[section] || "User Home";

  const navItems = [
    { label: "Home", to: "/user/home", icon: "dashboard" as const },
    { label: "Tasks", to: "/user/tasks", icon: "tasks" as const },
    { label: "Progress", to: "/user/progress", icon: "projects" as const },
    { label: "Reports", to: "/user/reports", icon: "analytics" as const },
  ];

  return (
    <Layout title={title} user={user} onLogout={onLogout} notifications={notifications} navItems={navItems}>
      {(section === "home" || section === "progress" || section === "reports") && <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Assigned Projects" value={projects.length} tone="violet" />
        <StatCard label="Assigned Tasks" value={stats.total} tone="slate" />
        <StatCard label="Completed Tasks" value={stats.completed} tone="emerald" />
      </section>}

      {(section === "home" || section === "tasks") && <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">Search & Filters</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2"
            placeholder="Search tasks"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
          <select
            className="rounded-xl border border-slate-200 px-3 py-2"
            value={filters.priority}
            onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value as TaskFilters["priority"] }))}
          >
            <option value="">All priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </section>}

      {(section === "home" || section === "progress") && <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">My Tasks (Kanban)</h3>
        <KanbanBoard tasks={tasks} onMove={moveTask} />
      </section>}

      {(section === "home" || section === "tasks") && <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">Task Comments & Attachments</h3>
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium">{task.title}</p>
                <button className="text-sm text-violet-700" onClick={() => loadComments(task.id)}>
                  Load comments
                </button>
                <button className="text-sm text-cyan-700" onClick={() => loadFiles(task.id)}>
                  Load files
                </button>
              </div>
              <div className="mb-2 space-y-1 text-sm">
                {(comments[task.id] || []).map((comment) => (
                  <div key={comment.id} className="rounded-md bg-slate-50 p-2">
                    {comment.message}
                  </div>
                ))}
              </div>
              <div className="mb-2 space-y-1 text-sm">
                {(files[task.id] || []).map((file) => (
                  <a
                    key={file.id}
                    href={file.download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-md bg-cyan-50 p-2 text-cyan-800 hover:bg-cyan-100"
                  >
                    {file.file_path}
                  </a>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1"
                  placeholder="Write comment"
                  value={commentText[task.id] || ""}
                  onChange={(e) => setCommentText((prev) => ({ ...prev, [task.id]: e.target.value }))}
                />
                <button className="rounded-lg bg-slate-900 px-3 py-1 text-white" onClick={() => addComment(task.id)}>
                  Add
                </button>
                <input type="file" onChange={(e) => e.target.files?.[0] && uploadFile(task.id, e.target.files[0])} />
              </div>
            </div>
          ))}
        </div>
      </section>}

      {section === "reports" && (
        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">Recent Notifications</h3>
          <div className="space-y-2 text-sm">
            {notifications.map((note) => (
              <div key={note.id} className="rounded-lg bg-slate-50 p-2">
                {note.message}
              </div>
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}
