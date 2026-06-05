<!--
 @description 时间范围选择器
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
  <a-time-range-picker
    v-model:value="modelValue"
    :placeholder="['开始时间', '结束时间']"
    :allowClear="allowClear"
    :disabled="disabled"
    format="HH:mm"
    value-format="HH:mm"
    style="width: 100%"
    @change="$emit('change', $event)"
    @blur="$emit('blur', $event)"
  />
</template>

<style scoped></style>
