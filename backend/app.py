from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import case, func
from werkzeug.utils import secure_filename

db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()
blocked_tokens = set()


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="User")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Project(db.Model):
    __tablename__ = "projects"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    deadline = db.Column(db.DateTime, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)


class Task(db.Model):
    __tablename__ = "tasks"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(50), default="To Do", nullable=False)
    priority = db.Column(db.String(20), default="Medium", nullable=False)
    deadline = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Comment(db.Model):
    __tablename__ = "comments"
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class File(db.Model):
    __tablename__ = "files"
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Notification(db.Model):
    __tablename__ = "notifications"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ActivityLog(db.Model):
    __tablename__ = "activity_logs"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    action = db.Column(db.String(255), nullable=False)
    entity_type = db.Column(db.String(50), nullable=False)
    entity_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


def create_app():
    frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
    app = Flask(__name__, static_folder=str(frontend_dist), static_url_path="/")
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///project_management.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = "change-me-in-production"
    app.config["UPLOAD_FOLDER"] = "uploads"
    app.config["FRONTEND_DIST"] = frontend_dist

    Path(app.config["UPLOAD_FOLDER"]).mkdir(exist_ok=True)

    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(_, jwt_payload):
        return jwt_payload["jti"] in blocked_tokens

    with app.app_context():
        db.create_all()
        seed_if_empty()

    register_routes(app)
    return app


def serialize_project(project):
    return {
        "id": project.id,
        "title": project.title,
        "description": project.description,
        "deadline": project.deadline.isoformat(),
        "created_by": project.created_by,
    }


def serialize_task(task):
    return {
        "id": task.id,
        "title": task.title,
        "project_id": task.project_id,
        "assigned_to": task.assigned_to,
        "status": task.status,
        "priority": task.priority,
        "deadline": task.deadline.isoformat(),
        "created_at": task.created_at.isoformat(),
    }


def is_admin(user):
    return user and user.role == "Admin"


def current_user():
    uid = int(get_jwt_identity())
    return db.session.get(User, uid)


def log_action(user_id, action, entity_type, entity_id):
    db.session.add(
        ActivityLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
        )
    )


def notify_user(user_id, message):
    db.session.add(Notification(user_id=user_id, message=message))


def predict_delay(project):
    tasks = Task.query.filter_by(project_id=project.id).all()
    total = len(tasks)
    if total == 0:
        return {"risk": "Low", "score": 0.1, "reason": "No tasks created yet."}

    done = len([t for t in tasks if t.status == "Completed"])
    pending = total - done
    completion_ratio = done / total
    days_to_deadline = (project.deadline - datetime.now(timezone.utc).replace(tzinfo=None)).days

    score = (pending / total) * 0.6
    if days_to_deadline <= 7:
        score += 0.3
    elif days_to_deadline <= 14:
        score += 0.15

    score += (1 - completion_ratio) * 0.1
    score = min(max(score, 0), 1)
    risk = "High" if score >= 0.7 else "Medium" if score >= 0.4 else "Low"
    return {
        "risk": risk,
        "score": round(score, 2),
        "reason": f"{pending} pending of {total}, deadline in {days_to_deadline} day(s).",
    }


def register_routes(app):
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    @app.post("/api/auth/login")
    def login():
        data = request.json or {}
        user = User.query.filter_by(email=data.get("email", "")).first()
        if not user or not bcrypt.check_password_hash(user.password, data.get("password", "")):
            return jsonify({"error": "Invalid credentials"}), 401
        token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
        return jsonify(
            {
                "token": token,
                "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
            }
        )

    @app.post("/api/auth/logout")
    @jwt_required()
    def logout():
        blocked_tokens.add(get_jwt()["jti"])
        return jsonify({"message": "Logged out"})

    @app.get("/api/auth/me")
    @jwt_required()
    def me():
        user = current_user()
        return jsonify({"id": user.id, "name": user.name, "email": user.email, "role": user.role})

    @app.get("/api/users")
    @jwt_required()
    def list_users():
        user = current_user()
        if not is_admin(user):
            return jsonify({"error": "Forbidden"}), 403
        users = User.query.all()
        return jsonify(
            [{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "created_at": u.created_at.isoformat()} for u in users]
        )

    @app.post("/api/users")
    @jwt_required()
    def create_user():
        user = current_user()
        if not is_admin(user):
            return jsonify({"error": "Forbidden"}), 403
        data = request.json or {}
        if User.query.filter_by(email=data.get("email", "")).first():
            return jsonify({"error": "Email already exists"}), 400
        hashed = bcrypt.generate_password_hash(data["password"]).decode("utf-8")
        created = User(name=data["name"], email=data["email"], role=data.get("role", "User"), password=hashed)
        db.session.add(created)
        db.session.commit()
        return jsonify({"id": created.id}), 201

    @app.put("/api/users/<int:user_id>")
    @jwt_required()
    def update_user(user_id):
        user = current_user()
        if not is_admin(user):
            return jsonify({"error": "Forbidden"}), 403
        data = request.json or {}
        target = db.session.get(User, user_id)
        if not target:
            return jsonify({"error": "User not found"}), 404
        target.name = data.get("name", target.name)
        target.role = data.get("role", target.role)
        if data.get("password"):
            target.password = bcrypt.generate_password_hash(data["password"]).decode("utf-8")
        db.session.commit()
        return jsonify({"message": "Updated"})

    @app.delete("/api/users/<int:user_id>")
    @jwt_required()
    def delete_user(user_id):
        user = current_user()
        if not is_admin(user):
            return jsonify({"error": "Forbidden"}), 403
        if user.id == user_id:
            return jsonify({"error": "You cannot delete your own account"}), 400
        target = db.session.get(User, user_id)
        if not target:
            return jsonify({"error": "User not found"}), 404
        db.session.delete(target)
        db.session.commit()
        return jsonify({"message": "Deleted"})

    @app.get("/api/projects")
    @jwt_required()
    def list_projects():
        user = current_user()
        if is_admin(user):
            projects = Project.query.order_by(Project.deadline.asc()).all()
        else:
            assigned_project_ids = (
                db.session.query(Task.project_id).filter(Task.assigned_to == user.id).distinct().all()
            )
            ids = [x[0] for x in assigned_project_ids]
            projects = Project.query.filter(Project.id.in_(ids)).order_by(Project.deadline.asc()).all() if ids else []
        return jsonify([serialize_project(project) for project in projects])

    @app.post("/api/projects")
    @jwt_required()
    def create_project():
        user = current_user()
        if not is_admin(user):
            return jsonify({"error": "Forbidden"}), 403
        data = request.json or {}
        project = Project(
            title=data["title"],
            description=data.get("description"),
            deadline=datetime.fromisoformat(data["deadline"]),
            created_by=user.id,
        )
        db.session.add(project)
        db.session.flush()
        log_action(user.id, "Created project", "Project", project.id)
        db.session.commit()
        return jsonify(serialize_project(project)), 201

    @app.put("/api/projects/<int:project_id>")
    @jwt_required()
    def update_project(project_id):
        user = current_user()
        if not is_admin(user):
            return jsonify({"error": "Forbidden"}), 403
        data = request.json or {}
        project = db.session.get(Project, project_id)
        if not project:
            return jsonify({"error": "Project not found"}), 404
        project.title = data.get("title", project.title)
        project.description = data.get("description", project.description)
        if data.get("deadline"):
            project.deadline = datetime.fromisoformat(data["deadline"])
        log_action(user.id, "Updated project", "Project", project.id)
        db.session.commit()
        return jsonify(serialize_project(project))

    @app.delete("/api/projects/<int:project_id>")
    @jwt_required()
    def delete_project(project_id):
        user = current_user()
        if not is_admin(user):
            return jsonify({"error": "Forbidden"}), 403
        project = db.session.get(Project, project_id)
        if not project:
            return jsonify({"error": "Project not found"}), 404
        Task.query.filter_by(project_id=project.id).delete()
        db.session.delete(project)
        log_action(user.id, "Deleted project", "Project", project.id)
        db.session.commit()
        return jsonify({"message": "Deleted"})

    @app.get("/api/tasks")
    @jwt_required()
    def list_tasks():
        user = current_user()
        project_id = request.args.get("project_id", type=int)
        query = Task.query
        if project_id:
            query = query.filter_by(project_id=project_id)
        if not is_admin(user):
            query = query.filter_by(assigned_to=user.id)
        status = request.args.get("status")
        priority = request.args.get("priority")
        search = request.args.get("search")
        if status:
            query = query.filter_by(status=status)
        if priority:
            query = query.filter_by(priority=priority)
        if search:
            query = query.filter(Task.title.ilike(f"%{search}%"))
        tasks = query.order_by(Task.deadline.asc()).all()
        return jsonify([serialize_task(task) for task in tasks])

    @app.post("/api/tasks")
    @jwt_required()
    def create_task():
        user = current_user()
        if not is_admin(user):
            return jsonify({"error": "Forbidden"}), 403
        data = request.json or {}
        task = Task(
            title=data["title"],
            project_id=data["project_id"],
            assigned_to=data["assigned_to"],
            status=data.get("status", "To Do"),
            priority=data.get("priority", "Medium"),
            deadline=datetime.fromisoformat(data["deadline"]),
        )
        db.session.add(task)
        db.session.flush()
        notify_user(task.assigned_to, f"You have been assigned task '{task.title}'.")
        log_action(user.id, "Created task", "Task", task.id)
        db.session.commit()
        return jsonify(serialize_task(task)), 201

    @app.put("/api/tasks/<int:task_id>")
    @jwt_required()
    def update_task(task_id):
        user = current_user()
        data = request.json or {}
        task = db.session.get(Task, task_id)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        if not is_admin(user) and task.assigned_to != user.id:
            return jsonify({"error": "Forbidden"}), 403
        if "assigned_to" in data and is_admin(user):
            task.assigned_to = data["assigned_to"]
        task.title = data.get("title", task.title)
        task.status = data.get("status", task.status)
        task.priority = data.get("priority", task.priority)
        if data.get("deadline"):
            task.deadline = datetime.fromisoformat(data["deadline"])
        notify_user(task.assigned_to, f"Task '{task.title}' updated to {task.status}.")
        log_action(user.id, "Updated task", "Task", task.id)
        db.session.commit()
        return jsonify(serialize_task(task))

    @app.post("/api/tasks/<int:task_id>/comments")
    @jwt_required()
    def add_comment(task_id):
        user = current_user()
        data = request.json or {}
        task = db.session.get(Task, task_id)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        if not is_admin(user) and task.assigned_to != user.id:
            return jsonify({"error": "Forbidden"}), 403
        comment = Comment(task_id=task_id, user_id=user.id, message=data["message"])
        db.session.add(comment)
        notify_user(task.assigned_to, f"New comment on task '{task.title}'.")
        log_action(user.id, "Commented on task", "Task", task.id)
        db.session.commit()
        return jsonify({"id": comment.id, "message": comment.message, "created_at": comment.created_at.isoformat()}), 201

    @app.get("/api/tasks/<int:task_id>/comments")
    @jwt_required()
    def list_comments(task_id):
        user = current_user()
        task = db.session.get(Task, task_id)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        if not is_admin(user) and task.assigned_to != user.id:
            return jsonify({"error": "Forbidden"}), 403
        comments = Comment.query.filter_by(task_id=task_id).order_by(Comment.created_at.desc()).all()
        return jsonify(
            [
                {
                    "id": c.id,
                    "task_id": c.task_id,
                    "user_id": c.user_id,
                    "message": c.message,
                    "created_at": c.created_at.isoformat(),
                }
                for c in comments
            ]
        )

    @app.post("/api/tasks/<int:task_id>/files")
    @jwt_required()
    def upload_file(task_id):
        user = current_user()
        task = db.session.get(Task, task_id)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        if not is_admin(user) and task.assigned_to != user.id:
            return jsonify({"error": "Forbidden"}), 403
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No file provided"}), 400
        original_name = secure_filename(file.filename or "")
        if not original_name:
            return jsonify({"error": "Invalid filename"}), 400
        safe_name = f"{int(datetime.now().timestamp())}_{original_name}"
        path = Path(app.config["UPLOAD_FOLDER"]) / safe_name
        file.save(path)
        record = File(task_id=task_id, file_path=safe_name, uploaded_by=user.id)
        db.session.add(record)
        db.session.commit()
        return jsonify({"id": record.id, "file_path": record.file_path, "download_url": f"/api/files/{record.file_path}"}), 201

    @app.get("/api/tasks/<int:task_id>/files")
    @jwt_required()
    def list_files(task_id):
        user = current_user()
        task = db.session.get(Task, task_id)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        if not is_admin(user) and task.assigned_to != user.id:
            return jsonify({"error": "Forbidden"}), 403
        files = File.query.filter_by(task_id=task_id).all()
        return jsonify(
            [{"id": f.id, "task_id": f.task_id, "file_path": f.file_path, "download_url": f"/api/files/{f.file_path}"} for f in files]
        )

    @app.get("/api/files/<path:filename>")
    def get_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    @app.get("/api/notifications")
    @jwt_required()
    def list_notifications():
        user = current_user()
        notifications = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(20).all()
        return jsonify(
            [{"id": n.id, "message": n.message, "is_read": n.is_read, "created_at": n.created_at.isoformat()} for n in notifications]
        )

    @app.put("/api/notifications/<int:notification_id>/read")
    @jwt_required()
    def mark_read(notification_id):
        user = current_user()
        notification = db.session.get(Notification, notification_id)
        if not notification or notification.user_id != user.id:
            return jsonify({"error": "Not found"}), 404
        notification.is_read = True
        db.session.commit()
        return jsonify({"message": "Marked as read"})

    @app.get("/api/activity")
    @jwt_required()
    def activity():
        user = current_user()
        if not is_admin(user):
            return jsonify({"error": "Forbidden"}), 403
        logs = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(50).all()
        return jsonify(
            [
                {
                    "id": log.id,
                    "user_id": log.user_id,
                    "action": log.action,
                    "entity_type": log.entity_type,
                    "entity_id": log.entity_id,
                    "created_at": log.created_at.isoformat(),
                }
                for log in logs
            ]
        )

    @app.get("/api/analytics/admin")
    @jwt_required()
    def analytics_admin():
        user = current_user()
        if not is_admin(user):
            return jsonify({"error": "Forbidden"}), 403
        total_projects = Project.query.count()
        total_tasks = Task.query.count()
        completed_tasks = Task.query.filter_by(status="Completed").count()
        in_progress_tasks = Task.query.filter_by(status="In Progress").count()
        todo_tasks = Task.query.filter_by(status="To Do").count()
        user_performance = (
            db.session.query(
                User.name,
                func.count(Task.id).label("total"),
                func.sum(case((Task.status == "Completed", 1), else_=0)).label("completed"),
            )
            .join(Task, Task.assigned_to == User.id, isouter=True)
            .group_by(User.id)
            .all()
        )
        return jsonify(
            {
                "totals": {
                    "projects": total_projects,
                    "tasks": total_tasks,
                    "completed": completed_tasks,
                    "in_progress": in_progress_tasks,
                    "todo": todo_tasks,
                },
                "user_performance": [
                    {"name": name, "total": total or 0, "completed": completed or 0} for name, total, completed in user_performance
                ],
            }
        )

    @app.get("/api/analytics/user")
    @jwt_required()
    def analytics_user():
        user = current_user()
        total = Task.query.filter_by(assigned_to=user.id).count()
        completed = Task.query.filter_by(assigned_to=user.id, status="Completed").count()
        pending = total - completed
        return jsonify({"total": total, "completed": completed, "pending": pending})

    @app.get("/api/prediction/project/<int:project_id>")
    @jwt_required()
    def prediction(project_id):
        project = db.session.get(Project, project_id)
        if not project:
            return jsonify({"error": "Project not found"}), 404
        return jsonify(predict_delay(project))

    @app.post("/api/dev/seed")
    def manual_seed():
        seed_if_empty(force=True)
        return jsonify({"message": "Seeded successfully"})

    @app.get("/")
    def serve_spa_root():
        index_file = Path(app.config["FRONTEND_DIST"]) / "index.html"
        if index_file.exists():
            return app.send_static_file("index.html")
        return jsonify(
            {
                "message": "Frontend build not found. Run 'npm run build' inside frontend folder.",
                "frontend_dist": str(app.config["FRONTEND_DIST"]),
            }
        ), 503

    @app.get("/<path:path>")
    def serve_spa(path):
        if path.startswith("api/") or path.startswith("uploads/"):
            return jsonify({"error": "Not found"}), 404
        static_file = Path(app.config["FRONTEND_DIST"]) / path
        if static_file.exists() and static_file.is_file():
            return send_from_directory(app.static_folder, path)
        index_file = Path(app.config["FRONTEND_DIST"]) / "index.html"
        if index_file.exists():
            return app.send_static_file("index.html")
        return jsonify(
            {
                "message": "Frontend build not found. Run 'npm run build' inside frontend folder.",
                "frontend_dist": str(app.config["FRONTEND_DIST"]),
            }
        ), 503


def seed_if_empty(force=False):
    if not force and User.query.count() > 0:
        return

    if force:
        ActivityLog.query.delete()
        Notification.query.delete()
        File.query.delete()
        Comment.query.delete()
        Task.query.delete()
        Project.query.delete()
        User.query.delete()
        db.session.commit()

    admin = User(
        name="Admin One",
        email="admin@example.com",
        role="Admin",
        password=bcrypt.generate_password_hash("admin123").decode("utf-8"),
    )
    user_a = User(
        name="User Alpha",
        email="user@example.com",
        role="User",
        password=bcrypt.generate_password_hash("user123").decode("utf-8"),
    )
    user_b = User(
        name="User Beta",
        email="beta@example.com",
        role="User",
        password=bcrypt.generate_password_hash("user123").decode("utf-8"),
    )
    db.session.add_all([admin, user_a, user_b])
    db.session.flush()

    project_1 = Project(
        title="Website Revamp",
        description="Redesign landing and dashboard modules",
        deadline=datetime(2026, 4, 30),
        created_by=admin.id,
    )
    project_2 = Project(
        title="Mobile App MVP",
        description="Ship MVP with auth and notifications",
        deadline=datetime(2026, 5, 12),
        created_by=admin.id,
    )
    db.session.add_all([project_1, project_2])
    db.session.flush()

    tasks = [
        Task(title="Create wireframes", project_id=project_1.id, assigned_to=user_a.id, status="Completed", priority="High", deadline=datetime(2026, 4, 10)),
        Task(title="Implement API integration", project_id=project_1.id, assigned_to=user_b.id, status="In Progress", priority="High", deadline=datetime(2026, 4, 15)),
        Task(title="Authentication flow", project_id=project_2.id, assigned_to=user_a.id, status="To Do", priority="Medium", deadline=datetime(2026, 4, 20)),
        Task(title="Push notifications", project_id=project_2.id, assigned_to=user_b.id, status="To Do", priority="Low", deadline=datetime(2026, 4, 25)),
    ]
    db.session.add_all(tasks)
    db.session.flush()

    db.session.add(Comment(task_id=tasks[1].id, user_id=user_a.id, message="API docs are ready."))
    db.session.add(Notification(user_id=user_a.id, message="Welcome to Project Management System"))
    db.session.add(Notification(user_id=user_b.id, message="You have 2 pending tasks"))
    db.session.add(ActivityLog(user_id=admin.id, action="Initialized demo data", entity_type="System", entity_id=0))
    db.session.commit()


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5001)
