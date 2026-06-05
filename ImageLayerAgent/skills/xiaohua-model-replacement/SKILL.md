---
name: xiaohua-model-replacement
description: Use when implementing or debugging XiaoHua's model-first product/person replacement workflow: PaddleOCR text anchors, VLM visual planning, image-edit generation, replacement model_plan.json, target masks, final OCR text overlay, and avoiding local cutout/compositing.
---

# 小画模型替换闭环

## 原则

- 本地代码不把抠图、肤色判断、边缘背景色、前景连通域作为主路径。
- PaddleOCR 负责文案识别、版式锚点和最终文案保护。
- VLM 负责读取原图和产品图，输出 `model_plan.json`。
- 图片编辑 Provider 负责最终融合，包括头颈、上半身、光影、边缘、脚部和背景修复。
- 本地只做编排、文件保存、mask 生成、错误提示和最终 OCR 文案覆盖。

## 主流程

1. 读取 `original.png`、`product.png`、`layers.json` 中的 OCR text layers。
2. 调用 `app/services/vision_planner.py` 得到 `scene_summary`、`subject_summary`、`targets`、`protected_regions`、`preserve_text`、`edit_prompt`。
3. 保存 `runs/<project_id>/model_plan.json`。
4. 根据计划 bbox 生成编辑 mask，并从 mask 中扣除 OCR 文案区域和 protected regions。
5. 调用 `app/services/image_editing.py` 的 `build_image_edit_provider()`。
6. 保存 `compositions/model_replacement_raw.png`。
7. 最后覆盖 OCR 文案层，保存 `compositions/replacement_result.png`。

## 失败处理

- 视觉规划模型不可用：直接返回可理解错误，提示配置 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_VISION_MODEL`。
- 图片编辑模型不可用：直接返回可理解错误，提示配置 `IMAGE_EDIT_PROVIDER`、`OPENAI_IMAGE_EDIT_ENABLED` 和对应 Provider 参数。
- 模型没有返回有效 target：不要回退本地解析，保留原始返回并提示重试或换模型。
- OCR 只识别少量文字：要求 VLM 在 `protected_regions` 和 `preserve_text` 中补充可见标题、CTA、卡片文案。
- 图片编辑失败：不要输出本地贴图结果冒充最终结果；保留错误信息和已有 `model_plan.json`。

## 质量检查

- 文字必须最后生成或覆盖，不能被人物遮挡。
- 结果不能有明显断头、断脖子、灰色补丁、模糊脚部、重复肢体、贴图硬边。
- 如果产品图本身是裁头图，prompt 必须明确保留原图头脸并自然衔接脖颈/上半身。
- 如果原图有多个产品区域，`targets` 应包含多个目标并按 priority 排序。
- 如果原图有嵌套搭配卡片，卡片边框、标题、CTA 需要进入 `protected_regions`，卡片内人物/产品需要单独 target。
