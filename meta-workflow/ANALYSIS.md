# ImageLayerAgent × sam-agent-tool 整合分析与新工具设计

> 日期：2026-06-10
> 范围：`D:\学习院\CodeCamp\ImageLayerAgent`、`D:\学习院\CodeCamp\sam-agent-tool`
> 目标：判断能否整理成一个新的工作流工具，并给出重新设计/重新规划的方案。

---

## 1. 两个项目现状快照

### 1.1 ImageLayerAgent

| 项 | 详情 |
|---|---|
| 形态 | FastAPI Web 服务（端口 8710）+ 静态前端 + 第三方设置页 |
| 入口 | `app/main.py`（290 行，14 个 HTTP 端点） |
| 核心服务 | `analyzer.py`（图层分析 613 行）、`replacement_workflow.py`（小画替换主流程 262 行）、`vision_planner.py`（VLM 规划 335 行）、`image_editing.py`（图片编辑 Provider 279 行）、`human_parser.py`（人体解析）、`providers.py`（OCR/VLM/分割/修复 Provider 注册表 451 行）、`agent.py`（OpenAI Workflow Agent）、`storage.py` / `image_layers.py`（项目文件 + 图层工具） |
| 主流工作流 | "小画"电商图片替换：原图 + 产品图 → PaddleOCR 锚点 → VLM 生成 `model_plan.json` → 编辑 Provider（openai_images / custom_http / none）融合 → OCR 文字层回盖 |
| 输出 | `runs/<project_id>/{original,product,layers.json,replacement.json,model_plan.json,compositions/*,layer_package.zip}` |
| 依赖 | fastapi / uvicorn / pillow / numpy / opencv / pydantic / requests（8 个核心包），`requirements-optional-sam2.txt` / `requirements-optional-paddleocr.txt` 可选 |
| 状态 | 已经把"主体抠图/贴图"剥离成外部 Provider（设计上不再做本地抠图），但分析层和人体解析层仍包含大量启发式 + OpenCV 实现 |
| 痛点 | OCR/SAM2/人体解析都"半接入半本地"——能跑但效果取决于远端模型，本地代码可维护性差 |

### 1.2 sam-agent-tool

| 项 | 详情 |
|---|---|
| 形态 | Python 包（`pip install -e .`），提供 CLI / Python SDK / FastAPI Web 三种入口 |
| 入口 | `sam_agent_tool/__main__.py` + `cli.py` + `web.py` + `agent.py` |
| 核心模块 | `engine.py`（`SAMTool` 包装 SAM 的 `SamAutomaticMaskGenerator` 和 `SamPredictor`，194 行）、`agent.py`（`SAMAgent` 包一层加计时/错误处理/进度，175 行）、`exporter.py`（mask/crop/overlay 输出）、`cli.py`（`auto`/`prompt`/`box` 子命令）、`web.py`（上传 → 分割的简单 Web UI） |
| 能力 | 一次性把模型加载到内存，三种分割模式：自动全图分割 / 点提示 / 框提示；输出 `result.json` + `masks/*.png` + `crops/*.png` + `overlay.png` |
| 依赖 | numpy / opencv-python / torch / torchvision（4 个包，**必须本地 GPU/CPU 跑**） |
| 状态 | 算法能力扎实（`SamAutomaticMaskGenerator` + `SamPredictor` 双路径都接了），但**没有业务语义**——它不知道什么是"商品图"、"模特"、"文字层" |
| 痛点 | CLI/Web 只到"切物体"为止，没法直接驱动任何业务工作流；不能 `pip install` 出去给 ImageLayerAgent 调用（`engine.py` 直接 import `segment_anything`） |

---

## 2. 整合空间判断

**结论：能整合，而且应该整合。但不是简单 `cp -r`，而是把"业务编排"和"原子能力"彻底分层。**

### 2.1 共同 DNA

两个项目都围绕 **"像素级图片理解 + 结构化 JSON 输出 + 文件化工作目录"** 这一条主线：

```
输入图 ──▶ 原子能力（OCR/分割/抠图/规划/编辑）
       ──▶ 结构化 JSON 结果
       ──▶ 文件化产物（mask、crop、overlay、合成图）
       ──▶ 包装为 HTTP/CLI 给上层调用
```

### 2.2 重复/重叠的边界

| 维度 | ImageLayerAgent | sam-agent-tool | 整合点 |
|---|---|---|---|
| Web 服务框架 | FastAPI，端口 8710 | FastAPI，端口 8080 | **合并到同一个端口** |
| 图层文件输出 | 已有完整 `image_layers.py` + `storage.py` | 自己一套 `exporter.py` | **统一到 ImageLayerAgent 的 `ImageManifest` schema** |
| 分割 | 用 `_refine_masks(...)` 走 Provider 协议（SAM2 是可选 optional） | 完整本地 SAM（vit_b / vit_l / vit_h） | **把 sam-agent-tool 变成 ImageLayerAgent 的一个 `SegmentationProvider` 实现** |
| OCR | PaddleOCR Cloud（轮询 jobs） | 没有 | 保留 |
| 视觉规划 | OpenAIVisionPlanner（VLM 生成 `model_plan.json`） | 没有 | 保留 |
| 图片编辑 | openai_images / custom_http / none 三选一 | 没有 | 保留 |
| 主体抠图/重建 | 启发式 + OpenCV（`product_clean`、`product_reconstruct`） | SAM 自动 mask 切出来后导出透明 crop | **把 SAM 透明 crop 当成"上游更优源"** |
| 错误处理 + 进度 | 仅 settings 暴露 | 已有 `SAMAgent` 包装 | **提升成统一的 `run_with_timing` 装饰器** |

### 2.3 没有重叠的部分（必须各自保留）

- **ImageLayerAgent 的业务编排层**（电商海报工作流、VLM 规划、OCR 锚点、文字层回盖、文件 zip 打包）—— 这是产品壁垒，**不能丢**。
- **sam-agent-tool 的 SAM 三种 prompt 模式**（auto / point / box）—— ImageLayerAgent 当前只有 bbox 触发一种模式，没有点提示和自动全图分割，**整合后能力会增强**。

### 2.4 一个被忽略的"重复造轮子"

`ImageLayerAgent/app/services/image_layers.py` 和 `sam-agent-tool/sam_agent_tool/exporter.py` 都做了"mask → crop → 透明 PNG + bbox"这件几乎一样的事，**整合时直接共用**。

---

## 3. 新工具设计：`pixelforge`

> 工作代号：`pixelforge` —— 像素级图片理解 + 编辑工作流引擎
> 项目根目录建议：`D:\学习院\CodeCamp\pixelforge`

### 3.1 定位

把"原子 AI 能力"和"业务工作流"彻底解耦成两层：

```
┌─────────────────────────────────────────────────────────────┐
│  pixelforge                                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  workflows/        业务工作流（小画、海报、产品换背景）  │ │
│  │  agents/           多 Agent 编排（VLM 规划 + 错误恢复） │ │
│  │  api/              FastAPI，对外统一端口 8700            │ │
│  │  static/           Web UI + Settings UI                 │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  core/             中间层：图、manifest、文件存储、错误   │ │
│  │  io/               图层 / mask / 透明 PNG / zip 打包    │ │
│  │  providers/        Provider 协议 + 多种实现             │ │
│  │    ├── ocr/        paddleocr_cloud, tesseract, ...      │ │
│  │    ├── vision/     openai_vision, qwen_vl, ...          │ │
│  │    ├── segment/    sam2_local, sam_local, ...           │ │
│  │    ├── edit/       openai_images, custom_http, ...      │ │
│  │    ├── parse/      schp_human_parser, ...               │ │
│  │    └── repair/     inpainting, outpainting, ...         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 核心抽象：5 个 Protocol

```python
# providers/base.py
class OCRProvider(Protocol):
    def read_text(self, image, *, hint: str = "") -> list[TextBox]: ...

class GroundingProvider(Protocol):           # 视觉规划
    def ground(self, image, *, task: str) -> list[GroundedObject]: ...

class SegmentationProvider(Protocol):        # 合并 SAM2/SAM/其他
    def segment(self, image, objects: list[GroundedObject], *,
                mode: Literal["auto", "point", "box", "bbox"] = "bbox") -> dict[str, Mask]: ...

class ImageEditProvider(Protocol):           # 终极融合
    def edit(self, *, original, reference, mask, prompt, work_dir) -> Image: ...

class GenerativeRepairProvider(Protocol):     # 补图/重建
    def repair(self, image, mask, prompt) -> Image: ...
```

把 ImageLayerAgent 的 4 个 Protocol 升级成 5 个，新增 `GenerativeRepairProvider` —— 因为现在 `product_reconstruct` 还在用 OpenCV 凸包补全（heuristic，效果差），未来接 FLUX Kontext/DreamOmni2 时这层有预留位置。

### 3.3 Provider 迁移表

| 现状 | 迁移目标 | 备注 |
|---|---|---|
| `sam-agent-tool.engine.SAMTool` | `providers/segment/sam_local.py` | 暴露 `mode="auto" / "point" / "box" / "bbox"` 四种入参；保留 `exporter.py` 的输出格式 |
| `sam-agent-tool.agent.SAMAgent` | 拆掉，`run_with_timing` 装饰器进入 `core/timing.py` | 不再需要这一层（业务编排自己负责策略） |
| `ImageLayerAgent.PaddleOCRCloudProvider` | `providers/ocr/paddleocr_cloud.py` | 不动 |
| `ImageLayerAgent.HumanParsingProvider` | `providers/parse/schp_human_parser.py` | 拆 optional 依赖 |
| `ImageLayerAgent.OpenAIVisionPlanner` | `providers/vision/openai_vision.py` | 协议化 |
| `ImageLayerAgent.OpenAIImagesEditProvider` | `providers/edit/openai_images.py` | 不动 |
| `ImageLayerAgent.CustomHTTPImageEditProvider` | `providers/edit/custom_http.py` | 不动 |
| `ImageLayerAgent.DisabledImageEditProvider` | `providers/edit/none.py` | 不动 |

### 3.4 工作流抽象

```python
# workflows/base.py
class Workflow(Protocol):
    name: str
    def requires(self) -> list[str]:          # 列出需要哪些 Provider，配置缺失直接 503
    def run(self, project: Project) -> Project:  # 业务主流程
```

迁移映射：

| 旧 | 新 |
|---|---|
| `XiaohuaReplacementWorkflow.build()` | `workflows/xiaohua_replacement.py::XiaohuaReplacementWorkflow`（实现不变，注入 Provider） |
| `LayerAnalyzer.analyze()` | `workflows/layer_analysis.py::LayerAnalysisWorkflow`（不依赖特定 SAM 实现） |
| `OpenAIWorkflowAgent` | `agents/orchestrator.py`（多 Provider 编排，可恢复错误） |
| `comicFactory`（CodeCamp 里另一个项目） | 暂不动，**它和 ILA 是相邻业务，不属于这次整合范围** |

### 3.5 能力矩阵（整合后比现在多什么）

| 能力 | 整合前 ILA | 整合前 SAM | 整合后 pixelforge |
|---|---|---|---|
| 自动全图分割（无 prompt） | ❌ | ✅ SAM auto | ✅ |
| 点提示分割 | ❌ | ✅ | ✅ |
| 框提示分割 | ⚠️ bbox 触发 | ✅ | ✅ |
| 多物体批量抠图 + 透明 PNG | ❌ | ✅ | ✅ |
| OCR + 文字层回盖 | ✅ PaddleOCR | ❌ | ✅ |
| VLM 视觉规划 | ✅ | ❌ | ✅ |
| 图片编辑融合 | ✅ | ❌ | ✅ |
| 人体解析（衣服/包/鞋分类） | ✅ SCHP 可选 | ❌ | ✅ |
| Web UI | ✅ 端口 8710 | ✅ 端口 8080 | ✅ 统一端口 8700 |
| Python SDK | ❌ | ✅ | ✅（CLI + pip） |
| Agent 编排（多步 + 错误恢复） | ⚠️ OpenAIWorkflowAgent | ❌ | ✅ 升级版 |

---

## 4. 目录结构

```
pixelforge/
├── pyproject.toml                    # 一个包，统一依赖
├── README.md
├── .env.example
├── pixelforge/
│   ├── __init__.py
│   ├── api/
│   │   ├── main.py                    # FastAPI app，统一端口 8700
│   │   ├── routes/
│   │   │   ├── projects.py
│   │   │   ├── analyze.py
│   │   │   ├── replace.py            # 小画替换主入口
│   │   │   ├── segment.py            # 新增：裸分割 API（来自 sam-agent-tool）
│   │   │   ├── providers.py
│   │   │   ├── settings.py
│   │   │   └── agent.py
│   │   └── static/                    # Web UI（合并两个项目的 static/）
│   ├── core/
│   │   ├── models.py                  # Pydantic：Project、ImageManifest、GroundedObject、Mask
│   │   ├── storage.py                 # ProjectStorage
│   │   ├── manifest_io.py             # 图层/裁剪/打包 工具
│   │   ├── timing.py                  # run_with_timing 装饰器
│   │   └── errors.py
│   ├── providers/
│   │   ├── base.py                    # 5 个 Protocol
│   │   ├── ocr/
│   │   │   └── paddleocr_cloud.py
│   │   ├── vision/
│   │   │   └── openai_vision.py
│   │   ├── segment/
│   │   │   ├── sam_local.py          # ← 来自 sam-agent-tool
│   │   │   └── sam2_provider.py      # ← 来自 ILA optional-sam2
│   │   ├── edit/
│   │   │   ├── openai_images.py
│   │   │   ├── custom_http.py
│   │   │   └── none.py
│   │   ├── parse/
│   │   │   └── schp_human_parser.py
│   │   └── repair/
│   │       └── opencv_convex_hull.py  # 启发式 fallback，注释清楚未来可换 FLUX
│   ├── workflows/
│   │   ├── base.py
│   │   ├── layer_analysis.py
│   │   └── xiaohua_replacement.py
│   ├── agents/
│   │   └── orchestrator.py            # 升级自 OpenAIWorkflowAgent
│   └── cli/
│       ├── __main__.py                # `python -m pixelforge ...`
│       └── commands/
│           ├── segment.py             # 来自 sam-agent-tool 的 auto/prompt/box
│           └── replace.py
└── tests/
    ├── test_providers/
    ├── test_workflows/
    └── test_api/
```

---

## 5. 迁移路径（5 阶段，无破坏）

### Phase 1：建立骨架（0.5 天）

1. 在 `D:\学习院\CodeCamp\` 下创建 `pixelforge/`
2. 把 `pyproject.toml` 写好，依赖合并（fastapi / uvicorn / pillow / numpy / opencv / torch / torchvision / pydantic / requests + optional paddleocr/sam2 注释）
3. 把 5 个 Protocol + 目录结构铺好，**不搬代码** —— 仅空壳

### Phase 2：搬原子能力（1.5 天）

1. `providers/segment/sam_local.py` ← 几乎原样搬 `sam-agent-tool/engine.py`，只把 `process` / `process_with_prompt` / `process_with_box` 重命名成统一接口
2. `providers/ocr/paddleocr_cloud.py` ← 原样搬 `PaddleOCRCloudProvider`
3. `providers/vision/openai_vision.py` ← 原样搬 `OpenAIVisionPlanner`
4. `providers/edit/*` ← 原样搬
5. `providers/parse/schp_human_parser.py` ← 原样搬
6. `providers/repair/opencv_convex_hull.py` ← 从 `image_layers.py` 抽出

每搬一个 Provider，**用一次旧 API 跑通回归测试**（`tests/test_providers/`）。

### Phase 3：搬工作流（1 天）

1. `workflows/layer_analysis.py` ← 简化 `LayerAnalyzer.analyze()`，让它从 `ProviderRegistry` 拿分割 Provider
2. `workflows/xiaohua_replacement.py` ← 简化 `XiaohuaReplacementWorkflow.build()`，只注入
3. `core/storage.py` ← 合并 `ProjectStorage` 和 sam-agent-tool 的 `exporter.py` 的输出
4. `core/manifest_io.py` ← 合并 `image_layers.py` 和 `exporter.py` 的工具函数

### Phase 4：合并 API 层（1 天）

1. `api/main.py`：统一一个 FastAPI app、一个端口
2. 路由合并：
   - `/api/projects/*`（来自 ILA）
   - `/api/segment`（来自 sam-agent-tool，新）
   - `/api/providers/status`、`/api/settings`
3. `static/`：保留 ILA 的 `index.html`，把 sam-agent-tool 的上传页逻辑并进来（"上传图 → 选模式 → 看 mask"）

### Phase 5：CLI + 收尾（0.5 天）

1. `cli/__main__.py` 提供 `python -m pixelforge segment auto|point|box` 和 `python -m pixelforge replace --project <id>`
2. README 写清楚和 ILA / sam-agent-tool 的关系
3. 旧项目 README 顶部加 banner：「已迁移到 [pixelforge](../pixelforge)，本仓库不再维护」

> 旧项目可以保留在原位 1 个版本周期（不删，方便回滚），Phase 5 之后设 archived。

---

## 6. 关键设计原则

1. **协议优先于实现**：所有 Provider 必须实现 Protocol，能用 duck typing 注入
2. **配置即代码**：`.env` schema 用 Pydantic 模型导出文档，避免环境变量散落
3. **失败显式化**：每个 Provider 必须有 `available: bool` + `reason: str`，UI 直接展示"为啥不能用"
4. **不重写 working code**：启发式 / OpenCV 凸包补全虽然效果一般，但**先搬后改**，避免一次性大爆炸
5. **torch 永远可选**：SAM 在 `requirements-sam.txt` 单独放，不让 pixelforge 的 `pip install` 强制拉 2GB torch
6. **业务工作流 = 编排，不 = 算法**：workflows/ 目录只做"调用顺序 + 数据流"，不做任何 CV 算法

---

## 7. 风险与开放问题

| 风险 | 应对 |
|---|---|
| `segment-anything` 源码在 GitHub，安装时可能断网 | `requirements` 里写 git+url，README 标好手动安装步骤（照搬 sam-agent-tool） |
| PaddleOCR 强依赖 PaddlePaddle（> 1GB） | 独立 `requirements-paddleocr.txt`，走 optional 模式 |
| torch + fastapi 启动顺序——`init_agent` 失败会拖垮 Web 启动 | 用 FastAPI 的 `lifespan` 异步初始化，启动失败返回 503 而不是崩溃 |
| 旧项目用户（如果有）迁移成本 | Phase 5 之前 API 完全兼容 ILA 的 14 个端点（路径和 payload 不变） |
| 两个项目的 `ImageManifest` schema 不完全一致 | ILA 的更丰富，以它为基线；sam-agent-tool 输出从 `objects[]` 适配到 ILA 的 `layers[]` |

---

## 8. 收益预估

- **代码量**：从 ~3,300 行（ILA 2,800 + SAM 500）整合到 ~2,800 行（去掉重复的 exporter/storage 工具），**省 ~15%**
- **可测性**：每个 Provider 独立可测，工作流只测编排（不再因为 SAM 没装就跑不动）
- **可扩展**：未来接 SAM3 / Florence-2 / GPT-Image-2 只需新增一个 `providers/xxx/` 文件
- **可发布**：能 `pip install pixelforge` 给外部 Agent 用（这是 sam-agent-tool 的强项，ILA 缺）
- **业务保留**：电商替换工作流一字不动，文件输出 schema 完全兼容
