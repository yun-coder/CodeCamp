<!--
 @description 文本输入框
 @author yunLiang
 @date 2025/12/23 9:17
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
const props = defineProps({
  allowClear: {
    type: Boolean,
    default: true
  },
  placeholder: {
    type: String,
    default: '请输入'
  },
  // 是否边框
  bordered: {
    type: Boolean,
    default: true
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  },
  // 是否展示字数
  showCount: {
    type: Boolean,
    default: false
  },
  // 最大长度
  maxlength: {
    type: Number,
    default: 250
  },
  // 设置检验状态
  status: {
    type: String
  },
  // 控件大小
  size: {
    type: String,
    default: 'middle'
  }
})

const emit = defineEmits(['change', 'focus', 'blur'])

const modelValue = defineModel()
</script>

<template>
  <a-input
    v-bind="$attrs"
    v-model:value.trim="modelValue"
    :allowClear="allowClear"
    :placeholder="placeholder"
    :bordered="bordered"
    :disabled="disabled"
    :showCount="showCount"
    :maxlength="maxlength"
    :status="status"
    :size="size"
    autocomplete="off"
    @change="$emit('change', $event.target.value)"
    @focus="$emit('focus', $event.target.value)"
    @blur="$emit('blur', $event.target.value)"
  >
    <template v-for="(slot, name) in $slots" #[name]="slotProps">
      <slot v-if="slot" :name="name" v-bind="slotProps"></slot>
    </template>
  </a-input>
</template>

<style scoped></style>
