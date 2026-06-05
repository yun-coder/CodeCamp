# AI 页面生成效果增强手册

更新时间：2026-05-22

这份文档用于在使用 Codex、Claude、Cursor、Trae、Coze、Dify、通义灵码或其他 AI 编程/智能体工具生成页面时，稳定提升视觉质量、交互完整度和前端代码可维护性。

核心原则：不要只让 AI “写页面”，要先让 AI 拥有设计系统、组件规范、审美边界、验收流程和可调用工具。

---

## 1. 全局美学引擎 Prompt

在开始任何页面设计或前端代码生成前，先发送下面这段作为全局约束。

```text
你现在是一位精通现代 Web 视觉美学的资深前端 UI/UX 设计师，同时也是熟悉 React、Tailwind CSS、shadcn/ui、响应式布局、可访问性和前端工程化的资深开发者。

在接下来的所有页面设计和前端代码生成中，你必须严格遵守以下美学规范：

1. 色彩：采用成熟调色盘，禁止纯黑纯白作为大面积背景或主要文字。使用 60-30-10 法则：60% 背景基底，30% 内容与层级色，10% 高亮色。高亮色只用于核心 CTA、焦点态、关键数据和少量状态提示。
2. 空气感：严格遵循大留白原则。页面区块、卡片、表单、列表之间的 gap / padding / margin 不得低于 24px，核心容器可使用 32px、40px、48px 的层级间距。
3. 精致细节：使用现代圆角 8px-16px；卡片和浮层使用轻量、高模糊度、低不透明度的柔和阴影，例如 box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.08)。禁止死板黑阴影、重边框和过度发光。
4. 动效：所有可交互元素，包括按钮、卡片、链接、输入框、菜单项，都必须包含 transition: all 0.3s ease 或等价的平滑过渡。Hover / Focus / Active / Disabled 状态必须完整。
5. 排版：使用合理字重区分标题、副标题、正文和辅助信息。标题 600-700，正文 400-500，标签 500-600。正文行高保持 1.5-1.75，避免文字拥挤。
6. 组件：优先使用成熟组件体系，例如 shadcn/ui、Radix UI、Tailwind CSS、Ant Design、Material UI、Lucide Icons。不要从零手写复杂交互组件。
7. 响应式：必须同时考虑 375px 手机、768px 平板、1024px 桌面、1440px 宽屏。禁止横向滚动，禁止文字溢出按钮或卡片。
8. 可访问性：普通正文对比度至少满足 WCAG AA。所有 icon-only button 必须有 aria-label，表单必须有 label、错误提示和 focus 状态。
9. 验收：生成代码后，请自检布局、颜色、间距、动效、暗色/亮色对比、移动端适配和可访问性，并指出你做了哪些设计取舍。

如果你理解了，请回复“美学引擎已启动”，并等待我的页面需求。
```

---

## 2. 页面生成的推荐工作流

不要直接要求 AI 输出代码。高质量页面建议按以下顺序执行：

1. 需求澄清：页面类型、目标用户、业务目标、核心 CTA、技术栈。
2. 设计系统：先产出色彩、字体、间距、圆角、阴影、动效、组件风格。
3. 信息架构：确定页面分区、导航层级、主要内容优先级。
4. 组件清单：列出需要的 Button、Card、Table、Form、Dialog、Tabs、Chart 等组件。
5. 代码生成：按设计系统输出可运行代码。
6. 浏览器验收：截图检查移动端和桌面端，修正拥挤、错位、溢出、颜色失衡。
7. 二次打磨：增加空状态、加载态、错误态、悬停态、禁用态和键盘可访问性。

复制即用：

```text
请不要立即写代码。请先基于我的需求生成一份简短但完整的 Design System，包括：
1. 色彩 token：background、surface、text-primary、text-secondary、border、primary、primary-hover、danger、success。
2. 排版 token：font-family、h1、h2、body、caption、button。
3. 间距 token：section、card、form、grid gap。
4. 圆角、阴影、边框、动效 token。
5. 页面结构和组件清单。

确认设计系统后，再输出完整可运行代码。
```

---

## 3. 必备技能列表：真正提升页面生成质量

下面的技能既可以是 Codex / Claude 的 SKILL.md，也可以是 Cursor Rules、Trae Rules、Coze 插件组合、Dify Workflow、MCP Server 或你自己维护的提示词模块。

| 优先级 | 技能名称 | 解决的问题 | 适合搜索的关键词 / 平台 |
|---|---|---|---|
| P0 | Design System Generator | 避免 AI 随机配色、随机间距、随机阴影 | design system, tokens, UI style guide, shadcn, Tailwind |
| P0 | UI/UX Critic | 让 AI 先挑刺再修复，提升二次打磨质量 | UI review, UX audit, visual critique, accessibility |
| P0 | Browser Visual QA | 通过浏览器截图检查真实页面，而不是只看代码 | Playwright MCP, Browser MCP, Chrome DevTools MCP |
| P0 | Component Library Expert | 强制使用成熟组件库，减少难看和不可维护的手写 CSS | shadcn/ui, Radix UI, Ant Design, Material UI |
| P1 | Responsive Layout Specialist | 解决手机端溢出、桌面端空洞、栅格错位 | responsive, mobile-first, breakpoints, CSS grid |
| P1 | Accessibility Auditor | 修复对比度、键盘导航、表单标签、aria-label | a11y, WCAG, keyboard navigation |
| P1 | Typography & Spacing Expert | 解决“页面像堆文字”的问题 | typography, font pairing, vertical rhythm, whitespace |
| P1 | Color Palette Curator | 让配色成熟克制，避免紫粉渐变滥用 | color palette, 60-30-10, semantic colors |
| P1 | Icon & Asset Curator | 统一图标风格，避免 emoji 和混乱图标 | Lucide, Heroicons, icon system, image assets |
| P1 | Landing Page Strategist | 提升首页转化、首屏表达和 CTA 层级 | landing page, SaaS hero, conversion, pricing |
| P1 | Dashboard/Data Viz Designer | 让仪表盘信息密度高但不乱 | dashboard, data visualization, charts, table UX |
| P2 | Motion Designer | 让动效有意义，避免廉价飘动和性能问题 | micro interaction, motion, reduced motion |
| P2 | Frontend Performance Reviewer | 检查图片、字体、首屏、CLS、bundle | performance, Core Web Vitals, lazy loading |
| P2 | Brand Voice & Copywriter | 补足页面文案、按钮文字、空状态说明 | brand voice, UX writing, microcopy |
| P2 | Design Reference Extractor | 从优秀网站或截图提取风格，不盲猜 | website design clone, screenshot to design, Figma MCP |

---

## 4. 推荐从 Skills / MCP / 插件市场搜索的能力

### 4.1 国际生态

1. OpenAI Codex Skills
   - 适合：把重复工作封装成 `SKILL.md`，例如 UI 审查、设计系统生成、前端验收清单。
   - 推荐创建：`ui-design-system`、`frontend-visual-qa`、`shadcn-ui-builder`、`landing-page-optimizer`。

2. Anthropic Agent Skills
   - 适合：把领域知识、工作流、脚本和资源打包给 Agent 使用。
   - 推荐借鉴：技能目录结构、`SKILL.md` 的渐进式说明、只在需要时加载额外资源。

3. MCP Registry / MCP Server 市场
   - 适合：给 AI 接入外部上下文和工具。
   - 对页面生成最有价值的 MCP：
     - Figma MCP：读取设计稿、组件、token。
     - Playwright / Browser MCP：打开页面、截图、点击、检查响应式。
     - Chrome DevTools MCP：检查 DOM、样式、性能和控制台错误。
     - Context7 / Docs MCP：读取最新框架文档，减少过时 API。
     - Firecrawl / Web Search MCP：抓取优秀参考站、竞品站、设计灵感。
     - GitHub MCP：读取组件源码、PR、Issue 和设计系统仓库。

4. Glama / Smithery 等 MCP 目录
   - 适合：搜索第三方 MCP Server，例如 Figma、browser、filesystem、docs、database、analytics。
   - 注意：第三方 MCP 可能有执行命令、访问文件或联网权限，安装前要看权限和源码可信度。

### 4.2 国内常见平台

1. Coze / 扣子
   - 适合：组合插件、知识库和工作流做“页面需求分析助手”“竞品页面分析助手”“文案生成助手”。
   - 可搜索：网页搜索、图片理解、代码解释、飞书/表格、知识库、MCP 插件。

2. Dify Marketplace
   - 适合：搭建页面生成前的需求收集、风格推荐、竞品分析、Prompt 生成 Workflow。
   - 可搜索：网页抓取、搜索、图片理解、代码执行、Markdown 生成、Agent 工具。

3. TunX / AgentPowers 等 Skills 市场
   - 适合：寻找现成的 Agent 技能包，例如产品分析、网页设计、文案生成、提示词优化。
   - 建议：不要直接全量照搬，挑选其中可复用的“任务拆解”和“验收清单”。

4. ModelScope / 魔搭与国内智能体平台
   - 适合：补充中文模型、图像理解、文档解析、行业知识库能力。
   - 页面生成建议：用于“从截图/文档/业务材料提取页面需求”，再交给前端 Agent 实现。

---

## 5. 最推荐创建的 8 个本地 Skills

如果你要自己维护 skills，优先创建下面 8 个。每个技能保持短小、明确、可复用。

### 5.1 `ui-design-system`

用途：任何页面生成前先输出设计系统。

触发词：设计页面、生成页面、前端 UI、landing page、dashboard、admin。

技能内容：

```text
先产出 Design System，不直接写代码。
必须包含 color tokens、type scale、spacing scale、radius、shadow、border、motion、component rules、responsive rules。
禁止纯黑纯白、过饱和背景、随机渐变、无意义装饰。
```

### 5.2 `frontend-visual-qa`

用途：代码生成后进行浏览器视觉验收。

触发词：检查页面、优化 UI、截图、验收、responsive。

技能内容：

```text
打开本地页面，至少检查 375px、768px、1440px 三个视口。
检查文字溢出、组件重叠、横向滚动、按钮高度、卡片留白、焦点态、hover 态、控制台错误。
给出具体修改点并实施。
```

### 5.3 `shadcn-ui-builder`

用途：优先使用 shadcn/ui + Tailwind 生成现代组件。

触发词：React 页面、管理后台、表单、弹窗、表格、Tabs、Select。

技能内容：

```text
优先使用 shadcn/ui、Radix UI、Lucide Icons。
复杂交互组件不要手写，包括 Dialog、Popover、Select、Command、Tabs、Dropdown、Tooltip、Toast、Table。
所有组件必须支持 hover、focus、disabled、loading、empty、error 状态。
```

### 5.4 `landing-page-optimizer`

用途：首页、营销页、SaaS 官网。

触发词：首页、官网、landing page、转化、价格页。

技能内容：

```text
首屏必须清晰表达：产品是谁、解决什么问题、核心 CTA、信任背书。
H1 不写空泛口号，副标题解释价值。
CTA 只保留一个主按钮，一个弱次按钮。
首屏视觉资产必须和产品相关，不使用抽象无意义装饰。
```

### 5.5 `dashboard-density-designer`

用途：后台、仪表盘、数据看板。

触发词：dashboard、admin、analytics、CRM、数据看板。

技能内容：

```text
优先信息密度、可扫描性和重复操作效率。
避免营销页式大标题和过度装饰。
使用清晰的侧边导航、顶部过滤器、数据卡片、表格、图表和空状态。
图表必须有标题、单位、时间范围、tooltip 和异常状态。
```

### 5.6 `a11y-accessibility-auditor`

用途：可访问性和可用性检查。

触发词：可访问性、无障碍、表单、按钮、键盘操作。

技能内容：

```text
检查颜色对比度、focus ring、aria-label、label/for、键盘 Tab 顺序、Esc 关闭弹窗。
icon-only button 必须有 aria-label。
不能只用颜色表达状态，错误/成功状态要有文字或图标辅助。
```

### 5.7 `reference-style-extractor`

用途：参考优秀网站或截图建立风格板。

触发词：参考这个网站、仿这个风格、提取设计风格。

技能内容：

```text
从参考中提取布局、颜色、字体、圆角、阴影、间距、图标、动效、组件模式。
只借鉴风格语言，不复制品牌资产、文案或专有页面结构。
输出可复用的 Design DNA，再生成新页面。
```

### 5.8 `prompt-packager`

用途：把一次成功的页面生成经验沉淀成可复用 Prompt。

触发词：总结提示词、沉淀规范、写成 skill。

技能内容：

```text
把页面需求、设计系统、代码约束、验收标准压缩成一份可复用 Prompt。
保留有效约束，删除空泛形容词。
输出结构：角色、目标、输入、设计系统、技术栈、禁止项、验收清单。
```

---

## 6. 页面类型 Prompt 模板

### 6.1 SaaS / AI 工具官网

```text
请为 [产品名称] 设计并实现一个 SaaS / AI 工具官网首页。

业务目标：
- 目标用户：[填写]
- 核心价值：[填写]
- 主 CTA：[填写]
- 次 CTA：[填写]

视觉方向：
- 风格：现代科技极简，参考 Linear / Vercel 的克制、高级、清晰，而不是霓虹赛博风。
- 配色：禁止纯黑纯白。使用 60-30-10，背景为冷灰或深蓝灰，主文字为低饱和炭灰，高亮色只用于 CTA。
- 首屏：必须展示真实产品能力的界面预览、流程图、数据卡片或演示面板，不使用纯装饰插画。

技术要求：
- 使用 React + Tailwind CSS + shadcn/ui + Lucide Icons。
- 完整响应式，375px 手机端不能横向滚动。
- 所有可交互元素有 hover / focus / disabled / loading 状态。
- 输出完整可运行代码。
```

### 6.2 后台 Dashboard / Admin

```text
请为 [业务场景] 设计并实现一个专业后台 Dashboard。

设计原则：
- 后台产品优先信息密度、扫描效率和稳定操作，不要做营销页式大 Hero。
- 页面结构包含：侧边导航、顶部工具栏、核心指标卡、趋势图、数据表格、筛选器、空状态/加载态/错误态。
- 使用 8px 间距系统，主要区块间距 >= 24px。
- 卡片圆角 12px，边框使用低对比度 border，阴影极轻。

技术要求：
- 使用 React + Tailwind CSS + shadcn/ui。
- 表格支持排序、筛选、分页的视觉状态。
- 图表颜色不能只靠色彩表达含义，需要 legend / tooltip / 单位。
- 桌面端信息密度高，移动端转为卡片列表。
```

### 6.3 表单 / 设置页

```text
请把这个表单/设置页重构为现代、清晰、易用的 UI。

要求：
- 每个输入项必须有可见 label，不允许只用 placeholder。
- 表单分组清晰，每组之间间距 >= 32px。
- 必填、错误、成功、禁用、加载状态必须完整。
- Focus 状态使用柔和边框和阴影，不能只改变颜色。
- 底部操作区主次按钮层级明确，只保留一个 primary CTA。
- 移动端输入框高度 >= 44px，按钮可点击区域 >= 44px。
```

### 6.4 组件美化重构

```text
请对下面这段组件代码进行视觉美化和交互完善。

目标：
1. 保留业务逻辑和组件 API，不做无关重构。
2. 使用成熟设计 token：surface、border、text-muted、primary、radius、shadow。
3. 卡片/按钮/输入框加入 hover、focus、active、disabled 状态。
4. 修正留白、对齐、文字层级和响应式问题。
5. 如果发现可访问性问题，请一并修复。

请先列出视觉问题，再给出修改后的完整代码。
```

---

## 7. 视觉黑名单

生成页面时明确告诉 AI 以下内容，能大幅减少廉价感。

- 禁止大面积纯白 `#FFFFFF` 或纯黑 `#000000`。
- 禁止紫粉蓝大面积发光渐变，除非产品本身就是娱乐、游戏、音乐或创意视觉类。
- 禁止所有卡片都套玻璃拟态，毛玻璃只用于导航、浮层或少量强调区域。
- 禁止阴影过黑、边框过重、圆角过大。
- 禁止按钮文字溢出、卡片高度被 hover 撑开、图标尺寸混乱。
- 禁止用 emoji 作为结构性图标，优先使用 Lucide / Heroicons / Radix Icons。
- 禁止只有默认状态，没有 hover / focus / active / disabled。
- 禁止移动端横向滚动，禁止固定宽度导致布局破裂。
- 禁止无意义装饰元素抢过核心内容。
- 禁止没有真实内容结构的空洞大 Hero。

---

## 8. 页面交付验收清单

每次让 AI 生成页面后，用下面清单要求它自检。

### 视觉质量

- [ ] 是否使用成熟配色，而不是随机高饱和色。
- [ ] 是否遵循 60-30-10，高亮色是否只用于核心 CTA。
- [ ] 是否避免纯黑纯白大面积使用。
- [ ] 标题、正文、说明、标签是否层级清楚。
- [ ] 区块间距是否至少 24px，页面是否有呼吸感。
- [ ] 圆角、边框、阴影是否统一。

### 交互状态

- [ ] Button 是否有 hover / focus / active / disabled / loading。
- [ ] Input 是否有 label、focus、error、helper text。
- [ ] Card / Link 是否有 hover 反馈。
- [ ] Dialog / Dropdown 是否支持键盘和 Esc。
- [ ] Toast / Error 是否提供恢复路径。

### 响应式

- [ ] 375px 宽度是否无横向滚动。
- [ ] 768px 是否布局自然，不出现孤立大空洞。
- [ ] 1440px 是否有合理 max-width，不让内容无限拉长。
- [ ] 表格在移动端是否转为卡片或可控滚动。
- [ ] 图片和图表是否设置尺寸，避免 CLS。

### 可访问性

- [ ] 正文对比度是否达标。
- [ ] icon-only button 是否有 aria-label。
- [ ] 表单 label 是否正确关联。
- [ ] 焦点环是否可见。
- [ ] 不只依赖颜色表达状态。

---

## 9. 一条最终万能指令

当你只想快速得到高质量页面时，直接复制下面这段：

```text
请基于我的需求生成一个高质量现代 Web 页面，但不要直接开始写代码。

请按以下流程执行：
1. 先提炼页面目标、用户、核心 CTA 和信息架构。
2. 生成 Design System：色彩、字体、间距、圆角、阴影、边框、动效、组件规范。
3. 列出页面模块和组件清单。
4. 使用 React + Tailwind CSS + shadcn/ui + Lucide Icons 输出完整可运行代码。
5. 代码必须包含响应式布局、hover/focus/disabled/loading/empty/error 状态。
6. 最后根据视觉质量、交互状态、响应式、可访问性四个维度做自检，并列出已满足项。

美学要求：
- 禁止纯黑纯白作为大面积背景或主要文字。
- 使用 60-30-10 配色，高亮色只用于核心 CTA。
- gap / padding / margin 不低于 24px。
- 圆角 8px-16px，阴影柔和克制。
- 所有可交互元素有 transition: all 0.3s ease。
- 页面必须高级、克制、清晰、可扫描，不要廉价渐变和无意义装饰。

我的页面需求是：[在这里填写需求]
```

---

## 10. 参考来源与搜索入口

以下来源适合继续搜索和扩展技能库：

- OpenAI Codex Skills 官方文档：https://developers.openai.com/codex/skills
- Anthropic Agent Skills 官方文档：https://docs.anthropic.com/en/docs/agents-and-tools/skills/overview
- Model Context Protocol 官方文档：https://modelcontextprotocol.io/
- MCP Registry：https://github.com/modelcontextprotocol/registry
- Glama MCP Server 目录：https://glama.ai/mcp/servers
- Smithery MCP Server 目录：https://smithery.ai/
- Dify Marketplace：https://marketplace.dify.ai/
- Coze / 扣子插件与工作流：https://www.coze.cn/
- TunX / AgentPowers Skills 市场：https://www.tunx.ai/

建议搜索关键词：

```text
design system skill
frontend visual QA skill
shadcn UI skill
Tailwind UI generation skill
Playwright MCP screenshot
Figma MCP design tokens
Chrome DevTools MCP
UI UX audit agent
landing page optimizer
dashboard design system
国内 AI skills 市场
智能体 技能市场 MCP 插件
```

---

## 11. 维护建议

- 把本文件作为全局 UI 生成规范。
- 每次生成出满意页面后，追加“成功 Prompt”和“有效设计 token”。
- 每次发现糟糕输出，追加到“视觉黑名单”。
- 如果某类页面经常生成，例如 SaaS 首页、Dashboard、表单页，应单独拆成一个 skill。
- 第三方 skills、MCP、插件安装前要检查权限，尤其是文件系统、命令执行、浏览器自动化和网络访问权限。
