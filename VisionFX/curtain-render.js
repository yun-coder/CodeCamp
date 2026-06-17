// curtain-render.js — 幕布渲染：边缘羽化 + 阴影 + 运动模糊

import { drawCurtainParticles, getCurtainPerimeter } from "./curtain-physics.js";

/**
 * 幕布主渲染循环（p5.js draw 内调用）
 */
export function renderRealityCurtain(p, handGrab) {
  const width = p.width;
  const height = p.height;
  const curtain = window._curtainState;
  const cloth = curtain.cloth || initCurtainClothForRender(p, width, height);
  const ctx = p.drawingContext;
  // Debug logging intentionally disabled for the demo console.
  curtain.prevFrame = null;

  const effectActive = shouldRenderCurtainEffect(curtain, cloth, handGrab);
  if (!effectActive) {
    drawRealityBase(ctx, width, height);
    if (p.frameCount % 12 === 0) {
      renderOutput([
        { label: "waiting gesture", value: handGrab.confidence || 0 },
        { label: "curtain", value: 0 },
      ]);
    }
    return;
  }

  // 运动模糊：衰减上一帧
  if (false && curtain.prevFrame && !cloth.recovered) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.drawImage(curtain.prevFrame, 0, 0, width, height);
    ctx.restore();
    ctx.globalAlpha = 1;
  } else {
    // 先画摄像头现实层作为背景
    drawRealityBase(ctx, width, height);
  }

  // 绘制底层（隐藏媒体）
  ctx.save();
  ctx.beginPath();
  ctx.rect(cloth.baseX, cloth.baseY, cloth.width, cloth.height);
  ctx.clip();
  drawHiddenLayer(ctx, width, height, curtain.media || curtain.defaultMedia);
  ctx.restore();

  // 绘制幕布
  if (!cloth.revealed) {
    const perimeter = getCurtainPerimeter(cloth);
    drawCurtainSurface(ctx, cloth);
    drawCurtainFeatheredEdge(ctx, perimeter);
    drawCurtainShadow(ctx, perimeter);
    drawCurtainHighlight(ctx, perimeter);
    drawCurtainShading(ctx, cloth);
  }

  // 粒子
  if (handGrab.pinching || cloth.thrown || cloth.recovering) {
    drawCurtainParticles(ctx, curtain.particles);
  }

  drawGrabHint(p, handGrab);

  // 缓存当前帧用于运动模糊
  try { curtain.prevFrame = p.canvas; } catch(e) {}

  // 输出面板
  if (p.frameCount % 12 === 0) {
    renderOutput([
      { label: handGrab.pinching ? "gesture active" : "waiting gesture", value: handGrab.pinching ? handGrab.confidence || 100 : handGrab.confidence || 0 },
      { label: cloth.revealed ? "revealed" : "curtain", value: cloth.revealed ? 100 : 72 },
    ]);
  }
}

function shouldRenderCurtainEffect(curtain, cloth, handGrab) {
  if (!curtain.stream) return true;
  return Boolean(
    handGrab.present ||
    handGrab.pinching ||
    cloth.thrown ||
    cloth.recovering ||
    cloth.revealed
  );
}

function initCurtainClothForRender(p, width, height) {
  const curtain = window._curtainState;
  if (!curtain.cloth) initCurtainClothForRender(width, height, true);
  return curtain.cloth;
}

function drawCurtainSurface(ctx, cloth) {
  const { cols, rows, points, baseX, baseY, width: cw, height: ch } = cloth;
  ctx.fillStyle = "rgba(34, 48, 56, 0.68)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
  ctx.lineWidth = 0.5;
  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const i = y * cols + x;
      const p1 = points[i], p2 = points[i+1];
      const p3 = points[(y+1)*cols+x+1], p4 = points[(y+1)*cols+x];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawCurtainFeatheredEdge(ctx, perimeter) {
  if (!perimeter.length) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.lineWidth = 5;
  drawPerimeterPath(ctx, perimeter);
  ctx.stroke();
  ctx.strokeStyle = "rgba(30, 42, 55, 0.16)";
  ctx.lineWidth = 2.5;
  drawPerimeterPath(ctx, perimeter);
  ctx.stroke();
  ctx.restore();
}

function drawCurtainShadow(ctx, perimeter) {
  if (!perimeter.length) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(0,0,0,0.22)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.strokeStyle = "rgba(0,0,0,0.01)";
  ctx.lineWidth = 1;
  drawPerimeterPath(ctx, perimeter);
  ctx.stroke();
  ctx.restore();
}

function drawCurtainHighlight(ctx, perimeter) {
  if (!perimeter.length) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(200,240,255,0.12)";
  ctx.lineWidth = 1;
  drawPerimeterPath(ctx, perimeter);
  ctx.stroke();
  ctx.shadowColor = "rgba(215,255,255,0.18)";
  ctx.shadowBlur = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1;
  drawPerimeterPath(ctx, perimeter);
  ctx.stroke();
  ctx.restore();
}

function drawPerimeterPath(ctx, perimeter) {
  ctx.beginPath();
  for (let i = 0; i < perimeter.length + 3; i++) {
    const pt = perimeter[i % perimeter.length];
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }
  ctx.closePath();
}

export function drawCurtainShading(ctx, cloth) {
  const baseArea = cloth.spacingX * cloth.spacingY;
  for (let y = 0; y < cloth.rows - 1; y++) {
    for (let x = 0; x < cloth.cols - 1; x++) {
      const p1 = cloth.points[y*cloth.cols+x];
      const p2 = cloth.points[y*cloth.cols+x+1];
      const p3 = cloth.points[(y+1)*cloth.cols+x+1];
      const p4 = cloth.points[(y+1)*cloth.cols+x];
      const area = Math.abs((p2.x-p1.x)*(p4.y-p1.y)-(p4.x-p1.x)*(p2.y-p1.y));
      const ratio = area / baseArea;
      if (ratio < 0.94 || ratio > 1.08) {
        const alpha = ratio < 0.94 ? Math.min(0.09,(0.94-ratio)*0.28) : Math.min(0.06,(ratio-1.08)*0.16);
        ctx.fillStyle = ratio < 0.94 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y);
        ctx.lineTo(p3.x,p3.y); ctx.lineTo(p4.x,p4.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

function drawHiddenLayer(ctx, width, height, media) {
  if (media?.el) {
    const sw = media.el.videoWidth || media.el.naturalWidth;
    const sh = media.el.videoHeight || media.el.naturalHeight;
    if (sw && sh) { drawCoverElement(ctx, media.el, sw, sh, 0, 0, width, height); return; }
  }
  const t = performance.now() * 0.001;
  const grad = ctx.createLinearGradient(0,0,width,height);
  grad.addColorStop(0, "#00111f");
  grad.addColorStop(0.42, "#00667d");
  grad.addColorStop(1, "#c2fff3");
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,width,height);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 14; i++) {
    const y = height*(0.2+i*0.06);
    ctx.beginPath();
    ctx.moveTo(0,y);
    for (let x = 0; x <= width+24; x += 18)
      ctx.lineTo(x, y + Math.sin(x*0.018+t*(1.2+i*0.08)+i)*(7+i*0.7));
    ctx.strokeStyle = `rgba(230,255,255,${0.24-i*0.012})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();
}

function drawCoverElement(ctx, el, sW, sH, x, y, w, h) {
  const sr = sW/sH, tr = w/h;
  let sx=0,sy=0,sw=sW,sh=sH;
  if (sr > tr) { sw = sH*tr; sx=(sW-sw)/2; }
  else { sh = sW/tr; sy=(sH-sh)/2; }
  ctx.drawImage(el, sx,sy,sw,sh, x,y,w,h);
}

function drawGrabHint(p, handGrab) {
  if (!handGrab.pinching) return;
  p.push(); p.noFill(); p.stroke(224,254,255,150); p.strokeWeight(1.5);
  p.circle(handGrab.x, handGrab.y, 28); p.pop();
}

function renderOutput(rows) {
  const curtain = window._curtainState;
  if (!curtain || !curtain._els || !curtain._els.output) return;
  if (!rows.length) {
    curtain._els.output.innerHTML = `<p class="note">运行后这里会显示模型输出。</p>`;
    return;
  }
  curtain._els.output.innerHTML = `<div class="metric-list">${rows.map(r=>
    `<div class="metric"><div class="metric-head"><span>${r.label}</span><span>${r.value}%</span></div>`+
    `<div class="bar"><span style="width:${Math.max(0,Math.min(100,r.value))}%"></span></div></div>`).join("")}</div>`;
}

export function drawRealityBase(ctx, width, height) {
  const curtain = window._curtainState;
  const els = curtain._els;
  if (!els) return;
  if (hasUsableVideoFrame(els.video)) {
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    drawCoverElement(ctx, els.video, els.video.videoWidth, els.video.videoHeight, 0, 0, width, height);
    ctx.restore();
    return;
  }
  const grad = ctx.createLinearGradient(0,0,width,height);
  grad.addColorStop(0,"#1c2a30");
  grad.addColorStop(0.52,"#23323a");
  grad.addColorStop(1,"#13261f");
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,width,height);
  const wash = ctx.createLinearGradient(0, height * 0.25, width, height * 0.8);
  wash.addColorStop(0, "rgba(16,184,166,0.16)");
  wash.addColorStop(0.5, "rgba(214,167,42,0.08)");
  wash.addColorStop(1, "rgba(73,163,255,0.12)");
  ctx.fillStyle = wash;
  ctx.fillRect(0,0,width,height);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 42) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,height); ctx.stroke(); }
  for (let y = 0; y < height; y += 42) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke(); }
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "700 18px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("启动摄像头后，这里会成为实时现实层", width/2, height*0.55);
  ctx.textAlign = "start";
}

function hasUsableVideoFrame(video) {
  return Boolean(
    video &&
    video.videoWidth > 0 &&
    video.videoHeight > 0 &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
  );
}
