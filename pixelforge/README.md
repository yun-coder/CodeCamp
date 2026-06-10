# pixelforge

像素级图片理解 + 编辑工作流引擎。

`pixelforge` 是 `ImageLayerAgent`（电商图片替换工作流）和 `sam-agent-tool`（SAM 分割 CLI/SDK）整合后的统一继任者。完整设计文档见 `../meta-workflow/ANALYSIS.md`。

## 状态

🚧 **Phase 1 — 骨架已铺好**

- ✅ 目录结构
- ✅ `pyproject.toml`（核心依赖 + 4 个 extras：`sam` / `sam2` / `paddleocr` / `schp` / `dev`）
- ✅ 5 个 Provider Protocol（OCR / Grounding / Segmentation / ImageEdit / GenerativeRepair）
- ⏳ Provider 实现（Phase 2）
- ⏳ 工作流（Phase 3）
- ⏳ API 层（Phase 4）
- ⏳ CLI（Phase 5）

## 安装

```bash
# 轻量安装（仅核心 + FastAPI）
cd D:\学习院\CodeCamp\pixelforge
pip install -e .

# 完整安装（启用所有 Provider）
pip install -e ".[sam,paddleocr,schp,dev]"
```

> 提示：`segment-anything` 仍需从 GitHub 手动拉取（见上方 `pyproject.toml` 注释）。

## 启动

```bash
# CLI（Phase 5 之后才有完整功能）
python -m pixelforge --help

# Web UI（Phase 4 之后才有完整端点）
uvicorn pixelforge.api.main:app --port 8700 --reload
```

## 目录结构

```
pixelforge/
├── pyproject.toml
├── pixelforge/
│   ├── providers/        # 5 个 Provider Protocol + 实现
│   │   ├── base.py       # Protocol 定义
│   │   ├── ocr/          # PaddleOCR Cloud 等
│   │   ├── vision/       # VLM 视觉规划
│   │   ├── segment/      # SAM / SAM2 / 其他分割
│   │   ├── edit/         # 图片编辑融合
│   │   ├── parse/        # 人体解析
│   │   └── repair/       # 补图/重建
│   ├── workflows/        # 业务工作流（layer_analysis / xiaohua_replacement）
│   ├── agents/           # 多 Agent 编排
│   ├── api/              # FastAPI（统一端口 8700）
│   ├── cli/              # python -m pixelforge ...
│   └── core/             # models / storage / manifest_io / timing / errors
└── tests/
```

## 设计原则

1. **协议优先于实现**：所有 Provider 实现 Protocol，duck typing 注入
2. **配置即代码**：Pydantic settings 模型驱动所有 Provider
3. **失败显式化**：`available: bool` + `reason: str` 直显在 UI
4. **不重写 working code**：先搬后改，避免大爆炸
5. **torch 永远可选**：核心安装不强制拉 2GB torch
6. **业务工作流 = 编排，不 = 算法**：`workflows/` 只做"调用顺序 + 数据流"

## 迁移来源

| 旧 | 新 |
|---|---|
| `ImageLayerAgent/app/services/segmentation` 启发式 | `pixelforge/providers/segment/*` |
| `sam-agent-tool/sam_agent_tool/engine.py` | `pixelforge/providers/segment/sam_local.py`（Phase 2） |
| `ImageLayerAgent/app/services/providers.py::PaddleOCRCloudProvider` | `pixelforge/providers/ocr/paddleocr_cloud.py`（Phase 2） |
| `ImageLayerAgent/app/services/vision_planner.py` | `pixelforge/providers/vision/openai_vision.py`（Phase 2） |
| `ImageLayerAgent/app/services/human_parser.py` | `pixelforge/providers/parse/schp_human_parser.py`（Phase 2） |
| `ImageLayerAgent/app/services/analyzer.py` | `pixelforge/workflows/layer_analysis.py`（Phase 3） |
| `ImageLayerAgent/app/services/replacement_workflow.py` | `pixelforge/workflows/xiaohua_replacement.py`（Phase 3） |
| `ImageLayerAgent/app/main.py`（端口 8710） + `sam-agent-tool/sam_agent_tool/web.py`（端口 8080） | `pixelforge/api/main.py`（统一端口 8700）（Phase 4） |
| `sam-agent-tool/sam_agent_tool/cli.py` | `pixelforge/cli/commands/segment.py`（Phase 5） |

## 许可证

MIT
