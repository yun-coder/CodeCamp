<!--
 @description 小数框
 @author yunLiang
 @date 2025/12/23 9:24
 版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
-->
<script setup>
const props = defineProps({
  // 是否清除
  allowClear: {
    type: Boolean,
    default: false
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

const handleChange = event => {
  let value = event.target.value
  value = value.replace(/[^0-9.]/g, '')
  // 只保留第一个小数点，其余删除
  const firstDotIndex = value.indexOf('.')
  if (firstDotIndex !== -1) {
    const beforeDot = value.slice(0, firstDotIndex)
    const afterDot = value.slice(firstDotIndex).replace(/\./g, '')
    value = beforeDot + '.' + afterDot
  }
  // 分割整数和小数部分
  const parts = value.split('.')
  let integerPart = parts[0]
  let decimalPart = parts.length > 1 ? parts[1] : ''
  // 整数部分去前导零
  if (integerPart) {
    integerPart = integerPart.replace(/^0+/, '') || '0'
  }
  value = decimalPart ? `${integerPart}.${decimalPart}` : integerPart
  // 特殊情况处理：. → 0.
  if (value === '.') {
    value = '0.'
  } else if (value.startsWith('.')) {
    value = '0' + value
  }
  // 限制最多两位小数
  if (decimalPart) {
    value = `${integerPart}.${decimalPart.slice(0, 2)}`
  }
  modelValue.value = value
  emit('change', value)
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
