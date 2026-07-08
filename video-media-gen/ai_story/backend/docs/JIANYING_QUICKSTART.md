# 剪映草稿生成功能 - 快速开始

## 一、前置条件

1. ✅ 已安装 pyJianYingDraft 依赖
2. ✅ 项目的视频生成阶段已完成
3. ✅ Redis 服务已启动
4. ✅ Celery Worker 已运行

## 二、快速部署（5分钟）

### 步骤1: 数据库迁移

```bash
cd backend
uv run python manage.py makemigrations projects
uv run python manage.py migrate
```

### 步骤2: 配置剪映路径（可选）

编辑 `backend/config/settings/base.py`，添加：

```python
# 剪映草稿文件夹路径
JIANYING_DRAFT_FOLDER = os.path.expanduser('~/Documents/JianyingPro Drafts')
```

**默认路径:**
- macOS: `~/Documents/JianyingPro Drafts`
- Windows: 需手动配置

### 步骤3: 重启服务

```bash
# 重启Django服务器（ASGI模式）
./run_asgi.sh

# 重启Celery Worker
uv run celery -A config worker -Q llm,image,video -l info
```

## 三、API调用示例

### 方式1: 使用curl

```bash
curl -X POST "http://localhost:8000/api/v1/projects/{项目ID}/generate-jianying-draft/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 方式2: 使用Python requests

```python
import requests

# 登录获取token
response = requests.post('http://localhost:8000/api/v1/auth/login/', json={
    'username': 'admin',
    'password': 'password'
})
token = response.json()['access']

# 调用剪映草稿生成接口
response = requests.post(
    f'http://localhost:8000/api/v1/projects/{project_id}/generate-jianying-draft/',
    headers={'Authorization': f'Bearer {token}'},
    json={}  # 使用默认参数
)

result = response.json()
print(f"任务ID: {result['task_id']}")
print(f"WebSocket URL: {result['websocket_url']}")
```

### 方式3: 使用JavaScript (前端)

```javascript
// 调用API
const response = await fetch(`/api/v1/projects/${projectId}/generate-jianying-draft/`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    music_volume: 0.6,
    add_intro_animation: true
  })
});

const { task_id, websocket_url } = await response.json();

// 建立WebSocket连接接收进度
const ws = new WebSocket(`ws://localhost:8000${websocket_url}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch(data.type) {
    case 'stage_update':
      console.log(`进度: ${data.progress}% - ${data.message}`);
      break;
    case 'done':
      console.log(`草稿路径: ${data.metadata.draft_path}`);
      console.log(`视频数量: ${data.metadata.video_count}`);
      break;
    case 'error':
      console.error(`错误: ${data.error}`);
      break;
  }
};
```

## 四、常用参数配置

### 基础参数（推荐）

```json
{
  "width": 1080,
  "height": 1920,
  "music_volume": 0.6,
  "add_intro_animation": true
}
```

### 高级参数

```json
{
  "background_music": "/path/to/music.mp3",
  "draft_folder_path": "/custom/path/to/drafts",
  "music_volume": 0.8,
  "music_fade_in": "2s",
  "music_fade_out": "1s",
  "add_intro_animation": true,
  "subtitle_size": 18,
  "subtitle_position_y": -0.7,
  "width": 1080,
  "height": 1920
}
```

## 五、验证结果

### 1. 检查任务状态

```bash
# 方法1: 查看Celery日志
tail -f celery.log

# 方法2: 查看Redis消息
redis-cli
> SUBSCRIBE ai_story:project:*

# 方法3: 查询项目数据
curl "http://localhost:8000/api/v1/projects/{项目ID}/" \
  -H "Authorization: Bearer YOUR_TOKEN"
# 检查 jianying_draft_path 字段
```

### 2. 打开剪映验证

1. 打开剪映专业版
2. 点击"草稿"标签
3. 找到名为 `{项目名}_{项目ID}` 的草稿
4. 点击打开，检查视频片段和字幕

## 六、故障排查

### 问题1: 任务立即失败

**原因:** 视频生成阶段未完成

**解决:**
```bash
# 检查项目阶段状态
curl "http://localhost:8000/api/v1/projects/{项目ID}/stages/" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 确保 video_generation 阶段 status 为 "completed"
```

### 问题2: 找不到视频文件

**原因:** 视频文件路径不正确

**解决:**
```bash
# 检查存储路径
ls backend/storage/video/

# 检查 STORAGE_ROOT 配置
grep STORAGE_ROOT backend/config/settings/base.py
```

### 问题3: 权限错误

**原因:** 无法写入剪映草稿文件夹

**解决:**
```bash
# macOS: 确保目录存在
mkdir -p ~/Documents/JianyingPro\ Drafts

# 检查权限
ls -la ~/Documents/JianyingPro\ Drafts
```

### 问题4: Celery任务不执行

**解决:**
```bash
# 1. 检查Redis是否运行
redis-cli ping

# 2. 重启Celery Worker
pkill -f "celery worker"
uv run celery -A config worker -Q llm,image,video -l debug

# 3. 手动测试任务
cd backend
uv run python manage.py shell
>>> from apps.projects.tasks import generate_jianying_draft
>>> result = generate_jianying_draft.delay('project-id', user_id=1)
>>> print(result.id)
```

## 七、最佳实践

### 1. 视频命名规范

确保生成的视频文件名清晰易懂：
- ✅ `scene_001_intro.mp4`
- ❌ `tmp_12345.mp4`

### 2. 字幕长度控制

建议每个场景的字幕不超过50个字，避免显示不全。

### 3. 视频片段数量

- 建议: 5-15个视频片段
- 最大: 不超过20个（性能考虑）

### 4. 背景音乐格式

- 支持格式: MP3, WAV, AAC
- 建议时长: 与总视频时长一致或稍长

### 5. 草稿管理

定期清理旧草稿：
```bash
# 查看草稿大小
du -sh ~/Documents/JianyingPro\ Drafts/*

# 删除30天前的草稿
find ~/Documents/JianyingPro\ Drafts -name "*" -mtime +30 -type d -exec rm -rf {} \;
```

## 八、集成到前端UI

### Vue 3 示例

```vue
<template>
  <div>
    <button @click="generateDraft" :disabled="loading">
      {{ loading ? '生成中...' : '生成剪映草稿' }}
    </button>
    <div v-if="progress">进度: {{ progress }}%</div>
    <div v-if="draftPath">草稿路径: {{ draftPath }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const loading = ref(false);
const progress = ref(0);
const draftPath = ref('');

async function generateDraft() {
  loading.value = true;

  try {
    // 调用API
    const response = await fetch(`/api/v1/projects/${projectId}/generate-jianying-draft/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        music_volume: 0.6
      })
    });

    const { websocket_url } = await response.json();

    // 建立WebSocket连接
    const ws = new WebSocket(`ws://localhost:8000${websocket_url}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'stage_update') {
        progress.value = data.progress;
      } else if (data.type === 'done') {
        draftPath.value = data.metadata.draft_path;
        loading.value = false;
        ws.close();
      } else if (data.type === 'error') {
        alert(`错误: ${data.error}`);
        loading.value = false;
        ws.close();
      }
    };
  } catch (error) {
    console.error(error);
    loading.value = false;
  }
}
</script>
```

## 九、性能优化建议

1. **缓存草稿路径:** 将生成的草稿路径缓存到数据库，避免重复生成
2. **异步处理:** 使用Celery异步执行，不阻塞用户操作
3. **限流控制:** 限制单个用户同时生成的草稿数量
4. **清理机制:** 定期清理超过30天的旧草稿

## 十、下一步

- 📖 阅读完整文档: [backend/docs/JIANYING_DRAFT_INTEGRATION.md](./JIANYING_DRAFT_INTEGRATION.md)
- 🔧 自定义配置: 调整字幕样式、转场效果等
- 🚀 前端集成: 将功能集成到Vue前端界面
- 📊 监控优化: 添加性能监控和错误追踪

## 联系支持

如有问题，请查看：
- 详细文档: `backend/docs/JIANYING_DRAFT_INTEGRATION.md`
- 系统日志: `backend/logs/`
- Celery日志: Celery Worker输出
