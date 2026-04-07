# Project Management System (Full Stack)

A production-style Project Management System built with React + Tailwind on the frontend and Flask + SQLite + SQLAlchemy on the backend.

## Features

- Role-based authentication with JWT (`Admin`, `User`) and bcrypt password hashing.
- Admin module for managing users, projects, tasks, deadlines, priorities, and activity logs.
- User module for viewing assigned tasks/projects, updating status, adding comments, and uploading attachments.
- Kanban board with drag-and-drop task movement across statuses.
- Search + filtering by task title and priority.
- Notifications with polling-based real-time refresh.
- Analytics dashboard with charts (Recharts): task stats and user performance.
- Delay prediction module (rule-based) based on completed tasks, pending tasks, and project deadline.
- Dummy seed data for instant demo/testing.

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, React Router, Axios, Recharts
- **Backend:** Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-Bcrypt, Flask-CORS
- **Database:** SQLite

## Project Structure

```text
project Management/
  backend/
    app.py
    requirements.txt
  frontend/
    src/
      components/
      context/
      pages/
```

## Setup Instructions

## 1) Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Backend runs at `http://127.0.0.1:5000`.

## 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:5173`.

## Demo Credentials (Seed Data)

- **Admin:** `admin@example.com` / `admin123`
- **User:** `user@example.com` / `user123`
- **User 2:** `beta@example.com` / `user123`

## API Documentation

API docs are available in [`backend/API_DOCS.md`](backend/API_DOCS.md).

## Notes for Production

- Replace `JWT_SECRET_KEY` in `backend/app.py` with a secure environment variable.
- Add proper file storage (S3/local secure store) and filename sanitization policy.
- Add pagination and indexing for large datasets.
- Add tests and CI before deployment.
