# My Vue 3 Skill

## 简介
这个技能帮助 AI 助手生成高质量的 Vue 3 组件，遵循最佳实践和代码规范。

## 技术栈
- Vue 3 Composition API
- TypeScript
- Vite
- SCSS

## 代码规范

### 组件结构
```vue
<script setup lang="ts">
// 1. Imports
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'

// 2. Props 定义
interface Props {
  title: string
  count?: number
}
const props = withDefaults(defineProps<Props>(), {
  count: 0
})

// 3. Emits 定义
const emit = defineEmits<{
  (e: 'update', value: number): void
  (e: 'click', event: MouseEvent): void
}>()

// 4. 响应式状态
const count: Ref<number> = ref(props.count)

// 5. 计算属性
const doubled = computed(() => count.value * 2)

// 6. 方法
const increment = () => {
  count.value++
  emit('update', count.value)
}

// 7. 生命周期
onMounted(() => {
  console.log('Component mounted')
})

onUnmounted(() => {
  console.log('Component unmounted')
})
</script>

<template>
  <div class="my-component">
    <h2>{{ title }}</h2>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>

<style lang="scss" scoped>
.my-component {
  padding: 1rem;

  h2 {
    color: #333;
  }
}
</style>
```

## 最佳实践

### ✅ 推荐做法
1. 使用 `<script setup>` 语法
2. 使用 TypeScript 定义 Props 和 Emits
3. 使用 `withDefaults` 设置默认值
4. 合理拆分组件，保持单一职责
5. 使用计算属性缓存复杂计算
6. 使用 `v-once` 优化静态内容
7. 使用 `v-memo` 优化列表渲染

### ❌ 避免做法
1. 不要在模板中使用复杂表达式
2. 不要直接修改 props
3. 不要在模板中使用箭头函数
4. 不要在 computed 中有副作用
5. 不要过度使用 watch，优先使用 computed

## 常见模式

### 1. 防抖输入
```typescript
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'

const inputValue = ref('')

const debouncedSearch = useDebounceFn((value: string) => {
  console.log('Search:', value)
}, 500)

watch(inputValue, debouncedSearch)
```

### 2. 获取 DOM 元素
```typescript
import { ref, onMounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)

onMounted(() => {
  if (canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d')
    // 使用 canvas
  }
})
```

### 3. 清理事件监听
```typescript
import { onMounted, onUnmounted } from 'vue'

const handleResize = () => {
  console.log('Resize')
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
```

## 注意事项
- 使用 `ref` 访问 DOM 元素时，检查 `null`
- 异步操作使用 `try-catch` 处理错误
- 清理定时器和事件监听器
- 使用 `defineAsyncComponent` 懒加载组件
