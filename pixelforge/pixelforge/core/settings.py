"""Settings model for pixelforge providers.

This is the single source of truth for every config knob. Providers read from
``PixelforgeSettings`` (loaded from environment / .env / programmatic args);
the FastAPI ``/api/settings`` endpoint surfaces a sanitized public view.

The fields are deliberately similar to the original ImageLayerAgent settings
schema so Phase 4 (API layer migration) can reuse the same .env files.
"""
from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# ── Nested sub-configs ────────────────────────────────────────────────

class OpenAIConfig(BaseModel):
    api_key: str = ""
    base_url: str = "https://api.openai.com/v1"
    request_timeout: int = 120

    vision_plan_enabled: bool = True
    vision_model: str = "gpt-4.1-mini"
    agent_model: str = "gpt-4.1-mini"
    api_mode: Literal["chat_completions", "responses"] = "responses"

    image_edit_enabled: bool = False
    image_model: str = "gpt-image-2"
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
    provider: Literal["openai_images", "custom_http", "none"] = "openai_images"
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

    openai: OpenAIConfig = Field(default_factory=OpenAIConfig)
    paddleocr: PaddleOCRConfig = Field(default_factory=PaddleOCRConfig)
    image_edit: ImageEditConfig = Field(default_factory=ImageEditConfig)
    sam: SAMConfig = Field(default_factory=SAMConfig)
    sam2: SAM2Config = Field(default_factory=SAM2Config)
    schp: SCHPConfig = Field(default_factory=SCHPConfig)
    repair: RepairConfig = Field(default_factory=RepairConfig)

    # ── Backwards-compat aliases (Phase 4 reads the old ILA env names) ──
    # ILA used top-level env names like PADDLEOCR_ACCESS_TOKEN; we accept
    # those too and copy them into the nested config in __init__.

    def __init__(self, **data: object) -> None:  # type: ignore[override]
        # Alias mapping: top-level ILA env name -> nested field path
        aliases: dict[str, tuple[str, ...]] = {
            "OPENAI_API_KEY": ("openai", "api_key"),
            "OPENAI_BASE_URL": ("openai", "base_url"),
            "OPENAI_MODEL": ("openai", "agent_model"),
            "OPENAI_API_MODE": ("openai", "api_mode"),
            "OPENAI_VISION_PLAN_ENABLED": ("openai", "vision_plan_enabled"),
            "OPENAI_VISION_MODEL": ("openai", "vision_model"),
            "OPENAI_REQUEST_TIMEOUT": ("openai", "request_timeout"),
            "OPENAI_IMAGE_EDIT_ENABLED": ("openai", "image_edit_enabled"),
            "OPENAI_IMAGE_MODEL": ("openai", "image_model"),
            "OPENAI_IMAGE_QUALITY": ("openai", "image_quality"),
            "PADDLEOCR_ACCESS_TOKEN": ("paddleocr", "access_token"),
            "PADDLEOCR_BASE_URL": ("paddleocr", "base_url"),
            "PADDLEOCR_MODEL": ("paddleocr", "model"),
            "PADDLEOCR_PROMPT": ("paddleocr", "prompt"),
            "PADDLEOCR_REQUEST_TIMEOUT": ("paddleocr", "request_timeout"),
            "PADDLEOCR_POLL_TIMEOUT": ("paddleocr", "poll_timeout"),
            "IMAGE_EDIT_PROVIDER": ("image_edit", "provider"),
            "CUSTOM_IMAGE_EDIT_ENDPOINT": ("image_edit", "custom", "endpoint"),
            "CUSTOM_IMAGE_EDIT_API_KEY": ("image_edit", "custom", "api_key"),
            "CUSTOM_IMAGE_EDIT_MODEL": ("image_edit", "custom", "model"),
            "SAM_CHECKPOINT": ("sam", "checkpoint"),
            "SAM_MODEL_TYPE": ("sam", "model_type"),
            "SAM_DEVICE": ("sam", "device"),
            "SAM2_CHECKPOINT": ("sam2", "checkpoint"),
            "SAM2_MODEL_TYPE": ("sam2", "model_type"),
            "SAM2_DEVICE": ("sam2", "device"),
            "SCHP_CHECKPOINT": ("schp", "checkpoint"),
            "SCHP_DEVICE": ("schp", "device"),
            "REPAIR_PROVIDER": ("repair", "provider"),
            "REPAIR_ENDPOINT": ("repair", "endpoint"),
            "REPAIR_API_KEY": ("repair", "api_key"),
            "PIXELFORGE_OUTPUT_DIR": ("output_dir",),
            "PIXELFORGE_PORT": ("port",),
            "PIXELFORGE_LOG_LEVEL": ("log_level",),
        }
        # Apply aliases if the user provided the flat form
        for env_name, path in aliases.items():
            if env_name not in data:
                continue
            value = data.pop(env_name)
            # walk into nested config
            target: object = self
            for key in path[:-1]:
                target = getattr(target, key)
            key = path[-1]
            # respect explicit nested override
            if key in data:
                continue
            data[key] = value
        super().__init__(**data)
