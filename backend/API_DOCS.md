# API Documentation

Base URL: `http://127.0.0.1:5001/api`

## Authentication

### POST `/auth/login`
Login and receive JWT.

```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

### POST `/auth/logout`
Invalidate current JWT token (requires auth).

### GET `/auth/me`
Get current user profile (requires auth).

## Users (Admin Only)

### GET `/users`
List users.

### POST `/users`
Create user.
- Returns `400` when email already exists.

### PUT `/users/{user_id}`
Update user.

### DELETE `/users/{user_id}`
Delete user.
- Admin cannot delete own account.

## Projects

### GET `/projects`
- Admin: all projects
- User: only projects where user has assigned tasks

### POST `/projects` (Admin)
Create project.

### PUT `/projects/{project_id}` (Admin)
Update project.

### DELETE `/projects/{project_id}` (Admin)
Delete project and related tasks.

## Tasks

### GET `/tasks`
Query params:
- `project_id`
- `status`
- `priority`
- `search`

### POST `/tasks` (Admin)
Create and assign task.

### PUT `/tasks/{task_id}`
- Admin: full update
- User: can update own assigned task status/fields allowed by API

## Comments

### GET `/tasks/{task_id}/comments`
List comments on task.
- Access restricted to admin or task assignee.

### POST `/tasks/{task_id}/comments`
Add task comment.

```json
{
  "message": "Work in progress update"
}
```

## Files / Attachments

### POST `/tasks/{task_id}/files`
Upload a file using `multipart/form-data`, key: `file`.
- Access restricted to admin or task assignee.

### GET `/tasks/{task_id}/files`
List file records for task.
- Access restricted to admin or task assignee.
- Response contains `download_url` for direct file access.

### GET `/files/{filename}`
Download uploaded file.

## Notifications

### GET `/notifications`
Get latest notifications for logged in user.

### PUT `/notifications/{notification_id}/read`
Mark notification as read.

## Activity Logs (Admin)

### GET `/activity`
Get recent activity logs.

## Analytics

### GET `/analytics/admin` (Admin)
System analytics and user performance.

### GET `/analytics/user`
User personal task analytics.

## Delay Prediction

### GET `/prediction/project/{project_id}`
Returns risk score and risk category (`Low`, `Medium`, `High`) based on:
- completed tasks
- pending tasks
- days remaining to deadline

## Development Utility

### POST `/dev/seed`
Reset and reseed sample data.
