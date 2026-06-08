<template>
  <div class="ruler-wrapper">
    <!-- 顶部行：横向标尺 -->
    <div class="top-row">
      <canvas
        ref="horizontalRulerRef"
        class="horizontal-ruler"
        :width="canvasWidth + rulerSize + 5 * scale"
        :height="rulerSize"
      ></canvas>
    </div>

    <!-- 底部行：纵向标尺 + 画布 -->
    <div class="bottom-row">
      <div class="vertical-ruler-wrapper">
        <canvas
          ref="verticalRulerRef"
          class="vertical-ruler"
          :width="rulerSize"
          :height="canvasHeight + 5 * scale"
        ></canvas>
      </div>
      <div class="canvas-content">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, watch, nextTick} from 'vue';

const props = defineProps({
  canvasWidth: {
    type: Number,
    required: true
  },
  canvasHeight: {
    type: Number,
    required: true
  },
  scale: {
    type: Number,
    default: 3.78 // 1mm = 3.78px at 96dpi
  }
});

const rulerSize = 30; // 标尺宽度/高度
const horizontalRulerRef = ref(null);
const verticalRulerRef = ref(null);

onMounted(() => {
  drawRulers();
});

watch(() => [props.canvasWidth, props.canvasHeight], () => {
  nextTick(()=>{
    drawRulers();
  })
});

const drawRulers = () => {
  drawHorizontalRuler();
  drawVerticalRuler();
};

const drawHorizontalRuler = () => {
  const canvas = horizontalRulerRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const offsetX = rulerSize; // 从30px开始

  // 清空画布
  ctx.clearRect(0, 0, width, height);

  // 背景色
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, width, height);

  // 底部边框
  ctx.strokeStyle = '#d9d9d9';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height - 0.5);
  ctx.lineTo(width, height - 0.5);
  ctx.stroke();

  // 绘制刻度
  const mmWidth = props.canvasWidth / props.scale; // 转换为mm

  ctx.strokeStyle = '#595959';
  ctx.fillStyle = '#262626';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (let mm = 0; mm <= mmWidth + 5; mm++) {
    const x = offsetX + mm * props.scale;

    if (mm % 10 === 0) {
      // 每10mm画长刻度线和数字
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, height - 15);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();

      // 绘制刻度数字
      ctx.fillText(mm.toString(), x, 2);
    } else if (mm % 5 === 0) {
      // 每5mm画中等刻度线
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, height - 10);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    } else {
      // 每1mm画短刻度线
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, height - 5);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }
  }
};

const drawVerticalRuler = () => {
  const canvas = verticalRulerRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // 清空画布
  ctx.clearRect(0, 0, width, height);

  // 背景色
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, width, height);

  // 右侧边框
  ctx.strokeStyle = '#d9d9d9';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width - 0.5, 0);
  ctx.lineTo(width - 0.5, height);
  ctx.stroke();

  // 绘制刻度
  const mmHeight = props.canvasHeight / props.scale; // 转换为mm

  ctx.strokeStyle = '#595959';
  ctx.fillStyle = '#262626';
  ctx.font = '10px Arial';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let mm = 0; mm <= mmHeight + 5; mm++) {
    const y = mm * props.scale;

    if (mm % 10 === 0) {
      // 每10mm画长刻度线和数字
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width - 15, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();

      // 绘制刻度数字（垂直方向）
      const text = mm.toString();
      const textWidth = ctx.measureText(text).width;
      ctx.save();
      ctx.translate(8, y + textWidth / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(text, 0, 0);
      ctx.restore();
    } else if (mm % 5 === 0) {
      // 每5mm画中等刻度线
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(width - 10, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    } else {
      // 每1mm画短刻度线
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(width - 5, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }
  }
};
</script>

<style scoped>
.ruler-wrapper {
  display: inline-block;
}

.top-row {
  display: flex;
  flex-direction: row;
}

.horizontal-ruler {
  display: block;
  flex-shrink: 0;
}

.bottom-row {
  display: flex;
  flex-direction: row;
}

.vertical-ruler-wrapper {
  display: flex;
  align-items: flex-start;
  flex-shrink: 0;
}

.vertical-ruler {
  display: block;
  flex-shrink: 0;
  margin-top: 0;
}

.canvas-content {
  flex-shrink: 0;
  margin-top: 0;
}
</style>
