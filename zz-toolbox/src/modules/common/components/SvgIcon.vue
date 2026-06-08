<!--
 @description svg 自定义图标
 @author yunLiang
 @date 2025/12/19 9:28
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'

// 定义组件属性
const props = defineProps({
  iconClass: {
    type: String,
    required: true,
    validator: value => value.trim() !== ''
  },
  className: {
    type: String,
    default: ''
  },
  // 是否无限旋转
  spin: {
    type: Boolean,
    default: false
  },
  // 旋转角度
  rotate: {
    type: [String, Number],
    default: 0,
    validator: value => !isNaN(Number(value))
  },
  // 颜色属性
  color: {
    type: String,
    default: 'currentColor'
  },
  // 旋转速度，默认每秒一圈（360度）
  speed: {
    type: Number,
    default: 1,
    validator: value => value > 0
  },
  // 图标尺寸
  size: {
    type: [String, Number],
    default: '1.2em',
    validator: value => {
      if (typeof value === 'number') return value > 0
      return /^\d+(\.\d+)?(px|em|rem|%)?$/.test(value)
    }
  }
})

// 定义事件
const emit = defineEmits(['svgIconClick'])

// 是否是外部链接
const isExternal = computed(() => {
  return /^(https?:|mailto:|tel:)/.test(props.iconClass)
})

// svg图片名称计算属性
const iconName = computed(() => {
  return `#icon-${props.iconClass}`
})

// 动画相关状态
const isPaused = ref(false)
const currentRotation = ref(Number(props.rotate))
const animationFrame = ref(null)
const lastTimestamp = ref(0)

// 动画函数
const animate = timestamp => {
  if (!props.spin || isPaused.value) {
    cancelAnimationFrame(animationFrame.value)
    return
  }

  if (!lastTimestamp.value) {
    lastTimestamp.value = timestamp
  }

  const elapsed = timestamp - lastTimestamp.value
  // 每秒旋转 360° * speed控制速度
  currentRotation.value += (elapsed / 1000) * 360 * props.speed
  lastTimestamp.value = timestamp

  animationFrame.value = requestAnimationFrame(animate)
}

// 监听旋转状态变化
watch(
  () => props.spin,
  newSpin => {
    if (newSpin && !isPaused.value) {
      lastTimestamp.value = 0
      animationFrame.value = requestAnimationFrame(animate)
    } else {
      cancelAnimationFrame(animationFrame.value)
    }
  },
  { immediate: true }
)

// 监听暂停状态变化
watch(isPaused, newPaused => {
  if (props.spin && !newPaused) {
    lastTimestamp.value = 0
    animationFrame.value = requestAnimationFrame(animate)
  }
})

// 监听旋转角度变化
watch(
  () => props.rotate,
  newRotate => {
    currentRotation.value = Number(newRotate)
  }
)

// 鼠标事件处理
const handleMouseEnter = () => {
  if (props.spin) {
    isPaused.value = true
  }
}

const handleMouseLeave = () => {
  if (props.spin) {
    isPaused.value = false
  }
}

const handleClick = () => {
  if (props.spin) {
    isPaused.value = true
  }
  emit('svgIconClick')
}

// 组件卸载时清理动画
onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame.value)
})
</script>

<template>
  <div
    v-if="isExternal"
    :style="{
      mask: `url(${props.iconClass}) no-repeat 50% 50%`,
      '-webkit-mask': `url(${props.iconClass}) no-repeat 50% 50%`,
      backgroundColor: props.color,
      width: typeof props.size === 'number' ? `${props.size}px` : props.size,
      height: typeof props.size === 'number' ? `${props.size}px` : props.size
    }"
    :class="['svg-external-icon', props.className]"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  />
  <svg
    v-else
    :class="['svg-icon', props.className]"
    :width="typeof props.size === 'number' ? `${props.size}px` : props.size"
    :height="typeof props.size === 'number' ? `${props.size}px` : props.size"
    viewBox="0 0 24 24"
    :style="{
      cursor: props.spin ? 'pointer' : 'default',
      transform: `rotate(${currentRotation}deg)`,
      transition: isPaused ? 'none' : 'transform 0.1s linear'
    }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <use :xlink:href="iconName" :fill="props.color" />
  </svg>
</template>

<style scoped>
.svg-icon {
  display: inline-block;
  vertical-align: middle;
  transform-origin: center center;
  overflow: hidden;
}

.svg-icon:focus,
.svg-icon:focus-visible {
  outline: none;
}

.svg-external-icon {
  mask-size: cover !important;
  display: inline-block;
  vertical-align: middle;
}
</style>
