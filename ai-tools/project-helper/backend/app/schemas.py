from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    repo_url: str = Field(..., min_length=8, examples=["https://github.com/tiangolo/fastapi"])
    force: bool = False


class AnalyzeResponse(BaseModel):
    project_id: int | None = None
    job_id: str | None = None
    cached: bool
    status: str
    report_md: str | None = None


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=2)


class ProjectResponse(BaseModel):
    id: int
    repo_url: str
    repo_key: str
    repo_name: str
    status: str
    report_md: str | None = None
    summary: dict | None = None
