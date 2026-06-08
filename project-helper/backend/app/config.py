from functools import lru_cache
from pathlib import Path
import os

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR / "backend" / ".env")


def env_path(name: str, default: Path) -> Path:
    raw = os.getenv(name)
    if not raw:
        return default
    path = Path(raw)
    return path if path.is_absolute() else ROOT_DIR / path


class Settings:
    app_name: str = "project-helper"
    data_dir: Path = env_path("PROJECT_HELPER_DATA_DIR", ROOT_DIR / "backend" / "runtime-data")
    sqlite_path: Path = env_path("PROJECT_HELPER_SQLITE", data_dir / "project_helper.db")
    repo_dir: Path = env_path("PROJECT_HELPER_REPO_DIR", data_dir / "repos")
    deepseek_api_key: str = os.getenv("DEEPSEEK_API_KEY", "")
    deepseek_base_url: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    deepseek_model: str = os.getenv("DEEPSEEK_MODEL", "deepseek-v4")
    deepseek_timeout: float = float(os.getenv("DEEPSEEK_TIMEOUT", "180"))
    deepseek_max_retries: int = int(os.getenv("DEEPSEEK_MAX_RETRIES", "1"))
    deepseek_max_tokens: int = int(os.getenv("DEEPSEEK_MAX_TOKENS", "6000"))
    max_files: int = int(os.getenv("PROJECT_HELPER_MAX_FILES", "450"))
    max_file_bytes: int = int(os.getenv("PROJECT_HELPER_MAX_FILE_BYTES", "60000"))
    report_context_chars: int = int(os.getenv("PROJECT_HELPER_REPORT_CONTEXT_CHARS", "22000"))
    report_key_files: int = int(os.getenv("PROJECT_HELPER_REPORT_KEY_FILES", "10"))
    report_key_file_chars: int = int(os.getenv("PROJECT_HELPER_REPORT_KEY_FILE_CHARS", "1600"))

    def ensure_dirs(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.repo_dir.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
