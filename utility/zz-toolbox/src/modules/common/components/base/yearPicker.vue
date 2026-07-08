<!--
 @description 年份选择
 @author yunLiang
 @date 2025/12/23 9:25
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
  }
})

const emit = defineEmits(['change', 'blur'])

const modelValue = defineModel()
</script>

<template>
  <a-date-picker
    v-model:value="modelValue"
    :placeholder="placeholder"
    :allowClear="allowClear"
    :disabled="disabled"
    picker="year"
    format="YYYY年"
    value-format="YYYY"
    style="width: 100%"
    @change="$emit('change', $event)"
    @blur="$emit('blur', $event)"
  />
</template>

<style scoped></style>
