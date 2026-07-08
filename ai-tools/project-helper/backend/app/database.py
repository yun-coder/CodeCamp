from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import json
import sqlite3
from typing import Any, Iterator

from .config import get_settings


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_db() -> None:
    settings = get_settings()
    settings.ensure_dirs()
    with sqlite3.connect(settings.sqlite_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                repo_url TEXT NOT NULL,
                repo_key TEXT NOT NULL UNIQUE,
                repo_name TEXT NOT NULL,
                local_path TEXT NOT NULL,
                status TEXT NOT NULL,
                report_md TEXT,
                summary_json TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(project_id) REFERENCES projects(id)
            )
            """
        )
        conn.commit()


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    settings = get_settings()
    conn = sqlite3.connect(settings.sqlite_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    data = dict(row)
    if data.get("summary_json"):
        data["summary"] = json.loads(data["summary_json"])
    else:
        data["summary"] = None
    return data


def find_project_by_key(repo_key: str) -> dict[str, Any] | None:
    with db() as conn:
        row = conn.execute("SELECT * FROM projects WHERE repo_key = ?", (repo_key,)).fetchone()
    return row_to_dict(row)


def find_project(project_id: int) -> dict[str, Any] | None:
    with db() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    return row_to_dict(row)


def list_projects() -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM projects ORDER BY updated_at DESC LIMIT 30"
        ).fetchall()
    return [row_to_dict(row) for row in rows if row is not None]


def delete_project(project_id: int) -> dict[str, Any] | None:
    with db() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if row is None:
            return None
        conn.execute("DELETE FROM chats WHERE project_id = ?", (project_id,))
        conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    return row_to_dict(row)


def create_or_update_project(
    *,
    repo_url: str,
    repo_key: str,
    repo_name: str,
    local_path: Path,
    status: str,
) -> int:
    now = utc_now()
    with db() as conn:
        existing = conn.execute("SELECT id FROM projects WHERE repo_key = ?", (repo_key,)).fetchone()
        if existing:
            if status == "analyzing":
                conn.execute(
                    """
                    UPDATE projects
                    SET repo_url = ?, repo_name = ?, local_path = ?, status = ?,
                        report_md = NULL, summary_json = NULL, updated_at = ?
                    WHERE repo_key = ?
                    """,
                    (repo_url, repo_name, str(local_path), status, now, repo_key),
                )
            else:
                conn.execute(
                    """
                    UPDATE projects
                    SET repo_url = ?, repo_name = ?, local_path = ?, status = ?, updated_at = ?
                    WHERE repo_key = ?
                    """,
                    (repo_url, repo_name, str(local_path), status, now, repo_key),
                )
            return int(existing["id"])
        cursor = conn.execute(
            """
            INSERT INTO projects
                (repo_url, repo_key, repo_name, local_path, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (repo_url, repo_key, repo_name, str(local_path), status, now, now),
        )
        return int(cursor.lastrowid)


def save_report(project_id: int, report_md: str, summary: dict[str, Any]) -> None:
    with db() as conn:
        conn.execute(
            """
            UPDATE projects
            SET report_md = ?, summary_json = ?, status = 'ready', updated_at = ?
            WHERE id = ?
            """,
            (report_md, json.dumps(summary, ensure_ascii=False), utc_now(), project_id),
        )


def mark_failed(project_id: int, message: str) -> None:
    with db() as conn:
        conn.execute(
            "UPDATE projects SET status = ?, updated_at = ? WHERE id = ?",
            (f"failed: {message[:500]}", utc_now(), project_id),
        )


def save_chat(project_id: int, question: str, answer: str) -> None:
    with db() as conn:
        conn.execute(
            "INSERT INTO chats (project_id, question, answer, created_at) VALUES (?, ?, ?, ?)",
            (project_id, question, answer, utc_now()),
        )
