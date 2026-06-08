<!--
 @description 负数框
 @author yunLiang
 @date 2025/12/23 9:24
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

// 安全转换为字符串
const ensureString = val => {
  return val === null || val === undefined ? '' : String(val)
}
const handleChange = event => {
  const value = event.target.value
  let cleanValue = ensureString(value)
  // 只允许一个负号在开头 + 数字
  const parts = cleanValue.split('-')
  if (parts.length > 2) {
    // 多个 '-'，只保留第一个
    cleanValue = '-' + parts.slice(1).join('').replace(/-/g, '')
  } else if (parts.length === 2) {
    // 有且仅有一个 '-'
    cleanValue = '-' + parts[1].replace(/[^0-9]/g, '')
  } else {
    // 没有 '-'
    cleanValue = parts[0].replace(/[^0-9]/g, '')
  }
  // 去除前导零
  if (cleanValue === '-' || /^-?0+$/i.test(cleanValue)) {
    cleanValue = cleanValue === '-' ? '-' : '0'
  }
  modelValue.value = cleanValue
  emit('change', cleanValue)
}
const handleBlur = event => {
  emit('blur', event)
}
</script>

<template>
  <a-input
    v-bind="$attrs"
    v-model:value.trim="modelValue"
    :allowClear="allowClear"
    :placeholder="placeholder"
    :disabled="disabled"
    autocomplete="off"
    @change="handleChange"
    @blur="handleBlur"
  />
</template>

<style scoped></style>
