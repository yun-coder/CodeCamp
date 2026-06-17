// core.js — 主入口：整合所有模块 + 路由 + 摄像头 + 推理循环
import { CurtainGestureFilter } from "./gesture-filter.js";
import {
  initCurtainCloth, updateCurtainPhysics, settleCurtainAtHome,
  findCurtainSoftGrabNodes, softPullCurtainNode, pinCurtainNode,
  getCurtainPerimeter, spawnCurtainRevealParticles, drawCurtainParticles,
} from "./curtain-physics.js";
import { renderRealityCurtain, drawRealityBase } from "./curtain-render.js";

installConsoleFilters();

function installConsoleFilters() {
  const ignored = [
    "Hand Gesture Recognizer contains CPU only ops",
    "Custom gesture classifier is not defined",
    "GL version:",
    "OpenGL error checking is disabled",
    "Created TensorFlow Lite XNNPACK delegate for CPU",
    "Feedback manager requires a model with a single signature inference",
    "Using NORM_RECT without IMAGE_DIMENSIONS",
    "This page uses Chrome's Built-In AI features",
  ];
  const shouldIgnore = (args) => ignored.some((text) => args.some((arg) => String(arg).includes(text)));
  for (const method of ["log", "info", "warn", "error"]) {
    const original = console[method].bind(console);
    console[method] = (...args) => {
      if (shouldIgnore(args)) return;
      original(...args);
    };
  }
  window.addEventListener("unhandledrejection", (event) => {
    const reason = String(event.reason?.stack || event.reason?.message || event.reason || "");
    if (reason.includes("content_main.js") && reason.includes("Failed to fetch")) {
      event.preventDefault();
    }
  });
}

// ============================================================
// 全局状态
// ============================================================
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
  {
    id: "face-look-at-me",
    title: "面部识别 · Look At Me",
    category: "面部识别",
    icon: "EYE",
    model: "faceLandmarker",
    summary: "启用 478 点精细网格 + 虹膜定位。闭眼再睁开，瞳孔迸发光芒；连续眨 3 次，解锁六芒星「爱神之眼」。",
  },
  {
    id: "hand-composer",
    title: "手部识别 · Hand Composer",
    category: "手部识别",
    icon: "HND",
    model: "handLandmarker",
    summary: "21 关键点 × 最多 2 手。捏合 = 钢琴、弹指 = 节拍、张掌 = 鼓面、摇滚 🤘 = 霓虹滤镜。把你的手变成一支乐队。",
  },
  {
    id: "fly-sword",
    title: "手部识别 · 万剑归宗",
    category: "手部识别",
    icon: "SWD",
    model: "handLandmarker",
    summary: "复刻 + 升级：食中指并拢抓飞剑，手指前推触发纵深。5 指张开分形出 99 柄剑阵，握拳触发万剑归宗。3D 透视、剑脊血槽、HSL 拖尾。",
  },
];

const MODEL_FILES = {
  gesture: "gesture_recognizer.task",
  faceLandmarker: "face_landmarker.task",
  handLandmarker: "hand_landmarker.task",
};

const REMOTE_MODEL_BASE = "https://storage.googleapis.com/mediapipe-models";
const REMOTE_MODEL_PATHS = {
  gesture: "/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
  faceLandmarker: "/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  handLandmarker: "/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
};

const CURTAIN_DEFAULT_POSTER = "assets/lootai/curtain-cover.jpg";
const CURTAIN_DEFAULT_VIDEO = "assets/lootai/curtain-showcase.mp4";

const state = {
  active: solutions[0],
  stream: null,
  vision: null,
  task: null,
  raf: 0,
  lastVideoTime: -1,
  faceParticles: [],
  curtain: {
    p5: null,
    cloth: null,
    latestResult: null,
    media: null,
    mediaUrl: "",
    defaultMedia: null,
    pointer: { active: false, node: null, x: 0, y: 0 },
    hand: { node: null, softNodes: [] },
    gesture: new CurtainGestureFilter(),
    particles: [],
    lastSize: "",
  },
  // 蒲公英场景（参考 pgy.html）
  dandelion: null,
  // 是否启用"新版蒲公英"渲染（与原 Lip FX 二选一）
  useNewDandelion: true,
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

// 挂载到全局供各模块读取
window._curtainState = state.curtain;
window._curtainState._els = els;
window._curtainState.stream = null;

// ============================================================
// 初始化
// ============================================================
function init() {
  renderNav();
  selectSolution(solutions[0].id);
  els.startCamera.addEventListener("click", startCamera);
  els.stopCamera.addEventListener("click", stopCamera);
  els.stage.addEventListener("pointerdown", handleStagePointerDown);
  els.stage.addEventListener("pointermove", handleCurtainPointerMove);
  window.addEventListener("pointerup", handleCurtainPointerUp);
  window.addEventListener("pointercancel", handleCurtainPointerUp);
  window.addEventListener("resize", () => {
    if (state.active.model === "gesture") startCurtainSketch();
    else paintFaceFallback();
  });
}

function handleStagePointerDown(event) {
  // 1) 幕布手势模式：拖拽布料
  if (state.active.model === "gesture") {
    handleCurtainPointerDown(event);
    return;
  }
  // 2) face-lip-fx + 新蒲公英：点击屏幕吹气
  if (state.active.id === "face-lip-fx" && state.useNewDandelion && state.dandelion) {
    const rect = els.stage.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const d = state.dandelion;
    const dir = normalizeVec2(x - d.center.x, y - d.center.y, 1, 0);
    d.currentWindStrength = Math.max(d.currentWindStrength, 80 * 0.04);
    d.currentWindX = dir.x * d.currentWindStrength * 1.4;
    d.currentWindY = dir.y * d.currentWindStrength * 1.4;
    newDandelionTriggerBlow(d, 80, dir.x, dir.y, x, y);
  }
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

// ============================================================
// 方案切换
// ============================================================
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
    els.video.classList.toggle("active", Boolean(state.stream) && selected.model === "faceLandmarker");
    paintFaceFallback();
  }
  // Look-at-me 模式：重置眨眼状态机
  if (selected.id === "face-look-at-me") {
    state.lookAtMe = { blinkEvents: [], lastBlinkScore: 0, sparkleTime: 0, lookEvents: [], lastLookScore: 0, sparkleSeed: Math.random() * 1000 };
  }
  // Hand Composer 模式：重置手势状态机
  if (selected.id === "hand-composer") {
    state.handFx = {
      lastPinchT: 0,
      lastSnapT: 0,
      snapPulse: 0,         // 弹指脉冲倒计时
      pinchSustain: 0,      // 捏合持续脉冲计时
      beats: [],            // 弹指节拍时间队列
      drumImpact: 0,        // 鼓面冲击倒计时
      lastHandZ: null,      // 上一帧手部深度（弹指检测）
      rockModeUntil: 0,     // 摇滚模式倒计时
    };
  }
  // 万剑归宗：初始化剑阵
  if (selected.id === "fly-sword") {
    if (!state.flySword) {
      state.flySword = {};
    }
    initFlySwordScene(state.flySword);
  }
  if (state.stream) await startTaskForActive();
}

// ============================================================
// 控制面板
// ============================================================
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
  } else if (state.active.id === "face-look-at-me") {
    els.controls.innerHTML = `
      <div class="control-row">
        <button class="small-button" type="button" data-action="camera">启动摄像头</button>
        <button class="small-button" type="button" data-action="look-demo">演示一次</button>
      </div>
      <p class="note">闭眼 2 秒再睁眼 → 瞳孔迸发光芒。连续眨眼 3 次 → 解锁六芒星「爱神之眼」。眼睛朝左右看 → 「被发现」小字弹出。</p>
    `;
  } else if (state.active.id === "hand-composer") {
    els.controls.innerHTML = `
      <div class="control-row">
        <button class="small-button" type="button" data-action="camera">启动摄像头</button>
        <button class="small-button" type="button" data-action="audio-toggle">声音：开</button>
      </div>
      <p class="note">捏合 = 钢琴音（持续）。弹指（中指击拇指）= 节拍标记。张掌 = 鼓面冲击。食指+小指伸直（摇滚 🤘）= 霓虹滤镜全开。</p>
    `;
  } else if (state.active.id === "fly-sword") {
    els.controls.innerHTML = `
      <div class="control-row">
        <button class="small-button" type="button" data-action="camera">启动摄像头</button>
        <button class="small-button" type="button" data-action="sword-reset">飞剑归位</button>
        <button class="small-button" type="button" data-action="sword-formation">分形剑阵</button>
      </div>
      <p class="note">食 + 中指并拢 = 抓飞剑。手指前推 = 入屏纵深。5 指张开 = 分形出 99 柄剑阵。握拳 = 万剑归宗。</p>
    `;
  } else {
    els.controls.innerHTML = `
      <div class="control-row">
        <button class="small-button" type="button" data-action="camera">启动摄像头</button>
        <button class="small-button" type="button" data-action="sample">离线预览</button>
        <button class="small-button" type="button" data-action="dandelion-regrow">重新长出</button>
      </div>
      <p class="note">收成 O 形嘴吹气，蒲公英会按你嘴部朝向和位置飘动。点击屏幕任意位置也可吹气。</p>
    `;
  }
  els.controls.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });
}

function handleAction(action) {
  if (action === "camera") startCamera();
  if (action === "sample") {
    if (state.active.model === "gesture") { resetCurtain(); startCurtainSketch(); }
    else paintFaceFallback();
  }
  if (action === "curtain-reset") resetCurtain();
  if (action === "dandelion-regrow") {
    if (state.dandelion) {
      initNewDandelionScene(state.dandelion, els.canvas.width / (window.devicePixelRatio || 1), els.canvas.height / (window.devicePixelRatio || 1));
    }
  }
  if (action === "look-demo") {
    // 离线状态下的演示：触发一次全屏闪烁，让用户先看到效果
    if (!state.stream) {
      paintFaceFallback();
      // 强制触发一次 sparkle，让用户看到「眼睛一开」的画面
      state.lookAtMe.sparkleTime = performance.now();
    }
  }
  if (action === "audio-toggle") {
    state.audioEnabled = !state.audioEnabled;
    const btn = els.controls.querySelector('[data-action="audio-toggle"]');
    if (btn) btn.textContent = `声音：${state.audioEnabled ? "开" : "关"}`;
    if (state.audioEnabled) ensureAudio();
  }
  if (action === "sword-reset") {
    if (state.flySword) {
      initFlySwordScene(state.flySword);
    }
  }
  if (action === "sword-formation") {
    if (state.flySword) {
      // 强制触发分形动画
      state.flySword.formationTarget = Math.min(99, state.flySword.swords.length + 12);
      state.flySword.formationAnimStart = performance.now();
    }
  }
}

// ============================================================
// 摄像头控制
// ============================================================
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
      window._curtainState.stream = state.stream;
      if (state.active.model === "gesture") {
        state.curtain.gesture.reset();
        resetCurtain();
      }
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
  state.lastVideoTime = -1;
  state.curtain.gesture.reset();
  els.video.srcObject = null;
  els.video.classList.remove("active");
  els.status.textContent = "摄像头已停止";
  window._curtainState.stream = null;
  if (state.active.model === "gesture") startCurtainSketch();
  else paintFaceFallback();
}

function stopLoop() {
  if (state.raf) cancelAnimationFrame(state.raf);
  state.raf = 0;
}

// ============================================================
// MediaPipe WASM 加载
// ============================================================
async function loadVision() {
  if (state.vision) return state.vision;
  els.status.textContent = "正在加载 MediaPipe WASM";
  try {
    const vision = await import("./wasm/vision_bundle.js");
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
  state.lastVideoTime = -1;
  try {
    const vision = await loadVision();
    state.task = await createTask(vision, state.active.model);
    els.status.textContent = "实时运行中";
    if (state.active.model === "gesture") startCurtainSketch();
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
    const wantsRefine = state.active?.id === "face-look-at-me";
    return await vision.FaceLandmarker.createFromOptions(vision.resolver, {
      ...options,
      numFaces: 1,
      outputFaceBlendshapes: true,
      ...(wantsRefine ? { refineFaceLandmarks: true } : {}),
    });
  }
  if (key === "handLandmarker") {
    return await vision.HandLandmarker.createFromOptions(vision.resolver, {
      ...options,
      numHands: 2,
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

// ============================================================
// 推理循环（30fps）
// ============================================================
function loopVision() {
  if (!state.task || !state.stream) return;
  const now = performance.now();
  try {
    if (els.video.currentTime !== state.lastVideoTime) {
      state.lastVideoTime = els.video.currentTime;
      if (state.active.model === "gesture") {
        const result = state.task.recognizeForVideo(els.video, now);
        state.curtain.latestResult = result;
      } else if (state.active.model === "handLandmarker") {
        const result = state.task.detectForVideo(els.video, now);
        if (state.active.id === "fly-sword") {
          const { ctx: swordCtx, width: sw, height: sh } = canvasContext();
          renderFlySwordFx(swordCtx, sw, sh, result);
        } else {
          drawHandResult(result);
        }
      } else {
        const result = state.task.detectForVideo(els.video, now);
        drawFaceResult(result);
      }
    }
  } catch (error) {
    console.warn(error);
  }
  state.raf = requestAnimationFrame(loopVision);
}

// ============================================================
// Canvas 工具
// ============================================================
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

// ============================================================
// 幕布 p5.js 初始化
// ============================================================
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

  curtain.p5 = new window.p5((p) => {
    p.setup = () => {
      const rect = els.stage.getBoundingClientRect();
      const canvas = p.createCanvas(Math.max(1, rect.width), Math.max(1, rect.height));
      canvas.parent(els.stage);
      canvas.addClass("p5-curtain-canvas");
      p.pixelDensity(Math.min(1.5, window.devicePixelRatio || 1));
      initCurtainCloth(p.width, p.height, true);
    };
    p.draw = () => {
      renderP5Frame(p);
    };
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

// ============================================================
// 渲染帧（60fps：物理更新 + 渲染）
// ============================================================
function renderP5Frame(p) {
  const curtain = state.curtain;
  if (curtain.latestResult) {
    const rawGrab = getCurtainHandGrabRaw(curtain.latestResult, p.width, p.height);
    curtain.gesture.update(rawGrab, p.width, p.height);
  }
  const handGrab = curtain.gesture._snapshot();

  const cloth = curtain.cloth;
  if (cloth) {
    updateCurtainPhysics(cloth, handGrab, p.width, p.height);
    renderRealityCurtain(p, handGrab);
  } else {
    initCurtainCloth(p.width, p.height, true);
  }
}

function getCurtainHandGrabRaw(result, width, height) {
  const landmarks = result.landmarks?.[0];
  if (!landmarks) return null;
  const thumb = landmarks[4];
  const index = landmarks[8];
  if (!thumb || !index) return null;
  const distance = Math.hypot(index.x - thumb.x, index.y - thumb.y);
  const x = width - ((thumb.x + index.x) * 0.5 * width);
  const y = (thumb.y + index.y) * 0.5 * height;
  return { present: true, pinching: distance < 0.08, x, y, distance };
}

// ============================================================
// 幕布重置 + 媒体上传
// ============================================================
function resetCurtain() {
  const rect = els.stage.getBoundingClientRect();
  initCurtainCloth(Math.max(1, rect.width), Math.max(1, rect.height), true);
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

function handleCurtainMedia(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const curtain = state.curtain;
  if (curtain.mediaUrl) URL.revokeObjectURL(curtain.mediaUrl);
  const url = URL.createObjectURL(file);
  if (file.type.startsWith("video/")) {
    const video = document.createElement("video");
    video.src = url;
    video.loop = true; video.muted = true; video.playsInline = true;
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

// ============================================================
// 指针事件
// ============================================================
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

// ============================================================
// 输出面板
// ============================================================
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

// ============================================================
// 面部特效
// ============================================================
function drawFaceResult(result) {
  const { ctx, width, height } = canvasContext();
  drawMirroredVideo(ctx, width, height);
  const landmarks = result.faceLandmarks || [];
  drawFaceLandmarks(ctx, width, height, landmarks);
  if (state.active.id === "face-look-at-me") {
    renderLookAtMeFx(ctx, width, height, result);
  } else if (state.useNewDandelion) {
    renderNewDandelionFx(ctx, width, height, result);
  } else {
    renderDandelionFx(ctx, width, height, result);
  }
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

function drawCoverElement(ctx, el, sW, sH, x, y, w, h) {
  const sr = sW/sH, tr = w/h;
  let sx=0,sy=0,sw=sW,sh=sH;
  if (sr > tr) { sw = sH*tr; sx=(sW-sw)/2; }
  else { sh = sW/tr; sy=(sH-sh)/2; }
  ctx.drawImage(el, sx,sy,sw,sh, x,y,w,h);
}

// Dandelion FX
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
  const dx = x - headX, dy = y - headY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
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
  const headX = width * 0.36, headY = height * 0.52;
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
      particles.splice(i, 1); continue;
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
    ctx.moveTo(-8, 0); ctx.lineTo(7, 0);
    ctx.stroke();
    for (let a = -0.75; a <= 0.75; a += 0.375) {
      ctx.beginPath(); ctx.moveTo(7, 0);
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

// Lip FX
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
    const vig = ctx.createRadialGradient(width/2,height/2,height*0.3,width/2,height/2,height*0.8);
    vig.addColorStop(0,"rgba(0,0,0,0)"); vig.addColorStop(1,`rgba(30,10,40,${frown*0.45})`);
    ctx.fillStyle = vig; ctx.fillRect(0,0,width,height);
  }
  renderOutput([
    { label:"张嘴 jawOpen", value:Math.round(jawOpen*100) },
    { label:"微笑 smile", value:Math.round(smile*100) },
    { label:"嘟嘴 pucker", value:Math.round(pucker*100) },
    { label:"漏斗嘴 funnel", value:Math.round(funnel*100) },
  ]);
}

function drawLipContour(ctx,mx,my,mw,mh,jaw,smile,puck) {
  ctx.save(); ctx.lineCap="round"; ctx.lineJoin="round";
  ctx.shadowColor = smile>0.15?"#ff6b9d":"#6fd5ff";
  ctx.shadowBlur = 18+jaw*26+puck*24;
  const g = ctx.createLinearGradient(mx-mw,my,mx+mw,my);
  g.addColorStop(0,"rgba(255,107,157,0.92)"); g.addColorStop(0.45,"rgba(246,200,95,0.82)"); g.addColorStop(1,"rgba(111,213,255,0.92)");
  ctx.strokeStyle=g; ctx.lineWidth=3+jaw*7+puck*5;
  ctx.beginPath(); ctx.ellipse(mx,my,mw*(0.42+smile*0.14),mh*(0.34+puck*0.16),0,0,Math.PI*2);
  ctx.stroke(); ctx.globalAlpha=0.16+Math.min(0.34,jaw+puck); ctx.fillStyle=g; ctx.fill();
  ctx.restore();
}

function drawJawWaves(ctx,w,h,mx,my,jaw) {
  if (jaw<0.1) return;
  const off=(performance.now()*0.03)%55;
  for (let i=0;i<Math.floor(jaw*6)+1;i++){
    const r=30+i*55+off;
    const a=Math.max(0,1-r/(h*0.8))*jaw;
    ctx.strokeStyle=`rgba(111,213,255,${a*0.6})`; ctx.lineWidth=3+jaw*6;
    ctx.shadowColor="#6fd5ff"; ctx.shadowBlur=12*jaw;
    ctx.beginPath(); ctx.arc(mx,my,r,0,Math.PI*2); ctx.stroke();
  }
  ctx.shadowBlur=0;
}

function drawSmileBand(ctx,w,mouthY,smile) {
  if (smile<0.15) return;
  const g=ctx.createLinearGradient(0,0,w,0);
  ["#ff6b9d","#f6c85f","#b9d65b","#6fd5ff","#7757c9","#ff6b9d"].forEach((c,i)=>g.addColorStop(i/5,c));
  ctx.fillStyle=g; ctx.globalAlpha=smile*0.35;
  ctx.fillRect(0,mouthY-80-smile*120,w,60*smile+10); ctx.globalAlpha=1;
}

function drawFunnelSwirl(ctx,mx,my,funnel) {
  if (funnel<0.2) return;
  const sa=performance.now()*0.004;
  for (let s=0;s<3;s++){
    ctx.strokeStyle=`rgba(119,87,201,${funnel*0.5})`; ctx.lineWidth=2; ctx.beginPath();
    for (let a=0;a<Math.PI*2;a+=0.05){
      const r=40+a*50*funnel;
      const sx=mx+Math.cos(a+sa+s*2)*r, sy=my+Math.sin(a+sa+s*2)*r*0.6;
      if(a===0)ctx.moveTo(sx,sy);else ctx.lineTo(sx,sy);
    }
    ctx.stroke();
  }
}

function spawnLipParticles(mx, my, pucker, smile) {
  if (pucker > 0.25 && Math.random() < pucker*0.7) {
    for (let i=0;i<Math.floor(pucker*5);i++){
      state.faceParticles.push({
        x:mx+(Math.random()-0.5)*60, y:my,
        vx:(Math.random()-0.5)*2.5, vy:-(1+Math.random()*4),
        life:50+Math.random()*40, maxLife:90, type:"heart", size:8+Math.random()*14,
      });
    }
  }
  if (smile > 0.3 && Math.random() < smile*0.35) {
    state.faceParticles.push({
      x:mx+(Math.random()-0.5)*140, y:my-20,
      vx:(Math.random()-0.5)*1.6, vy:-1.6-Math.random()*2,
      life:45+Math.random()*30, maxLife:75, type:"spark", size:3+Math.random()*7,
    });
  }
  while(state.faceParticles.length>260) state.faceParticles.shift();
}

function drawFaceParticles(ctx) {
  const pts = state.faceParticles;
  for (let i=pts.length-1;i>=0;i--){
    const p = pts[i];
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.03; p.life-=1;
    if(p.life<=0){pts.splice(i,1);continue;}
    const a=p.life/p.maxLife;
    if(p.type==="heart") drawHeart(ctx,p.x,p.y,p.size*a,`rgba(255,107,157,${a})`);
    else {
      ctx.fillStyle=`rgba(246,200,95,${a})`;
      ctx.shadowColor="#f6c85f"; ctx.shadowBlur=8*a;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size*a,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    }
  }
}

function drawHeart(ctx,x,y,size,color){
  ctx.save(); ctx.fillStyle=color; ctx.beginPath();
  const s=size/16;
  ctx.moveTo(x,y+s*4);
  ctx.bezierCurveTo(x,y,x-s*8,y,x-s*8,y+s*4);
  ctx.bezierCurveTo(x-s*8,y+s*10,x,y+s*14,x,y+s*14);
  ctx.bezierCurveTo(x,y+s*14,x+s*8,y+s*10,x+s*8,y+s*4);
  ctx.bezierCurveTo(x+s*8,y,x,y+s*4);
  ctx.fill(); ctx.restore();
}

function paintFaceFallback() {
  els.fallback.style.display = "";
  els.fallback.innerHTML = "";
  const { ctx, width, height } = canvasContext();
  if (state.active.id === "face-look-at-me") {
    drawLookAtMePreview(ctx, width, height);
    renderOutput([
      { label: "left eye open", value: 100 },
      { label: "right eye open", value: 100 },
      { label: "pupil outward", value: 0 },
      { label: "sparkle charge", value: 0 },
    ]);
    return;
  }
  if (state.active.id === "hand-composer") {
    drawHandComposerPreview(ctx, width, height);
    renderOutput([
      { label: "hands detected", value: 0 },
      { label: "pinch strength", value: 0 },
      { label: "snap interval", value: 0 },
      { label: "rock 🤘 mode", value: 0 },
    ]);
    return;
  }
  if (state.active.id === "fly-sword") {
    drawFlySwordPreview(ctx, width, height);
    renderOutput([
      { label: "sword count", value: 1 },
      { label: "gesture", value: 0 },
      { label: "depth", value: 0 },
      { label: "formation", value: 0 },
    ]);
    return;
  }
  // face-lip-fx: 走新蒲公英（参考 pgy.html 完整实现）
  if (state.useNewDandelion) {
    renderNewDandelionPreview(ctx, width, height);
    return;
  }
  drawDandelionScene(ctx, width, height, width*0.72, height*0.5, 0, false);
  drawDandelionSeeds(ctx, width, height);
  renderOutput([
    { label:"blow strength", value:0 },
    { label:"mouth funnel", value:0 },
    { label:"mouth pucker", value:0 },
    { label:"floating seeds", value:state.faceParticles.length },
  ]);
}

// ============================================================
// 新版蒲公英（参考 pgy.html 实现）
//   - 完整茎、花托、250 颗绒毛粒子
//   - 嘴部 O 形检测 + yaw/pitch → 风向向量
//   - 嘴部气流光束（5 条贝塞尔曲线）
//   - 鼠标点击屏幕任意位置也可吹气
//   - 重新长出按钮重置粒子
// ============================================================

// ============================================================
// Look At Me · 眼神光
//   - 复用 faceLandmarker 模型，开启 refineFaceLandmarks 后 landmarks=478
//   - 虹膜索引：左眼 468..472 / 右眼 473..477
//   - blendshape 用 eyeBlinkLeft/Right（闭眼度）+ eyeLookOutLeft/Right（外瞥度）
// ============================================================
const LOOK_IRIS = {
  leftCenter: 468, leftRight: 469, leftTop: 470, leftBottom: 471, leftLeft: 472,
  rightCenter: 473, rightRight: 474, rightTop: 475, rightBottom: 476, rightLeft: 477,
};

function getIrisPoint(face, idx) {
  if (!face || face.length <= idx) return null;
  const p = face[idx];
  if (!p) return null;
  return p;
}

function mirrorX(p, width) {
  // 输入坐标是 normalized [0,1]，渲染时镜像
  return width - p.x * width;
}

function renderLookAtMeFx(ctx, width, height, result) {
  const face = result.faceLandmarks?.[0] || [];
  const shapes = result.faceBlendshapes?.[0]?.categories || [];
  const get = (name) => shapes.find((c) => c.categoryName === name)?.score || 0;

  const blinkL = get("eyeBlinkLeft");
  const blinkR = get("eyeBlinkRight");
  const blinkAvg = (blinkL + blinkR) * 0.5;

  const lookOutL = get("eyeLookOutLeft");
  const lookOutR = get("eyeLookOutRight");
  const lookOutAvg = Math.max(lookOutL, lookOutR);

  // 确保 state.lookAtMe 已初始化（首次进入页面 selectSolution 会创建，这里兜底）
  if (!state.lookAtMe) {
    state.lookAtMe = { blinkEvents: [], lastBlinkScore: 0, sparkleTime: 0, lookEvents: [], lastLookScore: 0, sparkleSeed: 0 };
  }
  const s = state.lookAtMe;
  const now = performance.now();

  // ---- 眨眼检测（闭→开沿）----
  // 上帧 >=0.55 (闭) → 当前帧 <0.35 (开) 算一次眨眼
  if (s.lastBlinkScore >= 0.55 && blinkAvg < 0.35) {
    s.blinkEvents.push(now);
    // 仅保留 1.5 秒内的眨眼事件
    while (s.blinkEvents.length && now - s.blinkEvents[0] > 1500) s.blinkEvents.shift();
    // 1.5 秒内 3 次眨眼 → 触发六芒星
    if (s.blinkEvents.length >= 3) {
      s.sparkleTime = now;
      s.sparkleKind = "hex";
      s.sparkleSeed = Math.random() * 1000;
      s.blinkEvents.length = 0;
    } else if (s.blinkEvents.length === 1 && !s.sparkleTime) {
      // 单次眨眼 → 触发普通光斑
      s.sparkleTime = now;
      s.sparkleKind = "pulse";
      s.sparkleSeed = Math.random() * 1000;
    }
  }
  s.lastBlinkScore = blinkAvg;

  // ---- 外瞥检测（lookOut 突增）----
  if (lookOutAvg > 0.45 && s.lastLookScore <= 0.45) {
    s.lookEvents.push(now);
    while (s.lookEvents.length && now - s.lookEvents[0] > 800) s.lookEvents.shift();
    s.caughtTextTime = now;
  }
  s.lastLookScore = lookOutAvg;

  // ---- 渲染虹膜 + 光斑 ----
  const leftCenter = getIrisPoint(face, LOOK_IRIS.leftCenter);
  const rightCenter = getIrisPoint(face, LOOK_IRIS.rightCenter);
  if (leftCenter && rightCenter) {
    const lx = mirrorX(leftCenter, width);
    const ly = leftCenter.y * height;
    const rx = mirrorX(rightCenter, width);
    const ry = rightCenter.y * height;
    drawIrisRing(ctx, lx, ly, 14, blinkL);
    drawIrisRing(ctx, rx, ry, 14, blinkR);
    drawPupilSparkle(ctx, lx, ly, blinkL, now);
    drawPupilSparkle(ctx, rx, ry, blinkR, now);
  }

  // ---- 全屏 sparkle 特效（眨眼 / 连眨 触发）----
  if (s.sparkleTime) {
    const elapsed = now - s.sparkleTime;
    const total = s.sparkleKind === "hex" ? 1400 : 900;
    const progress = Math.min(1, elapsed / total);
    if (leftCenter && rightCenter) {
      const lx = mirrorX(leftCenter, width);
      const ly = leftCenter.y * height;
      const rx = mirrorX(rightCenter, width);
      const ry = rightCenter.y * height;
      drawSparkleBurst(ctx, lx, ly, progress, s.sparkleKind, s.sparkleSeed);
      drawSparkleBurst(ctx, rx, ry, progress, s.sparkleKind, s.sparkleSeed + 100);
    }
    if (progress >= 1) {
      s.sparkleTime = 0;
      s.sparkleKind = null;
    }
  }

  // ---- "被发现了"小字 ----
  if (s.caughtTextTime && now - s.caughtTextTime < 1200) {
    drawCaughtBanner(ctx, width, height, (now - s.caughtTextTime) / 1200);
  } else if (s.caughtTextTime) {
    s.caughtTextTime = 0;
  }

  // ---- 输出面板 ----
  renderOutput([
    { label: "left eye open", value: Math.round((1 - blinkL) * 100) },
    { label: "right eye open", value: Math.round((1 - blinkR) * 100) },
    { label: "pupil outward", value: Math.round(lookOutAvg * 100) },
    { label: "sparkle charge", value: Math.min(100, s.blinkEvents.length * 33) },
  ]);
}

function drawIrisRing(ctx, cx, cy, r, blink) {
  // 闭眼时把虹膜缩小 / 隐藏
  const visible = Math.max(0, 1 - blink * 1.4);
  if (visible < 0.05) return;
  ctx.save();
  ctx.globalAlpha = visible;
  ctx.shadowColor = "#6fd5ff";
  ctx.shadowBlur = 16;
  ctx.strokeStyle = "rgba(111, 213, 255, 0.85)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // 瞳孔中心实心点
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.45);
  grad.addColorStop(0, "rgba(15, 30, 40, 0.95)");
  grad.addColorStop(0.7, "rgba(20, 50, 70, 0.6)");
  grad.addColorStop(1, "rgba(111, 213, 255, 0.0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPupilSparkle(ctx, cx, cy, blink, now) {
  if (blink > 0.6) return;
  // 持续小幅 sparkle，眨眼时更亮
  const t = (now % 1800) / 1800;
  const a = (Math.sin(t * Math.PI * 2) * 0.5 + 0.5) * 0.4 * (1 - blink);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx + 3, cy - 3, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSparkleBurst(ctx, cx, cy, progress, kind, seed) {
  ctx.save();
  const ease = 1 - Math.pow(1 - progress, 3);
  if (kind === "pulse") {
    // 单次脉冲：扩散环 + 6 道光线
    const r = 20 + ease * 180;
    ctx.globalAlpha = (1 - progress) * 0.85;
    ctx.strokeStyle = "#ffe066";
    ctx.shadowColor = "#ffe066";
    ctx.shadowBlur = 24 * (1 - progress);
    ctx.lineWidth = 2.5 * (1 - progress) + 0.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // 6 道放射光线
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + seed;
      const x1 = cx + Math.cos(a) * (r * 0.6);
      const y1 = cy + Math.sin(a) * (r * 0.6);
      const x2 = cx + Math.cos(a) * (r * 1.4);
      const y2 = cy + Math.sin(a) * (r * 1.4);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    // 中心十字高光
    ctx.globalAlpha = (1 - progress) * 1;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
    ctx.stroke();
  } else if (kind === "hex") {
    // 六芒星「爱神之眼」
    const r = 30 + ease * 220;
    ctx.globalAlpha = (1 - progress) * 0.95;
    ctx.strokeStyle = "#ff6b9d";
    ctx.shadowColor = "#ff6b9d";
    ctx.shadowBlur = 30 * (1 - progress);
    ctx.lineWidth = 2 * (1 - progress) + 0.8;
    // 两个交错三角形
    for (let tri = 0; tri < 2; tri++) {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + tri * Math.PI / 3 + seed;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    // 中心心形小点
    ctx.globalAlpha = (1 - progress);
    ctx.fillStyle = "#ffe066";
    drawHeart(ctx, cx, cy, 18 * (1 - progress * 0.5), "rgba(255,224,102,0.95)");
    // 粒子环
    ctx.globalAlpha = (1 - progress) * 0.8;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + seed * 2;
      const rr = r * (1 + ease * 0.4);
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr;
      ctx.beginPath();
      ctx.arc(px, py, 2.5 * (1 - progress) + 0.4, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? "#6fd5ff" : "#ff6b9d";
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawCaughtBanner(ctx, width, height, t) {
  const enter = Math.min(1, t * 4);
  const exit = Math.max(0, Math.min(1, (1 - t) * 4));
  const alpha = enter * exit;
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = alpha * 0.92;
  ctx.font = "600 14px ui-monospace, SFMono-Regular, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffe066";
  ctx.shadowColor = "#ff6b9d";
  ctx.shadowBlur = 18 * alpha;
  ctx.fillText("✦ caught you looking ✦", width / 2, height * 0.18);
  ctx.restore();
}

// 离线预览：画一只"眼睛"，并触发一次静态 sparkle
function drawLookAtMePreview(ctx, width, height) {
  // 背景渐变
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "rgba(8, 20, 32, 0.95)");
  bg.addColorStop(1, "rgba(4, 10, 18, 0.95)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  // 两只眼睛
  const cx1 = width * 0.36, cx2 = width * 0.64;
  const cy = height * 0.5;
  const r = Math.min(width, height) * 0.08;
  for (const cx of [cx1, cx2]) {
    ctx.save();
    ctx.shadowColor = "#6fd5ff";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "rgba(15, 30, 45, 0.95)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.4, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(111, 213, 255, 0.85)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.4, r * 0.85, 0, 0, Math.PI * 2);
    ctx.stroke();
    // 瞳孔
    const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.55);
    pg.addColorStop(0, "rgba(15, 30, 40, 0.95)");
    pg.addColorStop(1, "rgba(111, 213, 255, 0.0)");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    // 高光
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx + r * 0.2, cy - r * 0.2, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 文字引导
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "500 14px ui-monospace, SFMono-Regular, monospace";
  ctx.fillStyle = "rgba(220, 240, 255, 0.78)";
  ctx.fillText("启动摄像头 → 闭眼再睁开 → 触发眼神光", width / 2, height * 0.78);
  ctx.font = "500 12px ui-monospace, SFMono-Regular, monospace";
  ctx.fillStyle = "rgba(255, 224, 102, 0.85)";
  ctx.fillText("连眨 3 次 → 解锁六芒星 ✦", width / 2, height * 0.84);
  ctx.restore();
  // 静态演示一次 sparkle（让离线状态也能看到效果）
  const now = performance.now();
  // 用一个伪随机 seed 让离线画面"活"起来
  drawSparkleBurst(ctx, cx1, cy, (now % 1800) / 1800, "pulse", 42);
  drawSparkleBurst(ctx, cx2, cy, ((now + 600) % 1800) / 1800, "pulse", 137);
}

// ============================================================
// Fly Sword · 万剑归宗（参考 fly-sword.html + 3D 升级）
// 关键设计：
//   - 状态：state.flySword { swords[], formation, gather, stars, ... }
//   - 主剑由食+中指并拢控制
//   - 张掌触发分形（9→36→99）
//   - 握拳触发归宗（螺旋汇聚到屏幕中心）
//   - 3D 透视：剑身根据 depthMix 切侧视/纵深视图
// ============================================================
function initFlySwordScene(fs) {
  const w = window.innerWidth, h = window.innerHeight;
  fs.w = w; fs.h = h;
  // 剑池
  fs.swords = [];
  fs.swords.push(makeFlySword(0, w * 0.52, h * 0.56, -0.35, true));
  // 剑阵
  fs.formation = 1;           // 当前剑数
  fs.formationTarget = 1;
  fs.formationAnimStart = 0;
  fs.gather = 0;              // 0=展开, 1=归宗
  fs.gatherTarget = 0;
  fs.gatherStart = 0;
  // 200 颗深度星点
  fs.stars = [];
  for (let i = 0; i < 200; i++) {
    fs.stars.push({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),         // 0=近, 1=远
      r: 0.4 + Math.random() * 1.2,
      twinkle: Math.random() * Math.PI * 2,
    });
  }
  // 手势状态
  fs.hand = {
    visible: false,
    grabScore: 0,
    openScore: 0,    // 5 指全开
    fistScore: 0,    // 4 指弯曲
    forwardScore: 0,
    filteredScale: 0,
    scaleVelocity: 0,
    aimX: 1, aimY: 0,
    pointerX: w * 0.5, pointerY: h * 0.5,
  };
  fs.lastUpdate = performance.now();
  fs.t0 = performance.now();
}

function makeFlySword(idx, x, y, angle, isMain) {
  return {
    idx, x, y, angle,
    vx: 0, vy: 0,
    targetX: x, targetY: y,
    depth: 0,           // 0=近, 1=远
    roll: 0,            // Y 轴 roll
    rollVel: 0,
    glow: isMain ? 0.6 : 0.3,
    scale: 1,
    trail: [],
    isMain,
    phase: idx * 0.6180339887,  // 黄金角，分形用
    isGhost: false,             // 远景虚影剑
  };
}

function ensureFlySword(w, h) {
  if (!state.flySword) { state.flySword = {}; initFlySwordScene(state.flySword); }
  const fs = state.flySword;
  if (fs.w !== w || fs.h !== h) {
    initFlySwordScene(fs);
  }
  return fs;
}

// ---- 手势识别（食+中指并拢 / 张掌 / 握拳）----
function flySwordUpdateHand(fs, landmarks) {
  if (!landmarks || landmarks.length === 0) {
    fs.hand.visible = false;
    fs.hand.grabScore *= 0.84;
    fs.hand.openScore *= 0.84;
    fs.hand.fistScore *= 0.84;
    fs.hand.forwardScore *= 0.84;
    return;
  }
  fs.hand.visible = true;
  const lm = landmarks[0];
  const indexTip = lm[8], middleTip = lm[12], ringTip = lm[16], pinkyTip = lm[20];
  const indexMcp = lm[5], middleMcp = lm[9], ringMcp = lm[13], pinkyMcp = lm[17];
  const wrist = lm[0];

  // 食+中指并拢（grab）
  const closeDist = Math.hypot(indexTip.x - middleTip.x, indexTip.y - middleTip.y);
  const baseDist = Math.max(0.001, Math.hypot(indexMcp.x - middleMcp.x, indexMcp.y - middleMcp.y));
  const grabRaw = (0.95 - closeDist / baseDist) / 0.45;

  // 张掌（5 指全伸开）— 用 tip 到 wrist 距离
  const indexExt = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y);
  const middleExt = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
  const ringExt = Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y);
  const pinkyExt = Math.hypot(pinkyTip.x - wrist.x, pinkyTip.y - wrist.y);
  const indexMcpDist = Math.hypot(indexMcp.x - wrist.x, indexMcp.y - wrist.y);
  const openRaw = ((indexExt + middleExt + ringExt + pinkyExt) / 4) / (indexMcpDist * 1.8) - 0.55;

  // 握拳（4 指全弯曲）— tip 到 mcp 距离 < mcp 到 wrist
  const indexFolded = indexExt < indexMcpDist * 1.4;
  const middleFolded = middleExt < Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y) * 1.4;
  const ringFolded = ringExt < Math.hypot(ringMcp.x - wrist.x, ringMcp.y - wrist.y) * 1.4;
  const pinkyFolded = pinkyExt < Math.hypot(pinkyMcp.x - wrist.x, pinkyMcp.y - wrist.y) * 1.4;
  const fistRaw = (indexFolded && middleFolded && ringFolded && pinkyFolded) ? 1 : 0;

  // 入屏纵深：tip.z 比 mcp.z 更小（更靠近相机）
  const tipDepth = (indexTip.z + middleTip.z) * 0.5;
  const mcpDepth = (indexMcp.z + middleMcp.z) * 0.5;
  const forwardRaw = Math.max(0, Math.min(1, (mcpDepth - tipDepth + 0.01) * 8));

  fs.hand.grabScore += (Math.max(0, Math.min(1, grabRaw)) - fs.hand.grabScore) * 0.28;
  fs.hand.openScore += (Math.max(0, Math.min(1, openRaw)) - fs.hand.openScore) * 0.18;
  fs.hand.fistScore += (fistRaw - fs.hand.fistScore) * 0.25;
  fs.hand.forwardScore += (forwardRaw - fs.hand.forwardScore) * 0.25;

  // 指针位置 = 食指+中指中点
  const cx = (indexTip.x + middleTip.x) * 0.5;
  const cy = (indexTip.y + middleTip.y) * 0.5;
  fs.hand.pointerX = (1 - cx) * fs.w;
  fs.hand.pointerY = cy * fs.h;

  // aim 方向（剑尖朝向）= mcpCenter - center
  const mcpCx = (indexMcp.x + middleMcp.x) * 0.5;
  const mcpCy = (indexMcp.y + middleMcp.y) * 0.5;
  const aim = normalizeVec2(mcpCx - cx, cy - mcpCy, 1, 0);
  fs.hand.aimX = aim.x;
  fs.hand.aimY = aim.y;
}

// ---- 主渲染入口 ----
function renderFlySwordFx(ctx, width, height, result) {
  const fs = ensureFlySword(width, height);
  const now = performance.now();
  const dt = Math.min(0.05, (now - fs.lastUpdate) / 1000);
  fs.lastUpdate = now;

  // 1. 解析手势
  const hands = result.landmarks || [];
  flySwordUpdateHand(fs, hands.length > 0 ? hands : null);

  // 2. 根据手势决定 formation target
  //  张掌 → 增长剑阵（1→9→36→99）
  //  握拳 → 归宗（gathering=1）
  if (fs.hand.fistScore > 0.6 && fs.hand.visible && fs.gatherTarget < 0.5) {
    fs.gatherTarget = 1;
    fs.gatherStart = now;
  } else if (fs.hand.fistScore < 0.3 && fs.gatherTarget > 0.5) {
    fs.gatherTarget = 0;
    fs.gatherStart = now;
  }
  if (fs.hand.openScore > 0.55 && fs.hand.visible && fs.formationTarget < 99) {
    const newTarget = Math.min(99, fs.formationTarget + 12);
    if (newTarget !== fs.formationTarget) {
      fs.formationTarget = newTarget;
      fs.formationAnimStart = now;
      // 同时取消归宗
      fs.gatherTarget = 0;
      fs.gatherStart = now;
    }
  }
  // 抓握状态：剑跟手
  const grabbing = fs.hand.grabScore > 0.3 && fs.hand.visible;

  // 3. 平滑剑数
  if (fs.formation !== fs.formationTarget) {
    const elapsed = (now - fs.formationAnimStart) / 800;
    const eased = Math.min(1, elapsed);
    const fs_now = fs.formation + (fs.formationTarget - fs.formation) * eased;
    fs.formation = Math.round(fs_now);
    if (fs.formation >= fs.formationTarget) {
      // 重建剑池
      rebuildFlySwordPool(fs);
      fs.formation = fs.swords.length;
    }
  }
  // 4. 平滑归宗
  fs.gather += (fs.gatherTarget - fs.gather) * 0.08;

  // 5. 画背景
  drawFlySwordBackground(ctx, fs);

  // 6. 物理更新每柄剑
  for (let i = 0; i < fs.swords.length; i++) {
    updateFlySwordPhysics(fs, fs.swords[i], grabbing, i, dt, now);
  }

  // 7. 渲染（先画远处的，再画近处的）
  const sortedSwords = fs.swords.slice().sort((a, b) => b.depth - a.depth);
  for (const s of sortedSwords) {
    drawFlySwordTrail(ctx, s, now);
  }
  for (const s of sortedSwords) {
    drawFlySword(ctx, s, now);
  }

  // 8. 剑阵指示文字
  drawFlySwordHud(ctx, fs, now);

  // 9. 输出面板
  const formationPct = Math.min(100, Math.round((fs.formation / 99) * 100));
  const gesturePct = Math.round(Math.max(fs.hand.grabScore, fs.hand.openScore, fs.hand.fistScore) * 100);
  renderOutput([
    { label: "sword count", value: fs.swords.length },
    { label: "grab / open / fist", value: gesturePct },
    { label: "depth", value: Math.round(fs.swords[0]?.depth * 100 || 0) },
    { label: "formation", value: formationPct },
  ]);
}

function rebuildFlySwordPool(fs) {
  // 剑阵布局：分形（黄金角螺旋）
  const oldPool = fs.swords.slice();
  fs.swords = oldPool; // 先保留旧的
  // 实际我们动态扩展
  while (fs.swords.length < fs.formationTarget) {
    const idx = fs.swords.length;
    const w = fs.w, h = fs.h;
    // 初始位置：螺旋散开
    const phi = idx * 2.39996323; // 黄金角
    const r = 80 + Math.sqrt(idx) * 28;
    const x = w * 0.5 + Math.cos(phi) * r;
    const y = h * 0.5 + Math.sin(phi) * r;
    const angle = phi + Math.PI;
    fs.swords.push(makeFlySword(idx, x, y, angle, idx === 0));
  }
  // 截断到目标数
  fs.swords.length = Math.min(fs.swords.length, fs.formationTarget);
}

function updateFlySwordPhysics(fs, s, grabbing, idx, dt, now) {
  // 剑的目标位置取决于：
  //   1. 主剑在抓握状态下：跟手
  //   2. 归宗状态：螺旋汇聚到屏幕中心
  //   3. 展开状态：剑阵布局（黄金角螺旋）+ 缓慢公转
  let targetX, targetY, targetAngle, targetDepth;
  if (fs.gather > 0.05) {
    // 归宗中：螺旋汇聚
    const t = (now - fs.gatherStart) / 1500;
    const eased = 1 - Math.pow(1 - Math.min(1, t), 3);
    const cx = fs.w * 0.5, cy = fs.h * 0.5;
    const phi = idx * 2.39996323 + now * 0.001;
    const r = (1 - eased) * (80 + Math.sqrt(idx) * 28);
    targetX = cx + Math.cos(phi) * r;
    targetY = cy + Math.sin(phi) * r;
    targetAngle = phi + Math.PI / 2;
    targetDepth = eased * 0.6;
  } else if (grabbing && s.isMain) {
    targetX = fs.hand.pointerX;
    targetY = fs.hand.pointerY;
    targetAngle = Math.atan2(fs.hand.aimY, fs.hand.aimX);
    targetDepth = fs.hand.forwardScore;
  } else {
    // 剑阵展开：黄金角公转
    const phi = idx * 2.39996323 + now * 0.00018;
    const r = 80 + Math.sqrt(idx) * 32;
    targetX = fs.w * 0.5 + Math.cos(phi) * r;
    targetY = fs.h * 0.5 + Math.sin(phi) * r;
    targetAngle = phi + Math.PI;
    targetDepth = 0;
  }

  // 弹簧追随
  const pull = s.isMain ? 0.22 : 0.12;
  s.vx += (targetX - s.x) * pull;
  s.vy += (targetY - s.y) * pull;
  s.vx *= 0.84;
  s.vy *= 0.84;
  s.x += s.vx;
  s.y += s.vy;

  // 角度 lerp
  let angleDiff = targetAngle - s.angle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  s.angle += angleDiff * 0.18;

  // 深度
  s.depth += (targetDepth - s.depth) * 0.12;

  // Y 轴 roll：远景剑 roll 更大，看起来在转动
  const targetRoll = s.depth * 0.6 + (s.isMain ? 0 : idx * 0.05);
  s.rollVel += (targetRoll - s.roll) * 0.05;
  s.rollVel *= 0.92;
  s.roll += s.rollVel;

  // glow
  s.glow += ((grabbing && s.isMain ? 1 : 0.4) - s.glow) * 0.1;

  // trail
  s.trail.push({ x: s.x, y: s.y, angle: s.angle, depth: s.depth, glow: s.glow });
  if (s.trail.length > 22) s.trail.shift();
}

function drawFlySwordBackground(ctx, fs) {
  // 暗色径向渐变
  const grad = ctx.createRadialGradient(fs.w * 0.5, fs.h * 0.5, 0, fs.w * 0.5, fs.h * 0.5, fs.h * 0.9);
  grad.addColorStop(0, "#0a1828");
  grad.addColorStop(0.6, "#050a14");
  grad.addColorStop(1, "#01030a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, fs.w, fs.h);

  // 200 颗深度星点
  const t = performance.now() * 0.001;
  ctx.save();
  for (const star of fs.stars) {
    const px = star.x * fs.w;
    const py = star.y * fs.h;
    // 远处的星点小且暗
    const z = 0.4 + (1 - star.z) * 0.6;
    const r = star.r * z;
    const a = (0.3 + (1 - star.z) * 0.5) * (0.5 + 0.5 * Math.sin(t + star.twinkle));
    ctx.fillStyle = `rgba(200,220,255,${a})`;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFlySwordTrail(ctx, s, now) {
  if (s.trail.length < 2) return;
  for (let i = 0; i < s.trail.length; i++) {
    const t = i / s.trail.length;
    const tr = s.trail[i];
    const radius = 6 + t * 22 * (1 + s.depth);
    const alpha = t * (0.15 + s.glow * 0.25);
    ctx.save();
    ctx.translate(tr.x, tr.y);
    ctx.rotate(tr.angle);
    ctx.scale(1 - tr.depth * 0.4, 1 - tr.depth * 0.2);
    // HSL 渐变（更色相丰富）
    const hue = 200 - t * 40;   // 青蓝→紫
    ctx.fillStyle = `hsla(${hue}, 90%, 70%, ${alpha})`;
    ctx.shadowColor = `hsla(${hue}, 90%, 70%, ${alpha * 2})`;
    ctx.shadowBlur = 18 * t;
    ctx.beginPath();
    ctx.ellipse(-radius * 0.8, 0, radius, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFlySword(ctx, s, now) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.angle);
  // 整体缩放（主剑略大，远景剑略小）
  const baseScale = (s.isMain ? 1.0 : 0.85 - s.depth * 0.3) * (1 - s.depth * 0.2);
  ctx.scale(baseScale, baseScale);
  // 3D roll：scale Y 反映 roll
  const rollScaleY = Math.cos(s.roll);
  ctx.scale(1, rollScaleY);

  const depthMix = Math.max(0, Math.min(1, s.depth));
  drawSwordSideView(ctx, 1 - depthMix * 0.75, depthMix, s.glow);
  if (depthMix > 0.05) {
    drawSwordAwayView(ctx, depthMix, depthMix, s.glow);
  }
  ctx.restore();
}

// 剑的侧视图（参考 fly-sword.html drawSwordSideView，复刻 + 微调）
function drawSwordSideView(ctx, alpha, depthMix, glow) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  // 远景压缩
  ctx.scale(1, 1 - depthMix * 0.1);

  // 光晕
  const aura = ctx.createRadialGradient(8, 0, 5, 4, 0, 118);
  aura.addColorStop(0, `rgba(255,255,255,${0.12 + glow * 0.15})`);
  aura.addColorStop(0.42, `rgba(81,205,255,${0.15 + glow * 0.2})`);
  aura.addColorStop(1, `rgba(81,205,255,0)`);
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.ellipse(8, 0, 124, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  // 剑柄
  const handleGradient = ctx.createLinearGradient(-84, -14, -40, 14);
  handleGradient.addColorStop(0, "#1e120d");
  handleGradient.addColorStop(0.45, "#503426");
  handleGradient.addColorStop(1, "#130c09");
  ctx.fillStyle = handleGradient;
  ctx.beginPath();
  traceFlySwordRoundedRect(ctx, -84, -8.5, 38, 17, 8);
  ctx.fill();

  // 缠绕纹路
  ctx.strokeStyle = "rgba(244,220,186,0.22)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const x = -78 + i * 7.6;
    ctx.beginPath();
    ctx.moveTo(x, -7);
    ctx.lineTo(x + 4.5, 7);
    ctx.stroke();
  }

  // 剑首圆球
  const pommelGradient = ctx.createRadialGradient(-87, 0, 1, -87, 0, 10);
  pommelGradient.addColorStop(0, "#fff5d2");
  pommelGradient.addColorStop(0.45, "#d7b179");
  pommelGradient.addColorStop(1, "#785130");
  ctx.fillStyle = pommelGradient;
  ctx.beginPath();
  ctx.ellipse(-90, 0, 7.5, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 护手（带斜切）
  const guardGradient = ctx.createLinearGradient(-45, -28, -10, 28);
  guardGradient.addColorStop(0, "#fff4cf");
  guardGradient.addColorStop(0.34, "#a97745");
  guardGradient.addColorStop(0.68, "#f2d7a8");
  guardGradient.addColorStop(1, "#7a522d");
  ctx.fillStyle = guardGradient;
  ctx.beginPath();
  ctx.moveTo(-46, -5);
  ctx.lineTo(-22, -16);
  ctx.lineTo(-6, -13);
  ctx.lineTo(-16, -4);
  ctx.lineTo(-10, 0);
  ctx.lineTo(-16, 4);
  ctx.lineTo(-6, 13);
  ctx.lineTo(-22, 16);
  ctx.lineTo(-46, 5);
  ctx.lineTo(-26, 0);
  ctx.closePath();
  ctx.fill();

  // 护手中心装饰
  ctx.fillStyle = "#d8b77f";
  ctx.beginPath();
  ctx.ellipse(-18, 0, 6, 6.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // 剑刃主体
  const bladeGradient = ctx.createLinearGradient(-10, -22, 138, 22);
  bladeGradient.addColorStop(0, "#fdfefe");
  bladeGradient.addColorStop(0.18, "#bfd4e6");
  bladeGradient.addColorStop(0.35, "#ffffff");
  bladeGradient.addColorStop(0.55, "#8eb5d6");
  bladeGradient.addColorStop(0.72, "#f8fdff");
  bladeGradient.addColorStop(1, "#7ea3c0");
  ctx.fillStyle = bladeGradient;
  ctx.beginPath();
  ctx.moveTo(-11, -11);
  ctx.lineTo(88, -11);
  ctx.lineTo(128, -1.8);
  ctx.lineTo(136, 0);
  ctx.lineTo(128, 1.8);
  ctx.lineTo(88, 11);
  ctx.lineTo(-11, 11);
  ctx.closePath();
  ctx.fill();

  // 剑刃高光
  ctx.fillStyle = "rgba(255,255,255,0.34)";
  ctx.beginPath();
  ctx.moveTo(-5, -2);
  ctx.lineTo(98, -2);
  ctx.lineTo(126, -0.4);
  ctx.lineTo(98, 1.4);
  ctx.lineTo(-5, 1.4);
  ctx.closePath();
  ctx.fill();

  // 剑脊线
  ctx.strokeStyle = "rgba(255,255,255,0.84)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(128, 0);
  ctx.stroke();

  // 血槽（剑身双侧凹槽线）
  ctx.strokeStyle = "rgba(125,224,255,0.32)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-14, -11.5);
  ctx.lineTo(88, -11.5);
  ctx.lineTo(137, 0);
  ctx.lineTo(88, 11.5);
  ctx.lineTo(-14, 11.5);
  ctx.stroke();

  // 斜纹刻痕
  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(8, -7.2);
  ctx.lineTo(97, -2.5);
  ctx.moveTo(8, 7.2);
  ctx.lineTo(97, 2.5);
  ctx.stroke();

  ctx.restore();
}

// 剑的纵深视图（远处透视）
function drawSwordAwayView(ctx, alpha, depthMix, glow) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  // 光晕
  const aura = ctx.createRadialGradient(-24, 0, 10, 0, 0, 140);
  aura.addColorStop(0, `rgba(255,255,255,${0.12 + glow * 0.15})`);
  aura.addColorStop(0.36, `rgba(97,214,255,${0.18 + glow * 0.22})`);
  aura.addColorStop(1, `rgba(97,214,255,0)`);
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.ellipse(8, 0, 120 - depthMix * 18, 56 - depthMix * 10, 0, 0, Math.PI * 2);
  ctx.fill();

  const nearGuardX = -44, farTipX = 144;
  const midHalfH = 11, farHalfH = 2.6;

  // 护手（远视）
  const guardGradient = ctx.createLinearGradient(nearGuardX - 20, -26, nearGuardX + 36, 26);
  guardGradient.addColorStop(0, "#ffefc9");
  guardGradient.addColorStop(0.4, "#b37b42");
  guardGradient.addColorStop(0.8, "#ffe7b4");
  guardGradient.addColorStop(1, "#7c4f29");
  ctx.fillStyle = guardGradient;
  ctx.beginPath();
  ctx.ellipse(nearGuardX, 0, 24, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // 剑柄
  const handleGradient = ctx.createLinearGradient(-88, -14, -46, 14);
  handleGradient.addColorStop(0, "#120b08");
  handleGradient.addColorStop(0.55, "#533526");
  handleGradient.addColorStop(1, "#0f0907");
  ctx.fillStyle = handleGradient;
  ctx.beginPath();
  traceFlySwordRoundedRect(ctx, -92, -8, 38, 16, 7);
  ctx.fill();

  // 剑身（远视更细长）
  const bladeGradient = ctx.createLinearGradient(-10, -18, farTipX + 10, 18);
  bladeGradient.addColorStop(0, "#ffffff");
  bladeGradient.addColorStop(0.26, "#a8c4da");
  bladeGradient.addColorStop(0.5, "#ffffff");
  bladeGradient.addColorStop(0.72, "#7aa3c4");
  bladeGradient.addColorStop(1, "#eff8ff");
  ctx.fillStyle = bladeGradient;
  ctx.beginPath();
  ctx.moveTo(-8, -midHalfH);
  ctx.lineTo(58, -6);
  ctx.lineTo(farTipX, -farHalfH);
  ctx.lineTo(farTipX + 12, 0);
  ctx.lineTo(farTipX, farHalfH);
  ctx.lineTo(58, 6);
  ctx.lineTo(-8, midHalfH);
  ctx.closePath();
  ctx.fill();

  // 高光
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.moveTo(0, -1.5);
  ctx.lineTo(72, -0.8);
  ctx.lineTo(farTipX + 4, 0);
  ctx.lineTo(72, 0.6);
  ctx.lineTo(0, 1.2);
  ctx.closePath();
  ctx.fill();

  // 描边
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-10, -midHalfH);
  ctx.lineTo(farTipX + 12, 0);
  ctx.lineTo(-10, midHalfH);
  ctx.stroke();

  // 血槽（远视）
  ctx.strokeStyle = "rgba(112,220,255,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -midHalfH - 1);
  ctx.lineTo(58, -7.2);
  ctx.lineTo(farTipX, -farHalfH);
  ctx.moveTo(-10, midHalfH + 1);
  ctx.lineTo(58, 7.2);
  ctx.lineTo(farTipX, farHalfH);
  ctx.stroke();

  // 剑首光
  const pommelGlow = ctx.createRadialGradient(-92, 0, 1, -92, 0, 12);
  pommelGlow.addColorStop(0, "#fff6da");
  pommelGlow.addColorStop(0.45, "#c79a63");
  pommelGlow.addColorStop(1, "#6d4424");
  ctx.fillStyle = pommelGlow;
  ctx.beginPath();
  ctx.ellipse(-96, 0, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function traceFlySwordRoundedRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w * 0.5, h * 0.5));
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawFlySwordHud(ctx, fs, now) {
  // 顶部剑阵信息
  if (fs.formation > 1 || fs.gather > 0.05) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "600 13px ui-monospace, SFMono-Regular, monospace";
    if (fs.gather > 0.05) {
      ctx.fillStyle = `rgba(255, 107, 157, ${fs.gather})`;
      ctx.shadowColor = "rgba(255, 107, 157, 0.6)";
      ctx.shadowBlur = 18;
      ctx.fillText(`✦ 万剑归宗 ✦  ${fs.swords.length} 剑汇聚`, fs.w / 2, fs.h * 0.16);
    } else if (fs.formation > 1) {
      ctx.fillStyle = "rgba(111, 213, 255, 0.85)";
      ctx.shadowColor = "rgba(111, 213, 255, 0.5)";
      ctx.shadowBlur = 12;
      ctx.fillText(`剑阵 · ${fs.formation}/99  剑`, fs.w / 2, fs.h * 0.16);
    }
    ctx.restore();
  }
}

// 离线预览：1 柄主剑静态展示 + 演示
function drawFlySwordPreview(ctx, width, height) {
  const fs = ensureFlySword(width, height);
  const now = performance.now();
  drawFlySwordBackground(ctx, fs);
  // 让剑池中有 9 柄剑做演示（直接 push，绕过 formationTarget 限制）
  while (fs.swords.length < 9) {
    const idx = fs.swords.length;
    const phi = idx * 2.39996323;
    const r = 80 + Math.sqrt(idx) * 28;
    const x = width * 0.5 + Math.cos(phi) * r;
    const y = height * 0.5 + Math.sin(phi) * r;
    const angle = phi + Math.PI;
    fs.swords.push(makeFlySword(idx, x, y, angle, idx === 0));
  }
  // 禁用 gather/formation
  fs.gather = 0;
  fs.formation = 9;
  fs.formationTarget = 9;
  for (let i = 0; i < fs.swords.length; i++) {
    const s = fs.swords[i];
    const phi = i * 2.39996323 + now * 0.00018;
    const r = 80 + Math.sqrt(i) * 32;
    s.x = width * 0.5 + Math.cos(phi) * r;
    s.y = height * 0.5 + Math.sin(phi) * r;
    s.angle = phi + Math.PI;
    s.depth = 0;
    s.roll = 0;
    s.glow = 0.6;
    s.scale = 1;
    s.trail.push({ x: s.x, y: s.y, angle: s.angle, depth: 0, glow: 0.6 });
    if (s.trail.length > 22) s.trail.shift();
  }
  const sorted = fs.swords.slice().sort((a, b) => b.depth - a.depth);
  for (const s of sorted) drawFlySwordTrail(ctx, s, now);
  for (const s of sorted) drawFlySword(ctx, s, now);

  // 引导文字
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "500 14px ui-monospace, SFMono-Regular, monospace";
  ctx.fillStyle = "rgba(220, 240, 255, 0.82)";
  ctx.fillText("启动摄像头 → 食中指并拢抓剑 · 5 指张开出剑阵", width / 2, height * 0.84);
  ctx.font = "500 12px ui-monospace, SFMono-Regular, monospace";
  ctx.fillStyle = "rgba(255, 107, 157, 0.92)";
  ctx.fillText("握拳 → ✦ 万剑归宗 ✦", width / 2, height * 0.9);
  ctx.restore();

  // 顶部 HUD
  drawFlySwordHud(ctx, fs, now);
}

init();

// ============================================================
// 新版蒲公英（参考 pgy.html）
// 关键设计：
//   - 在 state.dandelion 上挂载粒子系统
//   - 在 selectSolution / resize 时初始化
//   - 在 stage pointerdown 时触发 pointerBlow
//   - 每帧用 renderNewDandelionFx 渲染（被 drawFaceResult / paintFaceFallback 调用）
// ============================================================

function ensureDandelion(width, height) {
  if (state.dandelion && state.dandelion.w === width && state.dandelion.h === height) return state.dandelion;
  state.dandelion = {
    w: width,
    h: height,
    center: { x: width * 0.5, y: height * 0.62 },
    stalkPath: [],
    seeds: [],
    glowParticles: [],
    mouth: { visible: false, x: 0.5, y: 0.35, dirX: 0.92, dirY: -0.22, ratio: 0, yaw: 0, pitch: 0 },
    neutralPitchMetric: null,
    currentWindForce: 0,
    currentWindStrength: 0,
    currentWindX: 0,
    currentWindY: 0,
    lastBlowTime: 0,
    frameTime: performance.now(),
  };
  initNewDandelionScene(state.dandelion, width, height);
  return state.dandelion;
}

function initNewDandelionScene(d, width, height) {
  d.w = width;
  d.h = height;
  d.center = { x: width * 0.5, y: height * 0.62 };
  // 茎
  d.stalkPath = [];
  const stalkSteps = 20;
  for (let i = 0; i <= stalkSteps; i++) {
    const t = i / stalkSteps;
    d.stalkPath.push({
      x: d.center.x + Math.sin(t * 2.2) * (14 - t * 5),
      y: d.center.y + t * (height - d.center.y) + Math.sin(t * 4.5) * 3,
    });
  }
  // 250 颗种子
  d.seeds = [];
  for (let i = 0; i < 250; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 46 + Math.pow(Math.random(), 0.58) * 42;
    d.seeds.push(newDandelionSeed(d, angle, dist));
  }
  d.seeds.sort((a, b) => a.depth - b.depth);
  // 36 颗氛围粒子
  d.glowParticles = [];
  for (let i = 0; i < 36; i++) {
    d.glowParticles.push({
      angle: Math.random() * Math.PI * 2,
      radius: 18 + Math.random() * 72,
      size: 0.8 + Math.random() * 2.3,
      speed: 0.15 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.08 + Math.random() * 0.14,
    });
  }
}

function newDandelionSeed(d, angle, distance) {
  const seed = {
    init(d, angle, distance) {
      this.angle = angle;
      this.distance = distance;
      this.attached = true;
      this.x = d.center.x + Math.cos(this.angle) * this.distance;
      this.y = d.center.y + Math.sin(this.angle) * this.distance;
      this.vx = 0;
      this.vy = 0;
      this.rotation = angle;
      this.rotVel = 0;
      this.opacity = 0.55 + Math.random() * 0.4;
      this.drift = Math.random() * 6.28;
      this.size = 0.78 + Math.random() * 0.55;
      this.airCatch = 0.85 + Math.random() * 0.7;
      this.depth = (Math.sin(angle) + 1) * 0.5;
      this.coreRadius = 1.4 + Math.random() * 1.6;
      this.shaftLength = 12 + Math.random() * 7;
      this.fluffLines = [];
      const numLines = 22;
      const spread = Math.PI * 0.92;
      for (let i = 0; i < numLines; i++) {
        const a = -spread * 0.5 + (i / (numLines - 1)) * spread;
        const len = (12 + Math.random() * 8) * this.size;
        this.fluffLines.push({
          endX: len * Math.cos(a),
          endY: len * Math.sin(a),
          alpha: 0.34 + Math.random() * 0.32,
        });
      }
    },
    detach(forceX, forceY) {
      if (!this.attached) return;
      this.attached = false;
      this.vx = forceX + (Math.random() - 0.5) * 0.9;
      this.vy = forceY + (Math.random() - 0.5) * 0.7;
      this.rotVel = (Math.random() - 0.5) * 0.1;
    },
    update(d, frameTime) {
      if (this.attached) {
        this.x = d.center.x + Math.cos(this.angle) * this.distance;
        this.y = d.center.y + Math.sin(this.angle) * this.distance;
        this.rotation = this.angle + Math.sin(frameTime * 0.0015 + this.drift) * 0.04;
      } else {
        const t = frameTime * 0.001;
        this.vx += d.currentWindX * (0.014 + this.airCatch * 0.01);
        this.vy += d.currentWindY * (0.014 + this.airCatch * 0.01);
        this.vx += Math.sin(t * 1.8 + this.drift) * 0.028;
        this.vy += Math.cos(t * 1.4 + this.drift * 1.3) * 0.015;
        this.vy += 0.011 * (0.55 / this.airCatch);
        this.vx *= 0.988;
        this.vy *= 0.986;
        this.x += this.vx;
        this.y += this.vy;
        const targetRotation = Math.atan2(this.vy, this.vx) - Math.PI;
        let rotDiff = targetRotation - this.rotation;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        this.rotVel += rotDiff * 0.028;
        this.rotVel *= 0.9;
        this.rotation += this.rotVel;
      }
    },
    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = this.opacity;
      const shaftLength = this.shaftLength;
      const seedBodyX = -shaftLength - 4.5 * this.size;
      // 茎
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 0.8 * this.size;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-shaftLength, 0);
      ctx.stroke();
      // 中心圆
      ctx.fillStyle = 'rgba(248,248,245,0.78)';
      ctx.beginPath();
      ctx.arc(0, 0, this.coreRadius * this.size, 0, Math.PI * 2);
      ctx.fill();
      // 22 条绒毛
      for (let i = 0; i < this.fluffLines.length; i++) {
        ctx.strokeStyle = 'rgba(255,255,255,' + this.fluffLines[i].alpha + ')';
        ctx.lineWidth = (i % 3 === 0 ? 0.7 : 0.45) * this.size;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.fluffLines[i].endX, this.fluffLines[i].endY);
        ctx.stroke();
      }
      // 外圈弧
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 0.9 * this.size;
      ctx.beginPath();
      ctx.arc(0, 0, 5.5 * this.size, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      // 种子实体（深棕）
      const bodyGradient = ctx.createLinearGradient(seedBodyX - 4, -2, seedBodyX + 4, 2);
      bodyGradient.addColorStop(0, '#786052');
      bodyGradient.addColorStop(1, '#2d1b14');
      ctx.fillStyle = bodyGradient;
      ctx.beginPath();
      ctx.ellipse(seedBodyX, 0, 4.1 * this.size, 1.85 * this.size, 0, 0, Math.PI * 2);
      ctx.fill();
      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.ellipse(seedBodyX + 0.6, -0.35, 1.2 * this.size, 0.45 * this.size, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  };
  seed.init(d, angle, distance);
  return seed;
}

function newDandelionTriggerBlow(d, intensity, dirX, dirY, sourceX, sourceY) {
  const direction = normalizeVec2(dirX, dirY, 0.92, -0.22);
  const force = 1.4 + intensity * 0.055;
  d.seeds.forEach((seed) => {
    if (!seed.attached) return;
    const localX = seed.x - d.center.x;
    const localY = seed.y - d.center.y;
    const norm = Math.hypot(localX, localY) || 1;
    const nx = localX / norm, ny = localY / norm;
    const alignment = nx * direction.x + ny * direction.y;
    const sourceDistance = Math.hypot(seed.x - sourceX, seed.y - sourceY);
    const falloff = Math.max(0.25, Math.min(1, 1 - sourceDistance / Math.max(d.w, d.h)));
    const chance = intensity * (0.28 + Math.max(0, alignment) * 0.9) * falloff;
    if (Math.random() * 100 < chance) {
      seed.detach(
        direction.x * force * (0.9 + Math.random() * 0.4),
        direction.y * force * (0.9 + Math.random() * 0.35)
      );
    }
  });
}

function normalizeVec2(x, y, fx, fy) {
  const len = Math.hypot(x, y);
  if (!len) return { x: fx, y: fy };
  return { x: x / len, y: y / len };
}

function newDandelionDrawBackground(ctx, d, isCamera) {
  if (isCamera) {
    // 摄像头背景 + 暗化叠加（在 drawMirroredVideo 已经画过了，这里只加柔和暗化）
    ctx.fillStyle = 'rgba(8, 14, 20, 0.18)';
    ctx.fillRect(0, 0, d.w, d.h);
  } else {
    // 离线时的渐变背景
    const gradient = ctx.createRadialGradient(d.w * 0.45, d.h * 0.28, 0, d.w * 0.5, d.h * 0.56, d.h * 0.95);
    gradient.addColorStop(0, '#385b67');
    gradient.addColorStop(0.55, '#1f3a47');
    gradient.addColorStop(1, '#0f1c27');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, d.w, d.h);
  }
  // 暗角
  const vignette = ctx.createRadialGradient(d.w * 0.5, d.h * 0.45, d.w * 0.1, d.w * 0.5, d.h * 0.5, d.w * 0.8);
  vignette.addColorStop(0, 'rgba(255,255,255,0)');
  vignette.addColorStop(1, 'rgba(4,8,12,0.34)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, d.w, d.h);
}

function newDandelionDrawAtmosphere(ctx, d) {
  for (let i = 0; i < d.glowParticles.length; i++) {
    const p = d.glowParticles[i];
    const t = d.frameTime * 0.001 * p.speed + p.phase;
    const x = d.center.x + Math.cos(t + p.angle) * p.radius;
    const y = d.center.y + Math.sin(t * 1.2 + p.angle) * p.radius * 0.5;
    ctx.fillStyle = 'rgba(255,255,255,' + p.alpha + ')';
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function newDandelionDrawStalk(ctx, d) {
  // 茎渐变
  const stalkGradient = ctx.createLinearGradient(d.center.x - 30, d.center.y, d.center.x + 50, d.h);
  stalkGradient.addColorStop(0, '#7ea05a');
  stalkGradient.addColorStop(0.5, '#587338');
  stalkGradient.addColorStop(1, '#39511d');
  ctx.beginPath();
  ctx.strokeStyle = stalkGradient;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.moveTo(d.stalkPath[0].x, d.stalkPath[0].y);
  for (let i = 1; i < d.stalkPath.length; i++) {
    ctx.lineTo(d.stalkPath[i].x, d.stalkPath[i].y);
  }
  ctx.stroke();
  // 高光
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(d.stalkPath[0].x - 1, d.stalkPath[0].y);
  for (let i = 1; i < d.stalkPath.length; i++) {
    ctx.lineTo(d.stalkPath[i].x - 1, d.stalkPath[i].y);
  }
  ctx.stroke();
  // 花托光晕
  const glow = ctx.createRadialGradient(d.center.x, d.center.y, 2, d.center.x, d.center.y, 84);
  glow.addColorStop(0, 'rgba(255,245,220,0.16)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(d.center.x, d.center.y, 84, 0, Math.PI * 2);
  ctx.fill();
  // 花托
  const receptacleGradient = ctx.createRadialGradient(d.center.x - 2, d.center.y - 5, 2, d.center.x, d.center.y + 8, 18);
  receptacleGradient.addColorStop(0, '#85984a');
  receptacleGradient.addColorStop(0.55, '#66792f');
  receptacleGradient.addColorStop(1, '#3b4d17');
  ctx.fillStyle = receptacleGradient;
  ctx.beginPath();
  ctx.arc(d.center.x, d.center.y + 3, 13, Math.PI, 0);
  ctx.fill();
  // 花托底部短萼
  ctx.strokeStyle = '#4b6016';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(d.center.x, d.center.y + 2);
    ctx.lineTo(d.center.x - 20 + i * 6.6, d.center.y + 18 + Math.sin(d.frameTime * 0.002 + i) * 2);
    ctx.stroke();
  }
}

function newDandelionDrawMouthWind(ctx, d) {
  // 嘴部气流光束（5 条贝塞尔曲线，沿嘴部方向）
  if (!d.mouth.visible || d.currentWindForce <= 24 || !state.stream) return;
  const mouthX = d.mouth.x * d.w;
  const mouthY = d.mouth.y * d.h;
  const streamLength = 80 + d.currentWindStrength * 18;
  const spread = 22 + d.currentWindStrength * 2.5;
  ctx.save();
  ctx.translate(mouthX, mouthY);
  ctx.rotate(Math.atan2(d.mouth.dirY, d.mouth.dirX));
  const beam = ctx.createLinearGradient(0, 0, streamLength, 0);
  beam.addColorStop(0, 'rgba(255,255,255,0.28)');
  beam.addColorStop(0.55, 'rgba(255,255,255,0.16)');
  beam.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = beam;
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    const offset = i * 6;
    ctx.beginPath();
    ctx.moveTo(0, offset * 0.5);
    ctx.bezierCurveTo(
      streamLength * 0.18,
      offset - spread * 0.18,
      streamLength * 0.62,
      offset + Math.sin(d.frameTime * 0.004 + i) * spread * 0.16,
      streamLength,
      offset
    );
    ctx.stroke();
  }
  ctx.restore();
}

function renderNewDandelionFx(ctx, width, height, result) {
  // 解算 mouth 状态
  const d = ensureDandelion(width, height);
  d.frameTime = performance.now();
  const BLOW_THRESHOLD = 24;
  const MOUTH_OPEN_THRESHOLD = 0.24;
  if (result && result.faceLandmarks && result.faceLandmarks[0]) {
    const lm = result.faceLandmarks[0];
    const leftEye = lm[33], rightEye = lm[263];
    const upperLip = lm[13], lowerLip = lm[14];
    const leftMouth = lm[78], rightMouth = lm[308];
    const mouthHeight = Math.hypot(upperLip.x - lowerLip.x, upperLip.y - lowerLip.y);
    const mouthWidth = Math.max(0.001, Math.hypot(leftMouth.x - rightMouth.x, leftMouth.y - rightMouth.y));
    const mouthCenterX = (leftMouth.x + rightMouth.x) * 0.5;
    const mouthCenterY = (upperLip.y + lowerLip.y) * 0.5;
    const eyeCenterX = (leftEye.x + rightEye.x) * 0.5;
    const eyeCenterY = (leftEye.y + rightEye.y) * 0.5;
    const eyeWidth = Math.max(0.001, Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y));
    const ratio = mouthHeight / mouthWidth;
    const yaw = Math.max(-1.1, Math.min(1.1, ((mouthCenterX - eyeCenterX) / eyeWidth) * 3.5));
    const pitchMetric = (mouthCenterY - eyeCenterY) / eyeWidth;
    if (d.neutralPitchMetric === null) d.neutralPitchMetric = pitchMetric;
    if (ratio < MOUTH_OPEN_THRESHOLD + 0.02) {
      d.neutralPitchMetric = d.neutralPitchMetric + (pitchMetric - d.neutralPitchMetric) * 0.08;
    }
    const pitch = Math.max(-1, Math.min(1, (d.neutralPitchMetric - pitchMetric) * 4.5));
    const posX = Math.max(-1, Math.min(1, (mouthCenterX - 0.5) * 2.2));
    const posY = Math.max(-1, Math.min(1, (0.54 - mouthCenterY) * 2.0));
    const lipTilt = Math.max(-0.5, Math.min(0.5, (rightMouth.y - leftMouth.y) * 12.0));
    let dirX = yaw * 0.85 + posX * 0.7;
    let dirY = pitch * 0.9 + posY * 0.55 - 0.22 - lipTilt * 0.15;
    const n = normalizeVec2(dirX, dirY, 0.92, -0.22);
    d.mouth.visible = true;
    d.mouth.x = 1 - mouthCenterX;
    d.mouth.y = mouthCenterY;
    d.mouth.dirX = n.x;
    d.mouth.dirY = n.y;
    d.mouth.ratio = ratio;
    d.mouth.yaw = yaw;
    d.mouth.pitch = pitch;
    const blowProgress = Math.max(0, Math.min(1, (ratio - MOUTH_OPEN_THRESHOLD) / 0.17));
    d.currentWindForce = blowProgress * 100;
  } else {
    d.currentWindForce = Math.max(0, d.currentWindForce - 5);
    if (d.currentWindForce < 1) d.mouth.visible = false;
  }

  // 推进风速（吹起 + 衰减）
  const vol = d.currentWindForce;
  if (vol > BLOW_THRESHOLD) {
    const targetStrength = (vol - BLOW_THRESHOLD) * 0.09;
    d.currentWindStrength += (targetStrength - d.currentWindStrength) * 0.22;
    d.currentWindX += (d.mouth.dirX * d.currentWindStrength - d.currentWindX) * 0.24;
    d.currentWindY += (d.mouth.dirY * d.currentWindStrength - d.currentWindY) * 0.24;
    if (d.frameTime - d.lastBlowTime > 72) {
      d.lastBlowTime = d.frameTime;
      newDandelionTriggerBlow(d, vol, d.mouth.dirX, d.mouth.dirY, d.mouth.x * d.w, d.mouth.y * d.h);
    }
  } else {
    d.currentWindStrength *= 0.94;
    d.currentWindX *= 0.95;
    d.currentWindY *= 0.95;
  }

  // 背景层（已经在 drawFaceResult 里画过摄像头，所以这里只画 atmosphere / stalk / seeds）
  newDandelionDrawAtmosphere(ctx, d);
  newDandelionDrawStalk(ctx, d);
  newDandelionDrawMouthWind(ctx, d);
  for (let i = 0; i < d.seeds.length; i++) {
    const s = d.seeds[i];
    s.update(d, d.frameTime);
    s.draw(ctx);
  }

  // 输出面板
  let flying = 0;
  for (let i = 0; i < d.seeds.length; i++) if (!d.seeds[i].attached) flying++;
  renderOutput([
    { label: "blow strength", value: Math.round(d.currentWindForce) },
    { label: "mouth yaw", value: Math.round(d.mouth.yaw * 50 + 50) },
    { label: "mouth pitch", value: Math.round(d.mouth.pitch * 50 + 50) },
    { label: "flying seeds", value: Math.min(100, Math.round(flying / 2.5)) },
  ]);
}

// 离线时的蒲公英预览（无摄像头）
function renderNewDandelionPreview(ctx, width, height) {
  const d = ensureDandelion(width, height);
  d.frameTime = performance.now();
  newDandelionDrawBackground(ctx, d, false);
  newDandelionDrawAtmosphere(ctx, d);
  newDandelionDrawStalk(ctx, d);
  for (let i = 0; i < d.seeds.length; i++) {
    const s = d.seeds[i];
    s.update(d, d.frameTime);
    s.draw(ctx);
  }
  renderOutput([
    { label: "blow strength", value: 0 },
    { label: "mouth yaw", value: 50 },
    { label: "mouth pitch", value: 50 },
    { label: "flying seeds", value: 0 },
  ]);
}

// ============================================================
// Hand Composer · 手势乐团
//   - 模型：HandLandmarker（21 关键点 × 最多 2 手）
//   - 识别纯几何（不依赖分类器），速度快、可解释
//   - 关键点索引：
//       0   wrist          手腕
//       1-4 thumb          拇指（tip=4）
//       5-8 index          食指（tip=8）
//       9-12 middle        中指（tip=12）
//       13-16 ring         无名指（tip=16）
//       17-20 pinky        小指（tip=20）
//       坐标 (x,y,z)：x 镜像化后水平、y 垂直、z 深度（手越小 = 越靠近摄像头）
// ============================================================
const HAND = { WRIST:0, THUMB_TIP:4, INDEX_TIP:8, MIDDLE_TIP:12, RING_TIP:16, PINKY_TIP:20,
               INDEX_MCP:5, MIDDLE_MCP:9, RING_MCP:13, PINKY_MCP:17 };

// ---- WebAudio 引擎（懒初始化，必须用户交互后才能启动）----
let audioCtx = null;
function ensureAudio() {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { console.warn(e); audioCtx = null; }
  return audioCtx;
}

function playPiano() {
  if (!state.audioEnabled) return;
  const ctx = ensureAudio(); if (!ctx) return;
  const t = ctx.currentTime;
  // 简化的钢琴音色：基频 + 谐波 + ADSR 包络
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const harm = ctx.createOscillator();
  const harmGain = ctx.createGain();
  osc.type = "triangle";
  harm.type = "sine";
  const baseFreq = 220 * (1 + Math.random() * 0.1); // A3 附近，随机微抖
  osc.frequency.value = baseFreq;
  harm.frequency.value = baseFreq * 2;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.22, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
  harmGain.gain.setValueAtTime(0, t);
  harmGain.gain.linearRampToValueAtTime(0.08, t + 0.01);
  harmGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
  osc.connect(gain).connect(ctx.destination);
  harm.connect(harmGain).connect(ctx.destination);
  osc.start(t); harm.start(t);
  osc.stop(t + 1.3); harm.stop(t + 0.9);
}

function playDrum() {
  if (!state.audioEnabled) return;
  const ctx = ensureAudio(); if (!ctx) return;
  const t = ctx.currentTime;
  // 鼓：白噪声 + 低通 + 快速衰减
  const bufSize = 0.4 * ctx.sampleRate;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 3);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = 220;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.55, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  src.connect(filt).connect(gain).connect(ctx.destination);
  src.start(t);
}

function playClick() {
  if (!state.audioEnabled) return;
  const ctx = ensureAudio(); if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = 1200;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.12, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.1);
}

// ---- 手势几何识别 ----
function fingerExtended(lm, tipIdx, mcpIdx) {
  // 手指伸直判定：tip 到 wrist 的 y 距离 > mcp 到 wrist 的 y 距离的 1.6 倍
  const w = lm[HAND.WRIST], t = lm[tipIdx], m = lm[mcpIdx];
  const dTip = Math.hypot(t.x - w.x, t.y - w.y);
  const dMcp = Math.hypot(m.x - w.x, m.y - w.y);
  return dTip > dMcp * 1.6;
}

function pinchDistance(lm) {
  const t = lm[HAND.THUMB_TIP], i = lm[HAND.INDEX_TIP];
  return Math.hypot(t.x - i.x, t.y - i.y);
}

function snapVelocity(lm) {
  // 中指相对拇指的速度（中指突然靠近拇指 = 弹指）
  const t = lm[HAND.THUMB_TIP], m = lm[HAND.MIDDLE_TIP];
  return Math.hypot(m.x - t.x, m.y - t.y);
}

function classifyHand(lm) {
  // 返回：{ thumb, index, middle, ring, pinky, pinchDist, palmOpen, rock }
  const index = fingerExtended(lm, HAND.INDEX_TIP, HAND.INDEX_MCP);
  const middle = fingerExtended(lm, HAND.MIDDLE_TIP, HAND.MIDDLE_MCP);
  const ring = fingerExtended(lm, HAND.RING_TIP, HAND.RING_MCP);
  const pinky = fingerExtended(lm, HAND.PINKY_TIP, HAND.PINKY_MCP);
  const thumb = fingerExtended(lm, HAND.THUMB_TIP, HAND.INDEX_MCP);
  const pinchDist = pinchDistance(lm);
  const palmOpen = index && middle && ring && pinky;   // 4 指全伸 = 张掌
  const rock = index && pinky && !middle && !ring;     // 食指+小指，其余弯曲
  return { index, middle, ring, pinky, thumb, pinchDist, palmOpen, rock };
}

// ---- 主渲染入口 ----
function drawHandResult(result) {
  const { ctx, width, height } = canvasContext();
  drawMirroredVideo(ctx, width, height);
  const hands = result.landmarks || [];
  const handedness = result.handedness || [];
  drawHandConnections(ctx, width, height, hands);
  drawHandJoints(ctx, width, height, hands);
  renderHandFx(ctx, width, height, hands, handedness);
}

function drawHandConnections(ctx, width, height, hands) {
  // 21 点连线
  const conn = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17],
  ];
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = 2;
  for (let h = 0; h < hands.length; h++) {
    const lm = hands[h];
    ctx.strokeStyle = `rgba(${h === 0 ? "111, 213, 255" : "255, 107, 157"}, 0.85)`;
    for (const [a, b] of conn) {
      const p1 = lm[a], p2 = lm[b];
      if (!p1 || !p2) continue;
      ctx.beginPath();
      ctx.moveTo(width - p1.x * width, p1.y * height);
      ctx.lineTo(width - p2.x * width, p2.y * height);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawHandJoints(ctx, width, height, hands) {
  ctx.save();
  for (let h = 0; h < hands.length; h++) {
    const lm = hands[h];
    const baseColor = h === 0 ? "#6fd5ff" : "#ff6b9d";
    for (let i = 0; i < lm.length; i++) {
      const p = lm[i];
      const r = (i === 0 || i === 4 || i === 8 || i === 12 || i === 16 || i === 20) ? 4 : 2.2;
      ctx.fillStyle = baseColor;
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(width - p.x * width, p.y * height, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function renderHandFx(ctx, width, height, hands, handedness) {
  if (!state.handFx) {
    state.handFx = { lastPinchT:0, lastSnapT:0, snapPulse:0, pinchSustain:0, beats:[], drumImpact:0, lastHandZ:null, rockModeUntil:0 };
  }
  const s = state.handFx;
  const now = performance.now();
  const nowS = now / 1000;

  let pinchStrength = 0;
  let snapIntervalMs = 0;
  let rockActive = false;
  let palmCount = 0;
  const PALM_RADIUS = Math.min(width, height) * 0.18;

  for (let h = 0; h < hands.length; h++) {
    const lm = hands[h];
    const cls = classifyHand(lm);

    // ---- 摇滚 🤘 ----
    if (cls.rock) {
      s.rockModeUntil = now + 1500;
    }
    if (s.rockModeUntil > now) rockActive = true;

    // ---- 捏合（钢琴持续音）----
    if (cls.pinchDist < 0.05) {
      pinchStrength = Math.max(pinchStrength, 1 - cls.pinchDist * 18);
      // 持续触发：节流到每 250ms 一次，避免连续触发
      if (now - s.lastPinchT > 250) {
        s.lastPinchT = now;
        s.pinchSustain = now;
        playPiano();
      }
      // 在指尖位置画发光圈
      const ix = width - lm[HAND.INDEX_TIP].x * width;
      const iy = lm[HAND.INDEX_TIP].y * height;
      drawSoundRing(ctx, ix, iy, h === 0 ? "#ffe066" : "#f6c85f", pinchStrength);
    }

    // ---- 弹指（中指突然靠近拇指）----
    if (snapVelocity(lm) < 0.04 && now - s.lastSnapT > 200) {
      s.lastSnapT = now;
      s.snapPulse = now;
      s.beats.push(now);
      while (s.beats.length && now - s.beats[0] > 4000) s.beats.shift();
      playClick();
      const tipX = width - lm[HAND.MIDDLE_TIP].x * width;
      const tipY = lm[HAND.MIDDLE_TIP].y * height;
      drawSnapMarker(ctx, tipX, tipY, h === 0 ? "#6fd5ff" : "#ff6b9d");
    }

    // ---- 张掌（鼓面）----
    if (cls.palmOpen) {
      palmCount++;
      s.drumImpact = now;
      if (now - (s.lastDrumT || 0) > 350) {
        s.lastDrumT = now;
        playDrum();
      }
      const wristX = width - lm[HAND.WRIST].x * width;
      const wristY = lm[HAND.WRIST].y * height;
      drawDrumImpact(ctx, wristX, wristY, PALM_RADIUS, h === 0 ? "#b9d65b" : "#7757c9");
    }
  }

  // ---- 弹指脉冲衰减 ----
  if (s.snapPulse && now - s.snapPulse < 600) {
    const t = (now - s.snapPulse) / 600;
    drawSnapPulse(ctx, width, height, t, s.beats.length);
  } else if (s.snapPulse) s.snapPulse = 0;

  // ---- 鼓面冲击波衰减 ----
  if (s.drumImpact && now - s.drumImpact < 700) {
    const t = (now - s.drumImpact) / 700;
    drawDrumWave(ctx, width, height, t, palmCount);
  } else if (s.drumImpact && now - s.drumImpact > 700) s.drumImpact = 0;

  // ---- 摇滚模式：霓虹滤镜全开 ----
  if (rockActive) {
    drawRockNeon(ctx, width, height, 1 - Math.min(1, (s.rockModeUntil - now) / 1500));
    s.rockModeUntil -= 0; // 已在上面更新
  }

  // ---- 计算弹指节拍间隔 ----
  if (s.beats.length >= 2) {
    const intervals = [];
    for (let i = 1; i < s.beats.length; i++) intervals.push(s.beats[i] - s.beats[i-1]);
    const avg = intervals.reduce((a,b)=>a+b,0) / intervals.length;
    snapIntervalMs = Math.round(avg);
  }

  renderOutput([
    { label: "hands detected", value: hands.length > 0 ? Math.min(100, hands.length * 50) : 0 },
    { label: "pinch strength", value: Math.round(pinchStrength * 100) },
    { label: "snap BPM", value: snapIntervalMs > 0 ? Math.min(220, Math.round(60000 / snapIntervalMs)) : 0 },
    { label: "rock 🤘 mode", value: rockActive ? 100 : 0 },
  ]);
}

function drawSoundRing(ctx, cx, cy, color, intensity) {
  ctx.save();
  ctx.globalAlpha = Math.min(0.9, intensity);
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 24 * intensity;
  ctx.lineWidth = 2 + intensity * 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, 10 + i * 14 + intensity * 20, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSnapMarker(ctx, cx, cy, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  // 中心十字
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy);
  ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10);
  ctx.stroke();
  // 4 个角的小三角
  for (let a = 0; a < 4; a++) {
    const ang = a * Math.PI / 2 + Math.PI / 4;
    const tx = cx + Math.cos(ang) * 18;
    const ty = cy + Math.sin(ang) * 18;
    ctx.beginPath();
    ctx.arc(tx, ty, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSnapPulse(ctx, width, height, t, beatCount) {
  ctx.save();
  const cx = width / 2;
  const cy = height * 0.5;
  ctx.globalAlpha = (1 - t) * 0.6;
  ctx.strokeStyle = "#6fd5ff";
  ctx.shadowColor = "#6fd5ff";
  ctx.shadowBlur = 18 * (1 - t);
  ctx.lineWidth = 2;
  // 节拍横线
  for (let i = 0; i < Math.min(beatCount, 8); i++) {
    const x = cx - (beatCount - 1) * 18 / 2 + i * 18;
    const alpha = (1 - t) * (1 - i / 8);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(x, cy - 30 - t * 60);
    ctx.lineTo(x, cy - 10);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDrumImpact(ctx, cx, cy, radius, color) {
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 26;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawDrumWave(ctx, width, height, t, palmCount) {
  if (palmCount <= 0) return;
  ctx.save();
  const cx = width / 2;
  const cy = height * 0.6;
  ctx.globalAlpha = (1 - t) * 0.4;
  ctx.strokeStyle = "#b9d65b";
  ctx.shadowColor = "#b9d65b";
  ctx.shadowBlur = 14 * (1 - t);
  ctx.lineWidth = 2 + palmCount;
  for (let i = 0; i < palmCount + 2; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, 50 + i * 60 + t * 120, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRockNeon(ctx, width, height, fadeIn) {
  ctx.save();
  ctx.globalAlpha = 0.35 * fadeIn;
  // 顶部到底部彩色霓虹带
  const g = ctx.createLinearGradient(0, 0, width, 0);
  ["#ff6b9d","#f6c85f","#b9d65b","#6fd5ff","#7757c9","#ff6b9d"].forEach((c,i)=>g.addColorStop(i/5, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, 4);
  ctx.fillRect(0, height-4, width, 4);
  // 中央扫描线
  ctx.globalAlpha = 0.15 * fadeIn;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.05 * fadeIn})`;
    ctx.fillRect(0, (i + 0.5) * height / 8, width, 1);
  }
  ctx.restore();
  // 摇滚大字符
  ctx.save();
  ctx.globalAlpha = fadeIn;
  ctx.font = "900 96px ui-monospace, SFMono-Regular, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ff6b9d";
  ctx.shadowColor = "#6fd5ff";
  ctx.shadowBlur = 30;
  ctx.fillText("🤘", width / 2, height * 0.18);
  ctx.restore();
}

// ---- 离线预览 ----
function drawHandComposerPreview(ctx, width, height) {
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "rgba(20, 8, 32, 0.95)");
  bg.addColorStop(1, "rgba(4, 6, 14, 0.95)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const cx1 = width * 0.32, cx2 = width * 0.68;
  const cy = height * 0.5;
  const now = performance.now();
  const t = (now % 2200) / 2200;

  // 两只手的骨架（21 点）模拟：5 指伸开
  drawPreviewHand(ctx, cx1, cy, width * 0.12, t, "#6fd5ff");
  drawPreviewHand(ctx, cx2, cy, width * 0.12, t + 0.5, "#ff6b9d");

  // 中间鼓面
  const drumR = Math.min(width, height) * 0.18;
  ctx.save();
  ctx.strokeStyle = "rgba(185, 214, 91, 0.6)";
  ctx.shadowColor = "#b9d65b";
  ctx.shadowBlur = 24 * (1 - t);
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now * 0.005);
  ctx.beginPath();
  ctx.arc(width / 2, height * 0.55, drumR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 文字引导
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "500 14px ui-monospace, SFMono-Regular, monospace";
  ctx.fillStyle = "rgba(220, 240, 255, 0.82)";
  ctx.fillText("启动摄像头 → 捏合 = 钢琴  ·  弹指 = 节拍", width / 2, height * 0.82);
  ctx.font = "500 12px ui-monospace, SFMono-Regular, monospace";
  ctx.fillStyle = "rgba(255, 224, 102, 0.9)";
  ctx.fillText("张掌 = 鼓面  ·  食指+小指 🤘 = 霓虹滤镜", width / 2, height * 0.88);
  ctx.restore();
}

function drawPreviewHand(ctx, cx, cy, scale, phase, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  // 模拟手腕 + 5 指张开
  const wristY = cy + scale * 0.9;
  ctx.beginPath();
  ctx.moveTo(cx, wristY);
  ctx.lineTo(cx, cy);
  ctx.stroke();
  // 5 指
  const fingerAngles = [-0.7, -0.35, 0, 0.35, 0.7];
  for (let i = 0; i < 5; i++) {
    const a = fingerAngles[i];
    const tipX = cx + Math.sin(a) * scale * 1.4;
    const tipY = cy - Math.cos(a) * scale * 1.4;
    // 指节弯曲微抖动
    const bend = Math.sin(phase * Math.PI * 2 + i) * 0.2;
    const midX = cx + Math.sin(a + bend * 0.1) * scale * 0.7;
    const midY = cy - Math.cos(a + bend * 0.1) * scale * 0.7;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(midX, midY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tipX, tipY, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // 手腕点
  ctx.beginPath();
  ctx.arc(cx, wristY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
