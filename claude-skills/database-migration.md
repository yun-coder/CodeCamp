# Skill: 数据库迁移流程

## 适用场景

使用 Alembic 管理数据库结构变更，确保数据库迁移安全、可追溯、可回滚。

---

## Alembic 基础概念

**什么是 Alembic**:
- Python 的数据库迁移工具
- 基于 SQLAlchemy
- 版本控制数据库 schema 变更
- 支持升级（upgrade）和降级（downgrade）

**迁移文件**:
- 位置: `backend/alembic/versions/`
- 命名: `{revision}_{description}.py`
- 包含: `upgrade()` 和 `downgrade()` 函数

---

## 迁移流程五步法

### 第一步：设计数据库变更

**变更类型**:
1. **新建表** - 新增功能模块
2. **修改表** - 添加/删除/修改字段
3. **索引变更** - 优化查询性能
4. **数据迁移** - 数据格式转换或清洗

**设计检查清单**:
- [ ] 变更符合业务需求
- [ ] 考虑了数据兼容性
- [ ] 定义了回滚方案
- [ ] 评估了性能影响（大表操作需特别注意）

**示例：设计站点健康检查功能**
```sql
-- 新增表：site_health_checks
CREATE TABLE site_health_checks (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    check_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) NOT NULL,  -- UP/DOWN/DEGRADED
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引
CREATE INDEX idx_health_checks_site_time 
ON site_health_checks(site_id, check_time DESC);

-- 修改 sites 表：添加最近健康状态字段
ALTER TABLE sites 
ADD COLUMN last_health_status VARCHAR(32) DEFAULT 'UNKNOWN',
ADD COLUMN last_health_check TIMESTAMP WITH TIME ZONE;
```

---

### 第二步：生成迁移脚本

**自动生成（推荐）**:
```bash
# Alembic 检测 SQLAlchemy 模型变化，自动生成迁移脚本
alembic revision --autogenerate -m "add_site_health_checks"
```

**手动生成**:
```bash
# 创建空白迁移脚本，手动编写
alembic revision -m "add_site_health_checks"
```

**生成的文件**:
```
backend/alembic/versions/026_add_site_health_checks.py
```

---

### 第三步：编写迁移代码

**迁移脚本结构**:
```python
"""add site health checks

Revision ID: 026_add_site_health_checks
Revises: 025_operating_platform
Create Date: 2026-08-11 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '026_add_site_health_checks'
down_revision = '025_operating_platform'
branch_labels = None
depends_on = None

def upgrade():
    """升级：应用变更"""
    # 创建新表
    op.create_table(
        'site_health_checks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=False),
        sa.Column('check_time', sa.DateTime(timezone=True), 
                  server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('status', sa.String(32), nullable=False),
        sa.Column('response_time_ms', sa.Integer()),
        sa.Column('status_code', sa.Integer()),
        sa.Column('error_message', sa.Text()),
        sa.Column('created_at', sa.DateTime(timezone=True), 
                  server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 创建索引
    op.create_index(
        'idx_health_checks_site_time',
        'site_health_checks',
        ['site_id', sa.text('check_time DESC')],
        unique=False
    )
    
    # 修改现有表
    op.add_column('sites', 
        sa.Column('last_health_status', sa.String(32), server_default='UNKNOWN'))
    op.add_column('sites',
        sa.Column('last_health_check', sa.DateTime(timezone=True), nullable=True))

def downgrade():
    """降级：回滚变更"""
    # 删除新增的列
    op.drop_column('sites', 'last_health_check')
    op.drop_column('sites', 'last_health_status')
    
    # 删除索引
    op.drop_index('idx_health_checks_site_time', table_name='site_health_checks')
    
    # 删除表
    op.drop_table('site_health_checks')
```

---

### 第四步：本地验证迁移

**验证步骤**:

1. **备份数据库**:
```bash
# PostgreSQL
pg_dump -h localhost -U geosuite -d geosuite > backup_before_migration.sql

# 或使用 Docker
docker exec -t postgres-container pg_dump -U geosuite geosuite > backup.sql
```

2. **检查当前版本**:
```bash
alembic current
# 输出: 025_operating_platform (head)
```

3. **查看待执行的迁移**:
```bash
alembic history
alembic show 026_add_site_health_checks
```

4. **执行升级（upgrade）**:
```bash
# 升级到最新版本
alembic upgrade head

# 或升级到特定版本
alembic upgrade 026_add_site_health_checks
```

5. **验证结果**:
```bash
# 连接数据库查看
psql -h localhost -U geosuite -d geosuite

# 检查表是否创建
\dt site_health_checks

# 检查字段是否添加
\d sites

# 检查索引
\di idx_health_checks_site_time
```

6. **测试回滚（downgrade）**:
```bash
# 回滚一个版本
alembic downgrade -1

# 验证表已删除
psql -h localhost -U geosuite -d geosuite -c "\dt site_health_checks"

# 重新升级
alembic upgrade head
```

---

### 第五步：生产环境部署

**生产迁移检查清单**:
- [ ] 在生产数据副本上完整演练
- [ ] 评估迁移执行时间（大表操作可能很慢）
- [ ] 准备回滚方案
- [ ] 确认数据库备份已完成
- [ ] 安排维护窗口（如需停机）
- [ ] 通知相关团队

**生产迁移步骤**:

```bash
# 1. 备份生产数据库
pg_dump -h prod-db -U geosuite -d geosuite > prod_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 连接生产数据库
export DATABASE_URL="postgresql://user:pass@prod-db:5432/geosuite"

# 3. 检查当前版本
alembic current

# 4. 执行迁移
alembic upgrade head

# 5. 验证迁移结果
psql $DATABASE_URL -c "SELECT COUNT(*) FROM site_health_checks"

# 6. 如果失败，立即回滚
alembic downgrade -1
```

---

## 常见迁移场景

### 场景 1: 添加新字段（带默认值）

```python
def upgrade():
    # 添加非空字段时必须提供默认值
    op.add_column('sites',
        sa.Column('seo_score', sa.Float(), nullable=False, server_default='0.0')
    )
    
    # 如果不想要永久默认值，可以移除
    op.alter_column('sites', 'seo_score', server_default=None)

def downgrade():
    op.drop_column('sites', 'seo_score')
```

---

### 场景 2: 重命名字段

```python
def upgrade():
    # 重命名字段
    op.alter_column('sites', 'url', new_column_name='domain')

def downgrade():
    op.alter_column('sites', 'domain', new_column_name='url')
```

---

### 场景 3: 修改字段类型

```python
def upgrade():
    # 修改字段类型（可能需要类型转换）
    op.alter_column('sites', 'seo_score',
        type_=sa.Integer(),
        postgresql_using='CAST(seo_score AS INTEGER)'
    )

def downgrade():
    op.alter_column('sites', 'seo_score',
        type_=sa.Float()
    )
```

---

### 场景 4: 数据迁移

```python
from sqlalchemy.sql import table, column

def upgrade():
    # 添加新字段
    op.add_column('sites', sa.Column('full_url', sa.String(500)))
    
    # 数据迁移：根据现有字段计算新字段
    sites_table = table('sites',
        column('protocol', sa.String),
        column('domain', sa.String),
        column('full_url', sa.String)
    )
    
    # 使用 SQL 更新
    connection = op.get_bind()
    connection.execute(
        sites_table.update().values(
            full_url=sa.func.concat(
                sites_table.c.protocol, 
                '://', 
                sites_table.c.domain
            )
        )
    )

def downgrade():
    op.drop_column('sites', 'full_url')
```

---

### 场景 5: 创建枚举类型（PostgreSQL）

```python
def upgrade():
    # 创建枚举类型
    site_status = postgresql.ENUM(
        'ACTIVE', 'INACTIVE', 'ARCHIVED',
        name='site_status_enum',
        create_type=True
    )
    site_status.create(op.get_bind())
    
    # 使用枚举类型
    op.alter_column('sites', 'status',
        type_=site_status,
        postgresql_using='status::site_status_enum'
    )

def downgrade():
    # 改回 VARCHAR
    op.alter_column('sites', 'status',
        type_=sa.String(32)
    )
    
    # 删除枚举类型
    op.execute('DROP TYPE site_status_enum')
```

---

### 场景 6: 添加外键约束

```python
def upgrade():
    op.create_foreign_key(
        'fk_workflow_runs_site_id',  # 约束名称
        'workflow_runs',  # 源表
        'sites',  # 目标表
        ['site_id'],  # 源字段
        ['id'],  # 目标字段
        ondelete='CASCADE'  # 级联删除
    )

def downgrade():
    op.drop_constraint('fk_workflow_runs_site_id', 'workflow_runs', type_='foreignkey')
```

---

## 最佳实践

### 1. 迁移文件命名

**使用有意义的描述**:
- ✅ `add_site_health_checks`
- ✅ `add_index_to_diagnostics`
- ❌ `update_database`
- ❌ `fix_bug`

### 2. 一个迁移做一件事

**拆分复杂变更**:
```
❌ 一个迁移：添加3个表 + 修改5个字段 + 数据迁移
✅ 三个迁移：
   - 026_add_health_check_tables
   - 027_add_site_metadata_fields
   - 028_migrate_legacy_data
```

### 3. 向前兼容

**添加字段时使用默认值或允许 NULL**:
```python
# ✅ 兼容旧代码
op.add_column('sites', sa.Column('new_field', sa.String(), nullable=True))

# ❌ 如果旧代码不知道这个字段，INSERT 会失败
op.add_column('sites', sa.Column('new_field', sa.String(), nullable=False))
```

### 4. 测试 downgrade

**每次迁移都要测试回滚**:
```bash
alembic upgrade head
alembic downgrade -1
alembic upgrade head
```

### 5. 大表操作注意事项

**对于百万级数据的表**:
- 添加索引可能需要几分钟到几小时
- 修改字段类型可能需要重写整张表
- 考虑分批迁移数据

**分批迁移示例**:
```python
def upgrade():
    connection = op.get_bind()
    
    # 分批更新，每次 1000 行
    batch_size = 1000
    offset = 0
    
    while True:
        result = connection.execute(
            f"""
            UPDATE sites 
            SET full_url = protocol || '://' || domain
            WHERE id IN (
                SELECT id FROM sites 
                WHERE full_url IS NULL 
                ORDER BY id 
                LIMIT {batch_size}
            )
            """
        )
        
        if result.rowcount == 0:
            break
        
        offset += batch_size
        print(f"Migrated {offset} rows...")
```

---

## 常见问题

**Q: 迁移失败如何处理？**  
A: 
1. 查看错误信息
2. 回滚到上一个版本 `alembic downgrade -1`
3. 修复迁移脚本
4. 重新执行

**Q: 如何合并多个迁移？**  
A: 不推荐。保持迁移历史完整便于追溯。

**Q: 生产环境迁移需要停机吗？**  
A: 
- 添加字段/索引：不需要（注意大表创建索引用 CONCURRENTLY）
- 删除字段/表：可能需要（确保没有旧代码在用）
- 修改字段类型：通常需要

**Q: 如何在 Docker 中运行迁移？**  
A:
```bash
docker-compose exec backend alembic upgrade head
```

---

## 迁移脚本模板

```python
"""description

Revision ID: xxx
Revises: yyy
Create Date: 2026-08-11

"""
from alembic import op
import sqlalchemy as sa

revision = 'xxx'
down_revision = 'yyy'
branch_labels = None
depends_on = None

def upgrade():
    """升级数据库结构"""
    pass

def downgrade():
    """回滚数据库结构"""
    pass
```
