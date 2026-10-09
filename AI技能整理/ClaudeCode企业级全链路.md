# ClaudeCode 企业级全链路开发实战 — 完整知识路线与操作指南

> 基于课程《ClaudeCode 企业级全链路开发实战》（Hify 项目），整合 32 章正文 + 5 个实操视频 + 开篇词/结束语/热点速递/结课测试，提炼出从认知→方法→实操→交付的完整知识体系。

---

## 目录

- [一、课程全景与学习路径](#一课程全景与学习路径)
- [二、核心方法论（知识的"操作系统"）](#二核心方法论知识的操作系统)
- [三、五大阶段详细知识地图](#三五大阶段详细知识地图)
- [四、实操视频核心要点](#四实操视频核心要点)
- [五、关键实操命令速查](#五关键实操命令速查)
- [六、学习路线图（从入门到精通）](#六学习路线图从入门到精通)
- [七、常见问题与避坑指南](#七常见问题与避坑指南)

---

## 一、课程全景与学习路径

### 1.1 这门课在讲什么

**一句话**：一个人 + Claude Code = 一个工程团队的产能，但前提是你必须掌握一套系统的方法论。

**项目实战**：从零构建 **Hify**（简化版 Dify）—— 一个 AI 应用开发平台，包含模型管理、Agent 配置、对话引擎、RAG 知识库、工作流编排、MCP 工具接入等完整功能。

### 1.2 核心理念

```
你 = 架构师（做决策）
Claude Code = 你的工程团队（执行代码）
```

- **AI 是放大器，不是发动机** —— 你有方向它放大 10 倍，你没方向它放大的是 0
- **输入质量决定输出质量** —— 输入从 60 分到 80 分，输出可能从 40 跳到 85（阶梯式关系）
- **慢就是快** —— 动手前花时间"想清楚"，比直接让 AI 写代码反复返工快得多

### 1.3 学习路径（推荐顺序）

```
阶段一：顶层设计篇  →  阶段二：工程搭建篇  →  阶段三：核心功能篇
     ↓                      ↓                       ↓
  Ch01-07                Ch08-12                Ch13-19

阶段四：高阶功能篇  →  阶段五：测试部署篇  →  进阶篇
     ↓                      ↓                       ↓
  Ch20-26                Ch27-30                Ch31-32
```

---

## 二、核心方法论（知识的"操作系统"）

### 2.1 规范驱动开发（SDD）—— **最重要的方法论**

SDD 是整门课的基石：**先定规范，再让 AI 按规范执行**。

#### SDD 四步闭环

```
① 定规范 → ② AI 按规范执行 → ③ 人验证输出 → ④ 迭代规范
                                                            ↑
                                                  (发现遗漏就回到 ①)
```

#### 规范的三层组织

| 层次 | 存储位置 | 内容 |
|------|----------|------|
| **全局规范** | `CLAUDE.md` | 命名规则、接口格式、错误码体系、设计原则 |
| **模块规范** | 模块开发前单独定义 | 模块特有的约定 |
| **任务规范** | 每次下达任务的补充说明 | 当前任务的特殊要求 |

#### 有用规范的三个标准

1. **具体不模糊** —— AI 看到后不需要猜你的意思
2. **有优先级不贪多** —— 反复跑偏的地方写细，不跑偏的不写（最终 2-3 页）
3. **涉及工程权衡的带原因** —— 告诉 AI"为什么不能这样做"

#### 真实迭代过程（从 0 到完整规范）

```
第一周：空列表返回 null → 补"空列表返回空数组 []"
第二周：改一个模块顺手改了另一个 → 补"不破坏已有接口契约"
第三周：业务逻辑写在 Controller 里 → 补"Controller 只做参数校验"
前端周：引入技术栈以外的 UI 库 → 补"不引入技术栈以外的依赖"
```

### 2.2 两种协作模式

| 模式 | 适用场景 | 做法 |
|------|----------|------|
| **执行模式** | 对任务很清楚时 | 直接下精确指令，让 Claude Code 执行 |
| **咨询模式** | 不确定性高时 | 先让 Claude Code 梳理全景，你判断取舍，再执行 |

> **关键原则**：不确定时先问 Claude Code，不要自己硬想，也不要让它直接写。

### 2.3 三层分工原则

| 层级 | 谁做 | 内容 |
|------|------|------|
| **必须你做** | 人 | 产品边界、架构决策、技术取舍、跨模块一致性 |
| **你做 AI 验收** | 人+AI | 业务代码、接口开发、前端页面、测试用例、文档 |
| **AI 全权处理** | AI | 格式化、样板代码、简单重构、启动脚本 |

> **硬标准**：任何一行代码你都要能说清楚它在干什么。

### 2.4 三步检查法

1. **查意图** —— 它做的是不是你让它做的？（功能多了要砍）
2. **查质量** —— 风格、规范、一致性（命名、返回格式是否统一）
3. **查边界** —— 错误处理、异常、潜在风险（并发、边界输入）

> **顺序不能反！** 意图错了后面白查。

### 2.5 三问裁剪法（产品定义）

1. **第一问**：没有它产品还成立吗？→ 区分核心和边缘
2. **第二问**：做到什么程度够用？→ 核心功能不做满
3. **第三问**：能不能一句话说清楚产品？

### 2.6 四步探路法（学习陌生技术）

1. 从业务痛点出发问清楚解决什么问题
2. 拆解技术组件，缩小陌生范围
3. 给约束让 Claude Code 做选型对比，你来判断
4. 最小 Demo 优先跑通

### 2.7 领域快速理解四问

1. **是什么** —— 认知框架
2. **用在哪里** —— 优先级
3. **由什么组成** —— 功能取舍
4. **技术架构怎样** —— 架构决策

---

## 三、五大阶段详细知识地图

### 阶段一：顶层设计篇（Ch01-07）

> **目标**：把产品、架构、规范全部想清楚，写进 CLAUDE.md

#### Ch01 | 角色认知（你是架构师）

- **核心转变**：从"写代码"到"做决策"
- **精力分配变化**：AI 接走修 bug、review、测试、文档 → 人聚焦架构设计和核心决策
- **关键洞察**：输入质量和输出质量是**阶梯式关系**，不是线性关系

#### Ch02 | SDD 方法论（核心）

- **为什么需要 SDD**：Claude Code 没有长期记忆，每次新对话对它来说都是从零开始
- **SDD 四步闭环**：定规范 → 执行 → 验证 → 迭代
- **规范三层组织**：全局（CLAUDE.md）→ 模块 → 任务

#### Ch03 | 产品定义

- **五步流程**：调研标杆 → 功能取舍(三问裁剪) → 技术选型 → 运维预期 → 写进 CLAUDE.md
- **Hify 功能取舍案例**：
  - 知识库+RAG：从"砍掉"改为"降级做"（一期只支持 TXT+固定长度分块）
  - 工作流：不做可视化拖拽
  - 多租户/权限体系：直接砍掉

#### Ch04 | 应用架构与代码组织

- **架构选型**：模块化单体（否决微服务，一个人维护太沉重）
- **Maven 模块划分**：
  ```
  hify-app / hify-provider / hify-agent / hify-chat / hify-mcp
  hify-workflow / hify-knowledge / hify-common / hify-web / deploy
  ```
- **Spring 代码组织规范**：
  - 统一结构：controller/service/mapper/entity/dto/config/exception/constant
  - Controller 不做业务逻辑，只做参数校验
  - 跨模块调用只走 Service 接口
  - Entity 不直接返回给前端，用 DTO 转换
- **LLM 外部调用设计**：
  - 线程池隔离（LLM 用独立线程池）
  - Resilience4j 熔断（每个提供商独立）
  - 超时控制：SSE 120s / 同步 60s / 连通性测试 10s
  - 重试策略：网络抖动重试 / 认证失败不重试 / 限流退避重试

#### Ch05 | 部署架构与数据设计

- **当前部署**：Nginx → Spring Boot(单副本) → MySQL + Redis + PostgreSQL(pgvector)
- **扩展路径三阶段**：50→500人（扩副本+读写分离） / 500→2000人（加消息队列+迁Qdrant） / 2000→几千人（拆微服务+Redis集群）
- **数据模型**：约 16 张表（model/agent/conversation/knowledge/workflow/mcp）
- **数据库规范**：
  - 通用字段：id BIGINT自增、created_at/updated_at DATETIME(3)、deleted TINYINT(1)、禁止NULL、枚举用VARCHAR(32)
  - 索引五原则：逻辑删除字段加进索引、等值列在前范围列在后、多对多表双向索引、禁止TEXT建索引
  - 游标分页替代 OFFSET 深分页
  - pgvector 必须建 HNSW 索引

#### Ch06 | CLAUDE.md & Skills

- **CLAUDE.md 五层结构**：项目上下文 → 架构规范 → 代码组织 → 部署/数据库 → 接口/行为指令
- **行为指令（最关键且最容易被忽略）**：
  - 写代码时：最简单实现、不引入不必要设计模式、不引入技术栈外依赖、外部调用有超时
  - 改代码时：先理解设计意图、不破坏接口契约、改完确保测试通过
  - 不确定时：架构选择给 2-3 方案对比、规范没覆盖先问
- **Skills**：放在 `.claude/skills/` 目录下的 Markdown 文件，描述标准操作流程
- **指导原则**：不要从零发明规范，把《阿里巴巴 Java 开发手册》喂给 Claude Code 让它生成

---

### 阶段二：工程搭建篇（Ch08-12）

> **目标**：从零搭建可运行的前后端工程骨架

#### Ch08 | 后端骨架搭建

- **任务拆解原则**：以"一次能验证"为单元拆解
- **四步搭建流程**：Maven 骨架 → hify-common → 业务模块空壳 → 验收
- **hify-common 五个子任务**：
  1. Result + PageResult 统一返回
  2. ErrorCode + BizException 异常体系
  3. GlobalExceptionHandler 全局异常处理
  4. MyBatis-Plus 配置（分页、自动填充）
  5. Redis 配置（序列化、连接池）
- **验收命令**：`mvn spring-boot:run -pl hify-app` + `GET /api/v1/health`

#### Ch09 | 前端工程搭建

- **技术栈**：Vue 3 + TypeScript + Vite + Element Plus
- **前端三步走**：项目骨架 → axios 统一请求层 → 路由和页面空壳
- **关键配置**：Vite 代理 `/api` → `localhost:8080`
- **axios 响应拦截器**：code===200 直接返回 data，非 200 用 ElMessage.error

#### Ch10 | 后端业务基础设施

- **三档优先级**：
  - P0（必须先做）：schema.sql、@MapperScan、线程池
  - P1（同步补）：BaseEntity、分页封装、@Valid 校验、序列化、缓存
  - P2（后补）：LlmHttpClient、熔断重试、结构化日志
- **线程池配置**：llmExecutor (core=10, max=50, queue=100)，asyncExecutor (core=5, max=20, queue=200)

#### Ch11 | 前端 UI 与组件

- **让 AI 当设计师**：输入要具体（产品是什么→用户是谁→什么风格→色调偏好→参考锚点）
- **5 个基础组件**：HifyTable(表格+分页)、HifyFormDialog(表单弹窗)、useConfirm(删除确认)、useRequest(请求状态)、notify(通知)
- **UI 打磨句式**：`[位置/组件] + [哪里不对] + [应该怎样]`

---

### 阶段三：核心功能篇（Ch13-19）

> **目标**：交付模型管理、Agent、对话引擎三大核心功能

#### Ch13 | 模型提供商管理

- **供应商分类**：OpenAI兼容(最大) / Anthropic(自定义Header) / Ollama(无认证) / Gemini(不同格式)
- **技术决策**：一期不引入 Spring AI / LangChain4j
- **数据模型**：三张表 provider(含JSON存储auth_config) / model_config / provider_health
- **连通性测试**：根据 type 分发（if-else）
- **健康检查**：@Scheduled 每分钟执行，连续失败 3 次标记 DOWN
- **交付时间**：完整前后端约半天

#### Ch14 | Skills（经验沉淀）

- **Skill 的本质**：把经验编码化，踩过的坑、总结的流程固化成文字
- **CLAUDE.md vs Skill**：前者是全局规范（每次自动加载），后者是流程手册（引用时生效）
- **第一个 Skill**：`module-delivery.md` 覆盖 8 步流程
- **第二个 Skill**：`provider-adapter.md` 覆盖供应商适配流程
- **策略模式重构**：if-else → ProviderAdapter 接口 → Factory 自动注册

#### Ch15 | Agent 创建与配置

- **Agent vs 普通对话**：Agent 是有目标、能行动的对话主体（Tool Use + 多轮自主决策）
- **Hify Agent 定位**："有身份的对话配置模板"
- **三层配置**：身份定义(名称/描述/System Prompt) → 能力绑定(模型/工具/知识库) → 运行参数(temperature/max_tokens等)
- **工具绑定策略**：绑整个 MCP Server 而不是单个工具（内部系统，简单优先）

#### Ch16-17 | 对话引擎（上下）

- **对话链路六步**：查配置 → 取历史 → 写用户消息 → 拼装请求 → 流式调用 LLM → 存回复
- **SSE vs WebSocket**：对话是"一问一答"单向推送，SSE 足够，WebSocket 的双向能力用不上
- **SseEmitter 三个坑**：
  1. 超时设 120s（非默认 30s）
  2. 客户端断开需 catch IOException 停止 LLM
  3. Nginx 必须关缓冲（proxy_buffering off）
- **存储三层分工**：
  - MySQL：持久化全量对话记录
  - Redis：工作内存（最近 maxContextTurns 轮消息）
  - pgvector：不存对话历史（那是 RAG 的事）
- **滑动窗口策略**：Redis List 天然支持 RPUSH + LPOP
- **sendMessage 九步**：整个系统最复杂的 Service 方法

#### Ch18 | 复杂前端-流式聊天界面

- **复杂页面描述三层次（有顺序依赖）**：
  1. 结构层（布局）
  2. 行为层（交互）
  3. 细节层（动画/样式）
- **静态交互四维度**：布局/数据/交互/接口
- **动态交互按时间线描述**：用户点击→输入框清空→用户气泡→AI气泡→流式接收→done事件
- **SSE 前端注意**：标准 EventSource 只支持 GET，SSE over POST 不能用，需用 fetch + ReadableStream

---

### 阶段四：高阶功能篇（Ch20-26）

> **目标**：RAG 知识库、工作流编排、MCP 工具接入

#### Ch20-21 | RAG 知识库（上下）

- **RAG 本质**：检索→增强→生成，不动模型，实时补充文档到 Prompt
- **两阶段六组件**：
  - 入库管道：文档解析器 → 文本分块器 → Embedding 模型 → 向量数据库
  - 检索链路：检索器 → Prompt 组装器
- **选型**：pgvector（不引入新依赖、SQL 操作直接 JOIN、百万级够用）
- **Embedding 模型**：text-embedding-3-small（1536 维）
- **分块策略**：递归分割，chunk_size=512 token，overlap=64 token
- **最小侵入点**：RAG 检索插在对话的第 6 步和第 7 步之间（只改 buildMessages 方法）
- **增量开发三步走**：圈定改动范围 → 验证旧功能没坏 → 验证新功能生效

#### Ch22-23 | 工作流编排（上下）

- **工作流解决的问题**：单 Prompt 用同一种方式回答所有问题 → 工作流根据意图走不同路径
- **元数据三张表**：workflow + workflow_node + workflow_edge
- **Java 类型安全**：sealed interface + record + switch 模式匹配（编译器检查穷举）
- **执行引擎四组件**：
  - ExecutionContext（变量池，key 格式 `nodeKey.varName`）
  - NodeExecutor（统一接口 + 按 type 分发 + Spring 自动注册）
  - 核心循环（while 循环从 START 到 END）
  - 执行记录（workflow_run + workflow_node_run）
- **三步实现法**：线性执行 → 加条件分支 → 加错误处理

#### Ch24-25 | MCP 工具接入（上下）

- **MCP 核心**：M 个 AI 平台 × N 个工具 = M+N 套适配（USB 模式），不是 M×N
- **三概念**：MCP Server(工具方) / MCP Client(调用方) / Tool Schema(标准描述)
- **Function Calling 流程**：用户输入 → 第一次 LLM 调用(返回 tool_calls) → 执行工具 → 追加结果 → 第二次 LLM 调用(生成回答)
- **Java SDK 坑**：HttpClientSseClientTransport 有资源泄漏，用 try-with-resources 每次用完关闭
- **自建 MCP Server**：独立的 Spring Boot 应用，SDK 自动暴露 `/GET sse` 和 `POST /messages`
- **工具设计原则**：description 写清楚何时调用，返回值考虑 LLM 如何使用

---

### 阶段五：测试部署篇（Ch27-30）

> **目标**：质量体系、容器化部署、可观测性

#### Ch27 | 质量保证体系

- **四个质量层次**：
  - 核心链路识别（人判断）
  - 单元测试（AI 执行）
  - 集成测试（策略人定，AI 执行）
  - 混沌测试（维护阶段做）
- **判断三问（哪些值得测）**：有没有 IO？去掉外部依赖还有复杂度吗？改动频率高出错影响大？
- **单测规范**：`should_[期望结果]_when_[输入条件]` 命名 / Given-When-Then / AssertJ
- **双模型 review**：Claude Code 写代码 + ChatGPT 做 review（互补效果好）

#### Ch28 | 容器化与部署

- **三种部署形态**：tar.gz(无 Docker 环境) / Docker(投入产出比最高) / K8s(高可用)
- **Docker 细节**：多阶段构建 / 非 root 用户 / Spring Boot layertools 四层拆分
- **Nginx SSE 关键**：`proxy_buffering off` + `proxy_read_timeout 120s`
- **K8s 关键**：2 副本 / liveness+readiness 探针用 `/api/v1/health`

#### Ch29 | 可观测性

- **三大模块**：结构化日志(JSON+traceId) → 指标监控(Prometheus+Micrometer+Grafana) → 健康检查
- **三个提前架构决策**：Actuator 独立端口(8081) / traceId 提前进 MDC / 日志规范趁早定
- **MDC 跨线程缺失**：用 MdcTaskWrapper 修复（父线程快照→子线程恢复→执行后清理）
- **Prometheus 指标**：`hify_chat_requests_total` / `hify_llm_duration_ms`(需要 publishPercentileHistogram true 才有 P95/P99) / `hify_circuit_breaker_state`
- **Grafana Dashboard**：247 行 JSON，Claude Code 生成
- **三级告警**：P0(4条) / P1(5条) / P2(3条)

---

### 进阶篇（Ch31-32）

#### Ch31 | SDD 进阶与工具生态

- **四层规范工具**：CLAUDE.md(全局规则) → Skills(任务流程) → Spec-Kit(结构化版本化规范) → AWS Kiro(企业强制流程)
- **Spec Coding**：先写 spec 让 AI 审核，再执行代码（业务场景→API 设计→数据约束→错误处理→模块影响）
- **CLAUDE.md 膨胀问题**：>200 行、混入步骤指令、AI 忽略后面内容 → 拆出 Skills
- **老项目改造三原则**：
  1. Survey 先于动手（让 AI 读全部代码出报告）
  2. 安全网优先（先写集成测试锁定行为）
  3. Boy Scout 规则（每次改一个文件让它比来时好一点）

#### Ch32 | 学习路径与认知边界

- **Vibe Coding 的本质**：是驾驭不是依赖
- **Hify 作为"树干"**：有一个完整项目作锚点，新知识都能附着上去
- **四个反思问题**：哪些决策你真懂 vs 跟从？哪些步骤你最依赖 AI？哪些技术选择你盲目接受？你的盲点清单是什么？

---

## 四、实操视频核心要点

> 课程包含 5 个实操录屏视频（07、12、19、26、30），通过 Gemini 原生多模态 + Whisper 转录分析获得以下要点

### 视频 19：核心功能基础篇全流程演示

**场景 1：后端跑通模型管理模块**
- 按 `module-delivery` Skill 执行，从 Entity → Mapper → Service → Controller 全链路
- Claude Code 自动检测本地环境（发现本地 MySQL 无密码并自动识别连接）
- 验证方式：curl 验收三个接口
- **关键洞察**：Claude Code 会自动纠正指令中的错误路径并尝试正确路径

**场景 2：前端对接**
- 后端接口完成后，一句指令生成前端 API 封装方法
- 自动生成管理页面（列表、新增、编辑）

**场景 3：经验变成 Skill**
- 让 Claude Code 讲解什么是 Skill
- 将模块交付流程固化为 Skill 文件
- 用一句话 `@按模块交付流程 帮我生成Agent管理模块` 验证 Skill 效果

**主讲人核心观点**：
- 你必须是"想清楚"的那个人，AI 只是执行者
- 提示词不是瞎写的，课程所有提示词都是可复用的
- 开发模式已变：AI 能自动识别本地数据库并连接，安全需要关注

### 视频 26：核心功能高阶篇全流程演示

**场景 1：概念探路（工作流引擎）**
- **第一步**：用业务场景（智能客服）解释工作流，不讲理论
- **第二步**：问"工作流在代码里长什么样"→ 节点数组 + 连线数组 + while 循环
- **第三步**：设计数据模型（三张表）
- 这个三步思考线可以复用到任何新功能的理解

**场景 2：元数据 CRUD**
- Claude Code 自动创建数据库表、实现 CRUD 接口
- 接口返回 200 后，直接去数据库验证数据已写入

**场景 3：执行引擎**
- 先让 Claude Code 做技术调研（对比 Dify/n8n/Coze/Temporal）
- 分步实现：线性执行 → 加条件分支 → 加错误处理

**场景 4：前端页面**
- Claude Code 自动生成工作流配置页面（节点、连线、编辑）
- 前端风格不固定（每次生成的 UI 效果都可能不同）

**主讲人核心观点**：
- 提示词越细越好，但不会写时可以让 AI 帮你细化
- 新项目开发比老项目改造简单得多
- 所有提示词都在课程文档中可直接复用

### 视频 30：测试部署全流程演示

**场景 1：识别核心链路**
- 让 Claude Code 分析系统，输出核心链路清单、风险点清单和测试重心建议

**场景 2：测试**
- **单元测试**：让 Claude Code 分析 Service 方法，生成测试计划和代码 → 运行验收
- **集成测试**：生成集成测试清单 → 测试驱动修复（先写失败测试，再修 bug）
- 推荐做法：不要一次跑大量测试，分模块逐步验证

**场景 3：部署**
- 先咨询再执行：Claude Code 推荐三种部署形态
- 健康检查接口必须先补（容易被忽略）
- 生成 tar.gz 本地包 + 前端部署 + Docker + docker-compose

**场景 4：可观测性**
- 让 Claude Code 分析要做哪些可观测功能
- 生成结构化日志配置 → Prometheus 指标 → Grafana Dashboard（自动纠错，发现缺失 `_bucket` 会主动询问修复）→ 告警策略建议

**主讲人核心观点**：
- 核心经验：只用对话，每次只做小功能修改，要有预期的效果
- 不要一次性生成大量代码（10 万行你 review 不了）
- 可观测的三大件：日志 → 指标 → 告警，在 AI 时代都是固定模板化输出

### 视频 07：顶层设计全流程演示（章节已覆盖）

> 由于视频文件较大（434MB），转录分析未完成，完整内容已在 Ch07 章节总结中覆盖

**关键实操流程**：
1. 让 Claude Code 分析 Dify 功能模块 → 做功能取舍（三问裁剪法）
2. 架构设计：模块划分、依赖关系、外部调用设计
3. 数据设计：ER 图、字段规范、索引原则
4. 部署架构：Nginx → Spring Boot → MySQL + Redis + pgvector
5. 最终产出完整 CLAUDE.md

### 视频 12：工程搭建全流程演示（章节已覆盖）

> 由于 Gemini API 配额限制，完整合成未完成，内容已在 Ch12 章节总结中覆盖

**关键实操流程**：
1. 先确认 CLAUDE.md 内容 → 初始化 Maven 多模块骨架
2. 初始化 hify-common 公共模块（统一响应、异常处理、MyBatis-Plus、Redis）
3. 搭建业务模块空壳并启动验证
4. 前端工程搭建（Vue 3 + TypeScript + Vite + Element Plus）
5. UI 打磨（色调、组件、布局优化）

**主讲人核心观点**：
- 不会用 AI 的研发会被淘汰，会用 AI 的研发还要区分"只会写代码"和"会做产品"
- 核心竞争在：掌控全局、拆解问题、领域理解、编码实现、数据稳定性、水平扩容、分布式、安全、铺排——综合能力
- 熟能生巧是唯一路径

### 实践建议 ⭐

每个视频看完后：
1. 打开对应章节的 Markdown 文档，复制提示词
2. 搭建一个自己的项目，跟着提示词跑一遍
3. 遇到报错就直接把错误丢给 Claude Code 修复（这是最高效的学习方式）

---

## 五、关键实操命令速查

### 5.1 开发启动

```bash
# 构建后端
mvn clean install -DskipTests
# 启动后端
mvn spring-boot:run -pl hify-app
# 启动前端
cd hify-web && npm run dev
# 一键启动
bash start.sh
# 健康检查
curl http://localhost:8080/api/v1/health
```

### 5.2 验证 SSH 流式响应

```bash
# 带流式验证（Nginx 必须关 buffering）
curl -N -X POST http://localhost:8080/api/v1/chat/send \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"sessionId": 1, "content": "你好"}'
```

### 5.3 验证 MCP Server

```bash
# 查看工具列表
curl http://localhost:9099/mcp/tools/list
# 初始化 SSE 连接
curl -N http://localhost:9099/sse
```

### 5.4 数据库操作

```sql
-- 查看工作流执行记录
SELECT * FROM workflow_run ORDER BY created_at DESC;
-- 查看节点执行详情
SELECT * FROM workflow_node_run WHERE run_id = ? ORDER BY sequence;
```

### 5.5 部署 Docker

```bash
# 构建镜像
docker build -t hify-app .
# 启动所有服务
docker-compose up -d
# 查看日志
docker-compose logs -f app
```

### 5.6 Skills 目录结构

```
.claude/
├── skills/
│   ├── module-delivery.md      # 模块交付八步流程
│   ├── provider-adapter.md     # 供应商适配五步流程
│   ├── unit-test.md            # 单元测试流程
│   └── integration-test.md     # 集成测试流程
└── CLAUDE.md                   # 全局规范（自动加载）
```

### 5.7 Skill 触发

```bash
# 引用 Skill 执行
@按照 module-delivery Skill 创建 Agent 模块
```

---

## 六、学习路线图（从入门到精通）

### 第一阶段：认知建立（1-2 天）

| 学习内容 | 方式 | 产出 |
|----------|------|------|
| 开篇词 + Ch01 | 阅读 | 建立"你是架构师"的认知框架 |
| Ch02 SDD | 精读 + 笔记 | 掌握规范驱动开发的核心方法论 |
| Ch06 CLAUDE.md 与 Skills | 阅读 | 理解 CLAUDE.md 和 Skills 的作用 |

### 第二阶段：动手实践（3-5 天）

| 学习内容 | 方式 | 产出 |
|----------|------|------|
| Ch03-05 产品+架构+数据 | 阅读 + 跟着思考 | 理解顶层设计的方法 |
| Ch07 实操视频 | 观看 + 动手跟做 | 一份自己的 CLAUDE.md |
| Ch08-09 工程搭建 | 阅读 + 动手跟做 | 可运行的前后端工程 |

### 第三阶段：核心功能（5-7 天）

| 学习内容 | 方式 | 产出 |
|----------|------|------|
| Ch10-11 基础组件 | 阅读 + 理解 | 理解为何先做基础设施 |
| Ch12 实操视频 | 观看 + 跟做 | 完整的 Hify 工程骨架 |
| Ch13-15 模型+Agent+Skill | 阅读 + 跟做 | Provider 和 Agent 模块运行 |
| Ch16-18 对话引擎 | 精读 + 跟做 | 流式对话前后端跑通 |
| Ch19 实操视频 | 观看 + 跟做 | 完成核心功能闭环 |

### 第四阶段：高阶能力（5-7 天）

| 学习内容 | 方式 | 产出 |
|----------|------|------|
| Ch20-21 RAG | 阅读 + 跟做 | 知识库文档上传+检索 |
| Ch22-23 工作流 | 阅读 + 跟做 | 工作流引擎运行 |
| Ch24-25 MCP | 阅读 + 跟做 | MCP 工具调用 |
| Ch26 实操视频 | 观看 + 跟做 | 高阶功能全部跑通 |

### 第五阶段：生产级交付（3-5 天）

| 学习内容 | 方式 | 产出 |
|----------|------|------|
| Ch27 质量体系 | 阅读 + 跟做 | 单测 + 集成测试 |
| Ch28 部署 | 阅读 + 跟做 | Docker + K8s 部署 |
| Ch29 可观测性 | 阅读 + 跟做 | 监控 + 日志 + 告警 |
| Ch30 实操视频 | 观看 + 跟做 | 全流程 |

### 第六阶段：进阶（2-3 天）

| 学习内容 | 方式 | 产出 |
|----------|------|------|
| Ch31 Spec-Kit | 阅读 + 尝试 | 掌握高级规范工具 |
| Ch32 总结 | 阅读 + 反思 | 自己的盲点清单和成长路径 |
| 结课测试 | 自我测试 | 检验掌握程度 |

---

## 七、常见问题与避坑指南

### 7.1 CLAUDE.md 常见问题

| 问题 | 解决 |
|------|------|
| **CLAUDE.md 膨胀 > 200 行** | 把步骤流程拆成 Skills 文件 |
| **AI 忽略 CLAUDE.md 后半部分** | 全局规则放前面，行为指令最多 7 条 |
| **规范和流程混在一起** | 全局规则放 CLAUDE.md，操作手册放 Skills |

### 7.2 SSE 流式通信常见坑

| 问题 | 解决 |
|------|------|
| **前端看不到打字机效果** | Nginx 必须关 proxy_buffering |
| **SseEmitter 自动超时** | 设置超时为 120s（非默认 30s） |
| **前端用 EventSource 发 POST** | EventSource 只支持 GET，用 fetch + ReadableStream |
| **客户端断开后 LLM 还在调用** | SseEmitter.onError catch IOException 后停止 LLM |

### 7.3 数据库常见坑

| 问题 | 解决 |
|------|------|
| **OFFSET 分页性能差** | 用游标分页替代 |
| **pgvector 向量检索慢** | 建 HNSW 索引（IVFFlat 召回率不稳定） |
| **MyBatis 不支持 vector 类型** | 自定义 TypeHandler 做 float[] ↔ vector 互转 |

### 7.4 MDC 跨线程丢失

- **问题**：新建线程（llmExecutor）丢失父线程的 MDC 上下文
- **解决**：创建 MdcTaskWrapper，父线程 MDC 快照在提交时捕获，子线程执行前恢复

### 7.5 事务与 SSE 不能共存

- **问题**：SseEmitter 发送过程中事务可能已回滚
- **解决**：写消息操作拆成独立事务方法，不在 SSE 发送过程中保持事务

### 7.6 MCP Java SDK 资源泄漏

- **问题**：HttpClientSseClientTransport 有资源泄漏
- **解决**：用 try-with-resources 每次建连用完关闭

### 7.7 写代码的常见误区

| 误区 | 正确做法 |
|------|----------|
| **一次把所有功能点丢给 Claude Code** | 拆成多层，按结构→行为→细节顺序描述 |
| **给模糊指令** | 给精确指令，引用 CLAUDE.md 中的规范 |
| **改完不跑旧用例** | 增量开发三步走：圈范围→验旧→验新 |
| **让 AI 做架构决策** | 约束条件给够，你自己判断 |
| **报错信息只贴一半** | 贴完整错误上下文 + 相关代码 + 问"根本原因" |

---

## 八、课程技术栈总览

| 层级 | 技术选型 | 关键词 |
|------|----------|--------|
| **后端框架** | Spring Boot 3.x + MyBatis-Plus | Maven 多模块 |
| **前端** | Vue 3 + TypeScript + Vite + Element Plus | SPA |
| **数据库** | MySQL 8.x + Redis 7.x + PostgreSQL(pgvector) | HNSW 索引 |
| **部署** | Nginx + Docker + Docker Compose + K8s | proxy_buffering off |
| **可观测** | Prometheus + Micrometer + Grafana + ELK | traceId 串联 |
| **AI** | Claude Code + ChatGPT(双模型 review) | 咨询模式/执行模式 |
| **LLM** | OpenAI + Anthropic + Ollama + 其他 | ProviderAdapter |
| **协议** | SSE(对话) + MCP(工具) | Function Calling |
| **工程** | Maven + Git + Makefile + GitHub Actions | 一键启动脚本 |

---

## 九、附录：各章节速查表

| 章节 | 标题 | 核心知识点 | 难度 |
|------|------|-----------|------|
| 开篇词 | 一个人用Claude Code造Dify | 角色认知、协作模式、SDD | ⭐ |
| 热点 | Claude Code源码泄漏 | 事件分析、真正壁垒 | ⭐ |
| 01 | 你是架构师 | 三层分工、三步检查法 | ⭐⭐ |
| 02 | 规范驱动开发(SDD) | SDD四步闭环、规范组织、迭代 | ⭐⭐⭐ |
| 03 | 产品定义 | 五步流程、三问裁剪、技术选型 | ⭐⭐ |
| 04 | 应用架构与代码组织 | 模块化单体、依赖原则、LLM调用设计 | ⭐⭐⭐ |
| 05 | 部署架构与数据设计 | 扩展路径、数据模型、数据库规范 | ⭐⭐⭐ |
| 06 | CLAUDE.md与Skills | 五层结构、行为指令、Skill机制 | ⭐⭐⭐ |
| 07 | 实操课-顶层设计 | 全流程屏录 | ⭐⭐ |
| 08 | 后端骨架 | Maven多模块、hify-common | ⭐⭐ |
| 09 | 前端工程 | Vue3+Vite、axios封装、一键启动 | ⭐⭐ |
| 10 | 后端基础设施 | 三档优先级、线程池、日志 | ⭐⭐⭐ |
| 11 | 前端UI与组件 | 设计系统、5个基础组件 | ⭐⭐ |
| 12 | 实操课-工程搭建 | 全流程屏录 | ⭐⭐ |
| 13 | 模型提供商管理 | 供应商分类、CRUD、连通性测试 | ⭐⭐⭐ |
| 14 | Skills经验沉淀 | Skill本质、策略模式重构 | ⭐⭐⭐ |
| 15 | Agent创建与配置 | 三层配置、四问法 | ⭐⭐ |
| 16 | 对话引擎(上) | 六步链路、SSE技术选型 | ⭐⭐⭐ |
| 17 | 对话引擎(下) | 上下文本质、存储分层、滑动窗口 | ⭐⭐⭐⭐ |
| 18 | 复杂前端交互 | 三层描述法、静态/动态交互 | ⭐⭐⭐ |
| 19 | 实操课-核心功能基础 | 全流程屏录 | ⭐⭐ |
| 20 | RAG知识库(上) | RAG原理、pgvector选型 | ⭐⭐⭐ |
| 21 | RAG知识库(下) | 最小侵入集成、增量开发 | ⭐⭐⭐⭐ |
| 22 | 工作流编排(上) | 元数据设计、sealed interface | ⭐⭐⭐ |
| 23 | 工作流编排(下) | 执行引擎、ExecutionContext | ⭐⭐⭐⭐ |
| 24 | MCP工具接入(上) | MCP协议、Function Calling | ⭐⭐⭐ |
| 25 | MCP工具接入(下) | 自建MCP Server、工具设计 | ⭐⭐⭐ |
| 26 | 实操课-核心功能高阶 | 全流程屏录 | ⭐⭐ |
| 27 | 质量保证体系 | 四层质量、单测/集成测试规范 | ⭐⭐⭐ |
| 28 | 容器化与部署 | 三种部署形态、Docker/K8s | ⭐⭐⭐ |
| 29 | 可观测性 | 结构化日志、指标、健康检查、告警 | ⭐⭐⭐⭐ |
| 30 | 实操课-测试部署 | 全流程屏录 | ⭐⭐ |
| 31 | SDD进阶与工具生态 | Spec-Kit、Spec Coding、老项目改造 | ⭐⭐⭐⭐ |
| 32 | 局限与起点 | 认知边界、学习路径 | ⭐⭐ |

---

## 十、实战案例与最佳实践

### 10.1 GEOSuite 项目实战案例

基于课程方法论，应用到真实的 GEO（生成式搜索优化）工作台项目。

#### 项目背景

**GEOSuite**: 企业级 SEO 与 GEO 工作台
- **技术栈**: FastAPI + Next.js + PostgreSQL + Redis + Neo4j + Qdrant
- **核心功能**: 站点审计、AI 可见度监测、内容优化建议、项目交付
- **复杂度**: 多数据库协同、长时间异步任务、图数据库集成、向量检索

#### 实战应用：从 Hify 方法论到 GEOSuite

| Hify 课程概念 | GEOSuite 实际应用 | 关键差异 |
|-------------|-----------------|---------|
| **模型提供商管理** | 站点审计规则引擎 | 从 LLM 适配器 → 审计规则适配器 |
| **对话引擎** | 工作流编排引擎 | 从流式对话 → 有向无环图执行 |
| **RAG 知识库** | 内容知识图谱 | 从向量检索 → 图数据库 + 向量混合 |
| **MCP 工具接入** | GSC/DataForSEO 集成 | 从 MCP 协议 → RESTful API 适配 |
| **健康检查** | 站点可抓取性检测 | 从服务健康 → 业务健康 |

---

### 10.2 方法论迁移关键点

#### 案例 1: SDD 方法论的实际落地

**场景**: 开发站点审计工作流模块

**第一周（规范缺失导致的问题）**:
```python
# Claude Code 生成的代码（不符合预期）
def run_audit(site_url):
    results = []
    # 直接在 Controller 写业务逻辑
    if check_robots(site_url):
        results.append({"rule": "robots", "status": "ok"})
    return {"data": results}  # 返回格式不统一
```

**迭代后的 CLAUDE.md 规范**:
```markdown
## 审计工作流规范

### 架构分层
- **Controller**: 只做参数校验和调用 Service
- **Service**: 编排工作流节点执行顺序
- **Executor**: 每个审计规则独立实现 NodeExecutor 接口
- **Reporter**: 统一格式化输出

### 返回格式
- 审计规则返回: `{"passed": bool, "severity": str, "evidence": dict}`
- 工作流返回: `{"workflow_run_id": int, "status": str, "findings": list}`

### 为什么这样设计
- 审计规则会频繁增加，策略模式便于扩展
- 不同规则可能并行执行，需要独立隔离
- 审计结果需要入库，统一格式便于查询
```

**结果**: 之后 Claude Code 生成的代码完全符合预期，无需返工。

---

#### 案例 2: 三步检查法的实战应用

**场景**: Claude Code 生成了 AI 可见度监测的代码

**第一步：查意图**
```python
# Claude Code 生成的代码
async def monitor_visibility(site_id: int, query_set_id: int):
    # 问题：自动启动了监测并等待完成
    monitor_run = await start_monitoring(site_id, query_set_id)
    result = await wait_for_completion(monitor_run.id)  # ❌ 阻塞式等待
    return result
```

**发现问题**: 我只让它"启动监测"，它却做了"启动+等待+返回结果"。
**纠正**: "只返回 task_id，监测异步执行，前端轮询状态。"

**第二步：查质量**
```python
# 检查命名规范
monitor_run  # ✅ 符合蛇形命名
querySetId   # ❌ 前端风格混入后端
```

**第三步：查边界**
```python
# 检查异常处理
async def call_llm(prompt: str):
    response = await client.generate(prompt)  # ❌ 没有超时
    return response.text  # ❌ 没有处理 None

# 应该是
async def call_llm(prompt: str, timeout: int = 120):
    try:
        response = await asyncio.wait_for(
            client.generate(prompt), 
            timeout=timeout
        )
        if not response or not response.text:
            raise ValueError("LLM returned empty response")
        return response.text
    except asyncio.TimeoutError:
        logger.error(f"LLM timeout after {timeout}s")
        raise
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        raise
```

---

#### 案例 3: 增量开发三步走

**场景**: 给已有的站点审计流程添加 Neo4j 知识图谱支持

**错误做法（一次改动太大）**:
```python
# ❌ 同时改了太多地方
- 修改 WorkflowService 增加图谱写入
- 修改 DiagnosticService 改变数据结构
- 修改 ReportBuilder 增加图谱可视化
- 修改前端增加图谱展示组件
```
结果：哪里出问题都不知道，改完所有测试都失败。

**正确做法（增量验证）**:

**Step 1: 圈定改动范围**
```markdown
最小改动点：
1. 在 WorkflowService.complete_audit() 末尾增加一个钩子
2. 创建 GraphStoreService 处理图谱写入
3. 不改变现有数据结构和接口
```

**Step 2: 验证旧功能没坏**
```bash
# 执行现有测试
pytest backend/tests/test_workflow_service.py -v
# ✅ 全部通过，说明旧功能未受影响
```

**Step 3: 验证新功能生效**
```python
# 新增测试
def test_should_write_to_neo4j_when_audit_complete(db, neo4j_driver):
    # Given: 完成审计
    workflow_run = complete_audit_workflow(db, site_id=1)
    
    # When: 验证图谱写入
    with neo4j_driver.session() as session:
        result = session.run("""
            MATCH (s:Site {site_id: $site_id})-[:HAS_FINDING]->(f:Finding)
            RETURN count(f) as finding_count
        """, site_id=1)
        count = result.single()["finding_count"]
    
    # Then: 发现项已写入图谱
    assert count > 0
```

---

### 10.3 从零到生产的完整案例

#### 真实需求：开发"品牌提及监测"功能

**第一阶段：顶层设计（1天）**

**1. 产品定义（三问裁剪法）**
```
Q1: 没有它产品还成立吗？
A: 成立，但缺少重要的品牌监测维度 → 属于 P1 功能

Q2: 做到什么程度够用？
A: 一期只监测固定品牌词，不做自动提取品牌变体

Q3: 能不能一句话说清楚？
A: "监测 AI 搜索结果中是否提及客户品牌，并标注是否带来源链接"
```

**2. 架构设计**
```markdown
## 数据模型
- brand_monitors (监测配置): brand_name, keywords, site_id
- brand_mentions (提及记录): monitor_id, query, cited, has_link, evidence

## 核心流程
1. 用户配置品牌词（如 "Nike", "耐克"）
2. 定时/手动触发监测
3. 遍历问题集，调用 LLM，检测品牌提及
4. 提取引用证据和链接
5. 计算提及率和带链率
6. 存入 PostgreSQL（结构化） + Neo4j（关系图）

## 技术选型
- 异步任务：Celery（已有依赖）
- LLM：复用现有 LLM 客户端
- 提及检测：简单字符串匹配（不引入 NLP 库）
- 链接提取：正则表达式
```

**3. 写入 CLAUDE.md**
```markdown
## 品牌监测规范

### 提及判定规则
- 包含完整品牌词 → cited = true
- 大小写不敏感
- 别名也算（需在 keywords 中配置）

### 带链率计算
- 带链提及数 / 总提及数
- 分母为 0 时返回 null（不是 0）

### 错误处理
- LLM 调用失败：记录错误，继续下一个问题（不中断整个监测）
- 提及检测超时：单个问题 120s 超时
```

---

**第二阶段：工程搭建（半天）**

**按照 module-delivery Skill 执行**:

```bash
# Step 1: 数据库迁移
alembic revision -m "add_brand_monitoring"
# 创建 brand_monitors 和 brand_mentions 表

# Step 2: SQLAlchemy 模型
# backend/app/models/brand_monitor.py

# Step 3: Pydantic Schema
# backend/app/schemas/brand_monitor.py

# Step 4: Service 层
# backend/app/services/brand_monitor_service.py

# Step 5: API Routes
# backend/app/api/routes/brand_monitors.py

# Step 6: Celery 任务
# backend/app/tasks/brand_monitoring.py
```

**关键代码片段**:
```python
# backend/app/tasks/brand_monitoring.py
@celery_app.task(bind=True, max_retries=3)
def run_brand_monitoring_task(self, monitor_id: int):
    """品牌监测异步任务"""
    db = SessionLocal()
    try:
        monitor = db.query(BrandMonitor).filter(BrandMonitor.id == monitor_id).first()
        questions = get_questions_for_monitor(db, monitor.query_set_id)
        
        mentions = []
        for q in questions:
            try:
                # 调用 LLM（带超时）
                response = llm_client.generate(
                    prompt=f"Answer: {q.text}",
                    timeout=120
                )
                
                # 检测品牌提及
                cited = any(kw.lower() in response.lower() for kw in monitor.keywords)
                has_link = monitor.site.domain in response
                
                mention = BrandMention(
                    monitor_id=monitor.id,
                    query=q.text,
                    cited=cited,
                    has_link=has_link,
                    evidence=response[:500]
                )
                mentions.append(mention)
                
            except Exception as e:
                logger.error(f"Failed to check brand mention for query {q.id}: {e}")
                continue  # 不中断整个监测
        
        # 批量写入
        db.add_all(mentions)
        db.commit()
        
        # 更新监测状态
        monitor.last_run_at = datetime.utcnow()
        monitor.mention_rate = sum(m.cited for m in mentions) / len(mentions)
        db.commit()
        
    finally:
        db.close()
```

---

**第三阶段：测试与验证（半天）**

**单元测试**:
```python
def test_should_detect_brand_mention_when_keyword_in_response():
    # Given
    keywords = ["Nike", "耐克"]
    response = "The best running shoes are Nike Air Zoom."
    
    # When
    cited = detect_brand_mention(response, keywords)
    
    # Then
    assert cited is True

def test_should_return_false_when_no_brand_mention():
    keywords = ["Nike"]
    response = "Adidas is great."
    cited = detect_brand_mention(response, keywords)
    assert cited is False
```

**集成测试**:
```python
@pytest.mark.integration
@patch('app.services.llm_client.LLMClient.generate')
def test_should_complete_brand_monitoring_workflow(mock_llm, db):
    # Given: Mock LLM 响应
    mock_llm.return_value = "Nike shoes are available at example.com"
    
    monitor = create_test_monitor(db, keywords=["Nike"])
    
    # When: 执行监测
    run_brand_monitoring_task(monitor.id)
    
    # Then: 验证结果
    mentions = db.query(BrandMention).filter(
        BrandMention.monitor_id == monitor.id
    ).all()
    
    assert len(mentions) > 0
    assert any(m.cited for m in mentions)
    assert monitor.mention_rate is not None
```

---

**第四阶段：前端开发（1天）**

**按照 frontend-development Skill**:
```typescript
// 1. 类型定义
interface BrandMonitor {
  id: number;
  brand_name: string;
  keywords: string[];
  site_id: number;
  mention_rate: number | null;
  last_run_at: string | null;
}

// 2. Hook
function useBrandMonitors(siteId?: number) {
  return useSWR<BrandMonitor[]>(
    siteId ? `/brand-monitors?site_id=${siteId}` : null,
    api.get
  );
}

// 3. 组件
function BrandMonitorList({ siteId }: { siteId: number }) {
  const { data: monitors, isLoading } = useBrandMonitors(siteId);
  
  return (
    <DataTable
      data={monitors || []}
      columns={[
        { key: 'brand_name', label: '品牌' },
        { 
          key: 'mention_rate', 
          label: '提及率',
          render: (m) => m.mention_rate ? `${(m.mention_rate * 100).toFixed(1)}%` : '-'
        }
      ]}
      isLoading={isLoading}
    />
  );
}
```

---

**第五阶段：部署上线（半天）**

**部署检查清单**:
- [x] 数据库迁移在生产数据副本上验证
- [x] 环境变量配置完整（LLM API Key）
- [x] Celery Worker 已启动
- [x] 监控告警已配置
- [x] 回滚方案准备

**部署步骤**:
```bash
# 1. 备份生产数据库
pg_dump prod-db > backup_before_brand_monitoring.sql

# 2. 部署代码
git pull origin main
docker-compose build
docker-compose up -d

# 3. 执行迁移
docker-compose exec backend alembic upgrade head

# 4. 重启服务
docker-compose restart backend celery-worker

# 5. 验证功能
curl -H "Authorization: Bearer $TOKEN" \
  https://api.geosuite.com/api/v1/brand-monitors
```

---

### 10.4 核心经验总结

#### 经验 1: 规范先行，返工最少

**数据**:
- 有 CLAUDE.md：平均 1.2 次通过（偶尔微调）
- 无 CLAUDE.md：平均 3.5 次通过（反复返工）

**时间对比**:
```
无规范: 30min 思考 + 10min AI 生成 + 90min 返工修复 = 130min
有规范: 60min 思考规范 + 10min AI 生成 + 10min 验收 = 80min
```

**结论**: 前期多花时间想清楚，总体更快。

---

#### 经验 2: 小步快跑，增量验证

**反模式（一次做太多）**:
```
第1天: 让 AI 生成完整的监测模块（前后端全部）
第2天: 发现 70% 代码需要重写
第3天: 重新设计架构
```

**正确模式（增量迭代）**:
```
第1天上午: 数据模型 + 基础 CRUD → 验证通过
第1天下午: Celery 任务 + LLM 调用 → 验证通过
第2天上午: 前端列表页 → 验证通过
第2天下午: 前端详情页 + 图表 → 验证通过
```

---

#### 经验 3: 测试驱动修复

**场景**: 发现品牌提及检测有 Bug

**传统做法**:
1. 直接改代码
2. 手动测试
3. 部署
4. 再次发现 Bug

**测试驱动修复**:
```python
# 1. 先写失败的测试
def test_should_detect_chinese_brand_name():
    """Bug: 中文品牌名未检测到"""
    response = "耐克的鞋子质量很好"
    cited = detect_brand_mention(response, ["Nike", "耐克"])
    assert cited is True  # ❌ 当前失败

# 2. 修复代码
def detect_brand_mention(text: str, keywords: list[str]) -> bool:
    text_lower = text.lower()
    return any(kw.lower() in text_lower for kw in keywords)  # 修复

# 3. 测试通过
pytest test_brand_monitor.py::test_should_detect_chinese_brand_name
# ✅ 通过

# 4. 回归测试
pytest test_brand_monitor.py -v
# ✅ 所有测试通过
```

---

### 10.5 避坑指南（血泪教训）

#### 坑 1: Alembic 迁移未在生产数据副本验证

**事故**:
```python
# 迁移脚本
def upgrade():
    op.alter_column('sites', 'domain', 
        type_=sa.String(255), 
        existing_type=sa.Text()
    )
```

**生产环境执行**:
```
ERROR: column "domain" contains values longer than 255 characters
```

**教训**: 生产数据中有超长域名，本地测试数据没有。必须在生产数据副本上演练。

---

#### 坑 2: 异步任务无超时导致 Worker 卡死

**问题代码**:
```python
@celery_app.task
def crawl_site(site_id: int):
    # ❌ 没有超时，如果网站响应慢，Worker 永久阻塞
    response = requests.get(f"https://{site.domain}")
    parse_response(response)
```

**修复**:
```python
@celery_app.task(time_limit=300, soft_time_limit=270)
def crawl_site(site_id: int):
    try:
        response = requests.get(
            f"https://{site.domain}",
            timeout=30  # 单个请求 30s 超时
        )
        parse_response(response)
    except requests.Timeout:
        logger.error(f"Site timeout: {site.domain}")
        raise
```

---

#### 坑 3: Neo4j 写入未清理旧数据导致重复

**问题**:
```python
# 每次监测都写入新节点，从不清理
with driver.session() as session:
    session.run("""
        CREATE (m:Mention {query: $query, cited: $cited})
    """, query=query, cited=cited)
```

**结果**: 一个月后 Neo4j 有几十万重复节点。

**修复**:
```python
# 使用 MERGE 代替 CREATE，有则更新，无则创建
with driver.session() as session:
    session.run("""
        MERGE (m:Mention {query: $query, monitor_id: $monitor_id})
        ON CREATE SET m.cited = $cited, m.created_at = datetime()
        ON MATCH SET m.cited = $cited, m.updated_at = datetime()
    """, query=query, monitor_id=monitor_id, cited=cited)
```

---

### 10.6 工具生态推荐

#### 开发阶段

| 工具 | 用途 | 为什么推荐 |
|------|------|-----------|
| **Claude Code** | AI 编码助手 | 课程核心工具 |
| **Cursor** | AI IDE | 内联补全 + 多文件编辑 |
| **Windsurf** | AI 编码工具 | Cascade 模式（多步推理） |
| **Postman** | API 测试 | 手动测试 API |
| **DBeaver** | 数据库客户端 | 查看数据、执行 SQL |

#### 质量保证

| 工具 | 用途 | 集成方式 |
|------|------|---------|
| **pytest** | 单元测试 | 本地 + CI |
| **pytest-cov** | 覆盖率 | CI 生成报告 |
| **Black** | 代码格式化 | pre-commit hook |
| **Ruff** | Linter | pre-commit hook |
| **mypy** | 类型检查 | CI |

#### 部署运维

| 工具 | 用途 | 配置 |
|------|------|------|
| **Docker Compose** | 本地开发环境 | docker-compose.yml |
| **GitHub Actions** | CI/CD | .github/workflows/ |
| **Sentry** | 错误监控 | Sentry SDK |
| **Grafana** | 指标可视化 | Prometheus + Grafana |

---

### 10.7 学习路径进阶

#### 完成课程后的下一步

**阶段 1: 深度实践（1-2个月）**
- [ ] 完整复刻 Hify 项目（不看答案）
- [ ] 用同样方法论开发一个自己的项目
- [ ] 总结自己的 CLAUDE.md 模板

**阶段 2: 扩展技能（2-3个月）**
- [ ] 学习 K8s 部署（超出课程范围）
- [ ] 学习 Serverless 架构（AWS Lambda / Vercel）
- [ ] 学习微服务拆分（课程是单体）

**阶段 3: 成为专家（持续）**
- [ ] 为开源项目贡献 PR（用 Claude Code）
- [ ] 写技术博客分享经验
- [ ] 指导团队使用 Claude Code

---

## 十一、附录：完整项目案例

### 11.1 GEOSuite 项目结构

```
GEOSuite/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/          # API 路由
│   │   │       ├── sites.py     # 站点管理
│   │   │       ├── workflows.py # 工作流
│   │   │       ├── monitors.py  # 监测
│   │   │       └── diagnostics.py # 审计
│   │   ├── core/
│   │   │   ├── config.py        # 配置
│   │   │   ├── celery_app.py    # Celery
│   │   │   └── database.py      # 数据库连接
│   │   ├── models/              # SQLAlchemy 模型
│   │   ├── schemas/             # Pydantic 模型
│   │   ├── services/            # 业务逻辑
│   │   │   ├── site_workflow.py
│   │   │   ├── visibility_engine.py
│   │   │   ├── graph_store.py  # Neo4j
│   │   │   └── gsc_integration.py
│   │   └── tasks/               # Celery 任务
│   ├── alembic/                 # 数据库迁移
│   └── tests/                   # 测试
├── frontend/
│   ├── app/                     # Next.js App Router
│   ├── components/              # React 组件
│   ├── hooks/                   # 自定义 Hooks
│   └── lib/                     # 工具库
├── .claude/
│   └── skills/                  # Skills 技能
│       ├── module-delivery.md
│       ├── unit-test.md
│       ├── integration-test.md
│       ├── api-development.md
│       ├── database-migration.md
│       └── frontend-development.md
├── CLAUDE.md                    # 项目全局规范
├── docker-compose.yml
└── README.md
```

---

### 11.2 关键文件示例

完整的项目规范和技能文件已在当前 GEOSuite 项目中创建，可作为模板复用到其他项目。

---

## 十二、课程资源索引

### 12.1 官方资源

- **课程平台**: [极客时间 - ClaudeCode 企业级全链路开发实战]
- **Hify 项目**: 课程配套实战项目（32章完整覆盖）
- **实操视频**: 5 个全流程录屏（Ch07/12/19/26/30）

### 12.2 社区资源

- **Claude Code 官方文档**: https://docs.anthropic.com/claude/code
- **Skills 模板库**: 本文档提供的完整 Skills 系统
- **CLAUDE.md 模板**: 基于 GEOSuite 的实战模板

### 12.3 推荐阅读

- **《阿里巴巴 Java 开发手册》**: 规范的最佳参考
- **《代码整洁之道》**: 代码质量标准
- **《微服务架构设计模式》**: 架构进阶

---

> **最后的话**：Claude Code 是一个强大的工具，但真正的瓶颈永远是你的思维能力。这门课给你的不是代码，而是一套方法论和认知框架。保持好奇心，每个你不理解的概念都是成长的机会。像 Hify 这样的项目，就是这个时代的"树干"——你学到的所有新知识都能附着在上面。
>
> 本文档补充了 **GEOSuite 实战案例、方法论迁移关键点、从零到生产的完整流程、避坑指南和工具生态推荐**，帮助你将课程方法论真正落地到实际项目中。
>
> *—— 工具会过时，方法论才是护城河。*
>
> **文档版本**: v2.0 (2026-08-11)  
> **更新内容**: 新增第十章实战案例与最佳实践、第十一章完整项目案例、第十二章课程资源索引
