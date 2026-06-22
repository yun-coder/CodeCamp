/* =================================================================
   IntentOS — 前端主逻辑
   -----------------------------------------------------------------
   设计要点：
   - 状态集中管理（state object），UI 通过 renderXxx() 函数响应式更新
   - 与后端走 SSE（Server-Sent Events），不依赖第三方库
   - 中文 UI + 中文 LLM 输出场景
   - 完全无外部 JS 依赖（无 React / Vue / jQuery）
   ================================================================= */

(() => {
  'use strict';

  // ---------------------------------------------------------------
  // 1. 状态
  // ---------------------------------------------------------------
  const state = {
    conv: [],          // 对话流：{role, text, tag, ts}
    canvas: null,      // 画布：{title, html}
    rail: [],          // 右侧栏：source/activity 卡片
    busy: false,       // 是否在等 LLM
    interrupted: false,// 用户是否中断
    scenarios: [],     // 后端返回的场景清单（用于生成 quick intent）
  };

  // ---------------------------------------------------------------
  // 2. DOM 工具
  // ---------------------------------------------------------------
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const now = () => new Date().toTimeString().slice(0, 8);

  /**
   * 安全的 HTML 注入：scenario 后端已经生成完整 HTML 字符串，
   * 视为可信源；用户消息用 textContent 防 XSS。
   */
  function setHTML(el, html) {
    el.innerHTML = html;
  }
  function setText(el, text) {
    el.textContent = text;
  }

  // ---------------------------------------------------------------
  // 3. 状态机：处理一条用户意图的完整流程
  // ---------------------------------------------------------------
  async function handleIntent(prompt) {
    if (!prompt.trim() || state.busy) return;

    state.busy = true;
    addConv('user', prompt);

    // 先展示 AI "正在思考" 的占位
    showThinking();

    try {
      const resp = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, history: state.conv.slice(-10) }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${txt}`);
      }

      // 用 ReadableStream 解析 SSE
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let aiMsg = '';  // 累积流式 LLM 输出

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // SSE 事件以 \n\n 分隔
        let idx;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const event = parseSSE(buf.slice(0, idx));
          buf = buf.slice(idx + 2);
          if (!event) continue;

          if (event.event === 'chunk') {
            // 流式 LLM 文字片段
            aiMsg += event.data.text || '';
            updateThinkingText(aiMsg);
          } else if (event.event === 'scenario') {
            // 触发场景
            applyScenario(event.data);
          } else if (event.event === 'error') {
            throw new Error(event.data.message);
          } else if (event.event === 'done') {
            // 收尾
          }
        }
      }

      // 把"占位 AI 消息"变成正式消息
      finalizeThinking(aiMsg);
    } catch (err) {
      finalizeThinking(`[错误] ${err.message}`);
      console.error(err);
    } finally {
      state.busy = false;
    }
  }

  /**
   * 解析一个 SSE 块（形如 "event: chunk\ndata: {...}"）。
   */
  function parseSSE(block) {
    const lines = block.split('\n');
    let event = null, data = null;
    for (const line of lines) {
      if (line.startsWith('event: ')) event = line.slice(7).trim();
      else if (line.startsWith('data: ')) {
        const raw = line.slice(6).trim();
        try { data = JSON.parse(raw); } catch { data = raw; }
      }
    }
    return event ? { event, data } : null;
  }

  // ---------------------------------------------------------------
  // 4. 对话流（左侧）
  // ---------------------------------------------------------------
  function addConv(role, text, opts = {}) {
    state.conv.push({ role, text, ts: now(), ...opts });
    renderConv();
  }

  function showThinking() {
    // 添加一个空的 AI 气泡，里面放思考 dots
    const item = { role: 'ai', text: '', ts: now(), thinking: true };
    state.conv.push(item);
    renderConv();
  }

  function updateThinkingText(text) {
    // 更新最后一个气泡的文字
    const last = state.conv[state.conv.length - 1];
    if (last) {
      last.text = text;
      last.thinking = true;  // 还在流式
      renderConv();
    }
  }

  function finalizeThinking(text) {
    const last = state.conv[state.conv.length - 1];
    if (last) {
      last.text = text || last.text;
      last.thinking = false;
      renderConv();
    }
  }

  function renderConv() {
    const c = $('#conv');
    let html = '';
    for (const m of state.conv) {
      const tagText = m.role === 'user' ? 'YOU' : 'AI';
      const tagClass = `bubble-tag bubble-tag-${m.role}`;
      const sysClass = m.role === 'ai' && m.system ? ' system' : '';
      let body = '';
      if (m.thinking && !m.text) {
        body = '<span class="thinking"><span></span><span></span><span></span></span>';
      } else {
        body = escape(m.text || '');
      }
      html += `
        <div class="bubble ${m.role}${sysClass}">
          <div class="bubble-meta">
            <span class="${tagClass}">${tagText}</span>
            <span>${m.ts}</span>
            ${m.scenario ? `<span class="bubble-tag">${m.scenario}</span>` : ''}
          </div>
          <div class="bubble-body">${body}</div>
        </div>
      `;
    }
    setHTML(c, html);
    c.scrollTop = c.scrollHeight;
    setText($('#conv-count'), state.conv.length);
  }

  function escape(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ---------------------------------------------------------------
  // 5. 画布（中间）
  // ---------------------------------------------------------------
  function setCanvas(title, html) {
    state.canvas = { title, html };
    renderCanvas();
  }

  function renderCanvas() {
    const c = $('#canvas');
    if (!state.canvas) {
      setHTML(c, `
        <div class="canvas-empty">
          <div class="empty-mark">∅</div>
          <p>画布为空</p>
          <p class="empty-sub">说点什么开始一个工作</p>
        </div>
      `);
    } else {
      setHTML(c, state.canvas.html);
    }
    setText($('#canvas-title'), state.canvas?.title || '空');
  }

  // ---------------------------------------------------------------
  // 6. 数据源 / 活动（右侧）
  // ---------------------------------------------------------------
  function addSource(src) {
    state.rail.unshift({
      type: 'source',
      title: src.title || '',
      body: src.body || '',
      meta: src.meta || '',
      ts: now(),
    });
    if (state.rail.length > 50) state.rail.pop();
    renderRail();
  }

  function addActivity(text) {
    state.rail.unshift({
      type: 'activity',
      text,
      ts: now(),
    });
    if (state.rail.length > 50) state.rail.pop();
    renderRail();
  }

  function renderRail() {
    const r = $('#rail');
    let html = '';
    for (const item of state.rail) {
      if (item.type === 'source') {
        html += `
          <div class="source-card">
            <div class="src-title">▣ ${escape(item.title)}</div>
            <div>${escape(item.body)}</div>
            <div class="src-meta">${escape(item.meta)} · ${item.ts}</div>
          </div>
        `;
      } else if (item.type === 'activity') {
        html += `
          <div class="activity-item">
            <span class="at-dot"></span>
            <div>
              <div class="at-text">${escape(item.text)}</div>
              <div class="at-ts">${item.ts}</div>
            </div>
          </div>
        `;
      }
    }
    setHTML(r, html);
    setText($('#rail-count'), state.rail.length);
  }

  // ---------------------------------------------------------------
  // 7. 场景应用：把后端返回的 scenario HTML 注入到画布
  // ---------------------------------------------------------------
  function applyScenario(s) {
    // 画布中央显示卡片
    setCanvas(s.title, s.canvas_html);

    // 右侧 rail 累加 source 和 activity
    if (s.sources) for (const src of s.sources) addSource(src);
    if (s.activity) for (const text of s.activity) addActivity(text);

    // 在最后一条 AI 消息上挂 scenario 标签
    const last = state.conv[state.conv.length - 1];
    if (last) {
      last.scenario = s.tag || s.id;
      renderConv();
    }

    // 绑定按钮的回调（如"发邮件+约会议"场景的确认按钮）
    bindScenarioActions();
  }

  function bindScenarioActions() {
    // 通用：把按钮 data-confirm 转成"已确认"反馈
    $$('.actions [data-confirm]').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.onclick = () => {
        const c = btn.dataset.confirm;
        let reply;
        if (c === 'cancel' || c === 'X') {
          reply = '已取消。';
        } else if (c === '1500' || c === '1515') {
          reply = `已发送邮件并创建会议，时间 ${c === '1500' ? '15:00' : '15:15'}。`;
        } else if (c === 'A' || c === 'B' || c === 'C') {
          reply = `已采用隐私方案 ${c}。`;
        } else {
          reply = `已确认：${c}。`;
        }
        addConv('user', `[点击] ${btn.textContent.trim()}`);
        addConv('ai', reply);
        addActivity('用户已确认操作');
        // 替换按钮区为状态
        const wrap = btn.closest('.actions');
        if (wrap) {
          setHTML(wrap, `<div class="conflict">▣ ${escape(reply)}</div>`);
        }
      };
    });
  }

  // ---------------------------------------------------------------
  // 8. 开机：调 /api/boot，OS 主动续接
  // ---------------------------------------------------------------
  async function bootGreet() {
    try {
      const r = await fetch('/api/boot');
      const data = await r.json();
      // OS 主动把欢迎语作为 AI 消息插入
      addConv('ai', data.ai_message, { system: true });
      // 画布显示续接内容
      if (data.welcome_html) {
        setCanvas('主动续接 · 3 天前', data.welcome_html);
      }
      // 右侧 rail
      for (const s of (data.sources || [])) addSource(s);
      for (const a of (data.activity || [])) addActivity(a);
    } catch (e) {
      console.error('boot failed', e);
      addConv('ai', '开机问候失败，但 OS 已经在跑了。', { system: true });
    }
  }

  // ---------------------------------------------------------------
  // 9. 加载快捷意图
  // ---------------------------------------------------------------
  async function loadScenarios() {
    try {
      const r = await fetch('/api/scenarios');
      const d = await r.json();
      state.scenarios = d.scenarios || [];
      const c = $('#quick-intents');
      // 每个 scenario 渲染一个 quick-intent 按钮
      for (const s of state.scenarios) {
        if (s.id === 'welcome') continue;  // 跳过 welcome，单独触发
        const btn = document.createElement('button');
        btn.className = 'quick-intent';
        btn.textContent = s.title;
        btn.dataset.scenario = s.id;
        btn.onclick = () => {
          // 用场景描述作为 prompt（让 router 命中）
          const trigger = s.triggers[0] || s.title;
          $('#intent-input').value = trigger;
          $('#intent-send').click();
        };
        c.appendChild(btn);
      }
    } catch (e) {
      console.error('load scenarios failed', e);
    }
  }

  // ---------------------------------------------------------------
  // 10. 健康检查：显示 LLM 状态
  // ---------------------------------------------------------------
  async function checkHealth() {
    try {
      const r = await fetch('/api/health');
      const d = await r.json();
      setText($('#model-name'), `模型 · ${d.model}`);
      const s = $('#llm-status');
      if (d.real_llm) {
        s.textContent = '真实 LLM · 已连接';
        s.className = 'status status-ok';
      } else {
        s.textContent = '剧本模式';
        s.className = 'status status-warn';
      }
    } catch (e) {
      const s = $('#llm-status');
      s.textContent = '后端不可达';
      s.className = 'status status-err';
    }
  }

  // ---------------------------------------------------------------
  // 11. 启动
  // ---------------------------------------------------------------
  async function init() {
    // 时钟
    setInterval(() => {
      setText($('#clock'), now());
    }, 1000);

    // 意图输入
    const input = $('#intent-input');
    const send = $('#intent-send');
    const submit = () => {
      const v = input.value;
      if (!v) return;
      input.value = '';
      handleIntent(v);
    };
    send.onclick = submit;
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape' && state.busy) {
        state.interrupted = true;
        // 简单的中断：当前流式会在下一个 chunk 检测到
        addConv('ai', '[用户中断]');
        state.busy = false;
      }
    });

    // 启动开机动画
    runBootAnimation();
  }

  // ---------------------------------------------------------------
  // 12. 开机动画（终端日志滚动 + LED 顺序亮起）
  // ---------------------------------------------------------------
  async function runBootAnimation() {
    const logLines = [
      ['[BIOS] POST: 内存 ✓  存储 ✓  人格 ✓', 'ok'],
      ['[KERN] 加载意图解析器 v0.1.3', ''],
      ['[KERN] 挂载语义文件系统 (24,891 项)', 'ok'],
      ['[KERN] 链接上次会话：3 天前', 'warn'],
      ['[NET ] 与 4 个数据源建立信任握手', 'ok'],
      ['[AI  ] 模型: MiniMax-M3 (128K context)', ''],
      ['[AI  ] 读取未完成任务: q3_financial_draft.md', ''],
      ['[DONE] 一切就绪。', 'ok'],
    ];
    const log = $('#boot-log');
    log.innerHTML = '';
    for (const [line, kind] of logLines) {
      const div = document.createElement('div');
      if (kind) div.className = kind;
      div.textContent = line;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      await sleep(220);
    }
    // LED 顺序亮起
    document.querySelector('.led-r').classList.add('on');
    await sleep(300);
    document.querySelector('.led-a').classList.add('on');
    await sleep(300);
    document.querySelector('.led-g').classList.add('on');
    await sleep(500);

    // 淡出 boot，进入主界面
    $('#boot').classList.add('fade-out');
    await sleep(500);
    $('#boot').remove();
    const app = $('#app');
    app.classList.remove('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => app.classList.add('visible')));

    // 进入后立即：健康检查 + 加载场景 + 主动续接
    await checkHealth();
    await loadScenarios();
    await bootGreet();
  }

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
