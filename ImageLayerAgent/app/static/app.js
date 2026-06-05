const fileInput = document.querySelector("#fileInput");
const analyzeButton = document.querySelector("#analyzeButton");
const exportButton = document.querySelector("#exportButton");
const packageButton = document.querySelector("#packageButton");
const layerList = document.querySelector("#layerList");
const statusBox = document.querySelector("#status");
const providerStatusBox = document.querySelector("#providerStatus");
const inspector = document.querySelector("#inspector");
const warningsBox = document.querySelector("#warnings");
const workflowOutputs = document.querySelector("#workflowOutputs");
const canvasStage = document.querySelector("#canvasStage");
const ocrOverlay = document.querySelector("#ocrOverlay");
const mindmapViewport = document.querySelector("#mindmapViewport");
const mindmapStage = document.querySelector("#mindmapStage");
const mindmapStatus = document.querySelector("#mindmapStatus");
const ocrNode = document.querySelector("#ocrNode");
const ocrNodeBody = document.querySelector("#ocrNodeBody");
const productNode = document.querySelector("#productNode");
const productNodeBody = document.querySelector("#productNodeBody");
const reconstructNode = document.querySelector("#reconstructNode");
const reconstructNodeBody = document.querySelector("#reconstructNodeBody");
const zoomOutButton = document.querySelector("#zoomOutButton");
const zoomResetButton = document.querySelector("#zoomResetButton");
const zoomInButton = document.querySelector("#zoomInButton");
const canvas = document.querySelector("#canvas");
const canvasEmpty = document.querySelector("#canvasEmpty");
const ctx = canvas.getContext("2d");

const PROJECT_ID_KEY = "ila.currentProjectId";
const PROJECT_SOURCE_KEY = "ila.currentProjectSourceUrl";
const PROJECT_PRODUCT_KEY = "ila.currentProjectProductUrl";
const WORKFLOW_OUTPUTS_KEY = "ila.workflowOutputs";

const state = {
  projectId: null,
  sourceUrl: null,
  productUrl: null,
  replacement: null,
  manifest: null,
  layers: [],
  images: new Map(),
  originalImage: null,
  ocrCards: [],
  ocrLoading: false,
  selectedId: null,
  dragging: false,
  dragStart: null,
  workflowStage: "empty",
  mindmap: {
    x: 40,
    y: 38,
    scale: 1,
    panning: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  },
  workflowOutputs: [],
};

window.ImageLayerProject = {
  getProjectId: () => state.projectId,
  getSourceUrl: () => state.sourceUrl,
  getManifest: () => state.manifest,
};

function setWorkflowVisible(visible) {
  mindmapViewport?.classList.toggle("no-project", !visible);
  if (packageButton) packageButton.disabled = !state.manifest;
}

function clearCurrentProject() {
  state.projectId = null;
  state.sourceUrl = null;
  state.productUrl = null;
  state.replacement = null;
  state.manifest = null;
  state.layers = [];
  state.images.clear();
  state.originalImage = null;
  state.ocrCards = [];
  state.ocrLoading = false;
  state.selectedId = null;
  state.workflowStage = "empty";
  localStorage.removeItem(PROJECT_ID_KEY);
  localStorage.removeItem(PROJECT_SOURCE_KEY);
  localStorage.removeItem(PROJECT_PRODUCT_KEY);
  loadWorkflowOutputs(null);
  setWorkflowVisible(false);
  renderOcrNode();
  if (canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  setCanvasEmpty(true);
  window.dispatchEvent(new CustomEvent("imagelayer:project-cleared"));
}

function setStatus(text) {
  if (statusBox) statusBox.textContent = text;
}

function setCanvasEmpty(visible) {
  canvasEmpty?.classList.toggle("hidden", !visible);
}

function workflowKey(projectId = state.projectId) {
  return `${WORKFLOW_OUTPUTS_KEY}.${projectId || "global"}`;
}

function loadWorkflowOutputs(projectId = state.projectId) {
  try {
    state.workflowOutputs = JSON.parse(localStorage.getItem(workflowKey(projectId)) || "[]");
  } catch {
    state.workflowOutputs = [];
  }
  renderWorkflowOutputs();
}

function persistWorkflowOutputs() {
  localStorage.setItem(workflowKey(), JSON.stringify(state.workflowOutputs.slice(-80)));
}

function applyMindmapTransform() {
  if (!mindmapStage) return;
  mindmapStage.style.transform = `translate(${state.mindmap.x}px, ${state.mindmap.y}px) scale(${state.mindmap.scale})`;
  if (zoomResetButton) zoomResetButton.textContent = `${Math.round(state.mindmap.scale * 100)}%`;
}

function setMindmapScale(nextScale, anchor = null) {
  const previousScale = state.mindmap.scale;
  const scale = Math.max(0.45, Math.min(1.8, nextScale));
  if (anchor && previousScale !== scale) {
    state.mindmap.x = anchor.x - ((anchor.x - state.mindmap.x) / previousScale) * scale;
    state.mindmap.y = anchor.y - ((anchor.y - state.mindmap.y) / previousScale) * scale;
  }
  state.mindmap.scale = scale;
  applyMindmapTransform();
}

function _activeNodeIds() {
  const stage = state.workflowStage;
  if (stage === "empty") return [];
  if (stage === "uploaded") return ["startNode", "ocrNode"];
  if (stage === "productUploaded" || stage === "analyzing") return ["startNode", "ocrNode", "productNode"];
  return ["startNode", "ocrNode", "productNode", "reconstructNode"];
}

function layoutMindmap() {
  if (typeof dagre === "undefined") return;
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 80, ranksep: 60, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  const activeIds = _activeNodeIds();
  const allIds = ["startNode", "ocrNode", "productNode", "reconstructNode"];

  // show/hide nodes
  for (const id of allIds) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.classList.toggle("hidden", !activeIds.includes(id));
  }

  if (activeIds.length === 0) {
    mindmapLinks.innerHTML = "";
    return;
  }

  for (const id of activeIds) {
    const el = document.getElementById(id);
    if (!el) continue;
    g.setNode(id, { width: el.offsetWidth || 480, height: el.offsetHeight || 430 });
  }

  if (activeIds.length >= 2) g.setEdge("startNode", "ocrNode");
  if (activeIds.length >= 3) g.setEdge("ocrNode", "productNode");
  if (activeIds.length >= 4) g.setEdge("productNode", "reconstructNode");

  dagre.layout(g);

  for (const id of activeIds) {
    const el = document.getElementById(id);
    if (!el || !g.node(id)) continue;
    const node = g.node(id);
    el.style.left = `${node.x - node.width / 2}px`;
    el.style.top = `${node.y - node.height / 2}px`;
  }

  const svg = mindmapLinks;
  if (!svg) return;
  const graph = g.graph();
  svg.setAttribute("viewBox", `0 0 ${graph.width} ${graph.height}`);
  svg.style.width = `${graph.width}px`;
  svg.style.height = `${graph.height}px`;
  mindmapStage.style.width = `${graph.width}px`;
  mindmapStage.style.height = `${graph.height}px`;

  svg.querySelectorAll(".mindmap-edge").forEach((e) => e.remove());

  for (const edge of g.edges()) {
    const points = g.edge(edge).points;
    if (!points || points.length < 2) continue;
    let d = `M${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C${cpx} ${prev.y} ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
    }
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "mindmap-edge");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "rgba(111, 55, 69, 0.42)");
    path.setAttribute("stroke-width", "3");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("marker-end", "url(#arrowHead)");
    svg.appendChild(path);
  }
}

function centerMindmap() {
  state.mindmap.x = 40;
  state.mindmap.y = 38;
  state.mindmap.scale = 1;
  layoutMindmap();
  applyMindmapTransform();
}

function addWorkflowOutput(type, title, detail, meta = {}) {
  const output = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    title,
    detail,
    meta,
    createdAt: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
  state.workflowOutputs.push(output);
  persistWorkflowOutputs();
  renderWorkflowOutputs();
  renderOcrNode();
}

function renderWorkflowOutputs() {
  if (!workflowOutputs) return;
  workflowOutputs.innerHTML = "";
  if (!state.workflowOutputs.length) {
    const empty = document.createElement("div");
    empty.className = "workflow-output empty";
    empty.textContent = "上传、解析、OCR、小画回复和导出结果会显示在这里。";
    workflowOutputs.append(empty);
    return;
  }
  for (const output of [...state.workflowOutputs].reverse()) {
    const item = document.createElement("div");
    item.className = `workflow-output ${output.type}`;
    const head = document.createElement("div");
    head.className = "workflow-output-head";
    const title = document.createElement("strong");
    title.textContent = output.title;
    const time = document.createElement("span");
    time.textContent = output.createdAt;
    head.append(title, time);
    const detail = document.createElement("p");
    detail.textContent = output.detail;
    item.append(head, detail);
    if (output.meta?.imageUrl) {
      const img = document.createElement("img");
      img.src = assetUrl(output.meta.imageUrl);
      img.alt = output.title;
      item.append(img);
    }
    workflowOutputs.append(item);
  }
}

function saveCurrentProject(projectId, sourceUrl) {
  state.projectId = projectId;
  state.sourceUrl = sourceUrl;
  localStorage.setItem(PROJECT_ID_KEY, projectId);
  if (sourceUrl) localStorage.setItem(PROJECT_SOURCE_KEY, sourceUrl);
  loadWorkflowOutputs(projectId);
  window.dispatchEvent(new CustomEvent("imagelayer:project-change", { detail: { projectId } }));
}

function saveCurrentProduct(productUrl) {
  state.productUrl = productUrl;
  if (productUrl) localStorage.setItem(PROJECT_PRODUCT_KEY, productUrl);
  else localStorage.removeItem(PROJECT_PRODUCT_KEY);
}

function assetUrl(url) {
  if (!url) return "";
  const separator = String(url).includes("?") ? "&" : "?";
  return `${url}${separator}t=${Date.now()}`;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = assetUrl(url);
  });
}

async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/projects", {
    method: "POST",
    body: form,
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function analyzeProject(projectId) {
  const response = await fetch(`/api/projects/${projectId}/analyze`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function uploadProductFile(projectId, file) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`/api/projects/${projectId}/product`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function composeReplacementProject(projectId) {
  const response = await fetch(`/api/projects/${projectId}/replacement/compose`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function fetchManifest(projectId) {
  const response = await fetch(`/api/projects/${projectId}/manifest`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function fetchProviderStatus() {
  const response = await fetch("/api/providers/status");
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function renderProviderStatus(status) {
  if (!providerStatusBox) return;
  providerStatusBox.innerHTML = "";
  const rows = [
    ["Active OCR", status.ocr],
    ["PaddleOCR Cloud", status.paddleocr_cloud],
    ["SAM2", status.segmentation],
    ["小画", status.agent],
  ];
  for (const [label, item] of rows) {
    const row = document.createElement("div");
    row.className = `provider-row ${item?.available ? "available" : "missing"}`;
    const name = document.createElement("strong");
    name.textContent = label;
    const detail = document.createElement("span");
    detail.textContent = item?.available ? item?.provider ?? "ready" : item?.detail ?? "missing";
    row.title = item?.detail ?? "";
    row.append(name, detail);
    providerStatusBox.append(row);
  }
}

function cleanOcrText(text) {
  return String(text || "")
    .replace(/!\[[^\]]*](?:\([^)]+\))?/g, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/^\s{0,3}#{1,6}\s*/, "")
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/`/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulOcrText(text) {
  const cleaned = cleanOcrText(text);
  if (!cleaned) return false;
  if (["image", "img", "figure", "picture", "photo"].includes(cleaned.toLowerCase())) return false;
  return /[\w\u4e00-\u9fff]/.test(cleaned);
}

function isImageMarker(text) {
  const raw = String(text || "");
  const cleaned = cleanOcrText(raw).toLowerCase();
  return /!\[[^\]]*](?:\([^)]+\))?/i.test(raw) || /<img\b[^>]*>/i.test(raw) || ["image", "img", "figure", "picture", "photo"].includes(cleaned);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function hasAny(text, needles) {
  const haystack = String(text || "").toLowerCase();
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

function positionLabel(bbox, width, height) {
  const cx = (Number(bbox?.x || 0) + Number(bbox?.width || 0) / 2) / Math.max(width || 1, 1);
  const cy = (Number(bbox?.y || 0) + Number(bbox?.height || 0) / 2) / Math.max(height || 1, 1);
  const horizontal = cx < 0.34 ? "左侧" : cx > 0.66 ? "右侧" : "中部";
  const vertical = cy < 0.34 ? "上方" : cy > 0.66 ? "下方" : "中段";
  return `${vertical}${horizontal}`;
}

function shouldEmitImageLayer(layer) {
  return Boolean(layer?.asset_url) && !["background", "background_clean", "shadow", "text_mask"].includes(layer.type);
}

function describeImageComponent(layer, manifest = state.manifest) {
  const bbox = layer?.bbox || {};
  const width = Math.max(manifest?.width || state.originalImage?.naturalWidth || 1, 1);
  const height = Math.max(manifest?.height || state.originalImage?.naturalHeight || 1, 1);
  const labelText = [layer?.name, layer?.type, layer?.attributes?.label, layer?.attributes?.notes].filter(Boolean).join(" ").toLowerCase();
  const relY = Number(bbox.y || 0) / height;
  const relH = Number(bbox.height || 0) / height;
  const relW = Number(bbox.width || 0) / width;
  const hasModel = ["human", "face_hair", "skin"].includes(layer?.type) || hasAny(labelText, ["model", "human", "person", "girl", "woman", "人物", "模特", "人像"]);
  const hasPants = hasAny(labelText, ["pants", "trouser", "bottom", "lower", "leggings", "裤", "下装"]) || (relY > 0.38 && relH > 0.2 && ["human", "product", "unknown"].includes(layer?.type));
  const hasTop = hasAny(labelText, ["top", "shirt", "upper", "vest", "bra", "jacket", "上衣", "衣服"]) || (relY < 0.56 && relH > 0.18 && ["human", "product", "unknown"].includes(layer?.type));
  const isSet = hasAny(labelText, ["set", "suit", "outfit", "套装", "整套"]) || (hasTop && hasPants) || (["human", "product"].includes(layer?.type) && relH > 0.55);
  const hasAccessories = layer?.type === "decor" || hasAny(labelText, ["accessory", "icon", "logo", "bag", "hat", "jewelry", "饰品", "图标", "标识", "配件"]) || (relW < 0.24 && relH < 0.24 && relY > 0.45);

  const tags = ["图片"];
  if (hasModel) tags.push("人物模特");
  if (hasTop) tags.push("上衣");
  if (hasPants) tags.push("裤子/下装");
  if (isSet) tags.push("套装");
  if (hasAccessories) tags.push("饰品/图标");

  let title = "图片组件";
  if (hasModel) title = "人物模特";
  else if (isSet) title = "套装/整身";
  else if (hasTop) title = "上衣区域";
  else if (hasPants) title = "裤子/下装";
  else if (hasAccessories) title = "饰品/图标";

  const details = {
    component_type: "image",
    source_layer_type: layer?.type,
    position: positionLabel(bbox, width, height),
    has_model: hasModel,
    has_pants: hasPants,
    has_top: hasTop,
    is_set: isSet,
    has_accessories: hasAccessories,
  };
  return {
    title,
    text: `${title}，位于原图${details.position}。`,
    tags,
    details,
  };
}

function normalizeOcrCards(cards = [], manifest = state.manifest) {
  const validCards = [];
  for (const card of cards || []) {
    const bbox = card?.bbox;
    const cardType = card?.card_type || card?.cardType || (card?.image_url || card?.imageUrl ? "image" : "text");
    const imageUrl = card?.image_url || card?.imageUrl || null;
    const text = cleanOcrText(card?.text || card?.recognized_text || card?.title);
    if (!bbox) continue;
    if (cardType === "text" && !isUsefulOcrText(text)) continue;
    if (cardType === "image" && !imageUrl) continue;
    validCards.push({
      id: card.id || `ocr-card-${validCards.length + 1}`,
      title: card.title || (cardType === "image" ? `图片组件 ${validCards.length + 1}` : `文案组件 ${validCards.length + 1}`),
      cardType,
      text: text || card.title || "图片组件",
      bbox,
      confidence: card.confidence,
      imageUrl,
      tags: Array.isArray(card.tags) ? card.tags : cardType === "image" ? ["图片"] : ["文案"],
      details: card.details || {},
      agentNote: card.agent_note || card.agentNote,
    });
  }
  if (validCards.length || !manifest) return validCards;
  for (const layer of manifest.layers || []) {
    const rawText = layer.attributes?.extra?.recognized_text;
    const text = cleanOcrText(rawText);
    if (layer.type === "text" && isUsefulOcrText(text)) {
      validCards.push({
        id: layer.id,
        title: `文案组件 ${validCards.length + 1}`,
        cardType: "text",
        text,
        bbox: layer.bbox,
        confidence: layer.attributes?.confidence,
        tags: ["文案"],
        details: {
          component_type: "text",
          position: positionLabel(layer.bbox, manifest.width, manifest.height),
        },
        agentNote: "小画已从 OCR 结果中整理为画布卡片。",
      });
      continue;
    }
    if ((layer.type !== "text" || isImageMarker(rawText)) && shouldEmitImageLayer(layer)) {
      const summary = describeImageComponent(layer, manifest);
      validCards.push({
        id: layer.id,
        title: summary.title,
        cardType: "image",
        text: summary.text,
        bbox: layer.bbox,
        confidence: layer.attributes?.confidence,
        imageUrl: layer.asset_url,
        tags: summary.tags,
        details: summary.details,
        agentNote: "小画已将该图片图层作为真实图片卡片展示。",
      });
    }
  }
  return validCards;
}

function setOcrLoading(loading) {
  state.ocrLoading = loading;
  renderOcrNode();
  renderProductNode();
  renderReconstructNode();
  renderLayerList();
}

function confidenceText(value) {
  if (typeof value !== "number") return "OCR";
  return `${Math.round(value * 100)}%`;
}

function targetProductLayer() {
  const preferred = ["product_candidate", "product_clean", "upper_clothes", "dress", "lower_clothes"];
  for (const id of preferred) {
    const layer = state.manifest?.layers?.find((item) => item.id === id);
    if (layer) return layer;
  }
  return state.manifest?.layers?.find((item) => ["product", "product_clean", "dress", "upper_clothes", "lower_clothes"].includes(item.type));
}

function replacementWarningsHtml() {
  const warnings = state.replacement?.warnings || [];
  if (!warnings.length) return "";
  return `<ul class="node-trace-list">${warnings.slice(0, 4).map((item) => `<li><span>${escapeHtml(item)}</span></li>`).join("")}</ul>`;
}

function renderReconstructNode() {
  if (!reconstructNode || !reconstructNodeBody) return;

  const hasResult = Boolean(state.replacement?.result_url);
  reconstructNode.classList.toggle("waiting", !hasResult);
  reconstructNode.classList.toggle("loading", state.ocrLoading);
  reconstructNode.classList.toggle("complete", hasResult && !state.ocrLoading);

  if (!state.productUrl) {
    reconstructNodeBody.innerHTML = `<div class="mind-node-empty">上传产品图后，小画会生成替换结果。</div>`;
    return;
  }

  if (state.ocrLoading) {
    reconstructNodeBody.innerHTML = `
      <div class="mind-node-loading">
        <span class="loader-dot" aria-hidden="true"></span>
        <strong>正在生成替换结果</strong>
        <p>小画会调用视觉规划和图像编辑模型，保留原图风格并完成产品/人物替换。</p>
      </div>
    `;
    return;
  }

  if (state.replacement?.result_url) {
    reconstructNodeBody.innerHTML = `
      <div class="product-node-summary">替换结果已生成</div>
      <div class="replacement-compare-grid">
        <div class="product-step">
          <span class="step-label">原图背景</span>
          <img src="${assetUrl(state.sourceUrl)}" alt="原图" class="product-step-img" />
        </div>
        <div class="product-step">
          <span class="step-label">产品图</span>
          <img src="${assetUrl(state.productUrl)}" alt="产品图" class="product-step-img" />
        </div>
        <div class="product-step result">
          <span class="step-label">替换结果</span>
          <img src="${assetUrl(state.replacement.result_url)}" alt="替换结果" class="product-step-img result" />
        </div>
      </div>
      <div class="component-agent-note">${escapeHtml(state.replacement.style_summary || "保留原图背景风格，仅替换目标产品区域。")}</div>
      ${replacementWarningsHtml()}
    `;
    return;
  }

  reconstructNodeBody.innerHTML = `
    <div class="mind-node-empty">产品图已上传，等待生成替换结果。</div>
  `;
}

function renderOcrCards() {
  renderOcrNode();
  renderProductNode();
  renderReconstructNode();
}

function renderProductNode() {
  if (!productNode || !productNodeBody) return;

  const hasProduct = Boolean(state.productUrl);
  productNode.classList.toggle("waiting", !hasProduct);
  productNode.classList.toggle("loading", state.ocrLoading);
  productNode.classList.toggle("complete", hasProduct && !state.ocrLoading);

  if (!state.productUrl) {
    productNodeBody.innerHTML = `<div class="mind-node-empty">请继续上传要替换进去的产品图。</div>`;
    return;
  }

  if (state.ocrLoading) {
    productNodeBody.innerHTML = `
      <div class="mind-node-loading">
        <span class="loader-dot" aria-hidden="true"></span>
        <strong>正在处理产品图</strong>
        <p>产品图将作为图像编辑模型的参考图，不再走本地抠图合成。</p>
      </div>
    `;
    return;
  }

  productNodeBody.innerHTML = `
    <div class="product-node-summary">产品参考图已上传</div>
    <div class="product-step result">
      <span class="step-label">模型参考图</span>
      <img src="${assetUrl(state.productUrl)}" alt="产品图" class="product-step-img result" />
    </div>
    <div class="component-agent-note">后续由视觉模型识别参考图主体，再由图像编辑模型完成最终融合。</div>
  `;
}

function latestWorkflowOutputs(limit = 3) {
  return [...state.workflowOutputs].slice(-limit).reverse();
}

function componentTagsHtml(card) {
  const tags = Array.isArray(card.tags) && card.tags.length ? card.tags : [card.cardType === "image" ? "图片" : "文案"];
  return `<div class="component-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function componentDetailRows(card) {
  const details = card.details || {};
  const labels = [
    ["position", "原图位置"],
    ["category", "文案分类"],
    ["from_human_parser", "人体解析"],
    ["has_model", "人物模特"],
    ["has_top", "上衣"],
    ["has_pants", "裤子/下装"],
    ["is_set", "套装"],
    ["has_accessories", "饰品/图标"],
  ];
  return labels
    .filter(([key]) => details[key] !== undefined && details[key] !== null && details[key] !== "")
    .map(([key, label]) => {
      const value = typeof details[key] === "boolean" ? (details[key] ? "是" : "否") : details[key];
      return `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`;
    })
    .join("");
}

function _cardPriority(card) {
  if (card.details?.priority !== undefined) return card.details.priority;
  const tagScores = {
    "人物模特": 10, "产品重建 (无人穿着)": 10, "上衣": 9, "干净服装 (透明底)": 9,
    "下装": 8, "连衣裙": 8,
    "套装": 7, "品牌文案": 6, "款式描述": 5,
    "价格促销": 4, "面料成分": 3, "饰品/图标": 2,
  };
  for (const tag of (card.tags || [])) {
    if (tagScores[tag] !== undefined) return tagScores[tag];
  }
  return card.cardType === "image" ? 1 : 0;
}

function renderComponentMap(cards) {
  const width = Math.max(state.manifest?.width || state.originalImage?.naturalWidth || 1, 1);
  const height = Math.max(state.manifest?.height || state.originalImage?.naturalHeight || 1, 1);
  return cards
    .map((card) => {
      const bbox = card.bbox || {};
      const isImage = card.cardType === "image";
      const priority = _cardPriority(card);
      const rawLeft = (Number(bbox.x || 0) / width) * 100;
      const rawTop = (Number(bbox.y || 0) / height) * 100;
      const baseWidth = (Number(bbox.width || 0) / width) * 100;
      const extraWidth = isImage ? 10 : 14;
      const priorityBonus = Math.max(0, (priority - 3) * 1.5);
      const cardWidth = Math.max(isImage ? 20 : 24, Math.min(isImage ? 36 : 40, baseWidth + extraWidth + priorityBonus));
      const left = Math.max(1, Math.min(99 - cardWidth, rawLeft));
      const top = Math.max(2, Math.min(isImage ? 72 : 84, rawTop));
      const image = isImage && card.imageUrl ? `<img class="component-thumb" src="${assetUrl(card.imageUrl)}" alt="${escapeHtml(card.title)}">` : "";
      return `
        <button class="component-map-card ${isImage ? "image" : "text"} ${card.id === state.selectedId ? "selected" : ""}" type="button" data-card-id="${escapeHtml(card.id)}" style="left:${left}%;top:${top}%;width:${cardWidth}%">
          ${image}
          <span class="component-kind">${escapeHtml(confidenceText(card.confidence))}</span>
          <strong>${escapeHtml(card.title || card.text)}</strong>
          ${!isImage ? `<p>${escapeHtml(card.text)}</p>` : ""}
          ${componentTagsHtml(card)}
        </button>
      `;
    })
    .join("");
}

function renderOcrResultList(cards) {
  return cards
    .map((card) => {
      const isImage = card.cardType === "image";
      const image = isImage && card.imageUrl ? `<img class="component-thumb" src="${assetUrl(card.imageUrl)}" alt="${escapeHtml(card.title)}">` : "";
      return `
        <button class="ocr-result-card ${card.id === state.selectedId ? "selected" : ""}" type="button" data-card-id="${escapeHtml(card.id)}">
          ${image}
          <div class="ocr-result-meta">
            <span>${escapeHtml(confidenceText(card.confidence))}</span>
            ${card.cardType === "text" ? `<small>${escapeHtml(card.bbox.width)}x${escapeHtml(card.bbox.height)}</small>` : ""}
          </div>
          <strong>${escapeHtml(card.title || card.text)}</strong>
          ${card.cardType === "text" ? `<p>${escapeHtml(card.text)}</p>` : ""}
          ${componentTagsHtml(card)}
        </button>
      `;
    })
    .join("");
}

function renderSelectedComponent(card) {
  if (!card) return "";
  const preview = card.cardType === "image" && card.imageUrl ? `<img class="component-detail-preview" src="${assetUrl(card.imageUrl)}" alt="${escapeHtml(card.title)}">` : "";
  const rows = componentDetailRows(card);
  return `
    <section class="component-detail-panel">
      <div class="component-detail-head">
        <div>
          <span>${escapeHtml(card.cardType === "image" ? "IMAGE" : "COPY")}</span>
          <strong>${escapeHtml(card.title || card.text)}</strong>
        </div>
        <small>${card.bbox.x}, ${card.bbox.y}, ${card.bbox.width}x${card.bbox.height}</small>
      </div>
      ${preview}
      <p>${escapeHtml(card.text)}</p>
      ${componentTagsHtml(card)}
      ${rows ? `<dl class="component-detail-grid">${rows}</dl>` : ""}
      ${card.agentNote ? `<div class="component-agent-note">${escapeHtml(card.agentNote)}</div>` : ""}
    </section>
  `;
}

function renderOcrNode() {
  if (!ocrNode || !ocrNodeBody) return;
  const targetLayer = targetProductLayer();
  const hasSceneAnalysis = Boolean(state.manifest);
  ocrNode.classList.toggle("waiting", !state.sourceUrl);
  ocrNode.classList.toggle("loading", state.ocrLoading);
  ocrNode.classList.toggle("complete", hasSceneAnalysis && !state.ocrLoading);

  if (!state.sourceUrl) {
    ocrNodeBody.innerHTML = `<div class="mind-node-empty">请先上传原图，小画会保留它的背景风格。</div>`;
    return;
  }

  if (state.ocrLoading) {
    ocrNodeBody.innerHTML = `
      <div class="mind-node-loading">
        <span class="loader-dot" aria-hidden="true"></span>
        <strong>正在分析原图产品区域</strong>
        <p>小画正在定位旧产品、修复背景底图，并准备和新产品图对齐。</p>
      </div>
    `;
    return;
  }

  if (hasSceneAnalysis) {
    const cleanBg = state.manifest.layers?.find((layer) => layer.id === "background_clean");
    ocrNodeBody.innerHTML = `
      <div class="ocr-node-summary">原图分析完成，已定位待替换区域</div>
      <div class="product-process-flow">
        <div class="product-step">
          <span class="step-label">待替换产品</span>
          ${targetLayer?.asset_url ? `<img src="${assetUrl(targetLayer.asset_url)}" alt="待替换产品" class="product-step-img" />` : '<div class="step-empty">使用中心区域兜底</div>'}
          ${targetLayer ? `<small>${targetLayer.bbox.x}, ${targetLayer.bbox.y}, ${targetLayer.bbox.width}x${targetLayer.bbox.height}</small>` : ""}
        </div>
        <div class="product-step result">
          <span class="step-label">保留背景风格</span>
          ${cleanBg?.asset_url ? `<img src="${assetUrl(cleanBg.asset_url)}" alt="干净背景" class="product-step-img result" />` : `<img src="${assetUrl(state.sourceUrl)}" alt="原图背景" class="product-step-img result" />`}
        </div>
      </div>
      <div class="component-agent-note">这一步只理解原图：找旧产品位置，并生成用于合成的背景底图。下一步上传产品图后才会替换。</div>
    `;
    ocrNodeBody.scrollTop = 0;
    return;
  }

  ocrNodeBody.innerHTML = `
    <div class="mind-node-empty">原图已上传。继续上传产品图后，小画会开始定位旧产品并完成替换。</div>
  `;
}

async function showOriginal(sourceUrl) {
  const original = await loadImage(sourceUrl);
  state.originalImage = original;
  canvas.width = original.naturalWidth;
  canvas.height = original.naturalHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(original, 0, 0);
  setWorkflowVisible(true);
  setCanvasEmpty(false);
  document.querySelector("#startNode")?.classList.add("complete");
  renderOcrCards();
  setTimeout(() => layoutMindmap(), 80);
}

async function hydrateManifest(manifest, trace = true, ocrCards = []) {
  state.manifest = manifest;
  state.layers = manifest.layers.map((layer) => ({
    ...layer,
    x: layer.bbox.x,
    y: layer.bbox.y,
    visible: layer.visible,
  }));
  state.images.clear();
  for (const layer of state.layers) {
    if (layer.asset_url) {
      state.images.set(layer.id, await loadImage(layer.asset_url));
    }
  }
  if (!state.originalImage && manifest.source_url) {
    await showOriginal(manifest.source_url);
  } else {
    canvas.width = manifest.width;
    canvas.height = manifest.height;
  }
  canvas.width = manifest.width;
  canvas.height = manifest.height;
  state.ocrCards = normalizeOcrCards(ocrCards, manifest);
  state.ocrLoading = false;
  state.workflowStage = state.productUrl ? "complete" : "uploaded";
  state.selectedId = state.ocrCards[0]?.id ?? state.layers.find((layer) => !layer.locked)?.id ?? state.layers[0]?.id ?? null;
  if (trace) {
    addWorkflowOutput(
      "manifest",
      "图层解析结果",
      `生成 ${manifest.layers.length} 个图层，画布尺寸 ${manifest.width}x${manifest.height}。`
    );
    const recognizedTexts = manifest.layers
      .map((layer) => layer?.attributes?.extra?.recognized_text)
      .filter(Boolean);
    if (recognizedTexts.length) {
      addWorkflowOutput("ocr", "OCR 解析文本", recognizedTexts.slice(0, 12).join("\n"));
    }
  }
  render();
  setTimeout(() => layoutMindmap(), 50);
}

function sortedLayers() {
  return [...state.layers].sort((a, b) => a.order - b.order);
}

function confidenceLabel(layer) {
  const value = layer?.attributes?.confidence;
  if (typeof value !== "number") return "unknown";
  return `${Math.round(value * 100)}%`;
}

function renderCanvas() {
  if (!state.manifest && !state.originalImage) {
    setCanvasEmpty(!state.sourceUrl);
    return;
  }
  setCanvasEmpty(false);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state.originalImage) {
    ctx.drawImage(state.originalImage, 0, 0, canvas.width, canvas.height);
    renderOcrCards();
    return;
  }
  for (const layer of sortedLayers()) {
    if (!layer.visible) continue;
    const img = state.images.get(layer.id);
    if (!img) continue;
    ctx.drawImage(img, layer.x, layer.y);
  }
  const selected = state.layers.find((layer) => layer.id === state.selectedId);
  if (selected) {
    ctx.save();
    ctx.strokeStyle = "#3f5f59";
    ctx.lineWidth = Math.max(2, canvas.width / 600);
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(selected.x, selected.y, selected.bbox.width, selected.bbox.height);
    ctx.restore();
  }
  renderOcrCards();
}

function renderLayerList() {
  renderOcrNode();
  if (!layerList) return;
  if (layerList.classList.contains("sr-only")) return;
  layerList.innerHTML = "";
  if (state.ocrLoading) {
    const item = document.createElement("div");
    item.className = "layer-item loading";
    item.innerHTML = `
      <span class="loader-dot" aria-hidden="true"></span>
      <div>
        <div class="layer-name">正在过滤 OCR 组件</div>
        <div class="layer-meta">小画后台处理中，完成后会显示在原图位置。</div>
      </div>
    `;
    layerList.append(item);
    return;
  }
  if (state.ocrCards.length) {
    for (const card of state.ocrCards) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = `layer-item component-card ${card.id === state.selectedId ? "selected" : ""}`;
      item.innerHTML = `
        <div>
          <div class="layer-name">${escapeHtml(card.title || card.text)}</div>
          <div class="layer-meta">${card.bbox.x}, ${card.bbox.y}, ${card.bbox.width}x${card.bbox.height}</div>
          <div class="badge-row">
            <span class="badge">${confidenceText(card.confidence)}</span>
            <span class="badge muted">${card.cardType === "image" ? "图片" : "OCR"}</span>
          </div>
        </div>
      `;
      item.addEventListener("click", () => {
        state.selectedId = card.id;
        renderOcrCards();
        renderLayerList();
      });
      layerList.append(item);
    }
    return;
  }
  if (state.sourceUrl) {
    const empty = document.createElement("div");
    empty.className = "workflow-output empty";
    empty.textContent = "原图已显示，等待 OCR 返回可展示组件。";
    layerList.append(empty);
    return;
  }
  for (const layer of [...state.layers].sort((a, b) => b.order - a.order)) {
    const item = document.createElement("label");
    item.className = `layer-item ${layer.id === state.selectedId ? "selected" : ""}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = layer.visible;
    checkbox.disabled = layer.locked;
    checkbox.addEventListener("change", (event) => {
      event.stopPropagation();
      layer.visible = checkbox.checked;
      render();
    });
    const text = document.createElement("div");
    text.innerHTML = `
      <div class="layer-name">${layer.name}</div>
      <div class="layer-meta">${layer.type} · ${layer.bbox.width}x${layer.bbox.height}</div>
      <div class="badge-row">
        <span class="badge">${confidenceLabel(layer)}</span>
        <span class="badge muted">${layer.locked ? "locked" : "draggable"}</span>
      </div>
    `;
    item.append(checkbox, text);
    item.addEventListener("click", () => {
      state.selectedId = layer.id;
      render();
    });
    layerList.append(item);
  }
}

function renderInspector() {
  if (!inspector || !warningsBox) return;
  const layer = state.layers.find((item) => item.id === state.selectedId);
  if (!state.manifest) {
    inspector.innerHTML = "<dt>项目</dt><dd>-</dd>";
    warningsBox.textContent = "";
    return;
  }
  inspector.innerHTML = `
    <dt>Project</dt><dd>${state.manifest.project_id}</dd>
    <dt>Stage</dt><dd>${state.manifest.stage ?? "-"}</dd>
    <dt>Size</dt><dd>${state.manifest.width} x ${state.manifest.height}</dd>
    <dt>Analyzer</dt><dd>${state.manifest.analyzer_version}</dd>
    <dt>Summary</dt><dd>${state.manifest.summary ?? "-"}</dd>
    <dt>Selected</dt><dd>${layer ? layer.name : "-"}</dd>
    <dt>Type</dt><dd>${layer ? layer.type : "-"}</dd>
    <dt>Confidence</dt><dd>${layer ? confidenceLabel(layer) : "-"}</dd>
    <dt>BBox</dt><dd>${layer ? `${Math.round(layer.x)}, ${Math.round(layer.y)}, ${layer.bbox.width}, ${layer.bbox.height}` : "-"}</dd>
    <dt>Notes</dt><dd>${layer?.attributes?.notes ?? "-"}</dd>
  `;
  warningsBox.innerHTML = (state.manifest.warnings ?? [])
    .map((warning) => `<div>${warning}</div>`)
    .join("");
}

function render() {
  renderCanvas();
  renderLayerList();
  renderInspector();
  renderProductNode();
  renderReconstructNode();
  if (exportButton) exportButton.disabled = !state.manifest;
  if (packageButton) packageButton.disabled = !state.manifest;
}

function pointerToCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function hitTest(point) {
  const layers = [...state.layers].sort((a, b) => b.order - a.order);
  return layers.find((layer) => {
    if (!layer.visible || layer.locked) return false;
    return (
      point.x >= layer.x &&
      point.y >= layer.y &&
      point.x <= layer.x + layer.bbox.width &&
      point.y <= layer.y + layer.bbox.height
    );
  });
}

async function restoreCurrentProject() {
  const projectId = localStorage.getItem(PROJECT_ID_KEY);
  const sourceUrl = localStorage.getItem(PROJECT_SOURCE_KEY);
  const productUrl = localStorage.getItem(PROJECT_PRODUCT_KEY);
  if (!projectId) {
    setStatus("等待上传图片");
    clearCurrentProject();
    return;
  }
  saveCurrentProject(projectId, sourceUrl || `/assets/${projectId}/original.png`);
  if (productUrl) {
    saveCurrentProduct(productUrl);
    state.workflowStage = "productUploaded";
  }
  try {
    if (state.sourceUrl) {
      await showOriginal(state.sourceUrl);
    }
    const manifest = await fetchManifest(projectId);
    await hydrateManifest(manifest, false);
    setStatus(`已恢复项目：${projectId}`);
    addWorkflowOutput("restore", "恢复项目", `已恢复项目 ${projectId} 的图层结果。`);
    if (analyzeButton) analyzeButton.disabled = false;
  } catch {
    if (state.sourceUrl) {
      try {
        await showOriginal(state.sourceUrl);
        setStatus(`已恢复原图：${projectId}`);
        addWorkflowOutput("restore", "恢复原图", `已恢复项目 ${projectId} 的原图，尚未加载图层结果。`, {
          imageUrl: state.sourceUrl,
        });
        if (analyzeButton) analyzeButton.disabled = false;
      } catch {
        clearCurrentProject();
        setStatus("等待上传图片");
      }
    } else {
      clearCurrentProject();
      setStatus("等待上传图片");
    }
  }
}

async function handleImageUpload(file) {
  if (!file) return;
  setStatus("正在上传原图...");
  const result = await uploadFile(file);
  saveCurrentProject(result.project_id, result.source_url);
  saveCurrentProduct(null);
  state.replacement = null;
  state.manifest = null;
  state.layers = [];
  state.images.clear();
  state.ocrCards = [];
  state.ocrLoading = false;
  state.workflowStage = "uploaded";
  if (analyzeButton) analyzeButton.disabled = false;
  if (exportButton) exportButton.disabled = true;
  if (packageButton) packageButton.disabled = true;
  await showOriginal(result.source_url);
  renderLayerList();
  renderInspector();
  setStatus(`已上传原图：${result.project_id}`);
  addWorkflowOutput("input", "上传原图", `创建项目 ${result.project_id}，原图将作为背景风格来源。`, {
    imageUrl: result.source_url,
  });
  addWorkflowOutput("process", "等待产品图", "继续上传产品图后，小画会定位旧产品并生成替换结果。");
  render();
}

async function handleProductUpload(file) {
  if (!file) return;
  if (!state.projectId) throw new Error("请先上传原图。");
  setStatus("正在上传产品图...");
  const uploaded = await uploadProductFile(state.projectId, file);
  saveCurrentProduct(uploaded.product_url);
  state.replacement = null;
  state.workflowStage = "productUploaded";
  addWorkflowOutput("input", "上传产品图", "新产品图已进入替换工作流。", {
    imageUrl: uploaded.product_url,
  });
  setStatus("正在生成替换结果...");
  setOcrLoading(true);
  state.workflowStage = "analyzing";
  try {
    const composed = await composeReplacementProject(state.projectId);
    state.replacement = composed.replacement;
    const manifest = await fetchManifest(state.projectId);
    await hydrateManifest(manifest, false, []);
    state.workflowStage = "complete";
    setStatus("替换结果已生成");
    addWorkflowOutput("result", "替换结果", "已保留原图背景风格，并将新产品合成到旧产品位置。", {
      imageUrl: state.replacement?.result_url,
    });
  } finally {
    setOcrLoading(false);
    setTimeout(() => layoutMindmap(), 60);
  }
}

fileInput?.addEventListener("change", async () => {
  try {
    await handleImageUpload(fileInput.files?.[0]);
  } catch (error) {
    setStatus(`上传失败：${error.message}`);
  } finally {
    fileInput.value = "";
  }
});

analyzeButton?.addEventListener("click", async () => {
  if (!state.projectId) return;
  try {
    if (analyzeButton) analyzeButton.disabled = true;
    setStatus("正在解析图层...");
    setOcrLoading(true);
    const result = await analyzeProject(state.projectId);
    await hydrateManifest(result.manifest);
    setStatus(`解析完成：${result.manifest.layers.length} 个图层`);
    window.dispatchEvent(new CustomEvent("imagelayer:manifest-ready", { detail: { projectId: state.projectId } }));
  } catch (error) {
    setOcrLoading(false);
    setStatus(`解析失败：${error.message}`);
  } finally {
    if (analyzeButton) analyzeButton.disabled = false;
  }
});

exportButton?.addEventListener("click", () => {
  if (!state.manifest) return;
  const link = document.createElement("a");
  link.download = `imagelayeragent-${state.manifest.project_id}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  addWorkflowOutput("export", "导出预览", "已从当前画布导出 PNG 预览。");
});

packageButton?.addEventListener("click", () => {
  if (!state.manifest) return;
  addWorkflowOutput("package", "下载图层包", "已触发图层包下载，包含图层、mask、manifest 和报告文件。");
  window.location.href = `/api/projects/${state.manifest.project_id}/package`;
});

const DRAG_THRESHOLD = 5;

canvas.addEventListener("pointerdown", (event) => {
  if (!state.manifest) return;
  const point = pointerToCanvas(event);
  const hit = hitTest(point);
  if (hit) state.selectedId = hit.id;
  const layer = state.layers.find((item) => item.id === state.selectedId);
  if (!layer || layer.locked) {
    render();
    return;
  }
  state.dragging = false;
  state.dragStart = {
    pointer: point,
    layerX: layer.x,
    layerY: layer.y,
  };
  canvas.setPointerCapture(event.pointerId);
  render();
});

canvas.addEventListener("pointermove", (event) => {
  if (!state.dragStart) return;
  const layer = state.layers.find((item) => item.id === state.selectedId);
  if (!layer || layer.locked) return;
  const point = pointerToCanvas(event);
  const dx = point.x - state.dragStart.pointer.x;
  const dy = point.y - state.dragStart.pointer.y;
  if (!state.dragging && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
  if (!state.dragging) state.dragging = true;
  layer.x = Math.round(state.dragStart.layerX + dx);
  layer.y = Math.round(state.dragStart.layerY + dy);
  render();
});

canvas.addEventListener("pointerup", (event) => {
  const wasDragging = state.dragging;
  state.dragging = false;
  state.dragStart = null;
  try { canvas.releasePointerCapture(event.pointerId); } catch { /* ok */ }
  if (!wasDragging) render();
});

mindmapViewport?.addEventListener("pointerdown", (event) => {
  if (event.target.closest?.(".mind-node, .mindmap-toolbar, .agent-chat, button, a, input")) return;
  state.mindmap.panning = true;
  state.mindmap.startX = event.clientX;
  state.mindmap.startY = event.clientY;
  state.mindmap.originX = state.mindmap.x;
  state.mindmap.originY = state.mindmap.y;
  mindmapViewport.setPointerCapture(event.pointerId);
  mindmapViewport.classList.add("panning");
});

mindmapViewport?.addEventListener("pointermove", (event) => {
  if (!state.mindmap.panning) return;
  state.mindmap.x = state.mindmap.originX + event.clientX - state.mindmap.startX;
  state.mindmap.y = state.mindmap.originY + event.clientY - state.mindmap.startY;
  applyMindmapTransform();
});

mindmapViewport?.addEventListener("pointerup", (event) => {
  state.mindmap.panning = false;
  mindmapViewport.classList.remove("panning");
  try {
    mindmapViewport.releasePointerCapture(event.pointerId);
  } catch {
    // Pointer capture may already have been released.
  }
});

mindmapViewport?.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    const rect = mindmapViewport.getBoundingClientRect();
    const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const factor = event.deltaY > 0 ? 0.92 : 1.08;
    setMindmapScale(state.mindmap.scale * factor, anchor);
  },
  { passive: false }
);

zoomOutButton?.addEventListener("click", () => setMindmapScale(state.mindmap.scale - 0.12));
zoomInButton?.addEventListener("click", () => setMindmapScale(state.mindmap.scale + 0.12));
zoomResetButton?.addEventListener("click", centerMindmap);

window.addEventListener("resize", () => { renderCanvas(); layoutMindmap(); });

window.addEventListener("imagelayer:agent-workflow-complete", async (event) => {
  const result = event.detail;
  if (!result?.manifest || result.project_id !== state.projectId) return;
  await hydrateManifest(result.manifest, true, result.ocr_cards || []);
  setStatus(`小画工作流完成：${result.manifest.layers.length} 个图层`);
  addWorkflowOutput("agent", "小画工作流", result.reply || "小画已完成当前项目工作流。");
});

window.addEventListener("imagelayer:agent-workflow-failed", (event) => {
  if (event.detail?.projectId && event.detail.projectId !== state.projectId) return;
  setOcrLoading(false);
  addWorkflowOutput("agent", "小画工作流失败", event.detail?.message || "小画后台处理失败。");
});

window.addEventListener("imagelayer:agent-message", (event) => {
  const { role, content, projectId } = event.detail || {};
  if (projectId && state.projectId && projectId !== state.projectId) return;
  if (role === "assistant" && content) {
    addWorkflowOutput("agent", "小画回复", content);
  }
});

applyMindmapTransform();
renderOcrNode();
setTimeout(() => layoutMindmap(), 100);

fetchProviderStatus()
  .then(renderProviderStatus)
  .catch((error) => {
    if (providerStatusBox) {
      providerStatusBox.textContent = `Provider status unavailable: ${error.message}`;
    }
  });

restoreCurrentProject().catch((error) => {
  setStatus(`恢复项目失败：${error.message}`);
});

window.ImageLayerApp = {
  uploadImage: handleImageUpload,
  uploadProduct: handleProductUpload,
  hasImage: () => Boolean(state.projectId || state.sourceUrl),
  hasProduct: () => Boolean(state.productUrl),
};
