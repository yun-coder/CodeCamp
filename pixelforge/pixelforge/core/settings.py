"""Settings model for pixelforge providers.

This is the single source of truth for every config knob. Providers read from
``PixelforgeSettings`` (loaded from environment / .env / programmatic args).

Because pydantic-settings v2 does not automatically route flat env vars
(MINIMAX_API_KEY, PADDLEOCR_ACCESS_TOKEN, …) into nested model fields
(MiniMaxConfig.api_key, PaddleOCRConfig.access_token, …) when using
``env_file=".env"``, we override ``__init__`` to pre-build all sub-configs
from environment variables before passing them to the parent.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# ── Nested sub-configs ───────────────────────────────────────────────

class MiniMaxConfig(BaseModel):
    """MiniMax API 配置 — VLM 视觉规划 + 图片编辑共用."""

    api_key: str = ""           # MiniMax API 密钥
    base_url: str = "https://api.minimax.chat/v1"  # 默认 MiniMax API 地址
    request_timeout: int = 120

    vision_plan_enabled: bool = True
    vision_model: str = "MiniMax-VL-01"   # MiniMax 视觉理解模型
    api_mode: Literal["chat_completions", "responses"] = "chat_completions"

    image_edit_enabled: bool = False
    image_model: str = "image-01"          # MiniMax 图片生成模型
    image_quality: Literal["low", "medium", "high", "auto"] = "medium"


class PaddleOCRConfig(BaseModel):
    enabled: bool = True
    access_token: str = ""
    base_url: str = "https://paddleocr.aistudio-app.com"
    model: str = "PaddleOCR-VL-1.6"
    prompt: str = ""
    request_timeout: int = 60
    poll_timeout: int = 300
    use_doc_orientation_classify: bool = False
    use_doc_unwarping: bool = False
    use_chart_recognition: bool = False


class CustomImageEditConfig(BaseModel):
    endpoint: str = ""
    api_key: str = ""
    model: str = ""


class ImageEditConfig(BaseModel):
    provider: Literal["minimax_images", "custom_http", "none"] = "minimax_images"
    custom: CustomImageEditConfig = Field(default_factory=CustomImageEditConfig)


class SAMConfig(BaseModel):
    checkpoint: str = "./checkpoints/sam_vit_b_01ec64.pth"
    model_type: Literal["vit_b", "vit_l", "vit_h", "default"] = "vit_b"
    device: Literal["cpu", "cuda"] = "cpu"


class SAM2Config(BaseModel):
    checkpoint: str = "./checkpoints/sam2.1_hiera_small.pt"
    model_type: str = "sam2.1_hiera_small"
    device: Literal["cpu", "cuda"] = "cpu"


class SCHPConfig(BaseModel):
    checkpoint: str = "./checkpoints/exp-schp-201908261155-lip.pth"
    device: Literal["cpu", "cuda"] = "cpu"


class RepairConfig(BaseModel):
    provider: Literal["opencv_convex_hull", "custom_http", "none"] = "opencv_convex_hull"
    endpoint: str = ""
    api_key: str = ""


# ── Root settings ────────────────────────────────────────────────────

class PixelforgeSettings(BaseSettings):
    """Top-level settings, loaded from environment / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        extra="ignore",
    )

    output_dir: Path = Path("./pixelforge_runs")
    port: int = 8700
    log_level: str = "INFO"

    minimax: MiniMaxConfig = Field(default_factory=MiniMaxConfig)
    paddleocr: PaddleOCRConfig = Field(default_factory=PaddleOCRConfig)
    image_edit: ImageEditConfig = Field(default_factory=ImageEditConfig)
    sam: SAMConfig = Field(default_factory=SAMConfig)
    sam2: SAM2Config = Field(default_factory=SAM2Config)
    schp: SCHPConfig = Field(default_factory=SCHPConfig)
    repair: RepairConfig = Field(default_factory=RepairConfig)

    def __init__(self, **data: object) -> None:  # type: ignore[override]
        # Let pydantic-settings consume .env first (fills base fields: output_dir, port, etc.)
        super().__init__(**data)

        # Read .env file directly — pydantic-settings keeps its env values internal,
        # so we parse the file ourselves and override the sub-configs.
        env_path = Path(self.model_config.get("env_file", ".env"))
        if not env_path.is_absolute():
            env_path = Path.cwd() / env_path

        flat_vars: dict[str, str] = {}
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                # Strip inline comments (e.g.  "VAR=value  # comment")
                if "#" in line:
                    line = line[: line.index("#")].strip()
                if "=" in line:
                    k, _, v = line.partition("=")
                    flat_vars[k.strip()] = v.strip()

        def _e(name: str, default: str = "") -> str:
            return flat_vars.get(name, os.environ.get(name, default))

        def _ei(name: str, default: int = 0) -> int:
            v = _e(name)
            try:
                return int(v)
            except (ValueError, TypeError):
                return default

        def _eb(name: str, default: bool = False) -> bool:
            v = _e(name)
            return v.lower() in ("1", "true", "yes") if v else default

        # ── Override sub-configs from flat .env vars ──
        self.minimax = MiniMaxConfig(
            api_key=_e("MINIMAX_API_KEY"),
            base_url=_e("MINIMAX_BASE_URL", "https://api.minimax.chat/v1"),
            request_timeout=_ei("MINIMAX_REQUEST_TIMEOUT", 120),
            vision_plan_enabled=_eb("MINIMAX_VISION_PLAN_ENABLED", True),
            vision_model=_e("MINIMAX_VISION_MODEL", "MiniMax-VL-01"),
            api_mode=_e("MINIMAX_API_MODE") or "chat_completions",
            image_edit_enabled=_eb("MINIMAX_IMAGE_EDIT_ENABLED"),
            image_model=_e("MINIMAX_IMAGE_MODEL", "image-01"),
            image_quality=_e("MINIMAX_IMAGE_QUALITY", "medium"),
        )
        self.paddleocr = PaddleOCRConfig(
            enabled=True,
            access_token=_e("PADDLEOCR_ACCESS_TOKEN"),
            base_url=_e("PADDLEOCR_BASE_URL", "https://paddleocr.aistudio-app.com"),
            model=_e("PADDLEOCR_MODEL", "PaddleOCR-VL-1.6"),
            prompt=_e("PADDLEOCR_PROMPT"),
            request_timeout=_ei("PADDLEOCR_REQUEST_TIMEOUT", 60),
            poll_timeout=_ei("PADDLEOCR_POLL_TIMEOUT", 300),
        )
        self.image_edit = ImageEditConfig(
            provider=_e("IMAGE_EDIT_PROVIDER", "minimax_images"),
            custom=CustomImageEditConfig(
                endpoint=_e("CUSTOM_IMAGE_EDIT_ENDPOINT"),
                api_key=_e("CUSTOM_IMAGE_EDIT_API_KEY"),
                model=_e("CUSTOM_IMAGE_EDIT_MODEL"),
            ),
        )
        self.sam = SAMConfig(
            checkpoint=_e("SAM_CHECKPOINT", "./checkpoints/sam_vit_b_01ec64.pth"),
            model_type=_e("SAM_MODEL_TYPE", "vit_b"),
            device=_e("SAM_DEVICE", "cpu"),
        )
        self.sam2 = SAM2Config(
            checkpoint=_e("SAM2_CHECKPOINT", "./checkpoints/sam2.1_hiera_small.pt"),
            model_type=_e("SAM2_MODEL_TYPE", "sam2.1_hiera_small"),
            device=_e("SAM2_DEVICE", "cpu"),
        )
        self.schp = SCHPConfig(
            checkpoint=_e("SCHP_CHECKPOINT", "./checkpoints/exp-schp-201908261155-lip.pth"),
            device=_e("SCHP_DEVICE", "cpu"),
        )
        self.repair = RepairConfig(
            provider=_e("REPAIR_PROVIDER", "opencv_convex_hull"),
            endpoint=_e("REPAIR_ENDPOINT"),
            api_key=_e("REPAIR_API_KEY"),
        )
