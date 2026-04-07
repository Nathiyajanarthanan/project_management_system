import { useMemo, type DragEvent } from "react";
import type { Task, TaskStatus } from "../types";

const STATUSES: TaskStatus[] = ["To Do", "In Progress", "Completed"];

interface KanbanBoardProps {
  tasks: Task[];
  onMove: (taskId: number, status: TaskStatus) => void | Promise<void>;
}

export default function KanbanBoard({ tasks, onMove }: KanbanBoardProps) {
  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { "To Do": [], "In Progress": [], Completed: [] };
    tasks.forEach((task) => map[task.status]?.push(task));
    return map;
  }, [tasks]);

  const allowDrop = (event: DragEvent<HTMLDivElement>) => event.preventDefault();
  const onDragStart = (event: DragEvent<HTMLDivElement>, taskId: number) =>
    event.dataTransfer.setData("taskId", String(taskId));
  const onDrop = (event: DragEvent<HTMLDivElement>, status: TaskStatus) => {
    event.preventDefault();
    const taskId = Number(event.dataTransfer.getData("taskId"));
    onMove(taskId, status);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {STATUSES.map((status) => (
        <div key={status} className="rounded-2xl bg-white p-4 shadow-sm" onDragOver={allowDrop} onDrop={(e) => onDrop(e, status)}>
          <h3 className="mb-3 font-semibold">{status}</h3>
          <div className="space-y-2">
            {grouped[status].map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => onDragStart(e, task.id)}
                className="cursor-move rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <p className="font-medium">{task.title}</p>
                <p className="text-xs text-slate-500">
                  {task.priority} priority • due {new Date(task.deadline).toLocaleDateString()}
                </p>
              </div>
            ))}
            {grouped[status].length === 0 && <p className="text-sm text-slate-400">No tasks</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
