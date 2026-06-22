# 学习笔记 · Loop Engineering 橙皮书

> 来源:`D:\学习院\Loop-Engineering橙皮书-v260615.pdf`(花叔, 2026-06-15)
> 学习日期:2026-06-22
> 实践项目:`loop-engineering/`(本仓库)

## 一句话收获

**Loop engineering is replacing yourself as the person who prompts the agent.
You design the system that does it instead.** — Addy Osmani

最大的认知冲击:**从"操作 agent"转移到"调度 agent"**。
写 prompt 的人不值钱了,**造循环 + 装评判器**的人值钱。

## 四层栈(§02)— 速记

```
Prompt        → 管一句话
Context       → 管一窗户
Harness       → 管一次跑
Loop          → 管让它自己跑下去  ← 我现在站的位置
```

每一层都比下一层**离现场更远**,犯的错**攒得更久**。
我最大的盲区:一直停在 Context 层管理单个 session,没往 Harness / Loop 走。

## 五动作(§03)— 一个 loop 转一圈发生什么

| 动作 | 干什么 | 我项目里的对应 |
|---|---|---|
| 发现 | 自己找出这圈该做的事 | `discover.sh` 读 `inbox/*.md` + `state/memory.md` |
| 交付 | 把任务隔离着交给 agent | `bash run.sh prepare` 开 worktree |
| 验证 | 换个 agent 说「不」 | `evaluator/gate.py`(确定性,LLM 跳不过)|
| 持久化 | 把状态写到对话之外 | `state/memory.md` + git commit |
| 调度 | 让它一圈圈自动转 | `bash run.sh all` / `/loop 5m $loop-triage` |

**易忘的细节**:Addy 原话"automation 才是让 loop 成为真正的 loop,
而**不**只是你跑过一次的某次运行"——没有调度就不是 loop,是手动 batch。

## 六零件(§04)— 一个 loop 需要什么

| 零件 | 对应动作 | 文件 |
|---|---|---|
| Automations | 调度 | `bash run.sh` + `/loop` |
| Worktrees | 交付 | `git worktree add .worktrees/wt-...` |
| Skills | 发现 | `.claude/skills/loop-triage/SKILL.md` |
| Connectors (MCP) | 持久化 | 简化版:文件 + git(将来接 Linear/Slack)|
| Sub-agents | 验证 | `evaluator/gate.py`(单文件代替子 agent)|
| Memory | 持久化 | `state/memory.md`(append-only) |

**Addy 原话**(反复出现,记牢):
> "you fire `$skill-name` instead of pasting a giant wall of instructions
> into a schedule that nobody will ever update."

触发 skill,不贴死 prompt——逻辑变了改 skill,别改 cron 排程。

## §05 评判器 — 整本书最难的章节

**核心理论**:
1. 写代码的 agent 给自己打分,**永远偏松**(Prithvi Rajasekaran / Anthropic 实证)
2. 让生成者自我批判,**比另起一个 evaluator 难得多**
3. 结构上分开生成和评判 = 借鉴 GAN

**实践**(Stripe Minions / §06):
- 用**确定性代码**做 evaluator,不调 LLM
- "能用确定性逻辑解决的,绝不交给概率模型"
- evaluator 默认拒绝:assume the code is broken until proven otherwise

**我的 gate.py 验证记录**(对照"自爆"修改):
```
[PASS] G1 相对 main diff 行数: 2
[PASS] G2 修改 1 个文件,均在白名单
[FAIL] G3 自爆标记: ['TODO 残留', 'console.log 调用']
[FAIL] G5 commit message 太短: 9 字符(<20)
[PASS] G4 估算 token 71 / 50000
```

G3 + G5 真在挡——evaluator 写之前我自己都没意识到 "minor fix" 这种空 commit
会偷偷过关。

## §07 四笔债 — 防御清单

| 债 | 症状 | 我的防御 |
|---|---|---|
| 验证债 | 产出堆着没人验 | evaluator/gate.py 五个 gate |
| 理解腐烂 | 代码在长,你脑里的地图停了 | 每个 commit 强制写"为什么"(G5)|
| 认知投降 | 循环给啥收啥,懒得有意见 | evaluator FAIL 不能 override,只能 defer |
| token 失控 | 用量剧烈波动 | MAX_TOKENS=50000(G4),硬上限 |

## §08 当工程师,不只按启动键

**最扎心的话**(Addy 原话):
> "Build the loop. But build it like someone who intends to stay the engineer,
> not just the person who presses go."

**我的实操体会**:
1. **loop 本身不难搭**——bash + python 几十行就够
2. **难的是 evaluator**——gate.py 写了 200 行还是漏了 G1(最初用了 `git diff HEAD`,
   应当用 `main...HEAD`,因为 wt 自己 commit 后 HEAD 跟 wt 的 HEAD 没差)
3. **memory 是真的关键**——5 个步骤里只有它能跨轮续命
4. **evaluator 自己也会有 bug**——memory.md 真实记录了"第一次跑,evaluator 把好改动判 FAIL;
   修了;第二次跑,真 FAIL 的坏改动被拦下来"。**这本身是 §05 的活教材**
5. **MAX_TOKENS=50000 是心理安慰**——真实 token 失控发生在 LLM 自己孵化子 agent 那层,
   Python gate 看不到。**后续要么改用 Claude Code 的 usage API,要么在 cloud 这一层做 cap**

## 三个真实案例(§06)对照我的项目

| 案例 | 规模 | 核心做法 | 我能借的 |
|---|---|---|---|
| Addy 早晨 triage | 1 人 + 1 机 | automation + worktree + 子 agent + memory | 完全照抄(我的项目)|
| Stripe Minions | 1 周 1300 PR | 6 层架构、确定性 gate、cattle-not-pets | 加 MCP connector + 沙箱 |
| 云端 vs 本地 | 关机也跑 | Cloud Routines / GitHub Actions | 后续把 run.sh 接进 GH Actions |

## 在 Claude Code 里真跑(§09 五步法)

```bash
cd /d/学习院/CodeCamp/loop-engineering
claude

# 单次跑(发现 + 起草代码)
$loop-triage

# 定时跑(每 5 分钟)
/loop 5m $loop-triage

# 跑到条件满足为止(用 /goal)
/goal bash run.sh evaluate exits 0
```

## 下一步 TODO

- [ ] 把 run.sh 接进 GitHub Actions(对应 §06 "睡觉时跑")
- [ ] evaluator 加上 G6:实际跑 `pytest`(目前 G1-G5 只看静态 diff,不跑测试)
- [ ] 把 G3 的禁止标记做成可配置(目前是硬编码的 6 条)
- [ ] 把 memory.md 加个归档脚本(>100 行自动搬 `state/archive/`)
- [ ] MCP connector:接 Linear 替代 `inbox/*.md`(对应 §04 零件四)
- [ ] 真的在 Claude Code 里用 `$loop-triage` 跑一圈,看 LLM 写的代码能不能过 gate

## 与 pixelforge 的对照

我正在做 pixelforge(像素级图片理解+编辑工作流引擎)。
**loop engineering 是它架构层面的母概念之一**——

| pixelforge 组件 | 对应 loop 零件 |
|---|---|
| workflow 配置 | Automations(调度) |
| 中间结果缓存 | Memory(持久化) |
| 评分函数 | Evaluator(验证) |
| 多步骤原子化 | Worktrees(隔离)|

如果把 pixelforge 抽象成"循环"——它本质上就是一个**图像领域的
triage loop**:每跑一圈,挑张图,改一改,验证一下,落盘,等下一圈。
