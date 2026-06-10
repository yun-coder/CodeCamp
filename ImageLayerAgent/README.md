# ImageLayerAgent

> ⚠️ **ARCHIVED** — ImageLayerAgent 已迁移到 **[pixelforge](../pixelforge)**。本仓库不再维护。
> 
> - 新代码、文档、安装说明：`D:\学习院\CodeCamp\pixelforge`
> - 迁移设计与路线图：`D:\学习院\CodeCamp\meta-workflow\ANALYSIS.md`
> - 旧仓库将保留 1 个版本周期供回滚，之后归档。
> 
> 旧 API 端点（`POST /api/projects`、`POST /api/projects/{id}/analyze` 等）在 pixelforge 中路径和 payload 完全兼容 —— 只需把 base URL 从 8710 切到 8700。

---

ImageLayerAgent 当前主线是“小画”的电商图片替换工作流：用户上传原图和产品图，系统通过 PaddleOCR 识别原图中的文字和版式锚点，再由视觉规划模型判断要替换的人物/商品区域，最后调用图片编辑模型生成替换结果，并在最上层重新覆盖原图文字。

## 当前能力

- 原图分析必须经过 PaddleOCR Cloud，用 OCR 结果保护标题、按钮、搭配卡片、CTA 等版式元素。
- Agent/视觉规划使用 OpenAI 兼容接口，可通过 `OPENAI_BASE_URL` 接第三方 API 网关。
- 图片最终融合已经抽成独立 Provider，不再强绑 OpenAI Images API。
- 当前支持 `openai_images`、`custom_http`、`none` 三种图片编辑 Provider。
- 本地代码只负责编排、mask、文件保存、文字层最后覆盖，不再把本地抠图/贴图当作主路径。

## 快速启动

```powershell
cd D:\ImageLayerAgent
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8710
```

工作台：

```text
http://127.0.0.1:8710
```

设置页：

```text
http://127.0.0.1:8710/settings
```

如果 `8710` 端口权限不足或被占用，可以换成其他端口：

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8720
```

## 环境配置

第三方能力可以通过设置页或项目根目录 `.env` 配置。

### PaddleOCR

```env
ILA_OCR_PROVIDER=paddleocr_cloud
PADDLEOCR_ACCESS_TOKEN=your_token
PADDLEOCR_BASE_URL=https://paddleocr.aistudio-app.com
PADDLEOCR_MODEL=PaddleOCR-VL-1.6
```

### Agent / 视觉规划

当前配置的 OpenAI 兼容 key 可以继续用于文本 Agent 和视觉规划：

```env
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4.1-mini
OPENAI_API_MODE=responses
OPENAI_VISION_PLAN_ENABLED=1
OPENAI_VISION_MODEL=gpt-4.1-mini
```

### 图片编辑模型

如果你的 OpenAI 兼容 key 支持 Images API，可以使用：

```env
OPENAI_IMAGE_EDIT_ENABLED=1
IMAGE_EDIT_PROVIDER=openai_images
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_QUALITY=medium
```

如果当前 key 不支持图片能力，改用自定义图片模型 Provider：

```env
OPENAI_IMAGE_EDIT_ENABLED=1
IMAGE_EDIT_PROVIDER=custom_http
CUSTOM_IMAGE_EDIT_ENDPOINT=https://your-image-model-gateway.example.com/edit
CUSTOM_IMAGE_EDIT_API_KEY=your_image_model_key
CUSTOM_IMAGE_EDIT_MODEL=your_image_model_name
```

`custom_http` 会向 endpoint 发送 JSON：

```json
{
  "model": "your_image_model_name",
  "prompt": "...",
  "original_image": "data:image/png;base64,...",
  "product_image": "data:image/png;base64,...",
  "mask_image": "data:image/png;base64,...",
  "width": 750,
  "height": 1066,
  "size": "750x1066",
  "task": "product_person_replacement"
}
```

endpoint 可以返回以下任意一种格式：

```json
{ "b64_json": "..." }
{ "image_base64": "..." }
{ "image": "data:image/png;base64,..." }
{ "url": "https://..." }
{ "data": [{ "b64_json": "..." }] }
{ "images": [{ "url": "https://..." }] }
```

## 工作流

1. 上传原图。
2. 上传产品图。
3. 后端调用 PaddleOCR 识别原图文字和版式区域。
4. `OpenAIVisionPlanner` 读取原图、产品图、OCR 文案，生成 `model_plan.json`。
5. `XiaohuaReplacementWorkflow` 根据模型计划生成目标 mask，并扣除 OCR 文案保护区。
6. `app/services/image_editing.py` 选择图片编辑 Provider 生成 `model_replacement_raw.png`。
7. 系统最后重新覆盖 OCR 文案层，写出 `compositions/replacement_result.png`。

## 主要 API

```http
POST /api/projects
POST /api/projects/{project_id}/product
POST /api/projects/{project_id}/replacement/analyze
POST /api/projects/{project_id}/replacement/compose
GET  /api/projects/{project_id}/package
GET  /api/providers/status
GET  /api/settings
POST /api/settings
```

## 输出文件

每个项目位于：

```text
runs/<project_id>/
```

常见输出：

```text
original.png
product.png
layers.json
replacement.json
analysis_report.json
model_plan.json
compositions/model_replacement_raw.png
compositions/replacement_result.png
layer_package.zip
```

## 代码结构

- `app/main.py`：API 路由。
- `app/services/settings.py`：第三方配置读取、保存和脱敏输出。
- `app/services/providers.py`：PaddleOCR、SAM2 等分析 Provider。
- `app/services/vision_planner.py`：视觉规划模型，生成 `model_plan.json`。
- `app/services/image_editing.py`：图片编辑 Provider 路由和适配层。
- `app/services/replacement_workflow.py`：小画替换主流程。
- `app/static/settings.html`、`app/static/settings.js`：第三方服务设置页。
- `skills/`：项目内 workflow 和 provider 接入约定。

## 当前限制

- 图片替换效果主要取决于接入的图片编辑模型能力。
- 复杂电商海报中有多人物、多卡片、多 CTA 时，必须先保证 PaddleOCR 能尽可能识别完整文字。
- 如果 provider 不支持 mask、参考图或多图输入，建议在 `CUSTOM_IMAGE_EDIT_ENDPOINT` 后面接一层自己的网关做格式转换。
