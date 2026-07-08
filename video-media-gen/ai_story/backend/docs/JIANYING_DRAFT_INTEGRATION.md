# 剪映草稿生成功能集成文档

## 功能概述

剪映草稿生成功能允许在图生视频阶段完成后，自动将多个视频片段和字幕拼接生成剪映草稿项目，可直接在剪映中打开编辑。

## 核心组件

### 1. JianyingDraftGenerator 服务类

**位置:** `backend/core/services/jianying_draft_service.py`

**职责:**
- 封装 pyJianYingDraft 库的复杂逻辑
- 提供统一的剪映草稿生成接口
- 支持视频拼接、字幕添加、背景音乐、转场动画等

**主要方法:**

```python
# 方法1: 从视频文件列表生成草稿
draft_path = generator.generate_draft(
    project_name="我的项目",
    video_files=["/path/to/video1.mp4", "/path/to/video2.mp4"],
    subtitles=["字幕1", "字幕2"],
    background_music="/path/to/music.mp3",
    width=1080,
    height=1920
)

# 方法2: 从项目场景数据生成草稿（推荐）
draft_path = generator.generate_from_project_data(
    project_name="我的项目",
    scenes=[
        {
            "video_urls": [{"url": "/path/to/video1.mp4"}],
            "narration_text": "这是第一个场景的字幕"
        },
        {
            "video_urls": [{"url": "/path/to/video2.mp4"}],
            "narration_text": "这是第二个场景的字幕"
        }
    ],
    background_music="/path/to/music.mp3"
)
```

### 2. Celery异步任务

**位置:** `backend/apps/projects/tasks.py`

**任务名:** `generate_jianying_draft`

**特性:**
- 异步执行，不阻塞HTTP请求
- 通过Redis Pub/Sub实时推送进度
- 支持失败自动重试（最多2次）
- 超时控制：软超时5分钟，硬超时10分钟

**执行流程:**
1. 检查视频生成阶段是否完成
2. 提取有效的视频场景数据
3. 调用JianyingDraftGenerator生成草稿
4. 将草稿路径保存到Project.jianying_draft_path字段
5. 通过Redis Pub/Sub推送实时进度

### 3. REST API接口

**位置:** `backend/apps/projects/views.py`

**接口:** `POST /api/v1/projects/{id}/generate-jianying-draft/`

**请求示例:**

```bash
curl -X POST "http://localhost:8000/api/v1/projects/{project_id}/generate-jianying-draft/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "background_music": "/path/to/music.mp3",
    "draft_folder_path": "/Users/username/Documents/JianyingPro Drafts",
    "music_volume": 0.6,
    "add_intro_animation": true,
    "subtitle_size": 15,
    "width": 1080,
    "height": 1920
  }'
```

**响应示例:**

```json
{
  "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "channel": "ai_story:project:xxx-xxx-xxx:jianying_draft",
  "message": "剪映草稿生成任务已启动",
  "websocket_url": "/ws/projects/xxx-xxx-xxx/jianying_draft/"
}
```

**前端接收实时进度:**

方式1: WebSocket订阅（推荐）
```javascript
const ws = new WebSocket(`ws://localhost:8000/ws/projects/${projectId}/jianying_draft/`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'stage_update') {
    console.log('进度:', data.progress, '%');
    console.log('消息:', data.message);
  } else if (data.type === 'done') {
    console.log('草稿路径:', data.metadata.draft_path);
    console.log('视频数量:', data.metadata.video_count);
  } else if (data.type === 'error') {
    console.error('错误:', data.error);
  }
};
```

方式2: Redis Pub/Sub（后端监听）
```python
import redis

r = redis.Redis.from_url(settings.REDIS_PUBSUB_URL)
pubsub = r.pubsub()
pubsub.subscribe(channel)

for message in pubsub.listen():
    if message['type'] == 'message':
        data = json.loads(message['data'])
        print(data)
```

### 4. 数据库模型字段

**位置:** `backend/apps/projects/models.py`

**新增字段:**

```python
class Project(models.Model):
    # ... 其他字段 ...
    jianying_draft_path = models.CharField(
        '剪映草稿路径',
        max_length=500,
        blank=True,
        default=''
    )
```

## 配置说明

### 1. 剪映草稿文件夹配置

在 `config/settings/base.py` 中添加：

```python
# 剪映草稿文件夹路径
# Windows: r"D:\JianyingPro Drafts"
# macOS: "/Users/username/Documents/JianyingPro Drafts"
JIANYING_DRAFT_FOLDER = os.path.expanduser('~/Documents/JianyingPro Drafts')
```

### 2. 存储路径配置

确保 `STORAGE_ROOT` 配置正确，视频和音频文件将从此路径读取：

```python
STORAGE_ROOT = os.path.join(BASE_DIR, '..', 'storage')
```

目录结构：
```
storage/
├── video/       # 生成的视频文件
├── audio/       # 背景音乐文件
├── image/       # 生成的图片文件
└── subtitle/    # 字幕文件（可选）
```

## 使用流程

### 完整工作流

1. **创建项目** → 2. **文案改写** → 3. **分镜生成** → 4. **文生图** → 5. **运镜生成** → 6. **图生视频** → **7. 生成剪映草稿**

### 调用示例

```python
# 1. 前端调用API启动任务
POST /api/v1/projects/{project_id}/generate-jianying-draft/
{
  "background_music": "/path/to/music.mp3",
  "music_volume": 0.6
}

# 2. 后端返回task_id和channel
{
  "task_id": "...",
  "channel": "ai_story:project:xxx:jianying_draft"
}

# 3. 前端通过WebSocket订阅channel接收实时进度
ws://localhost:8000/ws/projects/{project_id}/jianying_draft/

# 4. 进度消息示例
{
  "type": "stage_update",
  "status": "processing",
  "progress": 30,
  "message": "找到 5 个视频片段，开始生成草稿"
}

# 5. 完成消息示例
{
  "type": "done",
  "full_text": "/path/to/draft",
  "metadata": {
    "draft_path": "/Users/xxx/Documents/JianyingPro Drafts/项目名_xxx",
    "video_count": 5
  }
}
```

## 可选参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `background_music` | string | null | 背景音乐文件路径 |
| `draft_folder_path` | string | 配置值 | 草稿保存路径 |
| `music_volume` | float | 0.6 | 背景音乐音量（0-1） |
| `music_fade_in` | string | "1s" | 音乐淡入时长 |
| `music_fade_out` | string | "0s" | 音乐淡出时长 |
| `add_intro_animation` | boolean | true | 是否为第一个视频添加入场动画 |
| `subtitle_font` | string | "抖音美好体" | 字幕字体 |
| `subtitle_color` | tuple | (1, 0.749, 0.09) | 字幕颜色RGB |
| `subtitle_size` | int | 15 | 字幕大小 |
| `subtitle_position_y` | float | -0.73 | 字幕Y轴位置（-1到1） |
| `width` | int | 1080 | 视频宽度 |
| `height` | int | 1920 | 视频高度（竖屏） |

## 部署步骤

### 1. 安装依赖

```bash
cd backend
uv add pyJianYingDraft
```

### 2. 创建数据库迁移

```bash
uv run python manage.py makemigrations projects
uv run python manage.py migrate
```

### 3. 配置剪映草稿路径

编辑 `config/settings/base.py`：

```python
JIANYING_DRAFT_FOLDER = os.path.expanduser('~/Documents/JianyingPro Drafts')
```

### 4. 启动Celery Worker

```bash
# 确保Redis已启动
brew services start redis  # macOS
# 或 docker run -d -p 6379:6379 redis:latest

# 启动Celery Worker
uv run celery -A config worker -Q llm,image,video -l info
```

### 5. 启动Django服务器

```bash
# ASGI模式（推荐，支持WebSocket）
./run_asgi.sh
# 或
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

## 故障排查

### 1. 任务执行失败

**检查Celery Worker日志:**
```bash
uv run celery -A config worker -l debug
```

**常见错误:**
- `ModuleNotFoundError: No module named 'pyJianYingDraft'`
  - 解决：`uv add pyJianYingDraft`

- `FileNotFoundError: 视频文件不存在`
  - 检查STORAGE_ROOT配置
  - 检查视频文件是否已生成

- `PermissionError: 无法写入草稿文件夹`
  - 检查JIANYING_DRAFT_FOLDER路径权限

### 2. WebSocket连接失败

**检查ASGI服务器是否运行:**
```bash
ps aux | grep daphne
```

**检查WebSocket路由配置:**
```bash
# 在Django shell中测试
cd backend && uv run python manage.py shell
>>> from apps.projects.routing import websocket_urlpatterns
>>> print(websocket_urlpatterns)
```

### 3. Redis连接失败

**测试Redis连接:**
```bash
redis-cli ping  # 应返回 PONG
```

**检查Redis配置:**
```python
# config/settings/base.py
REDIS_PUBSUB_URL = 'redis://localhost:6379/2'
```

## 测试示例

### Python测试

```python
from core.services.jianying_draft_service import JianyingDraftGenerator

# 创建生成器
generator = JianyingDraftGenerator()

# 测试数据
scenes = [
    {
        "video_urls": [{"url": "/path/to/video1.mp4"}],
        "narration_text": "第一个场景"
    },
    {
        "video_urls": [{"url": "/path/to/video2.mp4"}],
        "narration_text": "第二个场景"
    }
]

# 生成草稿
draft_path = generator.generate_from_project_data(
    project_name="测试项目",
    scenes=scenes
)

print(f"草稿路径: {draft_path}")
```

### curl测试

```bash
# 获取token
TOKEN=$(curl -X POST "http://localhost:8000/api/v1/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  | jq -r '.access')

# 调用接口
curl -X POST "http://localhost:8000/api/v1/projects/{project_id}/generate-jianying-draft/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "width": 1080,
    "height": 1920
  }'
```

## 注意事项

1. **视频路径处理:**
   - 系统会自动将URL转换为本地路径
   - 视频文件必须存储在 `STORAGE_ROOT/video/` 目录下

2. **字幕数据来源:**
   - 从 `Storyboard.narration_text` 读取
   - 视频片段从 `GeneratedVideo` 的已完成记录中按分镜顺序聚合
   - 如果字幕为空，将使用空字符串

3. **草稿命名规则:**
   - 格式：`{项目名}_{项目ID}`
   - 允许替换已存在的草稿（`allow_replace=True`）

4. **性能考虑:**
   - 视频数量较多时，生成时间会较长
   - 建议限制单个项目的视频片段数量在20个以内
   - 可通过调整Celery的soft_time_limit和time_limit来控制超时

5. **跨平台兼容性:**
   - Windows和macOS的剪映草稿路径不同
   - 需要根据操作系统配置正确的JIANYING_DRAFT_FOLDER路径

## 扩展开发

### 添加自定义转场效果

编辑 `core/services/jianying_draft_service.py`：

```python
def _add_video_segments(self, script, video_files, subtitles, options):
    # ... 现有代码 ...

    # 在视频片段之间添加转场
    if previous_segment:
        # 添加转场效果
        # transition = draft.Transition(...)
        # script.add_transition(transition)
        pass
```

### 添加自定义字幕样式

```python
# 在options中添加新参数
custom_style = options.get('subtitle_style', {})

text_segment = draft.TextSegment(
    text,
    timerange,
    font=custom_style.get('font', draft.FontType.抖音美好体),
    style=draft.TextStyle(
        color=custom_style.get('color', (1, 0.749, 0.09)),
        size=custom_style.get('size', 15),
        # ... 更多自定义属性
    )
)
```

## 相关文档

- [pyJianYingDraft 官方文档](https://github.com/yourusername/pyJianYingDraft)
- [Celery + Redis 流式架构](./CELERY_REDIS_STREAMING.md)
- [项目 API 文档](../README.md#API文档)
