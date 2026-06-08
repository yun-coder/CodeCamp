# project-helper

项目学习助手：输入 GitHub 仓库地址，自动克隆、扫描、缓存并生成源码学习报告，支持基于源码的流式问答。

## 后端

```powershell
cd backend
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

`.env` 中配置：

```text
DEEPSEEK_API_KEY=你的 Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4
```

运行数据默认写入 `backend/runtime-data/`。未配置 Key 时仍可运行本地静态分析，并以流式方式返回可验证的工具检索结果。

## 前端

```powershell
cd frontend
npm install
npm run dev
```

访问 `http://127.0.0.1:5173`。
