# project-helper backend

```powershell
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

配置 `DEEPSEEK_API_KEY` 后，报告和问答会使用 LangChain + DeepSeek；未配置时仍可运行本地静态分析和演示流式输出。
