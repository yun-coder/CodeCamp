<!--
 @description 时分选择器
 @author yunLiang
 @date 2025/12/23 9:26
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
const props = defineProps({
  // 是否清除
  allowClear: {
    type: Boolean,
    default: true
  },
  // 占位符
  placeholder: {
    type: String,
    default: '请输入'
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  },
  // 格式化
  format: {
    type: String,
    default: 'HH:mm'
  }
})

const emit = defineEmits(['change', 'blur'])

const modelValue = defineModel()
</script>

<template>
  <a-time-picker
    v-model:value="modelValue"
    :placeholder="placeholder"
    :allowClear="allowClear"
    :disabled="disabled"
    :format="format"
    :value-format="format"
    style="width: 100%"
    @change="$emit('change', $event)"
    @blur="$emit('blur', $event)"
  />
</template>

<style scoped></style>
