from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


LayerType = Literal[
    "background",
    "background_clean",
    "human",
    "product",
    "product_clean",
    "product_reconstruct",
    "upper_clothes",
    "lower_clothes",
    "dress",
    "text",
    "decor",
    "face_hair",
    "skin",
    "shadow",
    "unknown",
]


class BBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class LayerAttributes(BaseModel):
    label: str | None = None
    confidence: float | None = None
    notes: str | None = None
    extra: dict[str, Any] = Field(default_factory=dict)


class ImageLayer(BaseModel):
    id: str
    name: str
    type: LayerType
    bbox: BBox
    order: int
    visible: bool = True
    locked: bool = False
    asset_url: str | None = None
    mask_url: str | None = None
    attributes: LayerAttributes = Field(default_factory=LayerAttributes)


class ImageManifest(BaseModel):
    project_id: str
    source_url: str
    width: int
    height: int
    analyzer_version: str
    stage: str = "stage-3-ecommerce-layering"
    summary: str | None = None
    layers: list[ImageLayer]
    warnings: list[str] = Field(default_factory=list)


class UploadResponse(BaseModel):
    project_id: str
    source_url: str


class ProductUploadResponse(BaseModel):
    project_id: str
    product_url: str


class AnalyzeResponse(BaseModel):
    manifest: ImageManifest


class ReplacementManifest(BaseModel):
    project_id: str
    scene_url: str
    product_url: str | None = None
    background_clean_url: str | None = None
    target_bbox: BBox | None = None
    target_mask_url: str | None = None
    target_regions: list["ReplacementTargetRegion"] = Field(default_factory=list)
    product_cutout_url: str | None = None
    foreground_overlay_url: str | None = None
    model_plan_url: str | None = None
    result_url: str | None = None
    style_summary: str | None = None
    warnings: list[str] = Field(default_factory=list)


class ReplacementTargetRegion(BaseModel):
    id: str
    label: str
    bbox: BBox
    source: str
    mask_url: str | None = None


class ReplacementAnalyzeResponse(BaseModel):
    manifest: ImageManifest
    replacement: ReplacementManifest


class LayerTransform(BaseModel):
    id: str
    visible: bool = True
    x: int | None = None
    y: int | None = None
    order: int | None = None


class ComposeRequest(BaseModel):
    layers: list[LayerTransform]
    transparent_background: bool = False


class ComposeResponse(BaseModel):
    output_url: str


class ReplacementComposeResponse(BaseModel):
    replacement: ReplacementManifest


OCRProviderName = Literal["paddleocr_cloud", "none"]
OpenAIAPIMode = Literal["responses", "chat_completions", "auto"]
OpenAIImageQuality = Literal["low", "medium", "high", "auto"]
ImageEditProviderName = Literal["openai_images", "custom_http", "none"]


class ThirdPartySettings(BaseModel):
    ocr_provider: OCRProviderName = "paddleocr_cloud"
    paddleocr_access_token: str | None = None
    paddleocr_base_url: str = "https://paddleocr.aistudio-app.com"
    paddleocr_model: str = "PaddleOCR-VL-1.6"
    paddleocr_request_timeout: float = 300.0
    paddleocr_poll_timeout: float = 600.0
    paddleocr_use_doc_orientation_classify: bool = False
    paddleocr_use_doc_unwarping: bool = False
    paddleocr_use_chart_recognition: bool = False
    paddleocr_prompt: str | None = None
    sam2_enabled: bool = False
    sam2_model_cfg: str | None = None
    sam2_checkpoint: str | None = None
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4.1-mini"
    openai_api_mode: OpenAIAPIMode = "chat_completions"
    openai_request_timeout: float = 120.0
    openai_vision_plan_enabled: bool = True
    openai_vision_model: str | None = None
    openai_image_edit_enabled: bool = True
    image_edit_provider: ImageEditProviderName = "openai_images"
    openai_image_model: str = "gpt-image-2"
    openai_image_quality: OpenAIImageQuality = "medium"
    custom_image_edit_endpoint: str | None = None
    custom_image_edit_api_key: str | None = None
    custom_image_edit_model: str | None = None
    qwen_vl_endpoint: str | None = None
    flux_kontext_endpoint: str | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_legacy_ocr_provider(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data
        provider = str(data.get("ocr_provider") or "paddleocr_cloud").strip().lower()
        if provider in {"auto", "paddle", "paddleocr", "paddleocr_local", "tesseract"}:
            data = {**data, "ocr_provider": "paddleocr_cloud"}
        return data


class ThirdPartySettingsUpdate(ThirdPartySettings):
    clear_paddleocr_access_token: bool = False
    clear_openai_api_key: bool = False
    clear_custom_image_edit_api_key: bool = False


class ThirdPartySettingsPublic(BaseModel):
    ocr_provider: OCRProviderName
    paddleocr_access_token_configured: bool
    paddleocr_base_url: str
    paddleocr_model: str
    paddleocr_request_timeout: float
    paddleocr_poll_timeout: float
    paddleocr_use_doc_orientation_classify: bool
    paddleocr_use_doc_unwarping: bool
    paddleocr_use_chart_recognition: bool
    paddleocr_prompt: str | None = None
    sam2_enabled: bool
    sam2_model_cfg: str | None = None
    sam2_checkpoint: str | None = None
    openai_api_key_configured: bool
    openai_base_url: str
    openai_model: str
    openai_api_mode: OpenAIAPIMode
    openai_request_timeout: float
    openai_vision_plan_enabled: bool
    openai_vision_model: str | None = None
    openai_image_edit_enabled: bool
    image_edit_provider: ImageEditProviderName
    openai_image_model: str
    openai_image_quality: OpenAIImageQuality
    custom_image_edit_endpoint: str | None = None
    custom_image_edit_api_key_configured: bool
    custom_image_edit_model: str | None = None
    qwen_vl_endpoint: str | None = None
    flux_kontext_endpoint: str | None = None


class AgentMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    created_at: str | None = None


class OCRCard(BaseModel):
    id: str
    title: str = "识别组件"
    card_type: Literal["text", "image"] = "text"
    text: str
    bbox: BBox
    confidence: float | None = None
    image_url: str | None = None
    tags: list[str] = Field(default_factory=list)
    details: dict[str, Any] = Field(default_factory=dict)
    agent_note: str | None = None


class AgentChatRequest(BaseModel):
    message: str


class AgentChatResponse(BaseModel):
    project_id: str | None = None
    available: bool
    reply: str
    messages: list[AgentMessage] = Field(default_factory=list)
    manifest: ImageManifest | None = None
    ocr_cards: list[OCRCard] = Field(default_factory=list)


class AgentStatus(BaseModel):
    available: bool
    provider: str = "openai"
    model: str | None = None
    base_url: str | None = None
    detail: str | None = None
