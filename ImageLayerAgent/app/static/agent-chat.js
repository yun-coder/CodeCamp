const AGENT_PROJECT_KEY = "ila.currentProjectId";

const agentState = {
  busy: false,
  projectId: currentProjectId(),
};

function currentProjectId() {
  return window.ImageLayerProject?.getProjectId?.() || localStorage.getItem(AGENT_PROJECT_KEY) || null;
}

function endpoint(path) {
  const projectId = currentProjectId();
  if (!projectId) return `/api/agent/${path}`;
  return `/api/projects/${projectId}/agent/${path}`;
}

function clearStaleProject() {
  localStorage.removeItem(AGENT_PROJECT_KEY);
  localStorage.removeItem("ila.currentProjectSourceUrl");
  agentState.projectId = null;
}

function createAgentChat() {
  if (document.querySelector("#agentChat")) return;
  const root = document.createElement("section");
  root.id = "agentChat";
  root.className = "agent-chat";
  root.setAttribute("aria-label", "小画助手会话入口");
  root.innerHTML = `
    <div class="agent-chat-panel">
      <header class="agent-chat-header">
        <div>
          <strong>小画</strong>
          <span id="agentChatSubTitle">上传原图和产品图后开始替换</span>
        </div>
        <button id="agentChatCollapse" type="button" class="agent-chat-collapse-btn" aria-label="收缩聊天窗口" title="收缩">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </header>
      <div id="agentMessages" class="agent-messages"></div>
      <form id="agentChatForm" class="agent-chat-form">
        <label class="agent-upload-button" title="上传原图" aria-label="上传原图">
          <input id="agentImageInput" type="file" accept="image/*" />
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </label>
        <label class="agent-upload-button product-upload-button" title="上传产品图" aria-label="上传产品图">
          <input id="agentProductInput" type="file" accept="image/*" />
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 8h12v10H6z" />
            <path d="M9 8a3 3 0 0 1 6 0" />
          </svg>
        </label>
        <input id="agentChatInput" type="text" placeholder="上传图片或输入消息" autocomplete="off" />
        <button id="agentSendButton" type="submit" aria-label="发送">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </div>
    <button id="agentChatReopen" type="button" class="agent-chat-reopen-btn" aria-label="展开聊天窗口">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
      <span>小画</span>
    </button>
  `;
  const host = document.querySelector(".main-pane") || document.body;
  host.append(root);
}

function elements() {
  return {
    messages: document.querySelector("#agentMessages"),
    form: document.querySelector("#agentChatForm"),
    input: document.querySelector("#agentChatInput"),
    imageInput: document.querySelector("#agentImageInput"),
    productInput: document.querySelector("#agentProductInput"),
    upload: document.querySelector(".agent-upload-button"),
    productUpload: document.querySelector(".product-upload-button"),
    send: document.querySelector("#agentSendButton"),
    subtitle: document.querySelector("#agentChatSubTitle"),
  };
}

function openAgentChat() {
  elements().input?.focus();
}

function setSubtitle(text) {
  const { subtitle } = elements();
  if (subtitle) subtitle.textContent = text;
}

function setBusy(busy) {
  agentState.busy = busy;
  const { input, send, upload, productUpload } = elements();
  if (input) input.disabled = busy;
  if (send) send.disabled = busy;
  upload?.classList.toggle("disabled", busy);
  productUpload?.classList.toggle("disabled", busy);
}

function appendMessage(role, content) {
  const { messages } = elements();
  if (!messages || !content) return;
  const item = document.createElement("div");
  item.className = `agent-message ${role}`;
  item.textContent = content;
  messages.append(item);
  messages.scrollTop = messages.scrollHeight;
}

function renderMessages(items) {
  const { messages } = elements();
  if (!messages) return;
  messages.innerHTML = "";
  if (!items?.length) {
    appendMessage(
      "assistant",
      currentProjectId()
        ? "原图已接入当前画布。请继续上传产品图，小画会保留原图背景风格并替换旧产品。"
        : "请先上传原图，再上传产品图。小画会定位旧产品区域，并生成替换结果。"
    );
    return;
  }
  for (const item of items) {
    appendMessage(item.role, item.content);
  }
}

async function loadMessages() {
  agentState.projectId = currentProjectId();
  if (!agentState.projectId) {
    setSubtitle("上传原图和产品图后开始替换");
    renderMessages([]);
    return;
  }
  setSubtitle(agentState.projectId ? `项目 ${agentState.projectId}` : "上传原图和产品图后开始替换");
  try {
    const response = await fetch(endpoint("messages"));
    if (!response.ok) {
      const content = await response.text();
      if (response.status === 404 || content.includes("Project not found")) {
        clearStaleProject();
        setSubtitle("上传原图和产品图后开始替换");
        renderMessages([]);
        return;
      }
      throw new Error(content);
    }
    renderMessages(await response.json());
  } catch (error) {
    renderMessages([]);
  }
}

function _thinkingId() {
  return `thinking-${Date.now()}`;
}

function showThinking() {
  const { messages } = elements();
  if (!messages) return;
  removeThinking();
  const id = _thinkingId();
  const el = document.createElement("div");
  el.className = "agent-message assistant thinking";
  el.id = id;
  el.innerHTML = `
    <span class="thinking-dots">
      <span></span><span></span><span></span>
    </span>
    <small>小画正在思考...</small>
  `;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  return id;
}

function removeThinking() {
  const { messages } = elements();
  if (!messages) return;
  messages.querySelectorAll(".agent-message.thinking").forEach((el) => el.remove());
}

function typewrite(element, text, speed = 30) {
  return new Promise((resolve) => {
    let i = 0;
    element.textContent = "";
    function tick() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        const { messages } = elements();
        if (messages) messages.scrollTop = messages.scrollHeight;
        setTimeout(tick, speed);
      } else {
        resolve();
      }
    }
    tick();
  });
}

async function sendMessage(message) {
  if (!currentProjectId()) {
    appendMessage("assistant", "请先上传原图，再上传产品图。我会保留原图背景风格，并把产品替换进去。");
    setSubtitle("等待原图上传");
    return;
  }
  setBusy(true);
  appendMessage("user", message);
  showThinking();
  try {
    const response = await fetch(endpoint("chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${response.status}: ${errText || response.statusText}`);
    }
    const result = await response.json();
    removeThinking();
    const last = result.messages?.[result.messages.length - 1];
    if (last?.role === "assistant" && last.content) {
      const item = document.createElement("div");
      item.className = "agent-message assistant";
      const { messages } = elements();
      messages.appendChild(item);
      messages.scrollTop = messages.scrollHeight;
      await typewrite(item, last.content, 25);
    }
    if (last?.role === "assistant") {
      window.dispatchEvent(
        new CustomEvent("imagelayer:agent-message", {
          detail: { role: "assistant", content: last.content, projectId: currentProjectId() },
        })
      );
    }
    setSubtitle(currentProjectId() ? `项目 ${currentProjectId()}` : result.available ? "已连接" : "未配置");
  } catch (error) {
    removeThinking();
    appendMessage("assistant", `发送失败：${error.message}`);
    setSubtitle("发送失败");
  } finally {
    setBusy(false);
  }
}

async function startWorkflow(projectId) {
  localStorage.setItem(AGENT_PROJECT_KEY, projectId);
  agentState.projectId = projectId;
  setBusy(true);
  setSubtitle(`项目 ${projectId} · 处理中`);
  renderMessages([]);
  showThinking();
  try {
    const response = await fetch(`/api/projects/${projectId}/agent/workflow`, { method: "POST" });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${response.status}: ${errText || response.statusText}`);
    }
    const result = await response.json();
    removeThinking();
    const last = result.messages?.[result.messages.length - 1];
    if (last?.role === "assistant" && last.content) {
      const item = document.createElement("div");
      item.className = "agent-message assistant";
      const { messages } = elements();
      messages.appendChild(item);
      messages.scrollTop = messages.scrollHeight;
      await typewrite(item, last.content, 25);
    }
    setSubtitle(result.available ? `项目 ${projectId}` : "未配置");
    window.dispatchEvent(new CustomEvent("imagelayer:agent-workflow-complete", { detail: result }));
  } catch (error) {
    removeThinking();
    appendMessage("assistant", `工作流失败：${error.message}`);
    setSubtitle("处理失败");
    window.dispatchEvent(
      new CustomEvent("imagelayer:agent-workflow-failed", {
        detail: { projectId, message: error.message },
      })
    );
  } finally {
    setBusy(false);
  }
}

async function uploadImageFile(file) {
  if (!file) return;
  setBusy(true);
  appendMessage("user", `上传原图：${file.name}`);
  try {
    if (window.ImageLayerApp?.uploadImage) {
      await window.ImageLayerApp.uploadImage(file);
      appendMessage("assistant", "原图已收到。请继续上传产品图，我会开始替换。");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/projects", { method: "POST", body: form });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    localStorage.setItem(AGENT_PROJECT_KEY, result.project_id);
    appendMessage("assistant", "原图已上传。请继续上传产品图。");
  } catch (error) {
    appendMessage("assistant", `上传失败：${error.message}`);
    setSubtitle("上传失败");
  } finally {
    setBusy(false);
  }
}

async function uploadProductImageFile(file) {
  if (!file) return;
  setBusy(true);
  appendMessage("user", `上传产品图：${file.name}`);
  try {
    if (!currentProjectId() || !window.ImageLayerApp?.uploadProduct) {
      appendMessage("assistant", "请先上传原图，再上传产品图。");
      return;
    }
    await window.ImageLayerApp.uploadProduct(file);
    appendMessage("assistant", "替换结果已生成。你可以在画布最后一个节点查看三图对比。");
    setSubtitle(`项目 ${currentProjectId()} · 替换完成`);
  } catch (error) {
    appendMessage("assistant", `产品图处理失败：${error.message}`);
    setSubtitle("替换失败");
  } finally {
    setBusy(false);
  }
}

function bindAgentChat() {
  const { form, input, imageInput, productInput } = elements();
  const collapseBtn = document.querySelector("#agentChatCollapse");
  const reopenBtn = document.querySelector("#agentChatReopen");
  const chatRoot = document.querySelector("#agentChat");

  collapseBtn?.addEventListener("click", () => {
    chatRoot?.classList.add("collapsed");
  });

  reopenBtn?.addEventListener("click", () => {
    chatRoot?.classList.remove("collapsed");
    input?.focus();
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = input?.value.trim();
    if (!message || agentState.busy) return;
    input.value = "";
    sendMessage(message);
  });
  imageInput?.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file || agentState.busy) return;
    await uploadImageFile(file);
    imageInput.value = "";
  });
  productInput?.addEventListener("change", async () => {
    const file = productInput.files?.[0];
    if (!file || agentState.busy) return;
    await uploadProductImageFile(file);
    productInput.value = "";
  });
  window.addEventListener("imagelayer:project-change", () => loadMessages());
  window.addEventListener("imagelayer:project-cleared", () => {
    clearStaleProject();
    setSubtitle("上传原图和产品图后开始替换");
    renderMessages([]);
  });
}

createAgentChat();
bindAgentChat();
loadMessages();

window.ImageLayerAgentChat = {
  open: openAgentChat,
  loadMessages,
  startWorkflow,
};
