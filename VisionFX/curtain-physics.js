// ============================================================
// curtain-physics.js — 幕布物理：Verlet cloth + 对角约束 + 弯曲约束 + 阻尼 + 速度限制
// ============================================================

const CURTAIN_SOFT_GRAB_RADIUS = 92;
const CURTAIN_MAX_GRAB_STEP = 46;

/**
 * 初始化幕布布料网格
 */
export function initCurtainCloth(width, height, force = false) {
  const curtain = window._curtainState;
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

  // 创建点
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = baseX + x * spacingX;
      const py = baseY + y * spacingY;
      points.push({
        x: px, y: py,
        oldX: px, oldY: py,
        homeX: px, homeY: py,
        pinned: y === 0,
        jitter: 0,
      });
    }
  }

  // ---- 基础约束（水平 + 垂直） ----
  const addStick = (a, b) => {
    const p1 = points[a];
    const p2 = points[b];
    sticks.push({ p1, p2, len: Math.hypot(p2.x - p1.x, p2.y - p1.y) });
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (x < cols - 1) addStick(i, i + 1);       // 水平
      if (y < rows - 1) addStick(i, i + cols);     // 垂直
    }
  }

  // ---- 对角线约束（抗菱形畸变） ----
  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const i = y * cols + x;
      addStick(i, i + cols + 1);  // 右下对角
      addStick(i + 1, i + cols);  // 左下对角
    }
  }

  // ---- 弯曲约束（跨 2 格，增加挺括感） ----
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols - 2; x++) {
      const i = y * cols + x;
      sticks.push({
        p1: points[i],
        p2: points[i + 2],
        len: Math.hypot(points[i + 2].x - points[i].x, points[i + 2].y - points[i].y),
        bending: true, // 标记为弯曲约束
      });
    }
  }
  for (let y = 0; y < rows - 2; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      sticks.push({
        p1: points[i],
        p2: points[i + cols * 2],
        len: Math.hypot(points[i + cols * 2].x - points[i].x, points[i + cols * 2].y - points[i].y),
        bending: true,
      });
    }
  }

  curtain.cloth = {
    cols, rows, points, sticks,
    baseX, baseY, width: clothW, height: clothH,
    spacingX, spacingY,
    thrown: false, revealed: false, recovering: false,
  };
  curtain.pointer = { active: false, node: null, x: 0, y: 0 };
  curtain.hand = { node: null, softNodes: [] };
  curtain.particles = [];
  curtain.lastSize = sizeKey;
  return curtain.cloth;
}

/**
 * 更新幕布物理（每帧调用）
 */
export function updateCurtainPhysics(cloth, handGrab, width, height) {
  const curtain = window._curtainState;
  const pointer = curtain.pointer;
  const hand = curtain.hand;
  const grabRadius = Math.min(width, height) * 0.18;
  const recoveryZone = height * 0.42;

  // ---- 恢复检测 ----
  if (cloth.revealed && !cloth.recovering) {
    if (pointer.active && pointer.y < recoveryZone) beginCurtainRecovery(cloth, pointer.x, pointer.y, height);
    if (handGrab.pinching && handGrab.y < recoveryZone) beginCurtainRecovery(cloth, handGrab.x, handGrab.y, height);
  }

  // ---- 指针抓取节点初始化 ----
  const pointerEnabled = !window._curtainState.stream;
  if (pointerEnabled && pointer.active && !pointer.node) {
    pointer.node = cloth.recovering
      ? findNearestCurtainNode(cloth, pointer.x, pointer.y, Math.max(grabRadius, cloth.width))
      : findNearestCurtainNode(cloth, pointer.x, pointer.y, grabRadius);
  }
  if (!pointerEnabled || !pointer.active) pointer.node = null;

  // ---- 手势软抓取 ----
  if (handGrab.pinching && !hand.softNodes?.length) {
    const softRadius = cloth.recovering
      ? Math.max(grabRadius, cloth.width)
      : Math.max(CURTAIN_SOFT_GRAB_RADIUS, grabRadius * 0.72);
    hand.softNodes = findCurtainSoftGrabNodes(cloth, handGrab.x, handGrab.y, softRadius);
    hand.node = hand.softNodes[0]?.node || null;
  }
  if (!handGrab.pinching) {
    hand.node = null;
    hand.softNodes = [];
  }

  // ---- 应用抓取力 ----
  const grabbed = new Set();
  if (pointer.node) {
    pinCurtainNode(pointer.node, pointer.x, pointer.y);
    grabbed.add(pointer.node);
  }
  if (hand.softNodes?.length) {
    for (const grab of hand.softNodes) {
      if (grabbed.has(grab.node)) continue;
      softPullCurtainNode(grab, handGrab.x, handGrab.y);
      grabbed.add(grab.node);
    }
  }

  // ---- 抛投检测 ----
  for (const node of grabbed) {
    if (!cloth.recovering && node.y < cloth.baseY - height * 0.08) cloth.thrown = true;
  }

  // ---- Verlet 积分 ----
  let offscreen = cloth.thrown;
  for (const point of cloth.points) {
    if (cloth.thrown || cloth.recovering) point.pinned = false;
    if (!point.pinned && !grabbed.has(point)) {
      if (!cloth.thrown && !cloth.recovering) {
        // 静止状态：回到 home
        point.oldX = point.homeX;
        point.oldY = point.homeY;
        point.x = point.homeX;
        point.y = point.homeY;
        continue;
      }

      // ---- 阻尼 ----
      const damping = cloth.recovering ? 0.92 : 0.94;

      // 速度限制
      let vx = (point.x - point.oldX) * damping;
      let vy = (point.y - point.oldY) * damping;
      const maxSpeed = cloth.recovering ? 28 : 18;
      const speed = Math.hypot(vx, vy);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        vx *= scale;
        vy *= scale;
      }

      // 目标位置
      const targetX = point.homeX;
      const targetY = cloth.thrown ? -height * 0.82 : point.homeY;

      // ---- 释放速度估计（recovering 时加速恢复） ----
      const recoverVelocity = cloth.recovering ? (vy * 0.15) : 0;

      // 恢复力
      const restore = cloth.thrown ? 0.11 : cloth.recovering ? 0.055 : 0.002;

      point.oldX = point.x;
      point.oldY = point.y;
      point.x += vx + (targetX - point.x) * restore;
      point.y += vy + (targetY - point.y) * restore + (cloth.thrown ? 0 : 0.08) + recoverVelocity;
    }
    if (point.y > -60) offscreen = false;
  }

  // ---- 约束求解迭代 ----
  const iterations = cloth.recovering ? 12 : 9;
  for (let i = 0; i < iterations; i++) {
    for (const stick of cloth.sticks) {
      const dx = stick.p2.x - stick.p1.x;
      const dy = stick.p2.y - stick.p1.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const diff = (stick.len - dist) / dist * 0.5;

      // 弯曲约束权重更低
      const factor = stick.bending ? 0.25 : 0.5;
      const ox = dx * diff * factor * 0.62;
      const oy = dy * diff * factor * 0.62;

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

  // ---- 状态转换 ----
  if (offscreen && !cloth.revealed) {
    cloth.revealed = true;
    cloth.recovering = false;
    spawnCurtainRevealParticles(cloth);
  }

  if (cloth.recovering && isCurtainRecovered(cloth, grabbed)) {
    settleCurtainAtHome(cloth);
  }
}

/**
 * 开始幕布恢复
 */
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
  window._curtainState.pointer.node = null;
  window._curtainState.hand.node = null;
  window._curtainState.hand.softNodes = [];

  const firstNode = findNearestCurtainNode(cloth, x, y, Math.max(cloth.width, cloth.height));
  if (firstNode) pinCurtainNode(firstNode, x, y);
}

/**
 * 检测幕布是否已恢复
 */
function isCurtainRecovered(cloth, grabbed) {
  const pulledEnough = [...grabbed].some((node) => node.y > cloth.baseY + cloth.height * 0.44);
  if (pulledEnough) return true;

  let averageOffset = 0;
  for (const point of cloth.points) averageOffset += Math.abs(point.y - point.homeY);
  averageOffset /= cloth.points.length;
  return averageOffset < cloth.spacingY * 1.35;
}

/**
 * 结算幕布到 home 位置
 */
export function settleCurtainAtHome(cloth) {
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

/**
 * 查找最近节点
 */
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

/**
 * 软抓取：多点按距离衰减受力
 */
export function findCurtainSoftGrabNodes(cloth, x, y, radius) {
  const grabs = [];
  const radiusSq = radius * radius;
  for (const point of cloth.points) {
    if (point.pinned) continue;
    const dx = point.x - x;
    const dy = point.y - y;
    const d = dx * dx + dy * dy;
    if (d > radiusSq) continue;
    const normalized = Math.sqrt(d) / radius;
    const weight = Math.max(0.12, (1 - normalized) ** 1.75);
    grabs.push({
      node: point,
      offsetX: dx,
      offsetY: dy,
      weight,
      d,
    });
  }
  grabs.sort((a, b) => a.d - b.d);
  return grabs.slice(0, 24);
}

/**
 * 钉死节点（指针抓取）
 */
export function pinCurtainNode(node, x, y) {
  node.oldX = node.x;
  node.oldY = node.y;
  node.x = x;
  node.y = y;
}

/**
 * 软拉节点（手势抓取）
 */
export function softPullCurtainNode(grab, x, y) {
  const node = grab.node;
  const targetX = x + grab.offsetX * 0.62;
  const targetY = y + grab.offsetY * 0.62;
  const strength = 0.32 + grab.weight * 0.46;
  let dx = (targetX - node.x) * strength;
  let dy = (targetY - node.y) * strength;
  const step = Math.hypot(dx, dy);
  const maxStep = CURTAIN_MAX_GRAB_STEP * (0.45 + grab.weight);
  if (step > maxStep) {
    const scale = maxStep / step;
    dx *= scale;
    dy *= scale;
  }
  node.oldX = node.x - dx * 0.18;
  node.oldY = node.y - dy * 0.18;
  node.x += dx;
  node.y += dy;
}

/**
 * 获取幕布外轮廓
 */
export function getCurtainPerimeter(cloth) {
  const outline = [];
  for (let x = 0; x < cloth.cols; x++) outline.push(cloth.points[x]);
  for (let y = 1; y < cloth.rows; y++) outline.push(cloth.points[y * cloth.cols + cloth.cols - 1]);
  for (let x = cloth.cols - 2; x >= 0; x--) outline.push(cloth.points[(cloth.rows - 1) * cloth.cols + x]);
  for (let y = cloth.rows - 2; y > 0; y--) outline.push(cloth.points[y * cloth.cols]);
  return outline;
}

/**
 * 生成幕布揭示粒子
 */
export function spawnCurtainRevealParticles(cloth) {
  const particles = window._curtainState.particles;
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

/**
 * 绘制幕布粒子
 */
export function drawCurtainParticles(ctx, particles) {
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
