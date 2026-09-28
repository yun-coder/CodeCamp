# Skill: 模块交付流程

## 适用场景

当需要开发一个完整的业务模块时（例如：站点管理、工作流管理、监测管理等），使用此流程确保交付质量和一致性。

---

## 前置条件

- [ ] CLAUDE.md 已存在且包含项目规范
- [ ] 数据库连接已配置
- [ ] 开发环境已就绪

---

## 八步交付流程

### 第一步：需求确认

**输入**: 模块功能描述

**输出**: 
- 功能清单（核心功能 vs 边缘功能）
- 数据模型草图
- API 接口清单

**验收标准**: 
- 功能范围明确，没有歧义
- 数据模型覆盖所有业务字段
- API 接口符合 RESTful 规范

**示例对话**:
```
我：需要开发一个站点管理模块
你：请先梳理以下内容：
1. 站点的核心属性有哪些？（domain, protocol, status 等）
2. 需要支持哪些操作？（CRUD / 批量导入 / 健康检查等）
3. 与哪些模块有关联？（Project / Workflow / Monitor 等）
4. 数据量预期？（影响索引设计）
```

---

### 第二步：数据库设计

**任务清单**:
1. 创建 Alembic 迁移脚本
2. 定义表结构（遵循 CLAUDE.md 中的字段规范）
3. 添加必要的索引
4. 定义外键关系

**代码检查点**:
- [ ] 包含通用字段（id, created_at, updated_at）
- [ ] 需要软删除的表包含 deleted_at
- [ ] 禁止 NULL（除明确可选字段）
- [ ] 外键已显式定义
- [ ] 索引策略合理（查询条件字段、复合索引顺序）

**执行命令**:
```bash
# 生成迁移脚本
alembic revision -m "add_site_module"

# 应用迁移
alembic upgrade head

# 验证表结构
psql -d geosuite -c "\d sites"
```

---

### 第三步：SQLAlchemy 模型

**任务**: 在 `backend/app/models/` 创建模型文件

**代码检查点**:
- [ ] 继承 Base
- [ ] 使用 `__tablename__` 指定表名
- [ ] 字段类型与数据库一致
- [ ] 定义 relationship（如有关联）
- [ ] 添加 `__repr__` 方法（便于调试）

**示例代码**:
```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base

class Site(Base):
    __tablename__ = "sites"
    
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    domain = Column(String(255), nullable=False)
    protocol = Column(String(10), default="https")
    status = Column(String(32), default="ACTIVE")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="sites")
    
    def __repr__(self):
        return f"<Site(id={self.id}, domain={self.domain})>"
```

---

### 第四步：Pydantic Schema

**任务**: 在 `backend/app/schemas/` 创建请求/响应模型

**代码检查点**:
- [ ] 创建 Base Schema（公共字段）
- [ ] 创建 Create Schema（创建时字段）
- [ ] 创建 Update Schema（更新时字段）
- [ ] 创建 Response Schema（返回时字段）
- [ ] 所有字段写清楚 description

**示例代码**:
```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SiteBase(BaseModel):
    domain: str = Field(..., description="站点域名")
    protocol: str = Field(default="https", description="协议 http/https")

class SiteCreate(SiteBase):
    project_id: int = Field(..., description="所属项目ID")

class SiteUpdate(BaseModel):
    domain: Optional[str] = Field(None, description="站点域名")
    protocol: Optional[str] = Field(None, description="协议")
    status: Optional[str] = Field(None, description="状态")

class SiteResponse(SiteBase):
    id: int
    project_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
```

---

### 第五步：Service 层

**任务**: 在 `backend/app/services/` 创建业务逻辑

**代码检查点**:
- [ ] CRUD 基本方法（create, get, list, update, delete）
- [ ] 业务逻辑方法（例如：validate_domain, check_health）
- [ ] 异常处理完整
- [ ] 日志记录充分
- [ ] 数据库事务管理正确

**示例代码**:
```python
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.site import Site
from app.schemas.site import SiteCreate, SiteUpdate
import logging

logger = logging.getLogger(__name__)

class SiteService:
    
    def create_site(self, db: Session, site_in: SiteCreate) -> Site:
        """创建站点"""
        try:
            site = Site(**site_in.model_dump())
            db.add(site)
            db.commit()
            db.refresh(site)
            logger.info(f"Site created: {site.id}")
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
        project_id: Optional[int] = None,
        skip: int = 0, 
        limit: int = 20
    ) -> tuple[list[Site], int]:
        """列出站点（带分页）"""
        query = db.query(Site)
        if project_id:
            query = query.filter(Site.project_id == project_id)
        
        total = query.count()
        sites = query.offset(skip).limit(limit).all()
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
        
        update_data = site_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(site, field, value)
        
        db.commit()
        db.refresh(site)
        logger.info(f"Site updated: {site_id}")
        return site
    
    def delete_site(self, db: Session, site_id: int) -> bool:
        """删除站点"""
        site = self.get_site(db, site_id)
        if not site:
            return False
        
        db.delete(site)
        db.commit()
        logger.info(f"Site deleted: {site_id}")
        return True

site_service = SiteService()
```

---

### 第六步：API Routes

**任务**: 在 `backend/app/api/routes/` 创建路由

**代码检查点**:
- [ ] 使用 APIRouter
- [ ] 路由路径符合 RESTful 规范
- [ ] 参数校验（Query, Path, Body）
- [ ] 依赖注入（get_db）
- [ ] 响应模型（response_model）
- [ ] HTTP 状态码正确

**示例代码**:
```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db
from app.schemas.site import SiteCreate, SiteUpdate, SiteResponse
from app.services.site_service import site_service

router = APIRouter(prefix="/sites", tags=["sites"])

@router.post("", response_model=SiteResponse, status_code=201)
def create_site(
    site_in: SiteCreate,
    db: Session = Depends(get_db)
):
    """创建站点"""
    return site_service.create_site(db, site_in)

@router.get("/{site_id}", response_model=SiteResponse)
def get_site(
    site_id: int,
    db: Session = Depends(get_db)
):
    """获取站点详情"""
    site = site_service.get_site(db, site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site

@router.get("", response_model=dict)
def list_sites(
    project_id: int = Query(None, description="项目ID"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: Session = Depends(get_db)
):
    """列出站点"""
    skip = (page - 1) * page_size
    sites, total = site_service.list_sites(db, project_id, skip, page_size)
    
    return {
        "items": sites,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }

@router.put("/{site_id}", response_model=SiteResponse)
def update_site(
    site_id: int,
    site_in: SiteUpdate,
    db: Session = Depends(get_db)
):
    """更新站点"""
    site = site_service.update_site(db, site_id, site_in)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site

@router.delete("/{site_id}", status_code=204)
def delete_site(
    site_id: int,
    db: Session = Depends(get_db)
):
    """删除站点"""
    success = site_service.delete_site(db, site_id)
    if not success:
        raise HTTPException(status_code=404, detail="Site not found")
```

---

### 第七步：单元测试

**任务**: 在 `backend/tests/` 创建测试文件

**代码检查点**:
- [ ] 测试 CRUD 基本操作
- [ ] 测试边界条件（空数据、重复、不存在）
- [ ] 测试异常处理
- [ ] 使用 pytest fixtures
- [ ] 测试命名清晰

**示例代码**:
```python
import pytest
from sqlalchemy.orm import Session
from app.models.site import Site
from app.schemas.site import SiteCreate, SiteUpdate
from app.services.site_service import site_service

def test_should_create_site_when_valid_input(db: Session):
    """测试：有效输入时应成功创建站点"""
    site_in = SiteCreate(
        project_id=1,
        domain="example.com",
        protocol="https"
    )
    site = site_service.create_site(db, site_in)
    
    assert site.id is not None
    assert site.domain == "example.com"
    assert site.protocol == "https"

def test_should_return_none_when_site_not_exists(db: Session):
    """测试：站点不存在时应返回None"""
    site = site_service.get_site(db, 99999)
    assert site is None

def test_should_update_site_when_valid_input(db: Session):
    """测试：有效输入时应成功更新站点"""
    # 先创建
    site_in = SiteCreate(project_id=1, domain="old.com")
    site = site_service.create_site(db, site_in)
    
    # 再更新
    update_in = SiteUpdate(domain="new.com")
    updated = site_service.update_site(db, site.id, update_in)
    
    assert updated.domain == "new.com"

def test_should_list_sites_with_pagination(db: Session):
    """测试：应正确返回分页结果"""
    # 创建多个站点
    for i in range(5):
        site_in = SiteCreate(project_id=1, domain=f"site{i}.com")
        site_service.create_site(db, site_in)
    
    # 测试分页
    sites, total = site_service.list_sites(db, skip=0, limit=3)
    assert len(sites) == 3
    assert total == 5
```

**执行测试**:
```bash
pytest backend/tests/test_site_service.py -v
```

---

### 第八步：前端对接（可选）

**任务**: 
1. 在 `frontend/lib/api.ts` 添加 API 方法
2. 创建对应的页面组件

**API 封装示例**:
```typescript
// frontend/lib/api.ts
export const siteApi = {
  create: (data: SiteCreate) => 
    client.post<SiteResponse>('/sites', data),
  
  get: (id: number) => 
    client.get<SiteResponse>(`/sites/${id}`),
  
  list: (params: { project_id?: number; page?: number; page_size?: number }) =>
    client.get<PaginatedResponse<SiteResponse>>('/sites', { params }),
  
  update: (id: number, data: SiteUpdate) =>
    client.put<SiteResponse>(`/sites/${id}`, data),
  
  delete: (id: number) =>
    client.delete(`/sites/${id}`)
}
```

---

## 交付验收清单

完成以上八步后，进行最终验收：

- [ ] 数据库表已创建，字段符合规范
- [ ] SQLAlchemy 模型与数据库一致
- [ ] Pydantic Schema 定义完整
- [ ] Service 层业务逻辑正确
- [ ] API Routes 符合 RESTful 规范
- [ ] 单元测试通过（覆盖率 > 80%）
- [ ] API 文档自动生成（访问 /docs）
- [ ] 前端可以正常调用（如有）

**最终验证命令**:
```bash
# 后端测试
pytest backend/tests/ -v --cov=app

# 启动服务
docker-compose up -d

# 健康检查
curl http://localhost:8000/health

# API 文档
open http://localhost:8000/docs
```

---

## 常见问题

**Q: 什么时候需要创建 Celery 任务？**  
A: 当操作耗时超过 30 秒（如数据爬取、大模型调用、批量处理），应该创建异步任务，立即返回 task_id 给前端。

**Q: 如何处理级联删除？**  
A: 优先使用软删除（deleted_at），如果必须物理删除，在 ForeignKey 上设置 `ondelete="CASCADE"`。

**Q: 分页查询性能差怎么办？**  
A: 使用游标分页替代 OFFSET，或者添加合适的索引。
