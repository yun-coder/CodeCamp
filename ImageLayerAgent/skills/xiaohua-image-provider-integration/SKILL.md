---
name: xiaohua-image-provider-integration
description: Use when adding, replacing, or debugging image model providers in ImageLayerAgent, including OpenAI Responses vision planning, OpenAI Images edits, custom HTTP image edit gateways, FLUX/Kontext-style editing, virtual try-on models, provider settings, .env names, and provider status reporting.
---

# 小画图片模型 Provider 接入

## Provider 分层

- OCR provider：PaddleOCR Cloud，负责文字和版式锚点。
- Vision planner provider：读取原图、产品图、OCR 文案，输出结构化替换计划。
- Image edit provider：接收原图、产品参考图、mask、prompt，输出最终图片。
- Future provider：包袋替换、首饰替换、纯商品陈列、虚拟试衣等效果应新增 provider 或 workflow，不要塞进本地解析函数。

## 当前配置

Agent 和视觉规划：

```env
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_MODE=responses
OPENAI_MODEL=gpt-4.1-mini
OPENAI_VISION_PLAN_ENABLED=1
OPENAI_VISION_MODEL=gpt-4.1-mini
```

OpenAI Images：

```env
OPENAI_IMAGE_EDIT_ENABLED=1
IMAGE_EDIT_PROVIDER=openai_images
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_QUALITY=medium
```

自定义图片编辑 HTTP Provider：

```env
OPENAI_IMAGE_EDIT_ENABLED=1
IMAGE_EDIT_PROVIDER=custom_http
CUSTOM_IMAGE_EDIT_ENDPOINT=https://your-gateway.example.com/edit
CUSTOM_IMAGE_EDIT_API_KEY=...
CUSTOM_IMAGE_EDIT_MODEL=...
```

`custom_http` 会发送 data URL 格式的 `original_image`、`product_image`、`mask_image`，并接受 `b64_json`、`image_base64`、`image`、`url`、`data[0]`、`images[0]`、`output[0]` 等常见返回结构。

## 接入新模型

1. 优先判断能否通过 `custom_http` 网关适配；能适配时不要新增 provider。
2. 需要原生 provider 时，在 `ThirdPartySettings` 增加开关、模型名、endpoint、timeout。
3. 在 `SettingsStore._env_defaults()` 增加 `.env` 读取。
4. 在设置页加入字段，并同步 `settings.js` 的 `fieldNames`。
5. 在 `app/services/image_editing.py` 扩展 provider 和 `build_image_edit_provider()`。
6. 在 `/api/providers/status` 返回 provider 可用性。
7. README 和本 skill 同步配置名。

## 验证

- `.\.venv\Scripts\python.exe -B -m compileall app`
- `node --check app\static\settings.js`
- `/api/settings` 能返回新字段且不泄露密钥。
- `/api/providers/status` 能显示 `image_edit` 状态。
- provider 失败时直接返回清晰错误，不回退成本地贴图结果。
