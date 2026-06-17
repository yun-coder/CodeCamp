// ============================================================
// gesture-filter.js — 手势滤波：EMA + 迟滞阈值 + 多帧确认 + 丢帧保持
// 替代原 app.js 中的 createCurtainGestureFilter + updateCurtainGestureFilter + getCurtainHandGrab
// ============================================================

const CURTAIN_PINCH_OPEN = 0.075;   // 打开阈值（距离 < 此值 = 判定为捏合）
const CURTAIN_PINCH_CLOSE = 0.11;   // 关闭阈值（距离 > 此值 = 判定为松开）
// 注意：关闭 > 打开 = 迟滞，防止临界抖动
const CURTAIN_MISS_HOLD_FRAMES = 10; // 丢帧保持帧数
const CURTAIN_EMA_ALPHA_BASE = 0.35; // EMA 基础平滑系数
const CURTAIN_EMA_ALPHA_MAX = 0.65;  // 速度自适应上限
const CURTAIN_EMA_ALPHA_MIN = 0.15;  // 速度自适应下限

export class CurtainGestureFilter {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.rawX = 0;
    this.rawY = 0;
    this.vx = 0;
    this.vy = 0;
    this.pinching = false;
    this.present = false;
    this.confidence = 0;
    this.distance = 1;
    this.lastT = 0;
    this.missed = 0;
    this.consecutivePinchFrames = 0;
    this.consecutiveOpenFrames = 0;
    this.minConsecutivePinch = 3; // 多帧确认：连续捏合帧数才触发
    this.minConsecutiveOpen = 5;  // 多帧确认：连续松开帧数才取消
  }

  /**
   * 处理原始手势样本，返回滤波后状态
   * @param {Object|null} sample - { present, pinching, x, y, distance }
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   */
  update(sample, width, height) {
    const now = performance.now();
    const dt = this.lastT
      ? Math.min(0.08, Math.max(0.001, (now - this.lastT) / 1000))
      : 1 / 60;
    this.lastT = now;

    if (!sample?.present) {
      this._onMiss(dt, width, height);
      return this._snapshot();
    }

    this.missed = 0;
    this.present = true;

    // ---- EMA 平滑位置 ----
    const speed = Math.hypot(sample.x - this.x, sample.y - this.y) / Math.max(dt, 0.001);
    const speedNorm = speed / Math.max(width, height);
    const alpha = Math.min(CURTAIN_EMA_ALPHA_MAX,
      Math.max(CURTAIN_EMA_ALPHA_MIN,
        CURTAIN_EMA_ALPHA_BASE + speedNorm * 0.3
      )
    );

    // 保存原始样本
    this.rawX = sample.x;
    this.rawY = sample.y;
    this.distance = sample.distance;

    // 首次初始化
    if (!this.x && !this.y) {
      this.x = sample.x;
      this.y = sample.y;
      this.rawX = sample.x;
      this.rawY = sample.y;
      this.consecutivePinchFrames = 0;
      this.consecutiveOpenFrames = 0;
    }

    // EMA 更新
    const nextX = this.x + (sample.x - this.x) * alpha;
    const nextY = this.y + (sample.y - this.y) * alpha;
    this.vx = (nextX - this.x) / dt;
    this.vy = (nextY - this.y) / dt;
    this.x = nextX;
    this.y = nextY;

    // ---- 迟滞 + 多帧确认 捏合判定 ----
    // 使用滤波后的位置计算捏合距离（如果原始样本带距离就用原始距离）
    const isPinchingRaw = sample.distance < CURTAIN_PINCH_OPEN;

    if (this.pinching) {
      // 已在捏合状态：需要距离 >= 关闭阈值才算松开
      if (sample.distance >= CURTAIN_PINCH_CLOSE) {
        this.consecutiveOpenFrames++;
        if (this.consecutiveOpenFrames >= this.minConsecutiveOpen) {
          this.pinching = false;
          this.consecutivePinchFrames = 0;
          this.consecutiveOpenFrames = 0;
        }
      } else {
        this.consecutivePinchFrames++;
        this.confidence = Math.min(1, this.confidence + 0.15);
        this.consecutiveOpenFrames = 0;
      }
    } else {
      // 未捏合：需要连续多帧判定为捏合才触发
      if (isPinchingRaw) {
        this.consecutivePinchFrames++;
        if (this.consecutivePinchFrames >= this.minConsecutivePinch) {
          this.pinching = true;
          this.consecutiveOpenFrames = 0;
        }
        this.confidence = Math.min(1, this.confidence + 0.2);
      } else {
        this.consecutiveOpenFrames++;
        this.consecutivePinchFrames = 0;
        this.confidence = Math.max(0, this.confidence - 0.08);
        this.consecutiveOpenFrames = 0; // 重置
      }
    }

    return this._snapshot();
  }

  _onMiss(dt, width, height) {
    this.missed++;
    this.confidence = Math.max(0, this.confidence - 0.12);

    if (this.missed <= CURTAIN_MISS_HOLD_FRAMES && this.confidence > 0.1) {
      this.present = true;
      // 丢失期间保持上次滤波状态
    } else {
      this.present = false;
      this.pinching = false;
      this.consecutivePinchFrames = 0;
      this.consecutiveOpenFrames = 0;
    }
  }

  _snapshot() {
    return {
      present: this.present,
      pinching: this.pinching,
      x: this.x,
      y: this.y,
      rawX: this.rawX,
      rawY: this.rawY,
      vx: this.vx,
      vy: this.vy,
      confidence: Math.round(this.confidence * 100),
      distance: this.distance,
    };
  }
}
