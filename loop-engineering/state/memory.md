# Loop Memory — loop-triage

> 对应橙皮书 §04 零件六 · Memory
> 规则:append-only · 每行一个事件 · 不许 truncate · 不许在对话上下文里维护副本
> 格式: `<ISO8601时间> | <wt-slug> | <passed|failed|deferred> | <一句话摘要>`

<!--START-->

<!--END-->
2026-06-22T08:18:13Z | wt-20260622-0818-bad-change | failed | REJECTED by 3 gate(s): G1 无 diff(空修改,不算做事)
2026-06-22T08:18:43Z | wt-20260622-0818-bad-change | failed | REJECTED by 3 gate(s): G1 无 diff(空修改,不算做事)
2026-06-22T08:19:03Z | wt-20260622-0818-bad-change | failed | REJECTED by 3 gate(s): G1 无 diff(空修改,不算做事)
2026-06-22T08:19:03Z | wt-20260622-0818-bad-change | failed | REJECTED by 3 gate(s): G1 无 diff(空修改,不算做事)
2026-06-22T08:19:58Z | wt-20260622-0818-bad-change | failed | REJECTED by 2 gate(s): G3 自爆标记: ['TODO 残留 @ +// TODO: 稍后清理', 'console.log 调用 @ +export const bad = () => { console.log("debug"); return 42;']
