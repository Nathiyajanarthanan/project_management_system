export type Role = "Admin" | "User";
export type TaskStatus = "To Do" | "In Progress" | "Completed";
export type TaskPriority = "Low" | "Medium" | "High";

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Project {
  id: number;
  title: string;
  description: string | null;
  deadline: string;
  created_by: number;
}

export interface Task {
  id: number;
  title: string;
  project_id: number;
  assigned_to: number;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string;
  created_at: string;
}

export interface AppNotification {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AppComment {
  id: number;
  task_id: number;
  user_id: number;
  message: string;
  created_at: string;
}

export interface AppFile {
  id: number;
  task_id: number;
  file_path: string;
  download_url: string;
}

export interface SimpleUser {
  id: number;
  name: string;
  email?: string;
  role: Role;
}

export interface ActivityLogItem {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  created_at: string;
}
