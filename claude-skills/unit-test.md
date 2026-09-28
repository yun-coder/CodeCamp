# Skill: 单元测试流程

## 适用场景

为业务逻辑编写单元测试，确保代码质量和可维护性。

---

## 测试原则

### 什么值得测试（三问判断法）

1. **有没有 IO？** 如果只是简单的数据转换（无数据库、无网络、无文件），可以不测
2. **去掉外部依赖还有复杂度吗？** 如果去掉数据库/LLM 调用后只剩简单逻辑，可以不测
3. **改动频率高 + 出错影响大？** 核心业务逻辑必须测试

### 测试覆盖优先级

| 优先级 | 测试对象 | 理由 |
|--------|---------|------|
| **P0** | 核心业务逻辑（审计引擎、可见度计算、工作流引擎） | 出错影响大 |
| **P1** | Service 层方法（CRUD + 业务方法） | 改动频率高 |
| **P2** | 工具函数（复杂计算、数据转换） | 容易出错 |
| **P3** | Routes 层 | FastAPI 自动校验，优先级低 |

---

## 测试框架与工具

**后端 (Python)**:
- pytest: 测试框架
- pytest-asyncio: 异步测试支持
- pytest-cov: 覆盖率报告
- pytest-mock: Mock 支持
- factory-boy: 测试数据工厂

**前端 (TypeScript)**:
- Vitest: 测试框架
- @testing-library/react: React 组件测试
- MSW: API Mock

---

## 单元测试标准流程

### 第一步：创建测试文件

**命名规范**:
- 测试文件: `test_{module_name}.py`
- 测试类: `Test{ClassName}`
- 测试方法: `test_should_{期望结果}_when_{输入条件}`

**示例**:
```
backend/app/services/site_service.py
    ↓
backend/tests/test_site_service.py
```

---

### 第二步：准备测试 Fixtures

**Fixtures 是测试的基础设施**，负责准备测试环境和测试数据。

**数据库 Fixture 示例**:
```python
# backend/tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import Base

@pytest.fixture(scope="function")
def db():
    """创建测试数据库会话"""
    # 使用内存数据库
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    yield session
    
    session.close()
    Base.metadata.drop_all(engine)

@pytest.fixture
def sample_project(db):
    """创建测试项目"""
    project = Project(
        name="Test Project",
        description="Test Description"
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@pytest.fixture
def sample_site(db, sample_project):
    """创建测试站点"""
    site = Site(
        project_id=sample_project.id,
        domain="example.com",
        protocol="https"
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return site
```

---

### 第三步：编写测试用例（Given-When-Then 模式）

**测试结构**:
```python
def test_should_{期望结果}_when_{输入条件}():
    # Given: 准备测试数据
    # When: 执行被测试的方法
    # Then: 验证结果
```

**示例 1: 测试创建操作**:
```python
def test_should_create_site_when_valid_input(db, sample_project):
    # Given: 准备输入数据
    site_in = SiteCreate(
        project_id=sample_project.id,
        domain="example.com",
        protocol="https"
    )
    
    # When: 执行创建操作
    site = site_service.create_site(db, site_in)
    
    # Then: 验证结果
    assert site.id is not None
    assert site.domain == "example.com"
    assert site.protocol == "https"
    assert site.project_id == sample_project.id
    
    # 额外验证：数据库中确实存在
    db_site = db.query(Site).filter(Site.id == site.id).first()
    assert db_site is not None
```

**示例 2: 测试查询操作**:
```python
def test_should_return_site_when_exists(db, sample_site):
    # Given: 已有站点（由 fixture 提供）
    
    # When: 查询站点
    site = site_service.get_site(db, sample_site.id)
    
    # Then: 验证返回正确
    assert site is not None
    assert site.id == sample_site.id
    assert site.domain == sample_site.domain

def test_should_return_none_when_site_not_exists(db):
    # Given: 不存在的站点 ID
    non_existent_id = 99999
    
    # When: 查询不存在的站点
    site = site_service.get_site(db, non_existent_id)
    
    # Then: 应返回 None
    assert site is None
```

**示例 3: 测试更新操作**:
```python
def test_should_update_site_when_valid_input(db, sample_site):
    # Given: 已有站点和更新数据
    update_in = SiteUpdate(
        domain="new-domain.com",
        status="INACTIVE"
    )
    
    # When: 执行更新
    updated = site_service.update_site(db, sample_site.id, update_in)
    
    # Then: 验证更新成功
    assert updated is not None
    assert updated.id == sample_site.id
    assert updated.domain == "new-domain.com"
    assert updated.status == "INACTIVE"
    
    # 验证数据库中已更新
    db.refresh(sample_site)
    assert sample_site.domain == "new-domain.com"

def test_should_return_none_when_update_non_existent_site(db):
    # Given: 不存在的站点 ID
    update_in = SiteUpdate(domain="new.com")
    
    # When: 尝试更新
    result = site_service.update_site(db, 99999, update_in)
    
    # Then: 应返回 None
    assert result is None
```

**示例 4: 测试删除操作**:
```python
def test_should_delete_site_when_exists(db, sample_site):
    # Given: 已有站点
    site_id = sample_site.id
    
    # When: 删除站点
    success = site_service.delete_site(db, site_id)
    
    # Then: 删除成功
    assert success is True
    
    # 验证数据库中已删除
    deleted = db.query(Site).filter(Site.id == site_id).first()
    assert deleted is None

def test_should_return_false_when_delete_non_existent_site(db):
    # Given: 不存在的站点 ID
    
    # When: 尝试删除
    success = site_service.delete_site(db, 99999)
    
    # Then: 应返回 False
    assert success is False
```

**示例 5: 测试列表和分页**:
```python
def test_should_list_sites_with_pagination(db, sample_project):
    # Given: 创建多个站点
    for i in range(5):
        site = Site(
            project_id=sample_project.id,
            domain=f"site{i}.com"
        )
        db.add(site)
    db.commit()
    
    # When: 查询第一页（每页 3 条）
    sites, total = site_service.list_sites(db, skip=0, limit=3)
    
    # Then: 验证分页结果
    assert len(sites) == 3
    assert total == 5

def test_should_filter_sites_by_project(db):
    # Given: 创建两个项目，各有站点
    project1 = Project(name="Project 1")
    project2 = Project(name="Project 2")
    db.add_all([project1, project2])
    db.commit()
    
    db.add(Site(project_id=project1.id, domain="p1-site1.com"))
    db.add(Site(project_id=project1.id, domain="p1-site2.com"))
    db.add(Site(project_id=project2.id, domain="p2-site1.com"))
    db.commit()
    
    # When: 按项目筛选
    sites, total = site_service.list_sites(db, project_id=project1.id)
    
    # Then: 只返回项目1的站点
    assert total == 2
    assert all(s.project_id == project1.id for s in sites)
```

---

### 第四步：测试边界条件

**边界条件清单**:
- [ ] 空输入（空字符串、空列表、None）
- [ ] 极限值（最大长度、最小值、最大值）
- [ ] 重复数据（唯一约束冲突）
- [ ] 并发场景（如适用）

**示例**:
```python
def test_should_raise_error_when_domain_too_long(db, sample_project):
    # Given: 域名超长
    site_in = SiteCreate(
        project_id=sample_project.id,
        domain="a" * 300  # 超过 VARCHAR(255) 限制
    )
    
    # When/Then: 应抛出异常
    with pytest.raises(ValueError):
        site_service.create_site(db, site_in)

def test_should_raise_error_when_duplicate_domain(db, sample_project, sample_site):
    # Given: 已有站点
    site_in = SiteCreate(
        project_id=sample_project.id,
        domain=sample_site.domain  # 重复域名
    )
    
    # When/Then: 应抛出异常
    with pytest.raises(IntegrityError):
        site_service.create_site(db, site_in)
```

---

### 第五步：Mock 外部依赖

**为什么需要 Mock**:
- 数据库查询 → 可以用真实测试数据库（SQLite in-memory）
- HTTP 请求 → 必须 Mock（不能在测试中发真实请求）
- LLM 调用 → 必须 Mock（成本高且结果不稳定）
- 文件系统 → 可以用临时目录，也可以 Mock

**Mock HTTP 请求示例**:
```python
import pytest
from unittest.mock import Mock, patch
from app.services.gsc_integration import GSCIntegrationService

def test_should_fetch_gsc_data_when_valid_credentials(db):
    # Given: Mock GSC API 响应
    mock_response = {
        "rows": [
            {"keys": ["query1"], "clicks": 100, "impressions": 1000},
            {"keys": ["query2"], "clicks": 50, "impressions": 500}
        ]
    }
    
    # When: Mock requests.post
    with patch('requests.post') as mock_post:
        mock_post.return_value.json.return_value = mock_response
        mock_post.return_value.status_code = 200
        
        service = GSCIntegrationService()
        result = service.fetch_search_analytics("example.com")
    
    # Then: 验证结果
    assert len(result) == 2
    assert result[0]["clicks"] == 100
    
    # 验证 Mock 被正确调用
    mock_post.assert_called_once()
    call_args = mock_post.call_args
    assert "searchanalytics" in call_args[0][0]
```

**Mock LLM 调用示例**:
```python
@patch('app.services.llm_client.LLMClient.generate')
def test_should_generate_content_when_valid_prompt(mock_generate, db):
    # Given: Mock LLM 响应
    mock_generate.return_value = "Generated content here"
    
    # When: 调用内容生成
    service = ContentService()
    result = service.generate_seo_content("keyword")
    
    # Then: 验证结果
    assert result == "Generated content here"
    mock_generate.assert_called_once_with(
        prompt=pytest.any(str),
        model=pytest.any(str)
    )
```

---

### 第六步：测试异步代码

**使用 pytest-asyncio**:
```python
import pytest
from app.services.async_service import AsyncService

@pytest.mark.asyncio
async def test_should_process_async_task_when_valid_input():
    # Given: 准备输入
    service = AsyncService()
    
    # When: 执行异步任务
    result = await service.process_async("input")
    
    # Then: 验证结果
    assert result is not None
    assert result.status == "completed"
```

**Mock 异步 HTTP 请求**:
```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
@patch('aiohttp.ClientSession.post')
async def test_should_call_api_async(mock_post):
    # Given: Mock 异步响应
    mock_post.return_value.__aenter__.return_value.json = AsyncMock(
        return_value={"status": "ok"}
    )
    
    # When: 执行异步调用
    service = AsyncAPIService()
    result = await service.call_external_api()
    
    # Then: 验证结果
    assert result["status"] == "ok"
```

---

## 执行与验收

### 运行测试

**运行所有测试**:
```bash
pytest backend/tests/ -v
```

**运行特定测试文件**:
```bash
pytest backend/tests/test_site_service.py -v
```

**运行特定测试方法**:
```bash
pytest backend/tests/test_site_service.py::test_should_create_site_when_valid_input -v
```

**查看覆盖率**:
```bash
pytest backend/tests/ --cov=app --cov-report=html
```

**只运行失败的测试**:
```bash
pytest --lf  # last failed
```

**调试失败的测试**:
```bash
pytest backend/tests/test_site_service.py -v -s  # -s 显示 print 输出
pytest backend/tests/test_site_service.py --pdb  # 失败时进入调试器
```

---

### 验收标准

- [ ] 所有测试通过（绿色 ✓）
- [ ] 核心业务逻辑覆盖率 > 80%
- [ ] 测试命名清晰（一看就知道测什么）
- [ ] 没有测试相互依赖（可以单独运行）
- [ ] 测试运行快速（单个测试 < 1 秒）

---

## 常见问题

**Q: 测试数据库用什么？**  
A: 本地开发用 SQLite in-memory（快），CI/CD 用与生产相同的 PostgreSQL（准确）。

**Q: 每个测试都要重建数据库吗？**  
A: 使用 `scope="function"` 的 fixture，每个测试独立，互不影响。

**Q: 如何测试 Celery 任务？**  
A: 设置 `CELERY_TASK_ALWAYS_EAGER=True`，任务同步执行，便于测试。

**Q: 前端组件怎么测试？**  
A: 使用 Vitest + React Testing Library，测试用户交互，不测试实现细节。

**Q: 测试覆盖率要达到 100% 吗？**  
A: 不需要。核心业务逻辑 > 80%，整体 > 60% 即可。Getters/Setters 不用测。
