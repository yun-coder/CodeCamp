# loop-engineering — 第一个能自己转的 loop

> 学习资料:D:\学习院\Loop-Engineering橙皮书-v260615.pdf
> 对应章节:§03 五动作 / §04 六零件 / §05 生成器-评判器 / §06 三个案例 / §09 五步上手

这个目录是橙皮书 §09 五步法的**最小可运行实现**。
目标:不开 Claude Code,只靠 bash + python 也能验证"发现 → 交付 → 验证 → 持久化"全闭环。

## 5 分钟开跑(只跑脚手架,不调 Claude Code)

```bash
cd /d/学习院/CodeCamp/loop-engineering

# 1) 看现状
bash run.sh status

# 2) 制造一个待办(inbox 里的 .md 文件会被 loop 当发现处理)
echo "# 修个 typo
[high] src/index.ts 里有 TODO 标记" > inbox/fix-typo.md

# 3) 跑发现
bash run.sh discover

# 4) 给这个待办开 worktree(动作二·交付)
bash run.sh prepare inbox/fix-typo.md

# 5) 模拟一次修改(在 worktree 里写个有意义的 commit)
cd .worktrees/wt-$(date -u +%Y%m%d-%H%M)*/
mkdir -p src
echo 'export const greet = (name: string): string => `hello, ${name}`' > src/greet.ts
git add . && git commit -m "feat: add greet function

fixes #1 — because the app needs a greeting helper to avoid
duplicated string templates across components."

cd ../..

# 6) 跑 evaluator(动作三·验证,§05 关键)
bash run.sh evaluate

# 7) 看持久化结果
bash run.sh status
tail -5 state/memory.md
```

## 在 Claude Code 里真跑

```bash
cd /d/学习院/CodeCamp/loop-engineering
claude
```

进入 Claude Code 后:

```
# 单次跑
$loop-triage

# 或者定时跑(对应 §09 第一步)
/loop 5m $loop-triage

# 让它跑到所有 gate 都过为止(对应 §09 第四步)
/goal bash run.sh evaluate exits 0
```

## 目录结构(对应 §04 六零件)

```
loop-engineering/
├── .claude/
│   ├── loop.md                 # /loop 默认入口
│   └── skills/loop-triage/
│       └── SKILL.md            # §04 零件三 — 发现逻辑固化在这里
├── evaluator/
│   └── gate.py                 # §05 — 独立评判器,确定性,LLM 跳不过
├── inbox/
│   └── *.md                    # 动作一·发现的输入
├── state/
│   ├── memory.md               # §04 零件六 — 跨轮记忆
│   └── archive/                # 归档区(>100 行时手动搬)
├── .worktrees/                 # §04 零件二 — git worktree 隔离区
├── run.sh                      # §03 五动作的 bash 入口(不用 Claude Code 也能跑)
└── README.md                   # 本文件
```

## 验证闭环的 5 个标志

跑完上面的步骤,检查:

- [ ] `bash run.sh status` 看到一个 `wt-...` worktree 存在
- [ ] `state/memory.md` 至少多了一行(`<time> | <slug> | passed | all gates passed`)
- [ ] `git log --oneline` 在主分支能看到新 commit
- [ ] `evaluator/gate.py` 退出码 0
- [ ] **故意制造一个失败**:在 commit message 里写"改了 X"(没"为什么"),`evaluate` 应该 FAIL → memory.md 多一条 `failed` 行

## 我学到什么(对应 §08 当工程师)

- **循环本身不难搭**(bash + python 几十行就够)。**难的是 evaluator**(gate.py 写了 200 行还是漏掉了"测试是否真跑了"这条——这是后续要补的)。
- **memory 是真的关键**——5 个步骤里只有它能跨轮续命。
- **不给 evaluator 装 "为什么要改" 检查,作者会偷懒**——一个空 commit 加 "minor fix" 就过了 gate,我故意加的 G5 就是防御这个。
- **MAX_TOKENS=50000 是心理安慰,不是真防御**——真实的 token 失控发生在 LLM 自己孵化子 agent 那层,Python gate 看不到。后续要么改用 Claude Code 的 `usage` API,要么在 cloud 这一层做 cap。
