from __future__ import annotations

import base64
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

from app.models import AgentMessage, ImageManifest, OCRCard, ThirdPartySettings
from app.services.storage import ProjectStorage


AGENT_HISTORY_FILE = "agent_messages.json"
GLOBAL_AGENT_HISTORY_FILE = "agent_global_messages.json"


class OpenAIWorkflowAgent:
    name = "openai_single_agent"

    def __init__(self, storage: ProjectStorage, settings: ThirdPartySettings) -> None:
        self.storage = storage
        self.api_key = settings.openai_api_key
        self.base_url = settings.openai_base_url.rstrip("/")
        self.model = settings.openai_model
        self.api_mode = settings.openai_api_mode
        self.timeout = settings.openai_request_timeout
        self.available = bool(self.api_key)
        self.reason = (
            f"model={self.model}, base_url={self.base_url}, mode={self.api_mode}"
            if self.available
            else "OPENAI_API_KEY is not configured"
        )

    def status(self) -> dict[str, str | bool | None]:
        return {
            "available": self.available,
            "provider": "openai",
            "model": self.model,
            "base_url": self.base_url,
            "detail": self.reason,
        }

    def build_ocr_cards(self, manifest: ImageManifest | None) -> list[OCRCard]:
        if manifest is None:
            return []
        cards: list[OCRCard] = []

        # priority scoring for card ordering:
        #   model/human > clothing > brand text > style > price > material > accessories > other
        _CARD_PRIORITY: dict[str, int] = {
            "人物模特": 10,
            "上衣": 9,
            "下装": 8,
            "连衣裙": 8,
            "干净服装 (透明底)": 9,
            "套装/整身": 7,
            "品牌": 6,
            "款式": 5,
            "价格": 4,
            "面料": 3,
            "饰品/图标": 2,
            "配饰": 2,
        }

        for layer in manifest.layers:
            recognized_text = layer.attributes.extra.get("recognized_text")
            raw_text = recognized_text if isinstance(recognized_text, str) else ""
            text = _clean_ocr_text(raw_text)
            is_image_text_layer = layer.type == "text" and _is_image_marker(raw_text) and bool(layer.asset_url)

            if layer.type == "text" and not is_image_text_layer:
                if not _is_useful_ocr_text(text):
                    continue
                classification = _classify_text_card(text)
                title_prefix = str(classification.get("title_prefix", "文案"))
                cards.append(
                    OCRCard(
                        id=layer.id,
                        title=f"{title_prefix}组件 {len(cards) + 1}",
                        card_type="text",
                        text=text,
                        bbox=layer.bbox,
                        confidence=layer.attributes.confidence,
                        tags=list(classification.get("tags", ["文案"])),
                        details={
                            "component_type": "text",
                            "category": str(classification.get("category", "文案")),
                            "position": _position_label(layer.bbox, manifest.width, manifest.height),
                        },
                        agent_note=f"小画已将 OCR 文案归类为「{classification.get('category', '文案')}」卡片。",
                    )
                )
                continue

            if not layer.asset_url or not _should_emit_image_card(layer.type):
                continue

            summary = _image_component_summary(layer, manifest)
            cards.append(
                OCRCard(
                    id=layer.id,
                    title=summary["title"],
                    card_type="image",
                    text=summary["text"],
                    bbox=layer.bbox,
                    confidence=layer.attributes.confidence,
                    image_url=layer.asset_url,
                    tags=summary["tags"],
                    details=summary["details"],
                    agent_note=summary["agent_note"],
                )
            )
        # assign priority and sort
        def _card_priority(card: OCRCard) -> int:
            for tag in card.tags:
                if tag in _CARD_PRIORITY:
                    return _CARD_PRIORITY[tag]
            if card.card_type == "image":
                return 1
            return 0

        for card in cards:
            card.details["priority"] = _card_priority(card)

        cards.sort(key=_card_priority, reverse=True)
        return cards

    def load_messages(self, project_id: str) -> list[AgentMessage]:
        payload = self.storage.load_json(project_id, AGENT_HISTORY_FILE, default=[])
        if not isinstance(payload, list):
            return []
        return [AgentMessage.model_validate(item) for item in payload if isinstance(item, dict)]

    def save_messages(self, project_id: str, messages: list[AgentMessage]) -> None:
        self.storage.save_json(project_id, AGENT_HISTORY_FILE, [item.model_dump() for item in messages])

    def load_global_messages(self) -> list[AgentMessage]:
        path = self.storage.root / GLOBAL_AGENT_HISTORY_FILE
        if not path.exists():
            return []
        payload = path.read_text(encoding="utf-8")
        if not payload.strip():
            return []
        data = json.loads(payload)
        if not isinstance(data, list):
            return []
        return [AgentMessage.model_validate(item) for item in data if isinstance(item, dict)]

    def save_global_messages(self, messages: list[AgentMessage]) -> None:
        path = self.storage.root / GLOBAL_AGENT_HISTORY_FILE
        path.write_text(
            json.dumps([item.model_dump() for item in messages], indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    def run_workflow(self, project_id: str, manifest: ImageManifest | None) -> tuple[str, list[AgentMessage]]:
        prompt = (
            "用户刚录入了一张图片。请作为 ImageLayerAgent 的小画智能体，完成一次工作流交接："
            "说明你已经看到图片和当前解析结果，概括图片结构、图层拆分状态、可继续操作的建议，"
            "并用简短中文告诉用户可以继续问你什么。"
        )
        return self.respond(project_id, prompt, manifest=manifest, include_image=True, persist_user=False)

    def chat(self, project_id: str, message: str, manifest: ImageManifest | None) -> tuple[str, list[AgentMessage]]:
        return self.respond(project_id, message, manifest=manifest, include_image=True, persist_user=True)

    def chat_global(self, message: str) -> tuple[str, list[AgentMessage]]:
        messages = self.load_global_messages()
        messages.append(_message("user", message))
        if not self.available:
            reply = "小画还没有配置 API Key。你仍然可以先配置页面和上传图片；配置 OPENAI_API_KEY 后我就能接手工作流。"
            messages.append(_message("assistant", reply))
            self.save_global_messages(messages)
            return reply, messages
        try:
            reply = self._call_model(None, message, None, messages, include_image=False)
        except requests.ConnectionError as exc:
            reply = f"小画无法连接 API 端点，请检查 OPENAI_BASE_URL 配置：{exc}"
        except requests.Timeout:
            reply = "小画请求超时，请检查网络或增加 OPENAI_REQUEST_TIMEOUT。"
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else "?"
            reply = f"小画 API 返回 HTTP {status}，请检查 API Key 和端点。"
        except Exception as exc:
            reply = f"小画调用失败：{exc}"
        messages.append(_message("assistant", reply))
        self.save_global_messages(messages)
        return reply, messages

    def respond(
        self,
        project_id: str | None,
        message: str,
        manifest: ImageManifest | None,
        include_image: bool,
        persist_user: bool,
    ) -> tuple[str, list[AgentMessage]]:
        messages = self.load_messages(project_id)
        if persist_user:
            messages.append(_message("user", message))
        if not self.available:
            reply = "小画还没有配置 API Key。请在设置页或本地 .env 中配置 OPENAI_API_KEY 和 OPENAI_BASE_URL。"
            messages.append(_message("assistant", reply))
            self.save_messages(project_id, messages)
            return reply, messages

        try:
            reply = self._call_model(project_id, message, manifest, messages, include_image)
        except requests.ConnectionError as exc:
            reply = f"小画无法连接 API 端点，请检查 OPENAI_BASE_URL：{exc}"
        except requests.Timeout:
            reply = "小画请求超时，请检查网络或增加 OPENAI_REQUEST_TIMEOUT。"
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else "?"
            reply = f"小画 API 返回 HTTP {status}，请检查 API Key 和端点配置。"
        except Exception as exc:
            reply = f"小画调用失败：{exc}"
        messages.append(_message("assistant", reply))
        self.save_messages(project_id, messages)
        return reply, messages

    def _call_model(
        self,
        project_id: str | None,
        message: str,
        manifest: ImageManifest | None,
        history: list[AgentMessage],
        include_image: bool,
    ) -> str:
        if self.api_mode == "chat_completions":
            return self._call_chat_completions(project_id, message, manifest, history, include_image)
        try:
            return self._call_responses(project_id, message, manifest, history, include_image)
        except (requests.HTTPError, requests.ConnectionError, requests.Timeout) as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if self.api_mode == "auto" or status in {404, 405} or status is None:
                return self._call_chat_completions(project_id, message, manifest, history, include_image)
            raise

    def _call_responses(
        self,
        project_id: str | None,
        message: str,
        manifest: ImageManifest | None,
        history: list[AgentMessage],
        include_image: bool,
    ) -> str:
        payload = {
            "model": self.model,
            "instructions": _agent_instructions(),
            "input": [
                {
                    "role": "user",
                    "content": self._content_parts(project_id, message, manifest, history, include_image, responses=True),
                }
            ],
            "store": False,
        }
        response = requests.post(
            self._endpoint("responses"),
            headers=self._headers(),
            json=payload,
            timeout=self.timeout,
        )
        response.raise_for_status()
        return _extract_responses_text(response.json())

    def _call_chat_completions(
        self,
        project_id: str | None,
        message: str,
        manifest: ImageManifest | None,
        history: list[AgentMessage],
        include_image: bool,
    ) -> str:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": _agent_instructions()},
                {
                    "role": "user",
                    "content": self._content_parts(project_id, message, manifest, history, include_image, responses=False),
                },
            ],
        }
        response = requests.post(
            self._endpoint("chat/completions"),
            headers=self._headers(),
            json=payload,
            timeout=self.timeout,
        )
        response.raise_for_status()
        data = response.json()
        return str(data.get("choices", [{}])[0].get("message", {}).get("content") or "").strip()

    def _content_parts(
        self,
        project_id: str,
        message: str,
        manifest: ImageManifest | None,
        history: list[AgentMessage],
        include_image: bool,
        responses: bool,
    ) -> list[dict[str, Any]]:
        context = _project_context(project_id, message, manifest, history)
        if responses:
            parts: list[dict[str, Any]] = [{"type": "input_text", "text": context}]
            if include_image and project_id:
                parts.append({"type": "input_image", "image_url": self._image_data_url(project_id), "detail": "auto"})
            return parts

        parts = [{"type": "text", "text": context}]
        if include_image and project_id:
            parts.append({"type": "image_url", "image_url": {"url": self._image_data_url(project_id)}})
        return parts

    def _image_data_url(self, project_id: str) -> str:
        image_path = self.storage.original_path(project_id)
        mime = _mime_type(image_path)
        encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
        return f"data:{mime};base64,{encoded}"

    def _endpoint(self, suffix: str) -> str:
        if self.base_url.endswith(f"/{suffix}"):
            return self.base_url
        return f"{self.base_url}/{suffix}"

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }


def _message(role: str, content: str) -> AgentMessage:
    return AgentMessage(role=role, content=content, created_at=datetime.now(timezone.utc).isoformat())


def _mime_type(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if suffix == ".webp":
        return "image/webp"
    if suffix == ".gif":
        return "image/gif"
    return "image/png"


def _clean_ocr_text(text: str) -> str:
    cleaned = re.sub(r"!\[[^\]]*\](?:\([^)]+\))?", " ", text)
    cleaned = re.sub(r"<img\b[^>]*>", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^\s{0,3}#{1,6}\s*", "", cleaned)
    cleaned = re.sub(r"^\s*[-*+]\s+", "", cleaned)
    cleaned = cleaned.replace("`", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def _is_useful_ocr_text(text: str) -> bool:
    if not text:
        return False
    lowered = text.lower().strip()
    if lowered in {"image", "img", "figure", "picture", "photo"}:
        return False
    return bool(re.search(r"[\w\u4e00-\u9fff]", text))


def _is_image_marker(text: str) -> bool:
    if not text:
        return False
    lowered = _clean_ocr_text(text).lower()
    return bool(
        re.search(r"!\[[^\]]*\](?:\([^)]+\))?|<img\b[^>]*>", text, re.IGNORECASE)
        or lowered in {"image", "img", "figure", "picture", "photo"}
    )


def _should_emit_image_card(layer_type: str) -> bool:
    return layer_type not in {"background", "background_clean", "shadow", "text_mask"}

_CLOTHING_LAYER_TYPE_LABELS: dict[str, str] = {
    "upper_clothes": "上衣",
    "lower_clothes": "下装",
    "dress": "连衣裙",
    "human": "人物模特",
    "product": "服装/产品",
    "product_clean": "干净服装 (透明底)",
    "product_reconstruct": "产品重建 (无人穿着)",
    "decor": "配饰",
    "face_hair": "面部/头发",
    "skin": "皮肤/遮挡",
}


def _position_label(bbox: Any, width: int, height: int) -> str:
    cx = (bbox.x + bbox.width / 2) / max(width, 1)
    cy = (bbox.y + bbox.height / 2) / max(height, 1)
    horizontal = "左侧" if cx < 0.34 else "右侧" if cx > 0.66 else "中部"
    vertical = "上方" if cy < 0.34 else "下方" if cy > 0.66 else "中段"
    return f"{vertical}{horizontal}"


def _image_component_summary(layer: Any, manifest: ImageManifest) -> dict[str, Any]:
    label_text = " ".join(
        str(value or "")
        for value in (
            layer.name,
            layer.type,
            layer.attributes.label,
            layer.attributes.notes,
        )
    ).lower()
    width = max(manifest.width, 1)
    height = max(manifest.height, 1)
    rel_y = layer.bbox.y / height
    rel_h = layer.bbox.height / height
    rel_w = layer.bbox.width / width

    # human parser provides precise clothing labels
    if layer.type in _CLOTHING_LAYER_TYPE_LABELS:
        precise_label = _CLOTHING_LAYER_TYPE_LABELS[layer.type]
        title = precise_label
        tags = ["图片", precise_label]
        details = {
            "component_type": "image",
            "source_layer_type": layer.type,
            "position": _position_label(layer.bbox, width, height),
            "from_human_parser": True,
        }
        return {
            "title": title,
            "text": f"{title}，位于原图{details['position']}。由人体解析模型精确提取。",
            "tags": tags,
            "details": details,
            "agent_note": "小画已通过人体解析模型精确识别该服装组件。",
        }

    # fallback: heuristic clothing classification
    has_model = layer.type in {"human", "face_hair", "skin"} or _has_any(label_text, ["model", "human", "person", "girl", "woman", "人物", "模特", "人像"])
    has_pants = _has_any(label_text, ["pants", "trouser", "bottom", "lower", "leggings", "裤", "下装"]) or (
        rel_y > 0.38 and rel_h > 0.20 and layer.type in {"human", "product", "unknown"}
    )
    has_top = _has_any(label_text, ["top", "shirt", "upper", "vest", "bra", "jacket", "上衣", "衣服"]) or (
        rel_y < 0.56 and rel_h > 0.18 and layer.type in {"human", "product", "unknown"}
    )
    is_set = _has_any(label_text, ["set", "suit", "outfit", "套装", "整套"]) or (
        has_top and has_pants
    ) or (layer.type in {"human", "product"} and rel_h > 0.55)
    has_accessories = layer.type == "decor" or _has_any(
        label_text,
        ["accessory", "icon", "logo", "bag", "hat", "jewelry", "饰品", "图标", "标识", "配件"],
    ) or (rel_w < 0.24 and rel_h < 0.24 and rel_y > 0.45)

    tags = ["图片"]
    if has_model:
        tags.append("人物模特")
    if has_top:
        tags.append("上衣")
    if has_pants:
        tags.append("裤子/下装")
    if is_set:
        tags.append("套装")
    if has_accessories:
        tags.append("饰品/图标")

    title = "图片组件"
    if has_model:
        title = "人物模特"
    elif is_set:
        title = "套装/整身"
    elif has_top:
        title = "上衣区域"
    elif has_pants:
        title = "裤子/下装"
    elif has_accessories:
        title = "饰品/图标"

    details = {
        "component_type": "image",
        "source_layer_type": layer.type,
        "position": _position_label(layer.bbox, width, height),
        "has_model": has_model,
        "has_pants": has_pants,
        "has_top": has_top,
        "is_set": is_set,
        "has_accessories": has_accessories,
    }
    text = f"{title}，位于原图{details['position']}。"
    return {
        "title": title,
        "text": text,
        "tags": tags,
        "details": details,
        "agent_note": "小画已将该图片图层作为真实图片卡片展示，并补充服饰结构判断。",
    }


def _has_any(text: str, needles: list[str]) -> bool:
    return any(needle.lower() in text for needle in needles)


def _classify_text_card(text: str) -> dict[str, object]:
    lowered = text.lower().strip()
    result: dict[str, object] = {
        "category": "其他",
        "tags": ["文案"],
        "title_prefix": "文案",
    }

    brand_keywords = [
        "品牌", "brand", "logo", "®", "™",
        "nike", "adidas", "zara", "uniqlo", "h&m", "gucci", "prada",
        "优衣库", "耐克", "阿迪", "李宁", "安踏",
    ]
    style_keywords = [
        "款", "式", "版型", "风格", "设计", "系列",
        "修身", "宽松", "韩版", "日系", "欧美", "潮流",
        "上衣", "裤子", "裙子", "外套", "T恤", "衬衫", "卫衣", "夹克",
        "连衣裙", "半身裙", "短袖", "长袖", "无袖", "连帽",
        "新款", "春", "夏", "秋", "冬", "季",
        "style", "design", "collection",
    ]
    price_keywords = [
        "¥", "￥", "元", "$", "折扣", "售价", "原价", "现价",
        "限时", "特价", "促销", "优惠", "降价", "秒杀",
        "price", "sale", "discount", "off",
    ]
    material_keywords = [
        "棉", "麻", "丝", "毛", "绒", "皮", "革",
        "聚酯", "涤纶", "氨纶", "锦纶", "腈纶", "粘纤",
        "面料", "成分", "里料", "填充", "材质",
        "%", "纯棉", "混纺",
        "cotton", "polyester", "wool", "silk", "linen",
    ]

    if _has_any(lowered, brand_keywords):
        result["category"] = "品牌"
        result["tags"] = ["品牌文案"]
        result["title_prefix"] = "品牌"
    elif _has_any(lowered, price_keywords):
        result["category"] = "价格"
        result["tags"] = ["价格促销"]
        result["title_prefix"] = "价格"
    elif _has_any(lowered, material_keywords):
        result["category"] = "面料"
        result["tags"] = ["面料成分"]
        result["title_prefix"] = "面料"
    elif _has_any(lowered, style_keywords):
        result["category"] = "款式"
        result["tags"] = ["款式描述"]
        result["title_prefix"] = "款式"
    else:
        has_cjk = any("一" <= ch <= "鿿" for ch in text)
        if has_cjk:
            result["category"] = "文案"
            result["tags"] = ["宣传文案"]
            result["title_prefix"] = "文案"
        else:
            result["category"] = "其他"
            result["tags"] = ["其他"]
            result["title_prefix"] = "其他"
    return result


def _agent_instructions() -> str:
    return (
        "你叫小画，是 ImageLayerAgent 项目内唯一的工作流智能体。你负责协调整体图像工作流："
        "理解图片内容、解释当前图层解析结果、指出可操作下一步、回答用户对图层/文字/OCR/导出/重组的追问。"
        "回答使用简洁中文。不要编造不存在的图层、文件或操作结果；如果上下文没有提供，就明确说需要先解析或需要用户确认。"
        "你的建议应服务于图像分层编辑工作台，而不是泛泛聊天。"
    )


def _project_context(
    project_id: str | None,
    message: str,
    manifest: ImageManifest | None,
    history: list[AgentMessage],
) -> str:
    recent_history = "\n".join(f"{item.role}: {item.content}" for item in history[-8:])
    if not project_id:
        return (
            "当前没有绑定图片项目。你可以帮助用户理解 ImageLayerAgent 的使用方式、配置项、"
            "上传图片后的工作流、PaddleOCR/OpenAI 设置，以及下一步如何操作。\n\n"
            f"最近对话：\n{recent_history or '-'}\n\n"
            f"用户消息：{message}"
        )
    manifest_text = "当前还没有 layers.json。"
    if manifest is not None:
        layer_lines = [
            f"- {layer.id}: {layer.type}, bbox=({layer.bbox.x},{layer.bbox.y},{layer.bbox.width},{layer.bbox.height}), "
            f"label={layer.attributes.label or '-'}, confidence={layer.attributes.confidence}"
            for layer in manifest.layers[:30]
        ]
        manifest_text = (
            f"project_id={manifest.project_id}\n"
            f"size={manifest.width}x{manifest.height}\n"
            f"stage={manifest.stage}\n"
            f"summary={manifest.summary or '-'}\n"
            f"warnings={'; '.join(manifest.warnings) if manifest.warnings else '-'}\n"
            "layers:\n" + "\n".join(layer_lines)
        )
    return (
        f"项目：{project_id}\n\n"
        f"当前 manifest：\n{manifest_text}\n\n"
        f"最近对话：\n{recent_history or '-'}\n\n"
        f"用户消息：{message}"
    )


def _extract_responses_text(data: dict[str, Any]) -> str:
    if data.get("output_text"):
        return str(data["output_text"]).strip()
    chunks: list[str] = []
    for output in data.get("output", []) or []:
        if not isinstance(output, dict) or output.get("type") != "message":
            continue
        for content in output.get("content", []) or []:
            if not isinstance(content, dict):
                continue
            if content.get("type") in {"output_text", "text"}:
                text = content.get("text")
                if text:
                    chunks.append(str(text))
    return "\n".join(chunks).strip() or "小画没有返回可显示文本。"
