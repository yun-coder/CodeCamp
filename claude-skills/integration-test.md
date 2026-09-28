# Skill: 集成测试流程

## 适用场景

测试跨模块的业务流程，确保各组件协同工作正常。集成测试关注的是"端到端"的业务场景。

---

## 集成测试 vs 单元测试

| 维度 | 单元测试 | 集成测试 |
|------|---------|---------|
| **测试范围** | 单个函数/方法 | 多个模块协同 |
| **外部依赖** | Mock 掉 | 使用真实依赖 |
| **数据库** | In-memory SQLite | 真实 PostgreSQL |
| **执行速度** | 快（< 1s） | 慢（几秒到几十秒） |
| **运行时机** | 每次提交 | PR 合并前 + 部署前 |
| **覆盖目标** | 代码逻辑 | 业务流程 |

---

## 核心链路识别

### GEOSuite 核心业务链路

根据项目运营主链，识别以下核心链路：

#### 链路 1: 站点审计流程
```
创建站点 → 启动审计工作流 → 爬取页面 → 执行规则检查 
→ 生成发现项 → 存储结果 → 返回审计报告
```

**涉及模块**:
- Site Management
- Workflow Engine
- Crawler Service
- Diagnostic Service
- Report Builder

**风险点**:
- 爬虫超时导致工作流卡住
- 规则引擎逻辑错误导致误判
- 大量发现项导致数据库性能问题

---

#### 链路 2: AI 可见度监测流程
```
配置监测任务 → 选择问题集 → 调用 LLM → 提取引用证据 
→ 计算可见度得分 → 存储趋势数据 → 生成报告
```

**涉及模块**:
- Monitor Service
- LLM Integration
- Visibility Engine
- Graph Store (Neo4j)
- Report Builder

**风险点**:
- LLM 调用失败/超时
- 引用证据提取不准确
- 趋势计算错误（同市场上下文、同问题集版本）

---

#### 链路 3: GSC 数据集成流程
```
OAuth 授权 → 获取站点列表 → 拉取 Search Analytics 数据 
→ 数据清洗 → 存储到数据库 → 与审计结果关联
```

**涉及模块**:
- GSC Integration
- Auth Service
- Data Pipeline
- Analytics Service

**风险点**:
- Token 过期导致认证失败
- API 限流导致数据不完整
- 数据格式变化导致解析错误

---

#### 链路 4: 项目交付流程
```
完成审计 → 生成发现项 → 创建改进建议 → 执行验证周期 
→ 生成白标报告 → 打包交付 ZIP → 客户只读分享
```

**涉及模块**:
- Delivery Package Service
- Report Builder
- File Storage (MinIO)
- Share Service

**风险点**:
- ZIP 生成失败
- 白标配置不生效
- 分享链接权限错误

---

## 集成测试编写流程

### 第一步：准备测试环境

**Docker Compose 测试配置**:
```yaml
# docker-compose.test.yml
version: '3.8'

services:
  postgres-test:
    image: postgres:15
    environment:
      POSTGRES_DB: geosuite_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
  
  redis-test:
    image: redis:7
    ports:
      - "6380:6379"
  
  qdrant-test:
    image: qdrant/qdrant:latest
    ports:
      - "6334:6333"
  
  neo4j-test:
    image: neo4j:5
    environment:
      NEO4J_AUTH: neo4j/testpassword
    ports:
      - "7475:7474"
      - "7688:7687"
```

**启动测试环境**:
```bash
docker-compose -f docker-compose.test.yml up -d
```

---

### 第二步：创建集成测试 Fixtures

**数据库连接 Fixture**:
```python
# backend/tests/integration/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.base import Base

@pytest.fixture(scope="session")
def test_db_engine():
    """创建测试数据库引擎"""
    engine = create_engine(settings.TEST_DATABASE_URL)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()

@pytest.fixture(scope="function")
def db(test_db_engine):
    """创建测试数据库会话"""
    SessionLocal = sessionmaker(bind=test_db_engine)
    session = SessionLocal()
    yield session
    session.rollback()  # 回滚测试数据
    session.close()

@pytest.fixture(scope="function")
def redis_client():
    """Redis 测试客户端"""
    import redis
    client = redis.Redis(
        host='localhost',
        port=6380,
        db=0,
        decode_responses=True
    )
    yield client
    client.flushdb()  # 清空测试数据

@pytest.fixture(scope="function")
def neo4j_driver():
    """Neo4j 测试驱动"""
    from neo4j import GraphDatabase
    driver = GraphDatabase.driver(
        "bolt://localhost:7688",
        auth=("neo4j", "testpassword")
    )
    yield driver
    
    # 清空测试数据
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
    driver.close()
```

**完整项目 Fixture**:
```python
@pytest.fixture
def full_project(db):
    """创建完整的测试项目（含站点、问题集等）"""
    # 创建项目
    project = Project(
        name="Test E-commerce Site",
        description="Integration test project"
    )
    db.add(project)
    db.commit()
    
    # 创建站点
    site = Site(
        project_id=project.id,
        domain="example-ecommerce.com",
        protocol="https",
        status="ACTIVE"
    )
    db.add(site)
    db.commit()
    
    # 创建市场上下文
    market = MarketContext(
        project_id=project.id,
        market_name="US E-commerce",
        language="en-US"
    )
    db.add(market)
    db.commit()
    
    # 创建问题集
    query_set = QuerySet(
        market_id=market.id,
        name="E-commerce SEO Questions",
        version="v1.0"
    )
    db.add(query_set)
    db.commit()
    
    # 添加具体问题
    questions = [
        "What are the best running shoes?",
        "How to choose hiking boots?",
        "Top rated camping gear"
    ]
    for q in questions:
        query = Query(
            query_set_id=query_set.id,
            text=q,
            category="product_research"
        )
        db.add(query)
    db.commit()
    
    return {
        "project": project,
        "site": site,
        "market": market,
        "query_set": query_set
    }
```

---

### 第三步：编写端到端测试用例

#### 测试链路 1: 站点审计流程

```python
# backend/tests/integration/test_audit_workflow.py
import pytest
from app.services.site_workflow import site_workflow_service
from app.services.crawler import crawler_service
from app.services.diagnostics import diagnostic_service

@pytest.mark.integration
def test_should_complete_audit_workflow_when_valid_site(
    db, 
    full_project,
    redis_client
):
    """集成测试：完整的站点审计流程"""
    
    # Given: 准备站点和工作流配置
    site = full_project["site"]
    workflow_config = {
        "max_pages": 10,
        "check_rules": ["crawlability", "content_quality", "entity_signals"]
    }
    
    # When: 启动审计工作流
    workflow_run = site_workflow_service.start_audit(
        db=db,
        site_id=site.id,
        config=workflow_config
    )
    
    # Then: 验证工作流创建成功
    assert workflow_run.id is not None
    assert workflow_run.status == "RUNNING"
    
    # When: 等待工作流完成（或模拟完成）
    # 注意：真实环境是异步，测试中可以同步执行或 Mock
    crawler_service.crawl_site(db, site.id, max_pages=10)
    diagnostic_service.run_diagnostics(db, workflow_run.id)
    
    # Then: 验证工作流完成
    db.refresh(workflow_run)
    assert workflow_run.status == "COMPLETED"
    
    # Then: 验证生成了发现项
    findings = db.query(Diagnostic).filter(
        Diagnostic.workflow_run_id == workflow_run.id
    ).all()
    assert len(findings) > 0
    
    # Then: 验证每个发现项有必要字段
    for finding in findings:
        assert finding.category is not None
        assert finding.severity in ["HIGH", "MEDIUM", "LOW"]
        assert finding.message is not None
        assert finding.url is not None
    
    # Then: 验证 Redis 缓存已更新
    cache_key = f"workflow:{workflow_run.id}:status"
    cached_status = redis_client.get(cache_key)
    assert cached_status == "COMPLETED"
```

---

#### 测试链路 2: AI 可见度监测流程

```python
# backend/tests/integration/test_visibility_monitoring.py
import pytest
from unittest.mock import patch
from app.services.monitor_insights import monitor_service
from app.services.visibility_engine import visibility_engine

@pytest.mark.integration
@patch('app.services.llm_client.LLMClient.generate')
def test_should_complete_visibility_monitoring_when_valid_config(
    mock_llm,
    db,
    full_project,
    neo4j_driver
):
    """集成测试：完整的 AI 可见度监测流程"""
    
    # Given: Mock LLM 响应（避免真实 API 调用）
    mock_llm.return_value = """
    Based on my knowledge, the best running shoes include:
    1. Nike Air Zoom Pegasus - Great for daily training
    2. Adidas Ultraboost - Excellent comfort
    3. Brooks Ghost - Popular among runners
    
    Source: example-ecommerce.com provides detailed reviews
    """
    
    site = full_project["site"]
    query_set = full_project["query_set"]
    market = full_project["market"]
    
    # Given: 创建监测配置
    monitor_config = {
        "site_id": site.id,
        "query_set_id": query_set.id,
        "frequency": "daily",
        "llm_model": "gpt-4o-mini"
    }
    
    # When: 启动监测任务
    monitor_run = monitor_service.start_monitoring(
        db=db,
        config=monitor_config
    )
    
    # Then: 验证监测任务创建成功
    assert monitor_run.id is not None
    assert monitor_run.status == "RUNNING"
    
    # When: 执行可见度计算
    questions = db.query(Query).filter(
        Query.query_set_id == query_set.id
    ).all()
    
    results = []
    for question in questions:
        result = visibility_engine.check_visibility(
            db=db,
            question=question.text,
            site_domain=site.domain,
            model="gpt-4o-mini"
        )
        results.append(result)
    
    # Then: 验证所有问题都有结果
    assert len(results) == len(questions)
    
    # Then: 验证结果结构正确
    for result in results:
        assert "cited" in result
        assert "citation_evidence" in result
        assert "visibility_score" in result
        assert 0 <= result["visibility_score"] <= 1
    
    # Then: 验证数据写入 Neo4j
    with neo4j_driver.session() as session:
        # 查询知识图谱中的引用关系
        cypher = """
        MATCH (s:Site {domain: $domain})-[r:CITED_IN]->(q:Question)
        RETURN count(r) as citation_count
        """
        result = session.run(cypher, domain=site.domain)
        record = result.single()
        assert record["citation_count"] > 0
    
    # Then: 验证监测任务完成
    db.refresh(monitor_run)
    assert monitor_run.status == "COMPLETED"
    assert monitor_run.visibility_score is not None
```

---

#### 测试链路 3: GSC 数据集成流程

```python
# backend/tests/integration/test_gsc_integration.py
import pytest
from unittest.mock import patch, MagicMock
from app.services.gsc_integration import gsc_service

@pytest.mark.integration
@patch('google.oauth2.credentials.Credentials')
@patch('googleapiclient.discovery.build')
def test_should_sync_gsc_data_when_valid_credentials(
    mock_build,
    mock_credentials,
    db,
    full_project
):
    """集成测试：GSC 数据同步流程"""
    
    # Given: Mock Google API 响应
    mock_service = MagicMock()
    mock_build.return_value = mock_service
    
    # Mock Search Analytics API
    mock_service.searchanalytics().query().execute.return_value = {
        "rows": [
            {
                "keys": ["running shoes"],
                "clicks": 120,
                "impressions": 5000,
                "ctr": 0.024,
                "position": 3.5
            },
            {
                "keys": ["hiking boots"],
                "clicks": 80,
                "impressions": 3000,
                "ctr": 0.027,
                "position": 4.2
            }
        ]
    }
    
    site = full_project["site"]
    
    # When: 执行 GSC 数据同步
    sync_result = gsc_service.sync_search_analytics(
        db=db,
        site_id=site.id,
        start_date="2026-08-01",
        end_date="2026-08-10"
    )
    
    # Then: 验证同步成功
    assert sync_result["success"] is True
    assert sync_result["rows_imported"] == 2
    
    # Then: 验证数据写入数据库
    from app.models.gsc_data import GSCSearchAnalytics
    gsc_data = db.query(GSCSearchAnalytics).filter(
        GSCSearchAnalytics.site_id == site.id
    ).all()
    
    assert len(gsc_data) == 2
    
    # Then: 验证数据完整性
    running_shoes_data = next(
        (d for d in gsc_data if d.query == "running shoes"),
        None
    )
    assert running_shoes_data is not None
    assert running_shoes_data.clicks == 120
    assert running_shoes_data.impressions == 5000
    assert running_shoes_data.ctr == pytest.approx(0.024, 0.001)
    assert running_shoes_data.position == pytest.approx(3.5, 0.1)
```

---

#### 测试链路 4: 项目交付流程

```python
# backend/tests/integration/test_delivery_workflow.py
import pytest
import zipfile
import os
from app.services.delivery_package import delivery_service
from app.services.report_builder import report_builder

@pytest.mark.integration
def test_should_generate_delivery_package_when_audit_complete(
    db,
    full_project,
    tmp_path
):
    """集成测试：项目交付打包流程"""
    
    # Given: 完成审计并有发现项
    project = full_project["project"]
    site = full_project["site"]
    
    # 创建模拟的审计结果
    workflow_run = WorkflowRun(
        site_id=site.id,
        status="COMPLETED",
        started_at=datetime.utcnow()
    )
    db.add(workflow_run)
    db.commit()
    
    # 添加发现项
    diagnostics = [
        Diagnostic(
            workflow_run_id=workflow_run.id,
            category="crawlability",
            severity="HIGH",
            message="Robots.txt blocks important pages",
            url=f"https://{site.domain}/blog"
        ),
        Diagnostic(
            workflow_run_id=workflow_run.id,
            category="content_quality",
            severity="MEDIUM",
            message="Thin content detected",
            url=f"https://{site.domain}/product/123"
        )
    ]
    db.add_all(diagnostics)
    db.commit()
    
    # When: 生成交付报告
    report = report_builder.build_audit_report(
        db=db,
        workflow_run_id=workflow_run.id,
        white_label_config={
            "company_name": "Client Corp",
            "logo_url": "https://client.com/logo.png"
        }
    )
    
    # Then: 验证报告生成
    assert report is not None
    assert "findings" in report
    assert len(report["findings"]) == 2
    assert report["white_label"]["company_name"] == "Client Corp"
    
    # When: 打包交付 ZIP
    zip_path = delivery_service.create_delivery_package(
        db=db,
        project_id=project.id,
        workflow_run_id=workflow_run.id,
        output_dir=str(tmp_path)
    )
    
    # Then: 验证 ZIP 文件生成
    assert os.path.exists(zip_path)
    assert zip_path.endswith(".zip")
    
    # Then: 验证 ZIP 内容完整
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        file_list = zip_ref.namelist()
        
        # 必须包含的文件
        assert "report.html" in file_list
        assert "findings.csv" in file_list
        assert "summary.json" in file_list
        
        # 读取报告内容验证
        report_html = zip_ref.read("report.html").decode('utf-8')
        assert "Client Corp" in report_html  # 白标生效
        assert site.domain in report_html
        assert "Robots.txt blocks important pages" in report_html
```

---

### 第四步：性能与压力测试

```python
# backend/tests/integration/test_performance.py
import pytest
import time
from concurrent.futures import ThreadPoolExecutor

@pytest.mark.integration
@pytest.mark.slow
def test_should_handle_concurrent_requests_when_high_load(db):
    """性能测试：并发请求处理"""
    
    # Given: 准备多个站点
    sites = []
    for i in range(10):
        site = Site(
            project_id=1,
            domain=f"test-site-{i}.com"
        )
        db.add(site)
        sites.append(site)
    db.commit()
    
    # When: 并发启动多个审计
    start_time = time.time()
    
    def start_audit(site_id):
        return site_workflow_service.start_audit(
            db=db,
            site_id=site_id,
            config={"max_pages": 5}
        )
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(start_audit, s.id) for s in sites]
        results = [f.result() for f in futures]
    
    end_time = time.time()
    
    # Then: 验证所有请求成功
    assert len(results) == 10
    assert all(r.status == "RUNNING" for r in results)
    
    # Then: 验证性能指标
    duration = end_time - start_time
    assert duration < 10  # 10个并发请求应在10秒内完成
    
    throughput = len(results) / duration
    print(f"Throughput: {throughput:.2f} requests/sec")
    assert throughput > 0.5  # 至少每秒处理0.5个请求
```

---

## 执行与验收

### 运行集成测试

**运行所有集成测试**:
```bash
pytest backend/tests/integration/ -v -m integration
```

**运行特定链路测试**:
```bash
pytest backend/tests/integration/test_audit_workflow.py -v
```

**跳过慢速测试**:
```bash
pytest backend/tests/integration/ -v -m "integration and not slow"
```

**生成覆盖率报告**:
```bash
pytest backend/tests/integration/ --cov=app --cov-report=html -m integration
```

---

### CI/CD 集成

**GitHub Actions 配置示例**:
```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  integration-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: geosuite_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/geosuite_test
          REDIS_URL: redis://localhost:6379/0
        run: |
          pytest backend/tests/integration/ -v -m integration --cov=app
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 验收标准

- [ ] 核心业务链路全覆盖（4 条链路都有测试）
- [ ] 所有集成测试通过
- [ ] 测试使用真实数据库（PostgreSQL）
- [ ] 外部服务已 Mock（LLM、GSC API）
- [ ] 性能测试通过（并发、响应时间）
- [ ] CI/CD 自动运行

---

## 常见问题

**Q: 集成测试太慢怎么办？**  
A: 使用 `pytest-xdist` 并行执行，或标记慢速测试在本地跳过。

**Q: 测试环境数据污染怎么办？**  
A: 每个测试用独立的事务，测试结束回滚。使用 `scope="function"` 的 fixture。

**Q: 如何测试 Celery 异步任务？**  
A: 设置 `CELERY_TASK_ALWAYS_EAGER=True`，任务同步执行。

**Q: Neo4j 测试数据如何清理？**  
A: 测试后执行 `MATCH (n) DETACH DELETE n` 清空所有节点和关系。
