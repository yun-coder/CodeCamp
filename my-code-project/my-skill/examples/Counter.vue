<template>
  <div class="counter">
    <h2>{{ title }}</h2>
    <div class="count-display">
      <span class="count">{{ count }}</span>
      <span class="doubled">({{ doubled }})</span>
    </div>
    <div class="buttons">
      <button @click="decrement" :disabled="count <= min">-</button>
      <button @click="reset">Reset</button>
      <button @click="increment" :disabled="count >= max">+</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  title?: string
  initialValue?: number
  min?: number
  max?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Counter',
  initialValue: 0,
  min: 0,
  max: 100
})

const emit = defineEmits<{
  (e: 'change', value: number): void
  (e: 'max-reached'): void
  (e: 'min-reached'): void
}>()

const count = ref(props.initialValue)

const doubled = computed(() => count.value * 2)

const increment = () => {
  if (count.value < props.max) {
    count.value++
  } else {
    emit('max-reached')
  }
}

const decrement = () => {
  if (count.value > props.min) {
    count.value--
  } else {
    emit('min-reached')
  }
}

const reset = () => {
  count.value = props.initialValue
}

watch(count, (newValue) => {
  emit('change', newValue)
})
</script>

<style lang="scss" scoped>
.counter {
  padding: 2rem;
  background: #f5f5f5;
  border-radius: 8px;
  text-align: center;

  h2 {
    margin-bottom: 1.5rem;
    color: #333;
  }

  .count-display {
    margin-bottom: 1.5rem;

    .count {
      font-size: 3rem;
      font-weight: bold;
      color: #667eea;
    }

    .doubled {
      margin-left: 0.5rem;
      color: #999;
      font-size: 1.5rem;
    }
  }

  .buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;

    button {
      padding: 0.75rem 1.5rem;
      font-size: 1.25rem;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      &:active:not(:disabled) {
        transform: translateY(0);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}
</style>
