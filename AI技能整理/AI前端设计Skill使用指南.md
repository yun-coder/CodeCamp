# AI 前端设计 Skill 使用指南

> 全局已安装：[Impeccable](https://github.com/pbakaus/impeccable) + [Taste-Skill](https://github.com/Leonxlnx/taste-skill)
> 两个互补，覆盖 AI 前端设计的完整链路。都无需 API Key。

---

## 一、快速对比

| 维度 | Impeccable | Taste-Skill |
|------|-----------|-------------|
| **定位** | 设计流程 + 反模式检测 | 视觉风格 + 动效方向 |
| **架构** | 1 个 Skill + 23 条命令 | 13 个独立 Skill |
| **触发方式** | `/impeccable <command>` 主动调用 | 自然语言描述，自动匹配激活 |
| **安装方式** | `/plugin marketplace add pbakaus/impeccable` | `npx skills add https://github.com/Leonxlnx/taste-skill` |
| **CLI 工具** | ✅ `npx impeccable detect`（41 条确定性规则） | ❌ 无 CLI，纯 SKILL.md |
| **Stars** | 37k+ | 40k+ |
| **许可证** | Apache 2.0 | MIT |

---

## 二、Impeccable 使用详解

### 2.1 命令速查表

#### Build（构建）
| 命令 | 用途 | 示例 |
|------|------|------|
| `init` | 初始化项目上下文，生成 PRODUCT.md 和 DESIGN.md | `/impeccable init` |
| `craft` | 完整的设计→构建流程，带可视化迭代 | `/impeccable craft 首页` |
| `shape` | 写代码前先规划 UX/UI | `/impeccable shape 设置页` |
| `document` | 从现有代码反向生成 DESIGN.md | `/impeccable document` |
| `extract` | 提取可复用组件和设计 tokens 到设计系统 | `/impeccable extract 按钮组件` |

#### Evaluate（评估）
| 命令 | 用途 | 示例 |
|------|------|------|
| `critique` | UX 设计审查：层级、清晰度、情感共鸣（启发式评分 0-40） | `/impeccable critique landing` |
| `audit` | 技术质量检查：a11y、性能、响应式、主题、反模式（总分 /20） | `/impeccable audit blog` |

#### Refine（打磨）
| 命令 | 用途 | 示例 |
|------|------|------|
| `polish` | 发布前最终质量检查 | `/impeccable polish settings` |
| `bolder` | 放大过于保守/平淡的设计 | `/impeccable bolder 首页` |
| `quieter` | 弱化过于激进/刺激的设计 | `/impeccable quieter 弹窗` |
| `distill` | 剥离冗余，回归本质 | `/impeccable distill 表单` |
| `harden` | 错误处理、i18n、文字溢出等边界情况 | `/impeccable harden checkout` |
| `onboard` | 首次使用流程、空状态、激活路径设计 | `/impeccable onboard 注册流程` |

#### Enhance（增强）
| 命令 | 用途 | 示例 |
|------|------|------|
| `animate` | 添加有意义的动效（禁止 bounce/elastic） | `/impeccable animate 卡片` |
| `colorize` | 为单色调 UI 引入战略性色彩 | `/impeccable colorize 侧边栏` |
| `typeset` | 修复字体选择、层级、大小 | `/impeccable typeset 标题` |
| `layout` | 修复布局、间距、视觉节奏 | `/impeccable layout 首页` |
| `delight` | 添加令人愉悦的细节 | `/impeccable delight 按钮` |
| `overdrive` | 超出常规的技术效果 | `/impeccable overdrive 英雄区` |

#### Fix（修复）
| 命令 | 用途 | 示例 |
|------|------|------|
| `clarify` | 改进 UX 文案、标签、错误提示 | `/impeccable clarify 错误页面` |
| `adapt` | 适配不同设备和屏幕尺寸 | `/impeccable adapt 首页` |
| `optimize` | 诊断并修复 UI 性能问题 | `/impeccable optimize 图片` |

#### Iterate（迭代）
| 命令 | 用途 | 示例 |
|------|------|------|
| `live` | 浏览器中实时可视化迭代 UI 元素 | `/impeccable live` |

#### 管理命令
| 命令 | 用途 |
|------|------|
| `pin <command>` | 为常用命令创建独立快捷方式（如 `pin audit` → `/audit`） |
| `unpin <command>` | 移除快捷方式 |

### 2.2 CLI 检测器（无需 LLM）

```bash
npx impeccable detect src/                     # 扫描目录
npx impeccable detect index.html               # 扫描文件
npx impeccable detect https://example.com      # 扫描 URL（Puppeteer）
npx impeccable detect --fast --json .          # 纯正则、JSON 输出
```

检测 41 条确定性规则，覆盖：
- **AI Slop**：侧边栏边框、紫色渐变、bounce easing、暗色 glow
- **设计质量**：行长、紧凑内边距、触摸目标过小、跳级标题

### 2.3 核心设计原则（Skill 内置）

#### Register 双轨制
- **Brand**（营销/Landing/作品集）：设计即产品，追求独特性
- **Product**（App/Dashboard/工具）：设计服务产品，追求熟悉感

#### 绝对禁令（Match-and-Refuse）
1. ❌ 侧边条纹边框（`border-left/right > 1px` 作为彩色强调）
2. ❌ 渐变文字（`background-clip: text` + 渐变背景）
3. ❌ 玻璃态作为默认风格
4. ❌ Hero-metric 模板（大数字 + 小标签 + 渐变强调）
5. ❌ 相同卡片网格（图标 + 标题 + 文字，无限重复）
6. ❌ 每个 section 上方的小写全大写 eyebrow 标签
7. ❌ 编号 section 标记（01/02/03）作为默认脚手架
8. ❌ 文字溢出容器

#### AI Slop 测试（两阶）
- **一阶**：能否仅从类别猜到主题+调色板？
- **二阶**：能否从类别+反参考猜到美学家族？

#### 色彩策略四阶梯
- **Restrained**：染色中性色 + ≤10% 强调色（产品默认）
- **Committed**：一种饱和色覆盖 30-60% 表面（品牌默认）
- **Full Palette**：3-4 个命名角色色（品牌活动）
- **Drenched**：表面即色彩（品牌英雄区）

---

## 三、Taste-Skill 使用详解

### 3.1 已安装的 13 个 Skill

#### 代码实现类（10 个）

| Skill | 安装名 | 触发场景 |
|-------|--------|---------|
| **design-taste-frontend** | taste-skill v2 | 🆕 **主 Skill**。Landing page、portfolio、redesign。三旋钮调节 |
| design-taste-frontend-v1 | taste-skill v1 | v1 原版（向后兼容） |
| **gpt-taste** | GPT 严格版 | 强 GSAP 动效需求，Awwwards 级网站 |
| **image-to-code** | 图片→代码 | 先生成设计参考图→分析→实现 |
| **redesign-existing-projects** | 项目改造 | 现有网站升级，先审计再修复 |
| **high-end-visual-design** | 高端视觉 | $150k+ agency 级体验，柔和对比、premium 字体 |
| **minimalist-ui** | 极简 | Notion/Linear 风格，暖色单色调 |
| **industrial-brutalist-ui** | 粗野主义 | 瑞士字体+军事终端美学，锐利对比 |
| **full-output-enforcement** | 强制完整输出 | Agent 截断输出时用，禁止占位注释 |
| **stitch-design-taste** | Stitch 兼容 | Google Stitch 规则 + DESIGN.md 导出 |

#### 图片生成类（3 个）

| Skill | 安装名 | 触发场景 |
|-------|--------|---------|
| **imagegen-frontend-web** | Web 设计稿 | 网站各 section 的横向设计参考图（每个 section 一张） |
| **imagegen-frontend-mobile** | 移动端设计稿 | iOS/Android 屏幕和流程设计稿 |
| **brandkit** | 品牌套件 | Logo 方向、调色板、字体、视觉识别应用 |

### 3.2 如何触发

Taste-Skill **自动激活**——不需要手动命令。直接用自然语言描述需求：

| 你说… | 自动激活 |
|--------|---------|
| "帮我设计一个 SaaS landing page" | `design-taste-frontend` |
| "给这个页面加点动效，要 GSAP 级别的" | `gpt-taste` |
| "把这个网站改得高级一点" | `high-end-visual-design` |
| "做一个 Notion 风格的 dashboard" | `minimalist-ui` |
| "来一个工业风的数据面板" | `industrial-brutalist-ui` |
| "把现有网站的 UI 升级一下" | `redesign-existing-projects` |
| "生成一个暗黑科技风品牌方案" | `brandkit` |
| "给这个 landing page 生成设计稿" | `imagegen-frontend-web` |
| "AI 输出被截断了，给完整代码" | `full-output-enforcement` |

### 3.3 Taste-Skill v2 核心机制

#### 三旋钮调节（1-10）
| 旋钮 | 说明 | 低值 | 高值 |
|------|------|------|------|
| **DESIGN_VARIANCE** | 布局实验性 | 居中/干净 | 不对称/现代 |
| **MOTION_INTENSITY** | 动画深度 | 仅 hover | scroll/magnetic |
| **VISUAL_DENSITY** | 信息密度 | 宽松留白 | 密集仪表盘 |

#### v2 关键特性
- **Brief Inference**：先解读需求，推断设计方向
- **Design System Map**：辨别何时用官方设计系统（Fluent/Carbon/Primer）vs 自建
- **Em-dash 禁令**：硬性禁止 `—` 作为装饰
- **~50 项飞行前检查**：交付前不可跳过的最终核对
- **Redesign 协议**：模式检测→审计→保留规则→现代化杠杆→决策树

---

## 四、推荐工作流

### 4.1 新项目从零开始

```
/impeccable init              ← 第一步：建立 PRODUCT.md + DESIGN.md
       ↓
/impeccable shape 首页         ← 第二步：规划设计思路
       ↓
"帮我实现这个首页"             ← 第三步：Taste-Skill 自动介入写代码
       ↓
/impeccable critique 首页      ← 第四步：UX 审查（启发式评分 0-40）
       ↓
/impeccable polish 首页        ← 第五步：发布前打磨
       ↓
npx impeccable detect src/     ← 第六步：CLI 最终扫描，零 AI slop
```

### 4.2 改造现有项目

```
/impeccable audit              ← 先全面体检
       ↓
"帮我升级现有网站的 UI"         ← Taste-Skill redesign 自动介入
       ↓
/impeccable critique           ← UX 审查新设计
       ↓
/impeccable polish             ← 最终打磨
```

### 4.3 快速单项优化

```
/impeccable animate 卡片       ← 只加动效
/impeccable typeset 标题       ← 只调字体
/impeccable layout 首页        ← 只调布局
/impeccable bolder 按钮        ← 让按钮更出彩
/impeccable colorize 侧边栏    ← 给侧边栏加色彩
```

### 4.4 生成设计稿再实现

```
"生成这个 landing page 的设计稿"     ← imagegen-frontend-web
              ↓
"按照这些设计稿实现前端"              ← image-to-code
```

---

## 五、适用场景对照表

| 你当前在做什么 | 用哪个 |
|---------------|--------|
| 全新前端项目，需要建立设计基础 | `/impeccable init` |
| 写代码前先想清楚 UX | `/impeccable shape` |
| 检查代码有没有 a11y/性能/响应式问题 | `/impeccable audit` |
| 判断 UI/UX 好不好、哪里可以改进 | `/impeccable critique` |
| 选视觉风格方向（极简/粗野/高端…） | Taste-Skill 变体 |
| 实现复杂 GSAP 动效 | `gpt-taste` |
| 生成品牌视觉方案/设计稿 | `brandkit` / `imagegen-*` |
| 发布前做最终检查 | `/impeccable polish` |
| 扫描代码有无 AI slop 痕迹 | `npx impeccable detect src/` |
| 只有个别元素需要调整 | `/impeccable <专项命令>` |
| 后端代码 / 非 UI 任务 | ❌ 都不适用 |

---

## 六、注意事项

1. **都是纯前端设计 Skill**，对后端/算法/数据库等任务无效
2. **都不需要 API Key**：Impeccable CLI 是确定性规则匹配，Taste-Skill 是 LLM 指令
3. **Impeccable 和 Taste-Skill 可以共存**，互不冲突，互补使用
4. **Impeccable 的 `init` 应该在项目最开始跑**，生成的 PRODUCT.md 和 DESIGN.md 会被后续所有命令读取
5. **Taste-Skill 有众多变体**，一般场景用默认的 `design-taste-frontend` 就够了，有明确风格需求时再选特定变体
6. **图片生成 Skill**（brandkit / imagegen-*）只产设计图不产代码，需要配合 ChatGPT Images 或 Claude 使用
7. **`npx skills add` 安装的 Skill 可以按项目单独安装**（不加 `-g`），也可以全局安装（本次已全局安装）
