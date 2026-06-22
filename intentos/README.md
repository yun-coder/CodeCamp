# IntentOS — 意图驱动的操作系统

> 一个 AI 优先的 OS 演示。后端用 **AutoGen 0.4 + MiniMax-M3** 真实 LLM 流式输出；
> 前端用 **印刷感 × 终端感** 的双层叠设计；8 个中文场景覆盖意图优先 OS 的核心交互。

![demo](https://placeholder/badge)  <!-- 这里以后可以替换成 demo 截图 -->

---

## 🎯 这是什么

**IntentOS** 不是另一个 "AI 聊天界面"，是一个完整的 **OS 范式 demo**：

| 传统 OS（Windows / macOS） | IntentOS |
|---|---|
| 多窗口 + 应用切换 | 一个连续画布 |
| 桌面图标 + 文件夹 | 顶部状态 + 意图栏 |
| 菜单 + 工具栏 | 全局「意图栏」单输入 |
| 用户主动操作应用 | OS 主动调度（续接 / 冲突检测 / 跨域警告） |
| 一次性会话 | 持续人格（记得你 3 天前在做什么） |

后端真的接入了 **MiniMax-M3**（`api.minimaxi.com/v1`），所有 LLM 回复都是真实生成，**不是预设剧本**。

---

## 🏗 架构

```
D:\学习院\CodeCamp\intentos\
├── backend/                # Python 后端
│   ├── intentos/
│   │   ├── __init__.py
│   │   ├── __main__.py     # python -m intentos 入口
│   │   ├── config.py       # Pydantic Settings 配置
│   │   ├── llm.py          # AutoGen 0.4 客户端 + 流式
│   │   ├── scenarios.py    # 8 个中文场景
│   │   └── server.py       # FastAPI + SSE
│   ├── requirements.txt
│   └── .env                # MiniMax API key（不提交）
├── frontend/                # 浏览器端（无构建）
│   ├── templates/
│   │   └── index.html
│   └── static/
│       ├── styles.css      # 印刷 + 终端双层叠
│       └── app.js          # 状态机 + SSE 解析
├── docs/                    # 截图 / 设计稿
├── scripts/                 # 工具脚本
├── .env                     # 根 .env（兼容）
└── README.md
```

---

## 🚀 快速开始

### 1. 装依赖

```bash
cd D:\学习院\CodeCamp\intentos\backend
pip install -r requirements.txt
```

> 已验证版本：autogen-agentchat 0.7.5 / fastapi 0.133.1 / pydantic 2.x

### 2. 配置 .env

把下面写到 `backend/.env`（或项目根 `.env`）：

```env
MINIMAX_API_KEY=sk-cp-你的key
MINIMAX_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_MODEL=MiniMax-M3
USE_REAL_LLM=true
HOST=127.0.0.1
PORT=8765
```

> 如果你的 key 写在 `~/.hermes/.env`（Hermes 全局 .env），本项目会自动读，不用复制。

### 3. 启动

```bash
cd D:\学习院\CodeCamp\intentos\backend
python -m intentos
```

输出：
```
▣ IntentOS v0.1.0 starting on http://127.0.0.1:8765
  model: MiniMax-M3
  real_llm: True
INFO:     Uvicorn running on http://127.0.0.1:8765
```

### 4. 打开浏览器

```
http://127.0.0.1:8765
```

---

## 🎬 8 个场景一览

按"出圈"程度从高到低：

| # | 场景 | 触发关键词 | 它证明什么 |
|---|---|---|---|
| 1 | **隐私警告** | 老婆 / 购物车 / 礼物 | OS 有边界感，不盲从用户 |
| 2 | **自然语言照片搜索** | 京都 / 樱花 / 大理 | 语义检索 > 关键词检索 |
| 3 | **复合操作（邮件+日历）** | 发给 / 约会议 | 一句话 = 多步任务 + 冲突检测 |
| 4 | **出差规划** | 出差 / 上海 / trip | OS 调度多个 API（航班+酒店+日历+家庭） |
| 5 | **段落改写 + 修订历史** | 重写 / 悲观 | AI 动过的字有据可查 |
| 6 | **电子相册** | 相册 / 大理 / 云南 | 多模态 + 创意生成 |
| 7 | **一周回顾** | 周报 / 做了什么 | 跨 4 个数据源自动汇总 |
| 8 | **开机主动续接** | （自动触发） | OS 有持续人格，不是无状态工具 |

每个场景都返回 3 段信息：
- **画布 HTML**（中间：精心设计的卡片）
- **数据源卡片**（右侧：OS 调了哪些数据）
- **活动流**（右侧：OS 做了哪些操作）

---

## 🔧 关键设计决策

### 1. 为什么不直接用 AssistantAgent？

`AssistantAgent.on_messages_stream` 内部会调 `BaseChatMessage.to_model_message()`，
在 autogen 0.7.5 的某些路径上抛 `AttributeError`。

我们的需求很明确：**一次 chat completion + 流式 text out**，
不需要 agent 的"对话历史/工具循环"能力。

所以直接用底层 `OpenAIChatCompletionClient.create_stream()`：

```python
async for ev in client.create_stream(messages=[sys_msg, user_msg]):
    if isinstance(ev, str):
        yield _strip_think(ev)  # 过滤 <think>...</think>
```

见 `backend/intentos/llm.py:160-230`。

### 2. 为什么 LLM 负责"说人话"，场景路由用关键词？

LLM 容易编造/截断 HTML；场景里有大量硬数据（"8.2%"、"24,891 张照片"）需要精确展示。

所以分两层：
1. **LLM 自由生成回复**（流式）
2. **场景路由**（关键词匹配）选一个硬编码的卡片 HTML

未来升级方向：让 LLM 在卡片 HTML 里填空，但骨架仍由代码控制。

### 3. 为什么要"印刷感 + 终端感"双层叠？

单一美学会腻：
- 纯印刷感（暖纸+serif）像博物馆展品
- 纯终端感（黑底+mono）像 1990s 黑客电影

叠加后，**意图部分要"思考"（印刷感）**，**执行部分要"运转"（终端感）**。

配色：
- `#f0e6d2` 暖纸
- `#0a0a0a` 墨黑
- `#e63946` 朱砂（唯一高亮色）

字体：
- `Space Grotesk`（拉丁标题）+ `Noto Serif SC`（中文标题）
- `IBM Plex Mono`（系统信息）+ `Noto Sans SC`（正文）

### 4. 场景里的"隐私警告"是设计哲学的体现

> "你刚刚让 OS 查看老婆的购物车。"

这是哲学表态：**OS 不只是工具，它有边界感**。
即使你说"给我看"，OS 也会先问"你应该看吗？"

对应 `backend/intentos/scenarios.py` 里 `privacy` 场景的 HTML。

---

## 🐛 已知的坑

| 坑 | 解决办法 |
|---|---|
| `pip install autogen-agentchat` 报一堆冲突但实际没装 | 先 `python -m ensurepip`，然后重装 |
| `ModelInfo` 不在 `autogen_agentchat.models` | 改从 `autogen_core.models` 导入 |
| `UserMessage(content, source)` 来自 `autogen_core.models`，但 `AssistantAgent` 要 `TextMessage` | 给 Agent 喂 `TextMessage`，底层 client 才用 `UserMessage` |
| MiniMax 的 `create_stream` yield 包含 `<think>...</think>` 块 | 客户端做轻量状态机过滤（见 `llm.py:194-228`） |
| curl 测试中文 JSON body 报 422 | 用 `--data-binary @file.json` 避免 bash 转义问题 |

---

## 🧪 手工测试

启动后可以试这些 prompt（中文）：

- `找一张去年在京都拍的、妈妈和樱花树的那张照片` → 触发 photo_search
- `把 Q3 营收下降那段重写得更悲观一点` → 触发 rewrite
- `把这份报告发给小李，并约他明天下午 3 点聊 Q4` → 触发 compound
- `这周我都做了什么` → 触发 weekly
- `我下周三去上海出差，帮我订机票+酒店+行程` → 触发 trip
- `把去年云南大理的旅行做成相册` → 触发 album
- `看看老婆的购物车里有什么` → 触发 privacy 警告 ⚠
- `继续上次的工作` → 触发 welcome 续接

也可以在底部输入任何自由 prompt，OS 会用 LLM 自由回复。

---

## 📦 部署提示

单进程 FastAPI + SSE 已经够 demo 用。生产部署注意：

- SSE 一定要发 `X-Accel-Buffering: no`（防 nginx 缓冲）
- 用 `gunicorn -k uvicorn.workers.UvicornWorker` 多 worker
- LLM 调用是阻塞 IO，建议加请求队列
- `.env` 不要提交到 git

---

## 📝 License

MIT.

---

## 🙏 致谢

- **AutoGen 0.4** — Microsoft 的 multi-agent 框架
- **MiniMax-M3** — 流式中文 LLM（OpenAI 兼容）
- **前端 design 参考** — `frontend-design` skill
- **win11React** — 同等哲学（"单文件 + 零依赖"）的灵感来源
