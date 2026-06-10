# pixelforge

像素级图片理解 + 编辑工作流引擎。

将图片解构成独立的像素层（主体、背景、服饰等），用 VLM 规划编辑方案，由 AI 生成模型执行指令。支持纯 CPU 运行，可作为本地服务或 Web UI 使用。

---

## 功能

| 功能 | 说明 |
|------|------|
| **图片解构成图** | 将任意图片拆分为独立语义层（主体、背景、服饰、配件等），支持遮罩导出 |
| **人体解析** | 细粒度人体部位分割（20 类 LIP 标签），支持上衣、裤子、裙子、配饰等独立图层 |
| **物体识别定位** | 用 VLM 在图片中定位目标物体，输出边界框 |
| **AI 图片编辑** | 调用 MiniMax 图片生成模型完成指定区域的替换或编辑 |
| **智能修复** | 切割后区域自动凸包补全，支持 OpenCV 几何修复或 AI 生成式修复 |
| **结果预览** | 图层叠加、遮罩可视化、编辑前后对比 |
| **Web UI** | 上传图片 → 选择目标 → 查看处理结果，全程可视化操作 |
| **CLI** | 命令行批量处理，适合集成到自动化流程 |

---

## 环境准备

### 1. 创建虚拟环境（推荐）

```bash
cd D:\学习院\CodeCamp\pixelforge
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate    # Linux / macOS
```

### 2. 安装

```bash
# 完整安装（含所有 Provider）
pip install -e ".[sam,schp,dev]"

# 最小安装（仅 Web UI + 核心功能，无本地分割/解析）
pip install -e .
```

> [!NOTE]
> `segment-anything` 从 GitHub 安装，若网络不通可先设置代理：
> `git config --global https.proxy http://127.0.0.1:7890`

### 3. 下载模型权重

| 权重文件 | 大小 | 用途 | 下载命令 |
|----------|------|------|----------|
| `sam_vit_b_01ec64.pth` | ~375 MB | SAM 分割（vit_b） | 见下方 |
| `exp-schp-201908261155-lip.pth` | ~267 MB | 人体解析（SCHP / LIP） | 见下方 |

**下载地址（官方）：**

```bash
# 权重存放目录
mkdir -p checkpoints

# SAM vit_b（Meta 官方）
curl -L -o checkpoints/sam_vit_b_01ec64.pth \
  https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth

# SCHP 人体解析（LIP 数据集权重）
python -c "
import gdown, os
url = 'https://drive.google.com/uc?id=1k4dllHpu0bdx38J7H28rVVLpU-kOHmnH'
gdown.download(url, 'checkpoints/exp-schp-201908261155-lip.pth', quiet=False)
"
```

若 gdown 无法下载 Google Drive 链接，可通过浏览器访问 [https://drive.google.com/file/d/1k4dllHpu0bdx38J7H28rVVLpU-kOHmnH/view](https://drive.google.com/file/d/1k4dllHpu0bdx38J7H28rVVLpU-kOHmnH/view) 手动下载后放入 `checkpoints/` 目录。

### 4. 配置 `.env`

在项目根目录创建 `.env` 文件（参考 `.env.example`）：

```env
# MiniMax API（在 https://www.minimaxi.com/ 开放平台获取）
MINIMAX_API_KEY=eyJ......n

# MiniMax API 地址（默认无需修改）
MINIMAX_BASE_URL=https://api.minimax.chat/v1

# 启用视觉定位（Grounding / 规划替换区域）
MINIMAX_VISION_PLAN_ENABLED=1

# 启用图像编辑（产品替换）
MINIMAX_IMAGE_EDIT_ENABLED=1

# MiniMax 视觉和图像模型（默认）
MINIMAX_VISION_MODEL=MiniMax-VL-01
MINIMAX_IMAGE_MODEL=image-01
MINIMAX_IMAGE_QUALITY=medium

# PaddleOCR 云端识别（推荐）— https://paddleocr.aistudio.com/token 免费获取
PADDLEOCR_ACCESS_TOKEN=*** SAM 权重路径（可选，已下载则填入）
SAM_CHECKPOINT=./checkpoints/sam_vit_b_01ec64.pth
SAM_DEVICE=cpu

# SCHP 人体解析权重路径（可选，已下载则填入）
SCHP_CHECKPOINT=./checkpoints/exp-schp-201908261155-lip.pth
SCHP_DEVICE=cpu

# 存储
PIXELFORGE_OUTPUT_DIR=./pixelforge_runs
PIXELFORGE_PORT=8700
```

> [!IMPORTANT]
> `MINIMAX_API_KEY` 是必须项，缺一不可。
> `PADDLEOCR_ACCESS_TOKEN` 是推荐项，缺少时 OCR 功能可能受限。
> MiniMax 密钥获取：登录 [minimaxi.com](https://www.minimaxi.com/) → 开放平台 → API Keys

---

## 启动

### Web UI（推荐）

```bash
pixelforge serve
# 等价于
python -m pixelforge serve
# 默认端口 8700，打开 http://localhost:8700
```

### CLI

```bash
# 完整工作流：解图 + 编辑
pixelforge run path/to/image.jpg --prompt "把衣服换成蓝色"

# 仅分割
pixelforge segment path/to/image.jpg --output ./output/

# 查看配置和 Provider 状态
pixelforge status
```

### API 开发服务器

```bash
uvicorn pixelforge.api.main:app --port 8700 --reload
```

---

## Provider 状态说明

运行 `pixelforge status` 或打开 Web UI `/settings` 页面可查看各 Provider 当前状态：

| Provider | 必需 | 说明 |
|----------|------|------|
| OCR (PaddleOCR) | 推荐 | 云端识别，需 `PADDLEOCR_ACCESS_TOKEN` |
| Grounding (MiniMax VL) | 必须 | 物体定位，需 `MINIMAX_API_KEY` |
| Edit (MiniMax Images) | 必须 | 图片编辑，需 `MINIMAX_API_KEY` |
| Repair (OpenCV) | ✅ | 凸包修复，无需额外配置，始终可用 |
| Segmentation (SAM) | 可选 | 本地分割，需下载权重文件 |
| Human Parser (SCHP) | 可选 | 人体解析，需下载权重文件 |

缺少 SAM 和 SCHP 权重时，相应 Provider 显示 `⚠️`，但不影响核心工作流（会 fallback 到基础方案）。

---

## 目录结构

```
pixelforge/
├── checkpoints/              # 权重文件（需手动下载）
│   ├── sam_vit_b_01ec64.pth
│   └── exp-schp-201908261155-lip.pth
├── pixelforge/               # 源码包
│   ├── providers/            # 各功能 Provider 实现
│   │   ├── ocr/              # 文字识别
│   │   ├── vision/           # VLM 视觉规划
│   │   ├── segment/          # 图像分割（SAM）
│   │   ├── parse/            # 人体解析（SCHP）
│   │   ├── edit/             # AI 图片编辑
│   │   └── repair/           # 区域修复
│   ├── workflows/             # 业务工作流编排
│   ├── agents/               # 多 Agent 协作
│   ├── api/                  # FastAPI Web 服务
│   ├── cli/                  # 命令行入口
│   └── core/                 # 核心模型、配置、存储
├── .env                      # 环境变量（API Key 等，不提交）
├── .env.example               # 环境变量模板
├── pixelforge_runs/          # 处理结果输出目录
├── .venv/                    # Python 虚拟环境
└── pyproject.toml
```

---

## 许可证

MIT
