---
name: xiaohua-image-workflow
description: Use when working on ImageLayerAgent's XiaoHua model-first ecommerce image workflow, including PaddleOCR layout anchors, VLM replacement planning, image editing generation, model provider settings, canvas workflow nodes, and product/person replacement results.
---

# 小画图片替换工作流

## 当前主线

项目目标不是单纯 OCR 拆层，也不是只替换裤子或继续调本地抠图算法，而是模型优先的闭环：

1. 用户上传原图。
2. 系统通过 PaddleOCR 识别原图中的文字、按钮、标题、搭配卡片等版式锚点。
3. 用户上传产品图。
4. 视觉规划模型读取原图、产品图和 OCR 文案，定位原图中可替换的人物/产品展示区域。
5. 视觉规划模型输出 `model_plan.json`，包含 `targets`、`protected_regions`、`preserve_text`、`edit_prompt`。
6. workflow 根据计划生成编辑 mask，并扣除 OCR 文案和 protected regions。
7. 图片编辑 Provider 使用原图、产品参考图、mask 和 prompt 生成最终替换图。
8. 系统最后覆盖 OCR 文案层，避免文字被人物或产品遮挡。

## 约束

- PaddleOCR 是版式分析必要入口，不是可选展示能力。
- 不再把本地前景识别、肤色判断、背景色抠图作为主路径。
- 产品图中的人物、衣服、鞋包、首饰等应作为完整替换主体交给模型理解。
- 原图存在多个产品展示区域时，应生成多个 target region。
- OCR 文案用于定位和保护原图版式，不应随意重排或改写。
- 图片模型失败时不要输出本地贴图结果冒充最终结果。

## 后端入口

- `app/main.py`：API 路由。
- `app/services/replacement_workflow.py`：替换主流程。
- `app/services/vision_planner.py`：视觉规划模型。
- `app/services/image_editing.py`：图片编辑 Provider 路由。
- `app/services/analyzer.py`：原图分析和 OCR 写入。
- `app/services/providers.py`：PaddleOCR、SAM2 等 provider。
- `app/services/settings.py`：第三方配置。
- `app/services/storage.py`：项目文件存储。

## 当前模型管线

1. `LayerAnalyzer` 调用 PaddleOCR 并写入 text layers。
2. `OpenAIVisionPlanner` 生成 `model_plan.json`。
3. `XiaohuaReplacementWorkflow` 生成目标 mask。
4. `build_image_edit_provider()` 选择 `openai_images` 或 `custom_http`。
5. Provider 写出 `compositions/model_replacement_raw.png`。
6. workflow 回贴 OCR 文案层，写出 `replacement.json` 和 `compositions/replacement_result.png`。

## 质量检查

- 文字必须最后生成或覆盖，不能被人物遮挡。
- 结果不能有明显断头、断脖子、灰色补丁、模糊脚部、重复肢体、贴图硬边。
- 裁头产品图要在 prompt 中明确保留原图头脸并自然衔接脖颈/上半身。
- 嵌套搭配卡片的边框、标题、CTA 进入 `protected_regions`；卡片内人物/产品可作为单独 target。
- 如果当前 OpenAI 兼容 key 不支持图片能力，使用 `IMAGE_EDIT_PROVIDER=custom_http` 接专用图片模型网关。
