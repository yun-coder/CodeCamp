# Claude Code 常用命令与使用指南

## 一、基本命令

| 命令 | 说明 |
|------|------|
| /help | 查看所有可用命令 |
| /clear | 清除对话历史 |
| /init | 初始化当前项目，创建 CLAUDE.md 配置文件 |
| /status | 查看当前会话状态 |
| /cost | 查看当前会话的 token 消耗统计 |
| /compact | 压缩上下文，释放 token 空间 |
| /model | 切换使用的模型 |
| /exit | 退出 Claude Code |

## 二、对话与交互

| 命令/方式 | 说明 |
|-----------|------|
| ! + 命令 | 在 Claude Code 中执行 shell 命令（如 ! npm test） |
| 直接提问 | 用自然语言描述需求，Claude 会自动解释并执行 |
| 多文件操作 | 可以在一次请求中同时操作多个文件 |
| 代码编辑 | Claude 会读取文件 - 编辑 - 验证，全程自动化 |

### 提问技巧
- 明确目标：说清楚你要做什么，如"增加一个登录页面的表单验证"
- 提供上下文：如涉及 bug，提供错误信息或复现步骤
- 迭代修改：先让 Claude 读代码，再提修改要求
- 多步任务：可以一次性描述多个步骤，Claude 会按序执行

## 三、文件操作

| 工具/方式 | 说明 |
|-----------|------|
| Read | 自动读取文件内容（无需手动 cat） |
| Write | 写入新文件或覆盖已有文件 |
| Edit | 精确替换文件中的部分内容 |
| Glob | 按通配符模式搜索文件名（如 **/*.ts） |
| Grep | 在文件内容中搜索关键词/正则表达式 |
| Bash | 执行 shell 命令 |
| PowerShell | 执行 PowerShell 命令（Windows 环境） |
| Monitor | 监控日志/进程，实时推送通知 |
| WebFetch | 获取网页内容并回答问题 |
| WebSearch | 网络搜索（仅限美国地区） |

### 文件操作流程
1. 告诉 Claude 你想修改什么
2. Claude 会自动读取相关文件
3. 提出修改方案并执行
4. 完成后自动验证

## 四、Git 集成

| 命令 | 说明 |
|------|------|
| git commit -m "msg" | 提交代码（Claude 可自动生成提交信息） |
| git diff | 查看未暂存的变更 |
| git log | 查看提交历史 |
| git branch | 管理分支 |
| git rebase | 变基操作 |
| git merge | 合并分支 |
| git push | 推送代码到远程仓库 |
| gh | GitHub CLI 操作（PR、Issues、API） |

注意：交互式 git 命令（如 git rebase -i、git add -i）不受支持。

## 五、代码审查与优化

| 命令/技能 | 说明 |
|-----------|------|
| /code-review | 审查当前代码变更，查找 bug 和可优化点 |
| /security-review | 对当前变更进行安全审查 |
| /simplify | 自动简化/重构代码 |
| /review | 审查 GitHub PR |
| /verify | 端到端验证代码变更是否生效 |

### code-review 参数
- --comment：在 PR 中发布内联评论
- --fix：审查后自动应用修复
- 支持四级深度：low、medium、high、max

## 六、项目配置

| 命令/技能 | 说明 |
|-----------|------|
| /init | 初始化 CLAUDE.md 项目配置文件 |
| /config | 修改 Claude Code 设置（主题、模型等） |
| update-config 技能 | 修改 settings.json（权限、钩子、环境变量等） |
| keybindings-help 技能 | 自定义键盘快捷键 |
| fewer-permission-prompts 技能 | 减少权限提示频率 |

### 权限管理
- 工具调用需要用户授权
- 被拒绝的操作应调整方案后重试
- 可通过 settings.json 配置持久权限

## 七、记忆系统

Claude Code 支持持久化记忆，存储在项目 memory 目录：

| 记忆类型 | 说明 |
|----------|------|
| user | 用户角色、专业领域、偏好 |
| feedback | 用户对工作方式的反馈和纠正 |
| project | 项目目标、约束、上下文 |
| reference | 外部资源链接（文档、仪表盘、工单等） |

### 记忆命令
- 自动记录：告诉 Claude"记住"某事
- 回忆：Claude 会在相关对话中自动引用记忆
- 记忆格式为 Markdown 文件，带 frontmatter

## 八、高级功能

### Skills（技能系统）
Skills 是 Claude Code 的扩展能力模块：

| 技能 | 说明 |
|------|------|
| /council | 召集智囊团——多位历史思想家多角度分析问题 |
| /deep-research | 深度研究——多源搜索、事实核查、生成有引用的报告 |
| /dataviz | 数据可视化——创建图表、仪表盘 |
| /officecli | 创建/编辑 Office 文档（.docx, .xlsx, .pptx） |
| /loop | 定时重复执行某个命令或提示 |
| /claude-api | Claude API / Anthropic SDK 参考 |
| /run | 启动并运行项目应用 |

### Agents（子代理系统）
可以启动专门的子代理处理特定任务：

| 代理类型 | 用途 |
|----------|------|
| general-purpose | 通用搜索和多步骤任务 |
| Explore | 只读搜索，广泛扫描文件和目录 |
| Plan | 软件架构规划，生成实施方案 |
| claude-code-guide | 回答关于 Claude Code 本身的问题 |
| Council 系列 | 智囊团成员：苏格拉底、亚里士多德、费曼等，用于多角度分析 |

### Workflow（工作流系统）
多代理编排系统——并行执行复杂任务：
- 支持 pipeline（流水线）和 parallel（并行）模式
- 自动管理 Token 预算
- 支持断点续跑（resume）
- 内置多种质量模式：对抗验证、评委小组、完整度审查、循环直到枯竭等

### Plan Mode（计划模式）
在执行大型任务前进入计划模式：
- 深入探索代码库，设计实现方案
- 用户确认后再开始编码
- 使用 EnterPlanMode 进入，ExitPlanMode 退出
- 适用场景：新功能实现、架构决策、多文件变更

### Worktree（工作树隔离）
创建独立的 git worktree 进行隔离开发：
- 多个任务并行互不干扰
- 完成后可选择保留或删除
- 使用 EnterWorktree 进入，ExitWorktree 退出

### Cron（定时任务）
在会话中设置定时任务：
- 支持一次性提醒和周期性任务
- 使用 CronCreate 创建，CronDelete 删除
- 会话结束时自动清除

### Design Sync（设计同步）
与 claude.ai/design 设计系统项目同步：
- 读取/列出设计项目文件
- 创建计划 - 写入/删除文件
- 注册设计资产（preview card）

### Report Findings（代码审查报告）
结构化输出代码审查结果：
- 按严重程度排序
- 支持分类（正确性、简化、效率等）
- 可标记修复结果

## 九、常用快捷键

| 快捷键 | 说明 |
|--------|------|
| Ctrl+C | 中断当前操作 |
| Ctrl+D | 结束对话（退出 Claude Code） |
| 上/下箭头 | 浏览命令历史 |
| Tab | 命令自动补全 |

## 十、最佳实践

### 高效使用原则
1. 提供充分上下文：让 Claude 理解项目结构和目标
2. 逐步迭代：从简单需求开始，逐步增加复杂度
3. 多任务并行：独立任务可以在一次请求中同时执行
4. 利用 Skills：复杂场景优先使用对应技能
5. 使用记忆系统：让 Claude 记住你的偏好和项目上下文

### 工作流建议
- 小型修改：直接描述需求，Claude 自动完成
- 大型功能：先进入 Plan Mode 规划，再实施
- 代码审查：定期使用 /code-review 检查代码质量
- 复杂调研：使用 /deep-research 进行深度研究

### 注意事项
- 文件操作前 Claude 会自动读取目标文件
- 编辑失败会有错误提示
- 超大文件可能需要分段读取
- 权限提示可配置为持久允许
- PowerShell 中避免 2>&1 重定向（会产生错误包裹）
- 不要使用 Write 覆盖未读取的文件
