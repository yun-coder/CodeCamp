from pathlib import Path

from app.analyzer import analyze_repository, fallback_report


def test_analyzer_detects_python_project(tmp_path: Path):
    (tmp_path / "README.md").write_text("# Demo\nA tiny project", encoding="utf-8")
    (tmp_path / "requirements.txt").write_text("fastapi\nlangchain-openai\n", encoding="utf-8")
    (tmp_path / "app.py").write_text("from fastapi import FastAPI\napp = FastAPI()\n", encoding="utf-8")

    summary = analyze_repository(tmp_path)
    report = fallback_report("demo/repo", summary)

    assert summary["file_count"] == 3
    assert summary["languages"]["Python"] == 1
    assert "fastapi" in report
    assert "目录结构" in report


def test_analyzer_includes_common_extensionless_text_files(tmp_path: Path):
    (tmp_path / "README").write_text("hello from a no-extension readme\n", encoding="utf-8")

    summary = analyze_repository(tmp_path)

    assert summary["file_count"] == 1
    assert summary["total_lines"] >= 1
    assert summary["key_files"][0]["path"] == "README"
