# Skill: API 接口开发流程

## 适用场景

开发 RESTful API 接口，确保接口设计规范、文档完整、安全可靠。

---

## RESTful API 设计原则

### 1. 资源命名规范

**URL 路径规则**:
- 使用名词复数表示资源集合: `/api/v1/sites`
- 使用小写字母和短横线: `/api/v1/workflow-runs`
- 避免动词: ❌ `/api/v1/get-sites` ✅ `/api/v1/sites`
- 层级关系清晰: `/api/v1/projects/{project_id}/sites`

**HTTP 方法与操作对应**:
```
GET     /sites          # 列出所有站点
GET     /sites/{id}     # 获取单个站点
POST    /sites          # 创建站点
PUT     /sites/{id}     # 完整更新站点
PATCH   /sites/{id}     # 部分更新站点
DELETE  /sites/{id}     # 删除站点
```

---

### 2. 统一响应格式

**成功响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "domain": "example.com"
  },
  "message": "操作成功",
  "timestamp": "2026-08-11T10:00:00Z"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "SITE_NOT_FOUND",
    "message": "站点不存在",
    "details": {
      "site_id": 999
    }
  },
  "timestamp": "2026-08-11T10:00:00Z"
}
```

**分页响应**:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "page_size": 20,
    "total_pages": 5
  }
}
```

---

### 3. HTTP 状态码规范

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | GET/PUT/PATCH 成功 |
| 201 | Created | POST 创建成功 |
| 204 | No Content | DELETE 成功 |
| 400 | Bad Request | 参数错误、格式错误 |
| 401 | Unauthorized | 未认证（需要登录） |
| 403 | Forbidden | 已认证但无权限 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突（如重复创建） |
| 422 | Unprocessable Entity | 业务逻辑错误 |
| 429 | Too Many Requests | 请求限流 |
| 500 | Internal Server Error | 服务器内部错误 |
| 503 | Service Unavailable | 服务不可用 |

---

## API 开发六步流程

### 第一步：设计 API 规范

**输出**:
- API 路径和方法
- 请求参数（Query/Path/Body）
- 响应结构
- 错误码定义

**示例文档**:
```markdown
## GET /api/v1/sites

### 描述
列出站点，支持分页和筛选

### 请求参数
- project_id (query, optional): 项目ID，筛选特定项目的站点
- status (query, optional): 站点状态 (ACTIVE/INACTIVE/ARCHIVED)
- page (query, default=1): 页码
- page_size (query, default=20, max=100): 每页数量
- sort_by (query, default=created_at): 排序字段
- sort_order (query, default=desc): 排序方向 (asc/desc)

### 响应
200 OK
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "project_id": 10,
        "domain": "example.com",
        "protocol": "https",
        "status": "ACTIVE",
        "created_at": "2026-08-01T10:00:00Z",
        "updated_at": "2026-08-10T15:30:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "page_size": 20,
    "total_pages": 3
  }
}

### 错误码
- 400: 参数错误
- 401: 未认证
```

---

### 第二步：定义 Pydantic Schema

**创建请求/响应模型**:

```python
# backend/app/schemas/site.py
from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from datetime import datetime

class SiteBase(BaseModel):
    """站点基础字段"""
    domain: str = Field(..., description="站点域名", min_length=3, max_length=255)
    protocol: Literal["http", "https"] = Field(default="https", description="协议")
    
    @validator('domain')
    def validate_domain(cls, v):
        """验证域名格式"""
        if not v or '.' not in v:
            raise ValueError("无效的域名格式")
        return v.lower()

class SiteCreate(SiteBase):
    """创建站点的请求模型"""
    project_id: int = Field(..., description="所属项目ID", gt=0)
    description: Optional[str] = Field(None, description="站点描述", max_length=500)

class SiteUpdate(BaseModel):
    """更新站点的请求模型"""
    domain: Optional[str] = Field(None, description="站点域名")
    protocol: Optional[Literal["http", "https"]] = Field(None, description="协议")
    status: Optional[Literal["ACTIVE", "INACTIVE", "ARCHIVED"]] = Field(None, description="状态")
    description: Optional[str] = Field(None, description="站点描述")

class SiteResponse(SiteBase):
    """站点响应模型"""
    id: int
    project_id: int
    status: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True  # 支持从 ORM 模型转换

class SiteListQuery(BaseModel):
    """列表查询参数"""
    project_id: Optional[int] = Field(None, description="项目ID")
    status: Optional[Literal["ACTIVE", "INACTIVE", "ARCHIVED"]] = Field(None)
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页数量")
    sort_by: str = Field("created_at", description="排序字段")
    sort_order: Literal["asc", "desc"] = Field("desc", description="排序方向")

class PaginatedSiteResponse(BaseModel):
    """分页响应模型"""
    items: list[SiteResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
```

---

### 第三步：实现 Service 层

**业务逻辑封装**:

```python
# backend/app/services/site_service.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from app.models.site import Site
from app.schemas.site import SiteCreate, SiteUpdate, SiteListQuery
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class SiteService:
    
    def create_site(self, db: Session, site_in: SiteCreate) -> Site:
        """创建站点"""
        # 检查项目是否存在
        from app.models.project import Project
        project = db.query(Project).filter(Project.id == site_in.project_id).first()
        if not project:
            raise ValueError(f"项目不存在: {site_in.project_id}")
        
        # 检查域名是否重复
        existing = db.query(Site).filter(
            Site.domain == site_in.domain,
            Site.project_id == site_in.project_id
        ).first()
        if existing:
            raise ValueError(f"域名已存在: {site_in.domain}")
        
        try:
            site = Site(**site_in.model_dump())
            db.add(site)
            db.commit()
            db.refresh(site)
            logger.info(f"Site created: {site.id} - {site.domain}")
            return site
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create site: {e}")
            raise
    
    def get_site(self, db: Session, site_id: int) -> Optional[Site]:
        """获取站点"""
        return db.query(Site).filter(Site.id == site_id).first()
    
    def list_sites(
        self, 
        db: Session, 
        query: SiteListQuery
    ) -> tuple[list[Site], int]:
        """列出站点（带筛选和分页）"""
        # 构建查询
        q = db.query(Site)
        
        # 应用筛选条件
        if query.project_id:
            q = q.filter(Site.project_id == query.project_id)
        if query.status:
            q = q.filter(Site.status == query.status)
        
        # 计算总数
        total = q.count()
        
        # 应用排序
        sort_column = getattr(Site, query.sort_by, Site.created_at)
        if query.sort_order == "desc":
            q = q.order_by(desc(sort_column))
        else:
            q = q.order_by(asc(sort_column))
        
        # 应用分页
        skip = (query.page - 1) * query.page_size
        sites = q.offset(skip).limit(query.page_size).all()
        
        return sites, total
    
    def update_site(
        self, 
        db: Session, 
        site_id: int, 
        site_in: SiteUpdate
    ) -> Optional[Site]:
        """更新站点"""
        site = self.get_site(db, site_id)
        if not site:
            return None
        
        # 只更新提供的字段
        update_data = site_in.model_dump(exclude_unset=True)
        
        # 如果更新域名，检查是否重复
        if "domain" in update_data and update_data["domain"] != site.domain:
            existing = db.query(Site).filter(
                Site.domain == update_data["domain"],
                Site.project_id == site.project_id,
                Site.id != site_id
            ).first()
            if existing:
                raise ValueError(f"域名已存在: {update_data['domain']}")
        
        for field, value in update_data.items():
            setattr(site, field, value)
        
        try:
            db.commit()
            db.refresh(site)
            logger.info(f"Site updated: {site_id}")
            return site
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to update site: {e}")
            raise
    
    def delete_site(self, db: Session, site_id: int) -> bool:
        """删除站点（软删除）"""
        site = self.get_site(db, site_id)
        if not site:
            return False
        
        try:
            # 软删除：标记为 ARCHIVED
            site.status = "ARCHIVED"
            db.commit()
            logger.info(f"Site archived: {site_id}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to archive site: {e}")
            raise
    
    def hard_delete_site(self, db: Session, site_id: int) -> bool:
        """物理删除站点（谨慎使用）"""
        site = self.get_site(db, site_id)
        if not site:
            return False
        
        try:
            db.delete(site)
            db.commit()
            logger.warning(f"Site hard deleted: {site_id}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to delete site: {e}")
            raise

site_service = SiteService()
```

---

### 第四步：创建 API Routes

**FastAPI 路由实现**:

```python
# backend/app/api/routes/sites.py
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session
from typing import Optional
from app.api.deps import get_db, get_current_user
from app.schemas.site import (
    SiteCreate, 
    SiteUpdate, 
    SiteResponse, 
    SiteListQuery,
    PaginatedSiteResponse
)
from app.schemas.response import SuccessResponse, ErrorResponse
from app.services.site_service import site_service
from app.models.user import User

router = APIRouter(prefix="/sites", tags=["sites"])

@router.post(
    "",
    response_model=SuccessResponse[SiteResponse],
    status_code=status.HTTP_201_CREATED,
    summary="创建站点",
    description="创建一个新的站点"
)
def create_site(
    site_in: SiteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    创建站点
    
    - **project_id**: 所属项目ID（必须）
    - **domain**: 站点域名（必须）
    - **protocol**: 协议 http/https（默认 https）
    - **description**: 站点描述（可选）
    """
    try:
        site = site_service.create_site(db, site_in)
        return SuccessResponse(data=site, message="站点创建成功")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

@router.get(
    "/{site_id}",
    response_model=SuccessResponse[SiteResponse],
    summary="获取站点详情",
    description="根据ID获取站点详细信息"
)
def get_site(
    site_id: int = Path(..., description="站点ID", gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取站点详情"""
    site = site_service.get_site(db, site_id)
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"站点不存在: {site_id}"
        )
    return SuccessResponse(data=site)

@router.get(
    "",
    response_model=SuccessResponse[PaginatedSiteResponse],
    summary="列出站点",
    description="列出站点，支持分页、筛选和排序"
)
def list_sites(
    project_id: Optional[int] = Query(None, description="项目ID"),
    status: Optional[str] = Query(None, description="站点状态"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    sort_by: str = Query("created_at", description="排序字段"),
    sort_order: str = Query("desc", description="排序方向"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """列出站点"""
    query = SiteListQuery(
        project_id=project_id,
        status=status,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    sites, total = site_service.list_sites(db, query)
    
    paginated = PaginatedSiteResponse(
        items=sites,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )
    
    return SuccessResponse(data=paginated)

@router.put(
    "/{site_id}",
    response_model=SuccessResponse[SiteResponse],
    summary="更新站点",
    description="更新站点信息"
)
def update_site(
    site_id: int = Path(..., description="站点ID", gt=0),
    site_in: SiteUpdate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新站点"""
    try:
        site = site_service.update_site(db, site_id, site_in)
        if not site:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"站点不存在: {site_id}"
            )
        return SuccessResponse(data=site, message="站点更新成功")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

@router.delete(
    "/{site_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除站点",
    description="删除（归档）站点"
)
def delete_site(
    site_id: int = Path(..., description="站点ID", gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除站点（软删除）"""
    success = site_service.delete_site(db, site_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"站点不存在: {site_id}"
        )
    return None
```

---

### 第五步：添加安全控制

**认证与授权**:

```python
# backend/app/api/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.core.security import decode_token

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """获取当前登录用户"""
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭证"
        )
    
    user_id = payload.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在"
        )
    
    return user

def require_role(required_role: str):
    """角色权限检查"""
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"需要 {required_role} 角色"
            )
        return current_user
    return role_checker
```

**使用示例**:
```python
# 需要管理员权限
@router.delete("/{site_id}")
def delete_site(
    site_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    ...
```

---

### 第六步：编写 API 测试

**API 测试示例**:

```python
# backend/tests/test_api_sites.py
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture
def auth_headers(test_user):
    """认证头"""
    token = create_access_token(user_id=test_user.id)
    return {"Authorization": f"Bearer {token}"}

def test_should_create_site_when_valid_input(auth_headers, test_project):
    """测试创建站点"""
    response = client.post(
        "/api/v1/sites",
        json={
            "project_id": test_project.id,
            "domain": "test-api.com",
            "protocol": "https"
        },
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["domain"] == "test-api.com"

def test_should_return_401_when_no_auth():
    """测试未认证"""
    response = client.get("/api/v1/sites")
    assert response.status_code == 401

def test_should_return_404_when_site_not_exists(auth_headers):
    """测试站点不存在"""
    response = client.get("/api/v1/sites/99999", headers=auth_headers)
    assert response.status_code == 404

def test_should_list_sites_with_pagination(auth_headers, test_sites):
    """测试分页列表"""
    response = client.get(
        "/api/v1/sites?page=1&page_size=10",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "items" in data["data"]
    assert "total" in data["data"]
    assert "page" in data["data"]
```

---

## 验收清单

- [ ] API 路径符合 RESTful 规范
- [ ] 响应格式统一
- [ ] HTTP 状态码使用正确
- [ ] Pydantic 模型完整（请求+响应）
- [ ] 参数校验充分（类型、范围、格式）
- [ ] 错误处理完整
- [ ] 认证和授权正确
- [ ] API 文档自动生成（/docs）
- [ ] 单元测试覆盖主要场景

---

## 常见问题

**Q: 如何处理大文件上传？**  
A: 使用 `File` 和 `UploadFile`，设置大小限制，考虑流式上传。

**Q: 如何实现 API 限流？**  
A: 使用 `slowapi` 或 Redis + 装饰器实现。

**Q: 如何版本化 API？**  
A: URL 前缀 `/api/v1/` 或 Header `X-API-Version: 1`。
