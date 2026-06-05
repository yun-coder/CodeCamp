from __future__ import annotations

import json
import os
from pathlib import Path

from app.models import ThirdPartySettings, ThirdPartySettingsPublic, ThirdPartySettingsUpdate
from app.services.local_env import env_value


class SettingsStore:
    def __init__(self, path: str | os.PathLike[str] | None = None) -> None:
        data_root = Path(env_value("ILA_DATA_DIR", default="runs") or "runs").resolve()
        self.path = Path(path).resolve() if path else data_root / "settings.json"
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def load(self) -> ThirdPartySettings:
        settings = self._env_defaults()
        if not self.path.exists():
            return settings
        data = json.loads(self.path.read_text(encoding="utf-8"))
        stored = ThirdPartySettings.model_validate(data)
        return settings.model_copy(update=stored.model_dump(exclude_unset=True))

    def save(self, update: ThirdPartySettingsUpdate) -> ThirdPartySettings:
        current = self.load()
        data = update.model_dump(
            exclude={
                "clear_paddleocr_access_token",
                "clear_openai_api_key",
                "clear_custom_image_edit_api_key",
            }
        )
        if update.clear_paddleocr_access_token:
            data["paddleocr_access_token"] = None
        elif not data.get("paddleocr_access_token"):
            data["paddleocr_access_token"] = current.paddleocr_access_token
        if update.clear_openai_api_key:
            data["openai_api_key"] = None
        elif not data.get("openai_api_key"):
            data["openai_api_key"] = current.openai_api_key
        if update.clear_custom_image_edit_api_key:
            data["custom_image_edit_api_key"] = None
        elif not data.get("custom_image_edit_api_key"):
            data["custom_image_edit_api_key"] = current.custom_image_edit_api_key
        settings = ThirdPartySettings.model_validate(data)
        self.path.write_text(settings.model_dump_json(indent=2), encoding="utf-8")
        return settings

    def public(self) -> ThirdPartySettingsPublic:
        settings = self.load()
        return ThirdPartySettingsPublic(
            **settings.model_dump(exclude={"paddleocr_access_token", "openai_api_key", "custom_image_edit_api_key"}),
            paddleocr_access_token_configured=bool(settings.paddleocr_access_token),
            openai_api_key_configured=bool(settings.openai_api_key),
            custom_image_edit_api_key_configured=bool(settings.custom_image_edit_api_key),
        )

    def _env_defaults(self) -> ThirdPartySettings:
        ocr_provider = (env_value("ILA_OCR_PROVIDER", default="paddleocr_cloud") or "paddleocr_cloud").strip().lower()
        if ocr_provider in {"auto", "paddle", "paddleocr", "paddleocr_local", "tesseract"}:
            ocr_provider = "paddleocr_cloud"
        image_edit_provider = (
            env_value("IMAGE_EDIT_PROVIDER", "OPENAI_IMAGE_EDIT_PROVIDER", default="openai_images") or "openai_images"
        ).strip().lower()
        if image_edit_provider in {"openai", "images", "openai_image", "openai_images"}:
            image_edit_provider = "openai_images"
        elif image_edit_provider in {"custom", "http", "custom_http", "flux", "flux_kontext"}:
            image_edit_provider = "custom_http"
        elif image_edit_provider in {"none", "off", "disabled", "disable"}:
            image_edit_provider = "none"
        else:
            image_edit_provider = "openai_images"
        return ThirdPartySettings(
            ocr_provider=ocr_provider,
            paddleocr_access_token=env_value("PADDLEOCR_ACCESS_TOKEN") or None,
            paddleocr_base_url=env_value("PADDLEOCR_BASE_URL", default="https://paddleocr.aistudio-app.com")
            or "https://paddleocr.aistudio-app.com",
            paddleocr_model=env_value("PADDLEOCR_MODEL", default="PaddleOCR-VL-1.6") or "PaddleOCR-VL-1.6",
            paddleocr_request_timeout=float(env_value("PADDLEOCR_REQUEST_TIMEOUT", default="300") or "300"),
            paddleocr_poll_timeout=float(env_value("PADDLEOCR_POLL_TIMEOUT", default="600") or "600"),
            paddleocr_use_doc_orientation_classify=(
                env_value("PADDLEOCR_USE_DOC_ORIENTATION_CLASSIFY", default="False") or "False"
            ).lower()
            in {"true", "1", "yes"},
            paddleocr_use_doc_unwarping=(env_value("PADDLEOCR_USE_DOC_UNWARPING", default="False") or "False").lower()
            in {"true", "1", "yes"},
            paddleocr_use_chart_recognition=(
                env_value("PADDLEOCR_USE_CHART_RECOGNITION", default="False") or "False"
            ).lower()
            in {"true", "1", "yes"},
            paddleocr_prompt=env_value("PADDLEOCR_PROMPT") or None,
            sam2_enabled=(env_value("ILA_ENABLE_SAM2", default="0") or "0") in {"1", "true", "True"},
            sam2_model_cfg=env_value("SAM2_MODEL_CFG") or None,
            sam2_checkpoint=env_value("SAM2_CHECKPOINT", "SAM2_MODEL_PATH") or None,
            openai_api_key=env_value("OPENAI_API_KEY") or None,
            openai_base_url=env_value(
                "OPENAI_BASE_URL",
                "OPENAI_API_BASE",
                "OPENAI_API_BASE_URL",
                default="https://api.openai.com/v1",
            )
            or "https://api.openai.com/v1",
            openai_model=env_value("OPENAI_AGENT_MODEL", "OPENAI_MODEL", default="gpt-4.1-mini") or "gpt-4.1-mini",
            openai_api_mode=env_value("OPENAI_API_MODE", default="chat_completions") or "chat_completions",
            openai_request_timeout=float(env_value("OPENAI_REQUEST_TIMEOUT", default="120") or "120"),
            openai_vision_plan_enabled=(env_value("OPENAI_VISION_PLAN_ENABLED", default="1") or "1").lower()
            in {"1", "true", "yes"},
            openai_vision_model=env_value("OPENAI_VISION_MODEL") or None,
            openai_image_edit_enabled=(env_value("OPENAI_IMAGE_EDIT_ENABLED", default="1") or "1").lower()
            in {"1", "true", "yes"},
            image_edit_provider=image_edit_provider,
            openai_image_model=env_value("OPENAI_IMAGE_MODEL", default="gpt-image-2") or "gpt-image-2",
            openai_image_quality=env_value("OPENAI_IMAGE_QUALITY", default="medium") or "medium",
            custom_image_edit_endpoint=env_value(
                "CUSTOM_IMAGE_EDIT_ENDPOINT",
                "IMAGE_EDIT_ENDPOINT",
                "FLUX_KONTEXT_ENDPOINT",
            )
            or None,
            custom_image_edit_api_key=env_value(
                "CUSTOM_IMAGE_EDIT_API_KEY",
                "IMAGE_EDIT_API_KEY",
                "FAL_KEY",
                "REPLICATE_API_TOKEN",
            )
            or None,
            custom_image_edit_model=env_value("CUSTOM_IMAGE_EDIT_MODEL", "IMAGE_EDIT_MODEL") or None,
            qwen_vl_endpoint=env_value("QWEN_VL_ENDPOINT") or None,
            flux_kontext_endpoint=env_value("FLUX_KONTEXT_ENDPOINT") or None,
        )
