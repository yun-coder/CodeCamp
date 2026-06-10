# SAM Agent Tool

> ⚠️ **ARCHIVED** — sam-agent-tool 已迁移到 **[pixelforge](../pixelforge)**。本仓库不再维护。
>
> - 新代码、文档、安装说明：`D:\学习院\CodeCamp\pixelforge`
> - 迁移设计与路线图：`D:\学习院\CodeCamp\meta-workflow\ANALYSIS.md`
> - 旧仓库将保留 1 个版本周期供回滚，之后归档。
>
> 旧 CLI（`python -m sam_agent_tool auto -i image.jpg`）在 pixelforge 中对应：
> ```bash
> pip install -e ".[sam]"          # 装 SAM 依赖
> python -m pixelforge segment auto -i image.jpg -c sam_vit_b.pth
> ```
> 旧 SDK（`from sam_agent_tool import SAMTool`）在 pixelforge 中对应：
> ```python
> from pixelforge.providers.segment import SAMLocalSegmenter
> ```

---

基于 Meta AI 的 [Segment Anything Model (SAM)](https://github.com/facebookresearch/segment-anything) 封装的分割工具，支持 **CLI 命令行** 和 **Python SDK** 两种使用方式，输出结构化 JSON + 裁剪物体图 + 可视化叠加图，适合作为 agent 工作流的标准组件。

## 安装

```bash
cd D:\学习院\sam-agent-tool
pip install -e .
```

如果下载 segment-anything 遇到网络问题，可以先手动安装：

```bash
pip install git+https://github.com/facebookresearch/segment-anything.git
pip install -e .
```

需要预先安装 PyTorch：

```bash
# CPU 版
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# CUDA 版
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

## 下载模型

| 模型 | 大小 | 下载 |
|------|------|------|
| ViT-B (推荐) | 358MB | [sam_vit_b_01ec64.pth](https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth) |
| ViT-L | 1.2GB | [sam_vit_l_0b3195.pth](https://dl.fbaipublicfiles.com/segment_anything/sam_vit_l_0b3195.pth) |
| ViT-H (最准) | 2.4GB | [sam_vit_h_4b8939.pth](https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth) |

## 使用方式

### CLI 命令行

```bash
# 自动分割所有物体
python -m sam_agent_tool auto -i image.jpg -o out/ -c sam_vit_b.pth

# 用坐标点指定物体
python -m sam_agent_tool prompt -i image.jpg -o out/ -c sam_vit_b.pth -p "500,375"

# 用矩形框指定物体
python -m sam_agent_tool box -i image.jpg -o out/ -c sam_vit_b.pth -b "100,100,500,400"

# 批量处理文件夹
python -m sam_agent_tool auto -i images/ -o out/ -c sam_vit_b.pth
```

### Python SDK

```python
from sam_agent_tool import SAMTool

# 初始化（模型只加载一次，可复用）
tool = SAMTool(checkpoint="sam_vit_b.pth", model_type="vit_b", device="cpu")

# 自动分割
result = tool.auto_segment("image.jpg", output_dir="out/auto/")
print(f"Found {result['total_objects']} objects")

# 点提示分割
result = tool.prompt_segment("image.jpg", output_dir="out/prompt/",
                             points=[(500, 375)])

# 框提示分割
result = tool.box_segment("image.jpg", output_dir="out/box/",
                          box=(425, 600, 700, 875))

# 遍历结果
for obj in result["objects"]:
    print(obj["id"], obj["bbox"], obj["score"])
    # 每个物体都生成了 mask 图和裁剪图
    print("  mask:", obj["mask_file"])
    print("  crop:", obj["crop_file"])
```

## 输出结构

```
out/
├── result.json       # 结构化结果（agent 可直接解析）
├── overlay.png       # 原图 + 所有 mask 的叠加可视化
├── masks/            # 每个物体的二值 mask (PNG)
│   ├── mask_000.png
│   └── mask_001.png
└── crops/            # 每个物体裁剪到透明背景的图 (PNG)
    ├── crop_000.png
    └── crop_001.png
```

### result.json 示例

```json
{
  "image": {"path": "", "width": 1200, "height": 800},
  "mode": "auto",
  "total_objects": 5,
  "objects": [
    {
      "id": 0,
      "bbox": {"x": 100, "y": 200, "w": 150, "h": 180},
      "area": 23500,
      "score": 0.95,
      "stability": 0.98,
      "point": [150, 290],
      "mask_file": "masks/mask_000.png",
      "crop_file": "crops/crop_000.png"
    }
  ]
}
```

## Windows 注意事项

如果运行报 `OMP: Error #15`，设置环境变量：

```powershell
[Environment]::SetEnvironmentVariable("KMP_DUPLICATE_LIB_OK", "TRUE", "User")
```

## License

MIT
