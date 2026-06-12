const solutions = [
  {
    id: "reality-curtain",
    title: "手势识别 · Reality Curtain",
    category: "手势识别",
    icon: "G",
    model: "gesture",
    summary: "参考 LootAI「hide the ocean inside reality」：用捏合手势或鼠标拖拽一块物理幕布，把摄像头现实层拉开，露出隐藏的海洋影像。",
  },
  {
    id: "face-lip-fx",
    title: "面部识别 · Lip FX",
    category: "面部识别",
    icon: "LIP",
    model: "faceLandmarker",
    summary: "识别人脸网格与 blendshape，捕捉张嘴、微笑、嘟嘴、漏斗嘴等嘴唇动作，并叠加声波、唇线、粒子与霓虹光效。",
  },
];

const MODEL_FILES = {
  gesture: "gesture_recognizer.task",
  faceLandmarker: "face_landmarker.task",
};

const REMOTE_MODEL_BASE = "https://storage.googleapis.com/mediapipe-models";
const REMOTE_MODEL_PATHS = {
  gesture: "/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
  faceLandmarker: "/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
};

const CURTAIN_DEFAULT_POSTER = "assets/lootai/curtain-cover.jpg";
const CURTAIN_DEFAULT_VIDEO = "assets/lootai/curtain-showcase.mp4";

const state = {
  active: solutions[0],
  stream: null,
  vision: null,
  task: null,
  raf: 0,
  faceParticles: [],
  curtain: {
    p5: null,
    cloth: null,
    latestResult: null,
    media: null,
    mediaUrl: "",
    defaultMedia: null,
    pointer: { active: false, node: null, x: 0, y: 0 },
    hand: { node: null },
    particles: [],
    lastSize: "",
  },
};

const els = {
  nav: document.querySelector("#solutionNav"),
  title: document.querySelector("#solutionTitle"),
  summary: document.querySelector("#solutionSummary"),
  status: document.querySelector("#statusText"),
  badge: document.querySelector("#runtimeBadge"),
  startCamera: document.querySelector("#startCamera"),
  stopCamera: document.querySelector("#stopCamera"),
  video: document.querySelector("#camera"),
  canvas: document.querySelector("#overlay"),
  stage: document.querySelector("#stage"),
  fallback: document.querySelector("#fallbackScene"),
  controls: document.querySelector("#controlMount"),
  output: document.querySelector("#outputMount"),
};

function init() {
  renderNav();
  selectSolution(solutions[0].id);
  els.startCamera.addEventListener("click", startCamera);
  els.stopCamera.addEventListener("click", stopCamera);
  els.stage.addEventListener("pointerdown", handleCurtainPointerDown);
  els.stage.addEventListener("pointermove", handleCurtainPointerMove);
  window.addEventListener("pointerup", handleCurtainPointerUp);
  window.addEventListener("pointercancel", handleCurtainPointerUp);
  window.addEventListener("resize", () => {
    if (state.active.model === "gesture") startCurtainSketch();
    else paintFaceFallback();
  });
}

function renderNav() {
  els.nav.innerHTML = solutions.map((item) => `
    <button class="nav-button" type="button" data-id="${item.id}">
      <span class="nav-icon">${item.icon}</span>
      <span>
        <span class="nav-title">${item.title}</span>
        <span class="nav-meta">${item.category}</span>
      </span>
    </button>
  `).join("");
  els.nav.addEventListener("click", (event) => {
    const button = event.target.closest(".nav-button");
    if (button) selectSolution(button.dataset.id);
  });
}

async function selectSolution(id) {
  const selected = solutions.find((item) => item.id === id);
  if (!selected) return;
  stopLoop();
  state.active = selected;
  state.task = null;
  state.faceParticles = [];
  els.title.textContent = selected.title;
  els.summary.textContent = selected.summary;
  els.badge.textContent = selected.category;
  els.status.textContent = "准备就绪";
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.id === id);
  });
  renderControls();
  renderOutput([]);
  if (selected.model === "gesture") {
    els.video.classList.remove("active");
    startCurtainSketch();
  } else {
    stopCurtainSketch();
    els.video.classList.toggle("active", Boolean(state.stream));
    paintFaceFallback();
  }
  if (state.stream) await startTaskForActive();
}

function renderControls() {
  if (state.active.model === "gesture") {
    els.controls.innerHTML = `
      <div class="control-row">
        <button class="small-button" type="button" data-action="camera">启动摄像头</button>
        <button class="small-button" type="button" data-action="sample">离线预览</button>
      </div>
      <div class="control-row">
        <label class="small-button" for="curtainMediaInput">上传隐藏媒体</label>
        <input id="curtainMediaInput" type="file" accept="image/*,video/*" hidden />
        <button class="small-button" type="button" data-action="curtain-reset">重置幕布</button>
      </div>
      <p class="note">捏合拇指和食指拖动幕布，向上甩开即可露出下层媒体。没有摄像头时也可以用鼠标或触屏拖拽。</p>
    `;
    els.controls.querySelector("#curtainMediaInput").addEventListener("change", handleCurtainMedia);
  } else {
    els.controls.innerHTML = `
      <div class="control-row">
        <button class="small-button" type="button" data-action="camera">启动摄像头</button>
        <button class="small-button" type="button" data-action="sample">离线预览</button>
      </div>
      <p class="note">张嘴扩散声波，微笑拉出彩色光带，嘟嘴喷出唇形粒子，漏斗嘴生成旋涡。</p>
    `;
  }
  els.controls.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });
}

function handleAction(action) {
  if (action === "camera") startCamera();
  if (action === "sample") {
    if (state.active.model === "gesture") {
      resetCurtain();
      startCurtainSketch();
    } else {
      paintFaceFallback();
    }
  }
  if (action === "curtain-reset") resetCurtain();
}

async function startCamera() {
  if (!state.stream) {
    try {
      state.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: false,
      });
      els.video.srcObject = state.stream;
      await els.video.play();
      els.status.textContent = "摄像头已启动";
      els.fallback.style.display = "none";
    } catch (error) {
      console.warn(error);
      els.status.textContent = "无法启动摄像头，已显示离线预览";
      if (state.active.model === "faceLandmarker") paintFaceFallback();
      return;
    }
  }
  els.video.classList.toggle("active", state.active.model === "faceLandmarker");
  await startTaskForActive();
}

function stopCamera() {
  stopLoop();
  if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
  state.stream = null;
  state.task = null;
  els.video.srcObject = null;
  els.video.classList.remove("active");
  els.status.textContent = "摄像头已停止";
  if (state.active.model === "gesture") startCurtainSketch();
  else paintFaceFallback();
}

function stopLoop() {
  if (state.raf) cancelAnimationFrame(state.raf);
  state.raf = 0;
}

async function loadVision() {
  if (state.vision) return state.vision;
  els.status.textContent = "正在加载 MediaPipe WASM";
  try {
    const vision = await import("./wasm/vision_bundle.mjs");
    const resolver = await vision.FilesetResolver.forVisionTasks(new URL("wasm/", window.location.href).href);
    state.vision = { ...vision, resolver };
    return state.vision;
  } catch (localError) {
    console.warn("本地 WASM 加载失败，尝试 CDN", localError);
  }
  const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35");
  const resolver = await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm");
  state.vision = { ...vision, resolver };
  return state.vision;
}

async function startTaskForActive() {
  if (!state.stream) return;
  stopLoop();
  try {
    const vision = await loadVision();
    state.task = await createTask(vision, state.active.model);
    els.status.textContent = "实时运行中";
    loopVision();
  } catch (error) {
    console.warn(error);
    els.status.textContent = "模型加载失败，已显示离线预览";
    if (state.active.model === "faceLandmarker") paintFaceFallback();
  }
}

async function createTask(vision, key) {
  const { local, remote } = getModelUrl(key);
  try {
    return await tryCreateTask(vision, key, { modelAssetPath: local, delegate: "GPU" });
  } catch (gpuLocalError) {
    try {
      return await tryCreateTask(vision, key, { modelAssetPath: local, delegate: "CPU" });
    } catch (cpuLocalError) {
      console.warn("本地模型加载失败，尝试远程模型", gpuLocalError, cpuLocalError);
    }
  }
  try {
    return await tryCreateTask(vision, key, { modelAssetPath: remote, delegate: "GPU" });
  } catch (gpuRemoteError) {
    return await tryCreateTask(vision, key, { modelAssetPath: remote, delegate: "CPU" });
  }
}

async function tryCreateTask(vision, key, baseOptions) {
  const options = { baseOptions, runningMode: "VIDEO" };
  if (key === "gesture") {
    return await vision.GestureRecognizer.createFromOptions(vision.resolver, { ...options, numHands: 2 });
  }
  if (key === "faceLandmarker") {
    return await vision.FaceLandmarker.createFromOptions(vision.resolver, {
      ...options,
      numFaces: 1,
      outputFaceBlendshapes: true,
    });
  }
  throw new Error(`Unsupported model: ${key}`);
}

function getModelUrl(key) {
  return {
    local: `models/${MODEL_FILES[key]}`,
    remote: REMOTE_MODEL_BASE + REMOTE_MODEL_PATHS[key],
  };
}

function loopVision() {
  if (!state.task || !state.stream) return;
  const now = performance.now();
  try {
    if (state.active.model === "gesture") {
      const result = state.task.recognizeForVideo(els.video, now);
      state.curtain.latestResult = result;
    } else {
      const result = state.task.detectForVideo(els.video, now);
      drawFaceResult(result);
    }
  } catch (error) {
    console.warn(error);
  }
  state.raf = requestAnimationFrame(loopVision);
}

function canvasContext() {
  const rect = els.stage.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  els.canvas.width = Math.max(1, Math.round(rect.width * dpr));
  els.canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = els.canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  return { ctx, width: rect.width, height: rect.height };
}

function startCurtainSketch() {
  const curtain = state.curtain;
  if (curtain.p5) return;
  if (!window.p5) {
    els.status.textContent = "p5.js 未加载";
    return;
  }
  ensureCurtainDefaultMedia();
  els.fallback.style.display = "none";
  els.fallback.innerHTML = "";
  els.video.classList.remove("active");
  canvasContext();

  curtain.p5 = new window.p5((p) => {
    p.setup = () => {
      const rect = els.stage.getBoundingClientRect();
      const canvas = p.createCanvas(Math.max(1, rect.width), Math.max(1, rect.height));
      canvas.parent(els.stage);
      canvas.addClass("p5-curtain-canvas");
      p.pixelDensity(window.devicePixelRatio || 1);
      initCurtainCloth(p.width, p.height, true);
    };
    p.draw = () => renderRealityCurtain(p);
    p.windowResized = () => {
      const rect = els.stage.getBoundingClientRect();
      p.resizeCanvas(Math.max(1, rect.width), Math.max(1, rect.height));
      initCurtainCloth(p.width, p.height, true);
    };
  });
}

function stopCurtainSketch() {
  const curtain = state.curtain;
  if (curtain.p5) {
    curtain.p5.remove();
    curtain.p5 = null;
  }
  curtain.latestResult = null;
  const { ctx, width, height } = canvasContext();
  ctx.clearRect(0, 0, width, height);
}

function ensureCurtainDefaultMedia() {
  const curtain = state.curtain;
  if (curtain.defaultMedia) return;

  const fallbackImage = () => {
    const img = new Image();
    img.src = CURTAIN_DEFAULT_POSTER;
    curtain.defaultMedia = { type: "image", el: img };
  };

  const video = document.createElement("video");
  video.src = CURTAIN_DEFAULT_VIDEO;
  video.poster = CURTAIN_DEFAULT_POSTER;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.onloadeddata = () => video.play().catch(() => {});
  video.onerror = fallbackImage;
  curtain.defaultMedia = { type: "video", el: video };
  video.load();
}

function resetCurtain() {
  const rect = els.stage.getBoundingClientRect();
  initCurtainCloth(Math.max(1, rect.width), Math.max(1, rect.height), true);
}

function initCurtainCloth(width, height, force = false) {
  const curtain = state.curtain;
  const sizeKey = `${Math.round(width)}x${Math.round(height)}`;
  if (!force && curtain.cloth && curtain.lastSize === sizeKey) return curtain.cloth;

  const cols = 38;
  const rows = 35;
  const clothW = width * 0.72;
  const clothH = height * 0.56;
  const baseX = (width - clothW) / 2;
  const baseY = Math.max(58, height * 0.16);
  const spacingX = clothW / (cols - 1);
  const spacingY = clothH / (rows - 1);
  const points = [];
  const sticks = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = baseX + x * spacingX;
      const py = baseY + y * spacingY;
      points.push({
        x: px,
        y: py,
        oldX: px,
        oldY: py,
        homeX: px,
        homeY: py,
        pinned: y === 0,
        jitter: 0,
      });
    }
  }

  const addStick = (a, b) => {
    const p1 = points[a];
    const p2 = points[b];
    sticks.push({ p1, p2, len: Math.hypot(p2.x - p1.x, p2.y - p1.y) });
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (x < cols - 1) addStick(i, i + 1);
      if (y < rows - 1) addStick(i, i + cols);
    }
  }

  curtain.cloth = {
    cols,
    rows,
    points,
    sticks,
    baseX,
    baseY,
    width: clothW,
    height: clothH,
    spacingX,
    spacingY,
    thrown: false,
    revealed: false,
    recovering: false,
  };
  curtain.pointer = { active: false, node: null, x: 0, y: 0 };
  curtain.hand = { node: null };
  curtain.particles = [];
  curtain.lastSize = sizeKey;
  return curtain.cloth;
}

function renderRealityCurtain(p) {
  const width = p.width;
  const height = p.height;
  const curtain = state.curtain;
  const cloth = initCurtainCloth(width, height);
  const handGrab = getCurtainHandGrab(curtain.latestResult || {}, width, height);
  const ctx = p.drawingContext;

  updateCurtainPhysics(cloth, handGrab, width, height);
  drawRealityBase(ctx, width, height);

  ctx.save();
  ctx.beginPath();
  ctx.rect(cloth.baseX, cloth.baseY, cloth.width, cloth.height);
  ctx.clip();
  drawHiddenLayer(ctx, width, height, curtain.media || curtain.defaultMedia);
  ctx.restore();

  if (!cloth.revealed) {
    const perimeter = getCurtainPerimeter(cloth);
    ctx.save();
    ctx.beginPath();
    perimeter.forEach((node, index) => {
      if (index === 0) ctx.moveTo(node.x, node.y);
      else ctx.lineTo(node.x, node.y);
    });
    ctx.closePath();
    ctx.clip();
    drawRealityBase(ctx, width, height);
    ctx.restore();
    drawCurtainShading(ctx, cloth);
    drawCurtainEdge(ctx, perimeter);
  }

  if (handGrab.pinching || cloth.thrown || cloth.recovering) drawCurtainParticles(ctx, curtain.particles);
  drawGrabHint(p, handGrab);

  if (p.frameCount % 12 === 0) {
    renderOutput([
      { label: handGrab.pinching ? "gesture active" : "waiting gesture", value: handGrab.pinching ? 100 : 0 },
      { label: cloth.revealed ? "revealed" : "curtain", value: cloth.revealed ? 100 : 72 },
    ]);
  }
}

function drawRealityBase(ctx, width, height) {
  if (els.video.videoWidth) {
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    drawCoverElement(ctx, els.video, els.video.videoWidth, els.video.videoHeight, 0, 0, width, height);
    ctx.restore();
    return;
  }

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#171f25");
  grad.addColorStop(1, "#2c343a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "700 18px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("启动摄像头后，这里会成为实时现实层", width / 2, height * 0.55);
  ctx.textAlign = "start";
}

function drawHiddenLayer(ctx, width, height, media) {
  if (media?.el) {
    const sourceW = media.el.videoWidth || media.el.naturalWidth;
    const sourceH = media.el.videoHeight || media.el.naturalHeight;
    if (sourceW && sourceH) {
      drawCoverElement(ctx, media.el, sourceW, sourceH, 0, 0, width, height);
      return;
    }
  }

  const t = performance.now() * 0.001;
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#00111f");
  grad.addColorStop(0.42, "#00667d");
  grad.addColorStop(1, "#c2fff3");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    const y = height * (0.2 + i * 0.06);
    ctx.moveTo(0, y);
    for (let x = 0; x <= width + 24; x += 18) {
      ctx.lineTo(x, y + Math.sin(x * 0.018 + t * (1.2 + i * 0.08) + i) * (7 + i * 0.7));
    }
    ctx.strokeStyle = `rgba(230,255,255,${0.24 - i * 0.012})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();
}

function drawCoverElement(ctx, el, sourceW, sourceH, x, y, w, h) {
  const sourceRatio = sourceW / sourceH;
  const targetRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = sourceW;
  let sh = sourceH;
  if (sourceRatio > targetRatio) {
    sw = sourceH * targetRatio;
    sx = (sourceW - sw) / 2;
  } else {
    sh = sourceW / targetRatio;
    sy = (sourceH - sh) / 2;
  }
  ctx.drawImage(el, sx, sy, sw, sh, x, y, w, h);
}

function getCurtainHandGrab(result, width, height) {
  const landmarks = result.landmarks?.[0];
  if (!landmarks) return { pinching: false, x: 0, y: 0 };
  const thumb = landmarks[4];
  const index = landmarks[8];
  if (!thumb || !index) return { pinching: false, x: 0, y: 0 };
  const distance = Math.hypot(index.x - thumb.x, index.y - thumb.y);
  return {
    present: true,
    pinching: distance < 0.065,
    x: width - ((thumb.x + index.x) * 0.5 * width),
    y: (thumb.y + index.y) * 0.5 * height,
  };
}

function updateCurtainPhysics(cloth, handGrab, width, height) {
  const curtain = state.curtain;
  const pointer = curtain.pointer;
  const hand = curtain.hand;
  const grabRadius = Math.min(width, height) * 0.18;
  const recoveryZone = height * 0.42;
  const pointerEnabled = !state.stream;

  if (cloth.revealed && !cloth.recovering) {
    if (pointerEnabled && pointer.active && pointer.y < recoveryZone) beginCurtainRecovery(cloth, pointer.x, pointer.y, height);
    if (handGrab.pinching && handGrab.y < recoveryZone) beginCurtainRecovery(cloth, handGrab.x, handGrab.y, height);
  }

  if (pointerEnabled && pointer.active && !pointer.node) {
    pointer.node = cloth.recovering
      ? findNearestCurtainNode(cloth, pointer.x, pointer.y, Math.max(grabRadius, cloth.width))
      : findNearestCurtainNode(cloth, pointer.x, pointer.y, grabRadius);
  }
  if (!pointerEnabled || !pointer.active) pointer.node = null;
  if (handGrab.pinching && !hand.node) {
    hand.node = cloth.recovering
      ? findNearestCurtainNode(cloth, handGrab.x, handGrab.y, Math.max(grabRadius, cloth.width))
      : findNearestCurtainNode(cloth, handGrab.x, handGrab.y, grabRadius);
  }
  if (!handGrab.pinching) hand.node = null;

  const grabbed = new Set();
  if (pointer.node) {
    pinCurtainNode(pointer.node, pointer.x, pointer.y);
    grabbed.add(pointer.node);
  }
  if (hand.node && !grabbed.has(hand.node)) {
    pinCurtainNode(hand.node, handGrab.x, handGrab.y);
    grabbed.add(hand.node);
  }

  for (const node of grabbed) {
    if (!cloth.recovering && node.y < cloth.baseY - height * 0.08) cloth.thrown = true;
  }

  let offscreen = cloth.thrown;
  for (const point of cloth.points) {
    if (cloth.thrown || cloth.recovering) point.pinned = false;
    if (!point.pinned && !grabbed.has(point)) {
      if (!cloth.thrown && !cloth.recovering) {
        point.oldX = point.homeX;
        point.oldY = point.homeY;
        point.x = point.homeX;
        point.y = point.homeY;
        continue;
      }
      const vx = (point.x - point.oldX) * 0.94;
      const vy = (point.y - point.oldY) * 0.94;
      const targetX = point.homeX;
      const targetY = cloth.thrown ? -height * 0.82 : point.homeY;
      const restore = cloth.thrown ? 0.11 : cloth.recovering ? 0.055 : 0.002;
      point.oldX = point.x;
      point.oldY = point.y;
      point.x += vx + (targetX - point.x) * restore;
      point.y += vy + (targetY - point.y) * restore + (cloth.thrown ? 0 : 0.08);
    }
    if (point.y > -60) offscreen = false;
  }

  for (let i = 0; i < 9; i++) {
    for (const stick of cloth.sticks) {
      const dx = stick.p2.x - stick.p1.x;
      const dy = stick.p2.y - stick.p1.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const diff = (stick.len - dist) / dist * 0.5;
      const ox = dx * diff * 0.62;
      const oy = dy * diff * 0.62;
      if (!stick.p1.pinned && !grabbed.has(stick.p1)) {
        stick.p1.x -= ox;
        stick.p1.y -= oy;
      }
      if (!stick.p2.pinned && !grabbed.has(stick.p2)) {
        stick.p2.x += ox;
        stick.p2.y += oy;
      }
    }
  }

  if (offscreen && !cloth.revealed) {
    cloth.revealed = true;
    cloth.recovering = false;
    spawnCurtainRevealParticles(cloth);
  }

  if (cloth.recovering && isCurtainRecovered(cloth, grabbed)) {
    settleCurtainAtHome(cloth);
  }
}

function beginCurtainRecovery(cloth, x, y, height) {
  const lift = cloth.height + height * 0.22;
  cloth.thrown = false;
  cloth.revealed = false;
  cloth.recovering = true;
  for (const point of cloth.points) {
    point.pinned = false;
    point.x = point.homeX;
    point.y = point.homeY - lift;
    point.oldX = point.x;
    point.oldY = point.y - 8;
  }
  state.curtain.pointer.node = null;
  state.curtain.hand.node = null;

  const firstNode = findNearestCurtainNode(cloth, x, y, Math.max(cloth.width, cloth.height));
  if (firstNode) pinCurtainNode(firstNode, x, y);
}

function isCurtainRecovered(cloth, grabbed) {
  const pulledEnough = [...grabbed].some((node) => node.y > cloth.baseY + cloth.height * 0.44);
  if (pulledEnough) return true;

  let averageOffset = 0;
  for (const point of cloth.points) averageOffset += Math.abs(point.y - point.homeY);
  averageOffset /= cloth.points.length;
  return averageOffset < cloth.spacingY * 1.35;
}

function settleCurtainAtHome(cloth) {
  cloth.thrown = false;
  cloth.revealed = false;
  cloth.recovering = false;
  for (let i = 0; i < cloth.points.length; i++) {
    const point = cloth.points[i];
    const row = Math.floor(i / cloth.cols);
    point.x = point.homeX;
    point.y = point.homeY;
    point.oldX = point.homeX;
    point.oldY = point.homeY;
    point.pinned = row === 0;
  }
}

function findNearestCurtainNode(cloth, x, y, radius) {
  let nearest = null;
  let best = radius * radius;
  for (const point of cloth.points) {
    if (point.pinned) continue;
    const d = (point.x - x) ** 2 + (point.y - y) ** 2;
    if (d < best) {
      best = d;
      nearest = point;
    }
  }
  return nearest;
}

function pinCurtainNode(node, x, y) {
  node.oldX = node.x;
  node.oldY = node.y;
  node.x = x;
  node.y = y;
}

function getCurtainPerimeter(cloth) {
  const outline = [];
  for (let x = 0; x < cloth.cols; x++) outline.push(cloth.points[x]);
  for (let y = 1; y < cloth.rows; y++) outline.push(cloth.points[y * cloth.cols + cloth.cols - 1]);
  for (let x = cloth.cols - 2; x >= 0; x--) outline.push(cloth.points[(cloth.rows - 1) * cloth.cols + x]);
  for (let y = cloth.rows - 2; y > 0; y--) outline.push(cloth.points[y * cloth.cols]);
  return outline;
}

function drawCurtainShading(ctx, cloth) {
  const baseArea = cloth.spacingX * cloth.spacingY;
  for (let y = 0; y < cloth.rows - 1; y++) {
    for (let x = 0; x < cloth.cols - 1; x++) {
      const p1 = cloth.points[y * cloth.cols + x];
      const p2 = cloth.points[y * cloth.cols + x + 1];
      const p3 = cloth.points[(y + 1) * cloth.cols + x + 1];
      const p4 = cloth.points[(y + 1) * cloth.cols + x];
      const area = Math.abs((p2.x - p1.x) * (p4.y - p1.y) - (p4.x - p1.x) * (p2.y - p1.y));
      const ratio = area / baseArea;
      if (ratio < 0.94 || ratio > 1.08) {
        const alpha = ratio < 0.94 ? Math.min(0.09, (0.94 - ratio) * 0.28) : Math.min(0.06, (ratio - 1.08) * 0.16);
        ctx.fillStyle = ratio < 0.94 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

function drawCurtainEdge(ctx, perimeter) {
  if (!perimeter.length) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < perimeter.length + 3; i++) {
    const point = perimeter[i % perimeter.length];
    if (i === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.shadowColor = "rgba(215,255,255,0.28)";
  ctx.shadowBlur = 5;
  ctx.strokeStyle = "rgba(255,255,255,0.34)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function spawnCurtainRevealParticles(cloth) {
  const particles = state.curtain.particles;
  for (let i = 0; i < 34; i++) {
    particles.push({
      x: cloth.baseX + Math.random() * cloth.width,
      y: cloth.baseY + Math.random() * cloth.height,
      vx: (Math.random() - 0.5) * 5,
      vy: -2 - Math.random() * 5,
      size: 1.5 + Math.random() * 3.5,
      life: 32 + Math.random() * 28,
      maxLife: 60,
    });
  }
}

function drawCurtainParticles(ctx, particles) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const point = particles[i];
    point.x += point.vx;
    point.y += point.vy;
    point.vy += 0.16;
    point.life -= 1;
    if (point.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    const alpha = Math.max(0, point.life / point.maxLife);
    ctx.fillStyle = `rgba(218,252,255,${alpha * 0.55})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrabHint(p, handGrab) {
  if (!handGrab.pinching) return;
  p.push();
  p.noFill();
  p.stroke(224, 254, 255, 150);
  p.strokeWeight(1.5);
  p.circle(handGrab.x, handGrab.y, 28);
  p.pop();
}

function handleCurtainMedia(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const curtain = state.curtain;
  if (curtain.mediaUrl) URL.revokeObjectURL(curtain.mediaUrl);
  const url = URL.createObjectURL(file);
  if (file.type.startsWith("video/")) {
    const video = document.createElement("video");
    video.src = url;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => video.play().catch(() => {});
    curtain.media = { type: "video", el: video };
  } else {
    const img = new Image();
    img.src = url;
    curtain.media = { type: "image", el: img };
  }
  curtain.mediaUrl = url;
  resetCurtain();
}

function handleCurtainPointerDown(event) {
  if (state.active.model !== "gesture") return;
  const pointer = state.curtain.pointer;
  const rect = els.stage.getBoundingClientRect();
  pointer.active = true;
  pointer.node = null;
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  els.stage.setPointerCapture?.(event.pointerId);
}

function handleCurtainPointerMove(event) {
  if (state.active.model !== "gesture") return;
  const pointer = state.curtain.pointer;
  if (!pointer.active) return;
  const rect = els.stage.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
}

function handleCurtainPointerUp() {
  const pointer = state.curtain.pointer;
  pointer.active = false;
  pointer.node = null;
}

function drawFaceResult(result) {
  const { ctx, width, height } = canvasContext();
  drawMirroredVideo(ctx, width, height);
  const landmarks = result.faceLandmarks || [];
  drawFaceLandmarks(ctx, width, height, landmarks);
  renderDandelionFx(ctx, width, height, result);
}

function drawMirroredVideo(ctx, width, height) {
  if (!els.video.videoWidth) return;
  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  drawCoverElement(ctx, els.video, els.video.videoWidth, els.video.videoHeight, 0, 0, width, height);
  ctx.restore();
}

function drawFaceLandmarks(ctx, width, height, groups) {
  ctx.fillStyle = "rgba(111, 213, 255, 0.55)";
  for (const landmarks of groups) {
    for (let i = 0; i < landmarks.length; i += 4) {
      const point = landmarks[i];
      ctx.beginPath();
      ctx.arc(width - point.x * width, point.y * height, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function getBlendshape(result, name) {
  const categories = result.faceBlendshapes?.[0]?.categories;
  if (!categories) return 0;
  return categories.find((item) => item.categoryName === name)?.score || 0;
}

function renderDandelionFx(ctx, width, height, result) {
  const jawOpen = getBlendshape(result, "jawOpen");
  const pucker = getBlendshape(result, "mouthPucker");
  const funnel = getBlendshape(result, "mouthFunnel");
  const face = result.faceLandmarks?.[0] || [];
  const upperLip = face[13] || face[0];
  const lowerLip = face[14] || face[17] || upperLip;
  const leftMouth = face[61] || upperLip;
  const rightMouth = face[291] || upperLip;
  const mouthX = upperLip ? width - ((upperLip.x + lowerLip.x + leftMouth.x + rightMouth.x) / 4 * width) : width * 0.72;
  const mouthY = upperLip ? ((upperLip.y + lowerLip.y + leftMouth.y + rightMouth.y) / 4 * height) : height * 0.5;
  const blowRaw = funnel * 0.74 + pucker * 0.5 + jawOpen * 0.24;
  const blow = Math.max(0, Math.min(1, (blowRaw - 0.24) / 0.72));

  drawDandelionScene(ctx, width, height, mouthX, mouthY, blow, Boolean(face.length));
  if (blow > 0.08) spawnDandelionSeeds(width, height, blow);
  drawDandelionSeeds(ctx, width, height);

  renderOutput([
    { label: "blow strength", value: Math.round(blow * 100) },
    { label: "mouth funnel", value: Math.round(funnel * 100) },
    { label: "mouth pucker", value: Math.round(pucker * 100) },
    { label: "floating seeds", value: Math.min(100, Math.round(state.faceParticles.length / 1.8)) },
  ]);
}

function drawDandelionScene(ctx, width, height, mouthX, mouthY, blow, hasFace) {
  const headX = width * 0.36;
  const headY = height * 0.52;
  const radius = Math.min(width, height) * 0.115;
  const stemTopY = headY + radius * 0.35;
  const stemBottomY = height * 0.88;

  ctx.save();
  const bg = ctx.createLinearGradient(0, height * 0.25, 0, height);
  bg.addColorStop(0, "rgba(6, 20, 26, 0)");
  bg.addColorStop(1, "rgba(10, 38, 31, 0.72)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(132, 191, 125, 0.82)";
  ctx.lineWidth = Math.max(3, width * 0.006);
  ctx.beginPath();
  ctx.moveTo(width * 0.42, stemBottomY);
  ctx.bezierCurveTo(width * 0.39, height * 0.76, width * 0.36, height * 0.64, headX, stemTopY);
  ctx.stroke();

  drawDandelionLeaf(ctx, width * 0.4, height * 0.75, width * 0.31, height * 0.69, width * 0.36, height * 0.8);
  drawDandelionLeaf(ctx, width * 0.4, height * 0.8, width * 0.51, height * 0.72, width * 0.44, height * 0.84);

  ctx.fillStyle = "rgba(238, 226, 145, 0.95)";
  ctx.beginPath();
  ctx.arc(headX, headY, Math.max(5, radius * 0.13), 0, Math.PI * 2);
  ctx.fill();

  const seedCount = 88;
  for (let i = 0; i < seedCount; i++) {
    const angle = i * 2.399963229728653;
    const spread = Math.sqrt((i + 0.5) / seedCount);
    const x = headX + Math.cos(angle) * radius * spread;
    const y = headY + Math.sin(angle) * radius * spread;
    const rightFacing = Math.cos(angle) > -0.05;
    const loosened = rightFacing && ((i * 17) % 100) < blow * 78;
    if (loosened) continue;
    drawAttachedDandelionSeed(ctx, headX, headY, x, y, radius);
  }

  if (hasFace && blow > 0.08) drawWindLines(ctx, mouthX, mouthY, headX, headY, blow);
  ctx.restore();
}

function drawDandelionLeaf(ctx, sx, sy, cx, cy, ex, ey) {
  ctx.save();
  ctx.fillStyle = "rgba(72, 135, 86, 0.55)";
  ctx.strokeStyle = "rgba(148, 204, 132, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(cx, cy, ex, ey);
  ctx.quadraticCurveTo((sx + ex) * 0.52, (sy + ey) * 0.5 + 18, sx, sy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawAttachedDandelionSeed(ctx, headX, headY, x, y, radius) {
  const dx = x - headX;
  const dy = y - headY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  ctx.strokeStyle = "rgba(236, 239, 214, 0.32)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(headX + ux * radius * 0.12, headY + uy * radius * 0.12);
  ctx.lineTo(x, y);
  ctx.stroke();

  ctx.fillStyle = "rgba(250, 250, 232, 0.9)";
  ctx.beginPath();
  ctx.ellipse(x + ux * 3, y + uy * 3, 2.7, 1.1, Math.atan2(uy, ux), 0, Math.PI * 2);
  ctx.fill();
}

function drawWindLines(ctx, mouthX, mouthY, headX, headY, blow) {
  ctx.save();
  ctx.strokeStyle = `rgba(226, 247, 239, ${0.16 + blow * 0.24})`;
  ctx.lineWidth = 1.2 + blow * 1.4;
  for (let i = 0; i < 4; i++) {
    const offset = (i - 1.5) * 15;
    ctx.beginPath();
    ctx.moveTo(mouthX - 8, mouthY + offset);
    ctx.bezierCurveTo(mouthX - 60, mouthY + offset * 0.7, headX + 80, headY + offset * 0.5, headX + 18, headY + offset * 0.25);
    ctx.stroke();
  }
  ctx.restore();
}

function spawnDandelionSeeds(width, height, blow) {
  const headX = width * 0.36;
  const headY = height * 0.52;
  const radius = Math.min(width, height) * 0.115;
  const count = Math.max(1, Math.floor(blow * 5));
  for (let i = 0; i < count; i++) {
    state.faceParticles.push({
      x: headX + radius * (0.35 + Math.random() * 0.55),
      y: headY + (Math.random() - 0.5) * radius * 1.25,
      vx: 2.2 + blow * 5.4 + Math.random() * 2.4,
      vy: (Math.random() - 0.58) * (1.3 + blow * 2.5),
      spin: Math.random() * Math.PI * 2,
      spinV: (Math.random() - 0.5) * 0.12,
      life: 110 + Math.random() * 70,
      maxLife: 180,
      size: 0.8 + Math.random() * 0.8,
    });
  }
  while (state.faceParticles.length > 180) state.faceParticles.shift();
}

function drawDandelionSeeds(ctx, width, height) {
  const particles = state.faceParticles;
  ctx.save();
  ctx.lineCap = "round";
  for (let i = particles.length - 1; i >= 0; i--) {
    const seed = particles[i];
    seed.x += seed.vx;
    seed.y += seed.vy + Math.sin(seed.life * 0.08 + seed.spin) * 0.22;
    seed.vx *= 0.992;
    seed.vy += 0.012;
    seed.spin += seed.spinV;
    seed.life -= 1;
    if (seed.life <= 0 || seed.x > width + 80 || seed.y < -80 || seed.y > height + 80) {
      particles.splice(i, 1);
      continue;
    }

    const alpha = Math.max(0, seed.life / seed.maxLife);
    ctx.save();
    ctx.translate(seed.x, seed.y);
    ctx.rotate(seed.spin);
    ctx.scale(seed.size, seed.size);
    ctx.strokeStyle = `rgba(245, 248, 230, ${alpha * 0.72})`;
    ctx.fillStyle = `rgba(255, 255, 238, ${alpha * 0.9})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(7, 0);
    ctx.stroke();
    for (let a = -0.75; a <= 0.75; a += 0.375) {
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(16 * Math.cos(a), 16 * Math.sin(a));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(-10, 0, 3, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function renderLipFx(ctx, width, height, result) {
  const jawOpen = getBlendshape(result, "jawOpen");
  const smile = Math.max(getBlendshape(result, "mouthSmileLeft"), getBlendshape(result, "mouthSmileRight"));
  const pucker = getBlendshape(result, "mouthPucker");
  const funnel = getBlendshape(result, "mouthFunnel");
  const frown = Math.max(getBlendshape(result, "mouthFrownLeft"), getBlendshape(result, "mouthFrownRight"));
  const face = result.faceLandmarks?.[0] || [];
  const upperLip = face[13] || face[0];
  const lowerLip = face[14] || face[17] || upperLip;
  const leftMouth = face[61] || upperLip;
  const rightMouth = face[291] || upperLip;
  const mouthX = upperLip ? width - ((upperLip.x + lowerLip.x + leftMouth.x + rightMouth.x) / 4 * width) : width * 0.5;
  const mouthY = upperLip ? ((upperLip.y + lowerLip.y + leftMouth.y + rightMouth.y) / 4 * height) : height * 0.55;
  const mouthW = leftMouth && rightMouth ? Math.max(52, Math.abs(leftMouth.x - rightMouth.x) * width * 1.8) : width * 0.18;
  const mouthH = upperLip && lowerLip ? Math.max(22, Math.abs(upperLip.y - lowerLip.y) * height * 3 + jawOpen * 90) : 36 + jawOpen * 90;

  drawLipContour(ctx, mouthX, mouthY, mouthW, mouthH, jawOpen, smile, pucker);
  drawJawWaves(ctx, width, height, mouthX, mouthY, jawOpen);
  drawSmileBand(ctx, width, mouthY, smile);
  drawFunnelSwirl(ctx, mouthX, mouthY, funnel);
  spawnLipParticles(mouthX, mouthY, pucker, smile);
  drawFaceParticles(ctx);

  if (frown > 0.15) {
    const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.8);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, `rgba(30,10,40,${frown * 0.45})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  renderOutput([
    { label: "张嘴 jawOpen", value: Math.round(jawOpen * 100) },
    { label: "微笑 smile", value: Math.round(smile * 100) },
    { label: "嘟嘴 pucker", value: Math.round(pucker * 100) },
    { label: "漏斗嘴 funnel", value: Math.round(funnel * 100) },
  ]);
}

function drawLipContour(ctx, mouthX, mouthY, mouthW, mouthH, jawOpen, smile, pucker) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = smile > 0.15 ? "#ff6b9d" : "#6fd5ff";
  ctx.shadowBlur = 18 + jawOpen * 26 + pucker * 24;
  const grad = ctx.createLinearGradient(mouthX - mouthW, mouthY, mouthX + mouthW, mouthY);
  grad.addColorStop(0, "rgba(255,107,157,0.92)");
  grad.addColorStop(0.45, "rgba(246,200,95,0.82)");
  grad.addColorStop(1, "rgba(111,213,255,0.92)");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 3 + jawOpen * 7 + pucker * 5;
  ctx.beginPath();
  ctx.ellipse(mouthX, mouthY, mouthW * (0.42 + smile * 0.14), mouthH * (0.34 + pucker * 0.16), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.16 + Math.min(0.34, jawOpen + pucker);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

function drawJawWaves(ctx, width, height, mouthX, mouthY, jawOpen) {
  if (jawOpen < 0.1) return;
  const offset = (performance.now() * 0.03) % 55;
  for (let i = 0; i < Math.floor(jawOpen * 6) + 1; i++) {
    const radius = 30 + i * 55 + offset;
    const alpha = Math.max(0, 1 - radius / (height * 0.8)) * jawOpen;
    ctx.strokeStyle = `rgba(111, 213, 255, ${alpha * 0.6})`;
    ctx.lineWidth = 3 + jawOpen * 6;
    ctx.shadowColor = "#6fd5ff";
    ctx.shadowBlur = 12 * jawOpen;
    ctx.beginPath();
    ctx.arc(mouthX, mouthY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function drawSmileBand(ctx, width, mouthY, smile) {
  if (smile < 0.15) return;
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  ["#ff6b9d", "#f6c85f", "#b9d65b", "#6fd5ff", "#7757c9", "#ff6b9d"].forEach((color, index) => {
    grad.addColorStop(index / 5, color);
  });
  ctx.fillStyle = grad;
  ctx.globalAlpha = smile * 0.35;
  ctx.fillRect(0, mouthY - 80 - smile * 120, width, 60 * smile + 10);
  ctx.globalAlpha = 1;
}

function drawFunnelSwirl(ctx, mouthX, mouthY, funnel) {
  if (funnel < 0.2) return;
  const swirlAngle = performance.now() * 0.004;
  for (let s = 0; s < 3; s++) {
    ctx.strokeStyle = `rgba(119, 87, 201, ${funnel * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.05) {
      const r = 40 + a * 50 * funnel;
      const sx = mouthX + Math.cos(a + swirlAngle + s * 2) * r;
      const sy = mouthY + Math.sin(a + swirlAngle + s * 2) * r * 0.6;
      if (a === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
}

function spawnLipParticles(mouthX, mouthY, pucker, smile) {
  if (pucker > 0.25 && Math.random() < pucker * 0.7) {
    for (let i = 0; i < Math.floor(pucker * 5); i++) {
      state.faceParticles.push({
        x: mouthX + (Math.random() - 0.5) * 60,
        y: mouthY,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -(1 + Math.random() * 4),
        life: 50 + Math.random() * 40,
        maxLife: 90,
        type: "heart",
        size: 8 + Math.random() * 14,
      });
    }
  }
  if (smile > 0.3 && Math.random() < smile * 0.35) {
    state.faceParticles.push({
      x: mouthX + (Math.random() - 0.5) * 140,
      y: mouthY - 20,
      vx: (Math.random() - 0.5) * 1.6,
      vy: -1.6 - Math.random() * 2,
      life: 45 + Math.random() * 30,
      maxLife: 75,
      type: "spark",
      size: 3 + Math.random() * 7,
    });
  }
  while (state.faceParticles.length > 260) state.faceParticles.shift();
}

function drawFaceParticles(ctx) {
  const particles = state.faceParticles;
  for (let i = particles.length - 1; i >= 0; i--) {
    const point = particles[i];
    point.x += point.vx;
    point.y += point.vy;
    point.vy += 0.03;
    point.life -= 1;
    if (point.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    const alpha = point.life / point.maxLife;
    if (point.type === "heart") drawHeart(ctx, point.x, point.y, point.size * alpha, `rgba(255,107,157,${alpha})`);
    else {
      ctx.fillStyle = `rgba(246,200,95,${alpha})`;
      ctx.shadowColor = "#f6c85f";
      ctx.shadowBlur = 8 * alpha;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

function drawHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = size / 16;
  ctx.moveTo(x, y + s * 4);
  ctx.bezierCurveTo(x, y, x - s * 8, y, x - s * 8, y + s * 4);
  ctx.bezierCurveTo(x - s * 8, y + s * 10, x, y + s * 14, x, y + s * 14);
  ctx.bezierCurveTo(x, y + s * 14, x + s * 8, y + s * 10, x + s * 8, y + s * 4);
  ctx.bezierCurveTo(x + s * 8, y, x, y, x, y + s * 4);
  ctx.fill();
  ctx.restore();
}

function paintFaceFallback() {
  els.fallback.style.display = "";
  els.fallback.innerHTML = "";
  const { ctx, width, height } = canvasContext();
  drawDandelionScene(ctx, width, height, width * 0.72, height * 0.5, 0, false);
  drawDandelionSeeds(ctx, width, height);
  renderOutput([
    { label: "blow strength", value: 0 },
    { label: "mouth funnel", value: 0 },
    { label: "mouth pucker", value: 0 },
    { label: "floating seeds", value: state.faceParticles.length },
  ]);
  return;
  const card = document.createElement("div");
  card.className = "visual-card";
  card.innerHTML = `<h3 class="visual-title">Lip FX Preview</h3><p class="visual-sub">启动摄像头后，嘴唇动作会驱动声波、唇线、粒子和旋涡特效。</p>`;
  els.fallback.append(card);

  const cx = width * 0.5;
  const cy = height * 0.53;
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(111,213,255,${0.28 - i * 0.04})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 48 + i * 42, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawLipContour(ctx, cx, cy, width * 0.22, height * 0.12, 0.55, 0.4, 0.25);
  renderOutput([
    { label: "张嘴 jawOpen", value: 62 },
    { label: "微笑 smile", value: 48 },
    { label: "嘟嘴 pucker", value: 26 },
    { label: "漏斗嘴 funnel", value: 18 },
  ]);
}

function renderOutput(rows) {
  if (!rows.length) {
    els.output.innerHTML = `<p class="note">运行后这里会显示模型输出。</p>`;
    return;
  }
  els.output.innerHTML = `<div class="metric-list">${rows.map((row) => `
    <div class="metric">
      <div class="metric-head"><span>${row.label}</span><span>${row.value}%</span></div>
      <div class="bar"><span style="width:${Math.max(0, Math.min(100, row.value))}%"></span></div>
    </div>
  `).join("")}</div>`;
}

init();
