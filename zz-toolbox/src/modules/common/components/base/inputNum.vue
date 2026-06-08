<!--
 @description 数字输入框
 @author yunLiang
 @date 2025/12/23 9:23
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
  // 是否显示边框
  bordered: {
    type: Boolean,
    default: true
  },
  // 是否显示增减按钮
  controls: {
    type: Boolean,
    default: false
  },
  // 小数点
  decimalSeparator: {
    type: String
  },
  // 初始值
  defaultValue: {
    type: Number
  },
  // 指定输入框展示值的格式
  formatter: {
    type: [String, Number]
  },
  // 最大值
  max: {
    type: Number
  },
  // 最小值
  min: {
    type: Number
  },
  // 	数值精度
  precision: {
    type: Number
  },
  // 输入框大小
  size: {
    type: String
  },
  // 每次改变步数，可以为小数
  step: {
    type: [String, Number]
  },
  // 字符值模式
  stringMode: {
    type: Boolean
  }
})

const emit = defineEmits(['change', 'blur', 'focus', 'pressEnter', 'step'])

const modelValue = defineModel()
</script>

<template>
  <a-input-number
    v-bind="$attrs"
    v-model:value.trim="modelValue"
    :allowClear="allowClear"
    :placeholder="placeholder"
    :disabled="disabled"
    :bordered="bordered"
    :controls="controls"
    :decimalSeparator="decimalSeparator"
    :defaultValue="defaultValue"
    :formatter="formatter"
    :precision="precision"
    :max="max"
    :min="min"
    :size="size"
    :step="step"
    :stringMode="stringMode"
    autocomplete="off"
    style="width: 100%"
    @change="$emit('change', $event)"
    @pressEnter="$emit('pressEnter', $event)"
    @step="$emit('step', $event)"
    @blur="$emit('blur', $event)"
    @focus="$emit('focus', $event)"
  >
    <template v-for="(slot, name) in $slots" #[name]="slotProps">
      <slot v-if="slot" :name="name" v-bind="slotProps"></slot>
    </template>
  </a-input-number>
</template>

<style scoped></style>
